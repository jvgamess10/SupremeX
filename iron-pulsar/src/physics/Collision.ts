import { Box3, Ray, Vector3 } from 'three';
/** Colisão AABB própria. Interface estável: moveBody/overlaps/segmentBlocked. Pode ser trocada por Rapier mantendo estas assinaturas. */
export function overlaps(b: Box3, p: Vector3, r: number, h: number): boolean {
  return p.x + r > b.min.x && p.x - r < b.max.x && p.z + r > b.min.z && p.z - r < b.max.z && p.y + h > b.min.y && p.y < b.max.y;
}
/** Move um cilindro (pos = pés). Retorna true se estiver no chão. Zera vel nos eixos bloqueados. */
export function moveBody(pos: Vector3, vel: Vector3, dt: number, r: number, h: number, boxes: Box3[]): boolean {
  let grounded = false;
  for (const ax of ['x', 'z'] as const) {
    pos[ax] += vel[ax] * dt;
    for (const b of boxes) {
      if (b.max.y <= pos.y + 0.35) continue; // degrau pequeno
      if (overlaps(b, pos, r, h)) {
        const c = (b.min[ax] + b.max[ax]) / 2;
        pos[ax] = pos[ax] < c ? b.min[ax] - r - 1e-4 : b.max[ax] + r + 1e-4;
        vel[ax] = 0;
      }
    }
  }
  pos.y += vel.y * dt;
  for (const b of boxes) {
    if (overlaps(b, pos, r, h)) {
      if (vel.y <= 0) { pos.y = b.max.y; grounded = true; } else pos.y = b.min.y - h - 1e-4;
      vel.y = 0;
    }
  }
  if (pos.y <= 0) { pos.y = 0; vel.y = 0; grounded = true; }
  return grounded;
}
const _ray = new Ray(); const _hit = new Vector3();
export function segmentBlocked(a: Vector3, b: Vector3, boxes: Box3[]): boolean {
  const len = a.distanceTo(b); if (len < 1e-4) return false;
  _ray.origin.copy(a); _ray.direction.subVectors(b, a).divideScalar(len);
  for (const bx of boxes) { const p = _ray.intersectBox(bx, _hit); if (p && a.distanceTo(p) < len) return true; }
  return false;
}
