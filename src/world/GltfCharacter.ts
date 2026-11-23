import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Avatar } from './Avatar';
import { lerpAngle } from './Character';

/** Altura desejada das personagens no jogo (metros). */
const TARGET_HEIGHT = 1.85;

/** Velocidade (m/s) a que cada animação de locomoção "encaixa" nos pés — afinado à vista. */
const WALK_NATURAL = 2.4;
const RUN_NATURAL = 5.2;

export interface GltfLook {
  /** Recolorir materiais pelo nome (cores em sRGB, ex.: 0x8c1c1c). */
  colors?: Record<string, number>;
  /** Esconder as partes do modelo com estes materiais (ex.: a coroa do rei nos guardas). */
  hide?: string[];
  /** Ficheiro com as animações, quando o modelo não as traz (ex.: Universal Animation Library). */
  anims?: string;
  /** Partes com esqueleto igual (corpo com cara, cabelo, sobrancelhas) que passam a seguir os ossos do modelo. */
  parts?: string[];
  /** Objetos presos a um osso (ex.: espada na mão direita). */
  attach?: { url?: string; object?: () => THREE.Object3D; bone: string; position?: [number, number, number]; rotation?: [number, number, number]; size?: number }[];
  /** Esconder as malhas cujo nome corresponde (ex.: o capuz). */
  hideMeshes?: RegExp;
  /** Trocar a cor do tecido na textura (os tons verdes passam à cor pedida), só no material indicado. */
  recolor?: { material: string; to: number };
}

/** Texturas já recoloridas, partilhadas entre personagens com a mesma cor. */
const recolored = new Map<string, THREE.Texture>();

/**
 * Cópia da textura em que os píxeis verdes (o tecido da roupa Ranger) mudam de tom para `to`,
 * mantendo a luz e a sombra do desenho original. Couro, metal e pele ficam como estão.
 */
function recolorTexture(map: THREE.Texture, to: number): THREE.Texture {
  const key = `${map.uuid}:${to}`;
  const hit = recolored.get(key);
  if (hit) return hit;
  const img = map.image as CanvasImageSource & { width: number; height: number };
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || !img.width) return map;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  const target = new THREE.Color(to);
  const hsl = { h: 0, s: 0, l: 0 };
  target.getHSL(hsl, THREE.SRGBColorSpace);
  const tmp = new THREE.Color();
  const rgb = { r: 0, g: 0, b: 0 };
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max === 0 || g !== max || (max - min) / max < 0.25) continue; // só tons verdes saturados
    const hue = (60 * ((b - r) / (max - min)) + 120) / 360;
    if (hue < 0.2 || hue > 0.48) continue;
    const l = (max + min) / 2;
    // A luminosidade do tecido original (0,1–0,45) passa para perto da luminosidade da cor pedida.
    tmp.setHSL(hsl.h, hsl.s, THREE.MathUtils.clamp(l * (hsl.l / 0.28), 0, 0.92), THREE.SRGBColorSpace);
    tmp.getRGB(rgb, THREE.SRGBColorSpace);
    px[i] = rgb.r * 255;
    px[i + 1] = rgb.g * 255;
    px[i + 2] = rgb.b * 255;
  }
  ctx.putImageData(data, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = map.flipY;
  tex.colorSpace = map.colorSpace;
  tex.wrapS = map.wrapS;
  tex.wrapT = map.wrapT;
  tex.channel = map.channel;
  recolored.set(key, tex);
  return tex;
}

/** Nome "limpo" de uma animação: "CharacterArmature|Walk" ou "Female_Walk" passam a "Walk". */
function clipName(name: string): string {
  const n = name.replace(/^.*\|/, '').replace(/^(Female|Man)_/, '');
  return RENAME[n] ?? n.replace(/_Loop$/, '');
}

/** Nomes da Universal Animation Library (Quaternius) para os nomes usados no jogo. */
const RENAME: Record<string, string> = { Jog_Fwd_Loop: 'Run', PickUp_Table: 'PickUp', Idle_Talking_Loop: 'Talk' };

/** Animações equivalentes entre packs (o pedido da esquerda usa a da direita se faltar). */
const ALIASES: Record<string, string> = { PickUp: 'Interact' };

/**
 * Das partes extra só interessa a cabeça (cara, olhos, cabelo): o corpo base é mais largo do que
 * a roupa e atravessá-la-ia. Ficam apenas os triângulos cujos vértices seguem sobretudo a cabeça
 * ou o pescoço; o resto do corpo é retirado (a roupa já tem braços, mãos e pernas).
 */
