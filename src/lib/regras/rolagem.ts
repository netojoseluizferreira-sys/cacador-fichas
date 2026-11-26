import type {
  AtributoId,
  FichaDados,
  HabilidadeId,
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

export interface ConfigParadaRolagem {
  tipo: TipoRolagemBase;
  atributo1: AtributoId;
  atributo2: AtributoId;
  habilidade: HabilidadeId;
  bonus: number;
}

export function calcularParadaRolagem(
  ficha: FichaDados,
  config: ConfigParadaRolagem
) {
  const bonus = Math.round(Number(config.bonus || 0));
  let base = 0;
  let descricao = "";

  if (config.tipo === "atributoHabilidade") {
    const valAttr = obterValorAtributo(ficha, config.atributo1);
    const valHab = obterValorHabilidade(ficha, config.habilidade);
    base = valAttr + valHab;
    descricao = `${nomePorId(config.atributo1)} ${valAttr} + ${nomePorId(config.habilidade)} ${valHab}`;
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

  const total = Math.max(0, base + bonus);
  return {
    tipo: config.tipo,
    base,
    bonus,
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
    ...calculado,
  };

  const copia: FichaDados = structuredClone(ficha);
  copia.rolagens = [...(copia.rolagens || []), rolagem];
  copia.estado.ultimaAtualizacao = new Date().toISOString();

  return { ok: true, rolagem, ficha: copia };
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
