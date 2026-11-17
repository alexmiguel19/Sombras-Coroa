import * as THREE from 'three';
import { getModel } from './GltfCharacter';

const base = import.meta.env.BASE_URL;
const k = (path: string) => `${base}models/kenney/${path}.glb`;

/** Adereços do cenário (packs CC0 de Kenney: Nature, Pirate e Fantasy Town Kit). */
export const KIT = {
  oak: k('nature/tree_oak'),
  tree: k('nature/tree_default'),
  pine: k('nature/tree_pineTallA'),
  pineRound: k('nature/tree_pineRoundC'),
  rock: k('nature/rock_largeA'),
  campfire: k('nature/campfire_stones'),
  barrel: k('pirate/barrel'),
  crate: k('pirate/crate'),
  boat: k('pirate/boat-row-small'),
  ship: k('pirate/ship-large'),
  stallRed: k('town/stall-red'),
  stallGreen: k('town/stall-green'),
  fountain: k('town/fountain-round'),
  cart: k('town/cart'),
};

export interface Fit {
  /** Altura final (m). */
  height?: number;
  /** Comprimento final da maior medida horizontal (m). */
  length?: number;
  /** Rodar 90° para o lado mais comprido ficar no eixo Z. */
  alongZ?: boolean;
}

/**
 * Cópia de um adereço do kit, à escala pedida, centrado e assente no chão (y = 0).
 * Devolve null se o modelo não carregou (quem chama usa então a versão simples).
 */
export function kitModel(url: string, fit: Fit): THREE.Group | null {
  const gltf = getModel(url);
  if (!gltf) return null;
  const model = gltf.scene.clone(true);
  model.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  let box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  if (fit.alongZ && size.x > size.z) {
    model.rotation.y = Math.PI / 2;
    model.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(model);
    box.getSize(size);
  }
  const s = fit.height ? fit.height / size.y : fit.length ? fit.length / Math.max(size.x, size.z) : 1;
  model.scale.multiplyScalar(s);
  model.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(model);
  const c = box.getCenter(new THREE.Vector3());
  model.position.x -= c.x;
  model.position.z -= c.z;
  model.position.y -= box.min.y;
  const g = new THREE.Group();
  g.add(model);
  return g;
}
