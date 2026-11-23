import * as THREE from 'three';
import type { Game, Level, Npc } from '../../engine/Game';
import { castNpc } from '../../world/cast';
import { dirt, grass, stoneWall } from '../../world/textures';
import { animateMarker, banner, barrel, crate, house, marker, tree, wheatField } from '../../world/props';
import { KIT, kitModel } from '../../world/kit';
import { escapeHtml } from '../../ui/UI';
import texto from '../../story/cenario2/cena1.json';
import type { CenaTexto } from '../../story/types';

const T = texto as CenaTexto;

const WALL_Z = -8; // muralha da vila (a vila fica para norte, z < WALL_Z)
const GATE_HALF = 2.2;
const GATE_OUT = new THREE.Vector3(0, 0, WALL_Z + 2.5); // à frente da porta
const GATE_IN = new THREE.Vector3(0, 0, WALL_Z - 9); // dentro da vila (fora de vista)
const TOWER_X = 9;

interface Peasant {
  npc: Npc;
  marker: THREE.Mesh;
  dialog: string;
  helped: boolean;
  path: THREE.Vector3[];
}

/**
 * 2.º Cenário · Cena 1 — Às portas de uma vila (1372).
 * Missões: ouvir o guarda e o camponês → ajudar três camponeses a entrar na vila → avisar o capitão da guarda.
 */
export class Cena1PortasVila implements Level {
  private time = 0;
  private peasants: Peasant[] = [];
  private captainMarker!: THREE.Mesh;

