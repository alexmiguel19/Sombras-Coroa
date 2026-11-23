import * as THREE from 'three';
import { royalBanner, castileBanner, tentCloth, stoneWall } from './textures';
import { KIT, kitModel, kitRaw } from './kit';
import { rowingBoat } from './ships';

/**
 * Adereços reutilizáveis entre cenas (exterior medieval).
 * Árvores, caixotes, barris, barcos e fogueiras usam modelos do kit (Kenney, CC0) quando
 * estão carregados; caso contrário, as formas simples abaixo.
 */

let variant = 0;

const mat = (color: number, rough = 0.85) => new THREE.MeshStandardMaterial({ color, roughness: rough, flatShading: true });

function shadows<T extends THREE.Object3D>(o: T): T {
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return o;
}

/** Tenda cónica (soldados) ou grande retangular (comando). */
export function tent(kind: 'cone' | 'command', stripe = '#8c1c1c'): THREE.Group {
  const g = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ map: tentCloth(stripe), roughness: 0.95, side: THREE.DoubleSide });
  if (kind === 'cone') {
    const body = new THREE.Mesh(new THREE.ConeGeometry(1.8, 2.8, 10, 1, true), cloth);
    body.position.y = 1.4;
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.4), mat(0x2a1d10));
    door.position.set(0, 0.7, 1.32);
    door.rotation.x = -0.55;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6), mat(0x5a3a1a));
    pole.position.y = 3.0;
    g.add(body, door, pole);
  } else {
    const walls = new THREE.Mesh(new THREE.BoxGeometry(6, 2.4, 4.5), cloth);
    walls.position.y = 1.2;
    const roofGeo = new THREE.CylinderGeometry(0.01, 3.9, 1.8, 4, 1, true);
    const roof = new THREE.Mesh(roofGeo, cloth);
    roof.position.y = 3.3;
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.1, 1, 0.82);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2), mat(0x2a1d10));
    door.position.set(0, 1, 2.26);
    g.add(walls, roof, door);
    for (const x of [-2.4, 2.4]) {
      const b = banner('portugal', 2.6);
      b.position.set(x, 0, 2.6);
      g.add(b);
    }
  }
  return shadows(g);
}

/** Estandarte num mastro. */
export function banner(kind: 'portugal' | 'castela', height = 3.2): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, height + 0.6, 6), mat(0x5a3a1a));
  pole.position.y = (height + 0.6) / 2;
  const cloth = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 1.35),
    new THREE.MeshStandardMaterial({ map: kind === 'portugal' ? royalBanner() : castileBanner(), side: THREE.DoubleSide, roughness: 0.9 }),
  );
  cloth.position.set(0.48, height - 0.4, 0);
  cloth.name = 'cloth';
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), mat(0xd4af37, 0.4));
  top.position.y = height + 0.6;
  g.add(pole, cloth, top);
  return shadows(g);
}

/** Fogueira com luz tremeluzente. Devolve também a luz e a chama para animar. */
export function campfire(withLight = true): { group: THREE.Group; light: THREE.PointLight | null; flame: THREE.Mesh } {
  const g = new THREE.Group();
  const kitFire = kitModel(KIT.campfire, { length: 1.3 });
  if (kitFire) g.add(kitFire);
  const stone = mat(0x6e6a62);
  for (let i = 0; i < (kitFire ? 0 : 8); i++) {
    const a = (i / 8) * Math.PI * 2;
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16), stone);
    s.position.set(Math.cos(a) * 0.5, 0.08, Math.sin(a) * 0.5);
    g.add(s);
  }
  const wood = mat(0x4a2e14);
  for (let i = 0; i < (kitFire ? 0 : 3); i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 5), wood);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = (i / 3) * Math.PI;
    log.position.y = 0.1;
    g.add(log);
  }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 7), new THREE.MeshBasicMaterial({ color: 0xff9a30 }));
  flame.position.y = 0.45;
  const inner = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.45, 6), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
  inner.position.y = 0.38;
  g.add(flame, inner);
  let light: THREE.PointLight | null = null;
  if (withLight) {
    light = new THREE.PointLight(0xff8a30, 6, 9, 1.6);
    light.position.y = 1;
    g.add(light);
  }
  shadows(g);
  flame.castShadow = inner.castShadow = false;
  return { group: g, light, flame };
}

