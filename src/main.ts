import { Game, type Level } from './engine/Game';
import { Cena1PacoReal } from './levels/cenario1/Cena1PacoReal';
import { Cena2Galiza } from './levels/cenario1/Cena2Galiza';
import { Cena3Alcoutim } from './levels/cenario1/Cena3Alcoutim';
import { Cena1PortasVila } from './levels/cenario2/Cena1PortasVila';
import { Cena2PracaVila } from './levels/cenario2/Cena2PracaVila';
import { Cena3Santarem } from './levels/cenario2/Cena3Santarem';
import { Cena1PacoReal1381 } from './levels/cenario3/Cena1PacoReal1381';
import { preloadModels } from './world/GltfCharacter';
import { MODELS } from './world/cast';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const game = new Game(canvas);
// Em desenvolvimento, `game` fica acessível na consola do browser para testes.
if (import.meta.env.DEV) (window as unknown as { game: Game }).game = game;

/** Ordem das cenas do jogo. */
const CENAS: { nome: string; criar: () => Level }[] = [
  { nome: 'No Paço Real (1369)', criar: () => new Cena1PacoReal() },
  { nome: 'Na Galiza (1369–1370)', criar: () => new Cena2Galiza() },
  { nome: 'O Tratado de Alcoutim (1371)', criar: () => new Cena3Alcoutim() },
  { nome: 'Às portas de uma vila (1372)', criar: () => new Cena1PortasVila() },
  { nome: 'Na praça da vila (1372)', criar: () => new Cena2PracaVila() },
  { nome: 'Em Santarém (1373)', criar: () => new Cena3Santarem() },
  { nome: 'No Paço Real (1381)', criar: () => new Cena1PacoReal1381() },
];

/**
 * `?cena=2` no endereço começa diretamente na cena 2 — útil para testar
 * e para o professor retomar uma aula a meio.
 */
function cenaInicial(): number {
  const n = Number(new URLSearchParams(location.search).get('cena'));
  return Number.isInteger(n) && n >= 1 && n <= CENAS.length ? n - 1 : 0;
}

async function start(): Promise<void> {
  // Os modelos 3D carregam enquanto o jogador lê o ecrã inicial.
  const loading = preloadModels(Object.values(MODELS));
  await game.ui.card(
    `<h1>Sombras sobre a Coroa</h1>
     <p>És o escudeiro e mensageiro do rei D. Fernando I.</p>
     <p>Leva as mensagens do rei, observa o que acontece no reino e descobre como as três Guerras Fernandinas
        conduziram à crise de 1383–1385.</p>
     <p class="small">WASD ou setas para andar · Shift para correr · arrastar o rato para rodar a câmara · E para interagir</p>`,
    'Começar',
  );
  await loading;

  for (let i = cenaInicial(); i < CENAS.length; i++) {
    await game.play(CENAS[i].criar());
  }

  // As cenas seguintes ainda estão em desenvolvimento.
  await game.ui.card(
    `<h2>Continua em breve…</h2>
     <p>A seguir: <strong>Em Lisboa (1381–1382)</strong> — o bloqueio do Tejo.</p>`,
    'Recomeçar',
  );
  location.href = location.pathname;
}

void start();
