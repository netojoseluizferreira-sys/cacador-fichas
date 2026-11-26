export type AtributoId =
  | "forca"
  | "destreza"
  | "vigor"
  | "carisma"
  | "manipulacao"
  | "autocontrole"
  | "inteligencia"
  | "raciocinio"
  | "determinacao";

export type HabilidadeId =
  | "armasBrancas"
  | "armasDeFogo"
  | "atletismo"
  | "briga"
  | "conducao"
  | "furtividade"
  | "ladroagem"
  | "oficios"
  | "sobrevivencia"
  | "empatiaAnimais"
  | "etiqueta"
  | "intimidacao"
  | "labia"
  | "lideranca"
  | "manha"
  | "performance"
  | "persuasao"
  | "subterfugio"
  | "academicos"
  | "ciencia"
  | "financas"
  | "investigacao"
  | "medicina"
  | "ocultismo"
  | "percepcao"
  | "politica"
  | "tecnologia";

export type DistribuicaoHabilidadesKey = "pau" | "equilibrado" | "especialista";

export type MarcadorDano = "" | "/" | "X";
export type TrilhaDanoKey = "vitalidade" | "vontade";
export type TipoDano = "superficial" | "agravado";

export type TipoRolagemBase =
  | "atributoHabilidade"
  | "atributoAtributo"
  | "vitalidade"
  | "vontade";

export type TipoRolagem = TipoRolagemBase | "impeto";

export interface ItemComPontos {
  nome: string;
  categoria: string;
  pontos: number;
  detalhe?: string;
  resumo?: string;
}

export interface ItemTrunfo {
  nome: string;
  categoria: string;
  detalhe?: string;
  resumo?: string;
}

export interface ItemDistincao {
  nome: string;
  categoria: string;
  trunfo?: string;
  detalhe?: string;
  resumo?: string;
}

export interface RegistroRolagemFicha {
  id: string;
  data: string;
  tipo: TipoRolagem | string;
  tipoBase?: TipoRolagemBase | string;
  descricao: string;
  totalDados: number;
  impeto?: boolean;
  subgrupoId?: string;
  subgrupoNome?: string;
  perigoIncrementado?: boolean;
  dados: number[];
  dadosDesespero?: number[];
  desesperoOnes?: number;
  sucessosBase: number;
  dezenas: number;
  paresDez: number;
  sucessosExtras: number;
  sucessos: number;
  critico: boolean;
  impetoPassou?: boolean | null;
  aflicao?: boolean;
  resolucaoImpeto?: "aflicao" | "perigo" | null;
  reroladoVontade?: boolean;
  dadosAnteriores?: number[];
  especializacaoUsada?: string;
}

export interface ResultadoRolagemMestre {
  dados: number[];
  sucessosBase: number;
  dezenas: number;
  paresDez: number;
  sucessosExtras: number;
  sucessos: number;
  critico: boolean;
  totalDados: number;
  bonus: number;
  data: string;
}

export interface FichaDados {
  sistema: string;
  distribuicaoHabilidades?: DistribuicaoHabilidadesKey;
  estado: {
    finalizada: boolean;
    ultimaAtualizacao: string;
  };
  identidade: {
    nome: string;
    jogador: string;
    cronica: string;
    narrador: string;
    conceito: string;
    celula: string;
    ambicao: string;
    desejo: string;
  };
  cacador: {
    credo: string;
    impeto: string;
    descricaoImpeto: string;
  };
  pilares: string[];
  atributos: {
    fisicos: {
      forca: number;
      destreza: number;
      vigor: number;
    };
    sociais: {
      carisma: number;
      manipulacao: number;
      autocontrole: number;
    };
    mentais: {
      inteligencia: number;
      raciocinio: number;
      determinacao: number;
    };
  };
  habilidades: {
    fisicas: {
      armasBrancas: number;
      armasDeFogo: number;
      atletismo: number;
      briga: number;
      conducao: number;
      furtividade: number;
      ladroagem: number;
      oficios: number;
      sobrevivencia: number;
    };
    sociais: {
      empatiaAnimais: number;
      etiqueta: number;
      intimidacao: number;
      labia: number;
      lideranca: number;
      manha: number;
      performance: number;
      persuasao: number;
      subterfugio: number;
    };
    mentais: {
      academicos: number;
      ciencia: number;
      financas: number;
      investigacao: number;
      medicina: number;
      ocultismo: number;
      percepcao: number;
      politica: number;
      tecnologia: number;
    };
  };
  estados: {
    vitalidadeCaixas: number;
    forcaDeVontadeCaixas: number;
    desespero: number;
    perigo: number;
    subgrupoCronica: string;
    xpTotal: number;
    xpGasto: number;
    xpDisponivel: number;
    vitalidadeMaxima?: number;
    forcaDeVontadeMaxima?: number;
    experiencia?: number;
  };
  especializacoes: {
    livre: string;
    ciencia: string;
    academicos: string;
    oficios: string;
    performance: string;
  };
  vantagens: ItemComPontos[];
  defeitos: ItemComPontos[];
  trunfos: ItemTrunfo[];
  distincoes: ItemDistincao[];
  mapaRelacionamentos: string;
  equipamentos: {
    equipamentos: string;
    armas: string;
  };
  cacada: {
    presa: string;
    local: string;
    pistas: string;
    consequencias: string;
  };
  dano: {
    vitalidade: MarcadorDano[];
    vontade: MarcadorDano[];
  };
  anotacoes: string;
  xpLog: string[];
  rolagens: RegistroRolagemFicha[];
}

export type VisibilidadeIniciativa = "total" | "parcial" | "invisivel";

export interface ItemIniciativa {
  id: string;
  nome: string;
  detalhe?: string;
  fichaId?: string;
  ownerEmail?: string;
  tipo?: "jogador" | "outro" | string;
  valor: number;
  visivel?: boolean;
}

export interface SubgrupoCronica {
  id: string;
  nome: string;
  ficha_ids: string[];
  desespero: number;
  perigo: number;
  updated_at?: string;
}

export type CategoriaAmeaca =
  | "Presa / Monstro"
  | "Rival / Org"
  | "PdM / Aliado"
  | "Capanga / Grupo";

export interface ParadaExtraAmeaca {
  id: string;
  nome: string;
  dados: number;
}

export interface AmeacaCronica {
  id: string;
  nome: string;
  categoria: CategoriaAmeaca | string;
  dificuldadePadrao: string;
  paradaFisico: number;
  paradaSocial: number;
  paradaMental: number;
  paradasExtras: ParadaExtraAmeaca[];
  vitalidadeMax: number;
  vitalidadeDano: MarcadorDano[];
  vontadeMax: number;
  vontadeDano: MarcadorDano[];
  poderes: string;
  fraquezas: string;
  notas: string;
}

export interface EscudoMestreEstado {
  ficha_ids: string[];
  notas: string;
  iniciativa: ItemIniciativa[];
  turno: number;
  iniciativa_visibilidade: VisibilidadeIniciativa;
  iniciativa_definida: boolean;
  ameacas: AmeacaCronica[];
}

export interface FichaResumoOnline {
  id: string;
  nome: string;
  owner_email: string;
  updated_at: string;
  created_at: string;
  dados: FichaDados;
}
