import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, PointsMaterial, Scene, Vector3 } from 'three';
/** Sistema de partículas em pool (Points). Usado em disparos, impactos, sangue e explosões. */
export class Particles {
  scale = 1;
  private max = 1500; private cursor = 0;
  private pos = new Float32Array(this.max * 3); private col = new Float32Array(this.max * 3); private base = new Float32Array(this.max * 3);
  private vel = new Float32Array(this.max * 3); private life = new Float32Array(this.max); private maxLife = new Float32Array(this.max); private grav = new Float32Array(this.max);
  private points: Points; private c = new Color();
  constructor(scene: Scene) {
    const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(this.pos, 3)); g.setAttribute('color', new BufferAttribute(this.col, 3));
    this.points = new Points(g, new PointsMaterial({ size: 0.14, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending }));
    this.points.frustumCulled = false; scene.add(this.points);
    for (let i = 0; i < this.max; i++) this.pos[i * 3 + 1] = -1000;
  }
  emit(p: Vector3, dir: Vector3 | null, count: number, color: number, speed: number, life: number, gravity = 0, spread = 1): void {
    const n = Math.ceil(count * this.scale); this.c.setHex(color);
    for (let k = 0; k < n; k++) {
      const i = this.cursor; this.cursor = (this.cursor + 1) % this.max; const j = i * 3;
      this.pos[j] = p.x; this.pos[j + 1] = p.y; this.pos[j + 2] = p.z;
      const rx = Math.random() * 2 - 1, ry = Math.random() * 2 - 1, rz = Math.random() * 2 - 1;
      this.vel[j] = ((dir ? dir.x : 0) + rx * spread) * speed; this.vel[j + 1] = ((dir ? dir.y : 0) + ry * spread) * speed; this.vel[j + 2] = ((dir ? dir.z : 0) + rz * spread) * speed;
      this.base[j] = this.c.r; this.base[j + 1] = this.c.g; this.base[j + 2] = this.c.b;
      this.life[i] = this.maxLife[i] = life * (0.6 + Math.random() * 0.6); this.grav[i] = gravity;
    }
  }
  update(dt: number): void {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue; const j = i * 3; this.life[i] -= dt;
      if (this.life[i] <= 0) { this.pos[j + 1] = -1000; this.col[j] = this.col[j + 1] = this.col[j + 2] = 0; continue; }
      this.vel[j + 1] -= this.grav[i] * dt;
      this.pos[j] += this.vel[j] * dt; this.pos[j + 1] += this.vel[j + 1] * dt; this.pos[j + 2] += this.vel[j + 2] * dt;
      const f = this.life[i] / this.maxLife[i]; this.col[j] = this.base[j] * f; this.col[j + 1] = this.base[j + 1] * f; this.col[j + 2] = this.base[j + 2] * f;
    }
    this.points.geometry.attributes.position.needsUpdate = true; this.points.geometry.attributes.color.needsUpdate = true;
  }
}
