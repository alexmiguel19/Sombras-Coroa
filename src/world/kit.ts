import * as THREE from 'three';
import { getModel } from './GltfCharacter';

const base = import.meta.env.BASE_URL;
const k = (path: string) => `${base}models/kenney/${path}.glb`;
const q = (path: string) => `${base}models/quaternius-fantasy/${path}.glb`;

/**
 * Adereços do cenário (CC0): Quaternius (Stylized Nature, Fantasy Props e Medieval Village MegaKit)
 * e Kenney (barcos, navios, chafariz e fogueira).
 */
export const KIT = {
  oak: q('nature/CommonTree_1'),
  tree: q('nature/CommonTree_2'),
  tree3: q('nature/CommonTree_3'),
  pine: q('nature/Pine_1'),
  pineRound: q('nature/Pine_2'),
  pine3: q('nature/Pine_3'),
  rock: q('nature/Rock_Medium_1'),
  rock2: q('nature/Rock_Medium_2'),
  bush: q('nature/Bush_Common'),
  barrel: q('props/Barrel'),
  crate: q('props/Crate_Wooden'),
  stallRed: q('props/Stall_Empty'),
  stallGreen: q('props/Stall_Cart_Empty'),
  torch: q('props/Torch_Metal'),
  weaponStand: q('props/WeaponStand'),
  table: q('props/Table_Large'),
  bench: q('props/Bench'),
  scroll: q('props/Scroll_1'),
  wagon: q('village/Prop_Wagon'),
  fence: q('village/Prop_WoodenFence_Single'),
  chimney: q('village/Prop_Chimney'),
  wallBrick: q('village/Wall_UnevenBrick_Straight'),
  wallBrickDoor: q('village/Wall_UnevenBrick_Door_Round'),
  wallBrickWindow: q('village/Wall_UnevenBrick_Window_Wide_Round'),
  wallPlaster: q('village/Wall_Plaster_Straight'),
  wallPlasterDoor: q('village/Wall_Plaster_Door_Round'),
  wallPlasterWindow: q('village/Wall_Plaster_Window_Wide_Round'),
  corner: q('village/Corner_Exterior_Brick'),
  roof4x4: q('village/Roof_RoundTiles_4x4'),
  roof6x6: q('village/Roof_RoundTiles_6x6'),
  roof6x8: q('village/Roof_RoundTiles_6x8'),
  roof8x8: q('village/Roof_RoundTiles_8x8'),
  campfire: k('nature/campfire_stones'),
  boat: k('pirate/boat-row-small'),
  ship: k('pirate/ship-large'),
  fountain: k('town/fountain-round'),
  cart: k('town/cart'),
};

/** Cópia simples (sem reescalar) de um modelo do kit, com sombras; null se não carregou. */
export function kitRaw(url: string): THREE.Object3D | null {
  const gltf = getModel(url);
  if (!gltf) return null;
  const m = gltf.scene.clone(true);
  m.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return m;
}

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