/** Árvore low-poly (pinheiro ou carvalho). */
export function tree(kind: 'pine' | 'oak', scale = 1): THREE.Group {
  const urls = kind === 'pine' ? [KIT.pine, KIT.pineRound, KIT.pine3] : [KIT.oak, KIT.tree, KIT.tree3];
  const kitTree = kitModel(urls[variant++ % 3], { height: (kind === 'pine' ? 6 : 5) * scale });
  if (kitTree) return kitTree;
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 2, 6), mat(0x5a3a1a));
  trunk.position.y = 1;
  g.add(trunk);
  if (kind === 'pine') {
    const leaf = mat(0x2f5a2e);
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(1.4 - i * 0.35, 1.8, 7), leaf);
      c.position.y = 2 + i * 0.9;
      g.add(c);
    }
  } else {
    const leaf = mat(0x4f7a32);
    for (const [x, y, z, r] of [[0, 2.8, 0, 1.3], [0.7, 2.4, 0.3, 0.9], [-0.6, 2.5, -0.3, 0.95], [0.1, 3.4, -0.2, 0.8]]) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), leaf);
      b.position.set(x, y, z);
      g.add(b);
    }
  }
  g.scale.setScalar(scale);
  return shadows(g);
}

/** Troço de paliçada de troncos aguçados, ao longo do eixo X, com `length` metros. */
export function palisade(length: number): THREE.Group {
  const g = new THREE.Group();
  const wood = mat(0x6b4a2a);
  const n = Math.round(length / 0.38);
  const geo = new THREE.CylinderGeometry(0.17, 0.19, 2.4, 6);
  const tip = new THREE.ConeGeometry(0.17, 0.4, 6);
  for (let i = 0; i < n; i++) {
    const x = -length / 2 + (i + 0.5) * (length / n);
    const h = 0.9 + ((i * 37) % 7) / 30;
    const log = new THREE.Mesh(geo, wood);
    log.position.set(x, 1.2 * h, 0);
    log.scale.y = h;
    const t = new THREE.Mesh(tip, wood);
    t.position.set(x, 2.4 * h + 0.2, 0);
    g.add(log, t);
  }
  return shadows(g);
}

/** Caixote / barril de mantimentos. */
export function crate(): THREE.Object3D {
  const k = kitModel(KIT.crate, { height: 0.8 });
  if (k) return k;
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), mat(0x8a6a3e));
  m.position.y = 0.4;
  return shadows(m);
}

export function barrel(): THREE.Object3D {
  const k = kitModel(KIT.barrel, { height: 0.95 });
  if (k) return k;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.9, 10), mat(0x7a5530));
  m.position.y = 0.45;
  return shadows(m);
}

/** Suporte de lanças. */
export function spearRack(): THREE.Group {
  const k = kitModel(KIT.weaponStand, { length: 1.7 });
  if (k) return k;
  const g = new THREE.Group();
  const wood = mat(0x5a3a1a);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), wood);
  bar.position.y = 1.1;
  g.add(bar);
  for (const x of [-0.75, 0.75]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.1), wood);
    leg.position.set(x, 0.6, 0);
    g.add(leg);
  }
  const iron = mat(0xb8b8c0, 0.4);
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 5), wood);
    s.position.set(-0.6 + i * 0.3, 1.1, 0.08);
    s.rotation.x = -0.2;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 5), iron);
    tip.position.set(-0.6 + i * 0.3, 2.2, 0.3);
    g.add(s, tip);
  }
  return shadows(g);
}

