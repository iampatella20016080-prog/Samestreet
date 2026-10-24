// 段落狀態機：每段是一個 async 腳本；跳段時統一取消計時器、等待與介面
window.SS = window.SS || {};

SS.director = (function () {
  const CANCEL = { cancelled: true };
  const ADV = ['Space', 'Enter'];
  let stage = null;
  let list = [];
  let index = -1;
  let token = null;
  let sceneTime = 0;
  let totalTime = 0;
  let advWait = 0; // 已經等「繼續」幾秒
  const timers = new Set();
  const waiters = new Set();
  const loops = new Set();
  const V = () => new THREE.Vector3();
  const shot = { active: false, t: 0, dur: 0, fromPos: V(), toPos: V(), fromLook: V(), toLook: V(), look: V() };
  // 畫面震動：每一幀先拿掉上一幀的位移再加新的，鏡頭不會跑掉
  const shake = { t: 0, dur: 1, amp: 0, off: V() };

  // 段落被取消時，等待中的 promise 會丟出 CANCEL，腳本就停在那裡
  function guard(t, executor) {
    return new Promise((resolve, reject) => {
      if (t.cancelled) return reject(CANCEL);
      t.rejects.add(reject);
      executor((v) => {
        t.rejects.delete(reject);
        if (!t.cancelled) resolve(v);
      });
    });
  }

  // 人物真的在畫面上（自己和上層都沒有被藏起來，而且在場景裡）
  function shown(obj) {
    for (let o = obj; o; o = o.parent) {
      if (!o.visible) return false;
      if (o === stage.scene) return true;
    }
    return false;
  }

  function anchorFor(who) {
    const a = stage.actors[who];
    if (a && shown(a.root)) return { object: a.head, lift: 0.45 };
    const o = stage.anchors[who];
    if (o && shown(o)) return { object: o, lift: 0 };
    return null;
  }

  async function say(ctx, lines, opts = {}) {
    for (const line of [].concat(lines)) {
      SS.mech.countLine(line);
      if (line.cite) SS.ui.cite(line.cite);
      if (opts.where === 'phone') {
        SS.panels.phone.caption(line);
        SS.sfx.play('blip');
        await ctx.key();
        continue;
      }
      SS.ui.dialog.show(line, {
        anchor: opts.where === 'box' ? null : anchorFor(line.who),
        masked: SS.mech.displayFor(line),
        tag: line.placeholder ? ctx.data.placeholderNote : line.source ? `出處：${line.source}` : '',
        loud: opts.loud,
      });
      SS.sfx.play('blip');
      for (;;) {
        await ctx.key();
        if (SS.ui.dialog.typing) {
          SS.ui.dialog.finish();
          continue;
        }
        break;
      }
    }
    if (!opts.keep) SS.ui.dialog.hide();
  }

  function setShot(pos, look, dur) {
    const set = (v, x) => (x.isVector3 ? v.copy(x) : v.set(x[0], x[1], x[2]));
    stage.mode = 'shot';
    shot.fromPos.copy(stage.camera.position);
    shot.fromLook.copy(shot.active ? shot.look : stage.rail._look);
    set(shot.toPos, pos);
    set(shot.toLook, look);
    shot.t = 0;
    shot.dur = dur;
    shot.active = true;
    applyShot(dur > 0 ? 0 : 1);
  }

  function applyShot(k) {
    const e = SS.util.ease.inOut(k);
    stage.camera.position.lerpVectors(shot.fromPos, shot.toPos, e);
    shot.look.lerpVectors(shot.fromLook, shot.toLook, e);
    stage.camera.lookAt(shot.look);
  }

  function makeCtx(t, scene) {
    const ctx = {
      stage,
      data: SS.DATA.scenes[scene.id] || {},
      wait: (sec) => guard(t, (res) => timers.add({ t, left: sec, res })),
      key: (codes = ADV) => guard(t, (res) => waiters.add({ t, codes, res })),
      // 時間到或按鍵，哪個先發生都可以
      waitOrKey(sec, codes = ADV) {
        return guard(t, (res) => {
          const done = (v) => {
            timers.delete(tm);
            waiters.delete(wt);
            res(v);
          };
          const tm = { t, left: sec, res: done };
          const wt = { t, codes, res: done, timed: true };
          timers.add(tm);
          waiters.add(wt);
        });
      },
      // 每一幀呼叫 fn(dt)，回傳不是 null 時結束
      loop: (fn) => guard(t, (res) => loops.add({ t, fn, res })),
      until: (pred) => ctx.loop(() => (pred() ? true : null)),
      // 不需要等待的排程
      after: (sec, fn) => timers.add({ t, left: sec, res: fn }),
      cleanup: (fn) => t.cleanups.push(fn),
      shot: (pos, look, dur = 0) => setShot(pos, look, dur),
      // 鏡頭交回給跟著人物的 rail（雅婷或 Siti），從現在的位置平滑接回去
      release() {
        stage.activeRail._camPos.copy(stage.camera.position);
        stage.activeRail._look.copy(shot.look);
        shot.active = false;
        stage.mode = 'rail';
      },
      // 這一段臨時加進場景的 3D 物件，段落結束自動拿掉
      add(obj) {
        stage.scene.add(obj);
        t.cleanups.push(() => stage.scene.remove(obj));
        return obj;
      },
      say: (lines, opts) => say(ctx, lines, opts),
      async card(no) {
        SS.panels.card.show(no);
        SS.sfx.play('pop');
        await ctx.key();
        SS.panels.card.hide();
      },
      // 手機出題；段落結束時自動收題
      ask(q) {
        SS.live.ask(q).catch(() => SS.ui.toast('手機互動連不上：請改用鍵盤記錄'));
        t.cleanups.push(() => SS.live.close().catch(() => {}));
      },
      onLive: (ev, fn) => t.cleanups.push(SS.live.on(ev, fn)),
    };
    return ctx;
  }

  function cancel() {
    if (!token) return;
    const t = token;
    token = null;
    t.cancelled = true;
    for (const r of t.rejects) r(CANCEL);
    t.rejects.clear();
    for (const set of [timers, waiters, loops]) for (const x of [...set]) if (x.t === t) set.delete(x);
    for (const fn of t.cleanups.reverse()) {
      try {
        fn();
      } catch (e) {
        console.error(e);
      }
    }
  }

  // 每段開始前，3D 舞台回到預設狀態
  function resetStage() {
    const s = stage;
    s.mode = 'rail';
    shot.active = false;
    s.rail.locked = true;
    s.rail.onMove = () => {};
    s.sitiRail.locked = true;
    s.sitiRail.onMove = () => {};
    s.activeRail = s.rail;
    s.setStreet(true);
    // 天色回到早晨（各段在 enter 裡再換自己的），清掉上一段還沒退完的特效
    SS.env.set('morning', 0.8);
    SS.post.clearKicks();
    SS.post.drive({ desat: 0, warp: 0, scan: 0, ab: 0 });
    shake.t = 0;
    s.ghost.root.visible = false;
    s.ghostRun = null;
    s.lamp.intensity = 0;
    s.actors.yating.root.visible = true;
    s.actors.yating.setPose('stand');
    s.actors.siti.root.visible = false;
    s.actors.siti.setPose('stand');
    s.chair.root.visible = false;
    for (const a of Object.values(s.actors)) {
      if (a.homeYaw !== undefined) a.root.rotation.y = a.homeYaw;
      a.turnHead(0);
    }
    SS.state.viewer = 'none';
    SS.state.maskZh = false;
    SS.ui.hud.setMask(0);
    SS.ui.hud.setFace('smile');
  }

  function go(i) {
    if (!list.length) return;
    i = SS.util.clamp(i, 0, list.length - 1);
    cancel();
    SS.ui.reset();
    SS.panels.reset();
    resetStage();
    index = i;
    sceneTime = 0;
    const scene = list[i];
    SS.mech.baseline(list.slice(0, i).map((s) => s.id));
    const t = (token = { cancelled: false, rejects: new Set(), cleanups: [] });
    const ctx = makeCtx(t, scene);
    try {
      if (scene.enter) scene.enter(ctx);
    } catch (e) {
      console.error(e);
    }
    Promise.resolve()
      .then(() => scene.run(ctx))
      .then(
        () => {
          if (token === t && index < list.length - 1) go(index + 1);
        },
        (e) => {
          if (e === CANCEL) return;
          console.error(e);
          SS.ui.toast(SS.tip('這一段出錯了，請按 N 跳到下一段', '這一段出錯了，請從左上角 ☰ 跳到下一段'));
        }
      );
    SS.bus.emit('scene', scene, i);
  }

  function update(dt) {
    if (!token) return;
    stage.camera.position.sub(shake.off);
    shake.off.set(0, 0, 0);
    sceneTime += dt;
    totalTime += dt;
    for (const tm of [...timers]) {
      tm.left -= dt;
      if (tm.left <= 0) {
        timers.delete(tm);
        tm.res();
      }
    }
    for (const w of [...waiters]) {
      const code = w.codes.find((c) => SS.input.pressed(c));
      if (code) {
        SS.input.consume(code);
        waiters.delete(w);
        w.res(code);
      }
    }
    // 第一次玩的人不知道要按空白鍵：等超過 1.5 秒就提示（觀眾版才有，上台畫面不變）
    advWait = [...waiters].some((w) => w.codes === ADV && !w.timed) ? advWait + dt : 0;
    if (SS.live.audience) SS.ui.nextHint(advWait > 1.5);
    for (const l of [...loops]) {
      const v = l.fn(dt);
      if (v !== null && v !== undefined) {
        loops.delete(l);
        l.res(v);
      }
    }
    const scene = list[index];
    if (scene && scene.update) scene.update(dt, stage);
    if (stage.mode === 'shot' && shot.active) {
      shot.t += dt;
      applyShot(shot.dur > 0 ? Math.min(1, shot.t / shot.dur) : 1);
    }
    if (shake.t > 0) {
      shake.t -= dt;
      const a = shake.amp * Math.max(0, shake.t / shake.dur);
      shake.off.set((Math.random() - 0.5) * 2 * a, (Math.random() - 0.5) * 2 * a, (Math.random() - 0.5) * 2 * a);
      stage.camera.position.add(shake.off);
    }
  }

  return {
    ADV,
    init(s, scenes) {
      stage = s;
      list = scenes;
    },
    go,
    next: () => go(index + 1),
    prev: () => go(index - 1),
    update,
    // 畫面震一下：amp 公尺、sec 秒
    shake(amp, sec) {
      shake.amp = amp;
      shake.dur = shake.t = sec;
    },
    get index() {
      return index;
    },
    get list() {
      return list;
    },
    get sceneTime() {
      return sceneTime;
    },
    get totalTime() {
      return totalTime;
    },
  };
})();

