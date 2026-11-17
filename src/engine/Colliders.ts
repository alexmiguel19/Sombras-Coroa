import * as THREE from 'three';

/** Caixa de colisão no plano do chão (XZ). Suficiente para paredes, mesas, colunas e personagens. */
export interface BoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export class CollisionWorld {
  readonly boxes: BoxCollider[] = [];
  /** Malhas que tapam a câmara (paredes) — usadas para aproximar a câmara do jogador. */
  readonly occluders: THREE.Object3D[] = [];

  addBox(box: BoxCollider): void {
    this.boxes.push(box);
  }

  /** Cria a caixa a partir de um objeto 3D já posicionado na cena. */
  addFromObject(obj: THREE.Object3D, padding = 0): void {
    obj.updateWorldMatrix(true, true);
    const b = new THREE.Box3().setFromObject(obj);
    this.addBox({ minX: b.min.x - padding, maxX: b.max.x + padding, minZ: b.min.z - padding, maxZ: b.max.z + padding });
  }

  /** Caixa centrada em (x, z) com largura w e profundidade d. */
  addRect(x: number, z: number, w: number, d: number): void {
    this.addBox({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  }

  /**
   * Empurra um círculo (o jogador) para fora de todas as caixas.
   * Altera `pos` diretamente. Duas passagens resolvem bem os cantos.
   */
  resolveCircle(pos: THREE.Vector3, radius: number): void {
    for (let pass = 0; pass < 2; pass++) {
      for (const b of this.boxes) {
        const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
        const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
        let dx = pos.x - cx;
        let dz = pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= radius * radius) continue;

        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          pos.x = cx + (dx / d) * radius;
          pos.z = cz + (dz / d) * radius;
        } else {
          // Centro dentro da caixa: sair pelo lado mais próximo.
          const left = pos.x - b.minX, right = b.maxX - pos.x;
          const back = pos.z - b.minZ, front = b.maxZ - pos.z;
          const m = Math.min(left, right, back, front);
          if (m === left) pos.x = b.minX - radius;
          else if (m === right) pos.x = b.maxX + radius;
          else if (m === back) pos.z = b.minZ - radius;
          else pos.z = b.maxZ + radius;
        }
      }
    }
  }
}
