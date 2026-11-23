import * as THREE from 'three';
import { castileBanner } from './textures';

/**
 * Embarcações do séc. XIV feitas à mão (sem modelos externos):
 * - coca (nau de carga e de guerra do Atlântico): casco alto de tábuas sobrepostas, castelos de
 *   proa e de popa, um mastro com vela redonda, cesto da gávea e leme de popa;
 * - batel: barco pequeno de remos, dos pescadores e barqueiros do rio.
 * Em ambos o comprimento está no eixo Z (proa em +Z) e a linha de água em y = 0.
 */

const texCache = new Map<string, THREE.CanvasTexture>();

/** Tábuas do casco (fiadas horizontais, cada uma com um tom ligeiramente diferente). */
function planks(base: [number, number, number], strakes = 8): THREE.CanvasTexture {
  const key = base.join(',') + strakes;
  const hit = texCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  let s = 17;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const h = 256 / strakes;
  for (let i = 0; i < strakes; i++) {
    const k = 0.85 + rnd() * 0.3;
    g.fillStyle = `rgb(${base[0] * k},${base[1] * k},${base[2] * k})`;
    g.fillRect(0, i * h, 256, h);
    // veios da madeira
    for (let v = 0; v < 6; v++) {
      g.fillStyle = `rgba(0,0,0,${0.05 + rnd() * 0.06})`;
      g.fillRect(0, i * h + rnd() * h, 256, 1);
    }
    // junta entre tábuas sobrepostas (sombra por baixo, luz por cima)
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillRect(0, i * h + h - 3, 256, 3);
    g.fillStyle = 'rgba(255,240,210,0.12)';
    g.fillRect(0, i * h, 256, 1);
    // topos das tábuas e cavilhas
    const butt = rnd() * 256;
    g.fillStyle = 'rgba(0,0,0,0.4)';
    g.fillRect(butt, i * h, 2, h);
    for (let x = 8; x < 256; x += 32) g.fillRect(x + rnd() * 6, i * h + h / 2, 2, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  texCache.set(key, tex);
  return tex;
}

/** Lona da vela (riscas de pano cosidas na vertical). */
function canvasCloth(): THREE.CanvasTexture {
  const hit = texCache.get('cloth');
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#e6dcc2';
  g.fillRect(0, 0, 128, 128);
  for (let x = 0; x < 128; x += 16) {
    g.fillStyle = x % 32 === 0 ? 'rgba(120,90,50,0.10)' : 'rgba(255,255,255,0.06)';
    g.fillRect(x, 0, 16, 128);
    g.fillStyle = 'rgba(80,60,30,0.25)';
    g.fillRect(x, 0, 1, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  texCache.set('cloth', tex);
  return tex;
}

interface HullSpec {
  length: number;
  beam: number;
  /** Fundo da quilha (y negativo). */
  keel: number;
  /** Altura da borda a meio do navio. */
  sheer: number;
  /** Quanto a borda sobe na proa e na popa. */
  rise: number;
  /** Quão cheio é o casco (menor = mais afilado nas pontas). */
  fullness: number;
}

const halfBeam = (h: HullSpec, t: number) => (h.beam / 2) * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), 2.4)), h.fullness) + 0.03;
const sheerAt = (h: HullSpec, t: number) => h.sheer + h.rise * t * t;

/** Casco em "lofting": secções em U ao longo do comprimento, com as pontas fechadas. */
function hullGeometry(h: HullSpec, stations = 28, half = 9): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const cols = half * 2 + 1;
  for (let s = 0; s <= stations; s++) {
    const t = -1 + (2 * s) / stations;
    const z = (t * h.length) / 2;
    const b = halfBeam(h, t);
    const top = sheerAt(h, t);
    const bottom = h.keel * (1 - 0.45 * t * t); // a quilha sobe nas pontas
    for (let j = 0; j < cols; j++) {
      const u = j / half - 1; // -1 borda bombordo, 0 quilha, 1 borda estibordo
      const phi = (1 - Math.abs(u)) * (Math.PI / 2);
      const x = Math.sign(u) * b * Math.pow(Math.cos(phi), 0.55);
      const y = top - (top - bottom) * Math.pow(Math.sin(phi), 1.4);
      pos.push(x, y, z);
      uv.push((t * h.length) / 6, 1 - Math.abs(u));
    }
  }
  for (let s = 0; s < stations; s++) {
    for (let j = 0; j < cols - 1; j++) {
      const a = s * cols + j, b = a + 1, c = a + cols, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Convés plano com o contorno do casco, à altura `y`. */
function deckGeometry(h: HullSpec, y: number, inset = 0.94): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const t = -1 + (2 * i) / n;
    const p = [halfBeam(h, t) * inset, (-t * h.length) / 2 * 0.985] as const;
    if (i === 0) shape.moveTo(p[0], p[1]);
    else shape.lineTo(p[0], p[1]);
  }
  for (let i = n; i >= 0; i--) {
    const t = -1 + (2 * i) / n;
    shape.lineTo(-halfBeam(h, t) * inset, (-t * h.length) / 2 * 0.985);
  }
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

/** Peça cilíndrica entre dois pontos (mastros, vergas, remos, cabos). */
function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material, seg = 5): THREE.Mesh {
  const len = a.distanceTo(b);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), m);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return mesh;
}

