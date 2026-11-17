import type { QuemFala } from './types';

export const PERSONAGENS: Record<QuemFala, { nome: string }> = {
  narrador: { nome: 'Narrador' },
  escudeiro: { nome: 'Escudeiro (tu)' },
  fernando: { nome: 'D. Fernando' },
  conselheiro: { nome: 'Conselheiro' },
  soldado: { nome: 'Soldado' },
  guarda: { nome: 'Guarda' },
  campones: { nome: 'Camponês' },
  mensageiro: { nome: 'Mensageiro inglês' },
  mercador: { nome: 'Mercador' },
  comandante: { nome: 'Comandante' },
  escrivao: { nome: 'Escrivão' },
  castelhano: { nome: 'Embaixador castelhano' },
};
