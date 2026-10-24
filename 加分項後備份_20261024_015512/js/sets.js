// 不在街區裡的場景與道具：阿公家二樓剖面（家務小遊戲）、禮拜毯、下棋桌
window.SS = window.SS || {};

SS.sets = (function () {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const M = (g, c, o) => SS.art.mesh(g, c, o);

  function box(parent, w, h, d, color, x, y, z, outline = 0.012) {
    const m = M(new THREE.BoxGeometry(w, h, d), color, outline);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  function cyl(parent, r, h, color, x, y, z, outline = 0.01) {
    const m = M(new THREE.CylinderGeometry(r, r, h, 16), color, outline);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  function label(parent, text, w, h, x, y, z, opts) {
    const m = SS.art.signMesh(text, w, h, opts);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }

  // 阿公家二樓：把前面那道牆拿掉的「娃娃屋」。原點在地板中央，開口朝 +z（鏡頭那邊）
  function homeRoom() {
    const root = new THREE.Group();
    const wood = 0xc9a77c;
    const wall = 0xede6d6;
    box(root, 9.4, 0.2, 6.6, wood, 0, -0.1, 0, 0.02);
    for (let i = 0; i < 6; i++) box(root, 9.4, 0.005, 0.03, 0xb8956b, 0, 0.003, -3 + i * 1.2, 0);
    box(root, 9.4, 2.9, 0.2, wall, 0, 1.45, -3.3, 0.02);
    box(root, 0.2, 2.9, 6.6, wall, -4.7, 1.45, 0, 0.02);
    box(root, 0.2, 2.9, 6.6, wall, 4.7, 1.45, 0, 0.02);
    box(root, 9.4, 0.12, 0.24, 0xd8cdb8, 0, 2.94, -3.3, 0.01);
    // 窗外天還沒亮、門、時鐘、日曆
    box(root, 1.7, 1.0, 0.04, 0x2b3a6b, -2.6, 1.85, -3.18, 0.015);
    box(root, 1.8, 0.08, 0.1, 0x93795d, -2.6, 1.32, -3.15, 0.01);
    box(root, 0.06, 2.1, 1.0, 0x7a5a43, 4.58, 1.05, 1.7, 0.015);
    cyl(root, 0.24, 0.04, 0xffffff, 2.7, 2.25, -3.18, 0.01).rotation.x = Math.PI / 2;
    box(root, 0.02, 0.15, 0.02, 0x1a1a1a, 2.7, 2.3, -3.15, 0);
    box(root, 0.12, 0.02, 0.02, 0x1a1a1a, 2.66, 2.25, -3.15, 0);
    box(root, 0.5, 0.7, 0.02, 0xffffff, 0.9, 1.85, -3.18, 0.01);
    box(root, 0.5, 0.14, 0.025, 0xe04a3f, 0.9, 2.13, -3.17, 0);

    // 各個家務的位置（站在這裡按住 E）
    const stations = [];
    const station = (id, name, x, z) => stations.push({ id, name, local: V(x, 0, z) });

    // 床（翻身）
    box(root, 2.1, 0.4, 1.15, 0x9b785a, -3.35, 0.2, -2.45);
    box(root, 2.0, 0.2, 1.05, 0xf4f4f0, -3.35, 0.5, -2.45, 0.01);
    box(root, 1.25, 0.06, 1.08, 0x9fc9d4, -3.0, 0.62, -2.45, 0.01);
    box(root, 0.45, 0.14, 0.7, 0xffffff, -4.1, 0.66, -2.45, 0.01);
    station('turn', '翻身', -3.0, -1.55);
    // 尿布櫃
    box(root, 0.7, 0.9, 0.5, 0xd9c7a0, -4.3, 0.45, 0.35);
    box(root, 0.42, 0.26, 0.3, 0xffffff, -4.3, 1.03, 0.35, 0.01);
    box(root, 0.43, 0.05, 0.31, 0x5d8fb3, -4.3, 1.03, 0.35, 0);
    station('diaper', '尿布', -3.55, 0.35);
    // 藥盒
    box(root, 0.55, 0.55, 0.45, 0xb08a64, -1.85, 0.28, -2.95);
    box(root, 0.38, 0.08, 0.2, 0xf4f4f0, -1.85, 0.6, -2.95, 0.008);
    [0xe04a3f, 0xf2c84b, 0x79b99e, 0x2f6f9a].forEach((c, i) => box(root, 0.08, 0.03, 0.18, c, -2.0 + i * 0.1, 0.655, -2.95, 0));
    station('pills', '藥盒', -1.85, -2.25);
    // 神明桌（面試時答應的「我們家有拜拜」）
    box(root, 1.35, 0.95, 0.5, 0xa8322a, 0.05, 0.48, -3.0);
    box(root, 1.15, 0.6, 0.32, 0xa8322a, 0.05, 1.25, -3.08);
    cyl(root, 0.1, 0.32, 0xd8b562, 0.05, 1.12, -3.0);
    cyl(root, 0.12, 0.12, 0x6e7478, 0.05, 1.0, -2.85);
    for (const x of [-0.4, 0.5]) {
      const lamp = M(new THREE.SphereGeometry(0.08, 10, 8), 0xff7a66, 0.008);
      lamp.position.set(x, 1.1, -2.9);
      root.add(lamp);
    }
    station('altar', '擦神明桌', 0.05, -2.25);
    // 洗衣機、洗衣籃
    box(root, 0.75, 0.9, 0.65, 0xf4f4f0, 1.55, 0.45, -2.85);
    cyl(root, 0.2, 0.04, 0x3c4a52, 1.55, 0.55, -2.51, 0.008).rotation.x = Math.PI / 2;
    box(root, 0.6, 0.38, 0.45, 0x5d8fb3, 2.4, 0.19, -2.6);
    box(root, 0.5, 0.12, 0.35, 0xf2c84b, 2.4, 0.4, -2.6, 0.008);
    station('laundry', '洗衣服', 1.95, -2.0);
    // 瓦斯爐（面試時答應的「也會煮豬肉」）
    box(root, 1.4, 0.9, 0.6, 0x9aa0a3, 3.8, 0.45, -2.85);
    cyl(root, 0.24, 0.3, 0x6e7478, 3.6, 1.05, -2.85);
    cyl(root, 0.26, 0.03, 0x4a5563, 3.6, 1.21, -2.85, 0.008);
    station('congee', '煮豬肉粥', 3.6, -2.05);
    // 拖把、水桶
    cyl(root, 0.2, 0.36, 0x2f6f9a, 4.15, 0.18, 0.05);
    const mop = cyl(root, 0.025, 1.5, 0xd9c7a0, 4.35, 0.75, 0.25, 0.006);
    mop.rotation.z = 0.25;
    station('mop', '拖地', 3.55, 0.15);
    // 餐桌（早餐）
    box(root, 1.35, 0.06, 0.8, 0xb08a64, 1.95, 0.75, 1.55);
    for (const [x, z] of [[1.35, 1.2], [2.55, 1.2], [1.35, 1.9], [2.55, 1.9]]) box(root, 0.06, 0.72, 0.06, 0x8a6a4c, x, 0.36, z, 0);
    cyl(root, 0.13, 0.08, 0xffffff, 1.75, 0.82, 1.5, 0.006);
    cyl(root, 0.11, 0.07, 0xf2e8c9, 2.15, 0.82, 1.6, 0.006);
    station('breakfast', '早餐', 1.95, 0.75);

    label(root, '05:30', 0.7, 0.24, 2.7, 1.86, -3.18, { bg: '#ffffff', fg: '#1a1a1a' });

    // 阿公的輪椅位置、Siti 的起點、可走範圍、會擋路的大家具
    const agongSpot = V(-1.25, 0, 1.0);
    const agongStation = V(-0.35, 0, 1.05);
    return {
      root,
      stations,
      agongSpot,
      agongStation,
      sitiStart: V(0.7, 0, 1.7),
      doorSpot: V(4.0, 0, 1.8),
      bounds: { minX: -4.2, maxX: 4.25, minZ: -2.55, maxZ: 2.7 },
      obstacles: [
        { x: -3.85, z: -2.45, r: 0.62 },
        { x: -2.85, z: -2.45, r: 0.62 },
        { x: 1.95, z: 1.55, r: 0.75 },
        { x: -1.25, z: 1.0, r: 0.55 },
        { x: -4.3, z: 0.35, r: 0.45 },
        { x: 4.15, z: 0.05, r: 0.35 },
      ],
      camPos: V(0, 6.3, 8.9),
      camLook: V(0, 0.55, -0.35),
    };
  }

  // 禮拜毯：綠底、金邊、拱門圖樣；回傳 mesh，scale.z 從 0 長到 1 就是攤開
  function prayerMat() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 420;
    const g = c.getContext('2d');
    g.fillStyle = '#2f6b52';
    g.fillRect(0, 0, 256, 420);
    g.strokeStyle = '#d8b562';
    g.lineWidth = 14;
    g.strokeRect(14, 14, 228, 392);
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(60, 340);
    g.lineTo(60, 150);
    g.quadraticCurveTo(128, 60, 196, 150);
    g.lineTo(196, 340);
    g.stroke();
    g.fillStyle = '#8c2f39';
    g.fillRect(40, 352, 176, 30);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.MeshToonMaterial({ map: tex, gradientMap: SS.art.gradient });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 1.3), mat);
    const group = new THREE.Group();
    mesh.position.z = 0.65;
    group.add(mesh);
    return group;
  }

  // 公園的石頭棋桌與兩張石椅
  function chessTable() {
    const root = new THREE.Group();
    cyl(root, 0.12, 0.62, 0x9aa0a3, 0, 0.31, 0);
    cyl(root, 0.48, 0.08, 0xb5b1a6, 0, 0.66, 0);
    box(root, 0.5, 0.012, 0.5, 0xe6d3a3, 0, 0.71, 0, 0.004);
    for (let i = 0; i < 5; i++) {
      const piece = M(new THREE.CylinderGeometry(0.035, 0.035, 0.025, 10), i % 2 ? 0xe04a3f : 0x1a1a1a, 0);
      piece.position.set(-0.15 + i * 0.07, 0.73, (i % 3) * 0.08 - 0.08);
      root.add(piece);
    }
    for (const s of [-1, 1]) cyl(root, 0.2, 0.42, 0xb5b1a6, s * 0.78, 0.21, 0);
    return root;
  }

  return { homeRoom, prayerMat, chessTable };
})();
