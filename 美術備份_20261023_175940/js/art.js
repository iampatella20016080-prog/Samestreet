// 調色盤、卡通材質、描邊、靜態物件合併
window.SS = window.SS || {};

SS.PAL = {
  skyTop: 0x2fbfb4,
  skyBottom: 0x8fe3d6,
  skyPatch: 0xb9f0e6,
  wallCream: 0xede6d6,
  wallSage: 0xa9b8a0,
  wallGrey: 0xc9ccc8,
  wallPeach: 0xf2c9a8,
  darkBrown: 0x5a4033,
  ironGreen: 0x2f4a3a,
  road: 0x4a5563,
  roadLine: 0xf4f4f0,
  mint: 0x7ed9b5,
  signRed: 0xe04a3f,
  signYellow: 0xf2c84b,
  outline: 0x1a1a1a,
  glass: 0x3c4a52,
  glassLight: 0x9fc9d4,
  tin: 0x9db0b8,
  concrete: 0xb5b1a6,
  sidewalk: 0xd8d2c4,
  grass: 0xb8c99a,
  leaf: 0x5e9e6e,
  leafLight: 0x7dbb86,
  trunk: 0x7a5a43,
  skin: 0xf1c7a5,
  far: 0x86b3b5,
};

SS.art = (function () {
  const gradient = (() => {
    const data = new Uint8Array([95, 175, 255]);
    const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
  })();

  const toonCache = new Map();
  function toon(color) {
    if (!toonCache.has(color)) {
      toonCache.set(color, new THREE.MeshToonMaterial({ color, gradientMap: gradient }));
    }
    return toonCache.get(color);
  }

  const outlineMat = new THREE.MeshBasicMaterial({ color: SS.PAL.outline, side: THREE.BackSide });

  // 反轉外殼描邊：方塊用放大，其他形狀沿法線往外推
  function outlineGeometry(geo, t) {
    const p = geo.parameters || {};
    if (geo.type === 'BoxGeometry') {
      const g = geo.clone();
      g.scale((p.width + 2 * t) / p.width, (p.height + 2 * t) / p.height, (p.depth + 2 * t) / p.depth);
      return g;
    }
    const g = geo.clone();
    const pos = g.attributes.position;
    const nor = g.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i, pos.getX(i) + nor.getX(i) * t, pos.getY(i) + nor.getY(i) * t, pos.getZ(i) + nor.getZ(i) * t);
    }
    pos.needsUpdate = true;
    return g;
  }

  // 會動的物件（人物、輪椅）：回傳帶描邊的 mesh
  function mesh(geo, color, outline = 0.025) {
    const m = new THREE.Mesh(geo, typeof color === 'number' ? toon(color) : color);
    if (outline > 0) {
      const o = new THREE.Mesh(outlineGeometry(geo, outline), outlineMat);
      o.raycast = () => {};
      m.add(o);
    }
    return m;
  }

  function mergeGeometries(list) {
    let count = 0;
    const flat = list.map((g) => {
      const n = g.index ? g.toNonIndexed() : g;
      count += n.attributes.position.count;
      return n;
    });
    const pos = new Float32Array(count * 3);
    const nor = new Float32Array(count * 3);
    let off = 0;
    for (const g of flat) {
      pos.set(g.attributes.position.array, off * 3);
      nor.set(g.attributes.normal.array, off * 3);
      off += g.attributes.position.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.computeBoundingSphere();
    return out;
  }

  // 靜態街景：依顏色合併成少數幾個 mesh，描邊也合成一個
  class Batcher {
    constructor() {
      this.buckets = new Map();
      this.outlines = [];
      this.flat = new Map(); // 不吃光的平塗顏色（遠景）
      this._m = new THREE.Matrix4();
    }
    add(geo, color, matrix, outline = 0.04) {
      const g = geo.clone().applyMatrix4(matrix);
      if (!this.buckets.has(color)) this.buckets.set(color, []);
      this.buckets.get(color).push(g);
      if (outline > 0) this.outlines.push(outlineGeometry(geo, outline).applyMatrix4(matrix));
    }
    addFlat(geo, color, matrix) {
      if (!this.flat.has(color)) this.flat.set(color, []);
      this.flat.get(color).push(geo.clone().applyMatrix4(matrix));
    }
    // 方便用：在 (x,y,z) 放一個 w×h×d 的方塊，可帶旋轉 yaw
    box(w, h, d, color, x, y, z, yaw = 0, outline = 0.04) {
      const m = this._m.makeRotationY(yaw).setPosition(x, y, z);
      this.add(new THREE.BoxGeometry(w, h, d), color, m, outline);
    }
    build(parent) {
      for (const [color, list] of this.buckets) {
        parent.add(new THREE.Mesh(mergeGeometries(list), toon(color)));
      }
      for (const [color, list] of this.flat) {
        parent.add(new THREE.Mesh(mergeGeometries(list), new THREE.MeshBasicMaterial({ color })));
      }
      if (this.outlines.length) parent.add(new THREE.Mesh(mergeGeometries(this.outlines), outlineMat));
    }
  }

  // 用 canvas 畫招牌、海報
  function textTexture(text, opts = {}) {
    const {
      vertical = false,
      bg = '#e04a3f',
      fg = '#ffffff',
      w = vertical ? 128 : 512,
      h = vertical ? 512 : 128,
      font = '900',
      border = '#1a1a1a',
      size,
    } = opts;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 10;
    ctx.strokeStyle = border;
    ctx.strokeRect(5, 5, w - 10, h - 10);
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const chars = [...text];
    if (vertical) {
      const s = size || Math.min(w * 0.72, (h - 40) / chars.length);
      ctx.font = `${font} ${s}px "Noto Sans TC", sans-serif`;
      const total = s * chars.length;
      chars.forEach((ch, i) => ctx.fillText(ch, w / 2, h / 2 - total / 2 + s * (i + 0.5)));
    } else {
      const s = size || Math.min(h * 0.62, (w - 40) / chars.length);
      ctx.font = `${font} ${s}px "Noto Sans TC", sans-serif`;
      ctx.fillText(text, w / 2, h / 2 + s * 0.04);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  function signMesh(text, width, height, opts = {}) {
    const mat = new THREE.MeshBasicMaterial({ map: textTexture(text, opts) });
    const m = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.12), [
      toon(SS.PAL.outline), toon(SS.PAL.outline), toon(SS.PAL.outline), toon(SS.PAL.outline), mat, mat,
    ]);
    return m;
  }

  return { toon, mesh, outlineGeometry, outlineMat, Batcher, textTexture, signMesh, gradient };
})();
