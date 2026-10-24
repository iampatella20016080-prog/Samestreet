// 軌道移動與跟隨鏡頭
window.SS = window.SS || {};

SS.Rail = class {
  constructor(path, person, camera, opts = {}) {
    this.path = path;
    this.person = person;
    this.camera = camera;
    this.length = path.getLength();
    this.u = opts.start ?? 0;
    this.speed = opts.speed ?? 4; // 公尺/秒
    this.slopeFactor = opts.slopeFactor ?? 1; // 上坡時速度倍率
    this.vel = 0;
    this.heading = new THREE.Vector3(0, 0, -1);
    this.camDist = opts.camDist ?? 6.2;
    this.camHeight = opts.camHeight ?? 3.4;
    this.onMove = opts.onMove || (() => {});
    this._camPos = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this.snap();
  }

  point(u = this.u) {
    return this.path.getPointAt(SS.util.clamp(u, 0, 1));
  }

  tangent(u = this.u) {
    return this.path.getTangentAt(SS.util.clamp(u, 0.0001, 0.9999));
  }

  update(dt) {
    const fwd = SS.input.down('ArrowRight', 'ArrowUp', 'KeyW', 'KeyD');
    const back = SS.input.down('ArrowLeft', 'ArrowDown', 'KeyS', 'KeyA');
    const dir = (fwd ? 1 : 0) - (back ? 1 : 0);

    const t = this.tangent();
    const climbing = t.y * dir > 0.08;
    const target = dir * this.speed * (climbing ? this.slopeFactor : 1);
    this.vel = SS.util.lerp(this.vel, target, SS.util.damp(10, dt));
    if (Math.abs(this.vel) < 0.01 && dir === 0) this.vel = 0;

    const prevU = this.u;
    this.u = SS.util.clamp(this.u + (this.vel * dt) / this.length, 0, 1);
    if (this.u === prevU) this.vel = 0;

    const p = this.point();
    this.person.root.position.copy(p);

    // 角色面向移動方向
    if (Math.abs(this.vel) > 0.05) {
      const h = new THREE.Vector3(t.x, 0, t.z).normalize().multiplyScalar(Math.sign(this.vel));
      this.heading.lerp(h, SS.util.damp(12, dt)).normalize();
    }
    const yaw = Math.atan2(this.heading.x, this.heading.z);
    this.person.root.rotation.y = yaw;

    const amount = SS.util.clamp(Math.abs(this.vel) / 4, 0, 1);
    this.person.animate(dt, amount, 6 + amount * 5);

    this.updateCamera(dt, false);
    if (this.u !== prevU) this.onMove(this.u, prevU);
  }

  // 鏡頭在角色行進方向的後上方，往前看一點
  updateCamera(dt, instant) {
    const p = this.person.root.position;
    const ahead = this.tangent(this.u + 0.015 * Math.sign(this.vel || 1));
    const look = new THREE.Vector3(ahead.x, 0, ahead.z).normalize();
    if (this.vel < -0.05) look.negate();
    const forward = this.heading.clone().lerp(look, 0.5).normalize();

    const desired = p.clone().addScaledVector(forward, -this.camDist);
    desired.y += this.camHeight + Math.max(0, -ahead.y * Math.sign(this.vel || 1)) * 2;
    const lookAt = p.clone().addScaledVector(forward, 2.5);
    lookAt.y += 1.3;

    if (instant) {
      this._camPos.copy(desired);
      this._look.copy(lookAt);
    } else {
      this._camPos.lerp(desired, SS.util.damp(3.2, dt));
      this._look.lerp(lookAt, SS.util.damp(5, dt));
    }
    this.camera.position.copy(this._camPos);
    this.camera.lookAt(this._look);
  }

  snap() {
    this.person.root.position.copy(this.point());
    const t = this.tangent();
    this.heading.set(t.x, 0, t.z).normalize();
    this.person.root.rotation.y = Math.atan2(this.heading.x, this.heading.z);
    this.updateCamera(0, true);
  }
};