function keepOnlyHead(sk: THREE.SkinnedMesh): void {
  const geo = sk.geometry;
  const idx = geo.getIndex();
  const si = geo.getAttribute('skinIndex');
  const sw = geo.getAttribute('skinWeight');
  if (!idx || !si || !sw) return;
  const keepBone = sk.skeleton.bones.map((b) => /^(head|neck_\d+)$/i.test(b.name) || /^(eye|jaw|lip|brow|cheek|nose|ear)/i.test(b.name));
  const vertexOnHead = (v: number) => {
    let best = 0;
    let bone = si.getX(v);
    for (let k = 0; k < 4; k++) {
      const w = sw.getComponent(v, k);
      if (w > best) { best = w; bone = si.getComponent(v, k); }
    }
    return keepBone[bone];
  };
  const kept: number[] = [];
  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2);
    if (vertexOnHead(a) && vertexOnHead(b) && vertexOnHead(c)) kept.push(a, b, c);
  }
  if (kept.length === idx.count) return;
  sk.geometry = geo.clone();
  sk.geometry.setIndex(kept);
}

/** Modelos já carregados, partilhados entre personagens. */
const cache = new Map<string, GLTF>();

export async function preloadModels(urls: string[], onProgress?: (done: number, total: number) => void): Promise<void> {
  const loader = new GLTFLoader();
  let done = 0;
  await Promise.all(
    urls.map(async (url) => {
      try {
        cache.set(url, await loader.loadAsync(url));
      } catch (err) {
        // Sem o modelo, o jogo usa as personagens simples (ver main.ts) em vez de parar.
        console.warn(`Não foi possível carregar ${url}`, err);
      }
      onProgress?.(++done, urls.length);
    }),
  );
}

export function hasModel(url: string): boolean {
  return cache.has(url);
}

/** Modelo carregado (para adereços estáticos do cenário). */
export function getModel(url: string): GLTF | undefined {
  return cache.get(url);
}

/**
 * Personagem a partir de um modelo glTF com esqueleto e animações (packs Quaternius).
 * Faz a transição suave entre Idle / Walk / Run de acordo com a velocidade.
 */
export class GltfCharacter implements Avatar {
  readonly root = new THREE.Group();
  private mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private locomotion = 'Idle';
  private oneShot: THREE.AnimationAction | null = null;
  private head: THREE.Object3D | null = null;
  private talkTime = 0;
  private nod = new THREE.Vector2();

