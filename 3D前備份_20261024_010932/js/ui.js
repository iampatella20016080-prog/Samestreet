// 畫面上的 HTML 介面：地名、時鐘、對話框、HUD、字幕、轉場
window.SS = window.SS || {};

SS.ui = {
  _areaTimer: null,
  _toastTimer: null,

  init() {
    const $ = (id) => document.getElementById(id);
    this.areaEl = $('area-label');
    this.clockEl = $('hud-clock');
    this.hintEl = $('hint');
    this.fadeEl = $('fade');
    this.slateEl = $('slate');
    this.captionEl = $('caption');
    this.citeEl = $('cite');
    this.toastEl = $('toast');
    this.tintEl = $('tint');
    this.titleEl = $('title-card');
    this.vignetteEl = $('vignette');
    this.whispersEl = $('whispers');
    this.bubblesEl = $('bubbles');
    this.blockedEl = $('blocked');
    this.wipEl = $('wip');
    this.dialog.init($('dialog'));
    this.hud.init($('hud'));
    this.hold.init($('hold'));
    // 點對話框、字幕、標題也能前進（用滑鼠或 iPad 操作時）
    for (const el of [this.dialog.el, this.captionEl, this.titleEl]) {
      el.addEventListener('pointerdown', () => SS.input._pressed.add('Space'));
    }
  },

  // 換段落時把上一段的介面全部收掉；上一段若停在黑幕，就從黑幕淡入
  reset() {
    this.fade(false, 0.7);
    this.dialog.hide();
    this.caption(null);
    this.slate(null);
    this.cite(null);
    this.tint(null);
    this.title(null);
    this.blocked(false);
    this.wip(null);
    this.vignette(0);
    this.whispers(false);
    this.hold.hide();
    this.hud.show(false);
    this.setClock(null);
    this.hideHint();
    this.areaEl.classList.remove('show');
    this.bubblesEl.textContent = '';
  },

  update(dt) {
    this.dialog.update(dt);
  },

  showArea(text) {
    const el = this.areaEl;
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(this._areaTimer);
    this._areaTimer = setTimeout(() => el.classList.remove('show'), 2200);
  },

  setClock(time, note) {
    if (!time) {
      this.clockEl.style.display = 'none';
      return;
    }
    this.clockEl.style.display = '';
    this.clockEl.innerHTML = `${time}${note ? `<small>${note}</small>` : ''}`;
  },

  showHint() {
    this.hintEl.classList.remove('hide');
  },

  hideHint() {
    this.hintEl.classList.add('hide');
  },

  doneLoading() {
    const el = document.getElementById('loading');
    el.classList.add('done');
    setTimeout(() => el.remove(), 700);
  },

  // 黑幕：on 為 true 時變黑
  fade(on, sec = 0.8) {
    this.fadeEl.style.transitionDuration = `${sec}s`;
    this.fadeEl.classList.toggle('on', on);
  },

  // 置中的白字（轉場、舞台指示）；dark 為 true 時襯黑底
  caption(lines, opts = {}) {
    const el = this.captionEl;
    if (!lines) {
      el.className = '';
      el.textContent = '';
      return;
    }
    el.textContent = '';
    [].concat(lines).forEach((text, i) => {
      const p = document.createElement('p');
      p.textContent = text;
      p.style.animationDelay = `${i * (opts.stagger ?? 1)}s`;
      el.appendChild(p);
    });
    el.className = `show${opts.dark ? ' dark' : ''}`;
  },

  // 不在街區裡的場景（教室、屋內）先用插畫背板
  slate(kind, html = '') {
    const el = this.slateEl;
    if (!kind) {
      el.className = '';
      el.innerHTML = '';
      el.style.removeProperty('--mask');
      return;
    }
    el.className = `show ${kind}`;
    el.innerHTML = html;
  },

  // 右下角的出處標籤
  cite(text) {
    this.citeEl.textContent = text || '';
    this.citeEl.classList.toggle('show', !!text);
  },

  toast(text, sec = 2.4) {
    const el = this.toastEl;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), sec * 1000);
  },

  // 整個畫面的色調：night 夜晚、dusk 黃昏
  tint(kind) {
    this.tintEl.className = kind ? `show ${kind}` : '';
  },

  title(heading, sub) {
    const el = this.titleEl;
    if (!heading) {
      el.className = '';
      el.innerHTML = '';
      return;
    }
    el.innerHTML = `<h1>${heading}</h1>${sub ? `<p>${sub}</p>` : ''}`;
    el.className = 'show';
  },

  // 天橋前的大叉
  blocked(on, text = '✕') {
    this.blockedEl.textContent = on ? text : '';
    this.blockedEl.classList.toggle('show', !!on);
  },

  // 左上角「製作中」標籤：3D 還沒做好的地方先標起來，排練時才不會誤會
  wip(text) {
    this.wipEl.textContent = text ? `製作中：${text}` : '';
    this.wipEl.classList.toggle('show', !!text);
  },

  // 被注視時畫面四周變暗
  vignette(amount) {
    this.vignetteEl.style.opacity = SS.util.clamp(amount, 0, 1);
  },

  // 客人小聲講話：畫面上浮出幾個「…」
  whispers(on) {
    const el = this.whispersEl;
    el.textContent = '';
    if (!on) return;
    const spots = [[18, 30], [30, 52], [70, 34], [82, 55], [55, 24]];
    spots.forEach(([x, y], i) => {
      const b = document.createElement('span');
      b.textContent = '…';
      b.style.left = `${x}%`;
      b.style.top = `${y}%`;
      b.style.animationDelay = `${i * 0.25}s`;
      el.appendChild(b);
    });
  },

  // 台下有人在手機上叫她的名字
  nameBubble(text = 'Siti') {
    const b = document.createElement('span');
    b.textContent = text;
    b.style.left = `${6 + Math.random() * 84}vw`;
    b.style.setProperty('--drift', `${(Math.random() - 0.5) * 8}vw`);
    this.bubblesEl.appendChild(b);
    setTimeout(() => b.remove(), 3600);
  },

  // 簡單的人物頭像（3D 還沒做好的場景先用）
  portrait(who, opts = {}) {
    const mask = opts.mask === undefined ? '' : ` style="--mask:${opts.mask}"`;
    return `<div class="portrait" data-who="${who}"${mask}>
      <div class="pt-back"></div><div class="pt-body"></div>
      <div class="pt-face"><i class="pt-eye l"></i><i class="pt-eye r"></i><i class="pt-mouth"></i></div>
      <div class="pt-front"></div>
      <div class="pt-mask"><i class="l"></i><i class="r"></i><b></b></div>
    </div>`;
  },
};

