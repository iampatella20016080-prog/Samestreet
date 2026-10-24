// 初始化與主迴圈：建立街區、人物、鏡頭，再交給段落狀態機（scenes.js）
window.SS = window.SS || {};

// 街上的人：雅婷、阿珠姨、阿蘭、王先生，以及來回走動的路人
function buildCast(scene, refs) {
  const C = SS.chars;
  const curve = SS.world.curves.A;
  const laneHalf = SS.world.street.laneHalf;
  const actors = {};
  const anchors = {};
  const walkers = [];
  const idle = [];

  actors.yating = C.makePerson({
    top: 0xe6dfcc,
    bottom: 0x23324a,
    hair: 0x1c1a1a,
    shoes: 0x2b2b2b,
    hairStyle: 'bob',
    bag: SS.PAL.darkBrown,
  });
  scene.add(actors.yating.root);

  // 阿珠姨站在坡頂巷左側人行邊（原本路人巡走的範圍內，不會撞到電線桿和機車）
  {
    const azhu = C.makePerson({ top: 0xe07a6f, bottom: 0x4a4a5a, hair: 0x3b2a22, hairStyle: 'curly' });
    const u = 0.24;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u).setY(0).normalize();
    const right = new THREE.Vector3(-t.z, 0, t.x);
    azhu.root.position.copy(p).addScaledVector(right, -(laneHalf + 0.45));
    azhu.root.position.y += 0.12;
    azhu.root.rotation.y = Math.atan2(right.x, right.z);
    scene.add(azhu.root);
    actors.azhu = azhu;
    idle.push(azhu);
  }

  function addWalker(person, from, to, side, speed, start, direction = 1) {
    scene.add(person.root);
    walkers.push({ person, from, to, side, speed, u: start, direction });
  }
  addWalker(C.makePerson({ top: 0x2f6f9a, bottom: 0x3a3a3a, hair: 0x555555, hairStyle: 'short' }), .39, .48, 1, .78, .44, -1);
  addWalker(C.makePerson({ top: 0xf2c84b, bottom: 0x2b3a55, hair: 0x1c1a1a, hairStyle: 'short', scale: 0.72 }), .57, .63, 1, .65, .6);

  if (refs.breakfast) {
    const alan = C.makePerson({ top: 0xf4f4f0, bottom: 0x3a3a3a, hair: 0x1c1a1a, hairStyle: 'ponytail' });
    alan.root.position.copy(new THREE.Vector3(-1.7, 0, 4.5 - 2.2 + 0.05).applyMatrix4(refs.breakfast.base));
    alan.root.rotation.y = refs.breakfast.yaw;
    scene.add(alan.root);
    actors.alan = alan;
    idle.push(alan);
  }
  if (refs.agency) {
    const wang = C.makePerson({ top: 0x2b3a55, bottom: 0x2b2b2b, hair: 0x1c1a1a, hairStyle: 'short' });
    wang.root.position.set(6.4, 2.7, -91.6);
    wang.root.rotation.y = 0.3;
    scene.add(wang.root);
    actors.wang = wang;
    idle.push(wang);
  }
  // 段落開始時，NPC 轉回原本的方向
  for (const id of ['azhu', 'alan', 'wang']) if (actors[id]) actors[id].homeYaw = actors[id].root.rotation.y;

  // 阿公在門內：對話框指向家門
  if (refs.home) {
    const door = new THREE.Object3D();
    door.position.copy(new THREE.Vector3(-1.44, 2.6, 4.7).applyMatrix4(refs.home.base));
    scene.add(door);
    anchors.agong = door;
  }

  function update(dt) {
    for (const w of walkers) {
      w.u += w.direction * w.speed * dt / curve.getLength();
      if (w.u >= w.to) { w.u = w.to; w.direction = -1; }
      if (w.u <= w.from) { w.u = w.from; w.direction = 1; }
      const p = curve.getPointAt(w.u);
      const t = curve.getTangentAt(w.u).setY(0).normalize();
      const right = new THREE.Vector3(-t.z, 0, t.x);
      w.person.root.position.copy(p).addScaledVector(right, w.side * (laneHalf + .45));
      w.person.root.position.y += .12;
      w.person.root.rotation.y = Math.atan2(t.x * w.direction, t.z * w.direction);
      w.person.animate(dt, .55, 7.5);
    }
    for (const e of idle) e.animate(dt, 0);
  }
  update(0);

  return { actors, anchors, update };
}

(async function main() {
  // 等字型載入，招牌上的中文才會用到正確字型
  try {
    await Promise.race([
      Promise.all([document.fonts.load('900 40px "Noto Sans TC"'), document.fonts.load('700 30px "LXGW WenKai TC"')]),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
  } catch (e) {
    /* 字型失敗就用備援字型 */
  }

  SS.ui.init();
  SS.panels.init();

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('app').appendChild(renderer.domElement);
  SS.input.init();
  window.addEventListener('pointerdown', () => SS.sfx.unlock());

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SS.PAL.skyBottom);
  scene.fog = new THREE.Fog(SS.PAL.skyBottom, 70, 260);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1200);

  const sun = new THREE.DirectionalLight(0xfff0d8, 0.72);
  sun.position.set(-40, 60, 25);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xdde9e5, 0x776c5d, 0.42));

  const refs = SS.world.build(scene);
  const cast = buildCast(scene, refs);
  const rail = new SS.Rail(SS.world.paths.yating, cast.actors.yating, camera, {
    speed: 6, // 原本 4 m/s；上台操作的步行速度提高 1.5 倍
  });
  rail.locked = true;

  SS.stage = { renderer, scene, camera, refs, rail, actors: cast.actors, anchors: cast.anchors, mode: 'rail', stopAt: {} };
  // 雅婷走到 NPC 前面一點就停下來對話
  for (const id of ['azhu', 'alan']) {
    const p = cast.actors[id].root.position;
    SS.stage.stopAt[id] = rail.nearest(p.x, p.z).u - 0.012;
  }

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  // 方便除錯：在 console 用 SS.debug.goto(0.6) 跳到路線上的某一點，SS.debug.go(5) 跳到第 5 段
  SS.debug = {
    renderer,
    scene,
    camera,
    rail,
    refs,
    goto(u) {
      rail.u = u;
      rail.snap();
    },
    go: (i) => SS.director.go(i),
  };

  SS.live.start();
  SS.presenter.init();
  SS.director.init(SS.stage, SS.scenes);
  SS.ui.doneLoading();
  SS.director.go(0);

  function frame(dt) {
    SS.presenter.update(dt);
    if (!SS.state.paused) {
      SS.director.update(dt);
      cast.update(dt);
    }
    SS.ui.update(dt);
    SS.input.endFrame();
    renderer.render(scene, camera);
  }
  // 測試用：分頁在背景時瀏覽器會暫停動畫，可以用 SS.debug.step(秒數) 手動往前推
  SS.debug.step = async (sec, dt = 1 / 30) => {
    for (let t = 0; t < sec; t += dt) {
      frame(dt);
      await Promise.resolve();
    }
  };

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => frame(Math.min(clock.getDelta(), 0.05)));
})();
