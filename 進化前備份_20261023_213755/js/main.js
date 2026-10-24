// 初始化與主迴圈（階段 1：雅婷在福安里走到仲介門口）
window.SS = window.SS || {};

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

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('app').appendChild(renderer.domElement);
  SS.input.init();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SS.PAL.skyBottom);
  scene.fog = new THREE.Fog(SS.PAL.skyBottom, 70, 260);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1200);

  const sun = new THREE.DirectionalLight(0xfff0d8, 0.72);
  sun.position.set(-40, 60, 25);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xdde9e5, 0x776c5d, 0.42));

  const refs = SS.world.build(scene);

  // 雅婷
  const yating = SS.chars.makePerson({
    top: 0xe6dfcc,
    bottom: 0x23324a,
    hair: 0x1c1a1a,
    shoes: 0x2b2b2b,
    hairStyle: 'bob',
    bag: SS.PAL.darkBrown,
  });
  scene.add(yating.root);

  // 先擺幾個鄰居，之後的階段會接上對話
  const extras = [];
  const walkers = [];
  function addWalker(person, from, to, side, speed, start, direction = 1) {
    scene.add(person.root);
    walkers.push({ person, from, to, side, speed, u: start, direction });
  }
  addWalker(SS.chars.makePerson({ top: 0xe07a6f, bottom: 0x4a4a5a, hair: 0x3b2a22, hairStyle: 'curly' }), .19, .29, -1, .72, .24);
  addWalker(SS.chars.makePerson({ top: 0x2f6f9a, bottom: 0x3a3a3a, hair: 0x555555, hairStyle: 'short' }), .39, .48, 1, .78, .44, -1);
  addWalker(SS.chars.makePerson({ top: 0xf2c84b, bottom: 0x2b3a55, hair: 0x1c1a1a, hairStyle: 'short', scale: 0.72 }), .57, .63, 1, .65, .6);
  function updateWalkers(dt) {
    const curve = SS.world.curves.A;
    for (const w of walkers) {
      w.u += w.direction * w.speed * dt / curve.getLength();
      if (w.u >= w.to) { w.u = w.to; w.direction = -1; }
      if (w.u <= w.from) { w.u = w.from; w.direction = 1; }
      const p = curve.getPointAt(w.u);
      const t = curve.getTangentAt(w.u).setY(0).normalize();
      const right = new THREE.Vector3(-t.z, 0, t.x);
      w.person.root.position.copy(p).addScaledVector(right, w.side * (SS.world.street.laneHalf + .45));
      w.person.root.position.y += .12;
      w.person.root.rotation.y = Math.atan2(t.x * w.direction, t.z * w.direction);
      w.person.animate(dt, .55, 7.5);
    }
  }
  updateWalkers(0);
  if (refs.breakfast) {
    const alan = SS.chars.makePerson({ top: 0xf4f4f0, bottom: 0x3a3a3a, hair: 0x1c1a1a, hairStyle: 'ponytail' });
    const pos = new THREE.Vector3(-1.7, 0, 4.5 - 2.2 + 0.05).applyMatrix4(refs.breakfast.base);
    alan.root.position.copy(pos);
    alan.root.rotation.y = refs.breakfast.yaw;
    scene.add(alan.root);
    extras.push(alan);
  }
  if (refs.agency) {
    const wang = SS.chars.makePerson({ top: 0x2b3a55, bottom: 0x2b2b2b, hair: 0x1c1a1a, hairStyle: 'short' });
    wang.root.position.set(6.4, 2.7, -91.6);
    wang.root.rotation.y = 0.3;
    scene.add(wang.root);
    extras.push(wang);
  }

  const data = SS.DATA.scenes.ch1_street;
  SS.ui.setClock(data.clock.time, data.clock.note);
  const labels = data.areaLabels.map((l) => ({ ...l, shown: false }));

  const rail = new SS.Rail(SS.world.paths.yating, yating, camera, {
    speed: 6, // 原本 4 m/s；上台操作的步行速度提高 1.5 倍
    onMove(u) {
      for (const l of labels) {
        if (!l.shown && u >= l.at) {
          l.shown = true;
          SS.ui.showArea(l.text);
        }
      }
      if (u > 0.03) SS.ui.hideHint();
    },
  });
  setTimeout(() => {
    labels[0].shown = true;
    SS.ui.showArea(labels[0].text);
  }, 600);

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  // 方便除錯：在 console 用 SS.debug.goto(0.6) 跳到路線上的某一點
  SS.debug = {
    renderer,
    scene,
    camera,
    rail,
    walkers,
    refs,
    goto(u) {
      rail.u = u;
      rail.snap();
    },
  };

  SS.ui.doneLoading();
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    rail.update(dt);
    for (const e of extras) e.animate(dt, 0);
    updateWalkers(dt);
    renderer.render(scene, camera);
  });
})();
