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
    this.ffEl = $('ff');
    this.flyEl = $('fly');
    this.choresEl = $('chores-hud');
    this.labels.init($('labels'));
    this.dialog.init($('dialog'));
    this.hud.init($('hud'));
    this.hold.init($('hold'));
    // 點對話框、字幕、標題也能前進（用滑鼠或 iPad 操作時）
    for (const el of [this.dialog.el, this.captionEl, this.titleEl]) {
      el.addEventListener('pointerdown', () => SS.input._pressed.add('Space'));
    }
    // 觸控：按住圓圈＝按住空白鍵、右下角按鈕＝按住 E、左上角 ☰ 叫出段落選單
    SS.input.bindHold(this.hold.el, 'Space');
    this.actEl = $('touch-act');
    SS.input.bindHold(this.actEl, 'KeyE');
    $('touch-menu').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      SS.input._pressed.add('KeyM');
    });
    this.nextEl = $('next-hint');
    this.nextEl.textContent = SS.tip('按空白鍵，或點一下繼續', '點一下繼續');
    this.nextEl.addEventListener('click', () => SS.input._pressed.add('Space'));
    if (SS.touch) $('hint').textContent = '左下搖桿移動（推到底快走）　拖曳畫面轉視角　兩指縮放　點一下繼續';
    // 手機橫拿時畫面很矮：大面板依螢幕高度等比例縮小（投影和 iPad 的高度夠，比例是 1）
    const fit = () => document.documentElement.style.setProperty('--fit', Math.min(1, Math.max(0.5, innerHeight / 640)).toFixed(3));
    fit();
    window.addEventListener('resize', fit);
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
    this.ff(false);
    this.chores(null);
    this.grey(false);
    this.labels.clear();
    this.vignette(0);
    this.whispers(false);
    this.hold.hide();
    this.hud.show(false);
    this.setClock(null);
    this.hideHint();
    this.areaEl.classList.remove('show');
    this.bubblesEl.textContent = '';
    this.flyEl.textContent = '';
    this.hud.el.classList.remove('glitch');
  },

  update(dt) {
    this.dialog.update(dt);
    if (SS.stage) this.labels.update(SS.stage.camera);
  },

  // 畫面上方的「▶▶ 快轉」（倒帶時換成「◀◀ 倒帶」）
  ff(on, text = '▶▶ 快轉') {
    this.ffEl.textContent = text;
    this.ffEl.classList.toggle('show', !!on);
  },

  // 計數變動：「外勞 +1」「名字 +1」從對話框飛到右上角，飛到了才換數字
  flyCount(kind, onArrive) {
    let done = false;
    const arrive = () => {
      if (done) return;
      done = true;
      onArrive();
    };
    const row = kind === 'gaikao' ? this.hud.gaikaoRow : this.hud.nameRow;
    const box = this.hud.el.querySelector('.hud-count');
    if (!this.hud.el.classList.contains('show') || box.hidden || !this.flyEl.animate) return arrive();
    const to = row.getBoundingClientRect();
    const src = this.dialog.el.classList.contains('show') ? this.dialog.el.getBoundingClientRect() : null;
    const fx = src ? src.left + src.width / 2 : innerWidth / 2;
    const fy = src ? src.top : innerHeight * 0.55;
    const dx = to.left + to.width / 2 - fx;
    const dy = to.top + to.height / 2 - fy;
    const chip = document.createElement('div');
    chip.className = `fly-chip ${kind}`;
    chip.textContent = kind === 'gaikao' ? '外勞 +1' : '名字 +1';
    chip.style.left = `${fx}px`;
    chip.style.top = `${fy}px`;
    this.flyEl.appendChild(chip);
    const anim = chip.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 0 },
        { transform: 'translate(-50%, -150%) scale(1.25)', opacity: 1, offset: 0.25 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.6)`, opacity: 0.9 },
      ],
      { duration: 1100, easing: 'cubic-bezier(.45,0,.3,1)' }
    );
    anim.onfinish = () => {
      chip.remove();
      arrive();
    };
    // 分頁在背景時動畫可能不會跑完：最晚 1.4 秒還是要換數字
    setTimeout(() => {
      chip.remove();
      arrive();
    }, 1400);
  },

  // 在等「繼續」卻一直沒人按：有對話框就在框角閃 ▼，沒有就在下方跳出提示（只在觀眾版用）
  nextHint(on) {
    const inDialog = on && this.dialog.el.classList.contains('show');
    const pill = on && !inDialog;
    if (inDialog !== this._nextDlg) this.dialog.el.classList.toggle('waiting', (this._nextDlg = inDialog));
    if (pill !== this._nextPill) this.nextEl.classList.toggle('show', (this._nextPill = pill));
  },

  // 家務小遊戲的倒數與件數；null 收起
  chores(st) {
    const el = this.choresEl;
    this.actEl.classList.toggle('show', !!st);
    if (!st) {
      this.choresAt = 0;
      el.className = '';
      el.innerHTML = '';
      return;
    }
    if (!this.choresAt) this.choresAt = performance.now();
    const compact = SS.touch && performance.now() - this.choresAt > 6000;
    el.className = `show${st.left <= 5 ? ' hurry' : ''}${compact ? ' compact' : ''}`;
    el.innerHTML = `<b>剩 ${Math.max(0, Math.ceil(st.left))} 秒</b><span>做完 ${st.done} 件　還有 ${st.remaining} 件</span>
      <small>${SS.tip('WASD 走過去，按住 E 做家務；阿公叫人時，要先跑回阿公旁邊按住 E', '用搖桿走過去，按住右下角按鈕做家務；阿公叫人時，要先跑回阿公旁邊按住')}</small>`;
  },

  // 時間到：3D 畫面變灰
  grey(on) {
    document.getElementById('app').classList.toggle('grey', !!on);
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

  title(heading, sub, credits) {
    const el = this.titleEl;
    if (!heading) {
      el.className = '';
      el.innerHTML = '';
      return;
    }
    const list = credits ? `<dl class="credits">${credits.map(([role, names]) => `<dt>${role}</dt><dd>${names}</dd>`).join('')}</dl>` : '';
    el.innerHTML = `<h1>${heading}</h1>${sub ? `<p>${sub}</p>` : ''}${list}`;
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

// 3D 物件頭上的小標籤：家務名稱（附進度圈）、阿公叫人、客人竊竊私語
SS.ui.labels = {
  init(el) {
    this.el = el;
    this.items = new Map();
    this._v = new THREE.Vector3();
  },

  // opts：text、object（跟著某個 3D 物件）或 pos（固定的世界座標）、lift（往上抬多少）、
  // kind（task 家務／call 叫人／whisper 小聲講話／info 說明）、progress（0～1）
  set(id, opts) {
    let it = this.items.get(id);
    if (!it) {
      const div = document.createElement('div');
      div.innerHTML = `<svg viewBox="0 0 40 40"><circle class="track" cx="20" cy="20" r="16"/><circle class="bar" cx="20" cy="20" r="16"/></svg><span></span>`;
      this.el.appendChild(div);
      it = { div, span: div.querySelector('span'), bar: div.querySelector('.bar'), opts: {} };
      this.items.set(id, it);
    }
    Object.assign(it.opts, opts);
    const o = it.opts;
    it.span.textContent = o.text || '';
    it.div.className = `wlabel ${o.kind || 'task'}${o.progress > 0 ? ' busy' : ''}`;
    it.bar.style.strokeDashoffset = 100.5 * (1 - SS.util.clamp(o.progress || 0, 0, 1));
  },

  remove(id) {
    const it = this.items.get(id);
    if (!it) return;
    it.div.remove();
    this.items.delete(id);
  },

  clear() {
    for (const id of [...this.items.keys()]) this.remove(id);
  },

  update(camera) {
    const v = this._v;
    for (const it of this.items.values()) {
      const o = it.opts;
      if (o.object) o.object.getWorldPosition(v);
      else v.copy(o.pos);
      v.y += o.lift || 0;
      v.project(camera);
      const show = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      it.div.style.display = show ? '' : 'none';
      if (show) {
        it.div.style.left = `${((v.x + 1) / 2) * innerWidth}px`;
        it.div.style.top = `${((1 - v.y) / 2) * innerHeight}px`;
      }
    }
  },
};

// 對話框：有 3D 人物時跟著頭頂，沒有時放在畫面下方
SS.ui.dialog = {
  init(el) {
    this.el = el;
    el.innerHTML = `<div class="dlg-head"><span class="dlg-name"></span><span class="dlg-lang"></span><span class="dlg-note"></span></div>
      <div class="dlg-text"></div><div class="dlg-sub"></div><div class="dlg-tag"></div><i class="dlg-next">▼</i>`;
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

  // 帶著雜訊閃回來
  glitch() {
    this.el.classList.remove('glitch');
    void this.el.offsetWidth;
    this.el.classList.add('glitch');
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
