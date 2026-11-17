# Como jogar — *Sombras sobre a Coroa*

## A tua missão

És o **escudeiro e mensageiro do rei D. Fernando I**, entre 1369 e 1383.
Vais levar mensagens, falar com reis, conselheiros, soldados e camponeses, e entregar os pergaminhos dos tratados.
No fim, vais perceber porque é que Portugal entrou numa grave crise em 1383.

O jogo demora cerca de **15 minutos**. Não há pontos e não se perde: avança-se ao cumprir cada missão.

## Controlos

| Ação | Tecla |
|---|---|
| Andar | **W A S D** ou setas |
| Correr | **Shift** (manter carregado) |
| Rodar a câmara | arrastar o rato com o botão carregado |
| Aproximar / afastar a câmara | roda do rato |
| Falar / interagir | **E** |
| Avançar o diálogo | **E**, **Espaço**, **Enter** ou clique |

## O que vês no ecrã

- **Missão** (canto superior esquerdo): diz-te sempre o que fazer a seguir. Lê-a quando não souberes para onde ir.
- **Losango dourado** a flutuar: marca a pessoa ou o objeto da missão.
- **Aviso `E`** (em baixo, ao centro): aparece quando estás perto de alguém com quem podes falar. Carrega em **E**.
- **Caixa de diálogo**: mostra quem fala. Carrega em **Espaço** para ler a frase seguinte.
- Podes falar com outras personagens (guardas, aldeões, conselheiro): têm informações extra.

## Os minijogos

- **Mapa**: clica na região certa do mapa da Península Ibérica. Se errares, o jogo diz-te que região escolheste e dá uma pista.
- **Pergaminho**: lê o tratado e escolhe as afirmações verdadeiras. Se errares, a opção abana e aparece a explicação. Tenta outra vez!

## O percurso

### 1.º Cenário — Primeira Guerra Fernandina (1369–1371)
1. **No Paço Real (1369)** — fala com o rei, recebe a mensagem do Conselheiro e encontra a Galiza no mapa.
2. **Na Galiza (1369–1370)** — avisa três soldados da retirada e regressa à tenda de comando.
3. **O Tratado de Alcoutim (1371)** — vai buscar o pergaminho ao escrivão, junto ao rio Guadiana, e entrega-o ao rei.

### 2.º Cenário — Segunda Guerra Fernandina (1372–1373)
4. **Às portas de uma vila (1372)** — ajuda três camponeses a entrar na vila e avisa o capitão da guarda.
5. **Na praça da vila (1372)** — fala com o mensageiro inglês e leva o pergaminho da aliança ao comandante.
6. **Em Santarém (1373)** — entrega ao rei as condições da Paz de Santarém.

### 3.º Cenário — Terceira Guerra Fernandina (1381–1382)
7. **No Paço Real (1381)** — recolhe o pergaminho da aliança inglesa e entrega-o ao comandante.
8. **Em Lisboa (1381–1382)** — recolhe informações junto de um mercador e de um guarda.
9. **Em Elvas (1382)** — entrega ao rei as condições da Paz de Elvas.

### Epílogo — Salvaterra de Magos (1383)
Examina o tratado, responde ao **desafio final** e assiste ao fim do reinado de D. Fernando.

## Dicas

- Perdido? Lê a **missão** no canto e procura o **losango dourado**.
- Se uma parede tapar a vista, arrasta o rato para rodar a câmara.
- Lê os diálogos com atenção: as respostas dos pergaminhos estão no que as personagens dizem.

---

## Para o professor

**Como abrir o jogo**

```bash
npm install
npm run dev
```

Abrir `http://localhost:5173` no navegador (Chrome, Edge ou Firefox, num computador com teclado e rato).
Também se pode publicar a pasta `dist/` (gerada com `npm run build`) num servidor estático, como o GitHub Pages, e partilhar o link.

**Começar numa cena específica** — acrescentar `?cena=N` ao endereço (por exemplo `http://localhost:5173/?cena=4`):

| N | Cena | N | Cena |
|---|---|---|---|
| 1 | No Paço Real (1369) | 6 | Em Santarém (1373) |
| 2 | Na Galiza (1369–1370) | 7 | No Paço Real (1381) |
| 3 | Tratado de Alcoutim (1371) | 8 | Em Lisboa (1381–1382) |
| 4 | Às portas de uma vila (1372) | 9 | Em Elvas (1382) |
| 5 | Na praça da vila (1372) | 10 | Epílogo — Salvaterra de Magos (1383) |

**Soluções dos desafios**

| Desafio | Respostas certas |
|---|---|
| Mapa (cena 1) | Galiza |
| Tratado de Alcoutim | D. Fernando renuncia ao trono de Castela · casará com Leonor, filha de Henrique II |
| Tratado de Tagilde | aliança com João de Gante, duque de Lencastre · inimigo comum: Henrique II |
| Paz de Santarém | Portugal abandona a aliança inglesa · aceita condições desfavoráveis |
| Paz de Elvas | fim da guerra · D. Beatriz casará com o infante D. Fernando, filho de Juan I |
| Salvaterra de Magos | D. Beatriz casará com Juan I · perigo de Portugal perder a independência |
| Desafio final | Alcoutim (1371), Santarém (1373) e Elvas (1382) |

**Perguntas para discussão depois do jogo**
- Porque é que D. Fernando entrou em guerra com Castela três vezes? Alguma correu bem?
- Que papel tiveram os casamentos reais nos tratados de paz?
- Os aliados ingleses ajudaram sempre a população? Porquê?
- Porque é que a morte de D. Fernando, em 1383, deixou Portugal em perigo?
