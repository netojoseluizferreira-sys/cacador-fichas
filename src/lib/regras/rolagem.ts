import type {
  AtributoId,
  FichaDados,
  HabilidadeId,
  MarcadorDano,
  RegistroRolagemFicha,
  ResultadoRolagemMestre,
  TipoRolagemBase,
} from "@/types/ficha";
import {
  nomePorId,
  obterValorAtributo,
  obterValorHabilidade,
} from "./constantes";
import {
  contarDano,
  dadosDisponiveisTrilha,
  normalizarTrilha,
  totalCaixasVitalidade,
  totalCaixasVontade,
} from "./dano";

export function criarIdRolagem(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function rolarD10(quantidade: number): number[] {
  const n = Math.max(0, Math.round(quantidade));
  return Array.from({ length: n }, () => Math.floor(Math.random() * 10) + 1);
}

export function resultadoRolagem(dados: number[]) {
  const sucessosBase = dados.filter((dado) => dado >= 6).length;
  const dezenas = dados.filter((dado) => dado === 10).length;
  const paresDez = Math.floor(dezenas / 2);
  const sucessosExtras = paresDez * 2;

  return {
    dados,
    sucessosBase,
    dezenas,
    paresDez,
    sucessosExtras,
    sucessos: sucessosBase + sucessosExtras,
    critico: paresDez > 0,
  };
}

export function resultadoImpeto(
  dadosNormais: number[],
  dadosDesespero: number[]
) {
  const resultadoTotal = resultadoRolagem([...dadosNormais, ...dadosDesespero]);
  const desesperoOnes = dadosDesespero.filter((dado) => dado === 1).length;

  return {
    ...resultadoTotal,
    dados: dadosNormais,
    dadosDesespero,
    desesperoOnes,
    impetoPassou: null as boolean | null,
    aflicao: false,
  };
}

export function textoBonusRolagem(bonus: number): string {
  if (!bonus) {
    return "";
  }
  return bonus > 0 ? ` + bônus ${bonus}` : ` - bônus ${Math.abs(bonus)}`;
}

export function textoTipoRolagem(tipo?: string): string {
  const nomes: Record<string, string> = {
    atributoHabilidade: "Atributo + Habilidade",
    atributoAtributo: "Atributo + Atributo",
    vitalidade: "Vitalidade",
    vontade: "Força de Vontade",
    impeto: "Ímpeto",
  };
  return (tipo && nomes[tipo]) || "Rolagem";
}

function normalizarComparacao(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function obterEspecializacoesDaHabilidade(
  ficha: FichaDados,
  habilidade: HabilidadeId
): { sugeridas: string[]; outrasLivres: string[] } {
  const sugeridas: string[] = [];
  const outrasLivres: string[] = [];

  const fixas: Partial<
    Record<HabilidadeId, keyof FichaDados["especializacoes"]>
  > = {
    ciencia: "ciencia",
    academicos: "academicos",
    oficios: "oficios",
    performance: "performance",
  };

  const chaveFixa = fixas[habilidade];
  if (chaveFixa) {
    const val = ficha.especializacoes[chaveFixa]?.trim();
    if (val) {
      val
        .split(/[;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((s) => sugeridas.push(s));
    }
  }

  const nomeSkillNorm = normalizarComparacao(nomePorId(habilidade));
  const entradasLivres = (ficha.especializacoes.livre || "")
    .split(/[;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const entrada of entradasLivres) {
    if (normalizarComparacao(entrada).includes(nomeSkillNorm)) {
      if (!sugeridas.includes(entrada)) sugeridas.push(entrada);
    } else {
      outrasLivres.push(entrada);
    }
  }

  return { sugeridas, outrasLivres };
}

export interface ConfigParadaRolagem {
  tipo: TipoRolagemBase;
  atributo1: AtributoId;
  atributo2: AtributoId;
  habilidade: HabilidadeId;
  bonus: number;
  usarEspecializacao?: boolean;
  nomeEspecializacao?: string;
}

export function calcularParadaRolagem(
  ficha: FichaDados,
  config: ConfigParadaRolagem
) {
  const bonus = Math.round(Number(config.bonus || 0));
  const bonusEspecializacao =
    config.tipo === "atributoHabilidade" && config.usarEspecializacao ? 1 : 0;

  let base = 0;
  let descricao = "";

  if (config.tipo === "atributoHabilidade") {
    const valAttr = obterValorAtributo(ficha, config.atributo1);
    const valHab = obterValorHabilidade(ficha, config.habilidade);
    base = valAttr + valHab;
    descricao = `${nomePorId(config.atributo1)} ${valAttr} + ${nomePorId(config.habilidade)} ${valHab}`;
    if (bonusEspecializacao > 0) {
      const labelSpec = config.nomeEspecializacao?.trim();
      descricao += labelSpec
        ? ` + Especialização (${labelSpec}) +1`
        : " + Especialização +1";
    }
  } else if (config.tipo === "atributoAtributo") {
    const val1 = obterValorAtributo(ficha, config.atributo1);
    const val2 = obterValorAtributo(ficha, config.atributo2);
    base = val1 + val2;
    descricao = `${nomePorId(config.atributo1)} ${val1} + ${nomePorId(config.atributo2)} ${val2}`;
  } else if (config.tipo === "vitalidade") {
    const totalVit = totalCaixasVitalidade(ficha);
    const agravado = contarDano(ficha.dano.vitalidade, totalVit).agravado;
    base = dadosDisponiveisTrilha(ficha.dano.vitalidade, totalVit);
    descricao = `Vitalidade ${base} (${totalVit} caixas, ${agravado} agravada(s) desconsiderada(s))`;
  } else if (config.tipo === "vontade") {
    const totalVon = totalCaixasVontade(ficha);
    const agravado = contarDano(ficha.dano.vontade, totalVon).agravado;
    base = dadosDisponiveisTrilha(ficha.dano.vontade, totalVon);
    descricao = `Força de Vontade ${base} (${totalVon} caixas, ${agravado} agravada(s) desconsiderada(s))`;
  }

  const total = Math.max(0, base + bonusEspecializacao + bonus);
  return {
    tipo: config.tipo,
    base,
    bonus,
    bonusEspecializacao,
    total,
    descricao: `${descricao}${textoBonusRolagem(bonus)}`,
  };
}

export interface ContextoSubgrupoRolagem {
  id: string;
  nome: string;
  desespero: number;
}

export function executarRolagemFicha(
  ficha: FichaDados,
  config: ConfigParadaRolagem,
  opcoes: {
    usarImpeto: boolean;
    impetoMarcado: boolean;
    subgrupo: ContextoSubgrupoRolagem;
  }
):
  | { ok: true; rolagem: RegistroRolagemFicha; ficha: FichaDados }
  | { ok: false; erro: string } {
  if (!ficha.estado.finalizada) {
    return {
      ok: false,
      erro: "Finalize ou importe uma ficha antes de rolar dados.",
    };
  }

  const parada = calcularParadaRolagem(ficha, config);
  if (parada.total <= 0) {
    return {
      ok: false,
      erro: "A parada precisa ter pelo menos 1 dado depois dos bônus.",
    };
  }

  if (opcoes.usarImpeto && !opcoes.impetoMarcado) {
    return {
      ok: false,
      erro: "Marque a opção 'Usar Ímpeto' antes de rolar com Ímpeto.",
    };
  }

  const dadosNormais = rolarD10(parada.total);
  const qtdDesespero = opcoes.usarImpeto
    ? Math.max(0, Math.round(opcoes.subgrupo.desespero || 0))
    : 0;
  const dadosDesespero = opcoes.usarImpeto ? rolarD10(qtdDesespero) : [];

  const calculado = opcoes.usarImpeto
    ? resultadoImpeto(dadosNormais, dadosDesespero)
    : resultadoRolagem(dadosNormais);

  const rolagem: RegistroRolagemFicha = {
    id: criarIdRolagem(),
    data: new Date().toISOString(),
    tipo: opcoes.usarImpeto ? "impeto" : parada.tipo,
    tipoBase: parada.tipo,
    descricao: opcoes.usarImpeto
      ? `${parada.descricao} + Ímpeto (${qtdDesespero} Dado(s) de Desespero)`
      : parada.descricao,
    totalDados: parada.total + dadosDesespero.length,
    impeto: opcoes.usarImpeto,
    subgrupoId: opcoes.subgrupo.id || "",
    subgrupoNome: opcoes.subgrupo.nome || "",
    perigoIncrementado: false,
    especializacaoUsada:
      config.tipo === "atributoHabilidade" && config.usarEspecializacao
        ? config.nomeEspecializacao?.trim() || "Ativa"
        : undefined,
    ...calculado,
  };

  const copia: FichaDados = structuredClone(ficha);
  copia.rolagens = [...(copia.rolagens || []), rolagem];
  copia.estado.ultimaAtualizacao = new Date().toISOString();

  return { ok: true, rolagem, ficha: copia };
}

function marcarUmGastoVontade(
  caixasAtuais: ReadonlyArray<string>,
  total: number
): { ok: true; caixas: MarcadorDano[] } | { ok: false; erro: string } {
  const caixas = normalizarTrilha(caixasAtuais, total);
  const idxVazia = caixas.findIndex((c) => c === "");
  if (idxVazia !== -1) {
    caixas[idxVazia] = "/";
    return { ok: true, caixas };
  }
  const idxSuperficial = caixas.findIndex((c) => c === "/");
  if (idxSuperficial !== -1) {
    caixas[idxSuperficial] = "X";
    return { ok: true, caixas };
  }
  return {
    ok: false,
    erro: "Força de Vontade está totalmente agravada — não é possível gastar Vontade para re-rolar.",
  };
}

/**
 * Regra Oficial 5e: Gastar 1 ponto de Força de Vontade (marca 1 dano superficial '/')
 * para re-rolar até 3 dados normais, sem poder tocar nos Dados de Desespero.
 */
export function rerolarDadosComVontade(
  ficha: FichaDados,
  rolagemId: string,
  indicesParaRerolar: number[]
):
  | {
      ok: true;
      ficha: FichaDados;
      rolagemAtualizada: RegistroRolagemFicha;
    }
  | { ok: false; erro: string } {
  const copia: FichaDados = structuredClone(ficha);
  const item = copia.rolagens.find((r) => r.id === rolagemId);
  if (!item) {
    return { ok: false, erro: "Rolagem não encontrada nesta ficha." };
  }
  if (item.reroladoVontade) {
    return {
      ok: false,
      erro: "Esta rolagem já utilizou re-rolagem de Força de Vontade.",
    };
  }
  if (item.aflicao) {
    return {
      ok: false,
      erro: "Não é possível re-rolar um teste já encerrado em Aflição.",
    };
  }

  const unicos = [...new Set(indicesParaRerolar)].filter(
    (idx) => Number.isInteger(idx) && idx >= 0 && idx < item.dados.length
  );

  if (unicos.length < 1 || unicos.length > 3) {
    return {
      ok: false,
      erro: "Selecione entre 1 e 3 dados normais para re-rolar.",
    };
  }

  const maxVon = totalCaixasVontade(copia);
  const gasto = marcarUmGastoVontade(copia.dano.vontade, maxVon);
  if (!gasto.ok) {
    return gasto;
  }

  const dadosAntigos = [...item.dados];
  const novosDadosNormais = [...item.dados];
  for (const idx of unicos) {
    novosDadosNormais[idx] = rolarD10(1)[0];
  }

  const dadosDesespero = Array.isArray(item.dadosDesespero)
    ? item.dadosDesespero
    : [];

  if (item.impeto) {
    const calc = resultadoImpeto(novosDadosNormais, dadosDesespero);
    item.dados = calc.dados;
    item.sucessosBase = calc.sucessosBase;
    item.dezenas = calc.dezenas;
    item.paresDez = calc.paresDez;
    item.sucessosExtras = calc.sucessosExtras;
    item.sucessos = calc.sucessos;
    item.critico = calc.critico;
  } else {
    const calc = resultadoRolagem(novosDadosNormais);
    item.dados = calc.dados;
    item.sucessosBase = calc.sucessosBase;
    item.dezenas = calc.dezenas;
    item.paresDez = calc.paresDez;
    item.sucessosExtras = calc.sucessosExtras;
    item.sucessos = calc.sucessos;
    item.critico = calc.critico;
  }

  item.dadosAnteriores = dadosAntigos;
  item.reroladoVontade = true;
  if (!item.descricao.includes("[Re-rolado c/ Vontade]")) {
    item.descricao = `${item.descricao} [Re-rolado c/ Vontade]`;
  }

  copia.dano.vontade = gasto.caixas;
  copia.estado.ultimaAtualizacao = new Date().toISOString();

  return { ok: true, ficha: copia, rolagemAtualizada: item };
}

/**
 * Permite acionar/forçar Ímpeto (Dados de Desespero) após uma rolagem normal,
 * adicionando os Dados de Desespero do subgrupo (ou ao menos 1 dado se Desespero for 0).
 */
export function adicionarDadosDesesperoNaRolagem(
  ficha: FichaDados,
  rolagemId: string,
  subgrupo: ContextoSubgrupoRolagem
):
  | {
      ok: true;
      ficha: FichaDados;
      rolagemAtualizada: RegistroRolagemFicha;
    }
  | { ok: false; erro: string } {
  const copia: FichaDados = structuredClone(ficha);
  const item = copia.rolagens.find((r) => r.id === rolagemId);
  if (!item) {
    return { ok: false, erro: "Rolagem não encontrada nesta ficha." };
  }
  if (item.impeto) {
    return {
      ok: false,
      erro: "Esta rolagem já utilizou Dados de Desespero.",
    };
  }

  const qtdDesespero = Math.max(1, Math.round(subgrupo.desespero || 1));
  const dadosDesespero = rolarD10(qtdDesespero);
  const calc = resultadoImpeto(item.dados, dadosDesespero);

  item.tipo = "impeto";
  item.impeto = true;
  item.dadosDesespero = calc.dadosDesespero;
  item.desesperoOnes = calc.desesperoOnes;
  item.sucessosBase = calc.sucessosBase;
  item.dezenas = calc.dezenas;
  item.paresDez = calc.paresDez;
  item.sucessosExtras = calc.sucessosExtras;
  item.sucessos = calc.sucessos;
  item.critico = calc.critico;
  item.totalDados = item.dados.length + dadosDesespero.length;
  item.subgrupoId = subgrupo.id || item.subgrupoId || "";
  item.subgrupoNome = subgrupo.nome || item.subgrupoNome || "";
  item.impetoPassou = null;
  item.aflicao = false;
  item.resolucaoImpeto = null;
  item.descricao = `${item.descricao} + Ímpeto (${qtdDesespero} Dado(s) de Desespero)`;

  copia.estado.ultimaAtualizacao = new Date().toISOString();

  return { ok: true, ficha: copia, rolagemAtualizada: item };
}

export function resolverTesteImpeto(
  ficha: FichaDados,
  rolagemId: string,
  passou: boolean
): { ficha: FichaDados; rolagemAtualizada: RegistroRolagemFicha | null } {
  const copia: FichaDados = structuredClone(ficha);
  const item = copia.rolagens.find((r) => r.id === rolagemId);
  if (
    !item ||
    item.resolucaoImpeto ||
    item.perigoIncrementado ||
    item.aflicao
  ) {
    return { ficha: copia, rolagemAtualizada: null };
  }

  item.impetoPassou = Boolean(passou);
  item.aflicao = !passou;
  item.resolucaoImpeto = passou ? null : "aflicao";
  copia.estado.ultimaAtualizacao = new Date().toISOString();

  return { ficha: copia, rolagemAtualizada: item };
}

export function marcarAflicaoNaRolagem(
  ficha: FichaDados,
  rolagemId: string
): { ficha: FichaDados; rolagemAtualizada: RegistroRolagemFicha | null } {
  const copia: FichaDados = structuredClone(ficha);
  const item = copia.rolagens.find((r) => r.id === rolagemId);
  if (
    !item ||
    item.resolucaoImpeto ||
    item.perigoIncrementado ||
    item.aflicao
  ) {
    return { ficha: copia, rolagemAtualizada: null };
  }

  item.impetoPassou = false;
  item.aflicao = true;
  item.resolucaoImpeto = "aflicao";
  copia.estado.ultimaAtualizacao = new Date().toISOString();

  return { ficha: copia, rolagemAtualizada: item };
}

export function confirmarPerigoIncrementadoNaRolagem(
  ficha: FichaDados,
  rolagemId: string
): { ficha: FichaDados; rolagemAtualizada: RegistroRolagemFicha | null } {
  const copia: FichaDados = structuredClone(ficha);
  const item = copia.rolagens.find((r) => r.id === rolagemId);
  if (!item) {
    return { ficha: copia, rolagemAtualizada: null };
  }

  item.perigoIncrementado = true;
  item.resolucaoImpeto = "perigo";
  copia.estado.ultimaAtualizacao = new Date().toISOString();

  return { ficha: copia, rolagemAtualizada: item };
}

export function criarResultadoRolagemMestre(
  quantidade: number,
  bonus: number
): ResultadoRolagemMestre {
  const qtdSegura = Math.max(1, Math.round(quantidade || 1));
  const bonusSeguro = Math.round(bonus || 0);
  const total = Math.max(1, qtdSegura + bonusSeguro);
  const dados = rolarD10(total);

  return {
    ...resultadoRolagem(dados),
    totalDados: total,
    bonus: bonusSeguro,
    data: new Date().toISOString(),
  };
}
