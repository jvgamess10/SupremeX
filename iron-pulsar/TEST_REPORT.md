# Relatório de testes
**Ambiente de geração:** sem acesso à rede (npm install impossível), sem Three.js/Vite/navegador. Portanto NÃO houve compilação, nem execução.

## 1. Testado automaticamente (feito)
- Transpilação sintática de 18 arquivos .ts com o compilador TypeScript (transpileModule): 0 erros de sintaxe.
- Verificação de que todos os imports relativos (estáticos e dinâmicos) apontam para arquivos existentes: 0 faltando.

## 2. NÃO testado (nenhum destes foi executado)
`npm install`, `tsc --noEmit` (tipos contra @types/three), `vite build`, dev server, menu, botão Iniciar Operação, Pointer Lock, movimento, colisões, combate, recarga, granadas, IA, objetivos, vitória/derrota, presets/limitador de FPS, controles touch.
Podem existir erros de tipo, de runtime e de balanceamento. Nenhum build de produção foi gerado, por isso não há `dist/`.

## 3. Depende de hardware físico
iPhone XR/Safari (touch, orientação, áudio, desempenho), FPS real em cada preset, GPUs variadas.

## 4. Roteiro manual sugerido (nesta ordem)
1. `npm install && npm run typecheck && npm run dev`  2. Menu aparece; INICIAR OPERAÇÃO carrega o Hospital.  3. Clique captura o mouse; WASD/olhar.  4. Atirar nas 3 armas, mirar, recarregar, trocar.  5. Granada.  6. Inimigos patrulham, detectam e atiram; hitmarker.  7. Pegar kit/munição/disco.  8. Concluir os 3 objetivos e extrair.  9. Morrer (tela de falha).  10. Trocar preset/FPS.  11. Repetir no celular em paisagem.
