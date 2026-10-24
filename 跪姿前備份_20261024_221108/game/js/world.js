// 福安里：山坡老社區、天橋、大馬路、仲介、廟口公園
window.SS = window.SS || {};

SS.world = (function () {
  const P = SS.PAL;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);
  const ONE = V(1, 1, 1);
  const rand = SS.util.seeded(20261023);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const range = (a, b) => a + rand() * (b - a);

  const LANE_HALF = 3.4; // 坡頂巷半寬
  const SIDEWALK_WIDTH = 2.1;
  const BUILDING_SETBACK = 1.9; // 路緣至一樓外牆
  const ROAD_Y = 2.5; // 大馬路路面
  const WALK_Y = 2.7; // 人行道

  // ---------- 路線 ----------
  // A：家門口沿著彎曲下坡走到大馬路
  const curveA = new THREE.CatmullRomCurve3(
    [V(0, 9, 2), V(0, 9, -4), V(0.6, 8.3, -12), V(2.6, 7.3, -20), V(6, 6.1, -28), V(9, 5, -36), V(10, 4.4, -43), V(10, 3.6, -50), V(10, WALK_Y, -55)],
    false,
    'centripetal'
  );
  const segB = new THREE.LineCurve3(V(10, WALK_Y, -55), V(10, WALK_Y, -57.5));
  const stairUp = new THREE.LineCurve3(V(10, WALK_Y, -57.5), V(10, 8.2, -62.5));
  const deck = new THREE.LineCurve3(V(10, 8.2, -62.5), V(10, 8.2, -72.5));
  const stairDown = new THREE.LineCurve3(V(10, 8.2, -72.5), V(10, WALK_Y, -77.5));
  const curveF = new THREE.CatmullRomCurve3([V(10, WALK_Y, -77.5), V(10, WALK_Y, -81), V(9.2, WALK_Y, -86), V(8, WALK_Y, -90)], false, 'centripetal');

  const yatingPath = new THREE.CurvePath();
  [curveA, segB, stairUp, deck, stairDown, curveF].forEach((c) => yatingPath.add(c));

  // Siti 推輪椅：天橋上不去，沿人行道繞到斑馬線（之後的階段會用到）
  const sitiDetour = new THREE.CurvePath();
  [
    curveA,
    new THREE.LineCurve3(V(10, WALK_Y, -55), V(10, WALK_Y, -58.5)),
    new THREE.LineCurve3(V(10, WALK_Y, -58.5), V(40, WALK_Y, -58.5)),
    new THREE.LineCurve3(V(40, WALK_Y, -58.5), V(40, WALK_Y, -62.5)),
    new THREE.LineCurve3(V(40, WALK_Y, -62.5), V(40, ROAD_Y + 0.02, -63.2)),
    new THREE.LineCurve3(V(40, ROAD_Y + 0.02, -63.2), V(40, ROAD_Y + 0.02, -71.8)),
    new THREE.LineCurve3(V(40, ROAD_Y + 0.02, -71.8), V(40, WALK_Y, -72.5)),
    new THREE.LineCurve3(V(40, WALK_Y, -72.5), V(40, WALK_Y, -77.5)),
    new THREE.LineCurve3(V(40, WALK_Y, -77.5), V(10, WALK_Y, -77.5)),
    curveF,
  ].forEach((c) => sitiDetour.add(c));

  // ---------- 小工具 ----------
  function frameAt(curve, u) {
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u);
    t.y = 0;
    t.normalize();
    const right = V(-t.z, 0, t.x);
    return { p, t, right };
  }

  const streetSamples = Array.from({length: 401}, (_, i) => ({u:i/400, p:curveA.getPointAt(i/400)}));
  function streetGroundAt(x, z) {
    let nearest = {distance2:Infinity, y:curveA.getPointAt(0).y, u:0};
    for (let i=0;i<streetSamples.length-1;i++) {
      const a=streetSamples[i], c=streetSamples[i+1];
      const dx=c.p.x-a.p.x, dz=c.p.z-a.p.z;
      const t=SS.util.clamp(((x-a.p.x)*dx+(z-a.p.z)*dz)/(dx*dx+dz*dz),0,1);
      const px=a.p.x+dx*t, pz=a.p.z+dz*t;
      const distance2=(x-px)**2+(z-pz)**2;
      if(distance2<nearest.distance2) nearest={distance2,y:a.p.y+(c.p.y-a.p.y)*t,u:a.u+(c.u-a.u)*t};
    }
    return nearest;
  }
  function streetPitch(u, yaw) {
    const t=curveA.getTangentAt(u);
    const horizontal=Math.hypot(t.x,t.z);
    const along=(t.x*Math.sin(yaw)+t.z*Math.cos(yaw))/horizontal;
    return -Math.atan2(t.y*along,horizontal);
  }

  function local(base, lx, ly, lz, ry = 0, rx = 0, rz = 0) {
    const m = new THREE.Matrix4().compose(V(lx, ly, lz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), ONE);
    return base.clone().multiply(m);
  }

  function baseMatrix(x, y, z, yaw, pitch = 0) {
    const m = new THREE.Matrix4().makeRotationY(yaw);
    if (pitch) m.multiply(new THREE.Matrix4().makeRotationX(pitch));
    return m.setPosition(x, y, z);
  }

  // 兩點之間的長條（欄杆、電線桿橫擔等）
  function beam(b, a, c, th, color, outline = 0.02) {
    const len = a.distanceTo(c);
    const m = new THREE.Matrix4().lookAt(a, c, Math.abs(a.y - c.y) > len * 0.99 ? V(0, 0, 1) : UP);
    m.setPosition(a.clone().add(c).multiplyScalar(0.5));
    b.add(new THREE.BoxGeometry(th, th, len), color, m, outline);
  }

  // 沿著曲線做一條帶狀路面
  function ribbon(curve, offsetA, offsetB, lift, step = 0.5) {
    const len = curve.getLength();
    const n = Math.max(2, Math.ceil(len / step));
    const pos = [];
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const { p, right } = frameAt(curve, i / n);
      const a = p.clone().addScaledVector(right, offsetA);
      const c = p.clone().addScaledVector(right, offsetB);
      a.y += lift;
      c.y += lift;
      if (prev) {
        pos.push(prev[0].x, prev[0].y, prev[0].z, prev[1].x, prev[1].y, prev[1].z, a.x, a.y, a.z);
        pos.push(prev[1].x, prev[1].y, prev[1].z, c.x, c.y, c.z, a.x, a.y, a.z);
      }
      prev = [a, c];
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    // 統一讓法線朝上
    const nor = g.attributes.normal;
    for (let i = 0; i < nor.count; i++) if (nor.getY(i) < 0) nor.setXYZ(i, -nor.getX(i), -nor.getY(i), -nor.getZ(i));
    return g;
  }

  // ---------- 建築 ----------
  const WALLS = [P.wallCream, P.wallSage, P.wallGrey, P.wallPeach, P.wallCream, 0xe3d9c6, 0xd9c7b0];
  const TANK_COLORS = [0x5d8fb3, 0xe9e9e4, 0x5d8fb3, 0xc9ccc8];
  const SIGN_STYLES = [
    { bg: '#e04a3f', fg: '#ffffff' },
    { bg: '#f2c84b', fg: '#c0312a' },
    { bg: '#ffffff', fg: '#1f5fa8' },
    { bg: '#2f6f9a', fg: '#ffffff' },
  ];
  let signIndex = 0;

  // w：沿街寬度，d：深度，floors：樓層數。facade 在 local +z
  function building(b, group, x, groundY, z, yaw, w, d, floors, opt = {}) {
    const base = baseMatrix(x, groundY, z, yaw);
    const H = floors * 3 + 0.5;
    const wall = opt.color ?? pick(WALLS);
    const below = 14;
    const arcade = opt.arcade ? 2.2 : 0;

    // 主體（往下延伸，蓋住坡地）
    if (arcade) {
      b.add(new THREE.BoxGeometry(w, H - 3, d), wall, local(base, 0, 3 + (H - 3) / 2, 0));
      b.add(new THREE.BoxGeometry(w, below + 3, d - arcade), wall, local(base, 0, (3 - below) / 2, -arcade / 2));
      // 騎樓柱子
      const cols = Math.max(2, Math.round(w / 3.2) + 1);
      for (let i = 0; i < cols; i++) {
        const cx = -w / 2 + 0.25 + (i * (w - 0.5)) / (cols - 1);
        b.add(new THREE.BoxGeometry(0.45, 3, 0.45), wall, local(base, cx, 1.5, d / 2 - 0.25));
      }
      // 騎樓地板
      b.add(new THREE.BoxGeometry(w, 0.15, arcade), P.sidewalk, local(base, 0, 0.07, d / 2 - arcade / 2), 0);
      // 騎樓天花板陰影帶
      b.add(new THREE.BoxGeometry(w - 0.1, 0.12, arcade), 0x8a8478, local(base, 0, 2.94, d / 2 - arcade / 2), 0);
    } else {
      b.add(new THREE.BoxGeometry(w, H + below, d), wall, local(base, 0, (H - below) / 2, 0));
    }

    const front = d / 2;
    const shopFront = front - arcade;

    // 一樓：鐵捲門、店門或住家大門
    const ground = opt.ground ?? pick(['shutter', 'door', 'shop', 'shop']);
    if (ground === 'shutter') {
      const sw = Math.min(w * 0.7, 4.2);
      b.add(new THREE.BoxGeometry(sw, 2.5, 0.12), 0x9aa0a3, local(base, 0, 1.25, shopFront + 0.06));
      for (let i = 1; i < 9; i++) b.add(new THREE.BoxGeometry(sw, 0.03, 0.04), 0x6e7478, local(base, 0, i * 0.28, shopFront + 0.14), 0);
      b.add(new THREE.BoxGeometry(sw + 0.3, 0.35, 0.3), 0x6e7478, local(base, 0, 2.62, shopFront + 0.15));
    } else if (ground === 'door') {
      b.add(new THREE.BoxGeometry(1.1, 2.2, 0.12), opt.doorColor ?? P.ironGreen, local(base, -w * 0.2, 1.1, shopFront + 0.06));
      for (let i = 0; i < 5; i++) b.add(new THREE.BoxGeometry(0.04, 1.6, 0.06), 0x1f3328, local(base, -w * 0.2 - 0.4 + i * 0.2, 1.2, shopFront + 0.14), 0);
      b.add(new THREE.BoxGeometry(1.3, 1.0, 0.1), P.glass, local(base, w * 0.18, 1.5, shopFront + 0.05));
    } else if (ground === 'workshop') {
      frontageLife(b, group, base, shopFront, 'workshop', opt);
    } else if (ground === 'shop') {
      b.add(new THREE.BoxGeometry(w * 0.75, 2.3, 0.1), 0x4f5b60, local(base, 0, 1.25, shopFront + 0.05));
      b.add(new THREE.BoxGeometry(w * 0.75 - 0.4, 1.9, 0.1), P.glassLight, local(base, 0, 1.25, shopFront + 0.09), 0);
      // 遮陽棚
      const stripe = pick([[P.signRed, 0xffffff], [0x2f6f9a, 0xffffff], [0x3a8f5a, 0xf2e8c9]]);
      const n = 8;
      for (let i = 0; i < n; i++) {
        const aw = (w * 0.85) / n;
        b.add(new THREE.BoxGeometry(aw, 0.08, 1.3), stripe[i % 2], local(base, -w * 0.425 + aw * (i + 0.5), 2.75, shopFront + 0.6, 0, 0.32), i === 0 ? 0.03 : 0);
      }
    }

    if (ground === 'door') frontageLife(b,group,base,shopFront,'home',opt);
    // Facade families: paired timber windows, pale sliding frames, or iron cages.
    const facade = opt.facade ?? Math.abs(Math.round(x * 3 + z)) % 3;
    // 樓上窗戶、鐵窗、冷氣
    const nWin = Math.max(1, Math.floor(w / 2.3));
    for (let f = 1; f < floors; f++) {
      const y = f * 3 + 1.5;
      b.add(new THREE.BoxGeometry(w + 0.1, 0.18, 0.25), P.concrete, local(base, 0, f * 3, front + 0.1), 0.03);
      for (let i = 0; i < nWin; i++) {
        const wx = -w / 2 + (w / nWin) * (i + 0.5);
        b.add(new THREE.BoxGeometry(1.15, 1.15, 0.1), P.glass, local(base, wx, y, front + 0.04), 0);
        const style = facade === 0 ? .9 : facade === 1 ? .7 : .2;
        if (style < 0.55) {
          // 鐵窗（凸出的格柵）
          const gx = wx, gz = front + 0.32;
          b.add(new THREE.BoxGeometry(1.45, 0.06, 0.6), P.ironGreen, local(base, gx, y - 0.72, front + 0.3), 0.015);
          b.add(new THREE.BoxGeometry(1.45, 0.06, 0.6), P.ironGreen, local(base, gx, y + 0.72, front + 0.3), 0.015);
          for (let k = 0; k < 6; k++) b.add(new THREE.BoxGeometry(0.04, 1.44, 0.04), P.ironGreen, local(base, gx - 0.68 + k * 0.272, y, gz + 0.26), 0.012);
          b.add(new THREE.BoxGeometry(1.45, 0.04, 0.04), P.ironGreen, local(base, gx, y, gz + 0.26), 0.012);
        } else if (style < 0.8) {
          b.add(new THREE.BoxGeometry(1.35, 0.12, 0.3), P.concrete, local(base, wx, y - 0.65, front + 0.15), 0.02);
        }
        if (facade !== 2) {
          const frame = facade === 0 ? 0x93795d : 0xc4c8bb;
          for (const dx of [-.6,0,.6]) b.add(new THREE.BoxGeometry(.045,1.22,.08),frame,local(base,wx+dx,y,front+.12),0);
          for (const dy of [-.6,.6]) b.add(new THREE.BoxGeometry(1.24,.045,.08),frame,local(base,wx,y+dy,front+.12),0);
          if(facade===0) b.add(new THREE.BoxGeometry(.32,1.05,.04),0xd5c7a9,local(base,wx-.39,y,front+.1),0);
        }
        if (i === nWin-1 && f % 2 === 1) {
          b.add(new THREE.BoxGeometry(0.85, 0.58, 0.42), 0xe8e8e2, local(base, wx + (rand() < 0.5 ? -0.95 : 0.95) * Math.min(1, w / 4), y - 1.05, front + 0.25), 0.025);
        }
        if (rand() < 0.15) {
          // 晾在窗外的衣服
          b.add(new THREE.BoxGeometry(0.35, 0.5, 0.05), pick([0xf2c84b, 0x7ed9b5, 0xe07a6f, 0xffffff]), local(base, wx - 0.3, y - 0.3, front + 0.62), 0.015);
        }
      }
    }

    // 屋頂：女兒牆、水塔、鐵皮加蓋
    b.add(new THREE.BoxGeometry(w, 0.6, 0.18), wall, local(base, 0, H + 0.3, front - 0.09), 0.03);
    b.add(new THREE.BoxGeometry(0.18, 0.6, d), wall, local(base, -w / 2 + 0.09, H + 0.3, 0), 0.03);
    b.add(new THREE.BoxGeometry(0.18, 0.6, d), wall, local(base, w / 2 - 0.09, H + 0.3, 0), 0.03);
    if (opt.tinRoof ?? rand() < 0.5) {
      const tw = w * 0.7, td = d * 0.55;
      b.add(new THREE.BoxGeometry(tw, 2.3, td), P.tin, local(base, -w * 0.1, H + 1.15, -d * 0.15));
      b.add(new THREE.BoxGeometry(tw + 0.5, 0.1, td + 0.6), 0x7f949c, local(base, -w * 0.1, H + 2.45, -d * 0.15, 0, 0.16));
      b.add(new THREE.BoxGeometry(0.9, 0.9, 0.08), P.glass, local(base, -w * 0.1 + tw * 0.25, H + 1.3, -d * 0.15 + td / 2 + 0.03), 0);
    }
    if (opt.tank ?? rand() < 0.65) {
      const tx = w * 0.28, tz = -d * 0.25;
      const tc = pick(TANK_COLORS);
      b.add(new THREE.CylinderGeometry(0.6, 0.6, 1.3, 14), tc, local(base, tx, H + 1.55, tz));
      for (const [a, c] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) {
        b.add(new THREE.BoxGeometry(0.08, 0.9, 0.08), 0x6e7478, local(base, tx + a, H + 0.45, tz + c), 0.015);
      }
    }

    // 直式招牌（垂直於牆面，從街上看得到）
    if (opt.sign !== false && (opt.sign || rand() < 0.45) && floors >= 2) {
      const text = opt.sign || SS.DATA.signs.shops[signIndex++ % SS.DATA.signs.shops.length];
      const st = SIGN_STYLES[(signIndex + floors) % SIGN_STYLES.length];
      const sh = Math.min(2.7, 0.7 + text.length * 0.65);
      const sign = SS.art.signMesh(text, 0.68, sh, { vertical: true, bg: st.bg, fg: st.fg, w: 128, h: Math.round(128 * (sh / 0.9)) });
      const m = local(base, (opt.signSide ?? 1) * (w / 2 - 0.5), 3.4 + sh / 2, front + 0.42, Math.PI / 2);
      sign.applyMatrix4(m);
      group.add(sign);
      b.add(new THREE.BoxGeometry(0.06, 0.06, 0.9), 0x6e7478, local(base, (opt.signSide ?? 1) * (w / 2 - 0.5), 3.4 + sh + 0.05, front + 0.45), 0.012);
    }

    return base;
  }

  // Purposeful prop clusters live in facade coordinates, behind the street edge.
  function frontageLife(b, group, base, front, kind, opt = {}) {
    const box = (w,h,d,c,x,y,z) => b.add(new THREE.BoxGeometry(w,h,d),c,local(base,x,y,z),.015);
    const label = (text,w,h,x,y,z,bg='#e6ddc8') => {
      const m=SS.art.signMesh(text,w,h,{bg,fg:'#37483f'});
      m.applyMatrix4(local(base,x,y,z)); group.add(m);
    };
    if (kind === 'home') {
      box(.8,.025,.42,0x9c8870,-1.15,.04,front+.3); // door mat
      for (const x of [-1.3,-1.06]) {
        box(.13,.07,.27,0x506b70,x,.085,front+.3);
        box(.13,.055,.10,0x819c98,x,.13,front+.32);
      }
      box(.38,.5,.16,0x758b82,.95,1.28,front+.12);
      box(.26,.025,.02,0x35463e,.95,1.39,front+.21);
      label('信箱',.24,.12,.95,1.22,front+.22);
      for(const [x,scale] of [[1.65,.72],[2.15,.48]]) {
        const q=V(x,0,front+.58).applyMatrix4(base);
        const groundY=opt.streetGround ? streetGroundAt(q.x,q.z).y+.12 : q.y;
        pot(b,q.x,groundY,q.z,scale);
        if (opt.onPot) opt.onPot({x:q.x,z:q.z,y:groundY,radius:.36*scale});
      }
      label('福安里',.48,.24,-.3,1.85,front+.1,'#d6dfd3');
    }
    if(kind === 'workshop') {
      box(4.8,2.45,.06,0x3c4947,0,1.25,front+.03);
      box(4.9,.3,.2,0x899491,0,2.55,front+.12); // rolled shutter
      label('福安機車・維修保養',4.7,.55,0,2.98,front+.14,'#c5d1bd');
      box(1.25,.08,.55,0x9b7b55,1.4,.9,front+.38);
      for(const x of [.88,1.92]) box(.06,.85,.45,0x4c5854,x,.43,front+.38);
      box(1.2,.7,.08,0x8b9b8e,1.4,1.65,front+.1);
      for(let i=0;i<5;i++) {
        box(.035,.24,.04,0xc2c8bc,1+i*.19,1.65,front+.16);
        box(.09,.04,.04,0xc2c8bc,1+i*.19,1.79,front+.16);
      }
      box(.48,.23,.27,0xa85e4c,1.35,1.06,front+.38);
      for(let i=0;i<3;i++) b.add(new THREE.TorusGeometry(.25,.075,8,16),0x303b38,local(base,-1.9,.34+i*.18,front+.38,0,Math.PI/2),0);
      const bike=V(-.65,0,front+.7).applyMatrix4(base);
      if(opt.streetGround) {
        const ground=streetGroundAt(bike.x,bike.z);
        const bikeYaw=Math.atan2(base.elements[8],base.elements[10])+Math.PI/2;
        scooter(b,baseMatrix(bike.x,ground.y+.12,bike.z,bikeYaw,streetPitch(ground.u,bikeYaw)),0,0,0,0x7f9b94);
      } else scooter(b,base,-.65,front+.7,Math.PI/2,0x7f9b94);
    }
  }

  // 後排填補，避免從縫隙看到虛空
  function filler(b, x, groundY, z, yaw, w, d) {
    const H = range(7, 16);
    b.add(new THREE.BoxGeometry(w, H + 16, d), pick(WALLS), local(baseMatrix(x, groundY, z, yaw), 0, (H - 16) / 2, 0), 0.04);
    if (rand() < 0.5) {
      const base = baseMatrix(x, groundY, z, yaw);
      b.add(new THREE.CylinderGeometry(0.55, 0.55, 1.2, 12), pick(TANK_COLORS), local(base, range(-w / 3, w / 3), H + 0.6, range(-d / 4, d / 4)));
    }
  }

  // 機車
  function scooter(b, base, lx, lz, ry, color) {
    const m = local(base, lx, 0, lz, ry);
    const wheel = new THREE.CylinderGeometry(0.24, 0.24, 0.12, 14);
    b.add(wheel, 0x2a2a2a, local(m, 0, 0.24, 0.48, 0, 0, Math.PI / 2), 0.015);
    b.add(wheel, 0x2a2a2a, local(m, 0, 0.24, -0.48, 0, 0, Math.PI / 2), 0.015);
    b.add(new THREE.BoxGeometry(0.36, 0.32, 0.9), color, local(m, 0, 0.5, -0.05), 0.02);
    b.add(new THREE.BoxGeometry(0.3, 0.12, 0.55), 0x2b2b2b, local(m, 0, 0.72, -0.15), 0.015);
    b.add(new THREE.BoxGeometry(0.4, 0.7, 0.14), color, local(m, 0, 0.75, 0.42, 0, -0.25), 0.02);
    b.add(new THREE.BoxGeometry(0.62, 0.05, 0.05), 0x2a2a2a, local(m, 0, 1.12, 0.38), 0.012);
    b.add(new THREE.BoxGeometry(0.22, 0.14, 0.04), 0xffffff, local(m, 0, 0.95, 0.5), 0.01);
  }

  function pot(b, x, y, z, s = 1) {
    b.add(new THREE.CylinderGeometry(0.28 * s, 0.2 * s, 0.4 * s, 12), 0xb8674a, baseMatrix(x, y + 0.2 * s, z, 0), 0.02);
    b.add(new THREE.SphereGeometry(0.36 * s, 12, 10), pick([P.leaf, P.leafLight]), baseMatrix(x, y + 0.62 * s, z, 0), 0.025);
  }

  function cone(b, x, y, z) {
    b.add(new THREE.ConeGeometry(0.2, 0.6, 12), 0xf08a3c, baseMatrix(x, y + 0.3, z, 0), 0.02);
    b.add(new THREE.BoxGeometry(0.45, 0.05, 0.45), 0xf08a3c, baseMatrix(x, y + 0.025, z, 0), 0.015);
    b.add(new THREE.CylinderGeometry(0.135, 0.165, 0.1, 12), 0xffffff, baseMatrix(x, y + 0.32, z, 0), 0);
  }

  function pole(b, x, y, z) {
    b.add(new THREE.CylinderGeometry(0.13, 0.17, 10, 10), 0xb5b1a6, baseMatrix(x, y + 5, z, 0), 0.03);
    b.add(new THREE.BoxGeometry(1.8, 0.12, 0.12), 0x6e7478, baseMatrix(x, y + 9.2, z, 0), 0.02);
    b.add(new THREE.CylinderGeometry(0.22, 0.22, 0.55, 10), 0x8d9599, baseMatrix(x + 0.35, y + 8.4, z, 0), 0.02);
    return V(x, y + 9.25, z);
  }

  function wires(b, a, c) {
    for (const off of [-0.8, 0, 0.8]) {
      const s = a.clone().add(V(off, 0, 0));
      const e = c.clone().add(V(off, 0, 0));
      const mid = s.clone().add(e).multiplyScalar(0.5);
      mid.y -= 0.9;
      const curve = new THREE.QuadraticBezierCurve3(s, mid, e);
      b.add(new THREE.TubeGeometry(curve, 16, 0.022, 4, false), 0x1a1a1a, new THREE.Matrix4(), 0);
    }
  }

  // 階梯：從 a 走到 c，實心水泥階梯 + 薄荷綠側板與扶手
  function stairs(b, a, c, width) {
    const rise = c.y - a.y;
    const n = Math.max(4, Math.round(Math.abs(rise) / 0.3));
    const low = Math.min(a.y, c.y) - 0.05;
    const dir = c.clone().sub(a);
    const yaw = Math.atan2(dir.x, dir.z);
    const run = Math.hypot(dir.x, dir.z) / n;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const p = a.clone().addScaledVector(dir, t);
      const top = a.y + rise * (rise > 0 ? (i + 1) / n : i / n);
      const h = Math.max(0.1, top - low);
      b.add(new THREE.BoxGeometry(width, h, run + 0.01), i % 2 ? 0xc7c2b6 : 0xbcb6a9, baseMatrix(p.x, low + h / 2, p.z, yaw), 0.02);
    }
    // 側板與扶手
    const right = V(Math.cos(yaw), 0, -Math.sin(yaw));
    for (const s of [-1, 1]) {
      const off = right.clone().multiplyScalar(s * (width / 2 + 0.08));
      const a1 = a.clone().add(off), c1 = c.clone().add(off);
      beam(b, a1.clone().add(V(0, 0.25, 0)), c1.clone().add(V(0, 0.25, 0)), 0.16, P.mint, 0.03);
      beam(b, a1.clone().add(V(0, 1.05, 0)), c1.clone().add(V(0, 1.05, 0)), 0.09, P.mint, 0.025);
      const posts = Math.ceil(a1.distanceTo(c1) / 1.2);
      for (let i = 0; i <= posts; i++) {
        const q = a1.clone().lerp(c1, i / posts);
        b.add(new THREE.BoxGeometry(0.07, 0.85, 0.07), P.mint, baseMatrix(q.x, q.y + 0.62, q.z, 0), 0.015);
      }
    }
  }

  // ---------- 天空與遠景 ----------
  function sky(scene) {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color(P.skyTop) },
        bottom: { value: new THREE.Color(P.skyBottom) },
        patchC: { value: new THREE.Color(P.skyPatch) },
        cloud: { value: 0.35 },
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        varying vec3 vDir; uniform vec3 top; uniform vec3 bottom; uniform vec3 patchC; uniform float cloud;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        void main(){
          vec3 d = normalize(vDir);
          float g = clamp(d.y * 1.6 + 0.25, 0.0, 1.0);
          vec3 c = mix(bottom, top, g);
          vec2 uv = vec2(atan(d.z, d.x) * 2.2, d.y * 6.0);
          float k = n(uv * 1.3) * 0.65 + n(uv * 2.7 + 3.1) * 0.35;
          float m = smoothstep(0.6, 0.64, k) * smoothstep(0.0, 0.18, d.y);
          float m2 = smoothstep(0.7, 0.73, n(uv * 0.9 + 7.0)) * smoothstep(0.05, 0.3, d.y);
          c = mix(c, patchC, m * 0.75);
          c = mix(c, vec3(1.0), m2 * cloud);
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    const s = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), mat);
    s.renderOrder = -1;
    scene.add(s);
    return s;
  }

  function farCity(b) {
    const m = new THREE.Matrix4();
    // 坡下的城市剪影
    for (let i = 0; i < 70; i++) {
      const x = range(-120, 140);
      const z = range(-260, -130);
      const h = range(6, 26);
      const w = range(6, 16);
      m.makeRotationY(range(-0.2, 0.2)).setPosition(x, -8 + h / 2, z);
      b.addFlat(new THREE.BoxGeometry(w, h, range(6, 14)), pick([P.far, 0x95c0bf, 0x7aa7ad]), m);
    }
    // 兩側更遠的山
    for (let i = 0; i < 9; i++) {
      const x = i < 5 ? range(-180, -120) : range(130, 200);
      m.makeRotationY(range(0, Math.PI)).setPosition(x, -5, range(-200, 40));
      b.addFlat(new THREE.ConeGeometry(range(40, 70), range(35, 60), 6), pick([0x8cc7b5, 0x9bd1bf]), m);
    }
  }

  // ---------- 建立整個街區 ----------
  function build(scene) {
    const group = new THREE.Group();
    const b = new SS.art.Batcher();
    const refs = { parkedScooters: [], poles: [], pots: [] };
    const streetDecor = {streetGround:true,onPot:pot=>refs.pots.push(pot)};

    // 天空與整個街區傳出去：屋內場景要暫時藏起來
    refs.sky = sky(scene);
    farCity(b);

    // 地基，避免任何縫隙看到底
    b.add(new THREE.BoxGeometry(400, 2, 400), 0x9c968a, baseMatrix(0, -9, -60, 0), 0);

    // 坡頂巷路面、路邊白線、兩側人行邊
    b.add(ribbon(curveA, -LANE_HALF, LANE_HALF, 0.02), P.road, new THREE.Matrix4(), 0);
    b.add(ribbon(curveA, -LANE_HALF + 0.15, -LANE_HALF + 0.3, 0.035), P.roadLine, new THREE.Matrix4(), 0);
    b.add(ribbon(curveA, LANE_HALF - 0.3, LANE_HALF - 0.15, 0.035), P.roadLine, new THREE.Matrix4(), 0);
    b.add(ribbon(curveA, LANE_HALF, LANE_HALF + SIDEWALK_WIDTH, 0.12), P.sidewalk, new THREE.Matrix4(), 0);
    b.add(ribbon(curveA, -LANE_HALF - SIDEWALK_WIDTH, -LANE_HALF, 0.12), P.sidewalk, new THREE.Matrix4(), 0);
    // 排水溝蓋
    for (let u = 0.04; u < 0.95; u += 0.09) {
      const { p, t } = frameAt(curveA, u);
      b.box(0.5, 0.04, 0.5, 0x3a414c, p.x, p.y + 0.04, p.z, Math.atan2(t.x, t.z), 0.015);
    }

    // 沿著坡頂巷兩側蓋房子
    const lenA = curveA.getLength();
    const homeU = 0.05;
    for (const side of [-1, 1]) {
      let s = 0;
      while (s < lenA - 6) {
        const w = range(5.2, 7.4);
        const u = (s + w / 2) / lenA;
        const { p, t, right } = frameAt(curveA, u);
        const sampledDepth = range(7, 9.5);
        const isHome = side < 0 && Math.abs(u - homeU) < 0.07 && !refs.home;
        const isShop = side > 0 && u > 0.7 && u < 0.84 && !refs.breakfast;
        const isWorkshop = side < 0 && u > .3 && !refs.workshop;
        const d = isHome || isShop ? 9 : sampledDepth;
        const off = LANE_HALF + BUILDING_SETBACK + d / 2;
        const c = p.clone().addScaledVector(right, side * off);
        const face = right.clone().multiplyScalar(-side);
        const yaw = Math.atan2(face.x, face.z);
        if (isHome) {
          const base = building(b, group, c.x, p.y + 0.12, c.z, yaw, 7.2, 9, 3, { ...streetDecor, color: P.wallPeach, ground: 'door', doorColor: P.ironGreen, tinRoof: true, tank: true, sign: false });
          refs.home = { base, p: p.clone(), face, yaw, front: c.clone().addScaledVector(face, 4.5) };
          // 晾衣架
          b.add(new THREE.BoxGeometry(5, 0.05, 0.05), 0x6e7478, local(base, 0.6, 10.9, 2.5), 0.01);
          for (let i = 0; i < 6; i++) b.add(new THREE.BoxGeometry(0.45, 0.6, 0.04), pick([0xffffff, 0xf2c84b, 0x9fc9d4, 0xe07a6f]), local(base, -1.4 + i * 0.75, 10.5, 2.5), 0.012);
        } else if (isShop) {
          const base = building(b, group, c.x, p.y + 0.12, c.z, yaw, 8, 9, 3, { ...streetDecor, color: P.wallCream, arcade: true, ground: 'none', sign: false });
          refs.breakfast = { base, p: p.clone(), face, yaw, u };
        } else if (isWorkshop) {
          const base = building(b,group,c.x,p.y+.12,c.z,yaw,w-.15,d,3,{...streetDecor,color:P.wallSage,ground:'workshop',sign:false,facade:1});
          refs.workshop = {base,u,front:d/2};
          const bike = V(-.65,0,d/2+.7).applyMatrix4(base);
          const ground=streetGroundAt(bike.x,bike.z);
          const bikeYaw=yaw+Math.PI/2;
          refs.parkedScooters.push({x:bike.x,z:bike.z,y:ground.y+.12,yaw:bikeYaw,pitch:streetPitch(ground.u,bikeYaw),side,radius:.82});
        } else {
          building(b, group, c.x, p.y + 0.12, c.z, yaw, w - 0.15, d, 2 + Math.floor(rand() * 3), streetDecor);
        }
        const back = c.clone().addScaledVector(right, side * (d / 2 + 4));
        filler(b, back.x, p.y, back.z, yaw, w + 1, 7);
        s += w;
      }
    }

    // 巷子盡頭（鏡頭後方）與起點兩側
    building(b, group, 0, 9.12, 15, Math.PI, 14, 8, 4, { ground: 'shutter', sign: false });
    building(b, group, -(LANE_HALF + BUILDING_SETBACK + 4.5), 9.12, 6.5, Math.PI / 2, 8, 9, 3, { ground: 'door' });
    building(b, group, LANE_HALF + BUILDING_SETBACK + 4.5, 9.12, 6.5, -Math.PI / 2, 8, 9, 4, { ground: 'shop' });
    b.add(ribbon(new THREE.LineCurve3(V(0, 9, 11), V(0, 9, 2)), -LANE_HALF - SIDEWALK_WIDTH, LANE_HALF + SIDEWALK_WIDTH, 0.02), P.road, new THREE.Matrix4(), 0);

    // 坡頂巷的窄樓梯（裝飾用，接到左側高處的人家）
    {
      const { p, right } = frameAt(curveA, 0.3);
      const a = p.clone().addScaledVector(right, -(LANE_HALF + 0.4));
      a.y += 0.1;
      const c = a.clone().addScaledVector(right, -0.01).add(V(0, 3.2, 0));
      const dir = frameAt(curveA, 0.3).t;
      stairs(b, a.clone().addScaledVector(dir, -1.5), c.clone().addScaledVector(dir, 2.2), 1.1);
    }

    // 電線桿與電線
    let prevTop = null;
    for (let u = 0.02; u < 0.98; u += 0.16) {
      const { p, right } = frameAt(curveA, u);
      const q = p.clone().addScaledVector(right, LANE_HALF + 1.35);
      const top = pole(b, q.x, p.y, q.z);
      refs.poles.push({x:q.x,z:q.z,radius:.17});
      if (prevTop) wires(b, prevTop, top);
      prevTop = top;
    }

    // 停在路邊的機車
    const scooterColors = [0xe04a3f, 0xffffff, P.mint, 0x2f6f9a, 0xf2c84b, 0x9aa0a3];
    for (const [u, side, n] of [[0.12, 1, 2], [0.62, -1, 2], [0.9, -1, 2]]) {
      for (let i = 0; i < n; i++) {
        const scooterU = u + (i - (n - 1) / 2) * 2.0 / curveA.getLength();
        const frame = frameAt(curveA, scooterU);
        const q = frame.p.clone().addScaledVector(frame.right, side * (LANE_HALF + 0.9));
        const scooterYaw = Math.atan2(frame.t.x, frame.t.z);
        const pitch=streetPitch(scooterU,scooterYaw);
        scooter(b, baseMatrix(q.x, q.y + 0.12, q.z, scooterYaw, pitch), 0, 0, 0, pick(scooterColors));
        refs.parkedScooters.push({ x: q.x, z: q.z, y:q.y+.12, yaw:scooterYaw, pitch, u: scooterU, side, radius: 0.82 });
      }
    }

    // 盆栽、交通錐、郵筒
    for (const u of [0.28, 0.66]) {
      const { p, right } = frameAt(curveA, u);
      const q = p.clone().addScaledVector(right, LANE_HALF - 0.5);
      cone(b, q.x, p.y + 0.02, q.z);
    }
    {
      const { p, right, t } = frameAt(curveA, 0.55);
      const q = p.clone().addScaledVector(right, -(LANE_HALF + 0.7));
      const yaw = Math.atan2(right.x, right.z);
      b.add(new THREE.BoxGeometry(0.5, 1.1, 0.45), P.signRed, baseMatrix(q.x, p.y + 0.67, q.z, yaw), 0.025);
      b.add(new THREE.BoxGeometry(0.56, 0.12, 0.5), P.signRed, baseMatrix(q.x, p.y + 1.28, q.z, yaw), 0.02);
      const q2 = q.clone().addScaledVector(t, 0.7);
      b.add(new THREE.BoxGeometry(0.5, 1.1, 0.45), 0x3a8f5a, baseMatrix(q2.x, p.y + 0.67, q2.z, yaw), 0.025);
      b.add(new THREE.BoxGeometry(0.56, 0.12, 0.5), 0x3a8f5a, baseMatrix(q2.x, p.y + 1.28, q2.z, yaw), 0.02);
    }

    // 早餐店內部：櫃台、煎台、牆上電視、招牌
    if (refs.breakfast) {
      const { base } = refs.breakfast;
      const fz = 4.5 - 2.2; // 店面（騎樓後方的牆面）
      b.add(new THREE.BoxGeometry(7.4, 2.7, 0.1), 0x6d6458, local(base, 0, 1.4, fz + 0.06), 0);
      b.add(new THREE.BoxGeometry(3.2, 1.0, 0.7), 0xe9e4d8, local(base, -1.7, 0.5, fz + 0.5));
      b.add(new THREE.BoxGeometry(3.0, 0.1, 0.55), 0x5b5f63, local(base, -1.7, 1.05, fz + 0.5), 0.02);
      for (const x of [1.4, 3.0]) {
        b.add(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 14), 0xf4f4f0, local(base, x, 0.75, fz + 1.35), 0.02);
        b.add(new THREE.CylinderGeometry(0.05, 0.05, 0.72, 8), 0x6e7478, local(base, x, 0.37, fz + 1.35), 0.01);
        for (const dx of [-0.55, 0.55]) b.add(new THREE.CylinderGeometry(0.16, 0.16, 0.4, 10), P.signRed, local(base, x + dx, 0.2, fz + 1.35), 0.015);
      }
      // Working breakfast counter: griddle, food, cups and preparation shelf.
      b.add(new THREE.BoxGeometry(1.15,.06,.48),0x303b39,local(base,-2.35,1.13,fz+.5),0);
      for(const x of [-2.65,-2.3,-1.95]) {
        b.add(new THREE.CylinderGeometry(.12,.12,.025,14),0xe6c78d,local(base,x,1.18,fz+.51),0);
      }
      b.add(new THREE.CylinderGeometry(.22,.22,.3,14),0xbac6c1,local(base,-.5,1.25,fz+.45),.015);
      b.add(new THREE.CylinderGeometry(.24,.24,.035,14),0x71817d,local(base,-.5,1.42,fz+.45),0);
      b.add(new THREE.BoxGeometry(2.7,.06,.28),0xa48a63,local(base,-1.7,1.65,fz+.22),0);
      for(let i=0;i<5;i++) b.add(new THREE.CylinderGeometry(.055,.045,.18,10),0xe6ddc8,local(base,-2.5+i*.22,1.77,fz+.22),0);
      for(const x of [1.4,3]) {
        b.add(new THREE.BoxGeometry(.16,.13,.12),0xe5d8bb,local(base,x,.86,fz+1.35),0);
        b.add(new THREE.CylinderGeometry(.065,.055,.18,10),0xc7b894,local(base,x+.2,.87,fz+1.35),0);
      }
      const order=SS.art.signMesh('點餐 →',.75,.35,{bg:'#e9dcc0',fg:'#6c5141'});
      order.applyMatrix4(local(base,-1.7,.67,fz+.87));group.add(order);
      const tv = SS.art.signMesh('新聞', 1.6, 0.95, { bg: '#1f2a38', fg: '#ffffff', border: '#111' });
      tv.applyMatrix4(local(base, 2.2, 2.2, fz + 0.15));
      group.add(tv);
      refs.tv = tv;
      const sign = SS.art.signMesh(SS.DATA.signs.breakfast, 4.6, 1.0, { bg: '#f2c84b', fg: '#c0312a' });
      sign.applyMatrix4(local(base, 0, 3.55, 4.5 + 0.08));
      group.add(sign);
      const menu = SS.art.signMesh('漢堡 蛋餅 豆漿', 2.4, 0.6, { bg: '#ffffff', fg: '#1a1a1a' });
      menu.applyMatrix4(local(base, -1.7, 2.2, fz + 0.15));
      group.add(menu);
    }

    // ---------- 大馬路與天橋 ----------
    b.add(new THREE.BoxGeometry(120, 10, 9), P.road, baseMatrix(15, ROAD_Y - 5, -67.5, 0), 0);
    b.add(new THREE.BoxGeometry(120, 10.2, 8), P.sidewalk, baseMatrix(15, WALK_Y - 5.1, -59, 0), 0.03);
    b.add(new THREE.BoxGeometry(120, 10.2, 7.5), P.sidewalk, baseMatrix(15, WALK_Y - 5.1, -75.75, 0), 0.03);
    for (let x = -42; x < 74; x += 4) b.box(2.2, 0.04, 0.18, P.roadLine, x, ROAD_Y + 0.02, -67.5, 0, 0);
    b.box(120, 0.04, 0.14, 0xf2c84b, 15, ROAD_Y + 0.02, -63.4, 0, 0);
    b.box(120, 0.04, 0.14, 0xf2c84b, 15, ROAD_Y + 0.02, -71.6, 0, 0);
    // 斑馬線
    for (let i = 0; i < 8; i++) b.box(3.2, 0.05, 0.55, P.roadLine, 40, ROAD_Y + 0.025, -64 + -i * 1.05, 0, 0);
    // 路上的車
    for (const [x, z, c] of [[-18, -65.5, 0xffffff], [26, -69.5, 0xe04a3f], [58, -65.5, 0x2f6f9a]]) {
      b.box(4.2, 1.0, 1.9, c, x, ROAD_Y + 0.7, z, 0, 0.04);
      b.box(2.4, 0.8, 1.7, c === 0xffffff ? 0xdfe6e8 : c, x - 0.3, ROAD_Y + 1.55, z, 0, 0.035);
      b.box(2.42, 0.5, 1.74, P.glass, x - 0.3, ROAD_Y + 1.6, z, 0, 0);
      for (const dx of [-1.3, 1.3]) for (const dz of [-0.9, 0.9]) b.add(new THREE.CylinderGeometry(0.38, 0.38, 0.25, 12), 0x2a2a2a, local(baseMatrix(x + dx, ROAD_Y + 0.38, z + dz, 0), 0, 0, 0, 0, Math.PI / 2), 0.015);
    }

    stairs(b, V(10, WALK_Y, -57.5), V(10, 8.2, -62.5), 2.4);
    stairs(b, V(10, 8.2, -72.5), V(10, WALK_Y, -77.5), 2.4);
    b.box(3.0, 0.5, 10.4, P.mint, 10, 7.95, -67.5, 0, 0.04);
    for (const s of [-1, 1]) {
      b.box(0.12, 0.28, 10.4, P.mint, 10 + s * 1.43, 8.32, -67.5, 0, 0.03);
      b.box(0.24, 0.12, 10.4, P.mint, 10 + s * 1.43, 9.36, -67.5, 0, 0.02);
    }
    for (const z of [-63.2, -71.8]) for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.22, 0.22, 5.5, 10), 0x9aa0a3, baseMatrix(10 + s * 1.1, ROAD_Y + 2.75, z, 0), 0.03);
    // Open balustrade: keeps the bridge safe-looking without blocking the camera.
    for (const side of [-1, 1]) {
      for (let z = -72.2; z <= -62.8; z += 0.85) {
        b.box(0.07, 0.91, 0.07, P.ironGreen, 10 + side * 1.43, 8.86, z, 0, 0);
      }
    }
    const bridgeSign = SS.art.signMesh('天橋', 1.8, 0.6, { bg: '#2f6f9a', fg: '#ffffff' });
    bridgeSign.position.set(10, 9.85, -67.5);
    bridgeSign.rotation.y = Math.PI / 2;
    group.add(bridgeSign);

    // 大馬路北側、南側的房子（面向馬路）
    for (let x = -46; x < 80; x += range(6.5, 8.5)) {
      if (x > -2 && x < 22) continue;
      building(b, group, x, WALK_Y, -50.5, Math.PI, range(6, 7.6), 9, 2 + Math.floor(rand() * 4));
      filler(b, x, WALK_Y, -40, Math.PI, 8, 7);
    }
    for (let x = -46; x < 80; x += range(6.5, 8.5)) {
      if (x > -32 && x < 22) continue;
      building(b, group, x, WALK_Y, -84, 0, range(6, 7.6), 9, 2 + Math.floor(rand() * 4));
      filler(b, x, WALK_Y, -95, 0, 8, 7);
    }

    // 馬路南邊的小廣場
    b.add(new THREE.BoxGeometry(52, 10, 34), P.sidewalk, baseMatrix(-8, WALK_Y - 5, -99, 0), 0.03);
    b.add(ribbon(curveF, -1.4, 1.4, 0.015), 0xcfc8b8, new THREE.Matrix4(), 0);
    // 廣場南側接回街廓：不同樓高、門面和材質讓廣場有可辨認的邊界。
    const southFronts = [
      { x: -29, w: 8, floors: 2, ground: 'door', color: P.wallSage, facade: 0 },
      { x: -18, w: 9, floors: 3, ground: 'shop', color: P.wallPeach, facade: 1 },
      { x: -7, w: 8, floors: 2, ground: 'shutter', color: P.wallCream, facade: 2 },
      { x: 3, w: 8, floors: 4, ground: 'door', color: P.wallGrey, facade: 0 },
    ];
    for (const facade of southFronts) {
      building(b, group, facade.x, WALK_Y, -120, 0, facade.w, 9, facade.floors,
        { ...facade, sign: false, tank: false, tinRoof: false });
    }
    // 邊緣集中放置有用途的物件，中央保留通往仲介的動線。
    for (const [x, z, color] of [[-30, -113.5, 0x8d7359], [-28.4, -113.5, 0x8d7359], [-7.5, -113.5, 0x6e8280]]) {
      b.box(1.2, 0.75, 0.46, color, x, WALK_Y + 0.38, z, 0, 0.01);
      b.box(1.3, 0.07, 0.55, 0xb29b74, x, WALK_Y + 0.78, z, 0, 0);
    }
    // 仲介前的視線焦點：兩側小景把入口接回公園和街道。
    for (const [x,z] of [[-1.5,-88],[-1.5,-92],[16.5,-88],[16.5,-92]]) {
      b.box(1.7, 0.38, 1.15, 0x9f9178, x, WALK_Y + 0.2, z, 0, 0.01);
      b.box(1.55, 0.1, 1.0, 0x788a67, x, WALK_Y + 0.43, z, 0, 0);
      const plant = x < 0 ? P.leaf : P.leafLight;
      for (const dx of [-0.4,0.4]) b.add(new THREE.SphereGeometry(.34,12,8), plant,
        baseMatrix(x+dx,WALK_Y+.67,z,0),0);
    }
    const plazaBench = (x,z) => {
      b.box(2.1,.13,.6,0x9b785a,x,WALK_Y+.48,z,0,.01);
      b.box(2.1,.5,.1,0x9b785a,x,WALK_Y+.79,z-.3,0,.01);
      for (const dx of [-.8,.8]) b.box(.08,.46,.45,0x53615a,x+dx,WALK_Y+.23,z,0,0);
    };
    plazaBench(-1.5,-90); plazaBench(16.5,-90);
    b.box(1.45,1.05,.13,0x6c5848,-2.8,WALK_Y+1.08,-94,0,.015);
    b.box(1.25,.87,.03,0xe1d4af,-2.8,WALK_Y+1.08,-93.91,0,0);
    for (const dx of [-.5,.5]) b.box(.08,1.3,.08,0x6c5848,-2.8+dx,WALK_Y+.65,-94,0,0);

    // ---------- 仲介公司 ----------
    {
      const base = building(b, group, 9, WALK_Y, -96, 0, 9, 8, 3, { color: P.wallCream, ground: 'none', sign: false, tank: true, tinRoof: false });
      b.add(new THREE.BoxGeometry(6.4, 2.6, 0.1), 0x4f5b60, local(base, 0, 1.35, 4.05));
      b.add(new THREE.BoxGeometry(2.0, 2.3, 0.1), P.glassLight, local(base, -1.6, 1.2, 4.1), 0);
      b.add(new THREE.BoxGeometry(3.4, 2.3, 0.1), P.glassLight, local(base, 1.3, 1.2, 4.1), 0);
      const posters = SS.DATA.signs.agencyPosters;
      posters.forEach((t, i) => {
        const pz = SS.art.signMesh(t, 3.0, 0.55, { bg: i === 2 ? '#e04a3f' : '#ffffff', fg: i === 2 ? '#ffffff' : '#c0312a' });
        pz.applyMatrix4(local(base, 1.3, 2.0 - i * 0.62, 4.2));
        group.add(pz);
      });
      const head = SS.art.signMesh('福安人力仲介', 6.2, 1.0, { bg: '#ffffff', fg: '#1f5fa8' });
      head.applyMatrix4(local(base, 0, 3.65, 4.45));
      group.add(head);
      const vs = SS.art.signMesh(SS.DATA.signs.agency + '・仲介', 1.0, 4.6, { vertical: true, bg: '#e04a3f', fg: '#ffffff', w: 128, h: 590 });
      vs.applyMatrix4(local(base, 4.0, 6.0, 4.85, Math.PI / 2));
      group.add(vs);
      refs.agency = { base, door: V(8, WALK_Y, -90) };
    }

    // ---------- 廟口公園 ----------
    {
      const cx = -12, cz = -101;
      b.add(new THREE.BoxGeometry(22, 0.25, 16), P.grass, baseMatrix(cx, WALK_Y + 0.1, cz, 0), 0.03);
      // 榕樹
      b.add(new THREE.CylinderGeometry(0.7, 1.1, 5, 10), P.trunk, baseMatrix(cx, WALK_Y + 2.5, cz, 0), 0.04);
      for (let i = 0; i < 6; i++) beam(b, V(cx + range(-0.4, 0.4), WALK_Y + 4.5, cz + range(-0.4, 0.4)), V(cx + range(-3, 3), WALK_Y + 0.2, cz + range(-3, 3)), 0.12, P.trunk, 0.015);
      for (let i = 0; i < 16; i++) {
        const a = rand() * Math.PI * 2, r = range(0, 4.5);
        b.add(new THREE.SphereGeometry(range(1.8, 2.8), 14, 10), pick([P.leaf, P.leafLight, 0x4f8a5f]), baseMatrix(cx + Math.cos(a) * r, WALK_Y + range(5.5, 8), cz + Math.sin(a) * r, 0), 0.05);
      }
      // 長椅
      for (const [x, z, yaw] of [[cx - 5, cz + 4, 0.3], [cx + 5, cz + 4, -0.3], [cx + 6, cz - 3, -1.4]]) {
        const m = baseMatrix(x, WALK_Y + 0.22, z, yaw);
        b.add(new THREE.BoxGeometry(2.2, 0.1, 0.55), 0x9c6b45, local(m, 0, 0.45, 0), 0.02);
        b.add(new THREE.BoxGeometry(2.2, 0.5, 0.08), 0x9c6b45, local(m, 0, 0.75, -0.25), 0.02);
        for (const dx of [-0.9, 0.9]) b.add(new THREE.BoxGeometry(0.08, 0.45, 0.5), 0x4a4a4a, local(m, dx, 0.22, 0), 0.015);
      }
      // 公布欄
      const bb = baseMatrix(cx + 8.5, WALK_Y + 0.22, cz + 6, -0.5);
      b.add(new THREE.BoxGeometry(2.6, 1.6, 0.12), 0x6b4f3a, local(bb, 0, 1.6, 0), 0.03);
      b.add(new THREE.BoxGeometry(2.3, 1.3, 0.05), 0xd9c7a0, local(bb, 0, 1.6, 0.08), 0);
      for (const dx of [-1.1, 1.1]) b.add(new THREE.BoxGeometry(0.1, 1.6, 0.1), 0x6b4f3a, local(bb, dx, 0.8, 0), 0.015);
      for (let i = 0; i < 4; i++) b.add(new THREE.BoxGeometry(0.5, 0.6, 0.02), pick([0xffffff, 0xf2e8c9, 0xf6d7d0]), local(bb, -0.8 + i * 0.52, 1.6 + (i % 2) * 0.2, 0.12, 0, 0, range(-0.1, 0.1)), 0);
      // 土地公廟一角
      const tb = baseMatrix(cx - 8, WALK_Y + 0.22, cz - 6, 0.4);
      b.add(new THREE.BoxGeometry(4, 2.8, 3.4), 0xc2493d, local(tb, 0, 1.4, 0));
      b.add(new THREE.BoxGeometry(5.2, 0.35, 4.6), 0xd9623b, local(tb, 0, 3.05, 0));
      b.add(new THREE.BoxGeometry(4.2, 0.6, 3.6), 0xd9623b, local(tb, 0, 3.5, 0, 0, 0, 0));
      b.add(new THREE.BoxGeometry(4.8, 0.18, 0.3), 0xf2c84b, local(tb, 0, 3.9, 0));
      b.add(new THREE.BoxGeometry(1.6, 1.9, 0.1), 0x2a2020, local(tb, 0, 1.0, 1.72), 0);
      const tsign = SS.art.signMesh(SS.DATA.signs.temple, 1.4, 0.45, { bg: '#1a1a1a', fg: '#f2c84b' });
      tsign.applyMatrix4(local(tb, 0, 2.35, 1.76));
      group.add(tsign);
      refs.park = { center: V(cx, WALK_Y + 0.22, cz) };
    }

    b.build(group);
    scene.add(group);
    refs.group = group;
    return refs;
  }

  return { build, paths: { yating: yatingPath, siti: sitiDetour }, curves: { A: curveA, F: curveF }, street: {laneHalf:LANE_HALF,sidewalkWidth:SIDEWALK_WIDTH,buildingSetback:BUILDING_SETBACK,groundAt:streetGroundAt} };
})();
