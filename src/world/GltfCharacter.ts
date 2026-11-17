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
}

/** Nome "limpo" de uma animação: "CharacterArmature|Walk" ou "Female_Walk" passam a "Walk". */
function clipName(name: string): string {
  return name.replace(/^.*\|/, '').replace(/^(Female|Man)_/, '');
}

/** Animações equivalentes entre packs (o pedido da esquerda usa a da direita se faltar). */
const ALIASES: Record<string, string> = { PickUp: 'Interact' };

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

/**
 * Personagem a partir de um modelo glTF com esqueleto e animações (packs Quaternius).
 * Faz a transição suave entre Idle / Walk / Run de acordo com a velocidade.
 */
export class GltfCharacter implements Avatar {
  readonly root = new THREE.Group();
  private mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private locomotion: 'Idle' | 'Walk' | 'Run' = 'Idle';
  private oneShot: THREE.AnimationAction | null = null;
  private head: THREE.Object3D | null = null;
  private talkTime = 0;
  private nod = new THREE.Vector2();

  constructor(url: string, look: GltfLook = {}) {
    const gltf = cache.get(url);
    if (!gltf) throw new Error(`Modelo não carregado: ${url}`);

    const model = cloneSkinned(gltf.scene);
    // Materiais próprios para cada cópia (para poder recolorir sem afetar as outras).
    model.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false; // a caixa de um SkinnedMesh não acompanha a animação
      const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
        const c = (m as THREE.MeshStandardMaterial).clone();
        const hex = look.colors?.[c.name];
        if (hex !== undefined) c.color.setHex(hex);
        if (look.hide?.includes(c.name)) c.visible = false;
        c.roughness = Math.max(c.roughness, 0.55);
        c.flatShading = true;
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
    for (const clip of gltf.animations) this.actions.set(clipName(clip.name), this.mixer.clipAction(clip));
    this.actions.get('Idle')?.play();
  }

  update(dt: number, speed: number): void {
    // Escolher a animação de locomoção
    const want = speed < 0.25 ? 'Idle' : speed < 4.3 ? 'Walk' : 'Run';
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

  private fadeTo(name: 'Idle' | 'Walk' | 'Run'): void {
    const from = this.actions.get(this.locomotion);
    const to = this.actions.get(name);
    if (!to) return;
    to.reset().play();
    if (from) to.crossFadeFrom(from, 0.2, false);
    this.locomotion = name;
  }
}
