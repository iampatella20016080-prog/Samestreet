// 簡單音效：全部用 Web Audio 合成，不載入音檔；V 鍵靜音
window.SS = window.SS || {};

SS.sfx = {
  ctx: null,
  muted: false,

  // 瀏覽器要等使用者按過鍵或點過畫面才准出聲
  unlock() {
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) {
      /* 沒有音效也能跑 */
    }
  },

  toggle() {
    this.muted = !this.muted;
    return this.muted;
  },

  tone(freq, start, dur, type = 'sine', gain = 0.08, slide) {
    const c = this.ctx;
    const t0 = c.currentTime + start;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  },

  play(name) {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    switch (name) {
      case 'blip':
        this.tone(660, 0, 0.05, 'triangle', 0.03);
        break;
      case 'ding':
        this.tone(1046, 0, 0.12, 'sine', 0.06);
        this.tone(1568, 0.08, 0.18, 'sine', 0.045);
        break;
      case 'pop':
        this.tone(520, 0, 0.09, 'triangle', 0.06, 880);
        break;
      case 'thud':
        this.tone(140, 0, 0.22, 'sine', 0.12, 70);
        break;
      case 'stamp':
        this.tone(110, 0, 0.16, 'square', 0.05, 60);
        this.tone(90, 0.02, 0.2, 'sine', 0.12);
        break;
      case 'buzz':
        this.tone(180, 0, 0.35, 'sawtooth', 0.045);
        break;
      case 'horn':
        this.tone(392, 0, 0.5, 'sawtooth', 0.035);
        this.tone(466, 0, 0.5, 'sawtooth', 0.03);
        break;
      case 'ring':
        for (let i = 0; i < 2; i++) {
          this.tone(880, i * 0.5, 0.18, 'sine', 0.05);
          this.tone(988, i * 0.5 + 0.2, 0.18, 'sine', 0.05);
        }
        break;
      default:
        break;
    }
  },
};
