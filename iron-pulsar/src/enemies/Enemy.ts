import { Box3, BoxGeometry, CylinderGeometry, Group, MathUtils, Mesh, MeshStandardMaterial, SphereGeometry, Vector3 } from 'three';
import type { Player } from '../player/Player';
import type { NavGraph } from '../physics/Nav';
import type { Particles } from '../rendering/Particles';
import type { AudioManager } from '../audio/AudioManager';
import { moveBody, segmentBlocked } from '../physics/Collision';
/** O que o inimigo precisa do jogo. Implementado por Game. */
export interface EnemyContext { player: Player; solids: Box3[]; nav: NavGraph; particles: Particles; audio: AudioManager; hurtPlayer(n: number, from: Vector3): void }
type State = 'patrol' | 'alert' | 'attack' | 'chase' | 'dead';
let mats: Record<string, MeshStandardMaterial> | null = null;
function getMats() {
  return mats ??= {
    legs: new MeshStandardMaterial({ color: 0x2a3028, roughness: 0.88, metalness: 0.05 }),
    torso: new MeshStandardMaterial({ color: 0x3d4f3e, roughness: 0.78, metalness: 0.08 }),
    vest: new MeshStandardMaterial({ color: 0x2a3228, roughness: 0.65, metalness: 0.2 }),
    head: new MeshStandardMaterial({ color: 0xc49a78, roughness: 0.68, metalness: 0.05 }),
    helmet: new MeshStandardMaterial({ color: 0x1e2420, roughness: 0.45, metalness: 0.55 }),
    gear: new MeshStandardMaterial({ color: 0x1a1e1c, roughness: 0.48, metalness: 0.6 }),
    boots: new MeshStandardMaterial({ color: 0x1a1814, roughness: 0.85, metalness: 0.1 }),
  };
}
/** Inimigo militar detalhado. Hitboxes: cabeça x2.5, tronco x1, pernas x0.7. */
export class Enemy {
  pos = new Vector3(); vel = new Vector3(); yaw = 0; health = 100; alive = true; state: State = 'patrol';
  group = new Group(); hitboxes: Mesh[] = [];
  private wp: Vector3[]; private wpIdx = 0; private wait = 0; private lastSeen = new Vector3(); private path: Vector3[] = [];
  private pathT = 0; private reaction = 0; private fireCd = 1; private senseT = Math.random() * 0.2; private sees = false; private lostT = 0; private searchT = 0; private deathT = 0; private t = Math.random() * 10; private hurtT = 0;
  private eye = new Vector3(); private tmp = new Vector3(); private phase = Math.random() * 6;
  private _lLegU!: Mesh; private _rLegU!: Mesh; private _torso!: Mesh; private _lArmU!: Mesh; private _rArmU!: Mesh; private _head!: Mesh;
  constructor(spawn: Vector3, patrol: Vector3[], yaw?: number) {
    this.pos.copy(spawn); this.wp = patrol.length ? patrol : [spawn.clone()]; this.yaw = yaw ?? Math.random() * 6.28;
    const m = getMats();
    const part = (w: number, h: number, d: number, mat: MeshStandardMaterial, y: number, mult: number, hit = true, x = 0, z = 0): Mesh => {
      const o = new Mesh(new BoxGeometry(w, h, d), mat);
      o.position.set(x, y, z);
      o.castShadow = true;
      this.group.add(o);
      if (hit) { o.userData = { enemy: this, mult }; this.hitboxes.push(o); }
      return o;
    };
    // --- Legs + boots (articulados) ---
    const lLegU = part(0.2, 0.42, 0.22, m.legs, 0.74, 0.7, true, -0.13, 0);
    const rLegU = part(0.2, 0.42, 0.22, m.legs, 0.74, 0.7, true, 0.13, 0);
    part(0.24, 0.14, 0.28, m.boots, 0.12, 0.7, false, -0.13, 0.03);
    part(0.24, 0.14, 0.28, m.boots, 0.12, 0.7, false, 0.13, 0.03);
    // --- Torso + colete ---
    const torso = part(0.46, 0.56, 0.3, m.torso, 1.12, 1);
    part(0.5, 0.44, 0.2, m.vest, 1.18, 1, false);
    // --- Ombros e braços (articulados) ---
    const lArmU = part(0.15, 0.42, 0.16, m.torso, 1.18, 1, false, -0.31, 0);
    const rArmU = part(0.15, 0.42, 0.16, m.torso, 1.18, 1, false, 0.31, 0);
    part(0.15, 0.36, 0.14, m.torso, 0.92, 1, false, -0.31, 0);
    part(0.15, 0.36, 0.14, m.torso, 0.92, 1, false, 0.31, 0);
    part(0.14, 0.12, 0.14, m.gear, 0.72, 1, false, -0.34, 0); // luvas
    part(0.14, 0.12, 0.14, m.gear, 0.72, 1, false, 0.34, 0);
    // --- Cabeça + pescoço + capacete ---
    part(0.1, 0.18, 0.1, m.head, 1.46, 2.5, false); // pescoço
    const head = part(0.24, 0.24, 0.24, m.head, 1.62, 2.5);
    part(0.28, 0.16, 0.28, m.helmet, 1.74, 2.5, false);
    part(0.26, 0.08, 0.26, m.helmet, 1.84, 2.5, false, 0, 0.02); // aba
    // --- Mochila e equipamento ---
    part(0.4, 0.4, 0.18, m.gear, 1.2, 1, false, 0, 0.22);
    part(0.14, 0.12, 0.09, m.gear, 1.06, 1, false, -0.22, -0.14); // bolsos
    part(0.14, 0.12, 0.09, m.gear, 1.06, 1, false, 0.22, -0.14);
    part(0.1, 0.16, 0.08, m.gear, 1.28, 1, false, -0.18, -0.18);
    part(0.1, 0.16, 0.08, m.gear, 1.28, 1, false, 0.18, -0.18);
    // --- Rifle posicionado ---
    const gun = part(0.065, 0.07, 0.5, m.gear, 1.24, 1, false, 0.3, -0.28);
    gun.rotation.x = -0.12;
    // Referências para animação
    (this as any)._lLegU = lLegU; (this as any)._rLegU = rLegU; (this as any)._torso = torso;
    (this as any)._lArmU = lArmU; (this as any)._rArmU = rArmU; (this as any)._head = head; (this as any)._gun = gun;
    this.group.position.copy(this.pos);
  }
  private face(dx: number, dz: number, dt: number, rate: number): void {
    if (Math.abs(dx) + Math.abs(dz) < 1e-4) return; const want = Math.atan2(-dx, -dz);
    const diff = MathUtils.euclideanModulo(want - this.yaw + Math.PI, Math.PI * 2) - Math.PI; this.yaw += diff * Math.min(1, dt * rate);
  }
  private look(c: EnemyContext): boolean {
    const p = c.player; this.eye.set(this.pos.x, this.pos.y + 1.6, this.pos.z); const pe = p.eyePos(this.tmp);
    const d = this.eye.distanceTo(pe); if (d > 35) return false;
    const dx = pe.x - this.eye.x, dz = pe.z - this.eye.z, hl = Math.hypot(dx, dz) || 1;
    const dot = (-Math.sin(this.yaw) * dx - Math.cos(this.yaw) * dz) / hl;
    if (this.state === 'patrol' && dot < 0.35) return false; if (this.state !== 'patrol' && dot < -0.2 && d > 8) return false;
    return !segmentBlocked(this.eye, pe, c.solids);
  }
  hear(p: Vector3, radius: number): void {
    if (!this.alive || this.state !== 'patrol') return; if (this.pos.distanceTo(p) < radius) { this.lastSeen.copy(p); this.state = 'chase'; this.path = []; this.pathT = 0; }
  }
  /** Retorna true se morreu. */
  damage(n: number, c: EnemyContext): boolean {
    if (!this.alive) return false; this.health -= n;
    if (this.health <= 0) { this.alive = false; this.state = 'dead'; return true; }
    if (this.state === 'patrol') { this.lastSeen.copy(c.player.pos); this.state = 'chase'; this.path = []; this.pathT = 0; }
    this.hurtT = 0.25;
    return false;
  }
  private shoot(c: EnemyContext, dist: number): void {
    const mz = this.tmp.set(this.pos.x - Math.sin(this.yaw) * 0.7, this.pos.y + 1.3, this.pos.z - Math.cos(this.yaw) * 0.7);
    c.particles.emit(mz, null, 4, 0xffcc66, 2, 0.07, 0, 0.3); c.audio.play('enemy_shot', 1 / (1 + dist * 0.12));
    const p = MathUtils.clamp(0.85 - dist * 0.03, 0.12, 0.75) * (c.player.crouched ? 0.8 : 1) * (c.player.speed > 2 ? 0.8 : 1);
    if (Math.random() < p) c.hurtPlayer(8, this.pos);
  }
  update(dt: number, c: EnemyContext): void {
    if (!this.alive) { this.deathT += dt; this.group.rotation.x = -Math.min(this.deathT * 3, 1.5); return; }
    this.fireCd -= dt; this.senseT -= dt; this.t += dt; const p = c.player;
    if (this.senseT <= 0) { this.senseT = 0.15 + Math.random() * 0.1; this.sees = p.alive && this.look(c); }
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, dist = Math.hypot(dx, dz);
    if (this.sees) { this.lastSeen.copy(p.pos); this.lostT = 0; if (this.state === 'patrol' || this.state === 'chase') { this.state = 'alert'; this.reaction = 0.35 + Math.random() * 0.3; } } else this.lostT += dt;
    if (!p.alive && this.state !== 'patrol') { this.state = 'patrol'; }
    let mx = 0, mz = 0, speed = 0, faceMove = true;
    switch (this.state) {
      case 'patrol': {
        const w = this.wp[this.wpIdx];
        if (this.wait > 0) this.wait -= dt;
        else { const d = Math.hypot(w.x - this.pos.x, w.z - this.pos.z); if (d < 0.5) { this.wpIdx = (this.wpIdx + 1) % this.wp.length; this.wait = 1 + Math.random() * 2; } else { mx = (w.x - this.pos.x) / d; mz = (w.z - this.pos.z) / d; speed = 1.7; } }
        break;
      }
      case 'alert': faceMove = false; this.face(dx, dz, dt, 8); this.reaction -= dt; if (this.reaction <= 0) this.state = this.sees ? 'attack' : 'chase'; break;
      case 'attack': {
        faceMove = false;
        if (!this.sees) { if (this.lostT > 0.8) this.state = 'chase'; break; }
        this.face(dx, dz, dt, 10); const n = dist || 1;
        if (dist > 16) { mx = dx / n; mz = dz / n; speed = 3.2; } else if (dist < 5) { mx = -dx / n; mz = -dz / n; speed = 2; }
        else { const s = Math.sin(this.t * 0.8 + this.phase); mx = -dz / n * s; mz = dx / n * s; speed = 1.4; }
        if (this.fireCd <= 0 && dist < 30) { this.fireCd = 0.45 + Math.random() * 0.5; this.shoot(c, dist); }
        break;
      }
      case 'chase': {
        const dl = Math.hypot(this.lastSeen.x - this.pos.x, this.lastSeen.z - this.pos.z);
        if (dl < 1.2) { this.searchT += dt; if (this.searchT > 3) { this.searchT = 0; this.state = 'patrol'; } break; }
        this.pathT -= dt; if (this.pathT <= 0 || !this.path.length) { this.path = c.nav.findPath(this.pos, this.lastSeen); this.pathT = 1; }
        const n = this.path[0]; const d = Math.hypot(n.x - this.pos.x, n.z - this.pos.z);
        if (d < 0.7) this.path.shift(); else { mx = (n.x - this.pos.x) / d; mz = (n.z - this.pos.z) / d; speed = 4.2; }
        break;
      }
    }
    this.vel.x += (mx * speed - this.vel.x) * Math.min(1, dt * 10); this.vel.z += (mz * speed - this.vel.z) * Math.min(1, dt * 10); this.vel.y -= 20 * dt;
    moveBody(this.pos, this.vel, dt, 0.35, 1.8, c.solids);
    if (faceMove && speed > 0) this.face(mx, mz, dt, 6);
    // Giro do tronco em direção ao alvo quando alerta/ataque
    if (this.state === 'alert' || this.state === 'attack') {
      const want = Math.atan2(-dx, -dz); const diff = MathUtils.euclideanModulo(want - this.yaw + Math.PI, Math.PI * 2) - Math.PI;
      this._torso.rotation.z = MathUtils.lerp(this._torso.rotation.z, -diff * 0.6, Math.min(1, dt * 6));
    } else { this._torso.rotation.z = MathUtils.lerp(this._torso.rotation.z, 0, Math.min(1, dt * 4)); }
    // Animação de pernas e braços ao andar
    if (speed > 0.1) {
      this.t += dt * 14; const swing = Math.abs(Math.sin(this.t));
      this._lLegU.rotation.x = Math.sin(this.t) * 0.35; this._rLegU.rotation.x = -Math.sin(this.t) * 0.35;
      this._lArmU.rotation.x = -Math.sin(this.t) * 0.35; this._rArmU.rotation.x = Math.sin(this.t) * 0.35;
    } else {
      this._lLegU.rotation.x = MathUtils.lerp(this._lLegU.rotation.x, 0, Math.min(1, dt * 6));
      this._rLegU.rotation.x = MathUtils.lerp(this._rLegU.rotation.x, 0, Math.min(1, dt * 6));
      this._lArmU.rotation.x = MathUtils.lerp(this._lArmU.rotation.x, 0, Math.min(1, dt * 6));
      this._rArmU.rotation.x = MathUtils.lerp(this._rArmU.rotation.x, 0, Math.min(1, dt * 6));
    }
    // Reação ao dano (flinch)
    if (this.hurtT > 0) { this.hurtT -= dt; this._torso.rotation.x = Math.sin(this.hurtT * 40) * 0.15; }
    else { this._torso.rotation.x = MathUtils.lerp(this._torso.rotation.x, 0, Math.min(1, dt * 6)); }
    // Cabeça segue o jogador levemente
    if (this.sees && this.state !== 'dead') {
      const hy = Math.atan2(-dx, -dz); const hd = MathUtils.euclideanModulo(hy - this.yaw + Math.PI, Math.PI * 2) - Math.PI;
      this._head.rotation.y = MathUtils.lerp(this._head.rotation.y, MathUtils.clamp(hd, -0.6, 0.6), Math.min(1, dt * 5));
    } else { this._head.rotation.y = MathUtils.lerp(this._head.rotation.y, 0, Math.min(1, dt * 4)); }
    const bob = speed > 0 ? Math.abs(Math.sin(this.t * 8)) * 0.03 : 0;
    this.group.position.set(this.pos.x, this.pos.y + bob, this.pos.z); this.group.rotation.y = this.yaw; this.group.updateMatrixWorld(true);
  }
}
