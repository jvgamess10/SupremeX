import { LoadingManager, Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
/** Caminhos esperados dos modelos GLB. Se o arquivo não existir, o jogo usa o modelo provisório. */
export const MODEL_MANIFEST = {
  ak47: 'assets/models/weapons/ak47.glb',
  locus: 'assets/models/weapons/locus.glb',
  pulsar: 'assets/models/weapons/pulsar.glb',
} as const;

/** Progresso global de carregamento (0..1). Atualizado pelo LoadingManager do three. */
export let loadProgress = 0;
let pending = 0, completed = 0;

export class AssetLoader {
  private loader = new GLTFLoader();
  private cache = new Map<string, Promise<Object3D>>();
  private onProgress?: (p: number) => void;
  constructor(onProgress?: (p: number) => void) { this.onProgress = onProgress; }
  /** Registra um callback de progresso (0..1) para exibir indicador na HUD de loading. */
  setProgress(cb: (p: number) => void): void { this.onProgress = cb; }
  private tick(): void { if (this.onProgress) this.onProgress(loadProgress); }
  load(url: string): Promise<Object3D> {
    let p = this.cache.get(url);
    if (!p) {
      pending++; loadProgress = pending > 0 ? completed / pending : 0; this.tick();
      p = this.loader.loadAsync(url).then((g) => {
        completed++; loadProgress = pending > 0 ? completed / pending : 1; this.tick();
        return g.scene;
      }).catch((e) => { completed++; loadProgress = pending > 0 ? completed / pending : 1; this.tick(); throw e; });
      this.cache.set(url, p);
    }
    return p.then(o => o.clone(true));
  }
  /** Retorna null (sem lançar) se o asset não existir, evitando travar o jogo. */
  async tryLoad(url: string): Promise<Object3D | null> {
    try { return await this.load(url); } catch { this.cache.delete(url); return null; }
  }
  /** Libera texturas/geometrias em cache (recomendado ao trocar de fase). */
  dispose(): void {
    this.cache.clear(); pending = 0; completed = 0; loadProgress = 0; this.tick();
  }
}
