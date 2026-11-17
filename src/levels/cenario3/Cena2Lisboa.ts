import * as THREE from 'three';
import type { Game, Level, Npc } from '../../engine/Game';
import { Character } from '../../world/Character';
import { castileBanner, stoneFloor, tentCloth } from '../../world/textures';
import { animateMarker, barrel, boat, crate, house, marker } from '../../world/props';
import { escapeHtml } from '../../ui/UI';
import texto from '../../story/cenario3/cena2.json';
import type { CenaTexto } from '../../story/types';

const T = texto as CenaTexto;

const QUAY_Z = -12; // cais: a partir daqui (para norte) é o Tejo
const MERCHANT = new THREE.Vector3(-6, 0, -3.4);
const GUARD = new THREE.Vector3(8, 0, -9.5);

/**
 * 3.º Cenário · Cena 2 — Em Lisboa (1381–1382).
 * Missão: recolher informações junto de um mercador e de um guarda (qualquer ordem).
 */
export class Cena2Lisboa implements Level {
  private time = 0;
  private ships: THREE.Group[] = [];
  private markers: { m: THREE.Mesh; npc: Npc }[] = [];

  build(game: Game): void {
    const { scene, world } = game;
    scene.background = new THREE.Color(0xaec6d8);
    scene.fog = new THREE.Fog(0xaec6d8, 40, 150);

    scene.add(new THREE.HemisphereLight(0xdfeaf3, 0x5a5040, 1.0));
    const sun = new THREE.DirectionalLight(0xfff0d6, 2.0);
    sun.position.set(12, 26, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -26; sc.right = 26; sc.top = 26; sc.bottom = -26; sc.near = 1; sc.far = 80;
    sun.shadow.bias = -0.0006;
    scene.add(sun);

    // ---------- Cais empedrado e rio ----------
    const quay = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), new THREE.MeshStandardMaterial({ map: stoneFloor([30, 15]), roughness: 0.95, color: 0xd6ccb6 }));
    quay.rotation.x = -Math.PI / 2;
    quay.position.z = QUAY_Z + 30;
    quay.receiveShadow = true;
    scene.add(quay);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(120, 0.8, 0.6), new THREE.MeshStandardMaterial({ color: 0x9a8f78, roughness: 0.9 }));
    edge.position.set(0, -0.35, QUAY_Z);
    scene.add(edge);
    const river = new THREE.Mesh(new THREE.PlaneGeometry(400, 200), new THREE.MeshStandardMaterial({ color: 0x3f7a92, roughness: 0.3, metalness: 0.1 }));
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, -0.6, QUAY_Z - 100);
    scene.add(river);
    // Outra margem do Tejo, ao longe
    const far = new THREE.Mesh(new THREE.BoxGeometry(400, 4, 30), new THREE.MeshStandardMaterial({ color: 0x7d8a52, roughness: 1, flatShading: true }));
    far.position.set(0, 0, -150);
    scene.add(far);

    world.addRect(0, QUAY_Z - 1, 60, 2);
    world.addRect(-25, 0, 1, 30);
    world.addRect(25, 0, 1, 30);
    world.addRect(0, 13.5, 50, 1);

    // ---------- Navios castelhanos a bloquear o Tejo ----------
    for (const [x, z, r] of [[-22, -40, 0.3], [2, -52, -0.2], [26, -42, 0.5], [-6, -78, 0.1], [40, -70, -0.4]] as const) {
      const s = this.ship();
      s.position.set(x, -0.6, z);
      s.rotation.y = r;
      s.userData.phase = x;
      scene.add(s);
      this.ships.push(s);
    }
    // Barcos de pesca parados junto ao cais
    for (const [x, z] of [[-14, -14.4], [-17, -15], [16, -14.6]] as const) {
      const b = boat();
      b.position.set(x, -0.7, z);
      b.rotation.y = Math.PI / 2;
      scene.add(b);
    }

    // ---------- Casas e bancas vazias ----------
    for (const x of [-20, -13, -6.5, 0, 6.5, 13, 20]) {
      const h = house(6, 5, 5 + (x % 2 === 0 ? 0.8 : 0));
      h.position.set(x, 0, 11);
      h.rotation.y = Math.PI;
      scene.add(h);
      world.addRect(x, 11, 6, 5);
    }
    for (const [x, z, stripe] of [[-6, -1.8, '#8c1c1c'], [-11, 0, '#1f3c8c'], [0, 1.5, '#3d4a2a'], [11, 1, '#8c1c1c']] as const) {
      scene.add(this.emptyStall(x, z, stripe));
      world.addRect(x, z, 2.4, 1.4);
    }
    for (const [x, z, k] of [[4, -10, 'b'], [4.9, -10.4, 'b'], [-3, -10, 'c'], [18, -9, 'c'], [-20, -8, 'b']] as const) {
      const p = k === 'c' ? crate() : barrel();
      p.position.x = x;
      p.position.z = z;
      scene.add(p);
      world.addRect(x, z, 0.9, 0.9);
    }

    // ---------- Personagens ----------
    const merchant = game.addNpc('mercador', new Character({ tunic: 0x7a3a5a, legs: 0x3a2a2a, hat: 0x5a3a20, beard: 0x5a4a3a, hair: 0x5a4a3a }), MERCHANT.x, 0, MERCHANT.z, Math.PI);
    const guard = game.addNpc('guarda', new Character({ tunic: 0x6b6b6b, legs: 0x3a3a3a, helmet: true, spear: true, cross: 0xb01e1e }), GUARD.x, 0, GUARD.z, Math.PI);
    game.addNpc('campones', new Character({ tunic: 0x5a6a7a, legs: 0x3a3a3a, hat: 0x9a8040, hair: 0x4a3020 }), -15, 0, -10, Math.PI);
    game.addInteractable({
      id: 'pescador', label: 'Falar com o pescador', position: new THREE.Vector3(-15, 0, -10), radius: 1.8,
      onInteract: () => game.talk(T.dialogos.pescador),
    });
    // Soldados ingleses (cruz de São Jorge) à porta de uma taberna
    for (const [x, z, r] of [[15, 6, -2.6], [17, 6.4, 2.8]] as const) {
      game.addNpc('soldado', new Character({ tunic: 0xeeeae0, legs: 0x3a3a50, cross: 0xc01818, helmet: true, spear: true }), x, 0, z, r, false);
    }

    for (const npc of [merchant, guard]) {
      const m = marker();
      m.position.set(npc.character.root.position.x, 0, npc.character.root.position.z);
      scene.add(m);
      this.markers.push({ m, npc });
    }

    game.player.spawn(0, 6.5, Math.PI);
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
        'Chegar ao cais',
      ),
    );
    ui.showHud(true);

    let count = 0;
    const objective = () => ui.setObjective(`${T.objetivos.info} (${count}/2).`);
    objective();
    await new Promise<void>((resolve) => {
      for (const { m, npc } of this.markers) {
        const dialog = npc.id === 'mercador' ? T.dialogos.mercador : T.dialogos.guarda;
        let done = false;
        game.addInteractable({
          id: `info-${npc.id}`, label: npc.id === 'mercador' ? 'Falar com o mercador' : 'Falar com o guarda',
          position: npc.character.root.position.clone(), radius: 3.0,
          onInteract: async () => {
            if (done) return game.talk(T.dialogos.ja_falou);
            await game.talk(dialog, { [npc.id]: npc });
            done = true;
            m.visible = false;
            count++;
            ui.toast(`${T.textos.toast_info} (${count}/2)`);
            objective();
            if (count === 2) resolve();
          },
        });
      }
    });

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
    for (const s of this.ships) {
      const p = s.userData.phase as number;
      s.position.y = -0.6 + Math.sin(this.time * 1.1 + p) * 0.12;
      s.rotation.z = Math.sin(this.time * 0.8 + p) * 0.03;
    }
    for (const { m } of this.markers) if (m.visible) animateMarker(m, 2.7, this.time);
  }

  /** Navio de guerra castelhano: casco, castelos de proa e popa, mastro e vela com as armas de Castela. */
  private ship(): THREE.Group {
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.9, flatShading: true });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 14), wood);
    hull.position.y = 0.6;
    const bow = new THREE.Mesh(new THREE.ConeGeometry(2.83, 4, 4, 1), wood);
    bow.rotation.set(Math.PI / 2, Math.PI / 4, 0);
    bow.scale.set(1, 1, 0.7);
    bow.position.set(0, 0.6, 9);
    const aft = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.6, 3.5), wood);
    aft.position.set(0, 2.4, -5.3);
    const fore = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 2.6), wood);
    fore.position.set(0, 2.2, 5.6);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 11, 6), wood);
    mast.position.y = 6.5;
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(6, 6.5), new THREE.MeshStandardMaterial({ map: castileBanner(), side: THREE.DoubleSide, roughness: 1 }));
    sail.position.set(0, 7, 0.2);
    g.add(hull, bow, aft, fore, mast, sail);
    g.traverse((o) => { o.castShadow = true; });
    return g;
  }

  /** Banca de mercado vazia (o comércio parou por causa do bloqueio). */
  private emptyStall(x: number, z: number, stripe: string): THREE.Group {
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
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.3, 8, 1, true), new THREE.MeshStandardMaterial({ color: 0xa08050, side: THREE.DoubleSide }));
    basket.position.set(0.5, 1.05, 0);
    g.add(basket);
    g.position.set(x, 0, z);
    g.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    return g;
  }
}
