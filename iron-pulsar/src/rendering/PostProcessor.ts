import { WebGLRenderer, Scene, Camera, Vector2 } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import type { PresetName, Quality } from '../core/Settings';

/** Pós-processamento progressivo por preset, com fallback silencioso para renderização direta. */
export class PostProcessor {
  composer: EffectComposer | null = null;
  private renderer: WebGLRenderer; private scene: Scene; private camera: Camera;
  private bloom: UnrealBloomPass | null = null; private smaa: SMAAPass | null = null; private ssao: SSAOPass | null = null;
  public enabled = false;
  constructor(renderer: WebGLRenderer, scene: Scene, camera: Camera) {
    this.renderer = renderer; this.scene = scene; this.camera = camera;
  }
  /** (Re)configura o composer conforme o preset. Retorna true se conseguiu ativar. */
  setup(q: Quality, preset: PresetName): boolean {
    this.dispose();
    // BAIXA: sem pós-processamento (render direto)
    if (preset === 'BAIXA') { this.enabled = false; return false; }
    try {
      const composer = new EffectComposer(this.renderer);
      composer.addPass(new RenderPass(this.scene, this.camera));
      this.composer = composer;

      if (preset === 'MEDIA') { this.enabled = true; return true; }

      // ALTA+: antialiasing SMAA
      if (preset === 'ALTA' || preset === 'MUITO_ALTA' || preset === 'OVERKILL') {
        const smaa = new SMAAPass(window.innerWidth, window.innerHeight);
        composer.addPass(smaa); this.smaa = smaa;
      }
      // MUITO_ALTA/OVERKILL: bloom controlado
      if (preset === 'MUITO_ALTA' || preset === 'OVERKILL') {
        const bloom = new UnrealBloomPass(new Vector2(window.innerWidth, window.innerHeight), 0.4, 0.4, 0.85);
        bloom.threshold = 0.9; bloom.strength = 0.7; bloom.radius = 0.6;
        composer.addPass(bloom); this.bloom = bloom;
      }
      // OVERKILL: AO de tela (SSAO) leve
      if (preset === 'OVERKILL') {
        try {
          const ssao = new SSAOPass(this.scene, this.camera, window.innerWidth, window.innerHeight);
          const s: any = ssao; s.radius = 8; s.bias = 0.0001; s.kernelSize = 16;
          composer.addPass(ssao); this.ssao = ssao;
        } catch { /* SSAO indisponível nesta build */ }
      }
      this.enabled = true;
      return true;
    } catch { this.enabled = false; this.composer = null; return false; }
  }
  setSize(w: number, h: number): void {
    if (!this.composer) return;
    this.composer.setSize(w, h);
    if (this.smaa) (this.smaa as any).setSize?.(w, h);
  }
  render(dt: number): void {
    if (this.composer && this.enabled) { this.composer.render(); }
  }
  dispose(): void {
    if (this.composer) { try { this.composer.dispose(); } catch {}; this.composer = null; }
    this.bloom = null; this.smaa = null; this.ssao = null; this.enabled = false;
  }
}
