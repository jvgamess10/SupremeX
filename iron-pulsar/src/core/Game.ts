import { ACESFilmicToneMapping, Box3, Color, DirectionalLight, Fog, HemisphereLight, Mesh, Object3D, PCFSoftShadowMap, PerspectiveCamera, PointLight, Raycaster, Scene, Vector3, WebGLRenderer, MathUtils } from 'three';
import { Input } from '../input/Input';
import { AudioManager } from '../audio/AudioManager';
import { HUD } from '../ui/HUD';
import { Player } from '../player/Player';
import { WEAPONS, WeaponHost, WeaponSystem } from '../weapons/Weapons';
import { GrenadeSystem } from '../weapons/Grenades';
import { Enemy, EnemyContext } from '../enemies/Enemy';
import { NavGraph } from '../physics/Nav';
import { segmentBlocked } from '../physics/Collision';
import { Particles } from '../rendering/Particles';
import { MaterialLibrary } from '../rendering/MaterialLibrary';
import { PostProcessor } from '../rendering/PostProcessor';
import { AssetLoader, MODEL_MANIFEST } from '../assets/AssetLoader';
import { MISSIONS } from '../missions/Registry';
import type { Level } from '../missions/Mission';
import { PRESETS, Settings } from './Settings';

export type GameState = 'menu' | 'loading' | 'playing' | 'paused' | 'won' | 'lost';
export interface GameDeps { canvas: HTMLCanvasElement; input: Input; audio: AudioManager; hud: HUD; settings: Settings }
const BASE_FOV = 75;

/** Orquestrador: loop, estado, ligação entre módulos. Implementa os contratos WeaponHost e EnemyContext. */
export class Game implements WeaponHost, EnemyContext {
  state: GameState = 'menu';
  readonly renderer: WebGLRenderer; readonly scene = new Scene(); readonly camera: PerspectiveCamera;
  readonly player: Player; readonly weapons: WeaponSystem; readonly grenades: GrenadeSystem; readonly particles: Particles; readonly postProcessor: PostProcessor;
  readonly materials = new MaterialLibrary(); readonly assets = new AssetLoader();
  input: Input; audio: AudioManager; hud: HUD; settings: Settings;
  level: Level | null = null; enemies: Enemy[] = []; nav!: NavGraph; solids: Box3[] = []; currentMission = 'hospital';
  private sun: DirectionalLight; private boom: PointLight; private ray = new Raycaster();
  private kills = 0; private time = 0; private shake = 0; private deadT = 0; private lastTick = 0; private lastRender = 0; private fpsAcc = 0; private fpsN = 0; private fov = BASE_FOV;
  private tmpV = new Vector3(); private tmpD = new Vector3();

