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
    SS.state.callers = { name: [], gaikao: [], yating: [] };
  },

  countLine(line, quiet = false) {
    const s = SS.state;
    const add = (key, who) => {
      if (!s.callers[key].includes(who)) s.callers[key].push(who);
    };
    let bump = null;
    if (line.callsName) {
      s.names += 1;
      add('name', line.who);
      bump = 'name';
    }
    if (line.callsGaikao) {
      s.gaikao += 1;
      add('gaikao', line.who);
      bump = 'gaikao';
    }
    if (line.callsYating) add('yating', line.who);
    if (!quiet && bump) {
      SS.ui.hud.setCounts(s.names, s.gaikao, bump);
      SS.sfx.play(bump === 'gaikao' ? 'thud' : 'pop');
    }
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
  // 放手超過 0.5 秒：面具掉下來、客人小聲講話、三秒後仲介來電，再重來；放手兩次後提示變大閃爍
  async holdSmile(ctx, hold, call) {
    const ui = SS.ui;
    let fails = 0;
    for (;;) {
      let progress = 0;
      let started = false;
      let releasedFor = 0;
      let idle = 0;
      ui.hold.show(hold.prompt);
      ui.hold.urgent(fails >= 2);
      ui.hud.setMask(1);
      ui.hud.setFace('smile');
      ui.whispers(false);
      ui.vignette(0.85);
      const result = await ctx.loop((dt) => {
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
        ui.hold.set(progress);
        ui.vignette(0.85 * (1 - progress));
        if (progress >= 1) return 'done';
        if (started && releasedFor > 0.5) return 'released';
        return null;
      });
      if (result === 'done') {
        ui.hold.hide();
        ui.vignette(0);
        return fails;
      }
      // 面具掉下來
      fails += 1;
      ui.hold.hide();
      ui.hud.dropMask();
      ui.hud.setFace('tired');
      ui.whispers(true);
      SS.sfx.play('thud');
      await ctx.wait(3);
      ui.whispers(false);
      const phone = SS.panels.phone;
      phone.ring(`${SS.DATA.people[call.who]}（仲介）`);
      await ctx.wait(1.4);
      phone.video('wang', SS.DATA.people[call.who]);
      await ctx.say(call, { where: 'phone' });
      phone.close();
    }
  },
};
