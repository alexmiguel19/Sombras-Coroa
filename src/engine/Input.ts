/**
 * Estado do teclado e do rato.
 * A câmara roda quando se arrasta o rato com o botão premido (mais simples para alunos
 * do que o "pointer lock", e não interfere com os cliques na interface).
 */
export class Input {
  private keys = new Set<string>();
  private pressedThisFrame = new Set<string>();
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  /** Movimento acumulado do rato desde a última leitura (pixels). */
  mouseDX = 0;
  mouseDY = 0;
  /** Roda do rato acumulada (zoom). */
  wheel = 0;

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressedThisFrame.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    // Ao mudar de janela, largar todas as teclas para o escudeiro não ficar a andar sozinho.
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      this.mouseDX += e.clientX - this.lastX;
      this.mouseDY += e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });
    const stop = (e: PointerEvent) => {
      this.dragging = false;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    canvas.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  }

  isDown(...codes: string[]): boolean {
    return codes.some((c) => this.keys.has(c));
  }

  /** Verdadeiro apenas no frame em que a tecla foi premida. */
  wasPressed(...codes: string[]): boolean {
    return codes.some((c) => this.pressedThisFrame.has(c));
  }

  /** Chamar no fim de cada frame. */
  endFrame(): void {
    this.pressedThisFrame.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
  }

  /** Esquecer teclas premidas (ex.: ao abrir um diálogo). */
  reset(): void {
    this.keys.clear();
    this.pressedThisFrame.clear();
    this.dragging = false;
  }

  get canvasElement(): HTMLCanvasElement {
    return this.canvas;
  }
}
