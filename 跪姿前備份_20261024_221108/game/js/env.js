// 天色與光線：每段一組預設（天空、霧、太陽、環境光、窗戶燈、星星、遠景亮度、後製調色），切換時慢慢過去
window.SS = window.SS || {};

SS.env = (function () {
  // sky：[上方, 下方, 雲塊]；fog：[顏色, 近, 遠]；sun：[顏色, 強度]；hemi：[天空, 地面, 強度]
  // cloud：白色雲塊濃度；windows：玻璃窗亮燈 0～1；stars：星星 0～1；far：遠景剪影亮度；post：後製（沒寫的用 post.js 的預設）
  const PRESETS = {
    // 第一章的早晨：明亮
    morning: {
      sky: [0x78b6bb, 0xd2ded0, 0xe1e7d7],
      fog: [0xd2ded0, 70, 260],
      sun: [0xfff0d8, 0.72],
      hemi: [0xdde9e5, 0x776c5d, 0.42],
      cloud: 0.35,
      windows: 0,
      stars: 0,
      far: 1,
      post: {},
    },
    // 第二章白天：同一條街，顏色比較冷、比較硬
    day2: {
      sky: [0x7fa8b5, 0xd3d9d6, 0xdfe3df],
      fog: [0xd3d9d6, 70, 250],
      sun: [0xf2f5ff, 0.78],
      hemi: [0xdfe6ea, 0x6f6a62, 0.4],
      cloud: 0.3,
      windows: 0,
      stars: 0,
      far: 0.95,
      post: { contrast: 1.12, sat: 0.9, tint: [0.96, 1.0, 1.05], vig: 0.34 },
    },
    // 阿公家剖面：深藍背景，清晨的冷光
    room: {
      sky: [0x78b6bb, 0xd2ded0, 0xe1e7d7],
      fog: [0xd2ded0, 70, 260],
      sun: [0xe2e8ff, 0.62],
      hemi: [0xbcc6ea, 0x5a4a3a, 0.5],
      cloud: 0.35,
      windows: 0,
      stars: 0,
      far: 1,
      post: { tint: [0.95, 0.98, 1.06], vig: 0.38, sat: 1.0 },
    },
    // 公園：整個畫面綻放，金色、飽和
    park: {
      sky: [0x86bfc0, 0xf3e1b5, 0xf7ecd0],
      fog: [0xf0dfb8, 80, 260],
      sun: [0xffe6bc, 0.84],
      hemi: [0xeef0d6, 0x7a6a50, 0.46],
      cloud: 0.32,
      windows: 0,
      stars: 0,
      far: 1,
      post: { bloom: 0.45, threshold: 0.82, sat: 1.12, tint: [1.04, 1.0, 0.95], lift: [0.012, 0.008, 0], vig: 0.18 },
    },
    // 頂樓的夜：深藍、星星、整片窗戶亮燈
    night: {
      sky: [0x0b1230, 0x26305c, 0x222c5a],
      fog: [0x1b2348, 40, 210],
      sun: [0x9fb2ff, 0.34],
      hemi: [0x34437a, 0x18182a, 0.32],
      cloud: 0.05,
      windows: 1,
      stars: 1,
      far: 0.28,
      post: { bloom: 0.95, threshold: 0.58, exposure: 0.98, sat: 0.92, tint: [0.86, 0.92, 1.12], vig: 0.48, vigColor: [0.02, 0.03, 0.08], grain: 0.035 },
    },
    // 結尾的黃昏
    sunset: {
      sky: [0x5d6fa6, 0xffb27a, 0xffd2a3],
      fog: [0xf2b48c, 60, 240],
      sun: [0xffa866, 0.82],
      hemi: [0xffd0ac, 0x6b4a3a, 0.44],
      cloud: 0.26,
      windows: 0.45,
      stars: 0,
      far: 0.8,
      post: { bloom: 0.5, threshold: 0.74, sat: 1.08, tint: [1.05, 0.98, 0.91], vig: 0.3 },
    },
  };

  const C = () => new THREE.Color();
  let parts = null;
  let name = 'morning';
  // 目前的值、起點、終點
  const now = { skyTop: C(), skyBottom: C(), skyPatch: C(), fog: C(), fogNear: 70, fogFar: 260, sun: C(), sunI: 0.72, hemiSky: C(), hemiGround: C(), hemiI: 0.42, cloud: 0.35, windows: 0, stars: 0, far: 1 };
  let from = null;
  let to = null;
  let t = 1;
  let dur = 1;

  function snapshot(p) {
    return {
      skyTop: new THREE.Color(p.sky[0]),
      skyBottom: new THREE.Color(p.sky[1]),
      skyPatch: new THREE.Color(p.sky[2]),
      fog: new THREE.Color(p.fog[0]),
      fogNear: p.fog[1],
      fogFar: p.fog[2],
      sun: new THREE.Color(p.sun[0]),
      sunI: p.sun[1],
      hemiSky: new THREE.Color(p.hemi[0]),
      hemiGround: new THREE.Color(p.hemi[1]),
      hemiI: p.hemi[2],
      cloud: p.cloud,
      windows: p.windows,
      stars: p.stars,
      far: p.far,
    };
  }

  function copy(dst, src) {
    for (const k in src) {
      if (src[k] && src[k].isColor) dst[k].copy(src[k]);
      else dst[k] = src[k];
    }
  }

  // 星星：天空球裡面一圈小點，只有晚上看得到
  function makeStars(scene) {
    const n = 700;
    const pos = new Float32Array(n * 3);
    const rand = SS.util.seeded(424242);
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const y = 0.12 + rand() * 0.88;
      const r = Math.sqrt(1 - y * y);
      pos.set([Math.cos(a) * r * 470, y * 470, Math.sin(a) * r * 470], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    // 大小是螢幕像素：跟著 main.js 的 pixelRatio（最多 1.5）放大，視網膜螢幕上才不會太小
    const m = new THREE.PointsMaterial({ color: 0xffffff, size: 2.6 * Math.min(window.devicePixelRatio || 1, 1.5), sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
    const pts = new THREE.Points(g, m);
    pts.visible = false;
    scene.add(pts);
    return pts;
  }

  function init(o) {
    // 遠景剪影是不吃光的平塗顏色：記下原本的顏色，晚上調暗
    const flats = [];
    o.group.traverse((m) => {
      const mat = m.material;
      if (!m.isMesh || !mat || !mat.isMeshBasicMaterial || mat.map || mat.side === THREE.BackSide) return;
      flats.push({ mat, base: mat.color.clone() });
    });
    parts = {
      ...o,
      stars: makeStars(o.scene),
      flats,
      glass: SS.art.toon(SS.PAL.glass),
      glassLight: SS.art.toon(SS.PAL.glassLight),
    };
    copy(now, snapshot(PRESETS.morning));
    apply();
  }

  function apply() {
    const u = parts.sky.material.uniforms;
    u.top.value.copy(now.skyTop);
    u.bottom.value.copy(now.skyBottom);
    u.patchC.value.copy(now.skyPatch);
    u.cloud.value = now.cloud;
    parts.fog.color.copy(now.fog);
    parts.fog.near = now.fogNear;
    parts.fog.far = now.fogFar;
    parts.sun.color.copy(now.sun);
    parts.sun.intensity = now.sunI;
    parts.hemi.color.copy(now.hemiSky);
    parts.hemi.groundColor.copy(now.hemiGround);
    parts.hemi.intensity = now.hemiI;
    // 街區看得到時，背景色跟著霧（天空球蓋住整個背景）
    if (parts.group.visible) parts.scene.background.copy(now.fog);
    parts.glass.emissive.setHex(0xffc46b);
    parts.glass.emissiveIntensity = now.windows * 0.8;
    parts.glassLight.emissive.setHex(0xffd99a);
    parts.glassLight.emissiveIntensity = now.windows * 0.35;
    parts.stars.material.opacity = now.stars;
    parts.stars.visible = now.stars > 0.01 && parts.sky.visible;
    for (const f of parts.flats) f.mat.color.copy(f.base).multiplyScalar(now.far);
  }

  // 換到某個預設，sec 秒內慢慢過去（0 就是立刻）
  function set(next, sec = 1.2) {
    const p = PRESETS[next];
    if (!p || !parts) return;
    name = next;
    from = {};
    for (const k in now) from[k] = now[k] && now[k].isColor ? now[k].clone() : now[k];
    to = snapshot(p);
    dur = Math.max(0.0001, sec);
    t = 0;
    if (sec <= 0) {
      copy(now, to);
      t = 1;
      apply();
    }
    SS.post.set({ ...SS.post.DEFAULT, ...p.post }, sec);
  }

  function update(dt) {
    if (!parts || t >= 1) return;
    t = Math.min(1, t + dt / dur);
    const k = SS.util.ease.inOut(t);
    for (const key in to) {
      if (to[key].isColor) now[key].copy(from[key]).lerp(to[key], k);
      else now[key] = from[key] + (to[key] - from[key]) * k;
    }
    apply();
  }

  return {
    init,
    set,
    update,
    apply: () => parts && apply(),
    get name() {
      return name;
    },
    PRESETS,
  };
})();
