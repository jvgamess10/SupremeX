/** Presets gráficos. Cada campo atua sobre um recurso real (ver Game.applySettings). */
export type PresetName = 'BAIXA' | 'MEDIA' | 'ALTA' | 'MUITO_ALTA' | 'OVERKILL';
export interface Quality {
  renderScale: number;       // resolução interna (multiplica devicePixelRatio)
  shadows: boolean;
  shadowMapSize: number;
  particleScale: number;     // multiplicador de partículas emitidas
  viewDistance: number;      // camera.far e fog
  maxDynamicLights: number;  // PointLights ativas do cenário
  anisotropy: number;        // filtro anisotrópico das texturas
  antialias: boolean;        // só vale após recarregar a página
}
export const PRESETS: Record<PresetName, Quality> = {
  BAIXA: { renderScale: 0.6, shadows: false, shadowMapSize: 512, particleScale: 0.3, viewDistance: 45, maxDynamicLights: 2, anisotropy: 1, antialias: false },
  MEDIA: { renderScale: 0.8, shadows: true, shadowMapSize: 1024, particleScale: 0.6, viewDistance: 70, maxDynamicLights: 4, anisotropy: 2, antialias: false },
  ALTA: { renderScale: 1, shadows: true, shadowMapSize: 2048, particleScale: 1, viewDistance: 100, maxDynamicLights: 6, anisotropy: 4, antialias: true },
  MUITO_ALTA: { renderScale: 1.15, shadows: true, shadowMapSize: 4096, particleScale: 1.6, viewDistance: 140, maxDynamicLights: 9, anisotropy: 8, antialias: true },
  OVERKILL: { renderScale: 1.5, shadows: true, shadowMapSize: 4096, particleScale: 2.5, viewDistance: 200, maxDynamicLights: 12, anisotropy: 16, antialias: true },
};
export const PRESET_LABELS: Record<PresetName, string> = { BAIXA: 'BAIXA', MEDIA: 'MÉDIA', ALTA: 'ALTA', MUITO_ALTA: 'MUITO ALTA', OVERKILL: 'OVERKILL' };
export const FPS_LIMITS = [20, 30, 45, 60, 0]; // 0 = Livre
/** Opções que existem na arquitetura mas AINDA NÃO têm implementação (para a IA Nº 2). */
export const NOT_IMPLEMENTED = [
  'Pós-processamento completo (SSAO, bloom, TAA via EffectComposer) — planejado para etapa futura',
  'LOD automático de modelos (THREE.LOD)',
  'Reflexos em tempo real (cubemap/SSR)',
  'Texturas KTX2/Basis comprimidas',
  'Modelos GLB externos de alta densidade (procedural multi-part ativo; pipeline GLB preservado)',
  'Rapier 3D (colisão atual: AABB próprio em physics/Collision.ts)',
];
export interface Settings { preset: PresetName; fpsLimit: number; sensitivity: number }
const KEY = 'ipjv_settings_v1';
export function loadSettings(): Settings {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const def: Settings = { preset: coarse ? 'BAIXA' : 'ALTA', fpsLimit: coarse ? 30 : 0, sensitivity: 1 };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && PRESETS[s.preset as PresetName]) return { ...def, ...s }; } catch { /* ignore */ }
  return def;
}
export function saveSettings(s: Settings): void { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } }
