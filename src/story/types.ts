/** Identificadores das personagens (ver personagens.ts). */
export type QuemFala =
  | 'narrador'
  | 'escudeiro'
  | 'fernando'
  | 'conselheiro'
  | 'soldado'
  | 'guarda'
  | 'campones'
  | 'mensageiro'
  | 'mercador'
  | 'comandante'
  | 'escrivao'
  | 'castelhano';

export interface Fala {
  quem: QuemFala;
  texto: string;
  /**
   * true quando a fala não está no guião original e foi acrescentada para ligar a ação
   * (ex.: o conselheiro entregar a mensagem). Serve para a revisão pedagógica.
   */
  adicionada?: boolean;
}

/** Ficheiro de texto de uma cena (src/story/cenarioN/cenaM.json). */
export interface CenaTexto {
  cenario: number;
  cena: number;
  titulo: string;
  subtitulo: string;
  data: string;
  local: string;
  narrador: string;
  /** Conversas da cena, por identificador. */
  dialogos: Record<string, Fala[]>;
  /** Textos de missão/objetivo mostrados no canto. */
  objetivos: Record<string, string>;
  /** Mensagens curtas (notificações) e textos de minijogos. */
  textos: Record<string, string>;
  /** Desafio do pergaminho (escolher as condições certas de um tratado), quando a cena o tem. */
  desafio?: DesafioPergaminho;
}

export interface OpcaoDesafio {
  texto: string;
  certa: boolean;
  /** Explicação mostrada quando o aluno escolhe esta opção por engano. */
  explicacao?: string;
}

/** Minijogo: ler um pergaminho e escolher as condições certas do tratado. */
export interface DesafioPergaminho {
  titulo: string;
  /** Texto do pergaminho, mostrado antes das opções. */
  cabecalho: string;
  instrucao: string;
  opcoes: OpcaoDesafio[];
  /** Mensagem quando todas as opções certas estão escolhidas. */
  certo: string;
  botao: string;
}
