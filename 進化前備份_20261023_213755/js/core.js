// 全域命名空間與共用工具
window.SS = window.SS || {};

SS.util = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  // 跟幀率無關的平滑係數
  damp: (rate, dt) => 1 - Math.exp(-rate * dt),
};

// 固定種子的亂數，讓每次打開的街景都一樣
SS.util.seeded = function (seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

SS.input = {
  keys: new Set(),
  stick: { x: 0, y: 0, run: false },
  lookDelta: { x: 0, y: 0 },
  zoomDelta: 0,
  init() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'KeyF') SS.input.toggleFullscreen();
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    const canvas = document.querySelector('#app canvas');
    const pad = document.getElementById('touch-pad');
    const nub = document.getElementById('touch-nub');
    const touches = new Map();
    let lookPointer = null;
    let lastPinch = null;
    const resetStick = () => {
      this.stick.x = this.stick.y = 0;
      this.stick.run = false;
      nub.style.transform = 'translate(-50%, -50%)';
    };
    pad.addEventListener('pointerdown', e => {
      e.preventDefault();
      try { pad.setPointerCapture(e.pointerId); } catch (_) { /* 非實體指標事件 */ }
      touches.set(e.pointerId, { kind: 'stick' });
    });
    pad.addEventListener('pointermove', e => {
      if (!touches.has(e.pointerId)) return;
      const r = pad.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) / (r.width * .32);
      const dy = (e.clientY - r.top - r.height / 2) / (r.height * .32);
      const length = Math.max(1, Math.hypot(dx,dy));
      this.stick.x = dx / length; this.stick.y = -dy / length;
      this.stick.run = Math.hypot(dx,dy) > 1.28;
      nub.style.transform = `translate(calc(-50% + ${this.stick.x * 34}px), calc(-50% - ${this.stick.y * 34}px))`;
    });
    for (const event of ['pointerup','pointercancel','lostpointercapture']) pad.addEventListener(event, e => {
      touches.delete(e.pointerId); resetStick();
    });
    canvas.addEventListener('pointerdown', e => {
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* 非實體指標事件 */ }
      touches.set(e.pointerId, { kind: 'look', x: e.clientX, y: e.clientY });
      lookPointer = e.pointerId;
    });
    canvas.addEventListener('pointermove', e => {
      const t = touches.get(e.pointerId);
      if (!t || t.kind !== 'look') return;
      const others = [...touches].filter(([id, v]) => id !== e.pointerId && v.kind === 'look');
      if (others.length) {
        const o = others[0][1];
        const d = Math.hypot(e.clientX - o.x, e.clientY - o.y);
        if (lastPinch !== null) this.zoomDelta += lastPinch - d;
        lastPinch = d;
      } else if (lookPointer === e.pointerId) {
        this.lookDelta.x += e.clientX - t.x;
        this.lookDelta.y += e.clientY - t.y;
      }
      t.x = e.clientX; t.y = e.clientY;
    });
    for (const event of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(event, e => {
      touches.delete(e.pointerId); lastPinch = null;
      if (lookPointer === e.pointerId) lookPointer = null;
    });
    canvas.addEventListener('wheel', e => {
      e.preventDefault(); this.zoomDelta += e.deltaY;
    }, { passive: false });
  },
  down(...codes) {
    return codes.some((c) => this.keys.has(c));
  },
  toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  },
};
