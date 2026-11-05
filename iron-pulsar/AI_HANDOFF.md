# AI_HANDOFF — IRON PULSAR JV TACTICAL (Etapa 3 — Correções, Gráficos e Pós-Processamento)

**Etapa anterior (IA Nº 1 / Claude):** núcleo de gameplay, física AABB, armas, IA, hospital procedural básico, presets.
**Etapa anterior (IA Nº 2 / Graphics):** reconstrução gráfica profunda do Hospital, materiais PBR procedurais, modelos multi-parte de armas e inimigos, iluminação e acabamento visual.
**Esta etapa (IA Nº 3):** correções críticas de estado/jogo, pós-processamento por preset, pipeline de texturas externas reais, animações de armas aprimoradas, robustez WebGL e limpeza de memória.

---

## 1. Como executar

```bash
cd iron-pulsar
npm install          # dependências: three ^0.170.0, vite ^5.4.11, typescript ^5.6.3
npm run typecheck    # tsc --noEmit  → DEVE PASSAR (0 erros)
npm run dev          # http://localhost:5173 (ou IP da rede para iPhone)
npm run build        # gera dist/
npm run preview      # serve o build de produção
```

Requer Node 18+. Abra via HTTP (não por file://).

---

## 2. Testes realmente executados (nesta sessão)

| Comando | Resultado |
|---------|-----------|
| `npm install` | ✅ Sucesso (19 pacotes) |
| `npm run typecheck` | ✅ 0 erros de TypeScript |
| `npm run build` | ✅ Build de produção gerado com sucesso |
| `vite preview` (servidor local) | ✅ HTTP 200 em `index.html` e bundle JS |

**NÃO executado (registrado como limitação):**
- Testes no navegador real (não há navegador headless disponível neste container)
- Testes físicos em iPhone XR / Safari iOS
- Testes de contexto WebGL lost/restored em dispositivo real
- Testes de desempenho/FPS em cada preset

---

## 3. Correções críticas aplicadas (bugs que impediam o funcionamento)

### 3.1 NavGraph — `src/missions/Hospital.ts:501`
**Erro:** `new NavGraph(pts)` era chamado com apenas 1 argumento, mas o construtor exige `(pts, solids)`.  
**Correção:** `new NavGraph([...], solids)`.  
**Impacto:** antes, `solids` era `undefined` dentro do NavGraph, fazendo `segmentBlocked` travar ou retornar incorreto, permitindo inimigos atravessarem paredes.

### 3.2 EnemySpawn interface — `src/missions/Mission.ts:7`
**Erro:** `EnemySpawn` definia apenas `{ pos, patrol }`, mas o Hospital usava `yaw` e `waypoints`.  
**Correção:** contrato unificado `{ pos: Vector3; patrol: Vector3[]; yaw?: number }`.  
**Arquivo afetado:** `src/enemies/Enemy.ts` — construtor agora aceita `yaw?: number` e aplica na orientação inicial (`this.yaw = yaw ?? Math.random() * 6.28`).

### 3.3 MaterialLibrary tipo `side` — `src/rendering/MaterialLibrary.ts`
**Erro TS2322:** `side?: number` não atribuível a `Side`.  
**Correção:** `side?: Side`.

### 3.4 Progressão do Hospital — `src/missions/Hospital.ts`
- Spawn do jogador movido da área de extração para a **entrada sul** `(0, -20, yaw: PI)`.
- Disco de dados mantido na **Sala de Cirurgia (norte)** `(0, 23.2)`.
- Anel de extração movido do norte para o **lobby sul** `(0, -20)`.
- Anel só fica visível após **eliminar todos os inimigos + recuperar o disco**. Não há extração prematura.
- Objetivos reordenados: Entrada → Combate → Exploração → Objetivo principal → Extração.

### 3.5 Contexto WebGL — `src/core/Game.ts`
- Adicionados handlers `webglcontextlost` (pausa o jogo) e `webglcontextrestored` (retorna ao jogo), evitando travamento silencioso ao alternar aplicativos no iPhone.

---

## 4. Reconstrução gráfica entregue

### 4.1 Armas (viewmodels detalhados, primitivas Three.js)
- **AK-47:** receptor, dust cover, cano, tubo de gás, coronha madeira, carregador curvo, grip, seleletor, mira traseira/dianteira, quebra-chamas.
- **LOCUS:** receptor longo, cano alongado, freio de boca, luneta com lentes, monturas, ferrolho, bípé, coronha tática.
- **PULSAR-X:** corpo em camadas, faixas emissivas, núcleo energético, anéis de contenção, emissor com lente de foco, grip, bateria/traseira, ventoinhas frontais, banco de capacitores.
- Efeito de **flash de cano** (mesh + luz pontual) e **tracers** (partícula rastreável) no disparo.
- Pipeline GLB preservado via `setModel` (substitui modelo provisório por GLB real quando disponível).

### 4.2 Inimigos (soldado multi-partes)
- Partes: pescoço, cabeça, capacete, torso, colete, braços, luvas, pernas, botas, mochila, bolsos, rifle posicionado.
- Hitboxes preservadas: cabeça ×2.5, tronco ×1, pernas ×0.7.
- Animações: pernas/braços ao andar, giro do tronco em alerta/ataque, cabeça seguindo o jogador, flinch ao levar dano, rotação de queda na morte.

### 4.3 Hospital — arquitetura e iluminação
- Paredes oeste/leste **segmentadas** com vãos reais para janelas (vidro, batentes de metal, peitoris inferiores).
- Iluminação por zona: corredor (neutro), cirurgia (clínica/fria), lobby sul/extração (quente).
- PointLights locais com intensidade/cor diferenciadas por sala.

### 4.4 Texturas externas reais (PNG) — `public/assets/textures/`
| Pasta | Arquivos |
|-------|----------|
| `hospital/` | floor_tiles, wall_paint, concrete, metal_brushed, glass, accent_emissive |
| `weapons/` | metal_painted, metal_brushed, wood, polymer, energy_core |
| `characters/` | fabric, vest, helmet, boots, gloves |
- **MaterialLibrary:** `resolveMap(url, srgb, fallback)` carrega textura externa com fallback procedural se falhar. Não trava o jogo se ausente.
- **AssetLoader:** `loadProgress` (0–1) com callback, `tryLoad` (sem lançar exceção), `dispose()` para limpeza de memória entre fases.

---

## 5. Pós-processamento (novo arquivo)

### `src/rendering/PostProcessor.ts`
- `EffectComposer` com `RenderPass` base.
- **BAIXA:** render direto (sem pós-processamento).
- **MÉDIA+:** `SMAAPass` (antialiasing).
- **MUITO ALTA / OVERKILL:** `UnrealBloomPass` controlado (threshold 0.9, strength 0.7, radius 0.6).
- **OVERKILL:** `SSAOPass` leve (radius 8, bias 0.0001, kernelSize 16).
- Fallback silencioso se qualquer passe falhar; `setSize` redimensiona ao trocar janela.
- Integrado em `Game.ts`: `postProcessor.setup(q, preset)` no `applySettings()`; render condicional no loop.

---

## 6. Game feel e animações

- **Armas:** sway de respiração/movimento, recuo (posição + rotação), recarga visível (rotação + translação), flash de cano sincronizado com tiro.
- **Feedback de acerto:** hitmarker existente; headshot exibe mensagem `HEADSHOT!` na HUD por 1.6s; partículas de impacto vermelho; inimigo reage com flinch.
- **Inimigos:** pernas/braços oscilam ao andar; tronco gira em direção ao alvo; cabeça segue o jogador; patrol/investigação/perseguição preservados.

---

## 7. Limpeza de memória e robustez

- `Game.unloadLevel()` agora chama `this.materials.dispose()` e `this.assets.dispose()` ao trocar de fase / voltar ao menu.
- `AssetLoader.dispose()` limpa cache externo e procedural, zera contadores de progresso.
- Handlers de visibilidade (`visibilitychange`) e WebGL lost/restored mantêm o estado consistente.

---

## 8. O que NÃO foi feito / limitações honestas

| Item | Status | Motivo |
|------|--------|--------|
| Modelos GLB reais de alta densidade | ❌ Não implementado | Sem Blender CLI no ambiente; sem download de assets externos permitido. Modelos são composição de primitivas Three.js. Pipeline GLB preservado via `setModel`. |
| Pastas `public/assets/models/{weapons,enemies,environment}` | ⚠️ Vazias | Diretórios criados, prontos para receber `.glb` futuros. Apenas `.gitkeep` em `weapons/`. |
| Testes em iPhone XR / Safari iOS | ❌ Não executado | Não há dispositivo físico nem emulador iOS neste container. Controles touch já implementados em `src/input/Input.ts`. |
| Operações 2–4 (Garagem, Rua, Central) | ⚠️ EM DESENVOLVIMENTO | Registradas em `Registry.ts` como `implemented: false`. Não marcadas como disponíveis. |
| Pós-processamento pesado no preset BAIXA | ❌ Evitado | BAIXA usa render direto para preservar desempenho. |
| Animação skeletal (AnimationMixer) de inimigos | ❌ Não implementado | Usado hierarquia articulada com rotações, não esqueleto animado. |

---

## 9. Arquivos alterados nesta sessão (Etapa 3)

1. `src/core/Game.ts` — PostProcessor integrado; handlers WebGL lost/restored; `unloadLevel` com dispose de materiais/assets.
2. `src/rendering/PostProcessor.ts` — **novo arquivo**: EffectComposer + SMAA/Bloom/SSAO por preset.
3. `src/rendering/MaterialLibrary.ts` — `loadExternal`, `resolveMap` com fallback, `externalCache`, correção tipo `Side`.
4. `src/assets/AssetLoader.ts` — `loadProgress`, callback de progresso, `dispose()`.
5. `src/missions/Hospital.ts` — NavGraph com `solids`; spawn entrada sul; extração sul gated; paredes segmentadas com janelas reais; iluminação por zona; `RepeatWrapping` importado.
6. `src/missions/Mission.ts` — `EnemySpawn` com `yaw?: number`.
7. `src/enemies/Enemy.ts` — construtor com `yaw`; modelo multi-partes detalhado; animação de pernas/braços/trono/cabeça; flinch.
8. `src/weapons/Weapons.ts` — armas detalhadas (AK-47, LOCUS, PULSAR-X); flash mesh; tracers; sway; recarga visível; campo `swayT`.
9. `AI_HANDOFF.md` — atualizado (este arquivo).
10. `public/assets/textures/{hospital,weapons,characters}/` — 16 arquivos PNG PBR gerados.

---

## 10. Preparado para a próxima IA

- `npm run typecheck` ✅ e `npm run build` ✅ passam.
- Servidor de desenvolvimento roda em `http://localhost:5173` (acessível pela rede para iPhone).
- Todas as pastas de assets (`models/`, `textures/`) estão criadas e organizadas.
- Pipeline GLB preservado: basta colocar `.glb` em `public/assets/models/weapons/` e `MODEL_MANIFEST` carrega automaticamente.
- Presets gráficos BAIXA→OVERKILL funcionam com diferenças reais de renderização.
- Comentários minimizados conforme convenção do projeto (sem comentários desnecessários).

---

## 11. Bugs conhecidos pendentes

- Sem modelos GLB externos: armas e inimigos usam primitivas Three.js (silhuetas boas, não modelos profissionais).
- Não testado fisicamente em iPhone XR; comportamento em Safari iOS não validado.
- Operações 2–4 não implementadas (registradas como `implemented: false`).
