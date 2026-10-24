// 機制：語言遮罩、名字計數、選項退回、按住空白鍵保持微笑
window.SS = window.SS || {};

SS.mech = {
  // 中文只留下 Siti 學會的詞，其他字變成 □（標點、英文保留）
  maskText(text) {
    const words = SS.DATA.learnedWords;
    let out = '';
    let i = 0;
    while (i < text.length) {
      const w = words.find((word) => text.startsWith(word, i));
      if (w) {
        out += w;
        i += w.length;
        continue;
      }
      const ch = text[i];
      out += /[㐀-鿿]/.test(ch) ? '□' : ch;
      i += 1;
    }
    return out;
  },

  // Siti 視角聽不懂的句子：有寫好的遮罩版本就用，國語句子自動遮；understood 的句子不遮
  displayFor(line) {
    if (!SS.state.maskZh || line.understood) return null;
    if (line.maskTo) return line.maskTo;
    if (!line.lang || line.lang === 'zh') return this.maskText(line.text);
    return null;
  },

  // ---------- 名字計數 ----------
  resetCounts() {
    SS.state.names = 0;
    SS.state.gaikao = 0;
    SS.state.calls = { name: [], gaikao: [], yating: [] };
  },

  // 帳本用：叫過的人（不重複）與次數
  tally(key) {
    const calls = SS.state.calls[key];
    return { people: [...new Set(calls)], times: calls.length };
  },

  countLine(line, quiet = false) {
    const s = SS.state;
    let bump = null;
    if (line.callsName) {
      s.names += 1;
      s.calls.name.push(line.who);
      bump = 'name';
    }
    if (line.callsGaikao) {
      s.gaikao += 1;
      s.calls.gaikao.push(line.who);
      bump = 'gaikao';
    }
    if (line.callsYating) s.calls.yating.push(line.who);
    // 對話框出現後，「+1」從對話框飛到右上角，飛到了才換數字
    if (!quiet && bump) {
      const names = s.names;
      const gaikao = s.gaikao;
      const scene = SS.director.index;
      // 飛的途中如果已經跳到別段，就不要再改數字（新段落會自己補回正確的計數）
      const same = () => SS.director.index === scene;
      setTimeout(() => {
        if (!same()) return;
        SS.ui.flyCount(bump, () => {
          if (!same()) return;
          SS.ui.hud.setCounts(names, gaikao, bump);
          SS.sfx.play(bump === 'gaikao' ? 'thud' : 'pop');
        });
      }, 350);
    }
    return bump;
  },

  // 跳段時：把前面所有段落的計數補回來，數字才會對
  baseline(sceneIds) {
    this.resetCounts();
    const walk = (node) => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== 'object') return;
      if (typeof node.text === 'string' && node.who) this.countLine(node, true);
      Object.values(node).forEach((v) => typeof v === 'object' && walk(v));
    };
    sceneIds.forEach((id) => walk(SS.DATA.scenes[id]));
    SS.ui.hud.setCounts(SS.state.names, SS.state.gaikao);
  },

  // ---------- 訓練中心：選真話會被退回 ----------
  async choose(ctx, q, rejectLine) {
    const P = SS.panels.choices;
    P.show([q.honest, q.mask]);
    let sel = 0;
    let rejected = false;
    P.highlight(sel);
    for (;;) {
      const code = await ctx.key(['Digit1', 'Digit2', 'Numpad1', 'Numpad2', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Space']);
      let pick = null;
      if (code.endsWith('1')) pick = 0;
      else if (code.endsWith('2')) pick = 1;
      else if (code.startsWith('Arrow')) {
        sel = rejected ? 1 : 1 - sel;
        P.highlight(sel);
        continue;
      } else pick = sel;
      if (pick === 0) {
        if (rejected) {
          P.shake(0);
          continue;
        }
        rejected = true;
        P.reject(0);
        SS.ui.hud.setMask(SS.state.mask + 0.12);
        await ctx.say(rejectLine);
        sel = 1;
        P.highlight(sel);
        continue;
      }
      P.pick(1);
      await ctx.wait(0.5);
      P.hide();
      return rejected;
    }
  },

  // ---------- 早餐店：按住空白鍵保持微笑 ----------
  // 店裡的人一個接一個轉頭看 Siti；放手超過 0.5 秒：面具掉下來、客人小聲講話、三秒後仲介來電，再重來；
  // 放手兩次後提示變大閃爍。gaze：{ watchers: [人物], target: 被看的人, whisperers: [人物] }
  async holdSmile(ctx, hold, call, gaze = {}) {
    const ui = SS.ui;
    const watchers = gaze.watchers || [];
    const eyes = new THREE.Vector3();
    const whisper = (on) => {
      if (!gaze.whisperers) return ui.whispers(on);
      gaze.whisperers.forEach((p, i) => (on ? ui.labels.set(`whisper${i}`, { text: '…', object: p.head, lift: 0.75, kind: 'whisper' }) : ui.labels.remove(`whisper${i}`)));
    };
    // 看得見的視線：從每個人的眼睛射向 Siti 的淡黃色細線
    const UP = new THREE.Vector3(0, 1, 0);
    const from = new THREE.Vector3();
    const beams = watchers.map(() => {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.018, 1, 6),
        new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0, depthWrite: false })
      );
      m.visible = false;
      return ctx.add(m);
    });
    const hideBeams = () => beams.forEach((m) => (m.visible = false));
    // 每個人轉頭看 Siti 的程度：0 不看，1 盯著看；依序晚 0.18 秒開始轉
    const look = (t, k) => {
      if (gaze.target) gaze.target.head.getWorldPosition(eyes);
      watchers.forEach((p, i) => {
        const w = SS.util.clamp((t - i * 0.18) / 0.6, 0, 1) * k;
        if (w > 0) p.lookAt(eyes, 0.2 * w);
        else p.turnHead(0, 0.08);
        const m = beams[i];
        p.head.getWorldPosition(from);
        const dir = eyes.clone().sub(from);
        const len = dir.length();
        m.visible = w > 0.02 && len > 0.3;
        if (!m.visible) return;
        m.position.copy(from).addScaledVector(dir, 0.5);
        m.scale.set(1, len, 1);
        m.quaternion.setFromUnitVectors(UP, dir.normalize());
        m.material.opacity = 0.9 * w;
      });
    };
    let fails = 0;
    for (;;) {
      let progress = 0;
      let started = false;
      let releasedFor = 0;
      let idle = 0;
      let t = 0;
      ui.hold.show(hold.prompt);
      ui.hold.urgent(fails >= 2);
      ui.hud.setMask(1);
      ui.hud.setFace('smile');
      whisper(false);
      const result = await ctx.loop((dt) => {
        t += dt;
        if (SS.input.down('Space')) {
          started = true;
          releasedFor = 0;
          progress += dt / hold.seconds;
        } else if (started) {
          releasedFor += dt;
        } else {
          idle += dt;
          if (idle > 8) ui.hold.urgent(true);
        }
        // 看的人越多畫面越暗、越灰；撐得越久，大家慢慢不看了
        const watching = SS.util.clamp(t / (0.6 + watchers.length * 0.18), 0, 1) * (1 - progress);
        look(t, 1 - progress);
        ui.hold.set(progress);
        ui.vignette(0.85 * watching);
        SS.post.drive({ desat: 0.55 * watching });
        if (progress >= 1) return 'done';
        if (started && releasedFor > 0.5) return 'released';
        return null;
      });
      if (result === 'done') {
        ui.hold.hide();
        ui.vignette(0);
        SS.post.drive({ desat: 0 });
        hideBeams();
        await ctx.loop((dt) => {
          watchers.forEach((p) => p.turnHead(0, SS.util.damp(4, dt)));
          return Math.abs(watchers[0] ? watchers[0].head.rotation.y : 0) < 0.02 ? true : null;
        });
        return fails;
      }
      // 面具掉下來：色差閃一下、四周泛紅
      fails += 1;
      ui.hold.hide();
      hideBeams();
      SS.post.kick('ab', 1.6, 1.6);
      SS.post.kick('pulse', 0.7, 1.2);
      SS.director.shake(0.06, 0.35);
      ui.hud.dropMask();
      ui.hud.setFace('tired');
      whisper(true);
      SS.sfx.play('thud');
      await ctx.wait(3);
      whisper(false);
      const phone = SS.panels.phone;
      phone.ring(`${SS.DATA.people[call.who]}（仲介）`);
      await ctx.wait(1.4);
      phone.video('wang', SS.DATA.people[call.who]);
      await ctx.say(call, { where: 'phone' });
      phone.close();
    }
  },

  // ---------- 家務：做不完的小遊戲 ----------
  // room：sets.homeRoom() 的結果（已放進場景）；siti、agong：人物。回傳 { done, remaining }
  async chores(ctx, room, siti, agong, opts) {
    const ui = SS.ui;
    const I = SS.input;
    const names = opts.tasks;
    const stations = room.stations
      .filter((s) => names.includes(s.name))
      .map((s) => ({ ...s, pos: s.local.clone().applyMatrix4(room.root.matrixWorld), lit: false, progress: 0 }));
    const agongSpot = room.agongStation.clone().applyMatrix4(room.root.matrixWorld);
    const origin = room.root.position;
    const { bounds, obstacles } = room;
    const pick = (n, except) => {
      const free = stations.filter((s) => !s.lit && s !== except);
      for (let i = 0; i < n && free.length; i++) {
        const s = free.splice(Math.floor(Math.random() * free.length), 1)[0];
        s.lit = true;
        s.progress = 0;
      }
    };
    pick(3);
    let left = opts.seconds;
    let done = 0;
    let remaining = 3;
    let callIn = opts.callEvery;
    let call = null;
    let calls = 0;
    const heading = new THREE.Vector3(0, 0, -1);
    const vel = new THREE.Vector3();
    const p = siti.root.position;

    const draw = () => {
      for (const s of stations) {
        if (s.lit) ui.labels.set(s.id, { text: s.name, pos: s.pos, lift: 1.55, kind: 'task', progress: s.progress });
        else ui.labels.remove(s.id);
      }
      if (call) ui.labels.set('call', { text: call.text, object: agong.head, lift: 0.75, kind: 'call', progress: call.progress });
      else ui.labels.remove('call');
      ui.chores({ left, done, remaining });
    };
    draw();

    const result = await ctx.loop((dt) => {
      left -= dt;
      // 時間越少，畫面越灰
      SS.post.drive({ desat: 0.6 * SS.util.clamp(1 - left / opts.seconds, 0, 1) });
      // 走路：W 往房間裡面、S 往鏡頭、A 左、D 右（也吃 iPad 搖桿）
      const x = (I.down('KeyD', 'ArrowRight') ? 1 : 0) - (I.down('KeyA', 'ArrowLeft') ? 1 : 0) + I.stick.x;
      const z = (I.down('KeyS', 'ArrowDown') ? 1 : 0) - (I.down('KeyW', 'ArrowUp') ? 1 : 0) - I.stick.y;
      const wish = new THREE.Vector3(x, 0, z);
      if (wish.lengthSq() > 1) wish.normalize();
      const fast = I.down('ShiftLeft', 'ShiftRight') || I.stick.run;
      vel.lerp(wish.multiplyScalar(opts.speed * (fast ? 1.4 : 1)), SS.util.damp(12, dt));
      p.addScaledVector(vel, dt);
      // 房間範圍與大家具
      const lx = SS.util.clamp(p.x - origin.x, bounds.minX, bounds.maxX);
      const lz = SS.util.clamp(p.z - origin.z, bounds.minZ, bounds.maxZ);
      p.x = origin.x + lx;
      p.z = origin.z + lz;
      for (const o of obstacles) {
        const dx = p.x - origin.x - o.x;
        const dz = p.z - origin.z - o.z;
        const d = Math.hypot(dx, dz);
        const r = o.r + 0.3;
        if (d < r && d > 0.0001) {
          p.x += (dx / d) * (r - d);
          p.z += (dz / d) * (r - d);
        }
      }
      const speed = vel.length();
      if (speed > 0.05) heading.lerp(vel.clone().normalize(), SS.util.damp(14, dt)).normalize();
      siti.root.rotation.y = Math.atan2(heading.x, heading.z);
      siti.animate(dt, SS.util.clamp(speed / opts.speed, 0, 1), 7 + speed * 2);

      // 阿公每隔幾秒叫一次人；叫人的時候，其他家務都停下來
      callIn -= dt;
      if (!call && callIn <= 0) {
        call = { text: calls++ % 2 ? '雅婷——' : 'Siti——', progress: 0 };
        SS.sfx.play('thud');
        // 阿公喊人：畫面四周泛紅、震一下
        SS.post.kick('pulse', 0.85, 1.0);
        SS.director.shake(0.08, 0.4);
      }
      const holding = I.down('KeyE');
      const near = (q, r) => Math.hypot(p.x - q.x, p.z - q.z) < r;
      if (call) {
        if (holding && near(agongSpot, 1.35)) {
          call.progress += dt / opts.answerSeconds;
          heading.set(agongSpot.x - p.x, 0, agongSpot.z - p.z).normalize();
          if (call.progress >= 1) {
            call = null;
            callIn = opts.callEvery;
            SS.sfx.play('pop');
          }
        }
      } else if (holding) {
        const s = stations.find((st) => st.lit && near(st.pos, 1.3));
        if (s) {
          s.progress += dt / opts.holdSeconds;
          heading.set(s.pos.x - p.x, 0, s.pos.z - p.z).normalize();
          if (s.progress >= 1) {
            s.lit = false;
            s.progress = 0;
            done += 1;
            remaining += 1; // 做完一件、又亮兩件
            pick(2, s);
            ui.hud.bumpLedger();
            SS.sfx.play('pop');
          }
        }
      }
      draw();
      return left <= 0 ? true : null;
    });
    ui.labels.clear();
    ui.chores(null);
    SS.post.drive({ desat: 0 });
    return { done, remaining, result };
  },
};
