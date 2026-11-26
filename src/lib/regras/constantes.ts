import type {
  AtributoId,
  DistribuicaoHabilidadesKey,
  FichaDados,
  HabilidadeId,
} from "@/types/ficha";

export const SISTEMA_PADRAO = "Caçador: A Revanche 5ª Edição";

export const CREDOS = [
  "Clandestino",
  "Devoto",
  "Empreendedor",
  "Inquisitivo",
  "Marcial",
] as const;

export const IMPETOS = [
  "Curiosidade",
  "Expiação",
  "Ganância",
  "Inveja",
  "Juramento",
  "Orgulho",
  "Vingança",
] as const;

export interface GrupoCaracteristica<T extends string> {
  grupo: string;
  chave: string;
  itens: ReadonlyArray<readonly [T, string]>;
}

export const ATRIBUTOS_GRUPOS: ReadonlyArray<GrupoCaracteristica<AtributoId>> = [
  {
    grupo: "Físicos",
    chave: "fisicos",
    itens: [
      ["forca", "Força"],
      ["destreza", "Destreza"],
      ["vigor", "Vigor"],
    ],
  },
  {
    grupo: "Sociais",
    chave: "sociais",
    itens: [
      ["carisma", "Carisma"],
      ["manipulacao", "Manipulação"],
      ["autocontrole", "Autocontrole"],
    ],
  },
  {
    grupo: "Mentais",
    chave: "mentais",
    itens: [
      ["inteligencia", "Inteligência"],
      ["raciocinio", "Raciocínio"],
      ["determinacao", "Determinação"],
    ],
  },
];

export const HABILIDADES_GRUPOS: ReadonlyArray<GrupoCaracteristica<HabilidadeId>> = [
  {
    grupo: "Físicas",
    chave: "fisicas",
    itens: [
      ["armasBrancas", "Armas Brancas"],
      ["armasDeFogo", "Armas de Fogo"],
      ["atletismo", "Atletismo"],
      ["briga", "Briga"],
      ["conducao", "Condução"],
      ["furtividade", "Furtividade"],
      ["ladroagem", "Ladroagem"],
      ["oficios", "Ofícios"],
      ["sobrevivencia", "Sobrevivência"],
    ],
  },
  {
    grupo: "Sociais",
    chave: "sociais",
    itens: [
      ["empatiaAnimais", "Empatia com Animais"],
      ["etiqueta", "Etiqueta"],
      ["intimidacao", "Intimidação"],
      ["labia", "Sagacidade"],
      ["lideranca", "Liderança"],
      ["manha", "Manha"],
      ["performance", "Performance"],
      ["persuasao", "Persuasão"],
      ["subterfugio", "Subterfúgio"],
    ],
  },
  {
    grupo: "Mentais",
    chave: "mentais",
    itens: [
      ["academicos", "Erudição"],
      ["ciencia", "Ciência"],
      ["financas", "Finanças"],
      ["investigacao", "Investigação"],
      ["medicina", "Medicina"],
      ["ocultismo", "Ocultismo"],
      ["percepcao", "Percepção"],
      ["politica", "Política"],
      ["tecnologia", "Tecnologia"],
    ],
  },
];

export const TODOS_ATRIBUTOS = ATRIBUTOS_GRUPOS.flatMap((g) => g.itens);
export const TODAS_HABILIDADES = HABILIDADES_GRUPOS.flatMap((g) => g.itens);

export const DISTRIBUICOES_HABILIDADES: Record<
  DistribuicaoHabilidadesKey,
  {
    label: string;
    niveis: Record<1 | 2 | 3 | 4, number>;
  }
> = {
  pau: {
    label: "Pau para toda obra: 1x3, 8x2, 10x1",
    niveis: { 4: 0, 3: 1, 2: 8, 1: 10 },
  },
  equilibrado: {
    label: "Equilibrado: 3x3, 5x2, 7x1",
    niveis: { 4: 0, 3: 3, 2: 5, 1: 7 },
  },
  especialista: {
    label: "Especialista: 1x4, 3x3, 3x2, 3x1",
    niveis: { 4: 1, 3: 3, 2: 3, 1: 3 },
  },
};

export const SITUACOES_GANHO_XP = [
  { id: "participacao", pontos: 1, label: "Participação na sessão (1)" },
  { id: "momento", pontos: 1, label: "Realização notável ou momento marcante (1)" },
  {
    id: "uso_inteligente",
    pontos: 1,
    label: "Uso inteligente de Característica, Habilidade ou Trunfo (1)",
  },
  { id: "sessao_baixa", pontos: 2, label: "Sessão padrão baixa (2)" },
  { id: "sessao_alta", pontos: 4, label: "Sessão padrão alta (4)" },
  { id: "jornada_acelerada", pontos: 6, label: "Jornada acelerada (6)" },
  { id: "jornada_intensa", pontos: 8, label: "Jornada acelerada intensa (8)" },
  { id: "concluir_historia", pontos: 2, label: "Concluir história da crônica (2)" },
  { id: "concluir_decisiva", pontos: 3, label: "Concluir história decisiva (3)" },
  { id: "custom", pontos: null, label: "Personalizado" },
] as const;

export type TipoGastoXp =
  | "atributo"
  | "habilidade"
  | "especializacao"
  | "trunfo"
  | "distincao"
  | "vantagem";

