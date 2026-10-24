// 大面板：手機、理論卡、履歷投票、選項、帳本、看法、剪報、開場 QR code
window.SS = window.SS || {};

SS.panels = (function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  let panelEl, choicesEl, qrEl;

  function init() {
    panelEl = $('panel');
    choicesEl = $('choices');
    qrEl = $('qr');
    phone.init($('phone'));
    // 用 click 不用 pointerdown：手機上面板塞不下時要能捲動，捲動不能算成「繼續」；點履歷卡另外處理
    panelEl.addEventListener('click', (e) => {
      if (!e.target.closest('.cv')) SS.input._pressed.add('Space');
    });
  }

  function reset() {
    phone.close();
    hidePanel();
    choices.hide();
  }

  function showPanel(kind, html) {
    panelEl.className = `show ${kind}`;
    panelEl.innerHTML = html;
  }

  function hidePanel() {
    panelEl.className = '';
    panelEl.innerHTML = '';
  }

  // 0～1 的票數比例，給長條用
  const ratios = (counts) => {
    const total = counts.reduce((a, b) => a + b, 0);
    return counts.map((n) => (total ? n / total : 0));
  };

  // 數字像吃角子老虎一樣滾到目標值（照真實經過的時間算，分頁在背景也會停在正確的數字）
  function roll(el, from, to, ms, render = (n) => String(n)) {
    const start = performance.now();
    const tick = () => {
      if (!el.isConnected) return;
      const k = Math.min(1, (performance.now() - start) / ms);
      el.textContent = render(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) setTimeout(tick, 33);
      else SS.sfx.play('pop');
    };
    tick();
  }

  // ---------- 手機 ----------
  const phone = {
    init(el) {
      this.el = el;
      el.innerHTML = `<div class="phone-body"><div class="phone-notch"></div><div class="phone-screen">
        <div class="ph-chat"><div class="ph-head"><span class="ph-back">‹</span><span class="ph-title"></span></div>
          <div class="ph-log"></div><div class="ph-input"><span class="ph-field"></span><span class="ph-send">傳送</span></div></div>
        <div class="ph-call"><div class="ph-remote"></div><div class="ph-callname"></div><div class="ph-caption"></div>
          <div class="ph-confirm"></div><div class="ph-bar"><span class="ph-end"></span></div></div>
        <div class="ph-ring"><div class="ph-ringname"></div><div class="ph-ringsub">來電</div>
          <div class="ph-ringbtns"><span class="ph-decline"></span><span class="ph-accept"></span></div></div>
      </div></div>`;
      const q = (s) => el.querySelector(s);
      this.titleEl = q('.ph-title');
      this.log = q('.ph-log');
      this.field = q('.ph-field');
      this.remote = q('.ph-remote');
      this.callName = q('.ph-callname');
      this.captionEl = q('.ph-caption');
      this.confirmEl = q('.ph-confirm');
      this.ringName = q('.ph-ringname');
      // 點手機畫面也能繼續（跟點對話框一樣）
      el.addEventListener('click', () => SS.input._pressed.add('Space'));
    },
    open(mode) {
      this.el.className = `show ${mode}`;
    },
    close() {
      if (this.el) this.el.className = '';
    },
    chat(title) {
      this.open('chat');
      this.titleEl.textContent = title;
      this.log.textContent = '';
      this.type('');
    },
    message(msg) {
      const me = msg.who === 'yating';
      const row = document.createElement('div');
      row.className = `ph-msg${me ? ' me' : ''}`;
      const name = SS.DATA.people[msg.who] || '';
      row.innerHTML = `${me ? '' : `<span class="ph-avatar">${esc(name.slice(0, 1))}</span>`}
        <div><div class="ph-from">${me ? '' : esc(name)}</div><div class="ph-bubble">${esc(msg.text)}</div></div>`;
      this.log.appendChild(row);
      this.log.scrollTop = this.log.scrollHeight;
      SS.sfx.play('ding');
    },
    type(text) {
      this.field.textContent = text;
      this.field.classList.toggle('typing', !!text);
    },
    // side：手機放右邊，讓 3D 畫面裡的人物露出來
    video(who, name, side = false) {
      this.open(`call${side ? ' side' : ''}`);
      this.remote.innerHTML = SS.ui.portrait(who);
      this.callName.textContent = name;
      this.captionEl.textContent = '';
      this.confirmEl.textContent = '';
      this.confirmEl.classList.remove('show', 'pressed');
    },
    caption(line) {
      const name = SS.DATA.people[line.who] || '';
      const lang = SS.DATA.langNames[line.lang];
      this.captionEl.innerHTML = `<b>${esc(name)}${lang ? `<em>${lang}</em>` : ''}</b><span>${esc(line.text)}</span>${line.sub ? `<small>${esc(line.sub)}</small>` : ''}`;
      this.captionEl.classList.remove('pop');
      void this.captionEl.offsetWidth;
      this.captionEl.classList.add('pop');
    },
    confirm(text) {
      this.confirmEl.textContent = text;
      this.confirmEl.classList.add('show');
      setTimeout(() => this.confirmEl.classList.add('pressed'), 450);
    },
    ring(name) {
      this.open('ring');
      this.ringName.textContent = name;
      SS.sfx.play('ring');
    },
  };

  // ---------- 理論卡 ----------
  const card = {
    show(no) {
      const c = SS.DATA.cards.find((x) => x.no === no);
      if (!c) return;
      const total = SS.DATA.cards.length;
      showPanel('card', `<article class="theory">
        <div class="th-no">理論卡 ${c.no}／${total}</div>
        <h2>${esc(c.title)}</h2>
        <div class="th-lead">${c.lead.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
        <p class="th-body">${esc(c.body)}</p>
        <div class="th-source">${esc(c.source)}</div>
        <div class="th-hint">${SS.tip('按空白鍵繼續', '點一下繼續')}</div>
      </article>`);
    },
    hide: hidePanel,
  };

  // ---------- 履歷投票 ----------
  const vote = {
    show(resumes, fields, question, seconds) {
      const cards = resumes
        .map((r, i) => `<div class="cv" data-i="${i}">
          <div class="cv-head"><b>${esc(r.name)}</b><span>${esc(r.country)}</span></div>
          ${fields.map(([k, label]) => `<div class="cv-row ${k}"><span>${label}</span><b>${esc(r[k])}</b></div>`).join('')}
          <div class="cv-live"><i></i><span></span></div>
          <div class="cv-key">${i + 1}</div>
          <div class="cv-stamp">已被訂走</div>
        </div>`)
        .join('');
      showPanel('vote', `<div class="vote">
        <div class="vote-top"><h2>${esc(question)}</h2><div class="vote-clock" style="--sec:${seconds}s"><span>${seconds}</span></div></div>
        <div class="cvs">${cards}</div>
        <div class="vote-note">${SS.live.audience ? SS.tip('按 1、2、3 選一位', '點一張履歷，選一位') : '台下用手機投票，或舉手後由操作的人按 1、2、3 記錄'}</div>
        <div class="vote-reveal"></div>
      </div>`);
      // 點履歷卡＝按 1、2、3
      panelEl.querySelectorAll('.cv').forEach((el, i) => {
        el.addEventListener('click', () => SS.input._pressed.add(`Digit${i + 1}`));
      });
      // 十秒倒數只是視覺效果，不會自動跳走
      const num = panelEl.querySelector('.vote-clock span');
      let left = seconds;
      clearInterval(this._timer);
      this._timer = setInterval(() => {
        left -= 1;
        if (!num.isConnected || left < 0) return clearInterval(this._timer);
        num.textContent = left;
      }, 1000);
    },
    tally(counts) {
      const r = ratios(counts);
      panelEl.querySelectorAll('.cv').forEach((el, i) => {
        el.querySelector('.cv-live i').style.width = `${Math.round(r[i] * 100)}%`;
        el.querySelector('.cv-live span').textContent = counts[i] ? `${counts[i]} 票` : '';
      });
    },
    lock(i) {
      clearInterval(this._timer);
      panelEl.querySelector('.vote').classList.add('locked');
      panelEl.querySelectorAll('.cv').forEach((el, k) => el.classList.toggle('chosen', k === i));
    },
    reveal(text) {
      const v = panelEl.querySelector('.vote');
      v.classList.add('revealed');
      v.querySelector('.vote-reveal').textContent = text;
    },
    taken(i) {
      panelEl.querySelector('.vote').classList.add('taken');
      panelEl.querySelectorAll('.cv').forEach((el, k) => {
        el.classList.toggle('stamped', k === i);
        el.classList.toggle('faded', k !== 0);
      });
      SS.sfx.play('stamp');
    },
  };

  // ---------- 選項（訓練中心） ----------
  const choices = {
    show(options) {
      choicesEl.innerHTML = options
        .map((t, i) => `<div class="choice" data-i="${i}"><b>${i + 1}</b><span>${esc(t)}</span><em>退回</em><div class="choice-live"><i></i></div></div>`)
        .join('');
      choicesEl.className = 'show';
      choicesEl.querySelectorAll('.choice').forEach((el, i) => {
        el.addEventListener('pointerdown', () => SS.input._pressed.add(`Digit${i + 1}`));
      });
    },
    highlight(i) {
      choicesEl.querySelectorAll('.choice').forEach((el, k) => el.classList.toggle('sel', k === i));
    },
    reject(i) {
      const el = choicesEl.querySelectorAll('.choice')[i];
      el.classList.add('rejected');
      SS.sfx.play('stamp');
    },
    shake(i) {
      const el = choicesEl.querySelectorAll('.choice')[i];
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
    },
    pick(i) {
      choicesEl.querySelectorAll('.choice')[i].classList.add('picked');
    },
    tally(counts) {
      const r = ratios(counts);
      choicesEl.querySelectorAll('.choice').forEach((el, i) => {
        el.classList.add('live');
        el.querySelector('.choice-live i').style.width = `${Math.round(r[i] * 100)}%`;
        el.querySelector('.choice-live').dataset.n = counts[i] ? `${counts[i]} 人` : '';
      });
    },
    hide() {
      choicesEl.className = '';
      choicesEl.innerHTML = '';
    },
  };

  // ---------- 帳本 ----------
  const ledger = {
    counts(items) {
      showPanel('paper', `<div class="ledger">
        <h2>帳本　一</h2>
        <div class="counts">${items
          .map(
            (it) => `<div class="count"><span>${esc(it.label)}</span><b>${it.n}</b>
              <em>${it.names.length ? `（${esc(it.names.join('、'))}）` : ''}</em>
              ${it.times > it.n ? `<small>一共叫了 ${it.times} 次</small>` : ''}</div>`
          )
          .join('')}</div>
      </div>`);
      panelEl.querySelectorAll('.count b').forEach((b, i) => roll(b, 0, items[i].n, 900 + i * 300));
    },
    table(t) {
      const head = t.cols.map((c) => `<th>${esc(c)}</th>`).join('');
      const rows = t.rows
        .map((r, i) => `<tr class="${i === t.guessRow ? 'guess' : ''}">${r.map((c, k) => (k ? `<td>${esc(c)}</td>` : `<th>${esc(c)}</th>`)).join('')}</tr>`)
        .join('');
      showPanel('paper', `<div class="ledger">
        <h2>帳本　二</h2>
        <table class="book"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>
        <div class="guess-live"></div>
      </div>`);
    },
    guessTally(options, counts) {
      const r = ratios(counts);
      const box = panelEl.querySelector('.guess-live');
      if (!box) return;
      box.innerHTML = `<b>台下猜：</b>${options
        .map((o, i) => `<span><em style="width:${Math.round(r[i] * 100)}%"></em>${esc(o.label)}　${counts[i] || 0}</span>`)
        .join('')}`;
      box.classList.add('show');
    },
    // 揭曉時薪：數字從最低工資時薪 196 一路滾下來
    revealGuess(from = 196) {
      const row = panelEl.querySelector('tr.guess');
      if (!row) return;
      row.classList.add('revealed');
      const cell = row.querySelector('td:last-child');
      const text = cell.textContent;
      const m = text.match(/\d+/);
      if (m) roll(cell, from, Number(m[0]), 1400, (n) => text.replace(m[0], String(n)));
      SS.sfx.play('stamp');
    },
    sides(gains, costs) {
      showPanel('paper', `<div class="ledger">
        <h2>帳本　三</h2>
        <div class="sides">
          <div class="side gains"><h3>誰得到好處</h3>${gains.map((g) => `<p>${esc(g)}</p>`).join('')}</div>
          <div class="side costs"><h3>誰付出代價</h3>${costs.map((c) => `<p>${esc(c)}</p>`).join('')}</div>
        </div>
      </div>`);
      this._step = 0;
    },
    // 一次亮一個，全部亮完回傳 false
    step() {
      const items = panelEl.querySelectorAll('.side p');
      if (this._step >= items.length) return false;
      items[this._step++].classList.add('lit');
      SS.sfx.play('pop');
      return true;
    },
  };

  // ---------- 看法、剪報 ----------
  const views = {
    show(view, stat) {
      showPanel('paper', `<div class="view">
        <h2>${esc(view.title)}</h2>
        <p>${esc(view.body)}</p>
        ${stat ? `<div class="view-stat">${esc(stat)}</div>` : ''}
      </div>`);
    },
  };

  const clipping = {
    show(c) {
      showPanel('clip', `<div class="clipping"><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></div>`);
    },
  };

  // ---------- 開場：QR code ----------
  function qrSvg(text) {
    if (!window.qrcode) return '<div class="qr-missing">QR code 要有網路才能顯示</div>';
    const qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  }

  const lobby = {
    show(d, link) {
      // 觀眾自己玩的版本沒有台下投票，不放 QR code，改成操作說明
      const keys = SS.touch
        ? [['點一下', '繼續'], ['左下搖桿', '走路（推到底快走）'], ['拖曳畫面', '轉視角，兩指縮放'], ['選項、履歷', '直接點'], ['左上角 ☰', '跳段落、暫停']]
        : [['空白鍵／點一下', '繼續'], ['WASD／方向鍵', '走路（Shift 快走）'], ['拖曳／滾輪', '轉視角／縮放'], ['1／2／3', '選選項（也可以直接點）'], ['N／B／M', '下一段／上一段／段落選單']];
      const body = SS.live.audience
        ? `<div class="lobby-keys">${keys.map(([k, v]) => `<b>${k}</b><span>${v}</span>`).join('')}</div>`
        : `<div class="lobby-qr">${qrSvg(link)}</div>
          <div class="lobby-text">${d.lines.map((l) => `<p>${esc(l)}</p>`).join('')}<small>${esc(link)}</small></div>`;
      showPanel('lobby', `<div class="lobby">
        <h1>${esc(d.heading)}</h1>
        <div class="lobby-row">${body}</div>
        <div class="th-hint">${SS.tip('按空白鍵開始', '點一下開始')}</div>
      </div>`);
    },
  };

  // 上台中途按 Q 叫出 QR code
  const qr = {
    toggle(link) {
      if (SS.live.audience) return SS.ui.toast('這個版本沒有連到台下投票');
      const on = !qrEl.classList.contains('show');
      qrEl.innerHTML = on ? `<div class="qr-box">${qrSvg(link)}<p>掃描加入台下互動</p><small>${esc(link)}</small></div>` : '';
      qrEl.classList.toggle('show', on);
    },
  };

  return { init, reset, phone, card, vote, choices, ledger, views, clipping, lobby, qr, hidePanel };
})();
