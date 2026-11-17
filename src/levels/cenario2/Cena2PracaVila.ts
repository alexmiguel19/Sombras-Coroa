import * as THREE from 'three';
import type { Game, Level } from '../../engine/Game';
import { castNpc } from '../../world/cast';
import { stoneFloor, tentCloth } from '../../world/textures';
import { animateMarker, banner, barrel, crate, house, marker } from '../../world/props';
import { runParchmentChallenge } from '../../ui/ParchmentChallenge';
import { escapeHtml } from '../../ui/UI';
import texto from '../../story/cenario2/cena2.json';
import type { CenaTexto } from '../../story/types';

const T = texto as CenaTexto;

const HALF = 16; // a praça tem 32 x 32 m
const MESSENGER = new THREE.Vector3(5.5, 0, -3);
const COMMANDER = new THREE.Vector3(0, 0, -11.6);

/**
 * 2.º Cenário · Cena 2 — Na praça da vila (1372).
 * Missões: falar com o mensageiro inglês → ler o pergaminho do Tratado de Tagilde → entregá-lo ao comandante.
 */
export class Cena2PracaVila implements Level {
  private time = 0;
  private marker!: THREE.Mesh;
  private markerY = 2.7;

  build(game: Game): void {
    const { scene, world } = game;
    scene.background = new THREE.Color(0xbcd2e2);
    scene.fog = new THREE.Fog(0xbcd2e2, 30, 90);

    scene.add(new THREE.HemisphereLight(0xe4eef6, 0x6a5a40, 1.0));
    const sun = new THREE.DirectionalLight(0xfff0d0, 2.0);
    sun.position.set(-12, 26, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 70;
    sun.shadow.bias = -0.0006;
    scene.add(sun);

    // ---------- Chão empedrado ----------
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ map: stoneFloor([30, 30]), roughness: 0.95, color: 0xd8cdb8 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // ---------- Casas à volta da praça ----------
    const place = (x: number, z: number, rot: number, w: number, d: number, h: number) => {
      const hs = house(w, d, h);
      hs.position.set(x, 0, z);
      hs.rotation.y = rot;
      scene.add(hs);
      const sideways = Math.abs(Math.sin(rot)) > 0.5;
      world.addRect(x, z, sideways ? d : w, sideways ? w : d);
      world.occluders.push(hs);
    };
    for (const x of [-12, -6.5, 6.5, 12]) place(x, -HALF, 0, 5, 5, 4.2);
    for (const x of [-12, -6, 6, 12]) place(x, HALF, Math.PI, 5, 5, 4);
    for (const z of [-9, -2, 5, 11]) {
      place(-HALF, z, Math.PI / 2, 5.5, 5, 4 + (z % 3 === 0 ? 0.6 : 0));
      place(HALF, z, -Math.PI / 2, 5.5, 5, 4.2);
    }
    // Casa da câmara (maior, com estandartes)
    const hall = house(8, 6, 6);
    hall.position.set(0, 0, -HALF - 0.5);
    scene.add(hall);
    world.addRect(0, -HALF - 0.5, 8, 6);
    world.occluders.push(hall);
    for (const x of [-3, 3]) {
      const b = banner('portugal', 4);
      b.position.set(x, 0, -HALF + 3);
      scene.add(b);
      world.addRect(x, -HALF + 3, 0.3, 0.3);
    }
    // Rua de saída a sul (por onde se chega), fechada mais à frente
    world.addRect(0, HALF + 4, 8, 1);
    world.addRect(-HALF - 3, 0, 1, 40);
    world.addRect(HALF + 3, 0, 1, 40);
    world.addRect(0, -HALF - 5, 40, 1);

    // ---------- Chafariz no centro ----------
    const stone = new THREE.MeshStandardMaterial({ color: 0xb0a690, roughness: 0.9, flatShading: true });
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.7, 10), stone);
    basin.position.y = 0.35;
    const water = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.05, 10), new THREE.MeshStandardMaterial({ color: 0x4a86a0, roughness: 0.2 }));
    water.position.y = 0.66;
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 1.8, 8), stone);
    column.position.y = 1.2;
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.3, 0.3, 8), stone);
    bowl.position.y = 2.1;
    for (const m of [basin, water, column, bowl]) { m.castShadow = m.receiveShadow = true; scene.add(m); }
    world.addRect(0, 0, 3.4, 3.4);

    // ---------- Bancas de mercado ----------
    for (const [x, z, stripe] of [[-9, -5, '#8c1c1c'], [-9, 4, '#1f3c8c'], [10, 6, '#3d4a2a']] as const) {
      scene.add(this.stall(x, z, stripe));
      world.addRect(x, z, 1.4, 2.4); // a banca está rodada 90°
    }
    for (const [x, z, k] of [[-11, -7, 'c'], [-11.2, 6, 'b'], [11.5, 8.2, 'c'], [9, -9, 'b'], [9.8, -9.6, 'c']] as const) {
      const p = k === 'c' ? crate() : barrel();
      p.position.x = x;
      p.position.z = z;
      scene.add(p);
      world.addRect(x, z, 0.9, 0.9);
    }

    // ---------- Personagens ----------
    // Mensageiro inglês: túnica branca com a cruz vermelha de São Jorge.
    game.addNpc('mensageiro', castNpc({ tunic: 0xeeeae0, legs: 0x3a3a50, cross: 0xc01818, cape: 0x2a3a6a, hat: 0x2a2a3a, hair: 0xc89a50 }), MESSENGER.x, 0, MESSENGER.z, -0.8);
    game.addNpc('comandante', castNpc({ tunic: 0x4a4a52, legs: 0x2a2a2a, helmet: true, cape: 0x8c1c1c, cross: 0xb01e1e, beard: 0x3a2a1a }), COMMANDER.x, 0, COMMANDER.z, 0);
    for (const x of [-2.2, 2.2]) {
      game.addNpc('guarda', castNpc({ tunic: 0x6b6b6b, legs: 0x3a3a3a, helmet: true, spear: true, cross: 0xb01e1e }), x, 0, COMMANDER.z - 0.6, 0, false);
    }
    const folk: [number, number, number, number][] = [[-7.5, -3.2, 0x8a6a3a, 1.4], [-6.8, 5.5, 0xa04a4a, 2.2], [8.4, 4, 0x5d6b4a, -1.6], [3, 7, 0x7a5a30, 2.8]];
    for (const [x, z, tunic, rot] of folk) {
      game.addNpc('campones', castNpc({ tunic, legs: 0x4a3a2a, hat: 0x9a8040, hair: 0x4a3020 }), x, 0, z, rot);
      game.addInteractable({
        id: 'aldeao', label: 'Falar com o aldeão', position: new THREE.Vector3(x, 0, z), radius: 1.8,
        onInteract: () => game.talk(T.dialogos.aldeao, { campones: game.npcs.find((n) => n.character.root.position.x === x) }),
      });
    }

    game.addInteractable({ id: 'mensageiro', label: 'Falar com o mensageiro', position: MESSENGER.clone(), radius: 2.4 });
    game.addInteractable({
      id: 'comandante', label: 'Falar com o comandante', position: COMMANDER.clone(), radius: 2.6,
      onInteract: () => game.talk(T.dialogos.comandante_espera),
    });

    this.marker = marker();
    this.marker.position.set(MESSENGER.x, 2.7, MESSENGER.z);
    scene.add(this.marker);

    game.player.spawn(0, HALF + 1.5, Math.PI);
  }

  async run(game: Game): Promise<void> {
    const { ui } = game;
    ui.showHud(false);
    await game.busyWith(() =>
      ui.card(
        `<div class="date">${escapeHtml(`2.º Cenário · ${T.data}`)}</div>
         <h1>${escapeHtml(T.local)}</h1>
         <p class="small">${escapeHtml(T.subtitulo)}</p>
         <p class="quote"><strong>Narrador:</strong> ${escapeHtml(T.narrador)}</p>`,
        'Entrar na praça',
      ),
    );
    ui.showHud(true);

    // 1) Falar com o mensageiro inglês
    ui.setObjective(T.objetivos.mensageiro);
    await game.waitFor('mensageiro');
    await game.talk(T.dialogos.mensageiro);
    const pickUp = game.player.character.playOnce;
    if (pickUp) await game.busyWith(() => pickUp.call(game.player.character, 'PickUp'));
    ui.toast(T.textos.toast_pergaminho);
    await game.busyWith(() => runParchmentChallenge(ui.overlayElement, T.desafio!));
    game.interactables.find((i) => i.id === 'mensageiro')!.onInteract = () => game.talk(T.dialogos.mensageiro_depois);

    // 2) Entregar o pergaminho ao comandante
    game.interactables.find((i) => i.id === 'comandante')!.onInteract = undefined;
    this.marker.position.set(COMMANDER.x, 0, COMMANDER.z);
    this.markerY = 2.9;
    ui.setObjective(T.objetivos.comandante);
    await game.waitFor('comandante');
    this.marker.visible = false;
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
    this.time += dt;
    if (this.marker.visible) animateMarker(this.marker, this.markerY, this.time);
  }

  /** Banca de mercado com toldo às riscas. */
  private stall(x: number, z: number, stripe: string): THREE.Group {
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9, flatShading: true });
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 1.2), wood);
    table.position.y = 0.45;
    g.add(table);
    for (const [px, pz] of [[-1.05, -0.55], [1.05, -0.55], [-1.05, 0.55], [1.05, 0.55]]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.08), wood);
      post.position.set(px, 1.1, pz);
      g.add(post);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.06, 1.6), new THREE.MeshStandardMaterial({ map: tentCloth(stripe), roughness: 1 }));
    roof.position.y = 2.2;
    roof.rotation.x = 0.15;
    g.add(roof);
    const goods = [0xc0392b, 0xe6b33a, 0x7a9a3a];
    for (let i = 0; i < 5; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 4), new THREE.MeshStandardMaterial({ color: goods[i % 3], flatShading: true }));
      f.position.set(-0.8 + i * 0.4, 1.0, 0.1);
      g.add(f);
    }
    g.position.set(x, 0, z);
    g.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    g.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    return g;
  }
}