export const TIPOS_GASTO_XP: ReadonlyArray<{ value: TipoGastoXp; label: string }> = [
  { value: "atributo", label: "Atributo: novo nível x 5" },
  { value: "habilidade", label: "Habilidade: novo nível x 3" },
  { value: "especializacao", label: "Especialização: 3" },
  { value: "trunfo", label: "Novo Trunfo: 6" },
  { value: "distincao", label: "Distinção: 3" },
  { value: "vantagem", label: "Vantagem: 3 por ponto" },
];

export function nomePorId(id: string): string {
  const encontrado = [...TODOS_ATRIBUTOS, ...TODAS_HABILIDADES].find(
    ([campoId]) => campoId === id
  );
  return encontrado ? encontrado[1] : id;
}

export function obterValorAtributo(ficha: FichaDados, id: AtributoId): number {
  const { fisicos, sociais, mentais } = ficha.atributos;
  if (id in fisicos) return Number(fisicos[id as keyof typeof fisicos] || 0);
  if (id in sociais) return Number(sociais[id as keyof typeof sociais] || 0);
  if (id in mentais) return Number(mentais[id as keyof typeof mentais] || 0);
  return 1;
}

export function definirValorAtributo(
  ficha: FichaDados,
  id: AtributoId,
  valor: number
): FichaDados {
  const v = Math.max(1, Math.min(5, Math.round(valor)));
  const copia: FichaDados = structuredClone(ficha);
  if (id in copia.atributos.fisicos) {
    copia.atributos.fisicos[id as keyof typeof copia.atributos.fisicos] = v;
  } else if (id in copia.atributos.sociais) {
    copia.atributos.sociais[id as keyof typeof copia.atributos.sociais] = v;
  } else if (id in copia.atributos.mentais) {
    copia.atributos.mentais[id as keyof typeof copia.atributos.mentais] = v;
  }
  return copia;
}

export function obterValorHabilidade(ficha: FichaDados, id: HabilidadeId): number {
  const { fisicas, sociais, mentais } = ficha.habilidades;
  if (id in fisicas) return Number(fisicas[id as keyof typeof fisicas] || 0);
  if (id in sociais) return Number(sociais[id as keyof typeof sociais] || 0);
  if (id in mentais) return Number(mentais[id as keyof typeof mentais] || 0);
  return 0;
}

export function definirValorHabilidade(
  ficha: FichaDados,
  id: HabilidadeId,
  valor: number
): FichaDados {
  const v = Math.max(0, Math.min(5, Math.round(valor)));
  const copia: FichaDados = structuredClone(ficha);
  if (id in copia.habilidades.fisicas) {
    copia.habilidades.fisicas[id as keyof typeof copia.habilidades.fisicas] = v;
  } else if (id in copia.habilidades.sociais) {
    copia.habilidades.sociais[id as keyof typeof copia.habilidades.sociais] = v;
  } else if (id in copia.habilidades.mentais) {
    copia.habilidades.mentais[id as keyof typeof copia.habilidades.mentais] = v;
  }
  return copia;
}

export function criarFichaVazia(): FichaDados {
  return {
    sistema: SISTEMA_PADRAO,
    distribuicaoHabilidades: "pau",
    estado: {
      finalizada: false,
      ultimaAtualizacao: new Date().toISOString(),
    },
    identidade: {
      nome: "",
      jogador: "",
      cronica: "",
      narrador: "",
      conceito: "",
      celula: "",
      ambicao: "",
      desejo: "",
    },
    cacador: {
      credo: "",
      impeto: "",
      descricaoImpeto: "",
    },
    pilares: [],
    atributos: {
      fisicos: { forca: 1, destreza: 1, vigor: 1 },
      sociais: { carisma: 1, manipulacao: 1, autocontrole: 1 },
      mentais: { inteligencia: 1, raciocinio: 1, determinacao: 1 },
    },
    habilidades: {
      fisicas: {
        armasBrancas: 0,
        armasDeFogo: 0,
        atletismo: 0,
        briga: 0,
        conducao: 0,
        furtividade: 0,
        ladroagem: 0,
        oficios: 0,
        sobrevivencia: 0,
      },
      sociais: {
        empatiaAnimais: 0,
        etiqueta: 0,
        intimidacao: 0,
        labia: 0,
        lideranca: 0,
        manha: 0,
        performance: 0,
        persuasao: 0,
        subterfugio: 0,
      },
      mentais: {
        academicos: 0,
        ciencia: 0,
        financas: 0,
        investigacao: 0,
        medicina: 0,
        ocultismo: 0,
        percepcao: 0,
        politica: 0,
        tecnologia: 0,
      },
    },
    estados: {
      vitalidadeCaixas: 4,
      forcaDeVontadeCaixas: 2,
      desespero: 0,
      perigo: 0,
      subgrupoCronica: "",
      xpTotal: 0,
      xpGasto: 0,
      xpDisponivel: 0,
    },
    especializacoes: {
      livre: "",
      ciencia: "",
      academicos: "",
      oficios: "",
      performance: "",
    },
    vantagens: [],
    defeitos: [],
    trunfos: [],
    distincoes: [],
    mapaRelacionamentos: "",
    equipamentos: {
      equipamentos: "",
      armas: "",
    },
    cacada: {
      presa: "",
      local: "",
      pistas: "",
      consequencias: "",
    },
    dano: {
      vitalidade: ["", "", "", ""],
      vontade: ["", ""],
    },
    anotacoes: "",
    xpLog: [],
    rolagens: [],
  };
}
