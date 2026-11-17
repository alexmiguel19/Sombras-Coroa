import * as THREE from 'three';
import type { Game, Level } from '../../engine/Game';
import { Character } from '../../world/Character';
import { dirt, stoneFloor } from '../../world/textures';
import { animateMarker, banner, barrel, castle, crate, marker } from '../../world/props';
import { runParchmentChallenge } from '../../ui/ParchmentChallenge';
import { escapeHtml } from '../../ui/UI';
import texto from '../../story/cenario2/cena3.json';
import type { CenaTexto } from '../../story/types';

const SANTAREM = texto as CenaTexto;

const SIZE = 36; // pátio do castelo de Santarém
const H = SIZE / 2;
const KING_POS = new THREE.Vector3(0, 0, 3.4);
const ADVISOR_POS = new THREE.Vector3(2.4, 0, 4.4);
const TABLE_POS = new THREE.Vector3(-9, 0, 8);

/**
 * 2.º Cenário · Cena 3 — Em Santarém (1373).
 * Missões: falar com o rei → buscar o pergaminho ao escrivão → identificar as condições da Paz de Santarém → entregá-lo ao rei.
 *
 * O mesmo cenário (pátio de castelo) serve outras cenas de tratado com textos diferentes
 * (ex.: Elvas, 1382): basta passar outro JSON e indicar se há fumo de guerra ao longe.
 */
export class Cena3Santarem implements Level {
  constructor(
    protected T: CenaTexto = SANTAREM,
    private withSmoke = true,
  ) {}

  private time = 0;
  private marker!: THREE.Mesh;
  private markerY = 2.5;
  private smoke: THREE.Mesh[] = [];
  private scroll!: THREE.Object3D;

