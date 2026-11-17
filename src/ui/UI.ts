import { PERSONAGENS } from '../story/personagens';
import type { Fala } from '../story/types';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

/** Interface em HTML por cima do 3D: missão, aviso de interação, diálogos, ecrãs e notificações. */
export class UI {
  private hud = $('hud');
  private objective = $('objective');
  private objectiveText = $('objective-text');
  private prompt = $('prompt');
  private dialog = $('dialog');
  private speaker = $('dialog-speaker');
  private text = $('dialog-text');
  private overlay = $('overlay');
  private toastEl = $('toast');
  private toastTimer = 0;

  showHud(visible: boolean): void {
    this.hud.hidden = !visible;
  }

  setObjective(text: string): void {
    this.objectiveText.textContent = text;
    this.objective.classList.remove('updated');
    void this.objective.offsetWidth; // reiniciar a animação
    this.objective.classList.add('updated');
  }

  setPrompt(label: string | null): void {
    if (!label) {
      this.prompt.hidden = true;
      return;
    }
    this.prompt.innerHTML = `<kbd>E</kbd>${escapeHtml(label)}`;
    this.prompt.hidden = false;
  }

  toast(text: string, ms = 3200): void {
    this.toastEl.textContent = text;
    this.toastEl.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => (this.toastEl.hidden = true), ms);
  }

  /**
   * Mostra uma sequência de falas. Avança com Espaço, Enter, E ou clique.
   * `onLine` é chamado a cada fala (para animar quem fala e mover a câmara).
   */
  playDialog(lines: Fala[], onLine?: (line: Fala) => void): Promise<void> {
    return new Promise((resolve) => {
      let i = 0;
      let typing = 0;
      let full = '';
      const show = () => {
        const line = lines[i];
        const p = PERSONAGENS[line.quem];
        this.speaker.textContent = p?.nome ?? line.quem;
        this.speaker.className = line.quem === 'narrador' ? 'narrador' : '';
        full = line.texto;
        this.text.textContent = '';
        onLine?.(line);
        // Efeito de máquina de escrever (rápido; um toque mostra logo tudo)
        let n = 0;
        clearInterval(typing);
        typing = window.setInterval(() => {
          n += 2;
          this.text.textContent = full.slice(0, n);
          if (n >= full.length) clearInterval(typing);
        }, 16);
      };
      const next = () => {
        if (this.text.textContent!.length < full.length) {
          clearInterval(typing);
          this.text.textContent = full;
          return;
        }
        i++;
        if (i >= lines.length) {
          cleanup();
          resolve();
        } else show();
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.repeat) return;
        if (['Space', 'Enter', 'KeyE', 'NumpadEnter'].includes(e.code)) {
          e.preventDefault();
          e.stopPropagation();
          next();
        }
      };
      const cleanup = () => {
        clearInterval(typing);
        window.removeEventListener('keydown', onKey, true);
        this.dialog.removeEventListener('click', next);
        this.dialog.hidden = true;
        this.hud.classList.remove('talking');
      };
      this.setPrompt(null);
      this.dialog.hidden = false;
      this.hud.classList.add('talking');
      // Captura: o diálogo consome as teclas antes do jogo (o E não reabre a conversa).
      window.addEventListener('keydown', onKey, true);
      this.dialog.addEventListener('click', next);
      show();
    });
  }

  /** Ecrã inteiro com um cartão em pergaminho. Resolve quando se carrega no botão. */
  card(html: string, button = 'Continuar'): Promise<void> {
    return new Promise((resolve) => {
      this.overlay.innerHTML = `<div class="card">${html}<div><button class="btn" type="button">${escapeHtml(button)}</button></div></div>`;
      this.overlay.hidden = false;
      const btn = this.overlay.querySelector('button')!;
      const done = () => {
        window.removeEventListener('keydown', onKey, true);
        this.overlay.hidden = true;
        this.overlay.innerHTML = '';
        resolve();
      };
      const onKey = (e: KeyboardEvent) => {
        if (['Enter', 'Space', 'NumpadEnter'].includes(e.code)) {
          e.preventDefault();
          e.stopPropagation();
          done();
        }
      };
      btn.addEventListener('click', done);
      // Pequeno atraso para a tecla que fechou o ecrã anterior não fechar também este.
      setTimeout(() => window.addEventListener('keydown', onKey, true), 250);
      btn.focus({ preventScroll: true });
    });
  }

  /** Dá acesso direto ao contentor de ecrãs (usado por minijogos como o mapa). */
  get overlayElement(): HTMLElement {
    return this.overlay;
  }

  get isBusy(): boolean {
    return !this.dialog.hidden || !this.overlay.hidden;
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