/** Casa caiada com telhado de telha (vilas do Sul). `w` = largura (X), `d` = profundidade (Z). */
export function house(w = 4, d = 3.5, h = 2.6): THREE.Group {
  const modular = modularHouse(w, d, h);
  if (modular) return modular;
  const g = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(0xe9e3d3, 0.95));
  walls.position.y = h / 2;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1), mat(0xa8553a));
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(w + 0.4, 1.3, d + 0.4);
  roof.position.y = h + 0.65;
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.08), mat(0x5a3a1a));
  door.position.set(-w * 0.2, 0.8, d / 2 + 0.02);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.08), mat(0x2a2a2a));
  win.position.set(w * 0.22, 1.6, d / 2 + 0.02);
  const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.35, d + 0.02), mat(0x3f6a9a));
  band.position.y = 0.175; // barra azul junto ao chão, típica das casas caiadas
  g.add(walls, roof, door, win, band);
  return shadows(g);
}

/** Módulos da Medieval Village MegaKit: paredes de 2 m de largura e 3,12 m de altura. */
const MOD_W = 2;
const MOD_H = 3.12;
/** Telhados prontos que existem no kit (largura x profundidade, em metros). */
const ROOFS: [number, number, string][] = [
  [4, 4, KIT.roof4x4], [6, 6, KIT.roof6x6], [6, 8, KIT.roof6x8], [8, 6, KIT.roof6x8], [8, 8, KIT.roof8x8],
];
let houseCount = 0;

/**
 * Casa montada com módulos (paredes de pedra ou reboco, porta, janelas e telhado de telha).
 * A porta fica na fachada da frente (+Z). A casa é escalada para ocupar exatamente w x d,
 * para coincidir com as colisões definidas nas cenas. Devolve null se os módulos não carregaram.
 */
function modularHouse(w: number, d: number, h: number): THREE.Group | null {
  // Escolher o telhado (e por isso as medidas da planta) mais próximo do pedido.
  const [W, D, roofUrl] = ROOFS.reduce((a, b) => (Math.hypot(b[0] - w, b[1] - d) < Math.hypot(a[0] - w, a[1] - d) ? b : a));
  const roof = kitRaw(roofUrl);
  if (!roof) return null;
  const storeys = h >= 4.4 ? 2 : 1;
  const plaster = houseCount++ % 3 === 1;
  const g = new THREE.Group();
  const inner = new THREE.Group();
  g.add(inner);

  const sides = [
    { len: W, x: 0, z: D / 2, rot: 0, front: true },
    { len: W, x: 0, z: -D / 2, rot: Math.PI, front: false },
    { len: D, x: W / 2, z: 0, rot: Math.PI / 2, front: false },
    { len: D, x: -W / 2, z: 0, rot: -Math.PI / 2, front: false },
  ];
  for (let s = 0; s < storeys; s++) {
    const upper = s > 0 || plaster;
    for (const side of sides) {
      const n = Math.round(side.len / MOD_W);
      for (let i = 0; i < n; i++) {
        const middle = i === Math.floor(n / 2);
        let url: string;
        if (s === 0 && side.front && middle) url = upper ? KIT.wallPlasterDoor : KIT.wallBrickDoor;
        else if ((i + s) % 2 === 1 || (side.front && !middle)) url = upper ? KIT.wallPlasterWindow : KIT.wallBrickWindow;
        else url = upper ? KIT.wallPlaster : KIT.wallBrick;
        const m = kitRaw(url);
        if (!m) continue;
        const along = -side.len / 2 + MOD_W / 2 + i * MOD_W;
        const c = Math.cos(side.rot);
        const sn = Math.sin(side.rot);
        m.position.set(side.x + along * c, s * MOD_H, side.z - along * sn);
        m.rotation.y = side.rot;
        inner.add(m);
      }
    }
  }
  // Interior escuro: os vãos das portas e janelas do kit são abertos e, sem isto,
  // via-se o céu através da casa.
  const hollow = new THREE.Mesh(new THREE.BoxGeometry(W - 0.66, storeys * MOD_H, D - 0.66), mat(0x1c140e, 1));
  hollow.position.y = (storeys * MOD_H) / 2;
  inner.add(hollow);
  // Pilares de pedra nas quatro esquinas (tapam a junta entre as paredes).
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    for (let s = 0; s < storeys; s++) {
      const c = kitRaw(KIT.corner);
      if (!c) continue;
      c.position.set((sx * W) / 2, s * MOD_H, (sz * D) / 2);
      c.rotation.y = Math.atan2(sx, sz) - Math.PI / 4;
      inner.add(c);
    }
  }
  // Telhado e empenas. Nos telhados do kit a cumeeira corre ao longo de Z (largura x profundidade);
  // numa planta mais larga do que funda (8 x 6) o telhado 6 x 8 roda 90°.
  const top = new THREE.Group();
  top.position.y = storeys * MOD_H;
  const turned = W > D;
  if (turned) top.rotation.y = Math.PI / 2;
  const span = turned ? D : W; // largura sob o telhado (onde assenta a empena)
  const run = turned ? W : D; // comprimento da cumeeira
  top.add(roof);
  const gableUrl = span <= 4 ? KIT.gable4 : span <= 6 ? KIT.gable6 : KIT.gable8;
  for (const [z, rot] of [[run / 2, 0], [-run / 2, Math.PI]] as const) {
    const gable = kitRaw(gableUrl);
    if (!gable) continue;
    gable.position.z = z;
    gable.rotation.y = rot;
    top.add(gable);
  }
  inner.add(top);
  if (houseCount % 2 === 0) {
    const ch = kitRaw(KIT.chimney);
    if (ch) {
      ch.position.set(W / 4, storeys * MOD_H + 0.6, -D / 4);
      inner.add(ch);
    }
  }
  g.scale.set(w / W, 1, d / D);
  return g;
}

