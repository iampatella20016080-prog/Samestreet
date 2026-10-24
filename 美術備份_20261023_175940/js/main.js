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

  SS.input.init();
  SS.ui.init();

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('app').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SS.PAL.skyBottom);
  scene.fog = new THREE.Fog(SS.PAL.skyBottom, 70, 260);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1200);

  const sun = new THREE.DirectionalLight(0xfff4e0, 0.85);
  sun.position.set(-40, 60, 25);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xd8fff6, 0x9a8f80, 0.75));

  const refs = SS.world.build(scene);

  // 雅婷
  const yating = SS.chars.makePerson({
    top: 0xffffff,
    bottom: 0x23324a,
    hair: 0x1c1a1a,
    shoes: 0x2b2b2b,
    hairStyle: 'bob',
    bag: SS.PAL.darkBrown,
  });
  scene.add(yating.root);

  // 先擺幾個鄰居，之後的階段會接上對話
  const extras = [];
  function placeNear(person, u, side, offset, faceRoad = true) {
    const curve = SS.world.curves.A;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u);
    const right = new THREE.Vector3(-t.z, 0, t.x).normalize();
    person.root.position.copy(p).addScaledVector(right, side * offset);
    person.root.position.y += 0.12;
    const f = faceRoad ? right.clone().multiplyScalar(-side) : t;
    person.root.rotation.y = Math.atan2(f.x, f.z);
    scene.add(person.root);
    extras.push(person);
    return person;
  }
  placeNear(SS.chars.makePerson({ top: 0xe07a6f, bottom: 0x4a4a5a, hair: 0x3b2a22, hairStyle: 'curly' }), 0.24, -1, 3.0);
  placeNear(SS.chars.makePerson({ top: 0x2f6f9a, bottom: 0x3a3a3a, hair: 0x555555, hairStyle: 'short' }), 0.46, 1, 3.1);
  placeNear(SS.chars.makePerson({ top: 0xf2c84b, bottom: 0x2b3a55, hair: 0x1c1a1a, hairStyle: 'short', scale: 0.72 }), 0.6, -1, 3.0);
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
    speed: 4,
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
    renderer.render(scene, camera);
  });
})();
