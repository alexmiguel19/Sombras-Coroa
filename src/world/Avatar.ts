import type * as THREE from 'three';

/**
 * O que o jogo precisa de uma personagem, seja feita com formas simples (Character)
 * ou carregada de um modelo glTF animado (GltfCharacter).
 */
export interface Avatar {
  readonly root: THREE.Object3D;
  /** Atualizar animações. `speed` em m/s (0 = parado). */
  update(dt: number, speed: number): void;
  /** Gestos de fala durante `seconds`. */
  talk(seconds?: number): void;
  /** Rodar suavemente para olhar para um ponto. */
  faceTowards(target: THREE.Vector3, dt: number, rate?: number): void;
  /** Tocar uma animação uma vez (ex.: apanhar um pergaminho). Resolve quando acaba. */
  playOnce?(name: string): Promise<void>;
}
