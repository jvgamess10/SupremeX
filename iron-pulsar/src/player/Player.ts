import { MathUtils, PerspectiveCamera, Vector3, Box3 } from 'three';
import type { Input } from '../input/Input';
import { moveBody, overlaps } from '../physics/Collision';
/** Jogador em primeira pessoa: movimento, colisão, vida, agachar, pulo e câmera. */
export class Player {
  pos = new Vector3(); vel = new Vector3(); yaw = 0; pitch = 0;
  health = 100; readonly maxHealth = 100; alive = true;
  crouched = false; crouchAmt = 0; grounded = true; speed = 0; bob = 0;
  readonly radius = 0.35;
  constructor(public camera: PerspectiveCamera) { camera.rotation.order = 'YXZ'; }
  get height(): number { return this.crouched ? 1.1 : 1.8; }
  get eyeHeight(): number { return MathUtils.lerp(1.65, 1.0, this.crouchAmt); }
  eyePos(out = new Vector3()): Vector3 { return out.set(this.pos.x, this.pos.y + this.eyeHeight, this.pos.z); }
  reset(p: Vector3, yaw: number): void {
    this.pos.copy(p); this.vel.set(0, 0, 0); this.yaw = yaw; this.pitch = 0; this.health = this.maxHealth; this.alive = true; this.crouched = false; this.crouchAmt = 0; this.bob = 0;
  }
  damage(n: number): void { if (!this.alive) return; this.health = Math.max(0, this.health - n); if (this.health <= 0) this.alive = false; }
  heal(n: number): void { this.health = Math.min(this.maxHealth, this.health + n); }
  addRecoil(p: number, y: number): void { this.pitch = MathUtils.clamp(this.pitch + p, -1.5, 1.5); this.yaw += y; }
  update(dt: number, input: Input, boxes: Box3[], ads: number, sens: number): void {
    this.yaw -= input.lookDX * sens; this.pitch = MathUtils.clamp(this.pitch - input.lookDY * sens, -1.5, 1.5); input.lookDX = input.lookDY = 0;
    const jump = input.consume('jump');
    if (this.alive) {
      const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
      let wx = -s * input.moveY + c * input.moveX, wz = -c * input.moveY - s * input.moveX;
      const l = Math.hypot(wx, wz); if (l > 1) { wx /= l; wz /= l; }
      if (input.crouch) this.crouched = true; else if (this.crouched && !boxes.some(b => overlaps(b, this.pos, this.radius, 1.8))) this.crouched = false;
      const sprint = input.run && input.moveY > 0.3 && !this.crouched && ads < 0.1;
      const sp = (this.crouched ? 2.2 : sprint ? 6.5 : 4.2) * (1 - 0.4 * ads);
      const k = Math.min(1, dt * (this.grounded ? 10 : 2));
      this.vel.x += (wx * sp - this.vel.x) * k; this.vel.z += (wz * sp - this.vel.z) * k;
      if (jump && this.grounded && !this.crouched) this.vel.y = 6.5;
    } else { this.vel.x *= 0.9; this.vel.z *= 0.9; }
    this.vel.y -= 20 * dt;
    this.grounded = moveBody(this.pos, this.vel, dt, this.radius, this.height, boxes);
    this.speed = Math.hypot(this.vel.x, this.vel.z);
    this.crouchAmt += ((this.crouched ? 1 : 0) - this.crouchAmt) * Math.min(1, dt * 10);
    if (this.grounded && this.speed > 0.5) this.bob += dt * this.speed * 1.6;
    const bobY = this.grounded ? Math.sin(this.bob * 2) * 0.018 * Math.min(1, this.speed / 4) : 0;
    const dead = this.alive ? 0 : -0.9;
    this.camera.position.set(this.pos.x, this.pos.y + this.eyeHeight + bobY + dead, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, this.alive ? 0 : 0.6);
  }
}
