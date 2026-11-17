import * as THREE from 'three';
import type { Game, Level } from '../../engine/Game';
import { castNpc } from '../../world/cast';
import { dirt, grass, tentCloth } from '../../world/textures';
import { animateMarker, banner, barrel, boat, castle, crate, house, marker, tree } from '../../world/props';
import { runParchmentChallenge } from '../../ui/ParchmentChallenge';
import { escapeHtml } from '../../ui/UI';
import texto from '../../story/cenario1/cena3.json';
import type { CenaTexto } from '../../story/types';

const T = texto as CenaTexto;

// O rio Guadiana corre de oeste para este; a margem portuguesa fica a sul (z > RIVER_N).
const RIVER_N = -18; // margem portuguesa
const RIVER_S = -32; // margem castelhana
const WATER_Y = -0.18;

const PAVILION = new THREE.Vector3(0, 0, -3.5);
const KING_POS = new THREE.Vector3(0, 0.3, -4.4);
const ADVISOR_POS = new THREE.Vector3(2.6, 0, -1.4);
const TABLE_POS = new THREE.Vector3(7.5, 0, -13.2);
const SCRIBE_POS = new THREE.Vector3(7.5, 0, -14.5);
const ENVOY_POS = new THREE.Vector3(10.9, 0, -14.6);
const PIER_X = 10.5;

/**
 * 1.º Cenário · Cena 3 — O Tratado de Alcoutim (1371).
 * Missões: falar com o rei no pavilhão → buscar o pergaminho à mesa do escrivão, junto ao rio →
 * identificar as condições do tratado → entregar o pergaminho ao rei.
 */
export class Cena3Alcoutim implements Level {
  private time = 0;
  private water!: THREE.Mesh;
  private waterBase!: Float32Array;
  private marker!: THREE.Mesh;
  private markerY = 0;
  private boatMesh!: THREE.Group;
  private parchmentOnTable!: THREE.Object3D;