// 對話框：有 3D 人物時跟著頭頂，沒有時放在畫面下方
SS.ui.dialog = {
  init(el) {
    this.el = el;
    el.innerHTML = `<div class="dlg-head"><span class="dlg-name"></span><span class="dlg-lang"></span><span class="dlg-note"></span></div>
      <div class="dlg-text"></div><div class="dlg-sub"></div><div class="dlg-tag"></div>`;
    this.nameEl = el.querySelector('.dlg-name');
    this.langEl = el.querySelector('.dlg-lang');
    this.noteEl = el.querySelector('.dlg-note');
    this.textEl = el.querySelector('.dlg-text');
    this.subEl = el.querySelector('.dlg-sub');
    this.tagEl = el.querySelector('.dlg-tag');
    this.chars = [];
    this.shown = 0;
    this.typing = false;
    this.anchor = null;
    this._v = new THREE.Vector3();
  },

  // opts.masked：Siti 看到的遮罩字串；opts.anchor：{ object, lift }；opts.tag：下方灰色小字
  show(line, opts = {}) {
    const D = SS.DATA;
    this.nameEl.textContent = line.speaker || D.people[line.who] || '';
    const lang = D.langNames[line.lang];
    this.langEl.textContent = lang || '';
    this.langEl.hidden = !lang;
    this.noteEl.textContent = line.note ? `（${line.note}）` : '';
    const main = opts.masked || line.text;
    this.chars = Array.from(main);
    // 遮罩時下方附完整中文給台下看；外語附中文翻譯
    const subs = [];
    if (opts.masked) subs.push(line.text);
    if (line.sub) subs.push(line.sub);
    this.subEl.textContent = subs.join('　');
    this.subEl.classList.remove('show');
    this.tagEl.textContent = opts.tag || '';
    this.tagEl.hidden = !opts.tag;
    this.el.classList.toggle('masked', !!opts.masked);
    this.el.classList.toggle('loud', !!opts.loud);
    this.textEl.textContent = '';
    this.shown = 0;
    this.typing = true;
    this.speed = line.fast ? 90 : 32;
    this.anchor = opts.anchor || null;
    this.el.classList.add('show');
    this.place();
  },

  finish() {
    this.shown = this.chars.length;
    this.render();
  },

  update(dt) {
    if (!this.el.classList.contains('show')) return;
    if (this.typing && !SS.state.paused) {
      this.shown += this.speed * dt;
      this.render();
    }
    this.place();
  },

  render() {
    const n = Math.min(this.chars.length, Math.floor(this.shown));
    this.textEl.textContent = this.chars.slice(0, n).join('');
    if (n >= this.chars.length) {
      this.typing = false;
      this.subEl.classList.add('show');
    }
  },

  place() {
    const cam = SS.stage && SS.stage.camera;
    let anchored = false;
    if (this.anchor && cam) {
      const p = this._v;
      this.anchor.object.getWorldPosition(p);
      p.y += this.anchor.lift || 0;
      p.project(cam);
      if (p.z < 1 && Math.abs(p.x) < 0.98 && p.y < 0.98 && p.y > -0.6) {
        const w = this.el.offsetWidth;
        const h = this.el.offsetHeight;
        const want = ((p.x + 1) / 2) * innerWidth;
        const x = SS.util.clamp(want, w / 2 + 16, innerWidth - w / 2 - 16);
        const y = Math.max(((1 - p.y) / 2) * innerHeight, h + 40);
        this.el.style.left = `${x}px`;
        this.el.style.top = `${y}px`;
        this.el.style.setProperty('--tail', `${SS.util.clamp(want - x, -w / 2 + 30, w / 2 - 30)}px`);
        anchored = true;
      }
    }
    this.el.classList.toggle('bubble', anchored);
    this.el.classList.toggle('box', !anchored);
    if (!anchored) {
      this.el.style.left = '';
      this.el.style.top = '';
    }
  },

  hide() {
    this.el.classList.remove('show');
    this.anchor = null;
    this.typing = false;
  },
};

