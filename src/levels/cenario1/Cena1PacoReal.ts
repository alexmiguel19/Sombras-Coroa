import * as THREE from 'three';
import type { Game, Level } from '../../engine/Game';
import { Character } from '../../world/Character';
import { carpet, royalBanner, stoneFloor, stoneWall, tableMap } from '../../world/textures';
import { runMapChallenge } from '../../ui/MapChallenge';
import { escapeHtml } from '../../ui/UI';
import texto from '../../story/cenario1/cena1.json';
import type { CenaTexto } from '../../story/types';

const T = texto as CenaTexto;

// Dimensões da sala do trono (metros)
const W = 16; // largura (X)
const L = 26; // comprimento (Z)
const H = 7; // altura das paredes

const KING_POS = new THREE.Vector3(0, 0.45, -10.4);
const ADVISOR_POS = new THREE.Vector3(2.4, 0, -8.4);
const TABLE_POS = new THREE.Vector3(-4.2, 0, -2.5);

/**
 * 1.º Cenário · Cena 1 — No Paço Real (1369).
 * Missões: falar com D. Fernando → receber a mensagem do Conselheiro → localizar a Galiza no mapa.
 */
export class Cena1PacoReal implements Level {
  private torches: { light: THREE.PointLight; flame: THREE.Mesh; base: number }[] = [];
  private time = 0;

