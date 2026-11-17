# Sombras sobre a Coroa

Jogo educativo de História em 3D, no navegador, para alunos do **7.º ano** (12–13 anos).
Em cerca de **15 minutos**, o aluno acompanha as três Guerras Fernandinas e chega ao Tratado de Salvaterra de Magos, percebendo como se gerou a **crise dinástica de 1383–1385**.

Baseado no rascunho *Ambientes Educativos Digitais em História*; o guião completo está em [docs/guiao.md](docs/guiao.md).

## O jogo

O aluno é o **escudeiro e mensageiro do rei D. Fernando I**. Percorre o Paço Real, acampamentos, vilas e cidades do reino. Fala com o rei, conselheiros, soldados, camponeses e mercadores, e cumpre pequenas missões: levar mensagens, avisar soldados, entregar pergaminhos com as condições dos tratados.

Assim vê de perto as decisões do rei e o impacto das guerras na população.

### Objetivos pedagógicos

No fim do jogo, o aluno deve conseguir explicar:

- porque é que D. Fernando entrou em guerra com Castela três vezes;
- como cada guerra terminou: Tratado de Alcoutim (1371), Paz de Santarém (1373) e Paz de Elvas (1382);
- o papel das alianças (Aragão, Inglaterra) e dos casamentos entre famílias reais na política da época;
- as consequências das guerras para a população: fugas, destruições, bloqueio do Tejo, abusos dos aliados ingleses;
- porque é que o Tratado de Salvaterra de Magos (1383) e a morte de D. Fernando, sem filho varão, puseram em risco a independência de Portugal.

## Estrutura

São três cenários, um por guerra, com cerca de 5 minutos cada, e um epílogo.

### 1.º Cenário — Primeira Guerra Fernandina (1369–1371)

| Cena | Local | Missão |
|---|---|---|
| 1 | No Paço Real (1369): a disputa pelo trono de Castela | Receber uma mensagem e localizar a Galiza num mapa |
| 2 | Na Galiza (1369–1370): a campanha militar e os aliados | Avisar três soldados da retirada e regressar à tenda de comando |
| 3 | O Tratado de Alcoutim (1371) | Entregar ao rei o pergaminho com as condições do tratado |

### 2.º Cenário — Segunda Guerra Fernandina (1372–1373)

| Cena | Local | Missão |
|---|---|---|
| 1 | Às portas de uma vila (1372): o casamento com Leonor Teles quebra o Tratado de Alcoutim | Ajudar os camponeses a entrar na vila e avisar os guardas |
| 2 | Na praça da vila (1372): o Tratado de Tagilde com João de Gante | Recolher o pergaminho da aliança e entregá-lo ao comandante |
| 3 | Em Santarém (1373): a Paz de Santarém | Entregar ao rei o pergaminho com as condições da paz |

### 3.º Cenário — Terceira Guerra Fernandina (1381–1382)

| Cena | Local | Missão |
|---|---|---|
| 1 | No Paço Real (1381): nova guerra, com apoio inglês | Recolher o pergaminho da aliança inglesa e entregá-lo ao comandante |
| 2 | Em Lisboa (1381–1382): o bloqueio do Tejo e os abusos dos aliados | Recolher informações junto de um mercador e de um guarda |
| 3 | Em Elvas (1382): a Paz de Elvas | Entregar ao rei o pergaminho com as condições da paz |

### Epílogo — Salvaterra de Magos (1383)

O aluno examina o pergaminho do tratado e identifica com quem casará D. Beatriz e qual o perigo político dessa união. Segue-se um desafio final, que poderá usar uma imagem real do tratado.

O rei sela o documento e a imagem escurece. A 22 de outubro de 1383, os sinos anunciam a morte de D. Fernando, e o jogo termina com a pergunta: *quem governará Portugal?*

## Estado do desenvolvimento

