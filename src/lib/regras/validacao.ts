import { z } from "zod";
import type {
  AtributoId,
  DistribuicaoHabilidadesKey,
  FichaDados,
  HabilidadeId,
  MarcadorDano,
} from "@/types/ficha";
import { totalPontosItens } from "./catalogo";
import {
  criarFichaVazia,
  DISTRIBUICOES_HABILIDADES,
  obterValorAtributo,
  obterValorHabilidade,
  SISTEMA_PADRAO,
  TODAS_HABILIDADES,
  TODOS_ATRIBUTOS,
} from "./constantes";
import {
  normalizarTrilha,
  totalCaixasVitalidade,
  totalCaixasVontade,
} from "./dano";
import { criarIdRolagem } from "./rolagem";

export const FichaDadosSchema = z
  .object({
    sistema: z.string().optional(),
    distribuicaoHabilidades: z
      .enum(["pau", "equilibrado", "especialista"])
      .optional(),
    estado: z
      .object({
        finalizada: z.boolean().optional(),
        ultimaAtualizacao: z.string().optional(),
      })
      .optional(),
    identidade: z.record(z.string(), z.any()).optional(),
    cacador: z.record(z.string(), z.any()).optional(),
    pilares: z.array(z.string()).optional(),
    atributos: z.record(z.string(), z.any()).optional(),
    habilidades: z.record(z.string(), z.any()).optional(),
    estados: z.record(z.string(), z.any()).optional(),
    especializacoes: z.record(z.string(), z.any()).optional(),
    vantagens: z.array(z.any()).optional(),
    defeitos: z.array(z.any()).optional(),
    vantagensEDefeitos: z.record(z.string(), z.any()).optional(),
    trunfos: z.any().optional(),
    distincoes: z.array(z.any()).optional(),
    mapaRelacionamentos: z.string().optional(),
    vinculos: z.record(z.string(), z.any()).optional(),
    equipamentos: z.record(z.string(), z.any()).optional(),
    cacada: z.record(z.string(), z.any()).optional(),
    dano: z.record(z.string(), z.any()).optional(),
    anotacoes: z.string().optional(),
    xpLog: z.array(z.string()).optional(),
    rolagens: z.array(z.any()).optional(),
  })
  .passthrough();

export function contarValoresAtributos(
  ficha: FichaDados
): Record<number, number> {
  return TODOS_ATRIBUTOS.reduce<Record<number, number>>((acc, [id]) => {
    const val = obterValorAtributo(ficha, id);
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});
}

export function contarValoresHabilidades(
  ficha: FichaDados
): Record<number, number> {
  return TODAS_HABILIDADES.reduce<Record<number, number>>((acc, [id]) => {
    const val = obterValorHabilidade(ficha, id);
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});
}

