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
  const timers = new Set();
  const waiters = new Set();
  const loops = new Set();
  const V = () => new THREE.Vector3();
  const shot = { active: false, t: 0, dur: 0, fromPos: V(), toPos: V(), fromLook: V(), toLook: V(), look: V() };

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

  function anchorFor(who) {
    const a = stage.actors[who];
    if (a && a.root.visible) return { object: a.head, lift: 0.45 };
    const o = stage.anchors[who];
    if (o) return { object: o, lift: 0 };
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
        tag: line.placeholder ? ctx.data.placeholderNote : '',
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
          const wt = { t, codes, res: done };
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
      // 鏡頭交回給跟著雅婷的 rail，從現在的位置平滑接回去
      release() {
        stage.rail._camPos.copy(stage.camera.position);
        stage.rail._look.copy(shot.look);
        shot.active = false;
        stage.mode = 'rail';
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
    s.actors.yating.root.visible = true;
    for (const a of Object.values(s.actors)) if (a.homeYaw !== undefined) a.root.rotation.y = a.homeYaw;
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
          SS.ui.toast('這一段出錯了，請按 N 跳到下一段');
        }
      );
    SS.bus.emit('scene', scene, i);
  }

  function update(dt) {
    if (!token) return;
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
  function talkTo(ctx, actor) {
    const { rail, actors } = ctx.stage;
    const me = actors.yating.root.position;
    const you = actor.root.position;
    const yaw = Math.atan2(you.x - me.x, you.z - me.z);
    rail.velocity.set(0, 0, 0);
    rail.heading.set(Math.sin(yaw), 0, Math.cos(yaw));
    actors.yating.root.rotation.y = yaw;
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

  function roomHtml(d) {
    return `<div class="room-box">
      <h2>阿公家　二樓</h2>
      <div class="room-tasks">${d.chores.tasks.map((t) => `<span>${t}</span>`).join('')}</div>
      <p>家務小遊戲製作中（${d.chores.seconds} 秒、一定做不完）。按空白鍵看結果。</p>
    </div>`;
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
        else SS.ui.toast('手機還沒有人投票：請按 1、2、3 記下舉手最多的');
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
        stage.rail.update(dt);
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
        for (const line of d.lines) await ctx.say(line, { where: 'phone' });
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
      async run(ctx) {
        SS.ui.fade(true, 0.8);
        await ctx.wait(0.8);
        SS.ui.caption(ctx.data.lines, { dark: true, stagger: 1.2 });
        await ctx.waitOrKey(4.2);
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
        const d = ctx.data;
        SS.state.viewer = 'siti';
        SS.ui.setClock(d.clock.time);
        SS.ui.slate('room', roomHtml(d));
        SS.ui.hud.show(CH2);
        SS.ui.hud.setMask(1);
      },
      async run(ctx) {
        const d = ctx.data;
        SS.ui.showArea('阿公家');
        await ctx.key();
        SS.ui.caption(d.chores.result);
        SS.sfx.play('thud');
        await ctx.key();
        SS.ui.caption(null);
        await ctx.say(d.lines, { where: 'box' });
        SS.ui.cite(d.cite);
        await ctx.card(d.card);
      },
    },

    {
      id: 'ch2_slope',
      enter(ctx) {
        const [p, l] = along(0.02);
        ctx.stage.actors.yating.root.visible = false;
        SS.state.viewer = 'siti';
        SS.ui.hud.show(CH2);
        SS.ui.hud.setMask(1);
        SS.ui.wip('Siti 推輪椅還在製作');
        ctx.shot(p, l, 0);
      },
      async run(ctx) {
        const { stage, data: d } = ctx;
        const [p, l] = along(0.16);
        SS.ui.showArea('坡頂巷');
        ctx.shot(p, l, 7);
        await ctx.say(d.lines, { where: 'box' });
        // 阿珠姨
        const az = stage.actors.azhu.root.position;
        const f = frame(0.24);
        ctx.shot(az.clone().addScaledVector(f.right, 5.5).addScaledVector(f.t, -3).add(V(0, 2.6, 0)), az.clone().add(V(0, 1.4, 0)), 1.6);
        await ctx.wait(1.6);
        await ctx.say(d.azhu);
        // 天橋：輪椅上不去
        SS.ui.showArea('天橋');
        ctx.shot([11.8, 4.6, -50.5], [10, 4.4, -59.5], 2.2);
        await ctx.wait(2.2);
        SS.ui.blocked(true, d.blocked);
        SS.ui.cite(d.cite);
        SS.sfx.play('buzz');
        await ctx.key();
        SS.ui.blocked(false);
        // 只能沿著大馬路繞到很遠的斑馬線，車子一直按喇叭
        // 從大馬路上方往下看：左邊是天橋，右邊遠處才是斑馬線
        ctx.shot([25, 36, -47], [25, 2.5, -68], 2.5);
        await ctx.wait(1.2);
        SS.sfx.play('horn');
        await ctx.wait(1.4);
        SS.sfx.play('horn');
        await ctx.waitOrKey(2.5);
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
        SS.ui.wip('客人轉頭注視還在製作');
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
        ctx.shot(at(base, 3.4, 2.4, 11), at(base, -0.4, 1.5, 2.4), 2);
        await ctx.wait(1.6);
        await ctx.say(d.lines);
        SS.ui.cite(null);
        await SS.mech.holdSmile(ctx, d.hold, d.call);
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
        SS.ui.wip('看護們和下棋阿伯還在製作');
        ctx.shot([c.x + 11, c.y + 6.5, c.z + 15], [c.x, c.y + 2.4, c.z], 0);
      },
      async run(ctx) {
        const { stage, data: d } = ctx;
        const c = stage.refs.park.center;
        SS.ui.showArea('廟口公園');
        ctx.shot([c.x + 7, c.y + 3.6, c.z + 10.5], [c.x, c.y + 2, c.z], 4);
        await ctx.wait(1.6);
        // 這裡沒有人盯著看，面具自己掉下來
        SS.ui.hud.dropMask();
        SS.ui.hud.setFace('calm');
        SS.sfx.play('pop');
        await ctx.wait(1.2);
        await ctx.say(d.greeting, { where: 'box' });
        await ctx.say(d.voices, { where: 'box' });
        SS.panels.clipping.show(d.clipping);
        await ctx.key();
        SS.panels.hidePanel();
        await ctx.card(d.card);
      },
    },

    {
      id: 'ch2_rooftop',
      enter(ctx) {
        const { stage, data: d } = ctx;
        const base = stage.refs.home.base;
        stage.actors.yating.root.visible = false;
        SS.state.viewer = 'siti';
        SS.ui.tint('night');
        SS.ui.setClock(d.clock.time);
        SS.ui.hud.show(CH2);
        SS.ui.hud.setMask(1);
        SS.ui.wip('Siti 禱告的動作還在製作');
        ctx.shot(at(base, 4, 14.6, 7), at(base, 0.6, 10.3, -1.6), 0);
      },
      async run(ctx) {
        const { stage, data: d } = ctx;
        const base = stage.refs.home.base;
        SS.ui.showArea('頂樓');
        await ctx.wait(1.4);
        // 禱告：約十秒、沒有台詞、不能操作；HUD 慢慢不見，鏡頭往後拉
        SS.ui.hud.vanish(true, d.prayerSec * 0.6);
        SS.ui.setClock(null);
        ctx.shot(at(base, 6, 17, 10), at(base, 0.8, 10.2, -1.8), d.prayerSec);
        await ctx.wait(d.prayerSec);
        const phone = SS.panels.phone;
        phone.video('putri', 'Putri');
        SS.sfx.play('ring');
        await ctx.wait(0.8);
        for (const line of d.call) await ctx.say(line, { where: 'phone' });
        phone.close();
        // 樓下傳來阿公的聲音，所有東西都回來了
        SS.ui.hud.vanish(false, 0.4);
        SS.sfx.play('thud');
        await ctx.say(d.shout, { where: 'box', loud: true });
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
          d.counts.map((c) => ({
            label: c.label,
            n: s.callers[c.key].length,
            names: s.callers[c.key].map((w) => SS.DATA.people[w]),
          }))
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
        // 最後畫面：同一條坡道往上看，名字計數，標題再出現一次
        SS.ui.wip('雅婷和 Siti 一起推阿公上坡還在製作');
        SS.ui.tint('dusk');
        const low = frame(0.36);
        const look = frame(0.04).p.clone().add(V(0, 2.4, 0));
        ctx.shot(low.p.clone().addScaledVector(low.t, 5).add(V(0, 2.6, 0)), look, 0);
        ctx.shot(low.p.clone().addScaledVector(low.t, 1).add(V(0, 3.4, 0)), look, 14);
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
    },
  ];
})();
