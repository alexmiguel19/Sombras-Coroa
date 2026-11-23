import * as THREE from 'three';
import type { Avatar } from './Avatar';
import { Character, type CharacterLook } from './Character';
import { GltfCharacter, hasModel } from './GltfCharacter';

const base = import.meta.env.BASE_URL;

/** Modelos glTF usados no jogo (todos de Quaternius, CC0, obtidos no Poly Pizza). */
export const MODELS = {
  king: `${base}models/polypizza/King.glb`,
  farmer: `${base}models/polypizza/Farmer.glb`,
  noble: `${base}models/polypizza/Adventurer1.glb`,
  commoner: `${base}models/polypizza/Adventurer2.glb`,
  woman: `${base}models/polypizza/WomanDress.glb`,
  // Quaternius (CC0): Modular Character Outfits – Fantasy, Universal Animation Library e Fantasy Props MegaKit
  squire: `${base}models/quaternius-fantasy/Squire.glb`,
  peasantMale: `${base}models/quaternius-fantasy/MalePeasant.glb`,
  peasantFemale: `${base}models/quaternius-fantasy/FemalePeasant.glb`,
  anims: `${base}models/quaternius-fantasy/Animations.glb`,
  bodyMale: `${base}models/quaternius-fantasy/parts/Superhero_Male_FullBody.glb`,
  bodyFemale: `${base}models/quaternius-fantasy/parts/Superhero_Female_FullBody.glb`,
  hairShort: `${base}models/quaternius-fantasy/parts/Hair_SimpleParted.glb`,
  hairLong: `${base}models/quaternius-fantasy/parts/Hair_Long.glb`,
  beard: `${base}models/quaternius-fantasy/parts/Hair_Beard.glb`,
  browsMale: `${base}models/quaternius-fantasy/parts/Eyebrows_Regular.glb`,
  browsFemale: `${base}models/quaternius-fantasy/parts/Eyebrows_Female.glb`,
  sword: `${base}models/quaternius-fantasy/props/Sword_Bronze.glb`,
  shield: `${base}models/quaternius-fantasy/props/Shield_Wooden.glb`,
};

/** Modelo com as animações partilhadas, se tudo carregou. */
const withAnims = (url: string) => hasModel(url) && hasModel(MODELS.anims);

/** Tom um pouco mais escuro da mesma cor (para segundas peças de roupa). */
const darker = (hex: number, k = 0.72) =>
  (Math.round(((hex >> 16) & 255) * k) << 16) | (Math.round(((hex >> 8) & 255) * k) << 8) | Math.round((hex & 255) * k);

/** Coroa de ouro com pontas (para prender à cabeça do rei). Medidas em metros. */
function crown(): THREE.Object3D {
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4a52a, metalness: 0.85, roughness: 0.3 });
  const g = new THREE.Group();
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.1, 0.05, 16, 1, true), gold);
  band.material.side = THREE.DoubleSide;
  g.add(band);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.055, 4), gold);
    tip.position.set(Math.sin(a) * 0.1, 0.05, Math.cos(a) * 0.1);
    g.add(tip);
  }
  const ruby = new THREE.Mesh(new THREE.OctahedronGeometry(0.014), new THREE.MeshStandardMaterial({ color: 0xb0102a, roughness: 0.2 }));
  ruby.position.set(0, 0, 0.106);
  g.add(ruby);
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

/** Elmo de ferro de aba larga (chapéu de ferro dos peões do séc. XIV). */
function helmet(): THREE.Object3D {
  const iron = new THREE.MeshStandardMaterial({ color: 0x8a8d92, metalness: 0.8, roughness: 0.4 });
  const g = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), iron);
  dome.scale.set(1, 1.05, 1.1);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.2, 0.015, 20), iron);
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, 0.27), iron);
  ridge.position.y = 0.125;
  g.add(dome, brim, ridge);
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