/** Vela redonda enfunada pelo vento, pendurada da verga. */
function squareSail(w: number, hgt: number, map: THREE.Texture, billow = 0.7): THREE.Mesh {
  const g = new THREE.PlaneGeometry(w, hgt, 10, 10);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / w + 0.5;
    const y = p.getY(i) / hgt + 0.5;
    p.setZ(i, billow * Math.sin(Math.PI * x) * Math.sin(Math.PI * (0.15 + 0.85 * y)) );
  }
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 1 }));
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/**
 * Coca do séc. XIV (cerca de 18 m). `arms` = vela com as armas de Castela (navios de guerra
 * castelhanos); sem isso, vela de lona crua (navio mercante).
 */
export function cog(arms = false): THREE.Group {
  const g = new THREE.Group();
  const h: HullSpec = { length: 18, beam: 6, keel: -1.9, sheer: 1.7, rise: 0.9, fullness: 0.6 };
  const tarred = new THREE.MeshStandardMaterial({ map: planks([96, 66, 40]), roughness: 0.85, side: THREE.DoubleSide });
  const deckMat = new THREE.MeshStandardMaterial({ map: planks([150, 112, 70], 16), roughness: 0.9 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3c22, roughness: 0.85, flatShading: true });
  const rope = new THREE.MeshStandardMaterial({ color: 0x3a2e20, roughness: 1 });

  const hull = new THREE.Mesh(hullGeometry(h), tarred);
  hull.material.map!.repeat.set(1, 1);
  g.add(hull);
  // Faixa de alcatrão junto à água (o casco era calafetado e breado)
  const pitch = new THREE.Mesh(hullGeometry({ ...h, sheer: 0.25, rise: 0.2, beam: h.beam * 1.004 }), new THREE.MeshStandardMaterial({ color: 0x1e1712, roughness: 0.7, side: THREE.DoubleSide }));
  g.add(pitch);
  g.add(new THREE.Mesh(deckGeometry(h, h.sheer - 0.45), deckMat));

  // Castelo de popa: plataforma alta com amurada ameada (onde ficavam os besteiros)
  const sternZ = -h.length / 2 + 2.6;
  const castleW = halfBeam(h, -0.7) * 2 * 0.95;
  const aft = new THREE.Mesh(new THREE.BoxGeometry(castleW, 1.9, 4.2), new THREE.MeshStandardMaterial({ map: planks([110, 78, 48], 6), roughness: 0.85 }));
  aft.position.set(0, h.sheer + 0.7, sternZ);
  g.add(aft);
  const castleTop = h.sheer + 1.65;
  const rail = (w: number, d: number, y: number, z: number) => {
    for (const [px, pz, rw, rd] of [[0, d / 2, w, 0.12], [0, -d / 2, w, 0.12], [w / 2, 0, 0.12, d], [-w / 2, 0, 0.12, d]] as const) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.55, rd), wood);
      r.position.set(px, y + 0.27, z + pz);
      g.add(r);
      const n = Math.floor(Math.max(rw, rd) / 0.6);
      for (let i = 0; i < n; i++) {
        const k = -0.5 + (i + 0.5) / n;
        const m = new THREE.Mesh(new THREE.BoxGeometry(rw > rd ? 0.3 : 0.14, 0.3, rw > rd ? 0.14 : 0.3), wood);
        m.position.set(px + (rw > rd ? k * rw : 0), y + 0.7, z + pz + (rw > rd ? 0 : k * rd));
        g.add(m);
      }
    }
  };
  rail(castleW, 4.2, castleTop, sternZ);

  // Castelo de proa: plataforma triangular por cima da roda de proa
  const bowZ = h.length / 2 - 2.2;
  const foreW = halfBeam(h, 0.72) * 2 * 1.05;
  const fore = new THREE.Mesh(new THREE.BoxGeometry(foreW, 0.35, 3.2), new THREE.MeshStandardMaterial({ map: planks([110, 78, 48], 3), roughness: 0.85 }));
  const foreY = sheerAt(h, 0.75) + 0.9;
  fore.position.set(0, foreY, bowZ);
  g.add(fore);
  for (const sx of [-1, 1]) for (const dz of [-1.4, 1.2]) g.add(rod(V((sx * foreW) / 2.4, foreY, bowZ + dz), V((sx * foreW) / 2.4, sheerAt(h, 0.75) - 0.4, bowZ + dz), 0.08, wood));
  rail(foreW, 3.2, foreY + 0.17, bowZ);

  // Leme de popa (novidade das cocas) e gurupés
  const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.2, 1.1), wood);
  rudder.position.set(0, -0.2, -h.length / 2 - 0.4);
  rudder.rotation.x = -0.18;
  g.add(rudder);
  const bowTip = V(0, sheerAt(h, 1) + 2.3, h.length / 2 + 3.6);
  g.add(rod(V(0, sheerAt(h, 1) - 0.2, h.length / 2 - 0.8), bowTip, 0.13, wood, 6));

  // Mastro, cesto da gávea, verga e vela
  const mastZ = 0.6;
  const mastTop = 17;
  g.add(rod(V(0, h.keel + 0.5, mastZ), V(0, mastTop, mastZ), 0.26, wood, 8));
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.6, 0.8, 10, 1, true), wood);
  top.material.side = THREE.DoubleSide;
  top.position.set(0, mastTop - 1, mastZ);
  g.add(top);
  const yardY = mastTop - 2.6;
  g.add(rod(V(-5, yardY, mastZ + 0.35), V(5, yardY, mastZ + 0.35), 0.14, wood, 6));
  // Armas de Castela sem a franja do estandarte (corta-se a parte de baixo da textura).
  const armsTex = castileBanner();
  armsTex.repeat.y = 0.86;
  armsTex.offset.y = 0.14;
  const sail = squareSail(9.2, 8.4, arms ? armsTex : canvasCloth());
  sail.position.set(0, yardY - 4.3, mastZ + 0.45);
  g.add(sail);

  // Cordame: estai de proa, brandais e escotas
  const deckY = h.sheer;
  g.add(rod(V(0, mastTop - 1.4, mastZ), bowTip, 0.03, rope, 3));
  g.add(rod(V(0, mastTop - 1.4, mastZ), V(0, castleTop + 0.6, sternZ - 1.5), 0.03, rope, 3));
  for (const sx of [-1, 1]) {
    for (const dz of [-1.6, -0.6, 0.4]) {
      const t = (mastZ + dz) / (h.length / 2);
      g.add(rod(V(0, mastTop - 1.6, mastZ), V(sx * halfBeam(h, t), deckY, mastZ + dz), 0.025, rope, 3));
    }
    g.add(rod(V(sx * 4.6, yardY - 8.4, mastZ + 1.3), V(sx * halfBeam(h, -0.35), deckY, -3), 0.025, rope, 3));
  }

  // Bandeira no topo do mastro
  const flagTex = arms ? castileBanner() : canvasCloth();
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.9), new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 1 }));
  flag.position.set(0, mastTop + 0.2, mastZ - 1.1);
  flag.rotation.y = Math.PI / 2;
  g.add(flag, rod(V(0, mastTop - 0.2, mastZ), V(0, mastTop + 0.8, mastZ), 0.05, wood));

  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}

