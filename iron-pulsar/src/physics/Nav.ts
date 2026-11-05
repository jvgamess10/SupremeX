import { Box3, Vector3 } from 'three';
import { segmentBlocked } from './Collision';
/** Grafo de navegação por waypoints (arestas automáticas por linha de visão) + A*. */
export class NavGraph {
  nodes: Vector3[]; adj: number[][];
  private a = new Vector3(); private b = new Vector3();
  constructor(pts: Vector3[], private solids: Box3[]) {
    this.nodes = pts; this.adj = pts.map(() => []);
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      if (pts[i].distanceTo(pts[j]) > 16) continue;
      this.a.set(pts[i].x, 1.2, pts[i].z); this.b.set(pts[j].x, 1.2, pts[j].z);
      if (!segmentBlocked(this.a, this.b, solids)) { this.adj[i].push(j); this.adj[j].push(i); }
    }
  }
  nearest(p: Vector3): number {
    let best = -1, bd = Infinity, any = -1, ad = Infinity;
    this.a.set(p.x, 1.2, p.z);
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i]; const d = Math.hypot(n.x - p.x, n.z - p.z);
      if (d < ad) { ad = d; any = i; }
      if (d < bd) { this.b.set(n.x, 1.2, n.z); if (!segmentBlocked(this.a, this.b, this.solids)) { bd = d; best = i; } }
    }
    return best >= 0 ? best : any;
  }
  findPath(from: Vector3, to: Vector3): Vector3[] {
    const s = this.nearest(from), t = this.nearest(to);
    if (s < 0 || t < 0 || s === t) return [to.clone()];
    const n = this.nodes.length, g = new Array<number>(n).fill(Infinity), prev = new Array<number>(n).fill(-1), closed = new Array<boolean>(n).fill(false);
    const open = [s]; g[s] = 0;
    while (open.length) {
      let bi = 0, bf = Infinity;
      open.forEach((id, k) => { const f = g[id] + this.nodes[id].distanceTo(this.nodes[t]); if (f < bf) { bf = f; bi = k; } });
      const cur = open.splice(bi, 1)[0]; if (cur === t) break; closed[cur] = true;
      for (const nb of this.adj[cur]) {
        if (closed[nb]) continue; const ng = g[cur] + this.nodes[cur].distanceTo(this.nodes[nb]);
        if (ng < g[nb]) { g[nb] = ng; prev[nb] = cur; if (!open.includes(nb)) open.push(nb); }
      }
    }
    if (prev[t] === -1) return [to.clone()];
    const path: Vector3[] = [to.clone()]; for (let c = t; c !== -1; c = prev[c]) path.unshift(this.nodes[c].clone());
    return path;
  }
}
