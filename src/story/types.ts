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
  | 'comandante';

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
}
