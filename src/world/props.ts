import * as THREE from 'three';
import { royalBanner, castileBanner, tentCloth } from './textures';

/**
 * Adereços reutilizáveis entre cenas (exterior medieval).
 * Feitos com formas simples; podem ser trocados por modelos glTF na fase final.
 */

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
  const stone = mat(0x6e6a62);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16), stone);
    s.position.set(Math.cos(a) * 0.5, 0.08, Math.sin(a) * 0.5);
    g.add(s);
  }
  const wood = mat(0x4a2e14);
  for (let i = 0; i < 3; i++) {
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
export function crate(): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), mat(0x8a6a3e));
  m.position.y = 0.4;
  return shadows(m);
}

export function barrel(): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.9, 10), mat(0x7a5530));
  m.position.y = 0.45;
  return shadows(m);
}

/** Suporte de lanças. */
export function spearRack(): THREE.Group {
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
