import * as THREE from 'three';
import type { Game, Level, Npc } from '../../engine/Game';
import { Character } from '../../world/Character';
import { dirt, grass } from '../../world/textures';
import { animateMarker, banner, barrel, campfire, crate, marker, palisade, spearRack, tent, tree } from '../../world/props';
import { escapeHtml } from '../../ui/UI';
import texto from '../../story/cenario1/cena2.json';
import type { CenaTexto } from '../../story/types';

const T = texto as CenaTexto;

const HALF = 20; // o acampamento é um quadrado de 40 x 40 m dentro da paliçada
const COMMAND_TENT = new THREE.Vector3(0, 0, -12);
const GATHER = new THREE.Vector3(0, 0, -7.5); // onde os soldados se juntam, à porta da tenda de comando

interface Guard {
  npc: Npc;
  marker: THREE.Mesh;
  dialog: string;
  warned: boolean;
  gatherSpot: THREE.Vector3;
}

/**
 * 1.º Cenário · Cena 2 — Na Galiza (1369–1370).
 * Missões: ouvir o soldado e o conselheiro → avisar três soldados da retirada → regressar à tenda de comando.
 */
export class Cena2Galiza implements Level {
  private fires: { light: THREE.PointLight | null; flame: THREE.Mesh; phase: number }[] = [];
  private guards: Guard[] = [];
  private tentMarker!: THREE.Mesh;
  private castileArmy!: THREE.Group;
  private time = 0;