  build(game: Game): void {
    const { scene, world } = game;
    scene.background = new THREE.Color(0x120d08);
    scene.fog = new THREE.Fog(0x120d08, 18, 42);

    // ---------- Luz ----------
    scene.add(new THREE.HemisphereLight(0xc9b48f, 0x2a1d10, 0.55));
    const sun = new THREE.DirectionalLight(0xffe2b0, 1.6);
    sun.position.set(-10, 14, 4);
    sun.target.position.set(0, 0, -2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera;
    sc.left = -12; sc.right = 12; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 40;
    sun.shadow.bias = -0.0008;
    scene.add(sun, sun.target);

    // ---------- Chão, tapete e paredes ----------
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(W, L),
      new THREE.MeshStandardMaterial({ map: stoneFloor([W / 4, L / 4]), roughness: 0.9 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 19), new THREE.MeshStandardMaterial({ map: carpet(), roughness: 1 }));
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.01, 1.2);
    rug.receiveShadow = true;
    scene.add(rug);

    const wallMat = new THREE.MeshStandardMaterial({ map: stoneWall([4, 2]), roughness: 0.95 });
    const sideMat = new THREE.MeshStandardMaterial({ map: stoneWall([6, 2]), roughness: 0.95 });
    const addWall = (w: number, d: number, x: number, z: number, m: THREE.Material) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), m);
      wall.position.set(x, H / 2, z);
      wall.receiveShadow = true;
      wall.castShadow = true;
      scene.add(wall);
      world.addFromObject(wall);
      world.occluders.push(wall);
    };
    addWall(W + 1, 0.5, 0, -L / 2, wallMat); // fundo (trono)
    addWall(W + 1, 0.5, 0, L / 2, wallMat); // entrada
    addWall(0.5, L, -W / 2, 0, sideMat); // esquerda
    addWall(0.5, L, W / 2, 0, sideMat); // direita

    // Janelas altas (luz entra pela parede esquerda)
    const glass = new THREE.MeshStandardMaterial({ color: 0xffe6b0, emissive: 0xffd28a, emissiveIntensity: 1.2 });
    for (const z of [-7, -1, 5]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.6), glass);
      win.position.set(-W / 2 + 0.26, 4.4, z);
      win.rotation.y = Math.PI / 2;
      scene.add(win);
      const arch = new THREE.Mesh(new THREE.CircleGeometry(0.6, 12, 0, Math.PI), glass);
      arch.position.set(-W / 2 + 0.26, 5.7, z);
      arch.rotation.y = Math.PI / 2;
      scene.add(arch);
    }

    // Porta de entrada
    const door = new THREE.Mesh(new THREE.BoxGeometry(3, 4.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x4a2e16, roughness: 0.8 }));
    door.position.set(0, 2.1, L / 2 - 0.3);
    scene.add(door);

    // ---------- Colunas com tochas ----------
    const colMat = new THREE.MeshStandardMaterial({ color: 0x9c8e78, roughness: 0.9, flatShading: true });
    for (const z of [-8, -3, 2, 7]) {
      for (const x of [-4.8, 4.8]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, H, 10), colMat);
        col.position.set(x, H / 2, z);
        col.castShadow = col.receiveShadow = true;
        scene.add(col);
        world.addRect(x, z, 1, 1);
        world.occluders.push(col);
      }
    }
    // Só 4 luzes pontuais (tochas) para não pesar nos computadores das escolas.
    for (const [x, z] of [[-4.3, -8], [4.3, -8], [-4.3, 2], [4.3, 2]] as const) this.addTorch(scene, x, z);

    // ---------- Estrado e trono ----------
    const dais = new THREE.Mesh(new THREE.BoxGeometry(7, 0.45, 4), new THREE.MeshStandardMaterial({ color: 0x6d5f4c, roughness: 0.9 }));
    dais.position.set(0, 0.225, -10.6);
    dais.receiveShadow = dais.castShadow = true;
    scene.add(dais);
    world.addFromObject(dais);
    const step = new THREE.Mesh(new THREE.BoxGeometry(3, 0.22, 0.6), dais.material);
    step.position.set(0, 0.11, -8.3);
    step.receiveShadow = true;
    scene.add(step);

    const throne = this.buildThrone();
    throne.position.set(0, 0.45, -11.6);
    scene.add(throne);

    // Estandartes reais atrás do trono e nas paredes laterais
    const bannerMat = new THREE.MeshStandardMaterial({ map: royalBanner(), side: THREE.DoubleSide, roughness: 0.9 });
    for (const x of [-3.2, 3.2]) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.2), bannerMat);
      b.position.set(x, 4, -L / 2 + 0.3);
      scene.add(b);
    }
    for (const z of [-5.5, 4.5]) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.8), bannerMat);
      b.position.set(W / 2 - 0.3, 4.2, z);
      b.rotation.y = -Math.PI / 2;
      scene.add(b);
    }

    // ---------- Mesa de guerra com mapa ----------
    const table = this.buildWarTable();
    table.position.copy(TABLE_POS);
    scene.add(table);
    world.addRect(TABLE_POS.x, TABLE_POS.z, 2.6, 1.7);

    // ---------- Personagens ----------
    const fernando = new Character({ tunic: 0x8c1c1c, legs: 0x3a1010, cape: 0x1f3c8c, crown: true, beard: 0x5a3a1a, hair: 0x5a3a1a });
    game.addNpc('fernando', fernando, KING_POS.x, KING_POS.y, KING_POS.z, 0);
    world.addRect(KING_POS.x, KING_POS.z, 1, 1);

    const conselheiro = new Character({ tunic: 0x3d4a2a, legs: 0x2a2a20, hat: 0x2a1f14, beard: 0xb8b0a0, hair: 0xb8b0a0 });
    game.addNpc('conselheiro', conselheiro, ADVISOR_POS.x, ADVISOR_POS.y, ADVISOR_POS.z, -0.4);

    const guard1 = new Character({ tunic: 0x6b6b6b, legs: 0x3a3a3a, helmet: true, spear: true, cross: 0xb01e1e });
    const guard2 = new Character({ tunic: 0x6b6b6b, legs: 0x3a3a3a, helmet: true, spear: true, cross: 0xb01e1e });
    game.addNpc('guarda', guard1, -2.3, 0, 11.2, Math.PI, false);
    game.addNpc('guarda', guard2, 2.3, 0, 11.2, Math.PI, false);

    // ---------- Interações ----------
    game.addInteractable({
      id: 'rei', label: 'Falar com D. Fernando',
      position: new THREE.Vector3(KING_POS.x, 0, KING_POS.z + 2.4), radius: 2.6,
    });
    game.addInteractable({
      id: 'conselheiro', label: 'Falar com o Conselheiro',
      position: ADVISOR_POS.clone(), radius: 2.2,
      onInteract: () => game.talk(T.dialogos.conselheiro_antes),
    });
    game.addInteractable({
      id: 'mesa', label: 'Examinar o mapa', enabled: false,
      position: TABLE_POS.clone(), radius: 2.4,
    });
    for (const x of [-2.3, 2.3]) {
      game.addInteractable({
        id: 'guarda', label: 'Falar com o guarda',
        position: new THREE.Vector3(x, 0, 11.2), radius: 1.8,
        onInteract: () => game.talk(T.dialogos.guarda),
      });
    }

    game.player.spawn(0, 8.5, Math.PI);
  }

  async run(game: Game): Promise<void> {
    const { ui } = game;
    ui.showHud(false);

    await game.busyWith(() =>
      ui.card(
        `<div class="date">${escapeHtml(`1.º Cenário · ${T.data}`)}</div>
         <h1>${escapeHtml(T.titulo)}</h1>
         <p class="small">${escapeHtml(T.subtitulo)}</p>
         <p class="quote"><strong>Narrador:</strong> ${escapeHtml(T.narrador)}</p>`,
        'Entrar no Paço',
      ),
    );

    ui.showHud(true);
    ui.setObjective(T.objetivos.falar_rei);

    // 1) Falar com o rei
    await game.waitFor('rei');
    await game.talk(T.dialogos.rei);

    // 2) Receber a mensagem do Conselheiro
    const rei = game.interactables.find((i) => i.id === 'rei')!;
    rei.onInteract = () => game.talk(T.dialogos.rei_depois);
    const cons = game.interactables.find((i) => i.id === 'conselheiro')!;
    cons.onInteract = undefined;
    ui.setObjective(T.objetivos.falar_conselheiro);
    await game.waitFor('conselheiro');
    await game.talk(T.dialogos.mensagem);
    const pickUp = game.player.character.playOnce;
    if (pickUp) await game.busyWith(() => pickUp.call(game.player.character, 'PickUp'));
    ui.toast(T.textos.toast_mensagem);

    // 3) Localizar a Galiza no mapa
    const mesa = game.interactables.find((i) => i.id === 'mesa')!;
    mesa.enabled = true;
    ui.setObjective(T.objetivos.mapa);
    await game.waitFor('mesa');
    await game.busyWith(() =>
      runMapChallenge(ui.overlayElement, 'galiza', {
        titulo: T.textos.mapa_titulo,
        instrucao: T.textos.mapa_instrucao,
        dica: T.textos.mapa_dica,
        certo: T.textos.mapa_certo,
      }),
    );

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
    // Tremeluzir das tochas
    for (const [i, t] of this.torches.entries()) {
      const f = Math.sin(this.time * 9 + i * 2) * 0.12 + Math.sin(this.time * 23 + i) * 0.08;
      t.light.intensity = t.base * (1 + f);
      t.flame.scale.y = 1 + f * 1.5;
    }
  }

  private addTorch(scene: THREE.Scene, x: number, z: number): void {
    const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.5, 6), new THREE.MeshStandardMaterial({ color: 0x2a1c10 }));
    holder.position.set(x, 2.6, z);
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.35, 6),
      new THREE.MeshBasicMaterial({ color: 0xffb040 }),
    );
    flame.position.set(x, 3.0, z);
    const light = new THREE.PointLight(0xff9a40, 9, 11, 1.6);
    light.position.set(x, 3.2, z);
    scene.add(holder, flame, light);
    this.torches.push({ light, flame, base: light.intensity });
  }

  private buildThrone(): THREE.Group {
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x5a3417, roughness: 0.7, flatShading: true });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.35, flatShading: true });
    const velvet = new THREE.MeshStandardMaterial({ color: 0x7a1414, roughness: 1 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 1.1), wood);
    seat.position.y = 0.25;
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.9), velvet);
    cushion.position.y = 0.56;
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 0.2), wood);
    back.position.set(0, 1.3, -0.5);
    const backVelvet = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.8, 0.05), velvet);
    backVelvet.position.set(0, 1.4, -0.38);
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 4), gold);
    top.position.set(0, 2.85, -0.5);
    g.add(seat, cushion, back, backVelvet, top);
    for (const x of [-0.7, 0.7]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 1.1), wood);
      arm.position.set(x, 0.75, 0);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), gold);
      knob.position.set(x, 1.0, 0.5);
      g.add(arm, knob);
    }
    g.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    return g;
  }

  private buildWarTable(): THREE.Group {
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.8, flatShading: true });
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 1.5), wood);
    top.position.y = 0.95;
    g.add(top);
    for (const [x, z] of [[-1.05, -0.6], [1.05, -0.6], [-1.05, 0.6], [1.05, 0.6]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.12), wood);
      leg.position.set(x, 0.475, z);
      g.add(leg);
    }
    const map = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.3), new THREE.MeshStandardMaterial({ map: tableMap(), roughness: 1 }));
    map.rotation.x = -Math.PI / 2;
    map.position.y = 1.015;
    g.add(map);
    // Velas e marcadores
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 6), new THREE.MeshStandardMaterial({ color: 0xf2ead2 }));
    candle.position.set(1, 1.11, 0.55);
    const marker = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 6), new THREE.MeshStandardMaterial({ color: 0xb01e1e }));
    marker.position.set(-0.55, 1.1, -0.35);
    g.add(candle, marker);
    // Brilho subtil para chamar a atenção
    const glow = new THREE.PointLight(0xffd59a, 2.5, 4, 2);
    glow.position.set(0, 2, 0);
    g.add(glow);
    g.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    return g;
  }
}
