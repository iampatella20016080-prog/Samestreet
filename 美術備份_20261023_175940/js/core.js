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
  init() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'KeyF') SS.input.toggleFullscreen();
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  },
  down(...codes) {
    return codes.some((c) => this.keys.has(c));
  },
  toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  },
};