/**
 * Campo de trigo: terra lavrada, espigas douradas em linhas (uma só malha instanciada) e cerca
 * de madeira à volta, com uma abertura a meio do lado da frente (+Z). `w` x `d` em metros.
 */
export function wheatField(w: number, d: number, seed = 1): THREE.Group {
  const g = new THREE.Group();
  const soil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(0x6e5434, 1));
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = 0.02;
  soil.receiveShadow = true;
  g.add(soil);

  // Cada espiga: caule fino + cabeça, juntos numa geometria.
  const stalk = new THREE.CylinderGeometry(0.012, 0.018, 0.9, 3);
  stalk.translate(0, 0.45, 0);
  const ear = new THREE.ConeGeometry(0.04, 0.22, 4);
  ear.translate(0, 0.98, 0);
  const merged = mergeTwo(stalk, ear);
  const rows = Math.floor(d / 0.35);
  const perRow = Math.floor(w / 0.22);
  const mesh = new THREE.InstancedMesh(merged, new THREE.MeshStandardMaterial({ color: 0xd9b54a, roughness: 0.9, flatShading: true }), rows * perRow);
  let s = seed * 9973;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const color = new THREE.Color();
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < perRow; c++) {
      const x = -w / 2 + 0.15 + c * 0.22 + (rnd() - 0.5) * 0.12;
      const z = -d / 2 + 0.2 + r * 0.35 + (rnd() - 0.5) * 0.1;
      e.set((rnd() - 0.5) * 0.35, rnd() * Math.PI, (rnd() - 0.5) * 0.35);
      const k = 0.75 + rnd() * 0.45;
      m.compose(new THREE.Vector3(x, 0, z), q.setFromEuler(e), new THREE.Vector3(k, k, k));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, color.setHSL(0.12 + rnd() * 0.03, 0.55, 0.5 + rnd() * 0.12));
      i++;
    }
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);

  // Cerca de madeira (módulos do kit) à volta, com entrada a meio da frente.
  const fenceAt = (x: number, z: number, rot: number) => {
    const f = kitModel(KIT.fence, { length: 2 });
    if (!f) return;
    f.position.set(x, 0, z);
    f.rotation.y = rot;
    g.add(f);
  };
  for (let x = -w / 2 + 1; x < w / 2; x += 2) {
    if (Math.abs(x) > 1.2) fenceAt(x, d / 2 + 0.3, 0);
    fenceAt(x, -d / 2 - 0.3, 0);
  }
  for (let z = -d / 2 + 1; z < d / 2; z += 2) {
    fenceAt(-w / 2 - 0.3, z, Math.PI / 2);
    fenceAt(w / 2 + 0.3, z, Math.PI / 2);
  }
  return g;
}

