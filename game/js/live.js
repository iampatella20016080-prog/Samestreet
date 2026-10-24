// 台下手機互動：投票、猜時薪、叫名字
// 資料放在 Firebase Realtime Database，用 REST 讀寫，不需要額外套件
// 沒網路或還沒設定時不會報錯，只是收不到票，所以上台一定要留鍵盤備案
window.SS = window.SS || {};

SS.live = (function () {
  // 只有上台那台電腦才連到台下的房間：直接雙擊開檔、本機伺服器，或網址加上 ?host。
  // 觀眾用手機、iPad 打開公開網址時，投票只存在自己的瀏覽器裡，不會改到上台那一場的題目
  const host =
    location.protocol === 'file:' ||
    /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) ||
    new URLSearchParams(location.search).has('host');
  const conf = () => {
    const c = SS.LIVE_CONFIG || { db: 'local', phoneUrl: 'phone/', room: 'test' };
    return host ? c : { ...c, db: 'local' };
  };
  const handlers = {};
  const state = { online: null, q: null, a: {}, n: {}, people: 0, taps: 0 };
  let running = false;
  let inFlight = false;
  let again = false;
  let timer = null;
  let lastTaps = null;

  // 'rooms/x/q' 這種路徑在物件裡的讀寫
  const parts = (path) => path.split('/').filter(Boolean);
  function getAt(tree, path) {
    let node = tree;
    for (const k of parts(path)) {
      if (node === null || typeof node !== 'object') return null;
      node = node[k];
    }
    return node === undefined ? null : node;
  }
  function setAt(tree, path, val) {
    const ks = parts(path);
    let node = tree;
    for (const k of ks.slice(0, -1)) {
      if (node[k] === null || typeof node[k] !== 'object') node[k] = {};
      node = node[k];
    }
    const last = ks[ks.length - 1];
    if (val === null) delete node[last];
    else node[last] = JSON.parse(JSON.stringify(val));
  }

  // 本機測試：同一個瀏覽器的分頁共用 localStorage，手機頁開在另一個分頁就能模擬
  const LOCAL_KEY = 'ss-live-local';
  const local = {
    tree() {
      try {
        return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
      } catch (e) {
        return {};
      }
    },
    async get(path) {
      return getAt(this.tree(), path);
    },
    async put(path, val) {
      const t = this.tree();
      setAt(t, path, val);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(t));
    },
  };

  const firebase = {
    url: (path) => `https://${conf().db}/${path}.json`,
    async get(path) {
      const res = await fetch(this.url(path), { cache: 'no-store' });
      if (!res.ok) throw new Error(`讀取失敗（${res.status}）`);
      return res.json();
    },
    async put(path, val) {
      const res = await fetch(
        this.url(path),
        val === null ? { method: 'DELETE' } : { method: 'PUT', body: JSON.stringify(val) }
      );
      if (!res.ok) throw new Error(`寫入失敗（${res.status}）`);
    },
  };

  const isLocal = () => conf().db === 'local';
  const store = () => (isLocal() ? local : firebase);
  const roomPath = (sub) => `rooms/${conf().room}` + (sub ? `/${sub}` : '');

  function emit(ev, ...args) {
    for (const fn of handlers[ev] || []) {
      try {
        fn(...args);
      } catch (e) {
        console.error(e);
      }
    }
  }

  function setOnline(v) {
    if (state.online === v) return;
    state.online = v;
    emit('status', v);
  }

  function apply(room) {
    room = room || {};
    state.q = room.q || null;
    state.a = room.a || {};
    state.n = room.n || {};
    const counts = Object.values(state.n).filter((v) => typeof v === 'number');
    state.people = counts.length;
    state.taps = counts.reduce((s, v) => s + v, 0);
    // 第一次讀到的不算，免得一打開就噴出一堆泡泡
    if (lastTaps !== null && state.taps > lastTaps) emit('taps', state.taps - lastTaps);
    lastTaps = state.taps;
    emit('update', state);
  }

  // 有題目時每 0.7 秒問一次，沒題目時 2 秒一次
  async function poll() {
    if (!running) return;
    if (inFlight) {
      again = true;
      return;
    }
    inFlight = true;
    clearTimeout(timer);
    try {
      apply(await store().get(roomPath()));
      setOnline(true);
    } catch (e) {
      setOnline(false);
    }
    inFlight = false;
    if (!running) return;
    if (again) {
      again = false;
      poll();
      return;
    }
    timer = setTimeout(poll, state.q ? 700 : 2000);
  }

  return {
    state,
    // 觀眾自己看的版本（沒有連到台下投票）
    audience: !host,
    // 回傳取消訂閱的函式
    on(ev, fn) {
      (handlers[ev] = handlers[ev] || []).push(fn);
      return () => {
        handlers[ev] = handlers[ev].filter((f) => f !== fn);
      };
    },
    get mode() {
      return isLocal() ? 'local' : 'firebase';
    },
    start() {
      if (running) return;
      running = true;
      poll();
    },
    stop() {
      running = false;
      clearTimeout(timer);
    },
    // QR code 裡放的網址
    phoneLink() {
      const c = conf();
      const base = new URL(c.phoneUrl, location.href).href;
      return `${base}?db=${encodeURIComponent(c.db)}&r=${encodeURIComponent(c.room)}`;
    },
    // 出題：所有手機會換成這一題
    async ask(q) {
      await store().put(roomPath('q'), {
        id: q.id,
        kind: q.kind,
        title: q.title,
        options: q.options.map((o) => ({ id: o.id, label: o.label })),
        t: Date.now(),
      });
      poll();
    },
    async close() {
      await store().put(roomPath('q'), null);
      poll();
    },
    // 清空答案和叫名字的次數：每次排練或上台前按一次
    async reset() {
      await store().put(roomPath('q'), null);
      await store().put(roomPath('a'), null);
      await store().put(roomPath('n'), null);
      lastTaps = null;
      poll();
    },
    // 某一題每個選項各幾票
    tally(qid) {
      const out = {};
      for (const v of Object.values(state.a[qid] || {})) out[v] = (out[v] || 0) + 1;
      return out;
    },
  };
})();