  constructor(d: GameDeps) {
    this.input = d.input; this.audio = d.audio; this.hud = d.hud; this.settings = d.settings;
    this.renderer = new WebGLRenderer({ canvas: d.canvas, antialias: PRESETS[d.settings.preset].antialias, powerPreference: 'high-performance' });
    this.renderer.shadowMap.type = PCFSoftShadowMap; this.renderer.toneMapping = ACESFilmicToneMapping;
    this.scene.background = new Color(0x0c1218); this.scene.fog = new Fog(0x0c1218, 18, 90);
    this.camera = new PerspectiveCamera(BASE_FOV, innerWidth / innerHeight, 0.05, 100); this.scene.add(this.camera);
    this.scene.add(new HemisphereLight(0xb8d0e0, 0x1e2420, 0.45));
    this.sun = new DirectionalLight(0xfff2e0, 0.55); this.sun.position.set(12, 28, 8); this.sun.target.position.set(0, 0, 0);
    const sc = this.sun.shadow.camera; sc.left = -32; sc.right = 32; sc.top = 32; sc.bottom = -32; sc.near = 1; sc.far = 80; this.sun.shadow.bias = -0.0005;
    this.scene.add(this.sun, this.sun.target);
    this.boom = new PointLight(0xffaa44, 0, 20, 2); this.scene.add(this.boom);
    this.particles = new Particles(this.scene); this.player = new Player(this.camera); this.weapons = new WeaponSystem(this.camera); this.grenades = new GrenadeSystem(this.scene);
    this.postProcessor = new PostProcessor(this.renderer, this.scene, this.camera);
    this.applySettings(); addEventListener('resize', () => this.resize());
    this.input.onLockChange = l => { if (!l && this.state === 'playing') this.pause(); };
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'playing') this.pause(); });
    addEventListener('webglcontextlost', (e) => { e.preventDefault(); if (this.state === 'playing') this.pause(); });
    addEventListener('webglcontextrestored', () => { if (this.state === 'paused') this.resume(); });
    void this.loadWeaponModels();
    requestAnimationFrame(this.loop);
  }
  /** Tenta carregar GLBs reais das armas; se não existirem, mantém os provisórios. */
  private async loadWeaponModels(): Promise<void> {
    for (const id of Object.keys(MODEL_MANIFEST) as (keyof typeof MODEL_MANIFEST)[]) { const o = await this.assets.tryLoad(MODEL_MANIFEST[id]); if (o) this.weapons.setModel(id, o); }
  }
  /** Aplica o preset gráfico e o limite de FPS (o limitador é lido no loop). */
  applySettings(): void {
    const q = PRESETS[this.settings.preset];
    this.renderer.setPixelRatio(MathUtils.clamp(devicePixelRatio * q.renderScale, 0.4, 3)); this.resize();
    this.renderer.shadowMap.enabled = q.shadows; this.sun.castShadow = q.shadows; this.sun.shadow.mapSize.set(q.shadowMapSize, q.shadowMapSize);
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    this.camera.far = q.viewDistance; this.camera.updateProjectionMatrix(); (this.scene.fog as Fog).far = q.viewDistance;
    this.particles.scale = q.particleScale; this.materials.setAnisotropy(q.anisotropy);
    this.postProcessor.setup(q, this.settings.preset);
    this.level?.lights.forEach((l, i) => { l.visible = i < q.maxDynamicLights; });
    this.scene.traverse((o: Object3D) => { const m = (o as Mesh).material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => { x.needsUpdate = true; }); });
  }
  private resize(): void {
    this.renderer.setSize(innerWidth, innerHeight, false); this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
    this.postProcessor.setSize(innerWidth, innerHeight);
    const portrait = this.input.isTouch && innerHeight > innerWidth; this.hud.setRotate(portrait); if (portrait && this.state === 'playing') this.pause();
  }
  async startMission(id: string): Promise<void> {
    const def = MISSIONS.find(m => m.id === id); if (!def) return;
    this.currentMission = id; this.state = 'loading'; this.hud.show('loading'); this.hud.showHud(false, false);
    try {
      const level = await def.load({ materials: this.materials, assets: this.assets });
      this.unloadLevel(); this.level = level; this.scene.add(level.group); this.solids = level.solids; this.nav = level.nav;
      this.enemies = level.enemySpawns.map(s => { const e = new Enemy(s.pos, s.patrol); this.scene.add(e.group); return e; });
      this.player.reset(level.spawn.pos, level.spawn.yaw); this.weapons.reset(); this.grenades.reset(); this.kills = 0; this.time = 0; this.shake = 0; this.deadT = 0;
      this.applySettings(); this.input.reset(); this.state = 'playing'; this.hud.show(null); this.hud.showHud(true, this.input.isTouch);
      this.hud.message(def.name + ': ' + def.briefing, 4); this.input.requestLock();
    } catch (e) { this.state = 'menu'; this.hud.show('menu'); alert((e as Error).message); }
  }
  private unloadLevel(): void {
    this.enemies.forEach(e => this.scene.remove(e.group));
    if (this.level) { this.scene.remove(this.level.group); this.level.group.traverse(o => (o as Mesh).geometry?.dispose()); }
    this.enemies = []; this.level = null; this.solids = [];
    this.materials.dispose(); this.assets.dispose();
  }
  toMenu(): void { this.state = 'menu'; this.input.exitLock(); this.unloadLevel(); this.grenades.reset(); this.hud.showHud(false, false); this.hud.show('menu'); }
  pause(): void { if (this.state !== 'playing') return; this.state = 'paused'; this.input.exitLock(); this.input.reset(); this.hud.show('pause'); }
  resume(): void { if (this.state !== 'paused') return; this.state = 'playing'; this.hud.show(null); this.input.requestLock(); this.lastTick = performance.now(); }
  private end(win: boolean): void {
    this.state = win ? 'won' : 'lost'; this.input.exitLock(); this.input.reset(); this.hud.setScope(false);
    this.hud.setEnd(win ? 'OPERAÇÃO CONCLUÍDA' : 'MISSÃO FALHOU', `Inimigos neutralizados: ${this.kills}/${this.enemies.length} | Tempo: ${Math.floor(this.time)} s`); this.hud.show('end');
  }
  // ---- WeaponHost / EnemyContext ----
  get alertTargets() { return this.enemies; }
  alertNoise(p: Vector3, r: number): void { this.enemies.forEach(e => e.hear(p, r)); }
  hurtPlayer(n: number): void { if (!this.player.alive) return; this.player.damage(n); this.hud.damage(); this.audio.play('hurt'); this.shake = Math.min(1, this.shake + 0.3); }
  fireHit(o: Vector3, dir: Vector3, range: number, dmg: number, headMul: number, color: number): void {
    if (!this.level) return;
    this.ray.set(o, dir); this.ray.far = range;
    const targets: Object3D[] = [...this.level.solidMeshes]; for (const e of this.enemies) if (e.alive) targets.push(...e.hitboxes);
    const h = this.ray.intersectObjects(targets, false)[0]; if (!h) return;
    const en = h.object.userData.enemy as Enemy | undefined;
    if (en) {
      const mult = h.object.userData.mult as number; const killed = en.damage(dmg * mult * (mult > 2 ? headMul / 2.5 : 1), this);
      this.particles.emit(h.point, null, 10, 0xaa1111, 2.5, 0.35, 8, 0.6); this.audio.play('hit'); this.hud.hit(killed);
      if (killed) { this.kills++; if (mult > 2) this.hud.message('HEADSHOT!', 1.6); }
    } else {
      const n = h.face ? this.tmpV.copy(h.face.normal).transformDirection(h.object.matrixWorld) : this.tmpV.set(0, 1, 0);
      this.particles.emit(h.point, n, 6, color === 0x33e6ff ? 0x33e6ff : 0xffcc88, 2, 0.25, 6, 0.5);
    }
  }
  explode(p: Vector3): void {
    const R = 7; this.audio.play('explosion'); this.shake = 1;
    this.particles.emit(p, null, 70, 0xff8822, 9, 0.6, 2, 1); this.particles.emit(p, null, 40, 0x888888, 4, 1.2, -1, 1); this.particles.emit(p, null, 30, 0xffee99, 14, 0.4, 10, 1);
    this.boom.position.copy(p); this.boom.position.y += 0.5; this.boom.intensity = 80; this.alertNoise(p, 40);
    for (const e of this.enemies) if (e.alive) {
      this.tmpV.set(e.pos.x, e.pos.y + 1, e.pos.z); const d = this.tmpV.distanceTo(p);
      if (d < R && !segmentBlocked(p, this.tmpV, this.solids)) { if (e.damage(140 * (1 - d / R), this)) { this.kills++; this.hud.hit(true); } }
    }
    const pe = this.player.eyePos(this.tmpV); const d = pe.distanceTo(p);
    if (d < R && !segmentBlocked(p, pe, this.solids)) this.hurtPlayer(70 * (1 - d / R));
  }
  // ---- loop ----
  private loop = (t: number): void => {
    requestAnimationFrame(this.loop);
    const lim = this.settings.fpsLimit, el = t - this.lastRender;
    if (lim > 0) { const iv = 1000 / lim; if (el < iv - 1) return; this.lastRender = t - (el % iv); } else this.lastRender = t;
    const dt = Math.min(0.05, (t - this.lastTick) / 1000); this.lastTick = t;
    this.fpsAcc += dt; this.fpsN++; if (this.fpsAcc >= 0.5) { this.hud.setFps(Math.round(this.fpsN / this.fpsAcc)); this.fpsAcc = 0; this.fpsN = 0; }
    this.hud.tick(dt);
    if (this.state === 'playing') this.update(dt);
    if (this.postProcessor.enabled) this.postProcessor.render(dt); else this.renderer.render(this.scene, this.camera);
  };
  private update(dt: number): void {
    const lv = this.level!, inp = this.input, p = this.player; this.time += dt;
    if (inp.consume('pause')) { this.pause(); return; }
    const sens = this.settings.sensitivity * (inp.isTouch ? 0.0045 : 0.0022) * (1 - 0.6 * this.weapons.ads);
    p.update(dt, inp, this.solids, this.weapons.ads, sens);
    this.shake = Math.max(0, this.shake - dt * 2); if (this.shake > 0) this.camera.position.add(this.tmpV.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(this.shake * 0.08));
    this.camera.updateMatrixWorld(true);
    this.weapons.update(dt, inp, this);
    const wd = WEAPONS[this.weapons.idx], fovT = MathUtils.lerp(BASE_FOV, wd.adsFov, this.weapons.ads);
    if (Math.abs(fovT - this.fov) > 0.05) { this.fov = fovT; this.camera.fov = fovT; this.camera.updateProjectionMatrix(); }
    if (inp.consume('grenade') && p.alive) { this.camera.getWorldDirection(this.tmpD); if (this.grenades.throw(this.camera.getWorldPosition(this.tmpV), this.tmpD)) this.audio.play('reload'); }
    this.grenades.update(dt, this.solids, pos => this.explode(pos));
    this.boom.intensity *= 0.9;
    let alive = 0; for (const e of this.enemies) { e.update(dt, this); if (e.alive) alive++; }
    this.particles.update(dt);
    for (const pk of lv.pickups) if (pk.active && Math.hypot(pk.pos.x - p.pos.x, pk.pos.z - p.pos.z) < 1.3 && Math.abs(p.pos.y - (pk.pos.y)) < 2) {
      if (pk.type === 'health' && p.health >= p.maxHealth) continue;
      pk.active = false; pk.mesh.visible = false; this.audio.play('pickup'); lv.onPickup(pk.type);
      if (pk.type === 'health') { p.heal(40); this.hud.message('Kit médico +40'); } else if (pk.type === 'ammo') { this.weapons.addAmmo(); this.grenades.count++; this.hud.message('Munição reabastecida'); } else this.hud.message('Disco de dados recuperado!');
    }
    lv.update({ dt, time: this.time, player: p, enemiesAlive: alive, enemiesTotal: this.enemies.length });
    this.hud.setHealth(p.health, p.maxHealth); this.hud.setWeapon(wd.name, this.weapons.ammo.mag, this.weapons.ammo.reserve, this.weapons.reloading, this.grenades.count);
    this.hud.setObjectives(lv.objectives); this.hud.setScope(this.weapons.scoped);
    this.hud.hint(!inp.isTouch && !inp.locked ? 'Clique na tela para capturar o mouse' : '');
    if (lv.complete) this.end(true);
    if (!p.alive) { this.deadT += dt; if (this.deadT > 1.5) this.end(false); }
  }
}
