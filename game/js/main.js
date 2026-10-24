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

  // 第二章：Siti 推著坐輪椅的阿公（平常藏起來，段落要用時才出現）
  const siti = C.makePerson({ top: 0xd6d8d2, bottom: 0x3a3f4a, scarf: 0xb9a3d6, shoes: 0x8fa3b3, pouch: 0x7a5a43 });
  const chair = C.makeWheelchair();
  const agong = C.makePerson({ top: 0x9a9e95, bottom: 0x4a4740, hair: 0xe8e6e0, hairStyle: 'short', shoes: 0x5a4033 });
  agong.setPose('sit', chair.seatY);
  chair.root.add(agong.root);
  scene.add(siti.root, chair.root);
  siti.root.visible = chair.root.visible = false;
  actors.siti = siti;
  actors.agong = agong;
  idle.push(agong);

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

  // 第一章雅婷的幽靈：第二章時從 Siti 旁邊衝過去、直接跑上天橋
  const ghost = C.ghostify(
    C.makePerson({ top: 0xe6dfcc, bottom: 0x23324a, hair: 0x1c1a1a, shoes: 0x2b2b2b, hairStyle: 'bob', bag: SS.PAL.darkBrown })
  );
  ghost.root.visible = false;
  ghost.root.renderOrder = 5;
  scene.add(ghost.root);

  // 街上的人（屋內場景時一起藏起來）
  const street = [actors.azhu, actors.alan, actors.wang, ...walkers.map((w) => w.person)].filter(Boolean);
  return { actors, anchors, update, chair, street, ghost };
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
  // iPhone／iPad 要等手指放開（touchend、click）才准出聲
  for (const ev of ['pointerdown', 'touchend', 'click']) window.addEventListener(ev, () => SS.sfx.unlock());

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SS.PAL.skyBottom);
  scene.fog = new THREE.Fog(SS.PAL.skyBottom, 70, 260);

  // 直拿手機時畫面很窄：視角跟著放寬，左右才看得到街景（橫的畫面維持 55 度）
  const fovFor = (aspect) =>
    aspect >= 1 ? 55 : Math.min(80, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(27.5)) / Math.pow(aspect, 0.6))));
  const camera = new THREE.PerspectiveCamera(fovFor(window.innerWidth / window.innerHeight), window.innerWidth / window.innerHeight, 0.1, 1200);

  const sun = new THREE.DirectionalLight(0xfff0d8, 0.72);
  sun.position.set(-40, 60, 25);
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xdde9e5, 0x776c5d, 0.42);
  scene.add(hemi);
  // 頂樓那盞暖色的燈：平常關著（一開始就放進場景，中途開燈才不用重新編譯所有材質）
  const lamp = new THREE.PointLight(0xffc98a, 0, 7.5, 1.4);
  scene.add(lamp);
  const fog = scene.fog;

  const refs = SS.world.build(scene);
  const cast = buildCast(scene, refs);
  const rail = new SS.Rail(SS.world.paths.yating, cast.actors.yating, camera, {
    speed: 6, // 原本 4 m/s；上台操作的步行速度提高 1.5 倍
  });
  rail.locked = true;

  // Siti 推輪椅的路線：坡頂巷下坡，天橋上不去，沿大馬路繞到斑馬線（world.js 的 paths.siti）
  const sitiPath = SS.world.paths.siti;
  const sitiLengths = sitiPath.getCurveLengths();
  const sitiTotal = sitiPath.getLength();
  const sitiRail = new SS.Rail(sitiPath, cast.actors.siti, camera, {
    speed: 2.2, // 規格：推輪椅 2.2 m/s
    widthAt: (u) => (u < sitiLengths[0] / sitiTotal ? SS.world.street.laneHalf - 1 : 0.5),
  });
  sitiRail.locked = true;
  // 雅婷走天橋那一段（坡道底到馬路對面）與 Siti 繞斑馬線那一段的長度，給畫面上的比較用
  const yatingLengths = SS.world.paths.yating.getCurveLengths();
  const yatingTotal = SS.world.paths.yating.getLength();

  const stage = (SS.stage = {
    renderer,
    scene,
    camera,
    refs,
    rail,
    sitiRail,
    activeRail: rail,
    chair: cast.chair,
    ghost: cast.ghost,
    lamp,
    actors: cast.actors,
    anchors: cast.anchors,
    mode: 'rail',
    stopAt: {},
    sitiMarks: {
      bridgeFoot: sitiLengths[0] / sitiTotal,
      detourEnd: sitiLengths[8] / sitiTotal,
      detourLength: sitiLengths[8] - sitiLengths[0],
      bridgeLength: yatingLengths[4] - yatingLengths[0],
      // Siti 從家門口推到馬路對面要走的長度（給「同一段路」的時間比較）
      sitiCross: sitiLengths[8],
    },
    // 雅婷那條路上的位置：樓梯開始、走到馬路對面
    yatingMarks: {
      stairs: yatingLengths[1] / yatingTotal,
      cross: yatingLengths[4] / yatingTotal,
      crossDist: yatingLengths[4],
    },
    // 屋內場景：藏起街區、天空與街上的人，背景換成深色
    setStreet(on) {
      refs.group.visible = on;
      refs.sky.visible = on;
      scene.background.set(on ? SS.PAL.skyBottom : 0x1d2433);
      scene.fog = on ? fog : null;
      for (const p of cast.street) p.root.visible = on;
      SS.env.apply();
    },
    // 把輪椅放在 pos、面向 yaw，Siti 站在後面推
    pushAt(pos, yaw) {
      const chair = cast.chair;
      chair.root.visible = cast.actors.siti.root.visible = true;
      chair.root.position.copy(pos);
      chair.root.rotation.y = yaw;
      cast.actors.siti.root.position.copy(pos).add(new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(chair.handleZ));
      cast.actors.siti.root.rotation.y = yaw;
      cast.actors.siti.setPose('push');
    },
    // Siti 在路線上走的時候，輪椅跟在她前面
    followChair() {
      const s = cast.actors.siti.root;
      const chair = cast.chair;
      const yaw = s.rotation.y;
      const q = s.position.clone().add(new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(-chair.handleZ));
      q.y = sitiRail.nearest(q.x, q.z).y;
      chair.roll(chair.root.position.distanceTo(q));
      chair.root.position.copy(q);
      chair.root.rotation.y = yaw;
    },
  });
  // 雅婷走到 NPC 前面一點就停下來對話；Siti 推輪椅經過阿珠姨時也停下來
  for (const id of ['azhu', 'alan']) {
    const p = cast.actors[id].root.position;
    stage.stopAt[id] = rail.nearest(p.x, p.z).u - 0.012;
  }
  {
    const p = cast.actors.azhu.root.position;
    stage.stopAt.sitiAzhu = sitiRail.nearest(p.x, p.z).u - 0.012;
  }

  // 後製（泛光、調色、暗角、顆粒、倒帶雜訊…）與天色
  SS.post.init(renderer);
  SS.env.init({ scene, sun, hemi, fog, sky: refs.sky, group: refs.group });

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.fov = fovFor(camera.aspect);
    camera.updateProjectionMatrix();
    SS.post.resize();
  }
  window.addEventListener('resize', resize);

  // 教室電腦跑不動時自動降畫質：先關後製的多重取樣，還是太慢就整個關掉後製（用真實時間量，分頁在背景時不算）
  const perf = { last: performance.now(), sum: 0, frames: 0, slow: 0 };
  function watchPerf() {
    const nowMs = performance.now();
    const gap = nowMs - perf.last;
    perf.last = nowMs;
    if (document.visibilityState !== 'visible' || gap > 200 || !SS.post.enabled) return;
    perf.sum += gap;
    perf.frames += 1;
    if (perf.sum < 2500) return;
    const fps = (perf.frames * 1000) / perf.sum;
    perf.sum = perf.frames = 0;
    perf.slow = fps < 34 ? perf.slow + 1 : 0;
    if (perf.slow < 2) return;
    perf.slow = 0;
    if (!SS.post.low) {
      SS.post.setLow();
      SS.ui.toast('畫面有點慢，已自動降低畫質');
    } else {
      SS.post.setEnabled(false);
      SS.ui.toast('畫面還是慢，已關閉後製特效（G 可以再打開）');
    }
  }

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
      SS.env.update(dt);
    }
    SS.ui.update(dt);
    SS.input.endFrame();
    SS.post.render(scene, camera, SS.state.paused ? 0 : dt);
    watchPerf();
  }
  // 測試用：分頁在背景時瀏覽器會暫停動畫，可以用 SS.debug.step(秒數) 手動往前推
  SS.debug.step = async (sec, dt = 1 / 30) => {
    for (let t = 0; t < sec; t += dt) {
      frame(dt);
      await Promise.resolve();
    }
  };

  const clock = new THREE.Clock();
  const loop = () => frame(Math.min(clock.getDelta(), 0.05));
  renderer.setAnimationLoop(loop);
  // 測試用：先停掉自動的動畫迴圈，只用 step 推進，時間才準
  SS.debug.hold = (on) => {
    renderer.setAnimationLoop(on ? null : loop);
    clock.getDelta();
  };
})();
