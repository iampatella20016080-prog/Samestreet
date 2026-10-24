// 畫面上的 HTML 介面
window.SS = window.SS || {};

SS.ui = {
  areaEl: null,
  clockEl: null,
  hintEl: null,
  _areaTimer: null,

  init() {
    this.areaEl = document.getElementById('area-label');
    this.clockEl = document.getElementById('hud-clock');
    this.hintEl = document.getElementById('hint');
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
    this.clockEl.innerHTML = `${time}<small>${note || ''}</small>`;
  },

  hideHint() {
    this.hintEl.classList.add('hide');
  },

  doneLoading() {
    const el = document.getElementById('loading');
    el.classList.add('done');
    setTimeout(() => el.remove(), 700);
  },
};
