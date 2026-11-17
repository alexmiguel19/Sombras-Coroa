import type { Avatar } from './Avatar';
import { Character } from './Character';
import { GltfCharacter, hasModel } from './GltfCharacter';

const base = import.meta.env.BASE_URL;

/** Modelos glTF usados no jogo (pack CC0 "Ultimate Animated Character Pack", Quaternius). */
export const MODELS = {
  knight: `${base}models/quaternius/Knight_Male.gltf`,
};

/**
 * Escudeiro do jogador. Usa o modelo glTF se tiver carregado; caso contrário
 * (sem rede, ficheiro em falta) usa a personagem simples para o jogo nunca parar.
 */
export function createSquire(): Avatar {
  if (hasModel(MODELS.knight)) {
    return new GltfCharacter(MODELS.knight, {
      colors: {
        Skin: 0xe0b48c,
        Armor: 0xa3a8b0, // cota de malha / ferro
        Armor_Dark: 0x50555e,
        Detail: 0x6b4423, // couro
        Red: 0x2f5d8a, // túnica azul do escudeiro (igual à versão simples)
      },
    });
  }
  return new Character({ tunic: 0x2f5d8a, legs: 0x4a3b2a, cape: 0x7a1f1f, hair: 0x6b3f1d });
}