// 右上角：面具、名字計數、居留證、帳本（第二章才出現）
SS.ui.hud = {
  init(el) {
    this.el = el;
    el.innerHTML = `
      <div class="hud-btn hud-mask"><div class="hud-face"><i class="eye l"></i><i class="eye r"></i><i class="mouth"></i></div><div class="hud-mask-layer"></div></div>
      <div class="hud-btn hud-count"><div class="row name"><span>叫我名字</span><b>0</b></div><div class="row gaikao"><span>叫我外勞</span><b>0</b></div></div>
      <div class="hud-btn hud-card"><i></i><span>居留證</span></div>
      <div class="hud-btn hud-ledger"><i></i><span>帳本</span></div>`;
    this.maskEl = el.querySelector('.hud-mask');
    this.nameRow = el.querySelector('.row.name');
    this.gaikaoRow = el.querySelector('.row.gaikao');
    this.ledgerEl = el.querySelector('.hud-ledger');
  },

  // parts：{ mask, count, card, ledger }，false 全部收起
  show(parts) {
    const el = this.el;
    el.classList.toggle('show', !!parts);
    el.classList.remove('gone');
    if (!parts) return;
    el.querySelector('.hud-mask').hidden = !parts.mask;
    el.querySelector('.hud-count').hidden = !parts.count;
    el.querySelector('.hud-card').hidden = !parts.card;
    el.querySelector('.hud-ledger').hidden = !parts.ledger;
  },

  setMask(level) {
    level = SS.util.clamp(level, 0, 1);
    SS.state.mask = level;
    this.maskEl.style.setProperty('--mask', level);
    this.maskEl.classList.remove('drop');
  },

  dropMask() {
    this.maskEl.classList.remove('drop');
    void this.maskEl.offsetWidth;
    this.maskEl.classList.add('drop');
  },

  setFace(kind) {
    this.maskEl.dataset.face = kind;
  },

  setCounts(name, gaikao, bump) {
    this.nameRow.querySelector('b').textContent = name;
    this.gaikaoRow.querySelector('b').textContent = gaikao;
    const row = bump === 'name' ? this.nameRow : bump === 'gaikao' ? this.gaikaoRow : null;
    if (row) {
      row.classList.remove('bump');
      void row.offsetWidth;
      row.classList.add('bump');
    }
  },

  bumpLedger() {
    this.ledgerEl.classList.remove('bump');
    void this.ledgerEl.offsetWidth;
    this.ledgerEl.classList.add('bump');
  },

  // 頂樓禱告時整排慢慢消失，阿公一喊再回來
  vanish(on, sec = 1) {
    this.el.style.transitionDuration = `${sec}s`;
    this.el.classList.toggle('gone', on);
  },
};

// 按住空白鍵的環形進度條
SS.ui.hold = {
  init(el) {
    this.el = el;
    el.innerHTML = `<svg viewBox="0 0 100 100"><circle class="track" cx="50" cy="50" r="42"/><circle class="bar" cx="50" cy="50" r="42"/></svg><div class="hold-text"></div>`;
    this.bar = el.querySelector('.bar');
    this.textEl = el.querySelector('.hold-text');
    this.len = 2 * Math.PI * 42;
    this.bar.style.strokeDasharray = this.len;
  },
  show(text) {
    this.textEl.textContent = text;
    this.set(0);
    this.el.className = 'show';
  },
  set(p) {
    this.bar.style.strokeDashoffset = this.len * (1 - SS.util.clamp(p, 0, 1));
  },
  urgent(on) {
    this.el.classList.toggle('urgent', on);
  },
  hide() {
    this.el.className = '';
  },
};