/** Batel de remos (cerca de 4,5 m), de tábuas sobrepostas, com dois bancos e remos recolhidos. */
export function rowingBoat(): THREE.Group {
  const g = new THREE.Group();
  const h: HullSpec = { length: 4.5, beam: 1.6, keel: -0.22, sheer: 0.55, rise: 0.28, fullness: 0.5 };
  const hullMat = new THREE.MeshStandardMaterial({ map: planks([120, 86, 52], 5), roughness: 0.85, side: THREE.DoubleSide });
  g.add(new THREE.Mesh(hullGeometry(h, 20, 6), hullMat));
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5434, roughness: 0.85, flatShading: true });
  g.add(new THREE.Mesh(deckGeometry(h, -0.05, 0.6), new THREE.MeshStandardMaterial({ map: planks([90, 64, 40], 6), roughness: 0.9 })));
  for (const z of [-0.7, 0.6]) {
    const t = z / (h.length / 2);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(halfBeam(h, t) * 1.9, 0.06, 0.32), wood);
    seat.position.set(0, 0.35, z);
    g.add(seat);
  }
  // Remos recolhidos ao longo do barco
  for (const sx of [-1, 1]) {
    g.add(rod(V(sx * 0.45, 0.45, -1.6), V(sx * 0.3, 0.5, 1.5), 0.035, wood, 5));
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.6), wood);
    blade.position.set(sx * 0.3, 0.5, 1.6);
    g.add(blade);
  }
  // Toletes na borda
  for (const sx of [-1, 1]) for (const z of [-0.4, 0.9]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 4), wood);
    p.position.set(sx * halfBeam(h, z / (h.length / 2)), sheerAt(h, z / (h.length / 2)) + 0.06, z);
    g.add(p);
  }
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}