  build(game: Game): void {
    const { scene, world } = game;
    scene.background = new THREE.Color(0xa9c3d6);
    scene.fog = new THREE.Fog(0xa9c3d6, 35, 110);

    // ---------- Luz de fim de tarde ----------
    scene.add(new THREE.HemisphereLight(0xcfe3f2, 0x4f5a32, 0.9));
    const sun = new THREE.DirectionalLight(0xffe4b8, 2.0);
    sun.position.set(18, 26, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -26; sc.right = 26; sc.top = 26; sc.bottom = -26; sc.near = 1; sc.far = 80;
    sun.shadow.bias = -0.0006;
    scene.add(sun);

    // ---------- Terreno ----------
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.MeshStandardMaterial({ map: grass([60, 60]), roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Caminhos de terra batida dentro do acampamento
    const pathMat = new THREE.MeshStandardMaterial({ map: dirt([2, 8]), roughness: 1 });
    const pathNS = new THREE.Mesh(new THREE.PlaneGeometry(3, 34), pathMat);
    pathNS.rotation.x = -Math.PI / 2;
    pathNS.position.set(0, 0.01, 2);
    pathNS.receiveShadow = true;
    const pathEW = new THREE.Mesh(new THREE.PlaneGeometry(3, 30), pathMat);
    pathEW.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
    pathEW.position.set(0, 0.012, 0);
    pathEW.receiveShadow = true;
    scene.add(pathNS, pathEW);

    // Colinas à volta (fora do acampamento)
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x627c3c, roughness: 1, flatShading: true });
    const hills: [number, number, number, number][] = [
      [-55, -70, 26, 9], [10, -80, 30, 12], [60, -60, 24, 8], [-75, 5, 22, 7], [75, 15, 26, 9], [-40, 70, 30, 8], [45, 75, 28, 10],
    ];
    for (const [x, z, r, h] of hills) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), hillMat);
      hill.position.set(x, 0, z);
      hill.scale.y = h / r;
      hill.receiveShadow = true;
      scene.add(hill);
    }

    // ---------- Paliçada (com portão fechado a sul) ----------
    const addFence = (len: number, x: number, z: number, rotY: number) => {
      const f = palisade(len);
      f.position.set(x, 0, z);
      f.rotation.y = rotY;
      scene.add(f);
      world.occluders.push(f);
      if (rotY === 0) world.addRect(x, z, len, 0.5);
      else world.addRect(x, z, 0.5, len);
    };
    addFence(HALF * 2, 0, -HALF, 0);
    addFence(HALF * 2, -HALF, 0, Math.PI / 2);
    addFence(HALF * 2, HALF, 0, Math.PI / 2);
    addFence(HALF - 2, -(HALF + 2) / 2, HALF, 0);
    addFence(HALF - 2, (HALF + 2) / 2, HALF, 0);
    const gate = new THREE.Mesh(new THREE.BoxGeometry(4, 2.6, 0.25), new THREE.MeshStandardMaterial({ color: 0x8a6238, roughness: 0.9, flatShading: true }));
    gate.position.set(0, 1.3, HALF);
    gate.castShadow = gate.receiveShadow = true;
    scene.add(gate);
    world.addRect(0, HALF, 4, 0.5);
    world.occluders.push(gate);

    // ---------- Tendas ----------
    const command = tent('command', '#1f3c8c');
    command.position.copy(COMMAND_TENT);
    scene.add(command);
    world.addRect(COMMAND_TENT.x, COMMAND_TENT.z, 6.2, 4.7);
    world.occluders.push(command);
    const flagL = banner('portugal', 5);
    flagL.position.set(-4.5, 0, -14.5);
    const flagR = banner('portugal', 5);
    flagR.position.set(4.5, 0, -14.5);
    scene.add(flagL, flagR);

    const tents: [number, number, number, string][] = [
      [-13, -12, 0.4, '#8c1c1c'], [-14, 4, -0.3, '#8c1c1c'], [-8, 10, 0.9, '#3d4a2a'], [12, -13, -0.5, '#8c1c1c'],
      [14, -3, 1.2, '#3d4a2a'], [9, 11, 2.5, '#8c1c1c'], [15, 13, -2.2, '#3d4a2a'], [-15, 14, 0.2, '#8c1c1c'],
    ];
    for (const [x, z, r, stripe] of tents) {
      const t = tent('cone', stripe);
      t.position.set(x, 0, z);
      t.rotation.y = r;
      scene.add(t);
      world.addRect(x, z, 3, 3);
    }

    // ---------- Fogueiras e mantimentos ----------
    for (const [x, z, light] of [[-9, -2, true], [9, 4, true], [-6, -14, false]] as const) {
      const f = campfire(light);
      f.group.position.set(x, 0, z);
      scene.add(f.group);
      world.addRect(x, z, 1.2, 1.2);
      this.fires.push({ light: f.light, flame: f.flame, phase: Math.random() * 10 });
    }
    const supplies: [number, number, 'crate' | 'barrel'][] = [
      [5, -8.5, 'crate'], [6, -9.2, 'barrel'], [-5.5, -8.6, 'barrel'], [17, 7, 'crate'], [17.6, 8, 'crate'], [-17, -5, 'barrel'], [-17.5, -6, 'crate'],
    ];
    for (const [x, z, kind] of supplies) {
      const s = kind === 'crate' ? crate() : barrel();
      s.position.x = x;
      s.position.z = z;
      s.rotation.y = x * 0.7;
      scene.add(s);
      world.addRect(x, z, 0.85, 0.85);
    }
    const rack = spearRack();
    rack.position.set(-11, 0, -17);
    scene.add(rack);
    world.addRect(-11, -17, 1.8, 0.5);

    // ---------- Árvores (fora e algumas dentro) ----------
    let seed = 3;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 70; i++) {
      const a = rnd() * Math.PI * 2;
      const d = 26 + rnd() * 40;
      const t = tree(rnd() > 0.45 ? 'pine' : 'oak', 0.8 + rnd() * 0.7);
      t.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
      t.rotation.y = rnd() * 6;
      scene.add(t);
    }
    for (const [x, z] of [[-17, 9], [17, -9]] as const) {
      const t = tree('oak', 1.1);
      t.position.set(x, 0, z);
      scene.add(t);
      world.addRect(x, z, 0.6, 0.6);
    }

    // ---------- O exército de Henrique II no horizonte ----------
    // Planalto onde aparece o exército, bem visível por cima da paliçada.
    const plateau = new THREE.Mesh(new THREE.CylinderGeometry(11, 17, 6, 12), hillMat);
    plateau.position.set(8, 3, -44);
    plateau.receiveShadow = true;
    scene.add(plateau);
    this.castileArmy = this.buildCastileArmy();
    this.castileArmy.position.set(8, 6, -48);
    this.castileArmy.scale.setScalar(1.5);
    scene.add(this.castileArmy);

    // ---------- Personagens ----------
    const soldierLook = (tunic: number) => ({ tunic, legs: 0x3a3a3a, helmet: true, spear: true, cross: 0xb01e1e });
    game.addNpc('soldado', new Character(soldierLook(0x7a7a72)), -2.4, 0, 8, 0);
    game.addNpc('conselheiro', new Character({ tunic: 0x3d4a2a, legs: 0x2a2a20, hat: 0x2a1f14, beard: 0xb8b0a0, hair: 0xb8b0a0 }), 2.4, 0, 7.6, -0.3);

    const guardDefs: [number, number, number, string][] = [
      [-9, 0.6, 2.8, 'soldado1'], // junto à fogueira oeste
      [8.5, 6.6, -2.6, 'soldado2'], // junto à fogueira este
      [-12.5, -16, 0.2, 'soldado3'], // de vigia junto às lanças, a norte
    ];
    guardDefs.forEach(([x, z, rot, dialog], i) => {
      const npc = game.addNpc('soldado', new Character(soldierLook([0x6b6b6b, 0x5d6b4a, 0x7a5a3a][i])), x, 0, z, rot);
      const m = marker();
      m.position.set(x, 2.7, z);
      m.visible = false;
      scene.add(m);
      const gatherSpot = new THREE.Vector3(-2.5 + i * 2.5, 0, GATHER.z + 2.2);
      this.guards.push({ npc, marker: m, dialog, warned: false, gatherSpot });
    });

    this.tentMarker = marker();
    this.tentMarker.position.set(COMMAND_TENT.x, 5, COMMAND_TENT.z + 2.4);
    this.tentMarker.visible = false;
    scene.add(this.tentMarker);

    game.player.spawn(0, 12.5, Math.PI);
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
        'Entrar no acampamento',
      ),
    );
    ui.showHud(true);

    // 1) Ouvir o soldado e o conselheiro junto à entrada
    const [firstSoldier] = game.npcs;
    ui.setObjective(T.objetivos.falar_soldado);
    game.addInteractable({ id: 'chegada', label: 'Falar com o soldado', position: firstSoldier.character.root.position.clone(), radius: 2.6 });
    await game.waitFor('chegada');
    game.interactables = game.interactables.filter((i) => i.id !== 'chegada');
    await game.talk(T.dialogos.chegada, { soldado: firstSoldier });

    // O primeiro soldado já sabe: segue para a tenda de comando.
    firstSoldier.walkTo = GATHER.clone().add(new THREE.Vector3(-4.5, 0, 1));

    // O conselheiro vai esperar à porta da tenda de comando.
    const conselheiro = game.npcs.find((n) => n.id === 'conselheiro')!;
    conselheiro.walkTo = GATHER.clone().add(new THREE.Vector3(2.5, 0, 0));

    // 2) Avisar os três soldados (por qualquer ordem)
    let count = 0;
    const objective = () => ui.setObjective(`${T.objetivos.avisar} (${count}/3).`);
    objective();
    const allWarned = new Promise<void>((resolve) => {
      for (const g of this.guards) {
        g.marker.visible = true;
        const it = game.addInteractable({
          id: `aviso-${g.dialog}`, label: 'Avisar o soldado', position: g.npc.character.root.position, radius: 2.4,
          onInteract: async () => {
            if (g.warned) {
              await game.talk(T.dialogos.ja_avisado, { soldado: g.npc });
              return;
            }
            await game.talk(T.dialogos[g.dialog], { soldado: g.npc });
            g.warned = true;
            g.marker.visible = false;
            it.enabled = false;
            g.npc.walkTo = g.gatherSpot;
            count++;
            ui.toast(`${T.textos.toast_avisado} (${count}/3)`);
            objective();
            if (count === 3) resolve();
          },
        });
      }
    });
    const consIt = game.addInteractable({
      id: 'conselheiro', label: 'Falar com o Conselheiro', position: conselheiro.character.root.position, radius: 2.2,
      onInteract: () => game.talk(T.dialogos.conselheiro_espera),
    });
    await allWarned;

    // 3) Regressar à tenda de comando
    consIt.enabled = false;
    this.tentMarker.visible = true;
    ui.setObjective(T.objetivos.tenda);
    game.addInteractable({ id: 'tenda', label: 'Entrar na tenda de comando', position: GATHER.clone(), radius: 3 });
    await game.waitFor('tenda');
    this.tentMarker.visible = false;
    await game.talk(T.dialogos.tenda);

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
    for (const f of this.fires) {
      const k = Math.sin(this.time * 10 + f.phase) * 0.12 + Math.sin(this.time * 27 + f.phase) * 0.07;
      if (f.light) f.light.intensity = 6 * (1 + k);
      f.flame.scale.set(1 - k * 0.5, 1 + k * 1.6, 1 - k * 0.5);
    }
    for (const g of this.guards) if (g.marker.visible) animateMarker(g.marker, 2.7, this.time);
    if (this.tentMarker.visible) animateMarker(this.tentMarker, 5, this.time);
    // Henrique II avança: o exército aproxima-se devagar durante a cena.
    if (this.castileArmy.position.z < -44) this.castileArmy.position.z += dt * 0.05;
  }

  /** Silhuetas do exército castelhano numa colina distante (InstancedMesh: um só desenho para todos). */
  private buildCastileArmy(): THREE.Group {
    const g = new THREE.Group();
    const rows = 4, cols = 10;
    const body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.3, 1.1, 2, 6), new THREE.MeshStandardMaterial({ color: 0x5a1414, roughness: 0.9 }), rows * cols);
    const spears = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 4), new THREE.MeshStandardMaterial({ color: 0x3a2a1a }), rows * cols);
    const m = new THREE.Matrix4();
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c - cols / 2) * 1.3 + (r % 2) * 0.6;
        const z = r * 1.6;
        m.makeTranslation(x, 0.85, z);
        body.setMatrixAt(i, m);
        m.makeTranslation(x + 0.35, 1.4, z);
        spears.setMatrixAt(i, m);
        i++;
      }
    }
    g.add(body, spears);
    for (const x of [-5.5, 0, 5.5]) {
      const b = banner('castela', 4.5);
      b.scale.setScalar(1.4);
      b.position.set(x, 0, -1);
      g.add(b);
    }
    return g;
  }
}
