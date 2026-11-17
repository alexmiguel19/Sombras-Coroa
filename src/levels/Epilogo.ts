import * as THREE from 'three';
import type { Game } from '../engine/Game';
import { Cena1PacoReal } from './cenario1/Cena1PacoReal';
import { animateMarker, marker } from '../world/props';
import { runParchmentChallenge } from '../ui/ParchmentChallenge';
import { escapeHtml } from '../ui/UI';
import texto from '../story/epilogo.json';
import type { CenaTexto, DesafioPergaminho } from '../story/types';

const T = texto as CenaTexto & { desafio_final: DesafioPergaminho };

const KING = new THREE.Vector3(0, 0.45, -10.4);
const TABLE = new THREE.Vector3(-4.2, 0, -2.5);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Epílogo — Salvaterra de Magos (1383).
 * Missões: falar com o rei → examinar o pergaminho do tratado → desafio final →
 * o rei sela o tratado, a imagem escurece e os sinos anunciam a morte de D. Fernando.
 */
export class Epilogo extends Cena1PacoReal {
  private mk!: THREE.Mesh;
  private mkY = 3.4;
  private tt = 0;

  build(game: Game): void {
    super.build(game);
    for (const it of game.interactables) {
      if (it.id === 'conselheiro') it.onInteract = () => game.talk(T.dialogos.conselheiro);
      if (it.id === 'guarda') it.onInteract = () => game.talk(T.dialogos.guarda);
      if (it.id === 'mesa') it.label = 'Examinar o pergaminho';
    }
    this.mk = marker();
    this.mk.position.set(KING.x, 0, KING.z);
    game.scene.add(this.mk);
  }

  async run(game: Game): Promise<void> {
    const { ui } = game;
    ui.showHud(false);
    await game.busyWith(() =>
      ui.card(
        `<div class="date">${escapeHtml(`Epílogo · ${T.data}`)}</div>
         <h1>${escapeHtml(T.local)}</h1>
         <p class="small">${escapeHtml(T.subtitulo)}</p>
         <p class="quote"><strong>Narrador:</strong> ${escapeHtml(T.narrador)}</p>`,
        'Entrar no Paço',
      ),
    );
    ui.showHud(true);

    // 1) Falar com o rei
    ui.setObjective(T.objetivos.falar_rei);
    await game.waitFor('rei');
    await game.talk(T.dialogos.rei);
    const rei = game.interactables.find((i) => i.id === 'rei')!;
    rei.onInteract = () => game.talk(T.dialogos.rei_espera);

    // 2) Examinar o pergaminho do tratado
    const mesa = game.interactables.find((i) => i.id === 'mesa')!;
    mesa.enabled = true;
    this.mk.position.set(TABLE.x, 0, TABLE.z);
    this.mkY = 2.1;
    ui.setObjective(T.objetivos.pergaminho);
    await game.waitFor('mesa');
    mesa.enabled = false;
    this.mk.visible = false;
    await game.busyWith(() => runParchmentChallenge(ui.overlayElement, T.desafio!));

    // 3) Final do 3.º cenário e desafio final
    await game.busyWith(() =>
      ui.card(
        `<div class="date">${escapeHtml(T.textos.final3_data)}</div>
         <h2>${escapeHtml(T.textos.final3_titulo)}</h2>
         <p>${escapeHtml(T.textos.final3_texto)}</p>
         <p class="quote">${escapeHtml(T.textos.final3_citacao)}</p>`,
        'Desafio final',
      ),
    );
    ui.setObjective(T.objetivos.desafio_final);
    await game.busyWith(() => runParchmentChallenge(ui.overlayElement, T.desafio_final));

    // 4) As últimas palavras do rei e o selo
    rei.onInteract = undefined;
    rei.enabled = false;
    game.player.spawn(KING.x, KING.z + 3, Math.PI);
    await game.talk(T.dialogos.depois);
    ui.toast(T.textos.selo, 3000);
    const fernando = game.npcs.find((n) => n.id === 'fernando')!;
    fernando.character.talk(2.5);
    await wait(2800);

    // 5) A imagem escurece; 22 de outubro de 1383, os sinos
    ui.setObjective(T.objetivos.concluida);
    await game.busyWith(async () => {
      const o = ui.overlayElement;
      o.innerHTML = '';
      o.classList.add('fade-black');
      o.hidden = false;
      await wait(2600);
      tollBells();
      o.innerHTML = `<div class="ending">
          <div class="date">${escapeHtml(T.textos.morte_data)}</div>
          <p>${escapeHtml(T.textos.morte_texto)}</p>
        </div>`;
      await wait(6000);
      o.classList.remove('fade-black');
    });
    await game.busyWith(() =>
      ui.card(
        `<div class="date">${escapeHtml(T.textos.morte_data)}</div>
         <h2>Sombras sobre a Coroa</h2>
         <p class="quote">${escapeHtml(T.textos.mensagem)}</p>`,
        'Jogar de novo',
      ),
    );
  }

  update(dt: number): void {
    super.update(dt);
    this.tt += dt;
    if (this.mk?.visible) animateMarker(this.mk, this.mkY, this.tt);
  }
}

/** Sinos a dobrar, sintetizados com Web Audio (não precisa de ficheiros de som). */
function tollBells(): void {
  try {
    const ac = new AudioContext();
    for (let i = 0; i < 4; i++) {
      const t = ac.currentTime + i * 1.7;
      for (const [f, g] of [[196, 0.35], [392, 0.18], [466, 0.08], [587, 0.07], [784, 0.04]]) {
        const osc = ac.createOscillator();
        const vol = ac.createGain();
        osc.frequency.value = f;
        vol.gain.setValueAtTime(g, t);
        vol.gain.exponentialRampToValueAtTime(0.0001, t + 4);
        osc.connect(vol).connect(ac.destination);
        osc.start(t);
        osc.stop(t + 4.1);
      }
    }
  } catch {
    // Sem som disponível: o texto no ecrã chega.
  }
}
