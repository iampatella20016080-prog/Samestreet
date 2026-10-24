// 上台用：快捷鍵、計時器、段落選單
// N 下一段　B 上一段　M 段落選單　P 暫停　T 計時器　V 靜音　G 後製開關　Q 顯示 QR code　Shift+R 清空手機互動結果
// （靜音用 V 不用 S：S 是雅婷往後走的鍵）
window.SS = window.SS || {};

SS.presenter = {
  timerOn: false,
  menuOpen: false,
  menuSel: 0,
  _resetArmed: 0,

  init() {
    this.timerEl = document.getElementById('presenter-timer');
    this.menuEl = document.getElementById('menu');
    this.pauseEl = document.getElementById('pause-badge');
    this.menuEl.addEventListener('pointerdown', (e) => {
      if (e.target.closest('[data-act]')) return;
      const item = e.target.closest('[data-i]');
      // 點選單外面＝關閉
      if (!item) {
        if (!e.target.closest('.menu-box')) this.closeMenu();
        return;
      }
      this.closeMenu();
      SS.director.go(Number(item.dataset.i));
    });
    // 觸控裝置的按鈕列；全螢幕要在 click 裡呼叫，瀏覽器才准
    this.menuEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (btn) this.act(btn.dataset.act);
    });
    this.pauseEl.textContent = SS.tip('暫停（P 繼續）', '暫停（點這裡繼續）');
    this.pauseEl.addEventListener('click', () => this.togglePause());
  },

  act(name) {
    this.closeMenu();
    if (name === 'prev') SS.director.prev();
    else if (name === 'next') SS.director.next();
    else if (name === 'pause') this.togglePause();
    else if (name === 'mute') SS.ui.toast(SS.sfx.toggle() ? '音效：關' : '音效：開');
    else if (name === 'full') SS.input.toggleFullscreen();
  },

  update() {
    const I = SS.input;
    const take = (code) => {
      if (!I.pressed(code)) return false;
      I.consume(code);
      return true;
    };
    if (this.menuOpen) {
      if (take('ArrowDown')) this.moveMenu(1);
      if (take('ArrowUp')) this.moveMenu(-1);
      if (take('Enter') || take('Space')) {
        const i = this.menuSel;
        this.closeMenu();
        SS.director.go(i);
      }
      if (take('Escape') || take('KeyM')) this.closeMenu();
      // 選單開著時，其他按鍵都不往下傳
      I._pressed.clear();
      return;
    }
    if (take('KeyN')) SS.director.next();
    if (take('KeyB')) SS.director.prev();
    if (take('KeyM')) this.openMenu();
    if (take('KeyP')) this.togglePause();
    if (take('KeyT')) {
      this.timerOn = !this.timerOn;
      this.timerEl.classList.toggle('show', this.timerOn);
    }
    if (take('KeyV')) SS.ui.toast(SS.sfx.toggle() ? '音效：關' : '音效：開');
    if (take('KeyG')) {
      const on = !SS.post.enabled;
      SS.post.setEnabled(on);
      SS.ui.toast(on ? '後製特效：開' : '後製特效：關（畫面比較順）');
    }
    if (take('KeyQ')) SS.panels.qr.toggle(SS.live.phoneLink());
    if (I.pressed('KeyR') && I.down('ShiftLeft', 'ShiftRight')) {
      I.consume('KeyR');
      this.resetLive();
    }
    if (SS.state.paused) I._pressed.clear();
    if (this.timerOn) this.renderTimer();
  },

  togglePause() {
    SS.state.paused = !SS.state.paused;
    this.pauseEl.classList.toggle('show', SS.state.paused);
  },

  // 連按兩次才清空，避免上台時誤按
  resetLive() {
    const now = performance.now();
    if (now - this._resetArmed > 3000) {
      this._resetArmed = now;
      SS.ui.toast('再按一次 Shift+R：清空手機投票與叫名字的結果');
      return;
    }
    this._resetArmed = 0;
    SS.live
      .reset()
      .then(() => SS.ui.toast('手機互動結果已清空'))
      .catch(() => SS.ui.toast('清空失敗：連不上 Firebase'));
  },

  title(i) {
    const s = SS.director.list[i];
    return (s && SS.DATA.scenes[s.id] && SS.DATA.scenes[s.id].title) || s.id;
  },

  openMenu() {
    this.menuOpen = true;
    this.menuSel = SS.director.index;
    const list = SS.director.list;
    this.menuEl.innerHTML = `<div class="menu-box"><h2>段落選單</h2>${SS.touch ? this.touchBar() : ''}<ol>${list
      .map((s, i) => {
        const sec = (SS.DATA.scenes[s.id] || {}).targetSec;
        return `<li data-i="${i}"><b>${i}</b><span>${this.title(i)}</span><em>${sec ? this.fmt(sec) : ''}</em></li>`;
      })
      .join('')}</ol><p>${SS.tip('↑↓ 選擇　Enter 跳過去　M 關閉', '點段落跳過去　點外面關閉')}</p></div>`;
    this.menuEl.classList.add('show');
    this.moveMenu(0);
  },

  touchBar() {
    const btns = [
      ['prev', '上一段'],
      ['next', '下一段'],
      ['pause', SS.state.paused ? '繼續' : '暫停'],
      ['mute', SS.sfx.muted ? '開音效' : '靜音'],
    ];
    if (SS.input.canFullscreen) btns.push(['full', '全螢幕']);
    return `<div class="menu-acts">${btns.map(([k, t]) => `<button type="button" data-act="${k}">${t}</button>`).join('')}</div>`;
  },

  moveMenu(d) {
    const n = SS.director.list.length;
    this.menuSel = (this.menuSel + d + n) % n;
    this.menuEl.querySelectorAll('li').forEach((li, i) => {
      li.classList.toggle('sel', i === this.menuSel);
      li.classList.toggle('now', i === SS.director.index);
    });
    const sel = this.menuEl.querySelector('li.sel');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  },

  closeMenu() {
    this.menuOpen = false;
    this.menuEl.classList.remove('show');
  },

  fmt(sec) {
    sec = Math.max(0, Math.floor(sec));
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  },

  renderTimer() {
    const D = SS.director;
    const s = D.list[D.index];
    if (!s) return;
    const target = (SS.DATA.scenes[s.id] || {}).targetSec || 0;
    const over = target && D.sceneTime > target;
    this.timerEl.classList.toggle('over', !!over);
    this.timerEl.innerHTML = `<b>${D.index}／${D.list.length - 1}　${this.title(D.index)}</b>
      <span>${this.fmt(D.sceneTime)}${target ? `／${this.fmt(target)}` : ''}</span><small>總計 ${this.fmt(D.totalTime)}</small>`;
  },
};
