import { escapeHtml } from './UI';

/**
 * Minijogo: clicar numa região de um mapa simplificado da Península Ibérica (c. 1369).
 * As fronteiras são esquemáticas — servem para orientação, não para rigor cartográfico.
 * As regiões não têm nome escrito (seria dar a resposta); ao errar, o jogo diz que região foi.
 */
interface Region {
  id: string;
  nome: string;
  fill: string;
  points: string;
}

const REGIONS: Region[] = [
  {
    id: 'galiza', nome: 'Galiza', fill: '#d9c08a',
    points: '60,40 110,30 150,45 160,70 150,108 78,112 55,85',
  },
  {
    id: 'portugal', nome: 'Portugal', fill: '#c9b07a',
    points: '78,112 150,108 165,140 150,190 170,240 150,290 165,330 150,380 160,420 90,425 70,400 80,360 60,330 50,280 62,230 70,170',
  },
  {
    id: 'castela', nome: 'Castela', fill: '#e2cf9c',
    points: '150,45 250,40 330,60 330,100 360,115 390,180 380,250 400,300 430,330 420,390 400,430 370,400 300,395 250,420 200,440 160,420 150,380 165,330 150,290 170,240 150,190 165,140 150,108 160,70',
  },
  {
    id: 'navarra', nome: 'Navarra', fill: '#cdb889',
    points: '330,60 375,55 390,90 360,115 330,100',
  },
  {
    id: 'aragao', nome: 'Aragão', fill: '#d4bc85',
    points: '375,55 470,60 560,95 530,150 470,210 450,280 400,300 380,250 390,180 360,115 390,90',
  },
  {
    id: 'granada', nome: 'Granada (reino muçulmano)', fill: '#c4a971',
    points: '250,420 300,395 370,400 400,430 330,455 270,450',
  },
];

export interface MapChallengeTexts {
  titulo: string;
  instrucao: string;
  dica: string;
  certo: string;
}

export function runMapChallenge(container: HTMLElement, answerId: string, t: MapChallengeTexts): Promise<void> {
  return new Promise((resolve) => {
    const polys = REGIONS.map(
      (r) => `<polygon class="map-region" data-id="${r.id}" fill="${r.fill}" points="${r.points}"><title>Região</title></polygon>`,
    ).join('');

    container.innerHTML = `
      <div class="card map-card">
        <h2>${escapeHtml(t.titulo)}</h2>
        <p class="small">${escapeHtml(t.instrucao)}</p>
        <svg viewBox="0 0 600 480" role="img" aria-label="Mapa da Península Ibérica">
          <defs>
            <pattern id="waves" width="24" height="12" patternUnits="userSpaceOnUse">
              <path d="M0 6 Q6 2 12 6 T24 6" fill="none" stroke="#7d97a3" stroke-width="1" opacity="0.6"/>
            </pattern>
          </defs>
          <rect x="0" y="0" width="600" height="480" fill="#9fb6bf"/>
          <rect x="0" y="0" width="600" height="480" fill="url(#waves)"/>
          ${polys}
          <text class="map-label" x="10" y="250" transform="rotate(-90 22 250)">Oceano Atlântico</text>
          <text class="map-label" x="470" y="360">Mar Mediterrâneo</text>
          <text class="map-label" x="240" y="22">Mar Cantábrico</text>
          <g transform="translate(560 430)">
            <circle r="16" fill="#f1e4c4" stroke="#5b4220"/>
            <path d="M0 -13 L5 0 L0 -3 L-5 0 Z" fill="#7a1f1f"/>
            <text class="map-label" x="-5" y="-20">N</text>
          </g>
        </svg>
        <div class="map-feedback" aria-live="polite"></div>
        <div class="map-actions"></div>
      </div>`;
    container.hidden = false;

    const feedback = container.querySelector<HTMLElement>('.map-feedback')!;
    const actions = container.querySelector<HTMLElement>('.map-actions')!;
    let tries = 0;
    let solved = false;

    container.querySelectorAll<SVGPolygonElement>('.map-region').forEach((el) => {
      el.addEventListener('click', () => {
        if (solved) return;
        const id = el.dataset.id!;
        const region = REGIONS.find((r) => r.id === id)!;
        if (id === answerId) {
          solved = true;
          el.classList.add('right');
          feedback.textContent = t.certo;
          actions.innerHTML = '<button class="btn" type="button">Iniciar a viagem</button>';
          const btn = actions.querySelector('button')!;
          btn.focus({ preventScroll: true });
          btn.addEventListener('click', () => {
            container.hidden = true;
            container.innerHTML = '';
            resolve();
          });
        } else {
          tries++;
          el.classList.remove('wrong');
          void (el as unknown as HTMLElement).getBoundingClientRect();
          el.classList.add('wrong');
          setTimeout(() => el.classList.remove('wrong'), 600);
          feedback.textContent = `Isso é ${region.nome}. ${tries >= 1 ? t.dica : ''}`;
        }
      });
    });
  });
}