  build(game: Game): void {
    const { scene, world } = game;
    scene.background = new THREE.Color(0xc4cfd6);
    scene.fog = new THREE.Fog(0xc4cfd6, 35, 110);

    scene.add(new THREE.HemisphereLight(0xdde6ee, 0x5a5a32, 0.95));
    const sun = new THREE.DirectionalLight(0xffe8c4, 1.9);
    sun.position.set(14, 24, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 80;
    sun.shadow.bias = -0.0006;
    scene.add(sun);

    // ---------- Terreno: campos à volta da vila ----------
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshStandardMaterial({ map: grass([60, 60]), roughness: 1, color: 0xe0d8a0 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 40), new THREE.MeshStandardMaterial({ map: dirt([2, 10]), roughness: 1 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.012, WALL_Z + 20);
    road.receiveShadow = true;
    scene.add(road);
    // Campos de trigo com cerca
    let n = 0;
    for (const [x, z, w, d] of [[-14, 10, 10, 8], [13, 14, 9, 10], [-7, 22, 8, 6]]) {
      const f = wheatField(w, d, ++n);
      f.position.set(x, 0, z);
      scene.add(f);
    }
    // Casas dos lavradores fora da muralha, viradas para o caminho
    for (const [x, z, rot] of [[-22, 5, Math.PI / 2], [21, 11, -Math.PI / 2], [7, 22, -Math.PI / 2]] as const) {
      const h = house(5, 4, 3.4);
      h.position.set(x, 0, z);
      h.rotation.y = rot;
      scene.add(h);
      world.addRect(x, z, 4, 5);
    }
    const cart = kitModel(KIT.wagon, { length: 3.2, alongZ: true });
    if (cart) {
      cart.position.set(-2.8, 0, 9);
      scene.add(cart);
      world.addRect(-2.8, 9, 1.6, 3.2);
    }

    // ---------- Muralha, porta e torres ----------
    const wallMat = new THREE.MeshStandardMaterial({ map: stoneWall([10, 2]), roughness: 0.95 });
    const towerMat = new THREE.MeshStandardMaterial({ map: stoneWall([2, 3]), roughness: 0.95 });
    const addWall = (x0: number, x1: number) => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 5, 1.4), wallMat);
      w.position.set((x0 + x1) / 2, 2.5, WALL_Z);
      w.castShadow = w.receiveShadow = true;
      scene.add(w);
      world.addFromObject(w);
      world.occluders.push(w);
      for (let x = x0 + 0.5; x < x1; x += 1.4) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 1.4), wallMat);
        m.position.set(x, 5.35, WALL_Z);
        scene.add(m);
      }
    };
    addWall(-40, -GATE_HALF - 1.5);
    addWall(GATE_HALF + 1.5, 40);
    for (const x of [-GATE_HALF - 1.5, GATE_HALF + 1.5, -TOWER_X - 9, TOWER_X]) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(3, 8, 3), towerMat);
      t.position.set(x, 4, WALL_Z);
      t.castShadow = t.receiveShadow = true;
      scene.add(t);
      world.addFromObject(t);
      world.occluders.push(t);
    }
    // Arco por cima da porta
    const arch = new THREE.Mesh(new THREE.BoxGeometry(GATE_HALF * 2 + 0.2, 2.2, 1.4), wallMat);
    arch.position.set(0, 5.4, WALL_Z);
    scene.add(arch);
    // Portas de madeira abertas para dentro
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9, flatShading: true });
    for (const s of [-1, 1]) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(GATE_HALF, 4.2, 0.2), doorMat);
      d.position.set(s * (GATE_HALF + 0.2), 2.1, WALL_Z - 1.6);
      d.rotation.y = s * 1.3;
      scene.add(d);
    }
    // O escudeiro não entra na vila (os camponeses sim)
    world.addRect(0, WALL_Z - 1.5, GATE_HALF * 2, 0.6);
    for (const x of [-6, 6]) {
      const b = banner('portugal', 3.6);
      b.position.set(x, 5.7, WALL_Z + 0.75);
      scene.add(b);
    }

    // Telhados e torre da igreja dentro da vila, por cima da muralha
    for (const [x, z] of [[-12, -16], [-5, -14], [6, -15], [13, -18], [-18, -20], [2, -22]] as const) {
      const h = house(5, 4, 4.5);
      h.position.set(x, 0, z);
      scene.add(h);
    }
    const church = new THREE.Mesh(new THREE.BoxGeometry(3.5, 12, 3.5), towerMat);
    church.position.set(-8, 6, -24);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(2.6, 4, 4), new THREE.MeshStandardMaterial({ color: 0xa8553a, flatShading: true }));
    spire.position.set(-8, 14, -24);
    spire.rotation.y = Math.PI / 4;
    scene.add(church, spire);

    // ---------- Fora da muralha: carroça, mantimentos, árvores ----------
    for (const [x, z, k] of [[4.5, -3.5, 'c'], [5.3, -2.6, 'b'], [-5, -4, 'b'], [-17, 4, 'c'], [18, 6, 'b']] as const) {
      const p = k === 'c' ? crate() : barrel();
      p.position.x = x;
      p.position.z = z;
      scene.add(p);
      world.addRect(x, z, 0.9, 0.9);
    }
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (const [x, z] of [[-22, 16], [22, 22], [-24, -2], [24, -1], [8, 26], [-16, 28]] as const) {
      const t = tree('oak', 0.9 + rnd() * 0.3);
      t.position.set(x, 0, z);
      scene.add(t);
      world.addRect(x, z, 0.6, 0.6);
    }
    for (let i = 0; i < 40; i++) {
      const a = Math.PI * (0.05 + rnd() * 0.9);
      const d = 34 + rnd() * 30;
      const t = tree(rnd() > 0.5 ? 'pine' : 'oak', 0.8 + rnd() * 0.6);
      t.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
      scene.add(t);
    }
    // Limites
    world.addRect(-30, 12, 1, 44);
    world.addRect(30, 12, 1, 44);
    world.addRect(0, 33, 60, 1);

    // ---------- Personagens ----------
    const guardLook = { tunic: 0x6b6b6b, legs: 0x3a3a3a, helmet: true, spear: true, cross: 0xb01e1e };
    game.addNpc('guarda', castNpc(guardLook), -2.6, 0, WALL_Z + 2, 0.3);
    game.addNpc('campones', castNpc({ tunic: 0x8a6a3a, legs: 0x4a3a2a, hat: 0x9a8040, hair: 0x4a3020 }), 2.8, 0, WALL_Z + 3.5, -0.4);
    const captain = game.addNpc('guarda', castNpc({ ...guardLook, tunic: 0x4a4a52, cape: 0x8c1c1c }), TOWER_X, 0, WALL_Z + 2.6, 0);

    const peasantDefs: [number, number, string, number][] = [
      [-13, 4.5, 'campones1', 0x7a5a30],
      [13, 8, 'campones2', 0x5d6b4a],
      [-6, 17.5, 'campones3', 0xa04a4a],
    ];
    for (const [x, z, dialog, tunic] of peasantDefs) {
      const npc = game.addNpc('campones', castNpc({ tunic, legs: 0x4a3a2a, hat: dialog === 'campones3' ? undefined : 0x9a8040, hair: 0x4a3020 }), x, 0, z, Math.PI);
      const m = marker();
      m.position.set(x, 2.7, z);
      m.visible = false;
      scene.add(m);
      this.peasants.push({ npc, marker: m, dialog, helped: false, path: [] });
    }
    this.captainMarker = marker();
    this.captainMarker.position.set(captain.character.root.position.x, 0, captain.character.root.position.z);
    this.captainMarker.visible = false;
    scene.add(this.captainMarker);

    game.player.spawn(0, 14, Math.PI);
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
        'Chegar à vila',
      ),
    );
    ui.showHud(true);

    const [guard, firstPeasant, captain] = game.npcs;

    // 1) Ouvir o guarda e o camponês à porta
    ui.setObjective(T.objetivos.falar_guarda);
    game.addInteractable({ id: 'porta', label: 'Falar com o guarda', position: guard.character.root.position.clone(), radius: 2.6 });
    await game.waitFor('porta');
    game.interactables = game.interactables.filter((i) => i.id !== 'porta');
    await game.talk(T.dialogos.porta, { guarda: guard, campones: firstPeasant });
    this.sendInside(firstPeasant);

    // 2) Ajudar os três camponeses (qualquer ordem)
    let count = 0;
    const objective = () => ui.setObjective(`${T.objetivos.ajudar} (${count}/3).`);
    objective();
    const allHelped = new Promise<void>((resolve) => {
      for (const p of this.peasants) {
        p.marker.visible = true;
        const it = game.addInteractable({
          id: `ajuda-${p.dialog}`, label: 'Falar com o camponês', position: p.npc.character.root.position, radius: 2.4,
          onInteract: async () => {
            if (p.helped) {
              await game.talk(T.dialogos.ja_ajudado, { campones: p.npc });
              return;
            }
            await game.talk(T.dialogos[p.dialog], { campones: p.npc });
            p.helped = true;
            p.marker.visible = false;
            it.enabled = false;
            this.sendInside(p.npc);
            count++;
            ui.toast(`${T.textos.toast_ajudado} (${count}/3)`);
            objective();
            if (count === 3) resolve();
          },
        });
      }
    });
    const capIt = game.addInteractable({
      id: 'capitao', label: 'Falar com o capitão da guarda', position: captain.character.root.position.clone(), radius: 2.4,
      onInteract: () => game.talk(T.dialogos.capitao_espera, { guarda: captain }),
    });
    await allHelped;

    // 3) Avisar o capitão da guarda
    capIt.onInteract = undefined;
    this.captainMarker.visible = true;
    ui.setObjective(T.objetivos.capitao);
    await game.waitFor('capitao');
    this.captainMarker.visible = false;
    await game.talk(T.dialogos.capitao, { guarda: captain });

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

  /** O camponês caminha até à porta e entra na vila; depois desaparece. */
  private sendInside(npc: Npc): void {
    const p = this.peasants.find((x) => x.npc === npc);
    const path = [new THREE.Vector3(npc.character.root.position.x * 0.2, 0, GATE_OUT.z + 4.5), GATE_OUT.clone(), GATE_IN.clone()];
    npc.walkSpeed = 2.4;
    npc.walkTo = path.shift()!;
    if (p) p.path = path;
    else this.peasants.push({ npc, marker: marker(), dialog: '', helped: true, path });
  }

  update(dt: number): void {
    this.time += dt;
    for (const p of this.peasants) {
      if (p.marker.visible) animateMarker(p.marker, 2.7, this.time);
      if (!p.npc.walkTo && p.path.length) p.npc.walkTo = p.path.shift()!;
      else if (!p.npc.walkTo && p.helped && p.npc.character.root.position.z < WALL_Z - 6) p.npc.character.root.visible = false;
    }
    if (this.captainMarker.visible) animateMarker(this.captainMarker, 2.9, this.time);
  }
}
