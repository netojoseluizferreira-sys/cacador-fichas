import type { AtributoId, FichaDados, HabilidadeId } from "@/types/ficha";
import { trunfosCatalogo, vantagensCatalogo } from "./catalogo";
import {
  definirValorAtributo,
  definirValorHabilidade,
  nomePorId,
  obterValorAtributo,
  obterValorHabilidade,
  SITUACOES_GANHO_XP,
  type TipoGastoXp,
} from "./constantes";
import { sincronizarTrilhasDano } from "./dano";

export function xpDisponivel(ficha: FichaDados): number {
  const total = Number(ficha.estados.xpTotal || 0);
  const gasto = Number(ficha.estados.xpGasto || 0);
  return total - gasto;
}

export function calcularCustoXp(
  ficha: FichaDados,
  tipo: TipoGastoXp,
  alvo: string,
  pontosVantagem = 1
): number {
  if (tipo === "atributo") {
    const atual = obterValorAtributo(ficha, alvo as AtributoId);
    return (atual + 1) * 5;
  }

  if (tipo === "habilidade") {
    const atual = obterValorHabilidade(ficha, alvo as HabilidadeId);
    return (atual + 1) * 3;
  }

  if (tipo === "especializacao") {
    return 3;
  }

  if (tipo === "trunfo") {
    return 6;
  }

  if (tipo === "distincao") {
    return 3;
  }

  if (tipo === "vantagem") {
    return Math.max(1, Math.round(pontosVantagem || 1)) * 3;
  }

  return 0;
}

export function registrarGanhoXp(
  ficha: FichaDados,
  situacaoId: string,
  quantidadeCustom: number,
  observacao: string
): { ok: true; ficha: FichaDados } | { ok: false; erro: string } {
  if (!ficha.estado.finalizada) {
    return { ok: false, erro: "Finalize a ficha antes de registrar XP." };
  }

  const situacao =
    SITUACOES_GANHO_XP.find((item) => item.id === situacaoId) ??
    SITUACOES_GANHO_XP[0];
  const quantidade =
    situacao.pontos === null
      ? Math.max(1, Math.round(quantidadeCustom || 1))
      : situacao.pontos;

  const copia: FichaDados = structuredClone(ficha);
  const obsLimpa = observacao.trim();
  copia.estados.xpTotal = Number(copia.estados.xpTotal || 0) + quantidade;
  copia.estados.xpDisponivel = xpDisponivel(copia);
  copia.xpLog = [
    ...(copia.xpLog || []),
    `+${quantidade} XP - ${situacao.label}${obsLimpa ? ` - ${obsLimpa}` : ""}`,
  ];
  copia.estado.ultimaAtualizacao = new Date().toISOString();

  return { ok: true, ficha: copia };
}

export interface EntradaGastoXp {
  tipo: TipoGastoXp;
  alvo: string;
  detalhe: string;
  pontos: number;
}

export function aplicarGastoXp(
  ficha: FichaDados,
  entrada: EntradaGastoXp
): { ok: true; ficha: FichaDados } | { ok: false; erro: string } {
  if (!ficha.estado.finalizada) {
    return { ok: false, erro: "Finalize a ficha antes de gastar XP." };
  }

  const custo = calcularCustoXp(
    ficha,
    entrada.tipo,
    entrada.alvo,
    entrada.pontos
  );
  const disponivel = xpDisponivel(ficha);
  if (custo > disponivel) {
    return {
      ok: false,
      erro: `XP insuficiente. Custo: ${custo}, disponível: ${disponivel}.`,
    };
  }

  let copia: FichaDados = structuredClone(ficha);
  const detalhe = entrada.detalhe.trim();
  let descricao = "";

  if (entrada.tipo === "atributo") {
    const atual = obterValorAtributo(copia, entrada.alvo as AtributoId);
    if (atual >= 5) {
      return { ok: false, erro: "Este valor já está no máximo 5." };
    }
    copia = definirValorAtributo(copia, entrada.alvo as AtributoId, atual + 1);
    copia = sincronizarTrilhasDano(copia);
    descricao = `${nomePorId(entrada.alvo)} aumentado para ${atual + 1}`;
  } else if (entrada.tipo === "habilidade") {
    const atual = obterValorHabilidade(copia, entrada.alvo as HabilidadeId);
    if (atual >= 5) {
      return { ok: false, erro: "Este valor já está no máximo 5." };
    }
    copia = definirValorHabilidade(
      copia,
      entrada.alvo as HabilidadeId,
      atual + 1
    );
    descricao = `${nomePorId(entrada.alvo)} aumentado para ${atual + 1}`;
  } else if (entrada.tipo === "especializacao") {
    if (!detalhe) {
      return { ok: false, erro: "Informe a especialização comprada." };
    }
    const atual = copia.especializacoes.livre.trim();
    copia.especializacoes.livre = atual ? `${atual}; ${detalhe}` : detalhe;
    descricao = `Especialização comprada: ${detalhe}`;
  } else if (entrada.tipo === "trunfo") {
    const catalogo = trunfosCatalogo[Number(entrada.alvo)] ?? trunfosCatalogo[0];
    copia.trunfos = [
      ...copia.trunfos,
      {
        nome: detalhe || catalogo.nome,
        categoria: catalogo.categoria,
        detalhe,
        resumo: catalogo.resumo,
      },
    ];
    descricao = `Novo Trunfo: ${detalhe || catalogo.nome}`;
  } else if (entrada.tipo === "distincao") {
    if (!detalhe) {
      return { ok: false, erro: "Informe a distinção comprada." };
    }
    copia.distincoes = [
      ...copia.distincoes,
      {
        nome: detalhe,
        categoria: "Distinção",
        detalhe: "",
      },
    ];
    descricao = `Nova Distinção: ${detalhe}`;
  } else if (entrada.tipo === "vantagem") {
    const catalogo =
      vantagensCatalogo[Number(entrada.alvo)] ?? vantagensCatalogo[0];
    const pontos = Math.max(1, Math.round(entrada.pontos || 1));
    copia.vantagens = [
      ...copia.vantagens,
      {
        nome: detalhe || catalogo.nome,
        categoria: catalogo.categoria,
        pontos,
        detalhe,
        resumo: catalogo.resumo,
      },
    ];
    descricao = `Vantagem comprada: ${detalhe || catalogo.nome} (${pontos})`;
  }

  copia.estados.xpGasto = Number(copia.estados.xpGasto || 0) + custo;
  copia.estados.xpDisponivel = xpDisponivel(copia);
  copia.xpLog = [...(copia.xpLog || []), `-${custo} XP - ${descricao}`];
  copia.estado.ultimaAtualizacao = new Date().toISOString();

  return { ok: true, ficha: copia };
}
