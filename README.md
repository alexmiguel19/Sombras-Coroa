# Sombras sobre a Coroa

Jogo educativo em 3D (Three.js) para alunos do 7.º ano: compreender as causas da crise dinástica de 1383-1385, as três Guerras Fernandinas e o Tratado de Salvaterra de Magos.

O jogador é o escudeiro e mensageiro de D. Fernando I. O guião completo está em [docs/guiao.md](docs/guiao.md).

## Correr o jogo

Requer [Node.js](https://nodejs.org/) 20 ou mais recente.

```bash
npm install
npm run dev        # servidor de desenvolvimento em http://localhost:5173
npm run build      # versão final estática em dist/
npm run preview    # testar a versão final
```

A pasta `dist/` pode ser publicada em qualquer servidor estático (por exemplo, GitHub Pages).

## Controlos

| Ação | Tecla |
|---|---|
| Andar | WASD ou setas |
| Correr | Shift |
| Rodar a câmara | arrastar o rato |
| Aproximar/afastar a câmara | roda do rato |
| Interagir / avançar diálogo | E, Espaço ou clique |

## Estrutura

```
src/
  engine/        motor: ciclo do jogo, entrada, câmara 3.ª pessoa, colisões, interações
  world/         personagens low-poly e texturas geradas em canvas
  ui/            interface HTML: missão, diálogos, ecrãs, minijogo do mapa
  story/         textos do guião em JSON (um ficheiro por cena), editáveis sem programar
  levels/        cenas jogáveis (cenário 3D + sequência de missões)
docs/guiao.md    guião original
```

### Editar textos

Os diálogos, objetivos e mensagens de cada cena estão em `src/story/cenarioN/cenaM.json`.
As falas marcadas com `"adicionada": true` não estão no guião original — foram acrescentadas para ligar a ação e devem ser revistas.

## Estado

| Cena | Estado |
|---|---|
| 1.º Cenário · Cena 1 — No Paço Real (1369) | ✅ jogável |
| 1.º Cenário · Cenas 2–3 | por fazer |
| 2.º Cenário · Cenas 1–3 | por fazer |
| 3.º Cenário · Cenas 1–3 e Epílogo | por fazer |
