import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, MathUtils, Mesh, MeshStandardMaterial, Object3D, PerspectiveCamera, PointLight, Vector3 } from 'three';
import type { Input } from '../input/Input';
import type { Player } from '../player/Player';
import type { AudioManager, Sfx } from '../audio/AudioManager';
import type { Particles } from '../rendering/Particles';

export interface WeaponDef {
  id: 'ak47' | 'locus' | 'pulsar'; name: string; auto: boolean; burst: number; burstCooldown: number; rpm: number;
  damage: number; headMul: number; mag: number; reserve: number; reloadTime: number;
  recoilPitch: number; recoilYaw: number; spread: number; adsSpreadMul: number; adsFov: number; range: number;
  scope: boolean; flashColor: number; sound: Sfx; noise: number;
}
/** Dados das armas. Para ajustar balanceamento, edite só aqui. */
export const WEAPONS: WeaponDef[] = [
  { id: 'ak47', name: 'AK-47', auto: true, burst: 0, burstCooldown: 0, rpm: 600, damage: 26, headMul: 2.2, mag: 30, reserve: 120, reloadTime: 2.4, recoilPitch: 0.012, recoilYaw: 0.004, spread: 0.012, adsSpreadMul: 0.4, adsFov: 55, range: 120, scope: false, flashColor: 0xffaa55, sound: 'shot_ak', noise: 35 },
  { id: 'locus', name: 'LOCUS', auto: false, burst: 0, burstCooldown: 0, rpm: 60, damage: 95, headMul: 3, mag: 5, reserve: 30, reloadTime: 3.2, recoilPitch: 0.035, recoilYaw: 0.005, spread: 0.03, adsSpreadMul: 0.02, adsFov: 18, range: 300, scope: true, flashColor: 0xffddaa, sound: 'shot_sniper', noise: 55 },
  { id: 'pulsar', name: 'PULSAR-X', auto: false, burst: 3, burstCooldown: 0.35, rpm: 900, damage: 20, headMul: 2, mag: 36, reserve: 144, reloadTime: 2.0, recoilPitch: 0.006, recoilYaw: 0.002, spread: 0.008, adsSpreadMul: 0.5, adsFov: 60, range: 150, scope: false, flashColor: 0x33e6ff, sound: 'shot_pulsar', noise: 25 },
];
/** O que a arma precisa do jogo. Implementado por Game. */
export interface WeaponHost {
  camera: PerspectiveCamera; player: Player; audio: AudioManager; particles: Particles;
  fireHit(origin: Vector3, dir: Vector3, range: number, damage: number, headMul: number, color: number): void;
  alertNoise(p: Vector3, r: number): void;
}
const metal = new MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.38, metalness: 0.88 });
const metalDark = new MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.45, metalness: 0.9 });
const metalBright = new MeshStandardMaterial({ color: 0x6e767d, roughness: 0.3, metalness: 0.9 });
const wood = new MeshStandardMaterial({ color: 0x5c3a22, roughness: 0.72, metalness: 0.05 });
const woodDark = new MeshStandardMaterial({ color: 0x3d2a18, roughness: 0.8, metalness: 0.05 });
const polymer = new MeshStandardMaterial({ color: 0x2c3034, roughness: 0.55, metalness: 0.25 });
const polymerDark = new MeshStandardMaterial({ color: 0x1e2226, roughness: 0.6, metalness: 0.2 });
const glow = new MeshStandardMaterial({ color: 0x0a2030, roughness: 0.25, metalness: 0.7, emissive: 0x00c8ff, emissiveIntensity: 1.8 });
const glowCore = new MeshStandardMaterial({ color: 0x113344, roughness: 0.2, metalness: 0.6, emissive: 0x33e6ff, emissiveIntensity: 2.2 });
const white = new MeshStandardMaterial({ color: 0xd8e0e6, roughness: 0.32, metalness: 0.55 });
const brass = new MeshStandardMaterial({ color: 0xb08a4a, roughness: 0.35, metalness: 0.85 });
const glass = new MeshStandardMaterial({ color: 0x88aacc, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.45 });
const leather = new MeshStandardMaterial({ color: 0x2b1a12, roughness: 0.9, metalness: 0.05 });
const flashMat = new MeshStandardMaterial({ color: 0xffffff, roughness: 0, metalness: 0, emissive: 0xffffff, emissiveIntensity: 4 });
const box = (w: number, h: number, d: number, m: MeshStandardMaterial, x: number, y: number, z: number) => {
  const o = new Mesh(new BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; return o;
};
const cyl = (r: number, l: number, m: MeshStandardMaterial, x: number, y: number, z: number, segs = 12, rx = Math.PI / 2) => {
  const o = new Mesh(new CylinderGeometry(r, r, l, segs)); o.rotation.x = rx; o.position.set(x, y, z); o.material = m; o.castShadow = true; return o;
};
/** Modelos detalhados de viewmodel. Origem = empunhadura, -Z = frente. Substituíveis por GLB via setModel. */
function makeModel(id: string): Group {
  const g = new Group(); g.name = 'vm_' + id;
  if (id === 'ak47') {
    // Receiver / lower
    g.add(box(0.055, 0.09, 0.4, metal, 0, 0.0, -0.06));
    // Dust cover (top)
    g.add(box(0.052, 0.045, 0.3, metalDark, 0, 0.062, -0.13));
    // Rear sight base
    g.add(box(0.04, 0.02, 0.04, metalDark, 0, 0.075, 0.04));
    g.add(box(0.03, 0.012, 0.03, metalDark, 0, 0.087, 0.04));
    // Barrel + gas block
    g.add(cyl(0.014, 0.44, metal, 0, 0.02, -0.5));
    g.add(box(0.034, 0.05, 0.05, metalDark, 0, 0.048, -0.7));
    // Gas tube
    g.add(cyl(0.009, 0.26, metalDark, 0, 0.062, -0.36));
    // Handguard (wood, two halves)
    g.add(box(0.06, 0.055, 0.11, wood, 0, -0.005, -0.26));
    g.add(box(0.06, 0.055, 0.11, wood, 0, -0.005, -0.39));
    // Front sight post
    g.add(box(0.014, 0.03, 0.014, metalDark, 0, 0.058, -0.74));
    // Muzzle / slant brake
    const mb = new Mesh(new CylinderGeometry(0.017, 0.017, 0.05, 8)); mb.rotation.x = Math.PI / 2; mb.position.set(0, 0.02, -0.75); mb.material = metalDark; mb.castShadow = true; g.add(mb);
    g.add(box(0.028, 0.028, 0.05, metalDark, 0, 0.02, -0.78));
    // Curved magazine
    const mag = new Group();
    const magBody = new Mesh(new CylinderGeometry(0.034, 0.034, 0.18, 10), metalDark);
    magBody.rotation.x = 0.22; magBody.position.set(0, -0.13, -0.06); magBody.castShadow = true; mag.add(magBody);
    const magLip = new Mesh(new BoxGeometry(0.042, 0.03, 0.02), metalDark);
    magLip.position.set(0, -0.225, 0.0); magLip.rotation.x = 0.22; magLip.castShadow = true; mag.add(magLip);
    g.add(mag);
    // Pistol grip + trigger guard
    g.add(box(0.038, 0.12, 0.06, polymer, 0, -0.1, 0.14));
    g.add(box(0.028, 0.05, 0.05, polymerDark, 0, -0.18, 0.1));
    // Stock (wood)
    g.add(box(0.045, 0.07, 0.22, wood, 0, 0.0, 0.32));
    g.add(box(0.05, 0.09, 0.04, wood, 0, 0.01, 0.42));
    // Selector / pivot
    g.add(box(0.014, 0.02, 0.02, metalDark, 0.03, 0.04, 0.05));
  } else if (id === 'locus') {
    // Long receiver
    g.add(box(0.048, 0.07, 0.55, metal, 0, 0.01, -0.05));
    // Barrel long
    g.add(cyl(0.011, 0.75, metal, 0, 0.015, -0.7));
    // Muzzle brake
    g.add(box(0.028, 0.028, 0.06, metalDark, 0, 0.015, -1.08));
    // Scope body
    g.add(cyl(0.028, 0.32, metalDark, 0, 0.095, -0.15, 14));
    // Scope lenses
    g.add(cyl(0.024, 0.02, glass, 0, 0.095, -0.31, 12));
    g.add(cyl(0.022, 0.015, glass, 0, 0.095, 0.01, 12));
    // Scope mounts
    g.add(box(0.04, 0.02, 0.04, metal, 0, 0.065, -0.25));
    g.add(box(0.04, 0.02, 0.04, metal, 0, 0.065, -0.05));
    // Stock + cheek rest
    g.add(box(0.045, 0.08, 0.28, polymer, 0, -0.01, 0.38));
    g.add(box(0.05, 0.1, 0.04, polymer, 0, 0.01, 0.5));
    g.add(box(0.03, 0.03, 0.12, polymerDark, 0, 0.045, 0.42));
    // Bolt handle
    g.add(box(0.012, 0.02, 0.05, metalDark, 0.03, 0.025, 0.0));
    g.add(cyl(0.008, 0.06, metalDark, 0.042, 0.025, 0.0, 6, 0));
    // Mag / bolt area
    g.add(box(0.035, 0.08, 0.05, metalDark, 0, -0.07, 0.05));
    // Scope adjustment turrets
    g.add(cyl(0.016, 0.018, metalDark, 0, 0.11, -0.06, 8));
    g.add(cyl(0.014, 0.014, metalDark, 0, 0.085, -0.15, 8));
    // Bipod legs
    g.add(box(0.01, 0.07, 0.01, metal, -0.022, -0.045, -0.6));
    g.add(box(0.01, 0.07, 0.01, metal, 0.022, -0.045, -0.6));
    g.add(box(0.12, 0.01, 0.02, metal, 0, -0.05, -0.62));
  } else {
    // PULSAR-X futuristic
    // Main body
    g.add(box(0.065, 0.09, 0.42, white, 0, 0.01, -0.08));
    // Upper rail glow strip
    g.add(box(0.068, 0.012, 0.36, glow, 0, 0.06, -0.1));
    // Side panels layered
    g.add(box(0.012, 0.065, 0.32, glowCore, -0.042, 0.01, -0.1));
    g.add(box(0.012, 0.065, 0.32, glowCore, 0.042, 0.01, -0.1));
    g.add(box(0.008, 0.04, 0.2, metalDark, -0.04, 0.038, -0.15));
    g.add(box(0.008, 0.04, 0.2, metalDark, 0.04, 0.038, -0.15));
    // Energy core barrel + containment rings
    g.add(cyl(0.024, 0.3, glow, 0, 0.01, -0.48, 12));
    g.add(box(0.04, 0.04, 0.02, glowCore, 0, 0.038, -0.34));
    g.add(box(0.04, 0.04, 0.02, glowCore, 0, 0.038, -0.52));
    g.add(box(0.04, 0.04, 0.02, glowCore, 0, 0.038, -0.7));
    g.add(cyl(0.018, 0.14, glowCore, 0, 0.01, -0.68, 12));
    // Emitter tip + focusing lens
    g.add(cyl(0.026, 0.045, white, 0, 0.01, -0.8, 10));
    g.add(cyl(0.022, 0.012, glass, 0, 0.01, -0.83, 10));
    // Grip + trigger
    g.add(box(0.042, 0.13, 0.065, polymer, 0, -0.11, 0.09));
    g.add(box(0.014, 0.025, 0.04, metalDark, 0.025, -0.05, 0.1));
    // Stock / battery pack
    g.add(box(0.07, 0.07, 0.14, white, 0, 0.0, 0.28));
    g.add(box(0.05, 0.04, 0.08, glow, 0, 0.04, 0.28));
    g.add(box(0.05, 0.02, 0.06, metalDark, 0, 0.065, 0.28));
    // Front vents / intakes
    for (let i = 0; i < 4; i++) {
      g.add(box(0.08, 0.008, 0.02, metalDark, 0, -0.032 + i * 0.018, -0.36));
    }
    // Capacitor bank rear
    for (let i = 0; i < 2; i++) {
      g.add(cyl(0.018, 0.09, glowCore, 0.022 * (i ? 1 : -1), 0.05, 0.36 + i * 0.04, 8));
    }
  }
  return g;
}
export class WeaponSystem {
  idx = 0; ads = 0; scoped = false;
  readonly vm = new Group();
  private states = WEAPONS.map(w => ({ mag: w.mag, reserve: w.reserve }));
  private models = new Map<string, Object3D>();
  private cool = 0; private reload = 0; private switchT = 0; private burstLeft = 0; private burstT = 0; private prevFire = false;
  private kick = 0; private heat = 0; private flash: PointLight; private flashMesh: Mesh; private flashT = 0; private swayT = 0;
  private tmpO = new Vector3(); private tmpD = new Vector3();
  constructor(private cam: PerspectiveCamera) {
    cam.add(this.vm);
    for (const w of WEAPONS) { const m = makeModel(w.id); this.models.set(w.id, m); this.vm.add(m); }
    this.flash = new PointLight(0xffaa55, 0, 8, 2); this.flash.position.set(0.2, -0.1, -0.9); cam.add(this.flash);
    this.flashMesh = new Mesh(new ConeGeometry(0.02, 0.18, 8), flashMat);
    this.flashMesh.position.set(0.18, -0.1, -0.92); this.flashMesh.rotation.x = Math.PI / 2;
    this.flashMesh.visible = false; cam.add(this.flashMesh);
    this.showCurrent();
  }
  get def(): WeaponDef { return WEAPONS[this.idx]; }
  get ammo() { return this.states[this.idx]; }
  get reloading(): boolean { return this.reload > 0; }
  /** Troca o modelo provisório por um GLB real. */
  setModel(id: string, obj: Object3D): void {
    const old = this.models.get(id); if (old) this.vm.remove(old);
    obj.name = 'vm_' + id; this.models.set(id, obj); this.vm.add(obj); this.showCurrent();
  }
  reset(): void {
    this.states = WEAPONS.map(w => ({ mag: w.mag, reserve: w.reserve })); this.idx = 0; this.cool = this.reload = this.switchT = this.burstLeft = 0; this.ads = 0; this.showCurrent();
  }
  addAmmo(): void { this.states.forEach((s, i) => { s.reserve += WEAPONS[i].mag; }); }
  private showCurrent(): void { this.models.forEach((m, id) => { m.visible = id === this.def.id; }); }
  private select(i: number): void {
    if (i === this.idx || this.switchT > 0) return; this.idx = i; this.reload = 0; this.burstLeft = 0; this.switchT = 0.4; this.cool = 0.2; this.showCurrent();
  }
  private startReload(h: WeaponHost): void {
    const s = this.ammo; if (this.reload > 0 || s.mag >= this.def.mag || s.reserve <= 0) return;
    this.reload = this.def.reloadTime; this.burstLeft = 0; h.audio.play('reload');
  }
  update(dt: number, input: Input, h: WeaponHost): void {
    const d = this.def, s = this.ammo, p = h.player;
    for (let i = 0; i < 3; i++) if (input.consume(('slot' + i) as 'slot0')) this.select(i);
    if (input.consume('swap')) this.select((this.idx + 1) % WEAPONS.length);
    if (input.consume('reload')) this.startReload(h);
    this.cool -= dt; this.switchT = Math.max(0, this.switchT - dt); this.heat = Math.max(0, this.heat - 6 * dt);
    if (this.reload > 0) { this.reload -= dt; if (this.reload <= 0) { const t = Math.min(d.mag - s.mag, s.reserve); s.mag += t; s.reserve -= t; } }
    const want = input.fire && p.alive, just = want && !this.prevFire; this.prevFire = want;
    const can = this.reload <= 0 && this.switchT <= 0 && this.cool <= 0 && p.alive;
    if (d.burst > 0) {
      if (this.burstLeft > 0) {
        this.burstT -= dt;
        if (this.burstT <= 0) { if (s.mag > 0) { this.shoot(h); this.burstLeft--; this.burstT = 60 / d.rpm; if (this.burstLeft === 0) this.cool = d.burstCooldown; } else this.burstLeft = 0; }
      } else if (just && can) { if (s.mag > 0) { this.burstLeft = d.burst; this.burstT = 0; } else { h.audio.play('empty'); this.startReload(h); } }
    } else if (can && (d.auto ? want : just)) {
      if (s.mag > 0) { this.shoot(h); this.cool = 60 / d.rpm; } else { h.audio.play('empty'); this.cool = 0.25; this.startReload(h); }
    }
    const target = input.ads && this.reload <= 0 && this.switchT <= 0 && p.alive ? 1 : 0;
    this.ads += (target - this.ads) * Math.min(1, dt * 12);
    this.scoped = d.scope && this.ads > 0.85;
    this.animate(dt, p);
  }
  private animate(dt: number, p: Player): void {
    const d = this.def, vm = this.vm, a = this.ads;
    this.kick = Math.max(0, this.kick - dt * 10);
    this.swayT += dt * (p.speed > 0.5 ? 8 : 3);
    const idleSway = Math.sin(this.swayT) * 0.004 * (1 - a) * (p.speed > 0.5 ? 1.5 : 1);
    const moveSwayX = Math.sin(p.bob * 2) * 0.005 * (1 - a);
    const moveSwayY = Math.abs(Math.cos(p.bob * 2)) * 0.003 * (1 - a);
    const baseX = MathUtils.lerp(0.2, 0, a);
    const baseY = MathUtils.lerp(-0.21, -0.13, a);
    const baseZ = MathUtils.lerp(-0.42, -0.3, a);
    vm.position.set(baseX + idleSway + moveSwayX, baseY + this.kick * 0.03 + moveSwayY, baseZ + this.kick * 0.05);
    vm.rotation.x = this.kick * 0.08 + idleSway * 2;
    vm.rotation.y = -idleSway * 1.5;
    vm.rotation.z = moveSwayX * 1.5;
    if (this.reload > 0) {
      const t = 1 - this.reload / d.reloadTime;
      vm.rotation.x -= Math.sin(t * Math.PI) * 0.9;
      vm.position.y -= Math.sin(t * Math.PI) * 0.15;
      vm.position.z += Math.sin(t * Math.PI) * 0.04;
    }
    vm.position.y -= (this.switchT / 0.4) * 0.35;
    this.flashT = Math.max(0, this.flashT - dt); this.flashMesh.visible = this.flashT > 0;
    vm.position.x += Math.sin(p.bob) * 0.006 * (1 - a); vm.position.y += Math.abs(Math.cos(p.bob)) * 0.004 * (1 - a);
    vm.visible = !this.scoped && p.alive; this.flash.intensity *= 0.55;
  }
  private shoot(h: WeaponHost): void {
    const d = this.def, p = h.player; this.ammo.mag--;
    let sp = d.spread * (1 - this.ads * (1 - d.adsSpreadMul)) + this.heat * 0.002;
    if (p.speed > 1) sp += 0.008 * (1 - this.ads); if (!p.grounded) sp += 0.03; if (p.crouched) sp *= 0.7;
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * sp;
    this.tmpD.set(Math.cos(a) * r, Math.sin(a) * r, -1).normalize().applyQuaternion(h.camera.quaternion);
    h.camera.getWorldPosition(this.tmpO);
    h.fireHit(this.tmpO, this.tmpD, d.range, d.damage, d.headMul, d.flashColor);
    const k = 1 - this.ads * 0.3; h.player.addRecoil(d.recoilPitch * k, (Math.random() - 0.5) * 2 * d.recoilYaw);
    this.heat = Math.min(this.heat + 1, 10); this.kick = 1; this.flash.color.setHex(d.flashColor); this.flash.intensity = 6;
    this.flashMesh.visible = true; this.flashT = 0.06;
    const mz = h.camera.localToWorld(new Vector3(0.15, -0.1, -0.9));
    h.particles.emit(mz, this.tmpD, 6, d.flashColor, 3, 0.08, 0, 0.3);
    // Tracer: brilho rastreável no caminho do tiro
    h.particles.emit(this.tmpO, this.tmpD, 1, d.flashColor, 14, 0.12, 0, 0.05);
    h.audio.play(d.sound); h.alertNoise(this.tmpO, d.noise);
  }
}
