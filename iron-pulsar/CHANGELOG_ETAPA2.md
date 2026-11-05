# Changelog — Etapa 2: Reconstrução Gráfica AAA

## 2026-11-05 — IA Nº 2 (Graphics)

### Adicionado
- MaterialLibrary com texturas procedurais PBR (floor tiles 512, wall paint, normal maps, metal rough, concrete, monitor screen).
- Hospital com geometria composta: camas, IV, monitores, cadeiras, armários, lixeiras, batentes, rodapés, fluorescentes, janelas.
- Viewmodels detalhados AK-47, LOCUS, PULSAR-X.
- Inimigos militares multi-parte (colete, capacete, mochila, rifle, botas).
- Mais PointLights e materiais emissivos no hospital.

### Alterado
- Iluminação global (hemisphere, sun, fog) para atmosfera interna.
- NOT_IMPLEMENTED atualizado com estado real.

### Preservado
- Toda a lógica de combate, IA, colisão AABB, navegação, controles PC/mobile, presets gráficos, objetivos da missão Hospital, sistema de armas (só visual dos modelos).

### Não implementado nesta etapa
- GLB externos de alta densidade (ferramentas 3D indisponíveis no ambiente).
- Pós-processamento (EffectComposer).
- Missões 2–4 com o mesmo nível de detalhe.
- Lightmaps / reflexos / SSAO real.
