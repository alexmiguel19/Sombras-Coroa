import { Game } from './engine/Game';
import { Cena1PacoReal } from './levels/cenario1/Cena1PacoReal';
import { preloadModels } from './world/GltfCharacter';
import { MODELS } from './world/cast';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const game = new Game(canvas);
// Em desenvolvimento, `game` fica acessível na consola do browser para testes.
if (import.meta.env.DEV) (window as unknown as { game: Game }).game = game;

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
  await game.play(new Cena1PacoReal());

  // As cenas seguintes ainda estão em desenvolvimento.
  await game.ui.card(
    `<h2>Continua em breve…</h2>
     <p>A próxima cena é <strong>Na Galiza (1369–1370)</strong>: a campanha militar e os aliados.</p>`,
    'Recomeçar',
  );
  location.reload();
}

void start();