  build(game: Game): void {
    const { scene, world } = game;
    scene.background = new THREE.Color(0xb9d4e6);
    scene.fog = new THREE.Fog(0xb9d4e6, 40, 130);

    // ---------- Luz de manhã de primavera ----------
    scene.add(new THREE.HemisphereLight(0xd8ecf8, 0x6a6a3a, 1.0));
    const sun = new THREE.DirectionalLight(0xfff0d2, 2.1);
    sun.position.set(-16, 28, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 90;
    sun.shadow.bias = -0.0006;
    scene.add(sun);

    // ---------- Terreno: duas margens e o rio ----------
    const grassMat = new THREE.MeshStandardMaterial({ map: grass([40, 20]), roughness: 1, color: 0xd8cf9a });
    const ptBank = new THREE.Mesh(new THREE.PlaneGeometry(200, 100), grassMat);
    ptBank.rotation.x = -Math.PI / 2;
    ptBank.position.z = RIVER_N + 50;
    ptBank.receiveShadow = true;
    const csBank = new THREE.Mesh(new THREE.PlaneGeometry(200, 100), grassMat);
    csBank.rotation.x = -Math.PI / 2;
    csBank.position.z = RIVER_S - 50;
    csBank.receiveShadow = true;
    scene.add(ptBank, csBank);

    // Faixas de areia nas margens e leito do rio
    const sandMat = new THREE.MeshStandardMaterial({ map: dirt([30, 1]), roughness: 1, color: 0xe6d2a6 });
    for (const z of [RIVER_N + 1, RIVER_S - 1]) {
      const sand = new THREE.Mesh(new THREE.PlaneGeometry(200, 2.2), sandMat);
      sand.rotation.x = -Math.PI / 2;
      sand.position.set(0, 0.01, z);
      sand.receiveShadow = true;
      scene.add(sand);
    }
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(200, RIVER_N - RIVER_S), new THREE.MeshStandardMaterial({ color: 0x4a5a3a, roughness: 1 }));
    bed.rotation.x = -Math.PI / 2;
    bed.position.set(0, -0.8, (RIVER_N + RIVER_S) / 2);
    scene.add(bed);
    for (const [z, rot] of [[RIVER_N, 1], [RIVER_S, -1]] as const) {
      // Barranco da margem (esconde a diferença de altura entre a erva e a água)
      const bank = new THREE.Mesh(new THREE.PlaneGeometry(200, 0.9), new THREE.MeshStandardMaterial({ color: 0x8a7350, roughness: 1 }));
      bank.position.set(0, -0.4, z);
      bank.rotation.y = rot === 1 ? Math.PI : 0;
      scene.add(bank);
    }

    // Água com ondulação suave (vértices animados em update)
    const waterGeo = new THREE.PlaneGeometry(200, RIVER_N - RIVER_S, 60, 6);
    this.waterBase = Float32Array.from(waterGeo.attributes.position.array as Float32Array);
    this.water = new THREE.Mesh(
      waterGeo,
      new THREE.MeshStandardMaterial({ color: 0x3f7a92, roughness: 0.25, metalness: 0.15, flatShading: true }),
    );
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.set(0, WATER_Y, (RIVER_N + RIVER_S) / 2);
    this.water.receiveShadow = true;
    scene.add(this.water);

    // O rio não se atravessa (só o pontão, a leste)
    world.addRect((-30 + PIER_X - 1) / 2, RIVER_N - 2, PIER_X - 1 + 30, 4);
    world.addRect((PIER_X + 1 + 30) / 2, RIVER_N - 2, 30 - PIER_X - 1, 4);
    world.addRect(0, RIVER_N - 9, 60, 10);
    // Limites da zona jogável
    world.addRect(-29, 6, 1, 50);
    world.addRect(29, 6, 1, 50);
    world.addRect(0, 29, 60, 1);

    // Caminhos de terra: da vila ao pavilhão e do pavilhão ao pontão
    const pathMat = new THREE.MeshStandardMaterial({ map: dirt([2, 8]), roughness: 1 });
    const path1 = new THREE.Mesh(new THREE.PlaneGeometry(3, 26), pathMat);
    path1.rotation.x = -Math.PI / 2;
    path1.position.set(0, 0.012, 13);
    path1.receiveShadow = true;
    const path2 = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 14), pathMat);
    path2.rotation.set(-Math.PI / 2, 0, -0.6);
    path2.position.set(4.6, 0.014, -8.2);
    path2.receiveShadow = true;
    scene.add(path1, path2);

    // ---------- Pontão e barco dos embaixadores ----------
    const wood = new THREE.MeshStandardMaterial({ color: 0x7a5a36, roughness: 0.9, flatShading: true });
    const pier = new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, 6.5), wood);
    pier.position.set(PIER_X, 0.04, RIVER_N - 2.6);
    pier.receiveShadow = pier.castShadow = true;
    scene.add(pier);
    for (const z of [RIVER_N - 1, RIVER_N - 3, RIVER_N - 5.6]) {
      for (const x of [-0.9, 0.9]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.6, 6), wood);
        post.position.set(PIER_X + x, -0.4, z);
        scene.add(post);
      }
    }
    this.boatMesh = boat();
    this.boatMesh.position.set(PIER_X + 2.2, WATER_Y - 0.05, RIVER_N - 4.2);
    this.boatMesh.rotation.y = 0.15;
    scene.add(this.boatMesh);

    // ---------- Pavilhão real ----------
    scene.add(this.buildPavilion());
    const dais = new THREE.Mesh(new THREE.BoxGeometry(5, 0.3, 2.6), new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 }));
    dais.position.set(PAVILION.x, 0.15, PAVILION.z - 1.2);
    dais.receiveShadow = dais.castShadow = true;
    scene.add(dais);
    world.addFromObject(dais);
    const chair = this.buildChair();
    chair.position.set(KING_POS.x, 0.3, KING_POS.z - 0.6);
    scene.add(chair);
    for (const x of [-4.4, 4.4]) {
      const b = banner('portugal', 4);
      b.position.set(x, 0, PAVILION.z + 3);
      scene.add(b);
      world.addRect(x, PAVILION.z + 3, 0.3, 0.3);
    }

    // ---------- Mesa do escrivão, junto ao rio ----------
    const table = this.buildScribeTable();
    table.position.copy(TABLE_POS);
    scene.add(table);
    world.addRect(TABLE_POS.x, TABLE_POS.z, 2.0, 1.1);
    for (const [x, z] of [[12.5, -15], [5, -15.8]] as const) {
      const b = banner('castela', 3.4);
      b.position.set(x, 0, z);
      scene.add(b);
      world.addRect(x, z, 0.3, 0.3);
    }
    const c1 = crate();
    c1.position.set(13.2, 0.4, -12.4);
    const b1 = barrel();
    b1.position.set(13.9, 0.45, -11.4);
    scene.add(c1, b1);
    world.addRect(13.5, -11.9, 1.6, 1.8);

    // ---------- Vila de Alcoutim (margem portuguesa) ----------
    const houses: [number, number, number, number, number][] = [
      [-11, 6, 0.1, 4.5, 3.6], [-16.5, 3, -0.2, 4, 3.4], [-13, 13, 0.25, 5, 3.8], [-20, 10, 0, 3.6, 3.2], [-19, -4, 0.4, 4, 3.6],
      [12, 7, -0.15, 4.4, 3.6], [17.5, 4, 0.2, 4, 3.4], [15, 14, -0.3, 5, 3.6], [21.5, 11, 0, 3.6, 3.2], [20, -4, -0.4, 4, 3.4],
    ];
    for (const [x, z, r, w, d] of houses) {
      const h = house(w, d);
      h.position.set(x, 0, z);
      h.rotation.y = r;
      scene.add(h);
      world.addRect(x, z, w + 0.5, d + 0.5);
      world.occluders.push(h);
    }
    // Castelo de Alcoutim, no alto, atrás da vila
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x8a8a52, roughness: 1, flatShading: true });
    const ptHill = new THREE.Mesh(new THREE.CylinderGeometry(14, 22, 7, 12), hillMat);
    ptHill.position.set(-10, 3.5, 58);
    scene.add(ptHill);
    const ptCastle = castle(14, 5);
    ptCastle.position.set(-10, 7, 58);
    scene.add(ptCastle);
    const ptFlag = banner('portugal', 5);
    ptFlag.scale.setScalar(1.6);
    ptFlag.position.set(-10, 17, 58);
    scene.add(ptFlag);

    // ---------- Sanlúcar, na margem castelhana ----------
    const csHill = new THREE.Mesh(new THREE.CylinderGeometry(13, 21, 9, 12), hillMat);
    csHill.position.set(16, 4.5, -60);
    scene.add(csHill);
    const csCastle = castle(12, 5, 0xa89a80);
    csCastle.position.set(16, 9, -60);
    scene.add(csCastle);
    const csFlag = banner('castela', 5);
    csFlag.scale.setScalar(1.6);
    csFlag.position.set(16, 19, -60);
    scene.add(csFlag);
    for (const [x, z, r] of [[-8, -40, 0.2], [-2, -42, -0.1], [4, -39, 0.3], [-14, -44, 0], [8, -46, -0.2], [26, -42, 0.1]] as const) {
      const h = house(4, 3.4);
      h.position.set(x, 0, z);
      h.rotation.y = Math.PI + r;
      scene.add(h);
    }
    for (const x of [-4, 6]) {
      const b = banner('castela', 4);
      b.position.set(x, 0, RIVER_S - 2);
      b.rotation.y = Math.PI;
      scene.add(b);
    }

    // Colinas do Algarve e da Andaluzia ao longe
    for (const [x, z, r, h] of [[-60, 40, 26, 10], [55, 45, 28, 12], [-55, -70, 30, 12], [60, -75, 26, 9], [0, 80, 30, 9]]) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), hillMat);
      hill.position.set(x, 0, z);
      hill.scale.y = h / r;
      scene.add(hill);
    }

    // ---------- Árvores (oliveiras e azinheiras) ----------
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const treeSpots: [number, number][] = [[-7, 18], [7, 20], [-24, 18], [24, 20], [-25, 0], [25, -10], [-8, -11], [-15, -12], [-23, -13], [18, -13], [5, 4]];
    for (const [x, z] of treeSpots) {
      const t = tree('oak', 0.75 + rnd() * 0.3);
      t.position.set(x, 0, z);
      t.rotation.y = rnd() * 6;
      scene.add(t);
      world.addRect(x, z, 0.6, 0.6);
    }
    for (let i = 0; i < 40; i++) {
      // Fora da zona jogável, nas duas margens
      const x = -70 + rnd() * 140;
      const z = rnd() > 0.5 ? 32 + rnd() * 30 : RIVER_S - 8 - rnd() * 30;
      if (Math.abs(x - 16) < 22 && z < -50) continue; // não tapar o castelo castelhano
      const t = tree(rnd() > 0.6 ? 'pine' : 'oak', 0.8 + rnd() * 0.5);
      t.position.set(x, 0, z);
      scene.add(t);
    }

    // ---------- Personagens ----------
    const fernando = castNpc({ tunic: 0x8c1c1c, legs: 0x3a1010, cape: 0x1f3c8c, crown: true, beard: 0x5a3a1a, hair: 0x5a3a1a });
    game.addNpc('fernando', fernando, KING_POS.x, KING_POS.y, KING_POS.z, 0);
    game.addNpc('conselheiro', castNpc({ tunic: 0x3d4a2a, legs: 0x2a2a20, hat: 0x2a1f14, beard: 0xb8b0a0, hair: 0xb8b0a0 }), ADVISOR_POS.x, 0, ADVISOR_POS.z, -0.5);
    game.addNpc('escrivao', castNpc({ tunic: 0x4a3a5a, legs: 0x2a2030, hat: 0x1a1a1a, hair: 0x3a2a1a }), SCRIBE_POS.x, 0, SCRIBE_POS.z, 0);
    game.addNpc('castelhano', castNpc({ tunic: 0x7a1414, legs: 0x3a1a10, cape: 0xc9a227, hat: 0x5a1010, beard: 0x2a1a10, hair: 0x2a1a10 }), ENVOY_POS.x, 0, ENVOY_POS.z, -0.6);
    for (const x of [-4.2, 4.2]) {
      const guard = castNpc({ tunic: 0x6b6b6b, legs: 0x3a3a3a, helmet: true, spear: true, cross: 0xb01e1e });
      game.addNpc('guarda', guard, PAVILION.x + x, 0, PAVILION.z + 4.2, 0, false);
    }

    // ---------- Interações ----------
    game.addInteractable({ id: 'rei', label: 'Falar com D. Fernando', position: new THREE.Vector3(KING_POS.x, 0, KING_POS.z + 3.2), radius: 2.6 });
    game.addInteractable({
      id: 'conselheiro', label: 'Falar com o Conselheiro', position: ADVISOR_POS.clone(), radius: 2.0,
      onInteract: () => game.talk(T.dialogos.conselheiro),
    });
    game.addInteractable({
      id: 'castelhano', label: 'Falar com o embaixador castelhano', position: ENVOY_POS.clone(), radius: 2.0,
      onInteract: () => game.talk(T.dialogos.castelhano),
    });
    game.addInteractable({ id: 'mesa', label: 'Falar com o escrivão', position: new THREE.Vector3(TABLE_POS.x, 0, TABLE_POS.z + 1.2), radius: 2.0, enabled: false });

    this.marker = marker();
    scene.add(this.marker);
    this.setMarker(KING_POS, 2.45);

    game.player.spawn(0, 14, Math.PI);
  }

  async run(game: Game): Promise<void> {
    const { ui } = game;
    ui.showHud(false);
    await game.busyWith(() =>
      ui.card(
        `<div class="date">${escapeHtml(`1.º Cenário · ${T.data}`)}</div>
         <h1>${escapeHtml(T.local)}</h1>
         <p class="small">${escapeHtml(T.subtitulo)}</p>
         <p class="quote"><strong>Narrador:</strong> ${escapeHtml(T.narrador)}</p>`,
        'Chegar a Alcoutim',
      ),
    );
    ui.showHud(true);

    // 1) Falar com o rei no pavilhão
    ui.setObjective(T.objetivos.falar_rei);
    await game.waitFor('rei');
    await game.talk(T.dialogos.rei);

    // 2) Ir buscar o pergaminho à mesa do escrivão
    const rei = game.interactables.find((i) => i.id === 'rei')!;
    rei.onInteract = () => game.talk(T.dialogos.rei_espera);
    const mesa = game.interactables.find((i) => i.id === 'mesa')!;
    mesa.enabled = true;
    this.setMarker(TABLE_POS, 1.9);
    ui.setObjective(T.objetivos.pergaminho);
    await game.waitFor('mesa');
    await game.talk(T.dialogos.escrivao);
    const pickUp = game.player.character.playOnce;
    if (pickUp) await game.busyWith(() => pickUp.call(game.player.character, 'PickUp'));
    this.parchmentOnTable.visible = false;
    ui.toast(T.textos.toast_pergaminho);

    // 3) Ler o pergaminho e identificar as condições do tratado
    await game.busyWith(() => runParchmentChallenge(ui.overlayElement, T.desafio!));
    mesa.onInteract = () => game.talk(T.dialogos.escrivao_depois);

    // 4) Entregar o pergaminho ao rei
    rei.onInteract = undefined;
    this.setMarker(KING_POS, 2.45);
    ui.setObjective(T.objetivos.entregar);
    await game.waitFor('rei');
    this.marker.visible = false;
    await game.talk(T.dialogos.entrega);

    ui.setObjective(T.objetivos.concluida);
    await game.busyWith(() =>
      ui.card(
        `<div class="date">${escapeHtml(T.textos.fim_data)}</div>
         <h2>${escapeHtml(T.textos.fim_titulo)}</h2>
         <p>${escapeHtml(T.textos.fim_texto)}</p>
         <p class="quote">${escapeHtml(T.textos.fim_citacao)}</p>`,
        'Continuar',
      ),
    );
  }

  update(dt: number): void {
    this.time += dt;
    // Ondulação da água: pequenas ondas que correm ao longo do rio
    const pos = this.water.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      const x = this.waterBase[i];
      const y = this.waterBase[i + 1];
      arr[i + 2] = Math.sin(x * 0.35 + this.time * 1.4) * 0.05 + Math.sin(y * 0.8 + x * 0.1 + this.time * 0.9) * 0.04;
    }
    pos.needsUpdate = true;
    this.boatMesh.position.y = WATER_Y - 0.05 + Math.sin(this.time * 1.3) * 0.04;
    this.boatMesh.rotation.z = Math.sin(this.time * 1.1) * 0.03;
    if (this.marker.visible) animateMarker(this.marker, this.markerY, this.time);
  }

  private setMarker(at: THREE.Vector3, height: number): void {
    this.marker.position.set(at.x, 0, at.z);
    this.markerY = at.y + height;
    this.marker.visible = true;
  }

  /** Pavilhão de tecido aberto, onde o rei recebe os embaixadores. */
  private buildPavilion(): THREE.Group {
    const g = new THREE.Group();
    g.position.copy(PAVILION);
    const cloth = new THREE.MeshStandardMaterial({ map: tentCloth('#1f3c8c'), roughness: 0.95, side: THREE.DoubleSide });
    const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.8, flatShading: true });
    const W = 7, D = 5.4, H = 3.4;
    for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, H, 6), wood);
      post.position.set(x, H / 2, z);
      g.add(post);
    }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1, true), cloth);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(W + 0.6, 1.6, D + 0.6);
    roof.position.y = H + 0.8;
    g.add(roof);
    // Sanefas (franjas) à volta do telhado
    for (const [x, z, w, rot] of [[0, -D / 2, W, 0], [0, D / 2, W, 0], [-W / 2, 0, D, Math.PI / 2], [W / 2, 0, D, Math.PI / 2]] as const) {
      const v = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.5, 0.45), cloth);
      v.position.set(x, H - 0.05, z);
      v.rotation.y = rot;
      g.add(v);
    }
    // Pano de fundo atrás do rei e laterais
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), cloth);
    back.position.set(0, H / 2, -D / 2);
    g.add(back);
    for (const x of [-W / 2, W / 2]) {
      const side = new THREE.Mesh(new THREE.PlaneGeometry(D * 0.5, H), cloth);
      side.position.set(x, H / 2, -D / 4);
      side.rotation.y = Math.PI / 2;
      g.add(side);
    }
    // Tapete
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 4.5), new THREE.MeshStandardMaterial({ color: 0x8c1c1c, roughness: 1 }));
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.015, 1.2);
    g.add(rug);
    g.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    return g;
  }

  private buildChair(): THREE.Group {
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x5a3417, roughness: 0.7, flatShading: true });
    const velvet = new THREE.MeshStandardMaterial({ color: 0x7a1414, roughness: 1 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 0.9), wood);
    seat.position.y = 0.22;
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.8, 0.15), wood);
    back.position.set(0, 0.9, -0.4);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.2, 0.04), velvet);
    pad.position.set(0, 1.0, -0.31);
    g.add(seat, back, pad);
    g.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    return g;
  }

  private buildScribeTable(): THREE.Group {
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.8, flatShading: true });
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.9), wood);
    top.position.y = 0.9;
    g.add(top);
    for (const [x, z] of [[-0.8, -0.35], [0.8, -0.35], [-0.8, 0.35], [0.8, 0.35]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), wood);
      leg.position.set(x, 0.45, z);
      g.add(leg);
    }
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.02, 0.94), new THREE.MeshStandardMaterial({ color: 0x1f3c8c, roughness: 1 }));
    cloth.position.y = 0.96;
    g.add(cloth);
    // Pergaminho enrolado com selo de cera
    const scroll = new THREE.Group();
    const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 10), new THREE.MeshStandardMaterial({ color: 0xf1e4c4, roughness: 1 }));
    paper.rotation.z = Math.PI / 2;
    const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 10), new THREE.MeshStandardMaterial({ color: 0x9a1a1a, roughness: 0.5 }));
    seal.position.set(0, 0, 0.075);
    seal.rotation.x = Math.PI / 2;
    scroll.add(paper, seal);
    scroll.position.set(-0.2, 1.04, 0.1);
    g.add(scroll);
    this.parchmentOnTable = scroll;
    // Tinteiro e pena
    const ink = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
    ink.position.set(0.55, 1.02, -0.15);
    const quill = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.4, 4), new THREE.MeshStandardMaterial({ color: 0xf5f5f0 }));
    quill.position.set(0.58, 1.2, -0.13);
    quill.rotation.z = -0.3;
    g.add(ink, quill);
    g.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    return g;
  }
}
