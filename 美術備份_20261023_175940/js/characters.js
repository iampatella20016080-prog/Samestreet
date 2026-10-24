// Q 版人物：全部用基本幾何體組成，跑步動作用程式算
window.SS = window.SS || {};

SS.chars = (function () {
  const P = SS.PAL;
  const M = (g, c, o) => SS.art.mesh(g, c, o);

  function face(head, r, expression = 'smile') {
    const eyeGeo = new THREE.SphereGeometry(r * 0.09, 10, 8);
    const eyeL = new THREE.Mesh(eyeGeo, SS.art.toon(P.outline));
    const eyeR = eyeL.clone();
    eyeL.position.set(-r * 0.34, r * 0.08, r * 0.9);
    eyeR.position.set(r * 0.34, r * 0.08, r * 0.9);
    eyeL.scale.set(1, 1.35, 0.6);
    eyeR.scale.set(1, 1.35, 0.6);
    head.add(eyeL, eyeR);

    const mouth = new THREE.Group();
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(r * 0.16, r * 0.035, 6, 16, Math.PI),
      SS.art.toon(P.outline)
    );
    arc.rotation.z = Math.PI;
    mouth.add(arc);
    mouth.position.set(0, -r * 0.28, r * 0.93);
    head.add(mouth);

    const blushGeo = new THREE.CircleGeometry(r * 0.12, 16);
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xf29b8f, transparent: true, opacity: 0.55 });
    const bl = new THREE.Mesh(blushGeo, blushMat);
    const br = bl.clone();
    bl.position.set(-r * 0.55, -r * 0.15, r * 0.83);
    br.position.set(r * 0.55, -r * 0.15, r * 0.83);
    bl.rotation.y = -0.6;
    br.rotation.y = 0.6;
    head.add(bl, br);

    return { eyeL, eyeR, mouth: arc };
  }

  // opts：top 上衣、bottom 褲子、hair 頭髮、shoes 鞋、hairStyle、scarf 頭巾、bag
  function makePerson(opts = {}) {
    const o = Object.assign(
      {
        skin: P.skin,
        top: 0xffffff,
        bottom: 0x2b2f3a,
        hair: 0x1f1b1a,
        shoes: 0x3a3a3a,
        hairStyle: 'short',
        scale: 1,
        sleeves: true,
      },
      opts
    );

    const root = new THREE.Group();
    const body = new THREE.Group(); // 會上下起伏的部分
    root.add(body);

    // 腿
    const hipY = 0.62;
    const legGeo = new THREE.CapsuleGeometry(0.085, 0.38, 4, 10);
    const shoeGeo = new THREE.BoxGeometry(0.15, 0.09, 0.24);
    const legs = [-1, 1].map((s) => {
      const pivot = new THREE.Group();
      pivot.position.set(0.1 * s, hipY, 0);
      const leg = M(legGeo, o.bottom);
      leg.position.y = -0.27;
      const shoe = M(shoeGeo, o.shoes, 0.02);
      shoe.position.set(0, -0.53, 0.04);
      pivot.add(leg, shoe);
      body.add(pivot);
      return pivot;
    });

    // 身體
    const torso = M(new THREE.CapsuleGeometry(0.22, 0.32, 6, 14), o.top);
    torso.position.y = 0.92;
    torso.scale.set(1, 1, 0.82);
    body.add(torso);

    // 手
    const armGeo = new THREE.CapsuleGeometry(0.065, 0.32, 4, 10);
    const handGeo = new THREE.SphereGeometry(0.07, 10, 8);
    const arms = [-1, 1].map((s) => {
      const pivot = new THREE.Group();
      pivot.position.set(0.27 * s, 1.1, 0);
      const arm = M(armGeo, o.sleeves ? o.top : o.skin);
      arm.position.y = -0.2;
      const hand = M(handGeo, o.skin, 0.018);
      hand.position.y = -0.42;
      pivot.add(arm, hand);
      pivot.rotation.z = 0.12 * s;
      body.add(pivot);
      return pivot;
    });

    // 頭
    const r = 0.3;
    const headPivot = new THREE.Group();
    headPivot.position.y = 1.5;
    const head = M(new THREE.SphereGeometry(r, 20, 16), o.skin, 0.022);
    headPivot.add(head);
    body.add(headPivot);
    const faceParts = face(head, r);

    if (o.scarf) {
      // 頭巾：包住頭頂與兩側，露出臉
      const scarf = M(new THREE.SphereGeometry(r * 1.08, 20, 16, Math.PI * 0.18, Math.PI * 1.64, 0, Math.PI * 0.8), o.scarf, 0.022);
      scarf.rotation.y = Math.PI;
      head.add(scarf);
      const drape = M(new THREE.ConeGeometry(r * 0.95, r * 1.1, 18, 1, true), o.scarf, 0.022);
      drape.position.y = -r * 0.85;
      head.add(drape);
    } else {
      const cap = M(new THREE.SphereGeometry(r * 1.06, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), o.hair, 0.022);
      cap.rotation.x = -0.25;
      head.add(cap);
      if (o.hairStyle === 'short' || o.hairStyle === 'bob') {
        const back = M(new THREE.SphereGeometry(r * 1.04, 18, 12, Math.PI * 0.75, Math.PI * 1.5, Math.PI * 0.3, Math.PI * 0.42), o.hair, 0.022);
        back.rotation.y = Math.PI * 0.5;
        head.add(back);
      }
      if (o.hairStyle === 'bob') {
        [-1, 1].forEach((s) => {
          const side = M(new THREE.BoxGeometry(0.1, 0.3, 0.28), o.hair, 0.02);
          side.position.set(r * 0.92 * s, -r * 0.25, -0.02);
          head.add(side);
        });
      }
      if (o.hairStyle === 'ponytail') {
        const tail = M(new THREE.CapsuleGeometry(0.07, 0.22, 4, 8), o.hair, 0.02);
        tail.position.set(0, -0.05, -r * 1.05);
        tail.rotation.x = 0.4;
        head.add(tail);
      }
      if (o.hairStyle === 'curly') {
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          const puff = M(new THREE.SphereGeometry(0.1, 10, 8), o.hair, 0.018);
          puff.position.set(Math.cos(a) * r * 0.9, r * 0.45 + Math.sin(i) * 0.04, Math.sin(a) * r * 0.9 - 0.04);
          head.add(puff);
        }
      }
      if (o.hairStyle === 'bald') {
        head.remove(cap);
      }
    }

    // 斜背包
    if (o.bag) {
      const bag = M(new THREE.BoxGeometry(0.3, 0.24, 0.1), o.bag, 0.02);
      bag.position.set(-0.24, 0.72, 0.12);
      bag.rotation.y = 0.3;
      body.add(bag);
      const strap = M(new THREE.BoxGeometry(0.05, 0.75, 0.04), o.bag, 0.012);
      strap.position.set(0.02, 1.0, 0.17);
      strap.rotation.z = -0.75;
      body.add(strap);
    }

    // 影子：地上的半透明圓
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 24),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    root.add(shadow);

    root.scale.setScalar(o.scale);

    const person = {
      root,
      body,
      head: headPivot,
      legs,
      arms,
      face: faceParts,
      phase: 0,
      // amount：0 站著，1 全速跑
      animate(dt, amount, freq = 9) {
        this.phase += dt * freq * Math.max(amount, 0.0001);
        const s = Math.sin(this.phase);
        const swing = 0.85 * amount;
        legs[0].rotation.x = s * swing;
        legs[1].rotation.x = -s * swing;
        arms[0].rotation.x = -s * swing * 0.9;
        arms[1].rotation.x = s * swing * 0.9;
        body.position.y = Math.abs(Math.cos(this.phase)) * 0.06 * amount;
        body.rotation.x = 0.12 * amount;
        if (amount < 0.01) {
          const idle = performance.now() * 0.002;
          body.position.y = Math.sin(idle) * 0.01;
        }
      },
    };
    return person;
  }

  return { makePerson };
})();
