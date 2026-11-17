import * as THREE from 'three';
import type { Game } from '../../engine/Game';
import { Cena1PacoReal } from '../cenario1/Cena1PacoReal';
import { castNpc } from '../../world/cast';
import { animateMarker, marker } from '../../world/props';
import { escapeHtml } from '../../ui/UI';
import texto from '../../story/cenario3/cena1.json';
import type { CenaTexto } from '../../story/types';

const T = texto as CenaTexto;

const KING = new THREE.Vector3(0, 0.45, -10.4);
const TABLE = new THREE.Vector3(-4.2, 0, -2.5);
const COMMANDER = new THREE.Vector3(-4.6, 0, 8.6);

/**
 * 3.º Cenário · Cena 1 — No Paço Real (1381).
 * Reaproveita a sala do trono da 1.ª cena, doze anos depois.
 * Missões: falar com o rei → recolher o pergaminho da aliança inglesa → entregá-lo ao comandante militar.
 */
export class Cena1PacoReal1381 extends Cena1PacoReal {
  private marker3!: THREE.Mesh;
  private marker3Y = 3.4;
  private t3 = 0;

  build(game: Game): void {
    super.build(game);
    // Trocar as falas secundárias da sala pelas de 1381
    for (const it of game.interactables) {
      if (it.id === 'conselheiro') it.onInteract = () => game.talk(T.dialogos.conselheiro);
      if (it.id === 'guarda') it.onInteract = () => game.talk(T.dialogos.guarda);
      if (it.id === 'mesa') it.label = 'Recolher o pergaminho';
    }
    game.addNpc('comandante', castNpc({ tunic: 0x4a4a52, legs: 0x2a2a2a, helmet: true, cape: 0x8c1c1c, cross: 0xb01e1e, beard: 0x3a2a1a }), COMMANDER.x, 0, COMMANDER.z, Math.PI / 2);
    game.addInteractable({
      id: 'comandante', label: 'Falar com o comandante', position: COMMANDER.clone(), radius: 2.2,
      onInteract: () => game.talk(T.dialogos.comandante_espera),
    });
    this.marker3 = marker();
    this.marker3.position.set(KING.x, 0, KING.z);
    game.scene.add(this.marker3);
  }

  async run(game: Game): Promise<void> {
    const { ui } = game;
    ui.showHud(false);
    await game.busyWith(() =>
      ui.card(
        `<div class="date">${escapeHtml(`3.º Cenário · ${T.data}`)}</div>
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

    // 2) Recolher o pergaminho na mesa de guerra
    const mesa = game.interactables.find((i) => i.id === 'mesa')!;
    mesa.enabled = true;
    this.marker3.position.set(TABLE.x, 0, TABLE.z);
    this.marker3Y = 2.1;
    ui.setObjective(T.objetivos.mesa);
    await game.waitFor('mesa');
    mesa.enabled = false;
    const pickUp = game.player.character.playOnce;
    if (pickUp) await game.busyWith(() => pickUp.call(game.player.character, 'PickUp'));
    ui.toast(T.textos.toast_pergaminho);

    // 3) Entregar ao comandante militar
    const cmd = game.interactables.find((i) => i.id === 'comandante')!;
    cmd.onInteract = undefined;
    this.marker3.position.set(COMMANDER.x, 0, COMMANDER.z);
    this.marker3Y = 2.9;
    ui.setObjective(T.objetivos.comandante);
    await game.waitFor('comandante');
    this.marker3.visible = false;
    await game.talk(T.dialogos.comandante);

    ui.setObjective(T.objetivos.concluida);
    await game.busyWith(() =>
      ui.card(
        `<div class="date">MISSÃO CONCLUÍDA</div>
         <h2>${escapeHtml(T.textos.fim_titulo)}</h2>
         <p>${escapeHtml(T.textos.fim_texto)}</p>`,
        'Continuar',
      ),
    );
  }

  update(dt: number): void {
    super.update(dt);
    this.t3 += dt;
    if (this.marker3?.visible) animateMarker(this.marker3, this.marker3Y, this.t3);
  }
}
