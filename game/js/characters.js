// Q 版人物：全部用基本幾何體組成，跑步動作用程式算
window.SS = window.SS || {};

SS.chars = (function () {
  const P = SS.PAL;
  const M = (g, c, o) => SS.art.mesh(g, c, o);

  // Rounded pieces and fine curved seams keep the procedural character cohesive.
  function oval(parent, color, xyz, scale, ink = 0) {
    const m = M(new THREE.SphereGeometry(1, 20, 14), color, ink);
    m.position.set(...xyz); m.scale.set(...scale); parent.add(m); return m;
  }
  function stroke(parent, color, points, radius = 0.006) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const m = M(new THREE.TubeGeometry(curve, 20, radius, 6, false), color, 0);
    parent.add(m); return m;
  }
  function roundedBox(w, h, d, radius) {
    const s = new THREE.Shape(), x = -w/2, y = -h/2, r = radius;
    s.moveTo(x+r,y); s.lineTo(x+w-r,y); s.quadraticCurveTo(x+w,y,x+w,y+r);
    s.lineTo(x+w,y+h-r); s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    s.lineTo(x+r,y+h); s.quadraticCurveTo(x,y+h,x,y+h-r);
    s.lineTo(x,y+r); s.quadraticCurveTo(x,y,x+r,y);
    const g = new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:0.008,bevelThickness:0.008,bevelSegments:2,steps:1,curveSegments:5});
    g.translate(0,0,-d/2); return g;
  }

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

    // Quiet adult expression: almond eye surrounds, pupils and brow lines.
    for (const side of [-1, 1]) {
      oval(head, 0xf7eee0, [side*r*.34,r*.08,r*.887], [r*.125,r*.1,r*.055]);
      oval(head, 0xffffff, [side*r*.34-r*.022,r*.115,r*.953], [r*.025,r*.025,r*.018]);
      stroke(head, 0x504038, [[side*r*.2,r*.29,r*.91],[side*r*.34,r*.32,r*.9],[side*r*.48,r*.28,r*.85]], .007);
    }
    oval(head, 0xe5b492, [0,-r*.065,r*.99], [.024,.034,.027]);
    arc.scale.set(.8,.55,1);
    bl.material.opacity = .18;
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
    const shoeGeo = new THREE.SphereGeometry(1, 18, 12);
    const legs = [-1, 1].map((s) => {
      const pivot = new THREE.Group();
      pivot.position.set(0.1 * s, hipY, 0);
      const leg = M(legGeo, o.bottom);
      leg.position.y = -0.27;
      const shoe = M(shoeGeo, o.shoes, 0);
      shoe.scale.set(0.103, 0.067, 0.145);
      shoe.position.set(0, -0.52, 0.057);
      const sole = M(new THREE.SphereGeometry(1, 18, 12), o.shoes, 0);
      sole.scale.set(0.099, 0.014, 0.143);
      sole.position.set(0, -0.577, 0.057);
      pivot.add(leg, shoe);
      pivot.add(sole);
      body.add(pivot);
      return pivot;
    });

    // 身體
    const torso = M(new THREE.CapsuleGeometry(0.205, 0.32, 8, 20), o.top);
    torso.position.y = 0.92;
    torso.scale.set(1, 1, 0.82);
    body.add(torso);

    // Neck, tailored hem, collar, placket and sleeve cuffs.
    oval(body, o.skin, [0,1.245,0], [.085,.12,.08]);
    const seamColor = new THREE.Color(o.top).multiplyScalar(.78).getHex();
    if (o.bag) {
      for (const side of [-1,1]) {
        const collar = M(roundedBox(.12,.16,.025,.025),o.top,0);
        collar.position.set(side*.063,1.18,.135); collar.rotation.z = side*.43;
        body.add(collar);
      }
      stroke(body,seamColor,[[0,1.13,.173],[0,.98,.183],[0,.77,.153]],.004);
      for (const y of [.83,.94,1.05]) oval(body,0xb9ad96,[0,y,.186],[.012,.012,.006]);
      stroke(body,seamColor,[[-.15,.72,.11],[0,.705,.15],[.15,.72,.11]],.004);
    }

    // 手
    const armGeo = new THREE.LatheGeometry([
      new THREE.Vector2(0, .045), new THREE.Vector2(.047, .04),
      new THREE.Vector2(.073, -.045), new THREE.Vector2(.068, -.19),
      new THREE.Vector2(.056, -.335), new THREE.Vector2(.029, -.405),
      new THREE.Vector2(0, -.415),
    ], 20);
    const handGeo = new THREE.SphereGeometry(0.07, 10, 8);
    const arms = [-1, 1].map((s) => {
      const pivot = new THREE.Group();
      pivot.position.set(0.228 * s, 1.1, 0);
      const arm = M(armGeo, o.sleeves ? o.top : o.skin, 0);
      arm.position.y = 0;
      const hand = M(handGeo, o.skin, 0);
      hand.position.y = -0.435;
      if (o.sleeves) {
        const cuff = M(new THREE.CylinderGeometry(.068,.063,.022,16),seamColor,0);
        cuff.position.y = -.394; pivot.add(cuff);
      }
      oval(pivot,o.skin,[s*.035,-.435,.03],[.026,.038,.026]);
      pivot.add(arm, hand);
      pivot.rotation.z = 0.075 * s;
      body.add(pivot);
      return pivot;
    });

    // 頭
    const r = 0.3;
    const headPivot = new THREE.Group();
    headPivot.position.y = 1.47;
    headPivot.scale.setScalar(0.83);
    const head = M(new THREE.SphereGeometry(r, 28, 20), o.skin, 0.022);
    headPivot.add(head);
    body.add(headPivot);
    const faceParts = face(head, r);
    for (const side of [-1,1]) {
      oval(head,o.skin,[side*r*.96,-.025,0],[.046,.065,.032]);
      oval(head,0xd79f83,[side*r*1.025,-.025,.018],[.018,.035,.012]);
    }

    if (o.scarf) {
      // 頭巾：包住頭頂與兩側，開口朝前露出臉（開口中心在 phi = π/2，也就是 +z）
      const scarf = M(new THREE.SphereGeometry(r * 1.08, 20, 16, Math.PI * 0.68, Math.PI * 1.64, 0, Math.PI * 0.8), o.scarf, 0.022);
      head.add(scarf);
      const drape = M(new THREE.ConeGeometry(r * 0.95, r * 1.1, 18, 1, true), o.scarf, 0.022);
      drape.position.y = -r * 0.85;
      head.add(drape);
    } else {
      const cap = M(new THREE.SphereGeometry(r * 1.06, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), o.hair, 0.022);
      cap.rotation.x = -0.25;
      head.add(cap);
      if (o.hairStyle === 'short' || o.hairStyle === 'bob') {
        const back = M(new THREE.SphereGeometry(r * 1.04, 18, 12, Math.PI, Math.PI, Math.PI * 0.3, Math.PI * 0.55), o.hair, 0.022);
        back.rotation.y = 0;
        head.add(back);
      }
      if (o.hairStyle === 'bob') {
        [-1, 1].forEach((s) => {
          const side = M(new THREE.SphereGeometry(1, 24, 18), o.hair, 0);
          side.scale.set(0.108, 0.205, 0.181);
          side.position.set(r * 0.78 * s, -r * 0.25, -0.071);
          head.add(side);
        });
        const nape = M(new THREE.SphereGeometry(1, 24, 18), o.hair, 0);
        nape.scale.set(0.255, 0.195, 0.105);
        nape.position.set(0, -0.105, -0.215);
        head.add(nape);
      }
      if (o.hairStyle !== 'bald' && o.hairStyle !== 'curly') {
        // Let the curved cap form the hairline; separate fringe pieces read as blocks.
        const hairLight = new THREE.Color(o.hair).lerp(new THREE.Color(0x786554),.22).getHex();
        for (let i=0;i<3;i++) {
          const x=-.12+i*.12;
          stroke(head,hairLight,[[x,.23,-.18],[x*.96,.10,-.30],[x*.9,-.10,-.29]],.003);
        }
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
      const bag = M(roundedBox(0.32, 0.26, 0.12, 0.035), o.bag, 0.02);
      bag.position.set(-0.24, 0.72, 0.12);
      bag.rotation.y = 0.3;
      body.add(bag);
      const leatherEdge = new THREE.Color(o.bag).lerp(new THREE.Color(0xd1af82),.4).getHex();
      stroke(bag,leatherEdge,[[-.135,.08,.069],[0,.065,.074],[.135,.08,.069]],.004);
      const clasp = M(roundedBox(.04,.035,.012,.006),0xbda476,0);
      clasp.position.set(0,.055,.078); bag.add(clasp);
      stroke(bag,o.bag,[[-.075,.13,0],[-.065,.20,0],[.065,.20,0],[.075,.13,0]],.012);
      // Back strap is visible from the normal gameplay camera.
      stroke(body,o.bag,[[.15,1.2,-.10],[0,1.02,-.19],[-.22,.78,-.12]],.018);
      const strap = M(new THREE.BoxGeometry(0.05, 0.75, 0.04), o.bag, 0.012);
      strap.position.set(0.02, 1.0, 0.17);
      strap.rotation.z = -0.75;
      body.add(strap);
    }

    // 腰間小包（Siti）
    if (o.pouch) {
      const pouch = M(roundedBox(0.17, 0.13, 0.08, 0.03), o.pouch, 0.015);
      pouch.position.set(0.13, 0.7, 0.17);
      body.add(pouch);
    }

    // 影子：地上的半透明圓
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 24),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12, depthWrite: false })
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
      pose: 'stand',
      poseY: 0,
      // 姿勢：stand 站、push 推輪椅（手往前伸）、sit 坐（seatY：座面離地高度）、kneel 跪在禮拜毯上
      setPose(kind, seatY = 0.45) {
        this.pose = kind;
        body.rotation.set(0, 0, 0);
        headPivot.rotation.x = 0;
        for (const a of arms) a.rotation.set(0, 0, a.position.x > 0 ? 0.075 : -0.075);
        for (const l of legs) l.rotation.set(0, 0, 0);
        this.poseY = 0;
        if (kind === 'sit') {
          this.poseY = seatY - hipY + 0.05;
          for (const l of legs) l.rotation.x = -1.3;
          for (const a of arms) a.rotation.x = -0.55;
        } else if (kind === 'kneel') {
          this.poseY = -0.36;
          for (const l of legs) l.rotation.x = 1.42;
          for (const a of arms) a.rotation.x = -0.35;
          body.rotation.x = 0.12;
          headPivot.rotation.x = 0.28;
        }
        body.position.y = this.poseY;
      },
      // 頭轉向（弧度，正值往人物左邊）；k 越大轉得越快
      turnHead(yaw, k = 1) {
        headPivot.rotation.y += (SS.util.clamp(yaw, -1.25, 1.25) - headPivot.rotation.y) * k;
      },
      // 頭轉向世界座標裡的某一點
      lookAt(target, k = 1) {
        const local = root.worldToLocal(target.clone());
        this.turnHead(Math.atan2(local.x, local.z), k);
      },
      // amount：0 站著，1 全速跑
      animate(dt, amount, freq = 9) {
        const idle = performance.now() * 0.002;
        if (this.pose === 'sit' || this.pose === 'kneel') {
          body.position.y = this.poseY + Math.sin(idle) * 0.006;
          return;
        }
        this.phase += dt * freq * Math.max(amount, 0.0001);
        const s = Math.sin(this.phase);
        const swing = 0.65 * amount;
        legs[0].rotation.x = s * swing;
        legs[1].rotation.x = -s * swing;
        arms[0].rotation.x = -s * swing * 0.9;
        arms[1].rotation.x = s * swing * 0.9;
        body.position.y = Math.abs(Math.cos(this.phase)) * 0.06 * amount;
        body.rotation.x = 0.08 * amount;
        body.rotation.z = s * .018 * amount;
        headPivot.rotation.z = -s * .012 * amount;
        if (amount < 0.01) body.position.y = Math.sin(idle) * 0.01;
        if (this.pose === 'push') {
          for (const a of arms) a.rotation.x = -1.18;
          body.rotation.x = 0.1 + 0.04 * amount;
        }
      },
    };
    return person;
  }

  // 輪椅：前方是 +z；推的人站在後面 handleZ 的位置。seatY 是座面高度
  function makeWheelchair() {
    const root = new THREE.Group();
    const frame = 0x7d8790;
    const cloth = 0x2f4a5a;
    const tube = (len, x, y, z, rx = 0, rz = 0, radius = 0.022) => {
      const m = M(new THREE.CylinderGeometry(radius, radius, len, 8), frame, 0.008);
      m.position.set(x, y, z);
      m.rotation.set(rx, 0, rz);
      root.add(m);
      return m;
    };
    const seat = M(roundedBox(0.5, 0.48, 0.07, 0.03), cloth, 0.012);
    seat.rotation.x = -Math.PI / 2;
    seat.position.set(0, 0.5, 0.02);
    root.add(seat);
    const back = M(roundedBox(0.5, 0.48, 0.06, 0.03), cloth, 0.012);
    back.position.set(0, 0.8, -0.24);
    back.rotation.x = -0.12;
    root.add(back);
    const wheels = [];
    for (const s of [-1, 1]) {
      const wheel = new THREE.Group();
      wheel.position.set(s * 0.31, 0.32, -0.06);
      const rim = M(new THREE.TorusGeometry(0.3, 0.032, 8, 28), 0x2a2a2a, 0.01);
      rim.rotation.y = Math.PI / 2;
      wheel.add(rim);
      const ring = M(new THREE.TorusGeometry(0.26, 0.012, 6, 24), frame, 0);
      ring.rotation.y = Math.PI / 2;
      wheel.add(ring);
      for (let i = 0; i < 3; i++) {
        const spoke = M(new THREE.BoxGeometry(0.012, 0.52, 0.012), frame, 0);
        spoke.rotation.x = (i * Math.PI) / 3;
        wheel.add(spoke);
      }
      root.add(wheel);
      wheels.push(wheel);
      // 小前輪、扶手、腳踏
      const caster = M(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 12), 0x2a2a2a, 0.01);
      caster.rotation.z = Math.PI / 2;
      caster.position.set(s * 0.2, 0.075, 0.3);
      root.add(caster);
      tube(0.42, s * 0.2, 0.3, 0.3);
      tube(0.42, s * 0.27, 0.68, 0.02, Math.PI / 2);
      tube(0.2, s * 0.27, 0.58, 0.2);
      tube(0.62, s * 0.24, 0.72, -0.27, -0.12);
      const grip = M(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8), 0x2a2a2a, 0.008);
      grip.rotation.x = Math.PI / 2;
      grip.position.set(s * 0.24, 1.0, -0.36);
      root.add(grip);
    }
    const foot = M(new THREE.BoxGeometry(0.42, 0.03, 0.16), frame, 0.008);
    foot.position.set(0, 0.14, 0.42);
    root.add(foot);
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 24),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    root.add(shadow);
    return {
      root,
      seatY: 0.54,
      handleZ: -0.78,
      // 依移動距離轉動大輪
      roll(distance) {
        for (const w of wheels) w.rotation.x += distance / 0.3;
      },
    };
  }

  // 幽靈：把人物換成半透明的淡藍色（像賽車遊戲裡上一圈的自己），描邊拿掉
  function ghostify(person, color = 0xcfe9ff) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false });
    person.root.traverse((o) => {
      if (!o.isMesh) return;
      if (o.material === SS.art.outlineMat) {
        o.visible = false;
        return;
      }
      o.material = mat;
    });
    person.ghostMat = mat;
    return person;
  }

  return { makePerson, makeWheelchair, ghostify };
})();