  build(game: Game): void {
    const { scene, world } = game;
    // Céu enevoado pelo fumo da guerra
    scene.background = new THREE.Color(0xc9c2b4);
    scene.fog = new THREE.Fog(0xc9c2b4, 40, 140);

    scene.add(new THREE.HemisphereLight(0xe6ddd0, 0x5a4a3a, 0.95));
    const sun = new THREE.DirectionalLight(0xffdcb0, 1.8);
    sun.position.set(-14, 24, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 70;
    sun.shadow.bias = -0.0006;
    scene.add(sun);

    // ---------- Chão: pátio de terra e lajes ----------
    const outside = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: 0x8a8a52, roughness: 1 }));
    outside.rotation.x = -Math.PI / 2;
    outside.position.y = -0.02;
    scene.add(outside);
    const yard = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), new THREE.MeshStandardMaterial({ map: dirt([8, 8]), roughness: 1 }));
    yard.rotation.x = -Math.PI / 2;
    yard.receiveShadow = true;
    scene.add(yard);
    const slabs = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshStandardMaterial({ map: stoneFloor([2, 1.5]), roughness: 0.9 }));
    slabs.rotation.x = -Math.PI / 2;
    slabs.position.set(0, 0.01, 4.5);
    slabs.receiveShadow = true;
    scene.add(slabs);

    // ---------- Castelo: muralhas, torres e torre de menagem ----------
    const c = castle(SIZE, 6, 0xb3a88f);
    scene.add(c);
    world.occluders.push(c);
    world.addRect(0, -H, SIZE + 3, 1.2);
    world.addRect(0, H, SIZE + 3, 1.2);
    world.addRect(-H, 0, 1.2, SIZE + 3);
    world.addRect(H, 0, 1.2, SIZE + 3);
    for (const x of [-H, H]) for (const z of [-H, H]) world.addRect(x, z, 2.8, 2.8);
    world.addRect(0, 0, 4.2, 4.2); // torre de menagem
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 0.1), new THREE.MeshStandardMaterial({ color: 0x4a2e16 }));
    door.position.set(0, 1.2, 2.05);
    scene.add(door);
    for (const x of [-1.6, 1.6]) {
      const b = banner('portugal', 3.2);
      b.position.set(x, 0, 2.4);
      scene.add(b);
    }
    for (const [x, z] of [[-H, -H], [H, -H], [-H, H], [H, H]]) {
      const b = banner('portugal', 3);
      b.position.set(x, 8.5, z);
      scene.add(b);
    }

    // Mantimentos no pátio
    for (const [x, z, k] of [[10, -10, 'c'], [11, -9, 'b'], [12, -10.5, 'c'], [-12, -11, 'b'], [-11, -12, 'c'], [13, 10, 'b'], [12.2, 11, 'c']] as const) {
      const p = k === 'c' ? crate() : barrel();
      p.position.x = x;
      p.position.z = z;
      scene.add(p);
      world.addRect(x, z, 0.9, 0.9);
    }

    // ---------- Mesa do escrivão ----------
    const wood = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.8, flatShading: true });
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.9), wood);
    top.position.set(TABLE_POS.x, 0.9, TABLE_POS.z);
    scene.add(top);
    for (const [x, z] of [[-0.8, -0.35], [0.8, -0.35], [-0.8, 0.35], [0.8, 0.35]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), wood);
      leg.position.set(TABLE_POS.x + x, 0.45, TABLE_POS.z + z);
      scene.add(leg);
    }
    this.scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 10), new THREE.MeshStandardMaterial({ color: 0xf1e4c4 }));
    this.scroll.rotation.z = Math.PI / 2;
    this.scroll.position.set(TABLE_POS.x, 1.02, TABLE_POS.z + 0.1);
    scene.add(this.scroll);
    world.addRect(TABLE_POS.x, TABLE_POS.z, 2, 1.1);

    // ---------- Fumo de Lisboa, ao longe (sudoeste) ----------
    const smokeMat = new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 1, transparent: true, opacity: 0.55, flatShading: true });
    for (let col = 0; col < (this.withSmoke ? 3 : 0); col++) {
      for (let i = 0; i < 7; i++) {
        const s = new THREE.Mesh(new THREE.IcosahedronGeometry(3 + i * 0.9, 0), smokeMat);
        s.position.set(-50 + col * 9, 4 + i * 5, 70 + col * 6);
        s.userData.base = s.position.clone();
        s.userData.phase = col * 2 + i;
        scene.add(s);
        this.smoke.push(s);
      }
    }

    // ---------- Personagens ----------
    game.addNpc('fernando', new Character({ tunic: 0x8c1c1c, legs: 0x3a1010, cape: 0x1f3c8c, crown: true, beard: 0x5a3a1a, hair: 0x5a3a1a }), KING_POS.x, 0, KING_POS.z, 0);
    game.addNpc('conselheiro', new Character({ tunic: 0x3d4a2a, legs: 0x2a2a20, hat: 0x2a1f14, beard: 0xb8b0a0, hair: 0xb8b0a0 }), ADVISOR_POS.x, 0, ADVISOR_POS.z, -0.4);
    game.addNpc('escrivao', new Character({ tunic: 0x4a3a5a, legs: 0x2a2030, hat: 0x1a1a1a, hair: 0x3a2a1a }), TABLE_POS.x, 0, TABLE_POS.z - 1.2, 0);
    for (const [x, z, r] of [[-H + 3, 12, 1.6], [H - 3, -4, -1.6], [-5, -12, 0]] as const) {
      game.addNpc('guarda', new Character({ tunic: 0x6b6b6b, legs: 0x3a3a3a, helmet: true, spear: true, cross: 0xb01e1e }), x, 0, z, r, false);
    }

    game.addInteractable({ id: 'rei', label: 'Falar com D. Fernando', position: new THREE.Vector3(KING_POS.x, 0, KING_POS.z + 1.6), radius: 2.4 });
    game.addInteractable({
      id: 'conselheiro', label: 'Falar com o Conselheiro', position: ADVISOR_POS.clone(), radius: 1.8,
      onInteract: () => game.talk(this.T.dialogos.conselheiro),
    });
    game.addInteractable({ id: 'mesa', label: 'Falar com o escrivão', position: new THREE.Vector3(TABLE_POS.x, 0, TABLE_POS.z + 1.2), radius: 2.0, enabled: false });

    this.marker = marker();
    this.marker.position.set(KING_POS.x, 2.5, KING_POS.z);
    scene.add(this.marker);

    game.player.spawn(0, 14, Math.PI);
  }

  async run(game: Game): Promise<void> {
    const { ui } = game;
    ui.showHud(false);
    await game.busyWith(() =>
      ui.card(
        `<div class="date">${escapeHtml(`${this.T.cenario}.º Cenário · ${this.T.data}`)}</div>
         <h1>${escapeHtml(this.T.local)}</h1>
         <p class="small">${escapeHtml(this.T.subtitulo)}</p>
         <p class="quote"><strong>Narrador:</strong> ${escapeHtml(this.T.narrador)}</p>`,
        'Entrar no castelo',
      ),
    );
    ui.showHud(true);

    // 1) Falar com o rei
    ui.setObjective(this.T.objetivos.falar_rei);
    await game.waitFor('rei');
    await game.talk(this.T.dialogos.rei);

    // 2) Buscar o pergaminho ao escrivão e ler as condições
    const rei = game.interactables.find((i) => i.id === 'rei')!;
    rei.onInteract = () => game.talk(this.T.dialogos.rei_espera);
    const mesa = game.interactables.find((i) => i.id === 'mesa')!;
    mesa.enabled = true;
    this.marker.position.set(TABLE_POS.x, 0, TABLE_POS.z);
    this.markerY = 1.9;
    ui.setObjective(this.T.objetivos.pergaminho);
    await game.waitFor('mesa');
    await game.talk(this.T.dialogos.escrivao);
    const pickUp = game.player.character.playOnce;
    if (pickUp) await game.busyWith(() => pickUp.call(game.player.character, 'PickUp'));
    this.scroll.visible = false;
    ui.toast(this.T.textos.toast_pergaminho);
    await game.busyWith(() => runParchmentChallenge(ui.overlayElement, this.T.desafio!));
    mesa.onInteract = () => game.talk(this.T.dialogos.escrivao_depois);

    // 3) Entregar ao rei
    rei.onInteract = undefined;
    this.marker.position.set(KING_POS.x, 0, KING_POS.z);
    this.markerY = 2.5;
    ui.setObjective(this.T.objetivos.entregar);
    await game.waitFor('rei');
    this.marker.visible = false;
    await game.talk(this.T.dialogos.entrega);

    ui.setObjective(this.T.objetivos.concluida);
    await game.busyWith(() =>
      ui.card(
        `<div class="date">${escapeHtml(this.T.textos.fim_data)}</div>
         <h2>${escapeHtml(this.T.textos.fim_titulo)}</h2>
         <p>${escapeHtml(this.T.textos.fim_texto)}</p>
         <p class="quote">${escapeHtml(this.T.textos.fim_citacao)}</p>`,
        'Continuar',
      ),
    );
  }

  update(dt: number): void {
    this.time += dt;
    if (this.marker.visible) animateMarker(this.marker, this.markerY, this.time);
    for (const s of this.smoke) {
      const b = s.userData.base as THREE.Vector3;
      const k = this.time * 0.4 + s.userData.phase;
      s.position.set(b.x + Math.sin(k) * 1.2 + (b.y - 4) * 0.15, b.y + Math.sin(k * 0.7) * 0.6, b.z);
      s.rotation.y = k * 0.2;
    }
  }
}