  constructor(url: string, look: GltfLook = {}) {
    const gltf = cache.get(url);
    if (!gltf) throw new Error(`Modelo não carregado: ${url}`);

    const model = cloneSkinned(gltf.scene);
    // Juntar partes (ex.: corpo e cabeça por baixo da roupa): cada malha passa a usar os ossos
    // do modelo principal com o mesmo nome, por isso anima em conjunto com a roupa.
    const anchor = (() => {
      let a: THREE.Object3D | null = null;
      model.traverse((o) => { if (!a && (o as THREE.SkinnedMesh).isSkinnedMesh) a = o.parent; });
      return a ?? model;
    })();
    for (const url of look.parts ?? []) {
      const part = cache.get(url);
      if (!part) continue;
      const copy = cloneSkinned(part.scene);
      const meshes: THREE.SkinnedMesh[] = [];
      copy.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) meshes.push(o as THREE.SkinnedMesh); });
      for (const sk of meshes) {
        keepOnlyHead(sk);
        const bones = sk.skeleton.bones.map((b) => (model.getObjectByName(b.name) as THREE.Bone) ?? b);
        sk.bind(new THREE.Skeleton(bones, sk.skeleton.boneInverses), sk.bindMatrix);
        anchor.add(sk);
      }
    }
    // Materiais próprios para cada cópia (para poder recolorir sem afetar as outras).
    model.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      if (look.hideMeshes?.test(mesh.name)) mesh.visible = false;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false; // a caixa de um SkinnedMesh não acompanha a animação
      const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
        const c = (m as THREE.MeshStandardMaterial).clone();
        const hex = look.colors?.[c.name];
        if (hex !== undefined) c.color.setHex(hex);
        if (look.hide?.includes(c.name)) c.visible = false;
        if (look.recolor && c.name === look.recolor.material && c.map) c.map = recolorTexture(c.map, look.recolor.to);
        // Modelos com texturas (PBR) ficam como estão; os de cores lisas ganham o aspeto facetado.
        if (!c.map) {
          c.roughness = Math.max(c.roughness, 0.55);
          c.flatShading = true;
        }
        return c;
      });
      mesh.material = Array.isArray(mesh.material) ? mats : mats[0];
    });

    // Escalar para a altura do jogo e assentar os pés no chão.
    // A caixa tem de vir da malha já deformada pelos ossos: alguns modelos têm a geometria
    // em centímetros e a escala (0,01) no esqueleto.
    model.updateMatrixWorld(true);
    model.traverse((o) => {
      const sk = o as THREE.SkinnedMesh;
      if (sk.isSkinnedMesh) {
        sk.skeleton.update();
        sk.computeBoundingBox();
      }
    });
    const box = new THREE.Box3().setFromObject(model);
    const s = TARGET_HEIGHT / (box.max.y - box.min.y);
    model.scale.setScalar(s);
    model.position.y = -box.min.y * s;
    this.root.add(model);

    this.head = model.getObjectByName('Head') ?? null;
    this.mixer = new THREE.AnimationMixer(model);
    const clips = look.anims ? cache.get(look.anims)?.animations ?? [] : gltf.animations;
    for (const clip of clips) this.actions.set(clipName(clip.name), this.mixer.clipAction(clip));
    model.updateMatrixWorld(true);
    for (const a of look.attach ?? []) {
      const bone = model.getObjectByName(a.bone);
      const item = a.object ? a.object() : a.url ? cache.get(a.url)?.scene.clone(true) : undefined;
      if (!bone || !item) continue;
      // Compensar a escala do esqueleto para o objeto ficar com o tamanho pedido (metros).
      const wb = new THREE.Vector3();
      bone.getWorldScale(wb);
      item.scale.setScalar((a.size ?? 1) / (wb.x || 1));
      if (a.position) item.position.set(...a.position).divideScalar(wb.x || 1);
      if (a.rotation) item.rotation.set(...a.rotation);
      item.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
      bone.add(item);
    }
    this.actions.get('Idle')?.play();
  }

  update(dt: number, speed: number): void {
    // Escolher a animação de locomoção
    const want = speed < 0.25 ? (this.talkTime > 0 && this.actions.has('Talk') ? 'Talk' : 'Idle') : speed < 4.3 ? 'Walk' : 'Run';
    if (want !== this.locomotion && !this.oneShot) this.fadeTo(want);
    const walk = this.actions.get('Walk');
    const run = this.actions.get('Run');
    if (walk) walk.timeScale = THREE.MathUtils.clamp(speed / WALK_NATURAL, 0.6, 1.6);
    if (run) run.timeScale = THREE.MathUtils.clamp(speed / RUN_NATURAL, 0.8, 1.4);

    // Retirar o aceno do frame anterior (se a animação não mexer na cabeça, ele acumularia).
    if (this.head) {
      this.head.rotation.x -= this.nod.x;
      this.head.rotation.y -= this.nod.y;
    }
    this.mixer.update(dt);

    // Fala: o pack não tem animação de falar, por isso a cabeça acena por cima do Idle.
    this.nod.set(0, 0);
    if (this.head && this.talkTime > 0) {
      this.talkTime -= dt;
      const t = performance.now() / 1000;
      this.nod.set(Math.sin(t * 6) * 0.06, Math.sin(t * 2.3) * 0.08);
      this.head.rotation.x += this.nod.x;
      this.head.rotation.y += this.nod.y;
    }
  }

  talk(seconds = 3): void {
    this.talkTime = seconds;
  }

  faceTowards(target: THREE.Vector3, dt: number, rate = 6): void {
    const dx = target.x - this.root.position.x;
    const dz = target.z - this.root.position.z;
    if (dx * dx + dz * dz < 1e-4) return;
    this.root.rotation.y = lerpAngle(this.root.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * rate));
  }

  playOnce(name: string): Promise<void> {
    const action = this.actions.get(name) ?? this.actions.get(ALIASES[name] ?? '');
    if (!action) return Promise.resolve();
    return new Promise((resolve) => {
      const current = this.actions.get(this.locomotion)!;
      action.reset().setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.crossFadeFrom(current, 0.2, false).play();
      this.oneShot = action;
      const onDone = (e: { action: THREE.AnimationAction }) => {
        if (e.action !== action) return;
        this.mixer.removeEventListener('finished', onDone);
        this.oneShot = null;
        const idle = this.actions.get('Idle')!;
        idle.reset().play();
        idle.crossFadeFrom(action, 0.25, false);
        this.locomotion = 'Idle';
        resolve();
      };
      this.mixer.addEventListener('finished', onDone);
    });
  }

  private fadeTo(name: string): void {
    const from = this.actions.get(this.locomotion);
    const to = this.actions.get(name);
    if (!to) return;
    to.reset().play();
    if (from) to.crossFadeFrom(from, 0.2, false);
    this.locomotion = name;
  }
}
