// 後製：泛光、調色、暗角、顆粒、色差、倒帶雜訊。全部自己寫，不依賴 three 的 addons
window.SS = window.SS || {};

SS.post = (function () {
  let renderer = null;
  let enabled = false;
  let low = false;
  let rtScene = null, rtA = null, rtB = null;
  let time = 0;
  const size = new THREE.Vector2();

  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadScene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  quadScene.add(quad);

  const vert = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const flat = { depthTest: false, depthWrite: false };

  const brightMat = new THREE.ShaderMaterial({
    ...flat,
    uniforms: { tDiffuse: { value: null }, uThreshold: { value: 0.86 }, uKnee: { value: 0.12 } },
    vertexShader: vert,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float uThreshold; uniform float uKnee; varying vec2 vUv;
      void main(){
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        float l = max(c.r, max(c.g, c.b));
        float soft = clamp(l - uThreshold + uKnee, 0.0, 2.0 * uKnee);
        soft = soft * soft / (4.0 * uKnee + 1e-4);
        float w = max(soft, l - uThreshold) / max(l, 1e-4);
        gl_FragColor = vec4(c * w, 1.0);
      }`,
  });

  const blurMat = new THREE.ShaderMaterial({
    ...flat,
    uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2(1, 0) } },
    vertexShader: vert,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform vec2 uDir; varying vec2 vUv;
      void main(){
        vec3 c = texture2D(tDiffuse, vUv).rgb * 0.227027;
        c += texture2D(tDiffuse, vUv + uDir * 1.3846).rgb * 0.316216;
        c += texture2D(tDiffuse, vUv - uDir * 1.3846).rgb * 0.316216;
        c += texture2D(tDiffuse, vUv + uDir * 3.2308).rgb * 0.070270;
        c += texture2D(tDiffuse, vUv - uDir * 3.2308).rgb * 0.070270;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });

  const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  const compMat = new THREE.ShaderMaterial({
    ...flat,
    uniforms: {
      tScene: { value: null }, tBloom: { value: null },
      uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 },
      uBloom: { value: 0 }, uExposure: { value: 1 }, uContrast: { value: 1 }, uSat: { value: 1 },
      uTint: { value: v3([1, 1, 1]) }, uLift: { value: v3([0, 0, 0]) },
      uVig: { value: 0 }, uVigColor: { value: v3([0, 0, 0]) },
      uGrain: { value: 0 }, uAb: { value: 0 }, uScan: { value: 0 }, uWarp: { value: 0 },
      uDesat: { value: 0 }, uFlash: { value: 0 }, uFlashColor: { value: v3([1, 1, 1]) },
      uPulse: { value: 0 }, uPulseColor: { value: v3([0.85, 0.16, 0.12]) },
    },
    vertexShader: vert,
    fragmentShader: `
      uniform sampler2D tScene; uniform sampler2D tBloom; uniform vec2 uRes; uniform float uTime;
      uniform float uBloom, uExposure, uContrast, uSat, uVig, uGrain, uAb, uScan, uWarp, uDesat, uFlash, uPulse;
      uniform vec3 uTint, uLift, uVigColor, uFlashColor, uPulseColor;
      varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec2 uv = vUv;
        if (uWarp > 0.001) {
          // 錄影帶倒帶：橫向抖動與一條往上捲的雜訊帶
          float line = floor(uv.y * 160.0);
          uv.x += (hash(vec2(line, floor(uTime * 24.0))) - 0.5) * 0.014 * uWarp;
          float bandPos = fract(uv.y * 0.8 + uTime * 0.9);
          float band = smoothstep(0.0, 0.03, bandPos) * (1.0 - smoothstep(0.03, 0.08, bandPos));
          uv.x += band * 0.05 * uWarp;
        }
        vec2 d = uv - 0.5;
        vec3 col;
        if (uAb > 0.001) {
          vec2 o = d * uAb * 0.02;
          col = vec3(texture2D(tScene, uv + o).r, texture2D(tScene, uv).g, texture2D(tScene, uv - o).b);
        } else {
          col = texture2D(tScene, uv).rgb;
        }
        col += texture2D(tBloom, uv).rgb * uBloom;
        col *= uExposure;
        col = col * uTint + uLift;
        float l = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(l), col, uSat * (1.0 - uDesat));
        col = (col - 0.5) * uContrast + 0.5;
        float aspect = uRes.x / uRes.y;
        float r = length(d * vec2(aspect, 1.0)) / length(vec2(aspect, 1.0) * 0.5);
        col = mix(col, uVigColor, smoothstep(0.35, 1.08, r) * uVig);
        col = mix(col, uPulseColor, smoothstep(0.5, 1.12, r) * uPulse);
        if (uScan > 0.001) {
          col *= 1.0 - uScan * 0.2 * (0.5 + 0.5 * sin(vUv.y * uRes.y * 1.3));
          col += uScan * 0.06 * hash(vec2(floor(vUv.y * uRes.y * 0.5), floor(uTime * 30.0)));
        }
        col += (hash(vUv * uRes + fract(uTime) * 91.0) - 0.5) * uGrain;
        col = mix(col, uFlashColor, clamp(uFlash, 0.0, 1.0));
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }`,
  });

  // 目前值與目標值；transient 是瞬間加上去、會自己退回 0 的效果（閃白、色差、震動紅框）
  const DEFAULT = {
    bloom: 0.3, threshold: 0.86, exposure: 1, contrast: 1.04, sat: 1.1,
    tint: [1, 1, 1], lift: [0, 0, 0], vig: 0.25, vigColor: [0.05, 0.07, 0.09],
    grain: 0.025, ab: 0, scan: 0, warp: 0, desat: 0, pulse: 0,
  };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const cur = clone(DEFAULT);
  const target = clone(DEFAULT);
  const trans = { flash: 0, ab: 0, pulse: 0, warp: 0 };
  const transDecay = { flash: 3, ab: 2.5, pulse: 2, warp: 2 };
  let rate = 3;

  function set(params, dur = 1) {
    for (const k in params) if (k in target) target[k] = clone(params[k]);
    rate = dur <= 0 ? Infinity : 4 / dur;
    if (dur <= 0) Object.assign(cur, clone(target));
  }
  function reset(dur = 1) { set(DEFAULT, dur); }
  function kick(name, amount, decay) {
    trans[name] = Math.max(trans[name] || 0, amount);
    if (decay) transDecay[name] = decay;
  }

  function step(dt) {
    const k = rate === Infinity ? 1 : 1 - Math.exp(-rate * dt);
    for (const key in target) {
      if (Array.isArray(target[key])) for (let i = 0; i < 3; i++) cur[key][i] += (target[key][i] - cur[key][i]) * k;
      else cur[key] += (target[key] - cur[key]) * k;
    }
    for (const key in trans) trans[key] = Math.max(0, trans[key] - transDecay[key] * dt * Math.max(trans[key], 0.25));
    const u = compMat.uniforms;
    u.uBloom.value = cur.bloom;
    brightMat.uniforms.uThreshold.value = cur.threshold;
    u.uExposure.value = cur.exposure;
    u.uContrast.value = cur.contrast;
    u.uSat.value = cur.sat;
    u.uTint.value.set(...cur.tint);
    u.uLift.value.set(...cur.lift);
    u.uVig.value = cur.vig;
    u.uVigColor.value.set(...cur.vigColor);
    u.uGrain.value = cur.grain;
    u.uAb.value = cur.ab + trans.ab;
    u.uScan.value = cur.scan;
    u.uWarp.value = cur.warp + trans.warp;
    u.uDesat.value = cur.desat;
    u.uFlash.value = trans.flash;
    u.uPulse.value = cur.pulse + trans.pulse;
    u.uTime.value = time;
  }

  function makeTargets() {
    for (const rt of [rtScene, rtA, rtB]) rt?.dispose();
    renderer.getDrawingBufferSize(size);
    const w = Math.max(1, size.x), h = Math.max(1, size.y);
    const isGL2 = renderer.capabilities.isWebGL2;
    rtScene = new THREE.WebGLRenderTarget(w, h, { samples: isGL2 && !low ? 4 : 0 });
    const bw = Math.max(1, Math.round(w / 4)), bh = Math.max(1, Math.round(h / 4));
    rtA = new THREE.WebGLRenderTarget(bw, bh);
    rtB = new THREE.WebGLRenderTarget(bw, bh);
    compMat.uniforms.uRes.value.set(w, h);
  }

  function init(r) {
    renderer = r;
    try {
      makeTargets();
      enabled = true;
    } catch (e) {
      console.warn('後製關閉：', e);
      enabled = false;
    }
  }

  function resize() {
    if (enabled) makeTargets();
  }

  // 效能不夠時：關掉多重取樣
  function setLow() {
    if (low || !enabled) return;
    low = true;
    makeTargets();
    console.info('畫面品質自動降低（關閉後製多重取樣）');
  }

  function render(scene, camera, dt) {
    time += dt;
    if (!enabled) {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      return;
    }
    step(dt);
    renderer.setRenderTarget(rtScene);
    renderer.clear();
    renderer.render(scene, camera);

    quad.material = brightMat;
    brightMat.uniforms.tDiffuse.value = rtScene.texture;
    renderer.setRenderTarget(rtA);
    renderer.render(quadScene, quadCam);

    quad.material = blurMat;
    for (let i = 0; i < 2; i++) {
      blurMat.uniforms.tDiffuse.value = rtA.texture;
      blurMat.uniforms.uDir.value.set((1 + i * 1.5) / rtA.width, 0);
      renderer.setRenderTarget(rtB);
      renderer.render(quadScene, quadCam);
      blurMat.uniforms.tDiffuse.value = rtB.texture;
      blurMat.uniforms.uDir.value.set(0, (1 + i * 1.5) / rtA.height);
      renderer.setRenderTarget(rtA);
      renderer.render(quadScene, quadCam);
    }

    quad.material = compMat;
    compMat.uniforms.tScene.value = rtScene.texture;
    compMat.uniforms.tBloom.value = rtA.texture;
    renderer.setRenderTarget(null);
    renderer.render(quadScene, quadCam);
  }

  return {
    init, resize, render, set, reset, kick, setLow,
    get enabled() { return enabled; },
    get low() { return low; },
    DEFAULT,
  };
})();
