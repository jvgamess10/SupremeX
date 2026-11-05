# Comparação Visual — Etapa 1 vs Etapa 2

> Capturas reais de runtime não foram possíveis neste ambiente (npm install / browser headless limitados).
> A comparação abaixo descreve o **antes/depois estrutural** implementado no código.

## Hospital — Corredores e salas

| Aspecto | Etapa 1 | Etapa 2 |
|---------|---------|---------|
| Paredes | BoxGeometry simples, cor plana | Espessura real + rodapé, textura procedural de pintura com desgaste + normal map |
| Piso | Plane + tiles 128px básicos | Tiles 512px com rejunte, variação de cor, sujeira e normal map |
| Camas | Um único box | Frame metálico, colchão, grades laterais, cabeceira, travesseiro, pernas |
| Equipamentos | Caixas genéricas | IV stands, monitores com tela emissiva, cadeiras, armários com maçaneta, lixeiras |
| Iluminação | Poucas PointLights | Fluorescentes emissivas + grade de PointLights + key Directional afinada |
| Portas | Aberturas sem batente | Batentes metálicos detalhados |
| Janelas | Ausentes | Painéis de vidro transparente |

## Armas

| Arma | Etapa 1 | Etapa 2 |
|------|---------|---------|
| AK-47 | 6 boxes/cyls básicos | Receptor, dust cover, cano, gas tube, handguard madeira, mag inclinada, grip, stock, mira, muzzle |
| LOCUS | 5 partes | Cano longo, luneta com lentes, freio, bipé, stock tático |
| PULSAR-X | 5 partes + glow | Corpo, faixas emissivas, núcleo, painéis, vents, battery pack |

## Inimigos

| Etapa 1 | Etapa 2 |
|---------|---------|
| 3–5 boxes (pernas, torso, cabeça, capacete, arma) | Pernas separadas + botas, torso + colete, braços, cabeça + capacete, mochila, rifle, bolsos |

## Presets

Diferença BAIXA ↔ OVERKILL continua controlando: renderScale, shadows, shadowMapSize, particleScale, viewDistance, maxDynamicLights, anisotropy, antialias.

## Nota
A diferença é perceptível **mesmo com pós-processamento desligado**, porque a geometria e os mapas de material mudaram, não apenas exposição/bloom.
