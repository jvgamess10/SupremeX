import { Box3, Mesh, MeshStandardMaterial, Scene, SphereGeometry, Vector3 } from 'three';
import { moveBody } from '../physics/Collision';
interface G { mesh: Mesh; pos: Vector3; vel: Vector3; fuse: number }
/** Granadas de fragmentação: arremesso, quique em AABBs, pavio de 2,2 s. A explosão é tratada por Game.explode. */
export class GrenadeSystem {
  count = 3; private list: G[] = [];
  private geo = new SphereGeometry(0.08, 10, 8); private mat = new MeshStandardMaterial({ color: 0x3b4a2a, roughness: 0.6, metalness: 0.4 });
  constructor(private scene: Scene) {}
  reset(): void { this.list.forEach(g => this.scene.remove(g.mesh)); this.list = []; this.count = 3; }
  throw(origin: Vector3, dir: Vector3): boolean {
    if (this.count <= 0) return false; this.count--;
    const mesh = new Mesh(this.geo, this.mat); mesh.castShadow = true; this.scene.add(mesh);
    const pos = origin.clone().addScaledVector(dir, 0.5); pos.y -= 0.1;
    this.list.push({ mesh, pos, vel: dir.clone().multiplyScalar(13).add(new Vector3(0, 2.5, 0)), fuse: 2.2 }); return true;
  }
  update(dt: number, solids: Box3[], onExplode: (p: Vector3) => void): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const g = this.list[i]; g.fuse -= dt; g.vel.y -= 20 * dt;
      const ov = g.vel.clone(); const grounded = moveBody(g.pos, g.vel, dt, 0.08, 0.16, solids);
      if (ov.x !== 0 && g.vel.x === 0) g.vel.x = -ov.x * 0.45; if (ov.z !== 0 && g.vel.z === 0) g.vel.z = -ov.z * 0.45;
      if (grounded) { g.vel.y = Math.abs(ov.y) > 1.5 ? -ov.y * 0.35 : 0; const f = Math.pow(0.05, dt); g.vel.x *= f; g.vel.z *= f; }
      g.mesh.position.set(g.pos.x, g.pos.y + 0.08, g.pos.z);
      if (g.fuse <= 0) { this.scene.remove(g.mesh); this.list.splice(i, 1); onExplode(g.mesh.position.clone()); }
    }
  }
}