/** Escudeiro do jogador (túnica azul). Sem o modelo, usa a personagem simples. */
export function createSquire(): Avatar {
  if (withAnims(MODELS.squire)) {
    // Escudeiro de capuz e couro, com espada na mão direita e escudo às costas.
    return new GltfCharacter(MODELS.squire, {
      parts: [MODELS.bodyMale, MODELS.browsMale],
      anims: MODELS.anims,
      attach: [
        { url: MODELS.sword, bone: 'hand_r', rotation: [0.71, 0.02, 0.06], size: 0.95 },
        { url: MODELS.shield, bone: 'spine_03', position: [-0.046, -0.138, -0.17], rotation: [2.93, -0.23, 1.67], size: 1 },
      ],
    });
  }
  if (hasModel(MODELS.commoner)) {
    return new GltfCharacter(MODELS.commoner, { colors: { Green: 0x2f5d8a, LightGreen: 0x4a7aa8, Hair_Brown: 0x6b3f1d } });
  }
  return new Character({ tunic: 0x2f5d8a, legs: 0x4a3b2a, cape: 0x7a1f1f, hair: 0x6b3f1d });
}

/**
 * Personagem não jogável. Escolhe o modelo 3D pelo aspeto pedido nas cenas
 * (coroa → rei; elmo → guarda; chapéu de palha → camponês; sem chapéu nem barba → aldeã; ...)
 * e recolore a roupa com as cores da cena. Se os modelos não carregarem, usa a personagem simples.
 */
export function castNpc(look: CharacterLook): Avatar {
  const pick = (url: string, colors: Record<string, number>, hide?: string[]) =>
    hasModel(url) ? new GltfCharacter(url, { colors, hide }) : new Character(look);

  // Rei e guardas: a mesma roupa do escudeiro (pack Fantasy), sem capuz, com o tecido recolorido.
  if ((look.crown || look.helmet) && withAnims(MODELS.squire)) {
    if (look.crown) {
      return new GltfCharacter(MODELS.squire, {
        anims: MODELS.anims,
        parts: [MODELS.bodyMale, MODELS.hairShort, MODELS.beard, MODELS.browsMale],
        hideMeshes: /Hood|Pauldron/,
        recolor: { material: 'MI_Ranger', to: look.cape ?? 0x1f3c8c },
        attach: [{ object: crown, bone: 'Head', position: [0, 0.2, 0.015] }],
      });
    }
    const tunic = look.tunic === 0x6b6b6b ? 0x8c1c1c : look.tunic;
    return new GltfCharacter(MODELS.squire, {
      anims: MODELS.anims,
      parts: [MODELS.bodyMale, MODELS.beard, MODELS.browsMale],
      hideMeshes: /Hood/,
      recolor: { material: 'MI_Ranger', to: tunic },
      attach: [
        { object: helmet, bone: 'Head', position: [0, 0.15, 0.01] },
        { url: MODELS.sword, bone: 'hand_r', rotation: [0.71, 0.02, 0.06], size: 0.95 },
        { url: MODELS.shield, bone: 'spine_03', position: [-0.046, -0.138, -0.17], rotation: [2.93, -0.23, 1.67], size: 1 },
      ],
    });
  }
  if (look.crown) return pick(MODELS.king, { Blue: look.cape ?? 0x1f3c8c });
  if (look.helmet) {
    // Guardas e soldados: o modelo do rei sem a coroa, com a túnica da cena.
    const tunic = look.tunic === 0x6b6b6b ? 0x8c1c1c : look.tunic;
    return pick(MODELS.king, { Blue: tunic, Hair_White: 0x3a2a1a }, ['Gold']);
  }
  // Camponeses e aldeãs: modelos detalhados do pack Fantasy (mesmo estilo do escudeiro).
  if (look.hat === 0x9a8040 && withAnims(MODELS.peasantMale)) return new GltfCharacter(MODELS.peasantMale, { anims: MODELS.anims, parts: [MODELS.bodyMale, MODELS.hairShort, MODELS.beard, MODELS.browsMale] });
  if (look.hat === undefined && look.beard === undefined && withAnims(MODELS.peasantFemale)) {
    return new GltfCharacter(MODELS.peasantFemale, { anims: MODELS.anims, parts: [MODELS.bodyFemale, MODELS.hairLong, MODELS.browsFemale] });
  }
  if (look.hat === 0x9a8040) return pick(MODELS.farmer, { LightBlue: darker(look.tunic, 0.6), Brown2: look.tunic });
  if (look.hat === undefined && look.beard === undefined) return pick(MODELS.woman, { Dress: look.tunic });
  const url = look.beard === 0xb8b0a0 || look.cape !== undefined ? MODELS.noble : MODELS.commoner;
  return pick(url, { Green: look.tunic, LightGreen: darker(look.tunic), ...(look.hair ? { Hair: look.hair, Hair_Brown: look.hair } : {}) });
}