/** Junta duas geometrias não indexadas numa só (para instanciar). */
function mergeTwo(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  const A = a.toNonIndexed();
  const B = b.toNonIndexed();
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal'] as const) {
    const x = A.getAttribute(name).array as Float32Array;
    const y = B.getAttribute(name).array as Float32Array;
    const arr = new Float32Array(x.length + y.length);
    arr.set(x);
    arr.set(y, x.length);
    out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  return out;
}

/** Castelo simples: muralha quadrada com quatro torres e ameias. `size` = lado em metros. */
export function castle(size = 14, wallH = 5, color = 0xb5a88e): THREE.Group {
  const g = new THREE.Group();
  // Pedra fotográfica (mesma textura das muralhas), tingida pela cor pedida.
  const stone = new THREE.MeshStandardMaterial({ map: stoneWall([size / 8, wallH / 6]), color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.55), roughness: 0.95 });
  const merlon = new THREE.BoxGeometry(0.6, 0.6, 0.6);
  const half = size / 2;
  for (const [x, z, w, d] of [[0, -half, size, 1], [0, half, size, 1], [-half, 0, 1, size], [half, 0, 1, size]] as const) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), stone);
    wall.position.set(x, wallH / 2, z);
    g.add(wall);
    const n = Math.floor(Math.max(w, d) / 1.2);
    for (let i = 0; i < n; i++) {
      const t = -Math.max(w, d) / 2 + (i + 0.5) * (Math.max(w, d) / n);
      const m = new THREE.Mesh(merlon, stone);
      m.position.set(w > d ? x + t : x, wallH + 0.3, w > d ? z : z + t);
      if (i % 2 === 0) g.add(m);
    }
  }
  for (const [x, z] of [[-half, -half], [half, -half], [-half, half], [half, half]]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(2.6, wallH + 2.5, 2.6), stone);
    tower.position.set(x, (wallH + 2.5) / 2, z);
    g.add(tower);
    for (const [mx, mz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const m = new THREE.Mesh(merlon, stone);
      m.position.set(x + mx * 1, wallH + 2.8, z + mz * 1);
      g.add(m);
    }
  }
  // Torre de menagem no centro
  const keep = new THREE.Mesh(new THREE.BoxGeometry(4, wallH + 5, 4), stone);
  keep.position.y = (wallH + 5) / 2;
  g.add(keep);
  return shadows(g);
}

/** Barco de madeira de fundo chato (travessia do rio). */
/** Batel de remos do séc. XIV (ver ships.ts). */
export function boat(): THREE.Group {
  return rowingBoat();
}

/**
 * Marcador flutuante (losango dourado) sobre quem tem uma missão para o jogador.
 * Chamar `animateMarker` em cada frame.
 */
export function marker(): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.18),
    new THREE.MeshStandardMaterial({ color: 0xf2c94c, emissive: 0xc9922a, emissiveIntensity: 0.9, metalness: 0.3, roughness: 0.4 }),
  );
  m.scale.y = 1.6;
  return m;
}

export function animateMarker(m: THREE.Object3D, baseY: number, t: number): void {
  m.position.y = baseY + Math.sin(t * 3) * 0.12;
  m.rotation.y = t * 2;
}