// ---------- 13 個段落（加上開場前的 QR code 畫面） ----------
SS.scenes = (function () {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const CH2 = { mask: true, count: true, card: true, ledger: true };

  // 坡頂巷曲線上的位置與方向
  function frame(u) {
    const c = SS.world.curves.A;
    const p = c.getPointAt(u);
    const t = c.getTangentAt(u).setY(0).normalize();
    return { p, t, right: V(-t.z, 0, t.x) };
  }
  // 沿著坡道往下看的鏡頭
  function along(u, back = 7, up = 4.2, ahead = 8) {
    const { p, t } = frame(u);
    return [p.clone().addScaledVector(t, -back).add(V(0, up, 0)), p.clone().addScaledVector(t, ahead).add(V(0, 1.2, 0))];
  }
  const at = (base, x, y, z) => V(x, y, z).applyMatrix4(base);
  function faceTo(person, target) {
    const p = person.root.position;
    person.root.rotation.y = Math.atan2(target.x - p.x, target.z - p.z);
  }
  function setRail(stage, u) {
    stage.rail.u = u;
    stage.rail.snap();
  }
  // 停下來對話：兩個人轉向彼此，鏡頭從街道上游斜看兩個人（不會穿進房子裡）
  // opts.who：走路的人（預設雅婷）、opts.rail：她的 rail；opts.turn 為 false 時只轉頭（Siti 推著輪椅）
  function talkTo(ctx, actor, opts = {}) {
    const rail = opts.rail || ctx.stage.rail;
    const walker = opts.who || ctx.stage.actors.yating;
    const me = walker.root.position;
    const you = actor.root.position;
    const yaw = Math.atan2(you.x - me.x, you.z - me.z);
    rail.velocity.set(0, 0, 0);
    if (opts.turn === false) {
      walker.lookAt(actor.head.getWorldPosition(V(0, 0, 0)));
    } else {
      rail.heading.set(Math.sin(yaw), 0, Math.cos(yaw));
      walker.root.rotation.y = yaw;
    }
    faceTo(actor, me);
    const t = rail.tangent().setY(0).normalize();
    const side = V(-t.z, 0, t.x);
    const away = side.dot(you.clone().sub(me)) > 0 ? -1 : 1;
    const mid = me.clone().add(you).multiplyScalar(0.5);
    // 兩人隔得越遠（阿蘭在櫃台後面），鏡頭退得越遠
    const sep = me.distanceTo(you);
    const back = Math.max(5.2, sep * 0.95);
    ctx.shot(
      mid.clone().addScaledVector(t, -back).addScaledVector(side, away * 1.4).add(V(0, 2.3 + sep * 0.12, 0)),
      mid.clone().add(V(0, 1.3, 0)),
      0.8
    );
  }

  // 早餐店電視：新聞跑馬燈
  function tvTexture(text) {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 600;
    const g = c.getContext('2d');
    g.fillStyle = '#1f2a38';
    g.fillRect(0, 0, 1024, 600);
    g.fillStyle = '#c0312a';
    g.fillRect(0, 0, 1024, 150);
    g.fillStyle = '#ffffff';
    g.font = '900 96px "Noto Sans TC", sans-serif';
    g.textBaseline = 'middle';
    g.fillText('新聞快報', 40, 78);
    const [a, b] = text.split('　');
    g.font = '900 110px "Noto Sans TC", sans-serif';
    g.fillText(a, 40, 300);
    g.fillStyle = '#f2c84b';
    if (b) g.fillText(b, 40, 460);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  function classroomHtml(d) {
    return `<div class="cls-window"><i></i><i></i><i></i><i></i></div>
      <div class="cls-board">${d.board.map((w) => `<span>${w}</span>`).join('')}</div>
      <div class="cls-siti">${SS.ui.portrait('siti')}</div>
      <div class="cls-desk"></div>`;
  }

  // 臨時登場的人物：加進場景，也登記到 stage.actors 讓對話框找得到；段落結束自動拿掉
  function cameo(ctx, id, opts, pos, yaw, pose) {
    const p = SS.chars.makePerson(opts);
    if (pose) p.setPose(pose.kind, pose.seatY);
    p.root.position.copy(pos);
    p.root.rotation.y = yaw;
    ctx.add(p.root);
    if (id) {
      ctx.stage.actors[id] = p;
      ctx.cleanup(() => delete ctx.stage.actors[id]);
    }
    return p;
  }

  // 長輩坐在輪椅上，看護站在後面推（公園的其他看護）
  function carePair(ctx, id, carerOpts, elderTop, pos, yaw) {
    const chair = SS.chars.makeWheelchair();
    const elder = SS.chars.makePerson({ top: elderTop, bottom: 0x4a4740, hair: 0xe8e6e0, hairStyle: 'short' });
    elder.setPose('sit', chair.seatY);
    chair.root.add(elder.root);
    chair.root.position.copy(pos);
    chair.root.rotation.y = yaw;
    ctx.add(chair.root);
    const back = V(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(chair.handleZ);
    const carer = cameo(ctx, id, carerOpts, pos.clone().add(back), yaw, { kind: 'push' });
    carer.animate(0, 0);
    return { chair, elder, carer };
  }

  // ---------- 第一章雅婷的幽靈 ----------
  // 速度用第一章實際走的（從家門口到馬路對面，扣掉停下來講話的時間）；沒走過第一章就用 6 m/s
  function ghostSpeed(stage) {
    const run = SS.state.yatingRun;
    return run && run.crossTime ? stage.yatingMarks.crossDist / run.crossTime : 6;
  }
  // 讓幽靈沿著雅婷的路，從 from 跑到 to；side 是往路邊偏幾公尺（從 Siti 旁邊超過去，不要疊在一起）
  function runGhost(stage, from, to, label, side = 0) {
    stage.ghostRun = { u: from, to, speed: ghostSpeed(stage), alpha: 0, label, side };
    stage.ghost.root.visible = true;
  }
  function updateGhost(stage, dt) {
    const g = stage.ghostRun;
    if (!g) return;
    const path = SS.world.paths.yating;
    const ghost = stage.ghost;
    const done = g.u >= g.to;
    if (!done) g.u = Math.min(g.to, g.u + (g.speed * dt) / path.getLength());
    const t = path.getTangentAt(Math.min(g.u, 0.9999)).setY(0).normalize();
    ghost.root.position.copy(path.getPointAt(g.u)).addScaledVector(V(-t.z, 0, t.x), g.side);
    ghost.root.rotation.y = Math.atan2(t.x, t.z);
    ghost.animate(dt, done ? 0 : 1, 13);
    g.alpha = done ? Math.max(0, g.alpha - dt * 1.6) : Math.min(0.45, g.alpha + dt * 1.6);
    ghost.ghostMat.opacity = g.alpha;
    if (g.alpha > 0.08) SS.ui.labels.set('ghost', { text: g.label, object: ghost.head, lift: 0.75, kind: 'info' });
    else SS.ui.labels.remove('ghost');
    if (done && g.alpha <= 0) {
      ghost.root.visible = false;
      stage.ghostRun = null;
    }
  }
  // 秒數 → 0:14、1:05
  function clock(sec) {
    const s = Math.round(sec);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  // 公園的落葉：從榕樹附近慢慢飄下來
  function fallingLeaves(center) {
    const n = 70;
    const mesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.32, 0.2),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
      n
    );
    const rand = SS.util.seeded(1017);
    const colors = [0xd8b562, 0xe9c46a, 0x9cbf6b, 0xc98a4a, 0xb7cf7a].map((c) => new THREE.Color(c));
    const leaves = [];
    for (let i = 0; i < n; i++) {
      leaves.push({ x: (rand() - 0.5) * 15, y: rand() * 8, z: (rand() - 0.5) * 15, fall: 0.35 + rand() * 0.55, ph: rand() * 6.28, spin: 0.6 + rand() * 2.2 });
      mesh.setColorAt(i, colors[i % colors.length]);
    }
    mesh.position.copy(center);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const one = V(1, 1, 1);
    const p = V(0, 0, 0);
    mesh.userData.update = (dt) => {
      for (let i = 0; i < n; i++) {
        const l = leaves[i];
        l.y -= l.fall * dt;
        l.ph += dt * l.spin;
        if (l.y < 0.05) l.y = 6.5 + rand() * 2.5;
        p.set(l.x + Math.sin(l.ph) * 0.6, l.y, l.z + Math.cos(l.ph * 0.7) * 0.4);
        e.set(l.ph, l.ph * 0.5, 0);
        mesh.setMatrixAt(i, m4.compose(p, q.setFromEuler(e), one));
      }
      mesh.instanceMatrix.needsUpdate = true;
    };
    mesh.userData.update(0);
    return mesh;
  }

  // 從天上看的兩條路：天橋（綠）和繞到斑馬線（紅），每隔一段放一小段標線
  function routeMarks(stage) {
    const group = new THREE.Group();
    const lay = (path, from, to, step, color, lift) => {
      const mat = new THREE.MeshBasicMaterial({ color });
      const len = path.getLength();
      for (let s = from * len; s < to * len; s += step) {
        const u = s / len;
        const p = path.getPointAt(u);
        const t = path.getTangentAt(u).setY(0).normalize();
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, step * 0.55), mat);
        m.position.copy(p).add(V(0, lift, 0));
        m.rotation.y = Math.atan2(t.x, t.z);
        group.add(m);
      }
    };
    const M = stage.sitiMarks;
    const yp = SS.world.paths.yating;
    const yl = yp.getCurveLengths();
    lay(stage.sitiRail.path, M.bridgeFoot, M.detourEnd, 1.6, 0xe04a3f, 0.12);
    lay(yp, yl[0] / yp.getLength(), yl[4] / yp.getLength(), 1.1, 0x2f9e6a, 0.35);
    return group;
  }

  // 手機投票的票數：依選項順序
  function liveCounts(q) {
    const t = SS.live.tally(q.id);
    return q.options.map((o) => t[o.id] || 0);
  }

  function voteStat() {
    const v = SS.state.vote;
    if (!v) return '';
    const total = v.counts.reduce((a, b) => a + b, 0);
    if (!total) return `剛剛舉手最多的是：${v.labels[v.choice]}`;
    return `剛剛的投票：${v.labels.map((l, i) => `${l} ${Math.round((v.counts[i] / total) * 100)}%`).join('・')}（${total} 人）`;
  }

  async function runVote(ctx, d) {
    const q = SS.DATA.live.vote;
    const P = SS.panels.vote;
    ctx.ask(q);
    P.show(SS.DATA.resumes, SS.DATA.resumeFields, d.question, d.countdown);
    P.tally(liveCounts(q));
    ctx.onLive('update', () => P.tally(liveCounts(q)));
    let choice = null;
    while (choice === null) {
      const code = await ctx.key(['Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3', 'Space', 'Enter']);
      const n = Number(code.slice(-1));
      if (n >= 1 && n <= 3) choice = n - 1;
      else {
        const c = liveCounts(q);
        const max = Math.max(...c);
        if (max > 0) choice = c.indexOf(max);
        else SS.ui.toast(SS.live.audience ? SS.tip('請按 1、2、3 選一位', '請點一張履歷，選一位') : '手機還沒有人投票：請按 1、2、3 記下舉手最多的');
      }
    }
    SS.live.close().catch(() => {});
    SS.state.vote = { choice, counts: liveCounts(q), labels: q.options.map((o) => o.label.replace(/（.*）/, '')) };
    P.lock(choice);
    SS.sfx.play('pop');
    await ctx.wait(0.9);
    P.reveal(d.reveal);
    if (d.cite) SS.ui.cite(d.cite);
    await ctx.key();
    if (choice !== 0) {
      P.taken(choice);
      await ctx.say(d.taken);
    }
  }

  return [
    {
      id: 'lobby',
      enter(ctx) {
        setRail(ctx.stage, 0);
        SS.live.close().catch(() => {});
      },
      async run(ctx) {
        SS.panels.lobby.show(ctx.data, SS.live.phoneLink());
        await ctx.key();
      },
    },

    {
      id: 'prologue',
      enter(ctx) {
        setRail(ctx.stage, 0);
        SS.ui.fade(true, 0);
      },
      async run(ctx) {
        const d = ctx.data;
        const phone = SS.panels.phone;
        await ctx.wait(0.5);
        for (const [i, chat] of d.chats.entries()) {
          phone.chat(chat.name);
          for (const m of chat.messages) {
            await ctx.waitOrKey(1.2);
            phone.message(m);
            if (m.cite) SS.ui.cite(m.cite);
          }
          if (i < d.chats.length - 1) await ctx.key();
        }
        // 雅婷打了「我」，又刪掉
        await ctx.wait(1.4);
        phone.type(d.typed);
        await ctx.wait(1.6);
        phone.type('');
        await ctx.key();
        phone.close();
        SS.ui.cite(null);
        // 標題壓在福安里的空拍上：從坡道上空慢慢降到雅婷家門口
        const rail = ctx.stage.rail;
        const high = frame(0.55);
        ctx.shot(high.p.clone().addScaledVector(high.right, 14).add(V(0, 42, 0)), frame(0.18).p.clone().add(V(0, 2, 0)), 0);
        ctx.shot(rail._camPos.clone(), rail._look.clone(), 6.5);
        SS.ui.fade(false, 1.6);
        SS.ui.title(d.heading, d.subheading);
        await ctx.key();
      },
    },

    {
      id: 'ch1_street',
      enter(ctx) {
        const { stage, data: d } = ctx;
        setRail(stage, 0);
        SS.ui.setClock(d.clock.time, d.clock.note);
        SS.ui.showHint();
        SS.state.viewer = 'yating';
        // 記下雅婷實際走路的時間（停下來講話不算），第二章的幽靈照這個速度跑
        SS.state.yatingRun = { moving: 0, crossTime: null };
        const labels = d.areaLabels.map((l, i) => ({ ...l, shown: i === 0 }));
        stage.rail.onMove = (u) => {
          for (const l of labels) {
            if (!l.shown && u >= l.at) {
              l.shown = true;
              SS.ui.showArea(l.text);
            }
          }
          if (u > 0.03) SS.ui.hideHint();
        };
      },
      async run(ctx) {
        const { stage, data: d } = ctx;
        const { rail, actors } = stage;
        await ctx.wait(0.6);
        SS.ui.showArea(d.areaLabels[0].text);
        await ctx.wait(0.5);
        await ctx.say(d.stops.agong);
        rail.locked = false;
        for (const id of ['azhu', 'alan']) {
          await ctx.until(() => rail.u >= stage.stopAt[id]);
          rail.locked = true;
          talkTo(ctx, actors[id]);
          await ctx.wait(0.6);
          await ctx.say(d.stops[id]);
          ctx.release();
          rail.locked = false;
        }
        await ctx.until(() => rail.u >= 0.985);
      },
      update(dt, stage) {
        const rail = stage.rail;
        rail.update(dt);
        const run = SS.state.yatingRun;
        if (!run) return;
        if (!rail.locked && rail.velocity.length() > 0.3) run.moving += dt;
        if (!run.crossTime && rail.u >= stage.yatingMarks.cross) run.crossTime = run.moving;
      },
    },

    {
      id: 'ch1_agency',
      enter(ctx) {
        if (ctx.stage.rail.u < 0.95) setRail(ctx.stage, 1);
      },
      async run(ctx) {
        const { stage, data: d } = ctx;
        talkTo(ctx, stage.actors.wang);
        await ctx.wait(0.8);
        await ctx.say(d.intro);
        await runVote(ctx, d);
        await ctx.key();
      },
      update(dt, stage) {
        stage.rail.update(dt);
      },
    },

    {
      id: 'ch1_interview',
      enter(ctx) {
        if (ctx.stage.rail.u < 0.95) setRail(ctx.stage, 1);
      },
      async run(ctx) {
        const d = ctx.data;
        const phone = SS.panels.phone;
        phone.video('siti', 'Siti', true);
        SS.sfx.play('ring');
        await ctx.wait(0.8);
        for (const line of d.lines) {
          // Siti 回答得太快、太完美：視訊畫面閃一下雜訊，像排練過的（phone.close 會一起清掉）
          phone.el.classList.toggle('static', !!line.fast);
          await ctx.say(line, { where: 'phone' });
        }
        phone.el.classList.remove('static');
        await ctx.say(d.after);
        phone.confirm(d.confirm);
        SS.sfx.play('pop');
        await ctx.wait(1.6);
        phone.close();
        await ctx.card(d.card);
      },
      update(dt, stage) {
        stage.rail.update(dt);
      },
    },

    {
      id: 'transition',
      enter(ctx) {
        if (ctx.stage.rail.u < 0.95) setRail(ctx.stage, 1);
      },
      async run(ctx) {
        const { stage, data: d } = ctx;
        // 「同一天，同一條街，換一個人走。」壓在街景上
        SS.ui.caption([d.lines[0]]);
        await ctx.waitOrKey(2.4);
        SS.ui.caption(null);
        // 倒帶：雅婷倒著跑回坡頂，錄影帶雜訊、掃描線、色差
        SS.ui.ff(true, '◀◀ 倒帶');
        SS.post.drive({ warp: 1, scan: 0.9, desat: 0.5, ab: 0.9 });
        SS.sfx.play('buzz');
        stage.mode = 'free';
        stage.rewind = { u: 0.985, speed: 1 / 2.6 };
        ctx.cleanup(() => (stage.rewind = null));
        await ctx.until(() => stage.rewind.u <= 0.02);
        SS.post.drive({ warp: 0, scan: 0, desat: 0, ab: 0 });
        SS.ui.ff(false);
        SS.ui.fade(true, 0.35);
        await ctx.wait(0.35);
        SS.ui.caption([d.lines[1]], { dark: true });
        await ctx.waitOrKey(2.8);
      },
      update(dt, stage) {
        const r = stage.rewind;
        if (!r) return;
        r.u = Math.max(0.02, r.u - r.speed * dt);
        const path = SS.world.paths.yating;
        const p = path.getPointAt(r.u);
        const t = path.getTangentAt(r.u).setY(0).normalize();
        const y = stage.actors.yating;
        y.root.position.copy(p);
        y.root.rotation.y = Math.atan2(t.x, t.z);
        y.animate(dt, 1, -13);
        stage.camera.position.copy(p).addScaledVector(t, -6).add(V(0, 4, 0));
        stage.camera.lookAt(p.clone().addScaledVector(t, 3).add(V(0, 1.2, 0)));
      },
    },

    {
      id: 'ch2_training',
      enter(ctx) {
        SS.state.viewer = 'siti';
        SS.ui.slate('classroom', classroomHtml(ctx.data));
        SS.ui.hud.show({ mask: true });
      },
      async run(ctx) {
        const d = ctx.data;
        const levels = [0.35, 0.7, 1];
        SS.ui.showArea(d.place);
        await ctx.wait(1.6);
        for (const [i, q] of d.questions.entries()) {
          await ctx.say(q.ask, { keep: true });
          if (q.live) {
            const lq = SS.DATA.live[q.live];
            ctx.ask(lq);
            ctx.onLive('update', () => SS.panels.choices.tally(liveCounts(lq)));
          }
          await SS.mech.choose(ctx, q, d.reject);
          if (q.live) SS.live.close().catch(() => {});
          SS.ui.dialog.hide();
          SS.ui.hud.setMask(levels[i]);
          SS.ui.slateEl.style.setProperty('--mask', levels[i]);
          await ctx.say({ who: 'siti', text: q.mask });
        }
        await ctx.say(d.end);
      },
    },

    {
      id: 'ch2_home',
      enter(ctx) {
        const { stage, data: d } = ctx;
        SS.state.viewer = 'siti';
        SS.ui.setClock(d.clock.time);
        SS.ui.hud.show(CH2);
        SS.ui.hud.setMask(1);
        // 阿公家二樓的剖面：街景藏起來，娃娃屋浮在深色背景上
        stage.setStreet(false);
        SS.env.set('room', 0);
        stage.actors.yating.root.visible = false;
        const room = (ctx.room = SS.sets.homeRoom());
        room.root.position.set(0, -60, 400);
        ctx.add(room.root);
        room.root.updateMatrixWorld(true);
        const P = (ctx.P = (v) => v.clone().applyMatrix4(room.root.matrixWorld));
        stage.chair.root.visible = true;
        stage.chair.root.position.copy(P(room.agongSpot));
        stage.chair.root.rotation.y = 0;
        const siti = stage.actors.siti;
        siti.root.visible = true;
        siti.root.position.copy(P(room.sitiStart));
        siti.root.rotation.y = Math.PI;
        ctx.shot(P(room.camPos), P(room.camLook), 0);
      },
      async run(ctx) {
        const { stage, data: d } = ctx;
        const room = ctx.room;
        const siti = stage.actors.siti;
        SS.ui.showArea('阿公家　清晨五點半');
        await ctx.wait(1.2);
        const r = await SS.mech.chores(ctx, room, siti, stage.actors.agong, d.chores);
        // 時間到：畫面定格變灰
        SS.ui.grey(true);
        SS.ui.caption(d.chores.result.replace('{done}', r.done).replace('{left}', r.remaining));
        SS.sfx.play('thud');
        await ctx.key();
        SS.ui.caption(null);
        SS.ui.grey(false);
        faceTo(siti, stage.chair.root.position);
        await ctx.say(d.lines.slice(0, 3));
        // 雅婷在門口，要出門上班
        const yating = stage.actors.yating;
        yating.root.visible = true;
        yating.root.position.copy(ctx.P(room.doorSpot));
        faceTo(yating, siti.root.position);
        faceTo(siti, yating.root.position);
        await ctx.say(d.lines.slice(3));
        SS.ui.cite(d.cite);
        await ctx.card(d.card);
      },
    },

    {
      id: 'ch2_slope',
      enter(ctx) {
        const { stage } = ctx;
        const R = stage.sitiRail;
        stage.actors.yating.root.visible = false;
        SS.state.viewer = 'siti';
        SS.ui.hud.show(CH2);
        SS.ui.hud.setMask(1);
        SS.env.set('day2', 0.6);
        // Siti 推著阿公從家門口出發：同樣的操作，推輪椅只能走 2.2 m/s
        stage.activeRail = R;
        stage.auto = 0;
        ctx.cleanup(() => (stage.auto = 0));
        R.u = 0.004;
        R.snap();
        stage.actors.siti.root.visible = true;
        stage.actors.siti.setPose('push');
        stage.chair.root.visible = true;
        stage.followChair();
        SS.ui.showHint();
      },
      async run(ctx) {
        const { stage, data: d } = ctx;
        const R = stage.sitiRail;
        const M = stage.sitiMarks;
        SS.ui.showArea('坡頂巷');
        // 第一章的雅婷像幽靈一樣從旁邊衝過去：Siti 靠哪邊，幽靈就走另一邊
        ctx.after(1.2, () => {
          const path = SS.world.paths.yating;
          const t = path.getTangentAt(0.01).setY(0).normalize();
          const off = stage.actors.siti.root.position.clone().sub(path.getPointAt(0.01));
          const right = off.x * -t.z + off.z * t.x;
          runGhost(stage, 0.004, 0.34, d.ghostLabel, right > 0.3 ? -1.7 : 1.7);
        });
        R.locked = false;
        // 走到阿珠姨面前就停下來
        R.onMove = (u) => {
          if (u > 0.012) SS.ui.hideHint();
          if (u >= stage.stopAt.sitiAzhu) R.locked = true;
        };
        await ctx.wait(1);
        await ctx.say(d.lines);
        await ctx.until(() => R.u >= stage.stopAt.sitiAzhu);
        R.locked = true;
        talkTo(ctx, stage.actors.azhu, { who: stage.actors.siti, rail: R, turn: false });
        await ctx.wait(0.6);
        await ctx.say(d.azhu);
        stage.actors.siti.turnHead(0);
        ctx.release();
        // 快轉到天橋下
        SS.ui.ff(true);
        stage.auto = 9;
        await ctx.until(() => R.u >= M.bridgeFoot - 0.003);
        stage.auto = 0;
        SS.ui.ff(false);
        // 天橋：輪椅上不去
        SS.ui.showArea('天橋');
        ctx.shot([11.8, 4.6, -50.5], [10, 4.4, -59.5], 1.6);
        await ctx.wait(1.6);
        SS.ui.blocked(true, d.blocked);
        SS.ui.cite(d.cite);
        SS.sfx.play('buzz');
        // 雅婷的幽靈直接從 Siti 旁邊跑上天橋
        runGhost(stage, stage.yatingMarks.stairs - 0.02, stage.yatingMarks.cross, d.ghostLabel);
        await ctx.key();
        SS.ui.blocked(false);
        // 只能沿著大馬路繞到很遠的斑馬線：從上面看兩條路，車子一直按喇叭
        ctx.add(routeMarks(stage));
        // 從天上看 Siti 太小：腳下加一圈淡紫色
        const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.45, 32), new THREE.MeshBasicMaterial({ color: 0xb9a3d6, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(0, 0.06, 0.4);
        stage.actors.siti.root.add(ring);
        ctx.cleanup(() => stage.actors.siti.root.remove(ring));
        ctx.shot([25, 44, -58], [25, 2.5, -67.5], 2);
        const fill = (s) => s.replace('{bridge}', Math.round(M.bridgeLength)).replace('{detour}', Math.round(M.detourLength));
        SS.ui.labels.set('bridge', { text: fill(d.compare[0]), pos: V(10, 10.2, -67.5), kind: 'info' });
        SS.ui.labels.set('detour', { text: fill(d.compare[1]), pos: V(40, 4.5, -67.5), kind: 'info' });
        await ctx.wait(1.8);
        SS.ui.ff(true);
        stage.auto = 13;
        for (const s of [0.6, 2.4, 4.2]) ctx.after(s, () => SS.sfx.play('horn'));
        await ctx.until(() => R.u >= M.detourEnd);
        stage.auto = 0;
        SS.ui.ff(false);
        // 同一段路花的時間：雅婷用第一章實際走的時間，Siti 用推輪椅的速度算
        const run = SS.state.yatingRun;
        const yTime = run && run.crossTime ? run.crossTime : stage.yatingMarks.crossDist / 6;
        const sTime = M.sitiCross / R.speed;
        SS.ui.labels.clear();
        SS.ui.caption(d.compareTime.map((s) => s.replace('{yating}', clock(yTime)).replace('{siti}', clock(sTime))));
        await ctx.key();
      },
      update(dt, stage) {
        const R = stage.sitiRail;
        if (stage.auto > 0) R.autoStep(dt, stage.auto);
        else R.update(dt);
        stage.followChair();
        updateGhost(stage, dt);
      },
    },

    {
      id: 'ch2_breakfast',
      enter(ctx) {
        const { stage, data: d } = ctx;
        stage.actors.yating.root.visible = false;
        SS.state.viewer = 'siti';
        SS.state.maskZh = true;
        SS.ui.hud.show(CH2);
        SS.ui.hud.setMask(1);
        SS.env.set('day2', 0.6);
        // Siti 推阿公來到騎樓下；客人坐在凳子上，小宇躲在阿嬤後面
        const base0 = stage.refs.breakfast.base;
        const yaw = stage.refs.breakfast.yaw;
        stage.pushAt(at(base0, 0, 0.15, 3.12), yaw + Math.PI);
        const sit = { kind: 'sit', seatY: 0.4 };
        ctx.guests = [
          cameo(ctx, 'guest', { top: 0x2f6f9a, bottom: 0x3a3a3a, hair: 0x2a2a2a, hairStyle: 'short' }, at(base0, 0.85, 0, 3.65), yaw + Math.PI / 2, sit),
          cameo(ctx, null, { top: 0x9a9e95, bottom: 0x4a4740, hair: 0x555555, hairStyle: 'short' }, at(base0, 1.95, 0, 3.65), yaw - Math.PI / 2, sit),
          cameo(ctx, null, { top: 0xf2c84b, bottom: 0x2b3a55, hair: 0x3b2a22, hairStyle: 'ponytail' }, at(base0, 2.45, 0, 3.65), yaw + Math.PI / 2, sit),
        ];
        ctx.grandma = cameo(ctx, 'grandma', { top: 0xd98fa8, bottom: 0x4a4740, hair: 0xb9b6ae, hairStyle: 'curly' }, at(base0, -0.65, 0.15, 3.7), yaw + Math.PI);
        ctx.xiaoyu = cameo(ctx, 'xiaoyu', { top: 0xf2c84b, bottom: 0x2b3a55, hair: 0x1c1a1a, hairStyle: 'short', scale: 0.72 }, at(base0, -1.05, 0.15, 4.05), yaw + Math.PI);
        // 電視換成新聞跑馬燈
        const tv = stage.refs.tv;
        const old = tv.material[4];
        const mat = new THREE.MeshBasicMaterial({ map: tvTexture(d.tv) });
        tv.material[4] = tv.material[5] = mat;
        ctx.cleanup(() => {
          tv.material[4] = tv.material[5] = old;
          mat.map.dispose();
          mat.dispose();
        });
        const base = stage.refs.breakfast.base;
        ctx.shot(at(base, 2.2, 2.25, 4.6), at(base, 2.2, 2.2, 2.4), 0);
      },
      async run(ctx) {
        const { stage, data: d } = ctx;
        const base = stage.refs.breakfast.base;
        SS.ui.showArea('早餐店');
        SS.ui.cite(d.tvCite);
        await ctx.waitOrKey(2.6);
        ctx.shot(at(base, 1.1, 2.3, 10.4), at(base, 0.3, 1.4, 2.9), 2);
        await ctx.wait(1.6);
        await ctx.say(d.lines);
        SS.ui.cite(null);
        const watchers = [...ctx.guests, ctx.grandma, ctx.xiaoyu, stage.actors.alan];
        await SS.mech.holdSmile(ctx, d.hold, d.call, { watchers, target: stage.actors.siti, whisperers: ctx.guests });
        // 客人走光以後，店裡剩阿蘭跟 Siti
        for (const p of [...ctx.guests, ctx.grandma, ctx.xiaoyu]) p.root.visible = false;
        SS.sfx.play('pop');
        await ctx.wait(0.8);
        faceTo(stage.actors.alan, stage.actors.siti.root.position);
        await ctx.say(d.after);
        SS.ui.caption(d.egg);
        SS.ui.hud.bumpLedger();
        SS.sfx.play('pop');
        await ctx.key();
        SS.ui.caption(null);
        await ctx.card(d.card);
      },
    },

    {
      id: 'ch2_park',
      enter(ctx) {
        const { stage, data: d } = ctx;
        const c = stage.refs.park.center;
        stage.actors.yating.root.visible = false;
        SS.state.viewer = 'siti';
        SS.ui.setClock(d.clock.time);
        SS.ui.hud.show(CH2);
        SS.ui.hud.setMask(1);
        // 語言反過來：看護們的話都看得懂，只有下棋阿伯的中文變方塊（外語照常顯示）
        SS.state.maskZh = true;
        // 整個畫面綻放：金色的光、落葉
        SS.env.set('park', 2.5);
        stage.leaves = ctx.add(fallingLeaves(c));
        ctx.cleanup(() => (stage.leaves = null));
        const P = (x, z) => V(c.x + x, c.y, c.z + z);
        const toTree = (x, z) => Math.atan2(-x, -z);
        // Siti 推阿公來到榕樹下
        stage.pushAt(P(3.4, 5.4), toTree(3.4, 5.4));
        // 其他看護和她們照顧的長輩
        carePair(ctx, 'dewi', { top: 0xf2e8c9, bottom: 0x3a3f4a, scarf: 0x5fb3a3, shoes: 0x8fa3b3 }, 0xb9c4cf, P(-3.4, 6.2), toTree(-3.4, 6.2) + 0.5);
        carePair(ctx, 'linh', { top: 0xe07a6f, bottom: 0x2b3a55, hair: 0x1c1a1a, hairStyle: 'ponytail', shoes: 0x8fa3b3 }, 0xc9b79c, P(0.2, 8.2), toTree(0.2, 8.2) + 0.3);
        carePair(ctx, 'maria', { top: 0x2f6f9a, bottom: 0x3a3a3a, hair: 0x2a2220, hairStyle: 'curly', shoes: 0x8fa3b3 }, 0xa9b8a0, P(6.4, 6.6), toTree(6.4, 6.6) - 0.4);
        // 旁邊下棋的阿伯
        const table = SS.sets.chessTable();
        table.position.copy(P(-2.4, 2.4));
        ctx.add(table);
        const sit = { kind: 'sit', seatY: 0.42 };
        cameo(ctx, 'uncle', { top: 0xe9e4d8, bottom: 0x4a4740, hair: 0xd8d6d0, hairStyle: 'short' }, P(-3.18, 2.4), Math.PI / 2, sit);
        cameo(ctx, null, { top: 0x5a6b7a, bottom: 0x4a4740, hair: 0xb9b6ae, hairStyle: 'bald' }, P(-1.62, 2.4), -Math.PI / 2, sit);
        ctx.shot([c.x + 11, c.y + 6.8, c.z + 17], [c.x + 2.5, c.y + 1.6, c.z + 4.5], 0);
      },
      async run(ctx) {
        const { stage, data: d } = ctx;
        const c = stage.refs.park.center;
        SS.ui.showArea('廟口公園');
        ctx.shot([c.x + 8.5, c.y + 4.2, c.z + 14.5], [c.x + 2.2, c.y + 1.4, c.z + 4.6], 4);
        await ctx.wait(1.6);
        // 這裡沒有人盯著看，面具自己掉下來
        SS.ui.hud.dropMask();
        SS.ui.hud.setFace('calm');
        SS.sfx.play('pop');
        await ctx.wait(1.2);
        await ctx.say(d.uncle);
        await ctx.say(d.greeting);
        await ctx.say(d.voices);
        SS.panels.clipping.show(d.clipping);
        await ctx.key();
        SS.panels.hidePanel();
        await ctx.card(d.card);
      },
      update(dt, stage) {
        if (stage.leaves) stage.leaves.userData.update(dt);
      },
    },

    {
      id: 'ch2_rooftop',
      enter(ctx) {
        const { stage, data: d } = ctx;
        const base = stage.refs.home.base;
        stage.actors.yating.root.visible = false;
        SS.state.viewer = 'siti';
        // 深藍的夜：星星、整片窗戶亮燈
        SS.env.set('night', 0);
        SS.ui.setClock(d.clock.time);
        SS.ui.hud.show(CH2);
        SS.ui.hud.setMask(1);
        // Siti 走到頂樓水塔旁邊的角落；禮拜毯先捲著
        const siti = stage.actors.siti;
        const spot = at(base, 2.75, 9.5, 1.8);
        siti.root.visible = true;
        siti.root.position.copy(spot);
        faceTo(siti, at(base, 4.5, 9.5, 1.8));
        const mat = (ctx.mat = SS.sets.prayerMat());
        mat.rotation.y = siti.root.rotation.y;
        mat.position.copy(spot).add(V(Math.sin(mat.rotation.y), 0, Math.cos(mat.rotation.y)).multiplyScalar(-0.35));
        mat.position.y += 0.02;
        mat.scale.z = 0.02;
        ctx.add(mat);
        // 一盞暖色的燈照著她，投影上才看得清楚
        stage.lamp.position.copy(at(base, 3.6, 11.4, 3.0));
        stage.lamp.intensity = 1.25;
        ctx.shot(at(base, 6.2, 13.0, 6.8), at(base, 2.4, 9.95, 0.8), 0);
      },
      async run(ctx) {
        const { stage, data: d } = ctx;
        const base = stage.refs.home.base;
        const siti = stage.actors.siti;
        const mat = ctx.mat;
        SS.ui.showArea('頂樓');
        await ctx.wait(1.2);
        // 鋪開禮拜毯，跪下來
        await ctx.loop((dt) => {
          mat.scale.z = Math.min(1, mat.scale.z + dt / 1.1);
          return mat.scale.z >= 1 ? true : null;
        });
        siti.setPose('kneel');
        SS.ui.hud.setFace('calm');
        // 禱告：約十秒、沒有台詞、不能操作；HUD 慢慢不見，鏡頭慢慢降低、往上仰，整片星空
        SS.ui.hud.vanish(true, d.prayerSec * 0.6);
        SS.ui.setClock(null);
        ctx.shot(at(base, 6.6, 10.7, 6.6), at(base, 1.4, 12.9, -1.4), d.prayerSec);
        await ctx.wait(d.prayerSec);
        // 收起禮拜毯，打視訊給女兒
        siti.setPose('stand');
        await ctx.loop((dt) => {
          mat.scale.z = Math.max(0.02, mat.scale.z - dt / 0.6);
          return mat.scale.z <= 0.02 ? true : null;
        });
        const phone = SS.panels.phone;
        phone.video('putri', 'Putri');
        SS.sfx.play('ring');
        await ctx.wait(0.8);
        for (const line of d.call) await ctx.say(line, { where: 'phone' });
        phone.close();
        // 樓下傳來阿公的聲音，所有東西帶著雜訊閃回來；Siti 走下樓
        SS.ui.hud.vanish(false, 0.4);
        SS.ui.hud.glitch();
        SS.ui.hud.setFace('smile');
        SS.post.kick('warp', 0.9, 1.4);
        SS.post.kick('ab', 1.4, 1.6);
        SS.sfx.play('thud');
        await ctx.say(d.shout, { where: 'box', loud: true });
        faceTo(siti, at(base, -1, 9.5, 2));
        SS.ui.fade(true, 1.2);
        await ctx.wait(1.2);
      },
    },

    {
      id: 'ending_ledger',
      enter(ctx) {
        ctx.stage.actors.yating.root.visible = false;
        ctx.shot(...along(0.3, 8, 6, 10), 0);
      },
      async run(ctx) {
        const d = ctx.data;
        const s = SS.state;
        const L = SS.panels.ledger;
        L.counts(
          d.counts.map((c) => {
            const t = SS.mech.tally(c.key);
            return { label: c.label, n: t.people.length, times: t.times, names: t.people.map((w) => SS.DATA.people[w]) };
          })
        );
        SS.sfx.play('pop');
        await ctx.key();
        // 帳本二：時薪那一格先讓台下猜
        const q = SS.DATA.live.wage;
        L.table(d.table);
        ctx.ask(q);
        L.guessTally(q.options, liveCounts(q));
        ctx.onLive('update', () => L.guessTally(q.options, liveCounts(q)));
        await ctx.key();
        SS.live.close().catch(() => {});
        L.revealGuess();
        await ctx.key();
        // 帳本三：誰得到好處、誰付出代價，一個一個亮起來
        L.sides(d.gains, d.costs);
        while (L.step()) await ctx.key();
      },
    },

    {
      id: 'ending_views',
      enter(ctx) {
        ctx.stage.actors.yating.root.visible = false;
        ctx.shot(...along(0.3, 8, 6, 10), 0);
      },
      async run(ctx) {
        const d = ctx.data;
        for (const v of d.views) {
          SS.panels.views.show(v, v.showVote ? voteStat() : '');
          SS.sfx.play('pop');
          await ctx.key();
        }
        SS.panels.hidePanel();
        // 最後畫面：同一條坡道，雅婷和 Siti 一人握一邊把手，一起推阿公往上走
        const stage = ctx.stage;
        SS.env.set('sunset', 2.5);
        stage.actors.yating.root.visible = true;
        stage.actors.yating.setPose('push');
        stage.actors.siti.setPose('push');
        // 從坡上往下看：三個人朝鏡頭慢慢走上來，走到 stop 就停下
        stage.uphill = { u: 0.4, speed: 0.55, stop: 0.17 };
        ctx.cleanup(() => (stage.uphill = null));
        this.update(0, stage);
        const top = frame(0.07);
        ctx.shot(top.p.clone().addScaledVector(top.right, 2.0).add(V(0, 2.6, 0)), frame(0.32).p.clone().add(V(0, 1.0, 0)), 0);
        ctx.shot(top.p.clone().addScaledVector(top.right, 1.3).addScaledVector(top.t, 1.2).add(V(0, 2.3, 0)), frame(0.24).p.clone().add(V(0, 1.0, 0)), 16);
        SS.ui.hud.show({ count: true });
        let shown = d.finalNames;
        SS.ui.hud.setCounts(shown, SS.state.gaikao, 'name');
        // 台下用手機叫她的名字：每按一下冒一個泡泡，計數加上按過的人數
        ctx.ask(SS.DATA.live.name);
        ctx.onLive('taps', (n) => {
          for (let i = 0; i < Math.min(n, 24); i++) ctx.after(i * 0.09, () => SS.ui.nameBubble());
        });
        ctx.onLive('update', (st) => {
          const n = d.finalNames + st.people;
          if (n !== shown) {
            shown = n;
            SS.ui.hud.setCounts(n, SS.state.gaikao, 'name');
          }
        });
        await ctx.wait(1.2);
        SS.ui.title(d.heading);
        await ctx.key();
      },
      // 三個人沿坡道慢慢往上（u 越小越靠近阿公家）
      update(dt, stage) {
        const g = stage.uphill;
        if (!g) return;
        const moving = g.u > g.stop;
        g.u = Math.max(g.stop, g.u - (g.speed * dt) / SS.world.curves.A.getLength());
        const { p, t } = frame(g.u);
        const yaw = Math.atan2(-t.x, -t.z);
        const fwd = V(Math.sin(yaw), 0, Math.cos(yaw));
        const side = V(fwd.z, 0, -fwd.x);
        const chair = stage.chair;
        chair.root.visible = true;
        chair.roll(chair.root.position.distanceTo(p));
        chair.root.position.copy(p);
        chair.root.rotation.y = yaw;
        const back = p.clone().addScaledVector(fwd, chair.handleZ);
        for (const [who, s] of [['siti', -0.27], ['yating', 0.3]]) {
          const a = stage.actors[who];
          a.root.visible = true;
          a.root.position.copy(back).addScaledVector(side, s);
          a.root.position.y = SS.world.street.groundAt(a.root.position.x, a.root.position.z).y;
          a.root.rotation.y = yaw;
          a.animate(dt, moving ? 0.4 : 0, 5);
        }
      },
    },
  ];
})();
