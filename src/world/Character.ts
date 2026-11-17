import * as THREE from 'three';

/**
 * Personagens low-poly feitas com formas simples do Three.js.
 * Servem de base até haver modelos glTF (Kenney/Quaternius + Mixamo); a interface
 * (root, update, lookAt) manter-se-á quando forem trocados por modelos animados.
 */
export interface CharacterLook {
  tunic: number;
  legs?: number;
  skin?: number;
  hair?: number;
  /** Capa às costas (cor). */
  cape?: number;
  crown?: boolean;
  beard?: number;
  /** Capacete de ferro (guardas e soldados). */
  helmet?: boolean;
  /** Chapéu de abas (camponeses, mercadores). */
  hat?: number;
  /** Cruz pintada na túnica (ex.: vermelha de São Jorge). */
  cross?: number;
  /** Lança na mão direita. */
  spear?: boolean;
  /** Escala geral (crianças, figuras imponentes). */
  scale?: number;
}

const mat = (color: number, rough = 0.85) => new THREE.MeshStandardMaterial({ color, roughness: rough, flatShading: true });

export class Character {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private legL = new THREE.Group();
  private legR = new THREE.Group();
  private armL = new THREE.Group();
  private armR = new THREE.Group();
  private head = new THREE.Group();
  private phase = Math.random() * Math.PI * 2;
  private walkAmount = 0;
  private talkTime = 0;

  constructor(look: CharacterLook) {
    const skin = mat(look.skin ?? 0xe0b48c);
    const tunic = mat(look.tunic);
    const legs = mat(look.legs ?? 0x3b2f25);
    const boots = mat(0x2a1c10);

    // Pernas (pivô na anca)
    for (const [leg, x] of [[this.legL, -0.13], [this.legR, 0.13]] as const) {
      leg.position.set(x, 0.85, 0);
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.22), legs);
      thigh.position.y = -0.38;
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.32), boots);
      boot.position.set(0, -0.78, 0.04);
      leg.add(thigh, boot);
      this.body.add(leg);
    }

    // Tronco (túnica alarga para baixo)
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.36, 0.85, 8), tunic);
    torso.position.y = 1.25;
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.07, 8), mat(0x4a2e14));
    belt.position.y = 1.08;
    this.body.add(torso, belt);

    if (look.cross !== undefined) {
      const crossMat = mat(look.cross);
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.02), crossMat);
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.02), crossMat);
      v.position.set(0, 1.3, 0.3);
      h.position.set(0, 1.38, 0.29);
      v.rotation.x = h.rotation.x = -0.1;
      this.body.add(v, h);
    }

    if (look.cape !== undefined) {
      const cape = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.15, 0.05), mat(look.cape));
      cape.position.set(0, 1.12, -0.3);
      cape.rotation.x = 0.08;
      this.body.add(cape);
    }

    // Braços (pivô no ombro)
    for (const [arm, x] of [[this.armL, -0.36], [this.armR, 0.36]] as const) {
      arm.position.set(x, 1.6, 0);
      const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.18), tunic);
      sleeve.position.y = -0.3;
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.13), skin);
      hand.position.y = -0.66;
      arm.add(sleeve, hand);
      this.body.add(arm);
    }

    if (look.spear) {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.4, 6), mat(0x6b4a2a));
      shaft.position.set(0, -0.3, 0.1);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 6), mat(0xb8b8c0, 0.4));
      tip.position.set(0, 0.98, 0.1);
      this.armR.add(shaft, tip);
    }

    // Cabeça
    this.head.position.y = 1.72;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.12, 6), skin);
    neck.position.y = 0.0;
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.38, 0.34), skin);
    skull.position.y = 0.24;
    const eyeMat = mat(0x1a1410);
    for (const x of [-0.08, 0.08]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.02), eyeMat);
      eye.position.set(x, 0.28, 0.17);
      this.head.add(eye);
    }
    this.head.add(neck, skull);

    if (!look.helmet) {
      const hair = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.14, 0.37), mat(look.hair ?? 0x3a2414));
      hair.position.y = 0.46;
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.28, 0.08), mat(look.hair ?? 0x3a2414));
      back.position.set(0, 0.3, -0.15);
      this.head.add(hair, back);
    }
    if (look.beard !== undefined) {
      const beard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.08), mat(look.beard));
      beard.position.set(0, 0.1, 0.16);
      this.head.add(beard);
    }
    if (look.crown) {
      const gold = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.3, flatShading: true });
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.1, 8, 1, true), gold);
      band.position.y = 0.5;
      this.head.add(band);
      for (let i = 0; i < 8; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 4), gold);
        const a = (i / 8) * Math.PI * 2;
        spike.position.set(Math.cos(a) * 0.2, 0.6, Math.sin(a) * 0.2);
        this.head.add(spike);
      }
    }
    if (look.helmet) {
      const iron = new THREE.MeshStandardMaterial({ color: 0x8a8d94, metalness: 0.7, roughness: 0.45, flatShading: true });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), iron);
      dome.position.y = 0.4;
      const nasal = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.03), iron);
      nasal.position.set(0, 0.32, 0.19);
      this.head.add(dome, nasal);
    }
    if (look.hat !== undefined) {
      const hatMat = mat(look.hat);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 10), hatMat);
      brim.position.y = 0.45;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.18, 10), hatMat);
      top.position.y = 0.55;
      this.head.add(brim, top);
    }
    this.body.add(this.head);

    this.body.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    this.root.add(this.body);
    if (look.scale) this.root.scale.setScalar(look.scale);
  }

  /** Ativa a animação de fala (gestos e cabeça) durante `seconds`. */
  talk(seconds = 3): void {
    this.talkTime = seconds;
  }

  /** Atualizar animações. `speed` em m/s (0 = parado). */
  update(dt: number, speed: number): void {
    const target = Math.min(speed / 4, 1.4);
    this.walkAmount += (target - this.walkAmount) * Math.min(1, dt * 10);
    this.phase += dt * (2 + speed * 2.2);

    const s = Math.sin(this.phase) * this.walkAmount;
    this.legL.rotation.x = s * 0.7;
    this.legR.rotation.x = -s * 0.7;
    this.armL.rotation.x = -s * 0.6;
    this.armR.rotation.x = s * 0.6;
    this.body.position.y = Math.abs(Math.cos(this.phase)) * 0.06 * this.walkAmount;

    // Respiração em repouso
    const idle = 1 - Math.min(this.walkAmount, 1);
    this.body.scale.y = 1 + Math.sin(this.phase * 0.5) * 0.008 * idle;

    if (this.talkTime > 0) {
      this.talkTime -= dt;
      const t = performance.now() / 1000;
      this.armR.rotation.x = -0.5 + Math.sin(t * 3) * 0.25;
      this.armR.rotation.z = 0.2;
      this.head.rotation.x = Math.sin(t * 5) * 0.05;
    } else {
      this.armR.rotation.z *= 0.9;
      this.head.rotation.x *= 0.9;
    }
  }

  /** Rodar suavemente para olhar para um ponto (apenas no eixo vertical). */
  faceTowards(target: THREE.Vector3, dt: number, rate = 6): void {
    const dx = target.x - this.root.position.x;
    const dz = target.z - this.root.position.z;
    if (dx * dx + dz * dz < 1e-4) return;
    const desired = Math.atan2(dx, dz);
    this.root.rotation.y = lerpAngle(this.root.rotation.y, desired, Math.min(1, dt * rate));
  }
}

export function lerpAngle(a: number, b: number, t: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
