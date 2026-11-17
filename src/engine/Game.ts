import * as THREE from 'three';
import { Input } from './Input';
import { CollisionWorld } from './Colliders';
import { PlayerController } from './PlayerController';
import { Character } from '../world/Character';
import { UI } from '../ui/UI';
import type { Fala, QuemFala } from '../story/types';

/** Algo com que o escudeiro pode interagir com a tecla E. */
export interface Interactable {
  id: string;
  label: string;
  position: THREE.Vector3;
  radius: number;
  enabled: boolean;
  /** Ação por omissão quando ninguém está à espera desta interação (ex.: falas secundárias). */
  onInteract?: () => Promise<void> | void;
}

export interface Npc {
  id: QuemFala;
  character: Character;
  /** Vira-se para o escudeiro quando ele se aproxima. */
  watchPlayer: boolean;
  homeRotation: number;
}

/** Uma cena jogável: constrói o cenário 3D e corre o guião da missão. */
export interface Level {
  build(game: Game): void;
  run(game: Game): Promise<void>;
  update?(dt: number, game: Game): void;
}

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  readonly input: Input;
  readonly ui = new UI();
  scene = new THREE.Scene();
  world = new CollisionWorld();
  player: PlayerController;
  npcs: Npc[] = [];
  interactables: Interactable[] = [];

  private clock = new THREE.Clock();
  private waiters = new Map<string, () => void>();
  private busy = 0;
  private current: Interactable | null = null;
  private level: Level | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    // Limitar a resolução ajuda nos computadores mais fracos das escolas.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.input = new Input(canvas);
    this.player = new PlayerController(this.camera, this.input, this.world);

    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Troca de cena: limpa tudo, constrói a nova e corre o guião. */
  async play(level: Level): Promise<void> {
    this.disposeScene();
    this.scene = new THREE.Scene();
    this.world = new CollisionWorld();
    this.npcs = [];
    this.interactables = [];
    this.waiters.clear();
    this.player = new PlayerController(this.camera, this.input, this.world);
    this.scene.add(this.player.character.root);
    this.level = level;
    level.build(this);
    await level.run(this);
  }

  private disposeScene(): void {
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const mat of mats) {
        for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
        mat.dispose();
      }
    });
  }

  addNpc(id: QuemFala, character: Character, x: number, y: number, z: number, rotation: number, watchPlayer = true): Npc {
    character.root.position.set(x, y, z);
    character.root.rotation.y = rotation;
    this.scene.add(character.root);
    this.world.addRect(x, z, 0.7, 0.7);
    const npc = { id, character, watchPlayer, homeRotation: rotation };
    this.npcs.push(npc);
    return npc;
  }

  addInteractable(i: Omit<Interactable, 'enabled'> & { enabled?: boolean }): Interactable {
    const it = { enabled: true, ...i };
    this.interactables.push(it);
    return it;
  }

  /** Espera até o jogador interagir (tecla E) com o objeto `id`. */
  waitFor(id: string): Promise<void> {
    return new Promise((resolve) => this.waiters.set(id, resolve));
  }

  /** Bloqueia o movimento enquanto corre uma ação (diálogo, ecrã, minijogo). */
  async busyWith<T>(fn: () => Promise<T>): Promise<T> {
    this.busy++;
    this.input.reset();
    try {
      return await fn();
    } finally {
      this.busy--;
      this.input.reset();
    }
  }

  /** Mostra uma conversa, animando quem fala e virando a câmara para essa personagem. */
  talk(lines: Fala[]): Promise<void> {
    // Enquadrar logo de início a primeira personagem da conversa (mesmo que o escudeiro fale primeiro).
    const first = lines.map((l) => this.npcs.find((n) => n.id === l.quem)).find(Boolean);
    if (first) this.player.focusOn(first.character.root.position);
    return this.busyWith(() =>
      this.ui.playDialog(lines, (line) => {
        const npc = this.npcs.find((n) => n.id === line.quem);
        if (npc) {
          npc.character.talk(Math.max(2, line.texto.length / 18));
          this.player.focusOn(npc.character.root.position);
        } else if (line.quem === 'escudeiro') {
          this.player.character.talk(Math.max(2, line.texto.length / 18));
        }
      }),
    );
  }

  private frame(): void {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const blocked = this.busy > 0 || this.ui.isBusy;
    this.player.enabled = !blocked;
    this.player.update(dt);

    const ppos = this.player.position;
    for (const npc of this.npcs) {
      const near = npc.watchPlayer && npc.character.root.position.distanceTo(ppos) < 4.5;
      if (near) npc.character.faceTowards(ppos, dt, 4);
      else npc.character.root.rotation.y += (npc.homeRotation - npc.character.root.rotation.y) * Math.min(1, dt * 2);
      npc.character.update(dt, 0);
    }

    this.updateInteraction(blocked);
    this.level?.update?.(dt, this);
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  }

  private updateInteraction(blocked: boolean): void {
    let best: Interactable | null = null;
    let bestD = Infinity;
    if (!blocked) {
      for (const it of this.interactables) {
        if (!it.enabled) continue;
        const d = Math.hypot(it.position.x - this.player.position.x, it.position.z - this.player.position.z);
        if (d < it.radius && d < bestD) {
          best = it;
          bestD = d;
        }
      }
    }
    if (best !== this.current) {
      this.current = best;
      this.ui.setPrompt(best ? best.label : null);
    }
    if (best && this.input.wasPressed('KeyE')) {
      const waiter = this.waiters.get(best.id);
      if (waiter) {
        this.waiters.delete(best.id);
        this.current = null;
        this.ui.setPrompt(null);
        waiter();
      } else if (best.onInteract) {
        this.current = null;
        this.ui.setPrompt(null);
        const fn = best.onInteract;
        void this.busyWith(async () => fn());
      }
    }
  }
}
