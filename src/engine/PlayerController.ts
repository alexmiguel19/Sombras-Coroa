import * as THREE from 'three';
import type { Input } from './Input';
import type { CollisionWorld } from './Colliders';
import { lerpAngle } from '../world/Character';
import type { Avatar } from '../world/Avatar';
import { createSquire } from '../world/cast';

const WALK_SPEED = 3.2;
const RUN_SPEED = 5.8;
const RADIUS = 0.38;

/**
 * Escudeiro controlado pelo jogador + câmara na 3.ª pessoa.
 * O movimento é relativo à direção da câmara (W anda "para a frente do ecrã").
 */
export class PlayerController {
  readonly character: Avatar;
  enabled = true;

  // Câmara orbital à volta do jogador
  private yaw = 0; // câmara em +Z a olhar para -Z (definido em spawn)
  private pitch = 0.32;
  private distance = 5.2;
  private readonly minDist = 2.2;
  private readonly maxDist = 8;
  private camPos = new THREE.Vector3();
  private velocity = new THREE.Vector3();
  private raycaster = new THREE.Raycaster();

  constructor(
    private camera: THREE.PerspectiveCamera,
    private input: Input,
    private world: CollisionWorld,
  ) {
    this.character = createSquire();
  }

  get position(): THREE.Vector3 {
    return this.character.root.position;
  }

  /** Coloca o jogador num ponto, virado para `facing` (radianos), e encosta a câmara atrás. */
  spawn(x: number, z: number, facing: number): void {
    this.position.set(x, 0, z);
    this.character.root.rotation.y = facing;
    this.yaw = facing + Math.PI;
    this.velocity.set(0, 0, 0);
    this.updateCamera(1, true);
  }

  update(dt: number): void {
    // Rodar câmara (arrastar rato) e zoom (roda)
    this.yaw -= this.input.mouseDX * 0.006;
    this.pitch = THREE.MathUtils.clamp(this.pitch + this.input.mouseDY * 0.004, 0.05, 1.1);
    this.distance = THREE.MathUtils.clamp(this.distance + this.input.wheel * 0.6, this.minDist, this.maxDist);

    let moveX = 0;
    let moveZ = 0;
    if (this.enabled) {
      if (this.input.isDown('KeyW', 'ArrowUp')) moveZ += 1;
      if (this.input.isDown('KeyS', 'ArrowDown')) moveZ -= 1;
      if (this.input.isDown('KeyA', 'ArrowLeft')) moveX -= 1;
      if (this.input.isDown('KeyD', 'ArrowRight')) moveX += 1;
    }

    const len = Math.hypot(moveX, moveZ);
    const running = this.input.isDown('ShiftLeft', 'ShiftRight');
    const targetSpeed = len > 0 ? (running ? RUN_SPEED : WALK_SPEED) : 0;

    // Direção no mundo a partir da câmara: "frente" = da câmara para o jogador
    const fwdX = -Math.sin(this.yaw);
    const fwdZ = -Math.cos(this.yaw);
    const rightX = -fwdZ;
    const rightZ = fwdX;
    const desired = new THREE.Vector3();
    if (len > 0) {
      desired.set(fwdX * moveZ + rightX * moveX, 0, fwdZ * moveZ + rightZ * moveX).normalize().multiplyScalar(targetSpeed);
    }
    // Aceleração suave
    this.velocity.lerp(desired, Math.min(1, dt * (len > 0 ? 10 : 14)));

    this.position.addScaledVector(this.velocity, dt);
    this.world.resolveCircle(this.position, RADIUS);

    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (speed > 0.2) {
      const facing = Math.atan2(this.velocity.x, this.velocity.z);
      this.character.root.rotation.y = lerpAngle(this.character.root.rotation.y, facing, Math.min(1, dt * 12));
    }
    this.character.update(dt, speed);
    this.updateCamera(dt, false);
  }

  /** Mantém a câmara atrás do jogador e aproxima-a se uma parede ficar no meio. */
  private updateCamera(dt: number, snap: boolean): void {
    const target = this.position.clone().add(new THREE.Vector3(0, 1.6, 0));
    const dir = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    );

    let dist = this.distance;
    if (this.world.occluders.length) {
      this.raycaster.set(target, dir);
      this.raycaster.far = this.distance;
      const hit = this.raycaster.intersectObjects(this.world.occluders, true)[0];
      if (hit) dist = Math.max(0.6, hit.distance - 0.3);
    }

    const desired = target.clone().addScaledVector(dir, dist);
    if (snap) this.camPos.copy(desired);
    else this.camPos.lerp(desired, Math.min(1, dt * 12));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(target);
  }

  /**
   * Vira a câmara para enquadrar um ponto (usado nos diálogos).
   * Fica ligeiramente de lado ("por cima do ombro") para o escudeiro não tapar quem fala.
   */
  focusOn(point: THREE.Vector3): void {
    const dx = point.x - this.position.x;
    const dz = point.z - this.position.z;
    this.yaw = Math.atan2(-dx, -dz) + 0.55;
  }
}
