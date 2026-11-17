import { escapeHtml } from './UI';
import type { DesafioPergaminho } from '../story/types';

/**
 * Minijogo do pergaminho: o aluno lê o tratado e escolhe as condições certas.
 * Não há forma de perder: uma escolha errada abana, explica porquê e pode voltar a tentar.
 * Serve para todos os tratados do jogo (Alcoutim, Santarém, Elvas, Salvaterra de Magos).
 */
export function runParchmentChallenge(container: HTMLElement, d: DesafioPergaminho): Promise<void> {
  return new Promise((resolve) => {
    const total = d.opcoes.filter((o) => o.certa).length;
    const opts = d.opcoes
      .map((o, i) => `<button type="button" class="treaty-option" data-i="${i}"><span class="tick" aria-hidden="true"></span>${escapeHtml(o.texto)}</button>`)
      .join('');

    container.innerHTML = `
      <div class="card treaty-card">
        <h2>${escapeHtml(d.titulo)}</h2>
        <div class="treaty-scroll">
          <p class="treaty-head">${escapeHtml(d.cabecalho)}</p>
          <div class="treaty-options">${opts}</div>
        </div>
        <p class="small">${escapeHtml(d.instrucao)} <span class="treaty-count">(0/${total})</span></p>
        <div class="map-feedback" aria-live="polite"></div>
        <div class="map-actions"></div>
      </div>`;
    container.hidden = false;

    const feedback = container.querySelector<HTMLElement>('.map-feedback')!;
    const actions = container.querySelector<HTMLElement>('.map-actions')!;
    const counter = container.querySelector<HTMLElement>('.treaty-count')!;
    let found = 0;

    container.querySelectorAll<HTMLButtonElement>('.treaty-option').forEach((el) => {
      el.addEventListener('click', () => {
        if (found === total || el.classList.contains('right')) return;
        const o = d.opcoes[Number(el.dataset.i)];
        if (o.certa) {
          found++;
          el.classList.add('right');
          el.setAttribute('aria-pressed', 'true');
          counter.textContent = `(${found}/${total})`;
          feedback.textContent = found < total ? 'Certo! Falta encontrar mais uma condição.' : d.certo;
          if (found === total) finish();
        } else {
          el.classList.remove('wrong');
          void el.offsetWidth; // reiniciar a animação
          el.classList.add('wrong');
          setTimeout(() => el.classList.remove('wrong'), 600);
          feedback.textContent = o.explicacao ?? 'Essa condição não está neste tratado.';
        }
      });
    });

    function finish(): void {
      container.querySelectorAll('.treaty-option:not(.right)').forEach((el) => el.classList.add('faded'));
      actions.innerHTML = `<button class="btn" type="button">${escapeHtml(d.botao)}</button>`;
      const btn = actions.querySelector('button')!;
      btn.focus({ preventScroll: true });
      btn.addEventListener('click', () => {
        container.hidden = true;
        container.innerHTML = '';
        resolve();
      });
    }
  });
}
