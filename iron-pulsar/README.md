# IRON PULSAR JV TACTICAL

**Etapa 2 (gráficos):** Hospital reconstruído com materiais PBR procedurais, equipamentos multi-parte, armas e inimigos detalhados. Ver `CHANGELOG_ETAPA2.md` e `AI_HANDOFF.md`.

# IRON PULSAR JV TACTICAL — Etapa 1 (fundação)

FPS tático 3D para navegador: TypeScript + Three.js (WebGL2) + Vite. Operação 1 (Hospital) jogável por código; as demais são estruturais.

## Executar
```
npm install
npm run dev        # servidor local (acesse pelo IP da rede para testar no iPhone)
npm run build      # gera dist/ (index.html + assets)
npm run preview    # serve o build
npm run typecheck  # tsc --noEmit (recomendado rodar antes de tudo)
```
Requer Node 18+. Abra via HTTP (não por file://). **Este pacote NÃO foi compilado nem executado** — veja TEST_REPORT.md; rode `npm run typecheck` e corrija eventuais erros de tipos primeiro.

## Controles
PC: WASD mover, mouse olhar, Shift correr, C agachar, Espaço pular, botão esquerdo atirar, direito mirar, R recarregar, Q/roda/1-3 trocar arma, G granada, Esc pausa.
Mobile: joystick à esquerda, arrastar à direita para olhar, botões na tela (FOGO, MIRA, PULO, RECARR, AGACH, CORRER, ARMA, GRAN, II pausa). Use paisagem.

## Missão Hospital
Neutralize os 10 hostis, pegue o disco de dados na Sala de Cirurgia (norte) e volte à zona de extração verde no lobby (sul).

Documentos: AI_HANDOFF.md (guia técnico), TEST_REPORT.md, FEATURES.md.