export function validarFicha(
  ficha: FichaDados,
  distribuicaoOverride?: DistribuicaoHabilidadesKey
): { erros: string[]; avisos: string[] } {
  const erros: string[] = [];
  const avisos: string[] = [];

  if (ficha.estado.finalizada) {
    return { erros, avisos };
  }

  const contagemAtributos = contarValoresAtributos(ficha);
  const chaveDist: DistribuicaoHabilidadesKey =
    distribuicaoOverride ?? ficha.distribuicaoHabilidades ?? "pau";
  const dist = DISTRIBUICOES_HABILIDADES[chaveDist].niveis;
  const contagemHabilidades = contarValoresHabilidades(ficha);

  const obrigatoriosIdentidade: Array<[string, string]> = [
    [ficha.identidade.nome, "Nome do Caçador"],
    [ficha.identidade.conceito, "Conceito"],
    [ficha.identidade.ambicao, "Ambição"],
    [ficha.cacador.credo, "Credo"],
    [ficha.cacador.impeto, "Ímpeto"],
  ];

  for (const [valorCampo, label] of obrigatoriosIdentidade) {
    if (!String(valorCampo || "").trim()) {
      erros.push(`Preencha ${label}.`);
    }
  }

  const pilaresValidos = (ficha.pilares || [])
    .map((p) => p.trim())
    .filter(Boolean);
  if (pilaresValidos.length === 0) {
    erros.push("Informe ao menos um Pilar.");
  }

  if (
    (contagemAtributos[4] || 0) !== 1 ||
    (contagemAtributos[3] || 0) !== 3 ||
    (contagemAtributos[2] || 0) !== 4 ||
    (contagemAtributos[1] || 0) !== 1
  ) {
    erros.push(
      "Atributos devem seguir a distribuição: um 4, três 3, quatro 2 e um 1."
    );
  }

  for (const nivel of [4, 3, 2, 1] as const) {
    if ((contagemHabilidades[nivel] || 0) !== dist[nivel]) {
      erros.push(
        `Habilidades de nível ${nivel}: esperado ${dist[nivel]}, atual ${contagemHabilidades[nivel] || 0}.`
      );
    }
  }

  if (!ficha.especializacoes.livre.trim()) {
    avisos.push("A especialização gratuita ainda não foi preenchida.");
  }

  const especializacoesObrigatorias: Array<
    [HabilidadeId, keyof FichaDados["especializacoes"], string]
  > = [
    ["ciencia", "ciencia", "Ciência"],
    ["academicos", "academicos", "Erudição"],
    ["oficios", "oficios", "Ofícios"],
    ["performance", "performance", "Performance"],
  ];

  for (const [skillId, specKey, nome] of especializacoesObrigatorias) {
    if (
      obterValorHabilidade(ficha, skillId) > 0 &&
      !ficha.especializacoes[specKey].trim()
    ) {
      avisos.push(`${nome} tem pontos e recebe uma especialização gratuita.`);
    }
  }

  const ptsVantagens = totalPontosItens(ficha.vantagens);
  if (ptsVantagens !== 7) {
    erros.push(
      `Vantagens devem somar 7 pontos na criação. Atual: ${ptsVantagens}.`
    );
  }

  const ptsDefeitos = totalPontosItens(ficha.defeitos);
  if (ptsDefeitos !== 2) {
    erros.push(
      `Defeitos devem somar 2 pontos na criação. Atual: ${ptsDefeitos}.`
    );
  }

  const trunfoValido =
    (ficha.trunfos.length === 2 && ficha.distincoes.length === 0) ||
    (ficha.trunfos.length === 1 && ficha.distincoes.length === 2);

  if (!trunfoValido && !ficha.estado.finalizada) {
    erros.push("Escolha dois Trunfos, ou um Trunfo e duas Distinções.");
  }

  if (
    ficha.trunfos.length === 1 &&
    ficha.distincoes.some(
      (distincao) =>
        distincao.trunfo && distincao.trunfo !== ficha.trunfos[0].nome
    )
  ) {
    erros.push("Todas as Distinções precisam pertencer ao Trunfo escolhido.");
  }

  if (ficha.trunfos.length >= 2 && ficha.distincoes.length > 0) {
    erros.push("Ao escolher dois Trunfos, não selecione Distinções.");
  }

  return { erros, avisos };
}