| Parte | Estado |
|---|---|
| 1.º Cenário · Cena 1 — No Paço Real (1369) | ✅ jogável |
| 1.º Cenário · Cena 2 — Na Galiza (1369–1370) | ✅ jogável |
| 1.º Cenário · Cena 3 — O Tratado de Alcoutim (1371) | ✅ jogável |
| 2.º Cenário · Cena 1 — Às portas de uma vila (1372) | ✅ jogável |
| 2.º Cenário · Cena 2 — Na praça da vila (1372) | ✅ jogável |
| 2.º Cenário · Cena 3 — Em Santarém (1373) | ✅ jogável |
| 3.º Cenário · Cena 1 — No Paço Real (1381) | ✅ jogável |
| 3.º Cenário · Cena 2 — Em Lisboa (1381–1382) | ✅ jogável |
| 3.º Cenário · Cena 3 — Em Elvas (1382) | ✅ jogável |
| Epílogo e desafio final | ✅ jogável |

## Como jogar

| Ação | Tecla |
|---|---|
| Andar | WASD ou setas |
| Correr | Shift |
| Rodar a câmara | arrastar o rato |
| Aproximar/afastar a câmara | roda do rato |
| Interagir / avançar diálogo | E, Espaço ou clique |

A caixa no canto superior esquerdo mostra a missão atual. Um losango dourado assinala com quem falar.

Há dois minijogos: localizar uma região no mapa da Península Ibérica, e ler o pergaminho de um tratado para escolher as condições certas. Uma resposta errada explica porquê, e o aluno pode tentar outra vez.

O jogo é feito para computador com teclado e rato. Não há pontuação nem é possível perder: o aluno avança ao cumprir cada missão.

### Para professores

- Para começar numa cena específica (por exemplo, para retomar uma aula a meio), acrescentar `?cena=N` ao endereço, como em `http://localhost:5173/?cena=2`.
- Os diálogos, missões e mensagens de cada cena estão em `src/story/cenarioN/cenaM.json` e podem ser editados sem programar.
- As falas marcadas com `"adicionada": true` não estão no guião original: foram acrescentadas para ligar a ação e devem ser revistas por um professor de História.

## Correr o jogo

Requer [Node.js](https://nodejs.org/) 20 ou mais recente.

```bash
npm install
npm run dev        # servidor de desenvolvimento em http://localhost:5173
npm run build      # versão final estática em dist/
npm run preview    # testar a versão final
```

A pasta `dist/` pode ser publicada em qualquer servidor estático (por exemplo, GitHub Pages). Não precisa de servidor próprio nem de base de dados.

## Tecnologia

- [Three.js](https://threejs.org/) para o mundo 3D, com câmara em terceira pessoa e colisões simples;
- TypeScript e [Vite](https://vite.dev/);
- interface (missões, diálogos, ecrãs, minijogo do mapa) em HTML e CSS sobre o canvas;
- estilo low-poly, para correr bem nos computadores das escolas.

```
src/
  engine/        motor: ciclo do jogo, entrada, câmara 3.ª pessoa, colisões, interações
  world/         personagens, adereços e texturas geradas em canvas
  ui/            interface HTML: missão, diálogos, ecrãs, minijogo do mapa
  story/         textos do guião em JSON (um ficheiro por cena)
  levels/        cenas jogáveis (cenário 3D + sequência de missões)
docs/guiao.md    guião original
```

## Recursos gráficos e licenças

| Recurso | Autor | Licença |
|---|---|---|
| Escudeiro (`public/models/quaternius/Knight_Male.gltf`), do *Ultimate Animated Character Pack* | [Quaternius](https://quaternius.com/packs/ultimatedanimatedcharacter.html) | CC0 1.0 (ver `LICENSE.txt` na mesma pasta) |

As restantes personagens e o cenário ainda são feitos com formas simples do Three.js. Se um modelo não carregar, o jogo usa automaticamente a versão simples da personagem.
