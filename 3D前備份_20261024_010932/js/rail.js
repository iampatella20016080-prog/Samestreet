// 鏡頭相對移動；沿可走路面決定高度與邊界。
window.SS = window.SS || {};

SS.Rail = class {
  constructor(path, person, camera, opts = {}) {
    this.path = path;
    this.person = person;
    this.camera = camera;
    this.u = opts.start ?? 0;
    this.speed = opts.speed ?? 6;
    this.onMove = opts.onMove || (() => {});
    this.locked = false;
    this.heading = new THREE.Vector3(0, 0, -1);
    this.velocity = new THREE.Vector3();
    this.camDist = opts.camDist ?? 6;
    this.camHeight = opts.camHeight ?? 3.5;
    this.pitch = 0.42;
    this.yaw = 0;
    this._camPos = new THREE.Vector3();
    this._look = new THREE.Vector3();
    // Projected path samples keep the character grounded on slopes and bridge stairs.
    this.samples = Array.from({ length: 501 }, (_, i) => ({ u: i / 500, p: path.getPointAt(i / 500) }));
    this.snap();
  }
  point(u = this.u) { return this.path.getPointAt(SS.util.clamp(u, 0, 1)); }
  tangent(u = this.u) { return this.path.getTangentAt(SS.util.clamp(u, .0001, .9999)); }
  nearest(x, z) {
    let best = null;
    for (let i = 0; i < this.samples.length - 1; i++) {
      const a = this.samples[i], b = this.samples[i + 1];
      const dx = b.p.x-a.p.x, dz = b.p.z-a.p.z;
      const length2 = dx*dx+dz*dz;
      if (length2 < .000001) continue;
      const t = SS.util.clamp(((x-a.p.x)*dx+(z-a.p.z)*dz)/length2, 0, 1);
      const px = a.p.x+dx*t, pz = a.p.z+dz*t;
      const distance2 = (x-px)**2+(z-pz)**2;
      if (!best || distance2 < best.distance2) best = {
        u: a.u+(b.u-a.u)*t, x:px, z:pz,
        y:a.p.y+(b.p.y-a.p.y)*t, distance2,
      };
    }
    return best;
  }
  update(dt) {
    const input = SS.input;
    const lx = input.lookDelta.x, ly = input.lookDelta.y;
    input.lookDelta.x = input.lookDelta.y = 0;
    this.yaw -= lx * .004;
    this.pitch = SS.util.clamp(this.pitch + ly * .003, .12, 1.08);
    this.camDist = SS.util.clamp(this.camDist + input.zoomDelta * .012, 3.2, 10);
    input.zoomDelta = 0;

    // locked：對話中或段落腳本控制時，不能走
    const x = this.locked ? 0 : (input.down('KeyD','ArrowRight') ? 1 : 0) - (input.down('KeyA','ArrowLeft') ? 1 : 0) + input.stick.x;
    const z = this.locked ? 0 : (input.down('KeyW','ArrowUp') ? 1 : 0) - (input.down('KeyS','ArrowDown') ? 1 : 0) + input.stick.y;
    const local = new THREE.Vector2(x,z);
    if (local.length() > 1) local.normalize();
    const forward = new THREE.Vector3(Math.sin(this.yaw),0,Math.cos(this.yaw));
    const right = new THREE.Vector3(-forward.z,0,forward.x);
    const wish = forward.multiplyScalar(local.y).addScaledVector(right,local.x);
    const fast = input.down('ShiftLeft','ShiftRight') || input.stick.run;
    const target = wish.multiplyScalar(this.speed * (fast ? 1.55 : 1));
    this.velocity.lerp(target, SS.util.damp(12,dt));
    if (local.lengthSq() === 0 && this.velocity.lengthSq() < .0001) this.velocity.set(0,0,0);

    const p = this.person.root.position;
    const nx = p.x + this.velocity.x*dt, nz = p.z + this.velocity.z*dt;
    let near = this.nearest(nx,nz);
    const width = near.u > .87 ? 7.5 : near.u > .58 && near.u < .83 ? 1.35 : SS.world.street.laneHalf - .55;
    const distance = Math.sqrt(near.distance2);
    const ratio = distance > width ? width/distance : 1;
    p.x = near.x + (nx-near.x)*ratio;
    p.z = near.z + (nz-near.z)*ratio;
    near = this.nearest(p.x,p.z);
    p.y = near.y;
    const previousU = this.u;
    this.u = near.u;
    const moving = this.velocity.length() > .05;
    if (moving) {
      this.heading.lerp(this.velocity.clone().setY(0).normalize(), SS.util.damp(14,dt)).normalize();
      this.person.root.rotation.y = Math.atan2(this.heading.x,this.heading.z);
    }
    const amount = SS.util.clamp(this.velocity.length()/this.speed,0,1);
    this.person.animate(dt,amount,6+amount*(fast?11:7));
    this.updateCamera(dt,false);
    if (this.u !== previousU) this.onMove(this.u,previousU);
  }
  updateCamera(dt, instant) {
    const p = this.person.root.position;
    const outward = new THREE.Vector3(Math.sin(this.yaw),0,Math.cos(this.yaw));
    const bridgeLift = Math.max(0,1-Math.abs(p.z+67.5)/14)*1.2;
    const desired = p.clone().addScaledVector(outward,-this.camDist*Math.cos(this.pitch));
    desired.y += 1.35 + this.camDist*Math.sin(this.pitch)+bridgeLift;
    const lookAt = p.clone().add(new THREE.Vector3(0,1.1,0));
    if (instant) { this._camPos.copy(desired); this._look.copy(lookAt); }
    else {
      this._camPos.lerp(desired,SS.util.damp(6,dt));
      this._look.lerp(lookAt,SS.util.damp(9,dt));
    }
    this.camera.position.copy(this._camPos);
    this.camera.lookAt(this._look);
  }
  snap() {
    this.person.root.position.copy(this.point());
    const t = this.tangent();
    this.heading.set(t.x,0,t.z).normalize();
    this.person.root.rotation.y = Math.atan2(this.heading.x,this.heading.z);
    this.yaw = Math.atan2(this.heading.x,this.heading.z);
    this.velocity.set(0,0,0);
    this.updateCamera(0,true);
  }
};