function numSeguro(val: unknown, fallback: number, min: number, max: number) {
  const n = Number(val);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function normalizarFicha(entradaBruta: unknown): FichaDados {
  const validado = FichaDadosSchema.parse(entradaBruta ?? {});
  const vazia = criarFichaVazia();

  const identidade = (validado.identidade ?? {}) as Record<string, unknown>;
  const cacador = (validado.cacador ?? {}) as Record<string, unknown>;
  const attrs = (validado.atributos ?? {}) as Record<
    string,
    Record<string, unknown>
  >;
  const skills = (validado.habilidades ?? {}) as Record<
    string,
    Record<string, unknown>
  >;
  const fisicasLegado = skills.fisicas ?? {};
  const sociaisLegado = skills.sociais ?? {};
  const mentaisLegado = skills.mentais ?? {};
  const specs = (validado.especializacoes ?? {}) as Record<string, unknown>;
  const estados = (validado.estados ?? {}) as Record<string, unknown>;
  const equip = (validado.equipamentos ?? {}) as Record<string, unknown>;
  const cacada = (validado.cacada ?? {}) as Record<string, unknown>;
  const dano = (validado.dano ?? {}) as Record<string, unknown>;
  const vantsEDefs = (validado.vantagensEDefeitos ?? {}) as Record<
    string,
    unknown
  >;
  const vinculos = (validado.vinculos ?? {}) as Record<string, unknown>;

  const ficha: FichaDados = {
    sistema: String(validado.sistema || SISTEMA_PADRAO),
    distribuicaoHabilidades: validado.distribuicaoHabilidades ?? "pau",
    estado: {
      finalizada: Boolean(validado.estado?.finalizada),
      ultimaAtualizacao:
        validado.estado?.ultimaAtualizacao || new Date().toISOString(),
    },
    identidade: {
      nome: String(identidade.nome ?? ""),
      jogador: String(identidade.jogador ?? ""),
      cronica: String(identidade.cronica ?? ""),
      narrador: String(identidade.narrador ?? ""),
      conceito: String(identidade.conceito ?? ""),
      celula: String(identidade.celula ?? ""),
      ambicao: String(identidade.ambicao ?? ""),
      desejo: String(identidade.desejo ?? ""),
    },
    cacador: {
      credo: String(cacador.credo ?? ""),
      impeto: String(cacador.impeto ?? ""),
      descricaoImpeto: String(cacador.descricaoImpeto ?? ""),
    },
    pilares: Array.isArray(validado.pilares)
      ? validado.pilares.map((p) => String(p ?? "")).filter(Boolean)
      : [],
    atributos: {
      fisicos: {
        forca: numSeguro(attrs.fisicos?.forca, 1, 1, 5),
        destreza: numSeguro(attrs.fisicos?.destreza, 1, 1, 5),
        vigor: numSeguro(attrs.fisicos?.vigor, 1, 1, 5),
      },
      sociais: {
        carisma: numSeguro(attrs.sociais?.carisma, 1, 1, 5),
        manipulacao: numSeguro(attrs.sociais?.manipulacao, 1, 1, 5),
        autocontrole: numSeguro(attrs.sociais?.autocontrole, 1, 1, 5),
      },
      mentais: {
        inteligencia: numSeguro(attrs.mentais?.inteligencia, 1, 1, 5),
        raciocinio: numSeguro(attrs.mentais?.raciocinio, 1, 1, 5),
        determinacao: numSeguro(attrs.mentais?.determinacao, 1, 1, 5),
      },
    },
    habilidades: {
      fisicas: {
        armasBrancas: numSeguro(fisicasLegado.armasBrancas, 0, 0, 5),
        armasDeFogo: numSeguro(fisicasLegado.armasDeFogo, 0, 0, 5),
        atletismo: numSeguro(
          fisicasLegado.atletismo ?? fisicasLegado.esportes,
          0,
          0,
          5
        ),
        briga: numSeguro(fisicasLegado.briga, 0, 0, 5),
        conducao: numSeguro(fisicasLegado.conducao, 0, 0, 5),
        furtividade: numSeguro(
          fisicasLegado.furtividade ?? fisicasLegado.furto,
          0,
          0,
          5
        ),
        ladroagem: numSeguro(fisicasLegado.ladroagem, 0, 0, 5),
        oficios: numSeguro(fisicasLegado.oficios, 0, 0, 5),
        sobrevivencia: numSeguro(fisicasLegado.sobrevivencia, 0, 0, 5),
      },
      sociais: {
        empatiaAnimais: numSeguro(sociaisLegado.empatiaAnimais, 0, 0, 5),
        etiqueta: numSeguro(sociaisLegado.etiqueta, 0, 0, 5),
        intimidacao: numSeguro(sociaisLegado.intimidacao, 0, 0, 5),
        labia: numSeguro(sociaisLegado.labia, 0, 0, 5),
        lideranca: numSeguro(sociaisLegado.lideranca, 0, 0, 5),
        manha: numSeguro(sociaisLegado.manha, 0, 0, 5),
        performance: numSeguro(sociaisLegado.performance, 0, 0, 5),
        persuasao: numSeguro(sociaisLegado.persuasao, 0, 0, 5),
        subterfugio: numSeguro(sociaisLegado.subterfugio, 0, 0, 5),
      },
      mentais: {
        academicos: numSeguro(mentaisLegado.academicos, 0, 0, 5),
        ciencia: numSeguro(mentaisLegado.ciencia, 0, 0, 5),
        financas: numSeguro(mentaisLegado.financas, 0, 0, 5),
        investigacao: numSeguro(mentaisLegado.investigacao, 0, 0, 5),
        medicina: numSeguro(mentaisLegado.medicina, 0, 0, 5),
        ocultismo: numSeguro(mentaisLegado.ocultismo, 0, 0, 5),
        percepcao: numSeguro(
          mentaisLegado.percepcao ?? mentaisLegado.consciencia,
          0,
          0,
          5
        ),
        politica: numSeguro(mentaisLegado.politica, 0, 0, 5),
        tecnologia: numSeguro(mentaisLegado.tecnologia, 0, 0, 5),
      },
    },
    estados: {
      ...vazia.estados,
      desespero: Number(estados.desespero ?? 0),
      perigo: Number(estados.perigo ?? 0),
      subgrupoCronica: String(estados.subgrupoCronica ?? ""),
      xpTotal: Number(estados.xpTotal ?? estados.experiencia ?? 0),
      xpGasto: Number(estados.xpGasto ?? 0),
      xpDisponivel:
        Number(estados.xpTotal ?? estados.experiencia ?? 0) -
        Number(estados.xpGasto ?? 0),
    },
    especializacoes: {
      livre: String(specs.livre ?? ""),
      ciencia: String(specs.ciencia ?? ""),
      academicos: String(specs.academicos ?? ""),
      oficios: String(specs.oficios ?? ""),
      performance: String(specs.performance ?? ""),
    },
    vantagens: Array.isArray(validado.vantagens)
      ? validado.vantagens
      : Array.isArray(vantsEDefs.vantagensLista)
        ? vantsEDefs.vantagensLista
        : [],
    defeitos: Array.isArray(validado.defeitos)
      ? validado.defeitos
      : Array.isArray(vantsEDefs.defeitosLista)
        ? vantsEDefs.defeitosLista
        : [],
    trunfos: Array.isArray(validado.trunfos) ? validado.trunfos : [],
    distincoes: Array.isArray(validado.distincoes) ? validado.distincoes : [],
    mapaRelacionamentos: String(
      validado.mapaRelacionamentos ?? vinculos.mapaRelacionamentos ?? ""
    ),
    equipamentos: {
      equipamentos: String(equip.equipamentos ?? ""),
      armas: String(equip.armas ?? ""),
    },
    cacada: {
      presa: String(cacada.presa ?? ""),
      local: String(cacada.local ?? ""),
      pistas: String(cacada.pistas ?? ""),
      consequencias: String(cacada.consequencias ?? ""),
    },
    dano: {
      vitalidade: [],
      vontade: [],
    },
    anotacoes: String(validado.anotacoes ?? ""),
    xpLog: Array.isArray(validado.xpLog)
      ? validado.xpLog.map((x) => String(x))
      : [],
    rolagens: Array.isArray(validado.rolagens)
      ? validado.rolagens.map((r: Record<string, unknown>) => ({
          ...r,
          id: String(r?.id || criarIdRolagem()),
        })) as FichaDados["rolagens"]
      : [],
  };

  const maxVit = totalCaixasVitalidade(ficha);
  const maxVon = totalCaixasVontade(ficha);
  ficha.estados.vitalidadeCaixas = maxVit;
  ficha.estados.forcaDeVontadeCaixas = maxVon;
  ficha.dano = {
    vitalidade: normalizarTrilha(
      Array.isArray(dano.vitalidade)
        ? (dano.vitalidade as MarcadorDano[])
        : [],
      maxVit
    ),
    vontade: normalizarTrilha(
      Array.isArray(dano.vontade) ? (dano.vontade as MarcadorDano[]) : [],
      maxVon
    ),
  };

  return ficha;
}

export function nomeFichaAtual(ficha: FichaDados): string {
  return (
    ficha.identidade?.nome?.trim() ||
    ficha.identidade?.conceito?.trim() ||
    "Ficha sem nome"
  );
}

export function detectarDistribuicaoHabilidades(
  ficha: FichaDados
): DistribuicaoHabilidadesKey {
  if (ficha.distribuicaoHabilidades) {
    return ficha.distribuicaoHabilidades;
  }
  const contagem = contarValoresHabilidades(ficha);
  for (const chave of ["pau", "equilibrado", "especialista"] as const) {
    const dist = DISTRIBUICOES_HABILIDADES[chave].niveis;
    if (
      (contagem[4] || 0) === dist[4] &&
      (contagem[3] || 0) === dist[3] &&
      (contagem[2] || 0) === dist[2] &&
      (contagem[1] || 0) === dist[1]
    ) {
      return chave;
    }
  }
  return "pau";
}

export type AtributoOuHabilidadeId = AtributoId | HabilidadeId;
