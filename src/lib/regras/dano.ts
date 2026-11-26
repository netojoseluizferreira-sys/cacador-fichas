import type {
  FichaDados,
  MarcadorDano,
  TipoDano,
  TrilhaDanoKey,
} from "@/types/ficha";

export function totalCaixasVitalidade(ficha: FichaDados): number {
  return Number(ficha.atributos.fisicos.vigor || 1) + 3;
}

export function totalCaixasVontade(ficha: FichaDados): number {
  return (
    Number(ficha.atributos.sociais.autocontrole || 1) +
    Number(ficha.atributos.mentais.determinacao || 1)
  );
}

export function maiorRecuperacaoVontade(ficha: FichaDados): number {
  return Math.max(
    Number(ficha.atributos.sociais.autocontrole || 1),
    Number(ficha.atributos.mentais.determinacao || 1)
  );
}

export function totalCaixasPorTrilha(
  ficha: FichaDados,
  trilha: TrilhaDanoKey
): number {
  return trilha === "vitalidade"
    ? totalCaixasVitalidade(ficha)
    : totalCaixasVontade(ficha);
}

export function nomeTrilha(trilha: TrilhaDanoKey): string {
  return trilha === "vitalidade" ? "Vitalidade" : "Força de Vontade";
}

export function normalizarTrilha(
  caixas: ReadonlyArray<string> | undefined,
  total: number
): MarcadorDano[] {
  const atual = Array.isArray(caixas) ? caixas : [];
  const normalizada: MarcadorDano[] = atual
    .slice(0, total)
    .map((m) => (m === "/" || m === "X" ? m : ""));

  while (normalizada.length < total) {
    normalizada.push("");
  }

  return normalizada;
}

export function sincronizarTrilhasDano(ficha: FichaDados): FichaDados {
  const copia: FichaDados = structuredClone(ficha);
  const maxVit = totalCaixasVitalidade(copia);
  const maxVon = totalCaixasVontade(copia);
  copia.dano = {
    vitalidade: normalizarTrilha(copia.dano?.vitalidade, maxVit),
    vontade: normalizarTrilha(copia.dano?.vontade, maxVon),
  };
  copia.estados.vitalidadeCaixas = maxVit;
  copia.estados.forcaDeVontadeCaixas = maxVon;
  return copia;
}

export function contarDano(caixas: ReadonlyArray<string>, total: number) {
  const normalizada = normalizarTrilha(caixas, total);
  return {
    superficial: normalizada.filter((item) => item === "/").length,
    agravado: normalizada.filter((item) => item === "X").length,
    vazias: normalizada.filter((item) => item === "").length,
    total: normalizada.length,
  };
}

export function estaDebilitado(
  caixas: ReadonlyArray<string>,
  total: number
): boolean {
  return contarDano(caixas, total).vazias === 0;
}

export function dadosDisponiveisTrilha(
  caixas: ReadonlyArray<string>,
  total: number
): number {
  const contagem = contarDano(caixas, total);
  return Math.max(0, contagem.total - contagem.agravado);
}

export function alternarCaixaDano(
  caixasAtuais: ReadonlyArray<string>,
  total: number,
  index: number
): { ok: true; caixas: MarcadorDano[] } | { ok: false; erro: string } {
  const caixas = normalizarTrilha(caixasAtuais, total);
  if (index < 0 || index >= caixas.length) {
    return { ok: true, caixas };
  }

  if (caixas[index] === "X") {
    return {
      ok: false,
      erro: "Dano agravado não pode ser removido clicando na caixa. Use Medicina ou recuperação narrativa quando a regra permitir.",
    };
  }

  caixas[index] = caixas[index] === "" ? "/" : "X";
  return { ok: true, caixas };
}

function marcarNivelDano(caixas: MarcadorDano[], marcador: "/" | "X"): boolean {
  const vazia = caixas.findIndex((item) => item === "");
  if (vazia !== -1) {
    caixas[vazia] = marcador;
    return true;
  }

  const superficial = caixas.findIndex((item) => item === "/");
  if (superficial !== -1) {
    caixas[superficial] = "X";
    return true;
  }

  return false;
}

export function aplicarDanoTrilha(
  caixasAtuais: ReadonlyArray<string>,
  total: number,
  quantidadeRecebida: number,
  tipo: TipoDano
): { caixas: MarcadorDano[]; aplicados: number; totalmenteAgravada: boolean } {
  const caixas = normalizarTrilha(caixasAtuais, total);
  const recebido = Math.max(1, Math.round(quantidadeRecebida));
  const niveis = tipo === "superficial" ? Math.ceil(recebido / 2) : recebido;
  const marcador: "/" | "X" = tipo === "superficial" ? "/" : "X";

  let aplicados = 0;
  for (let i = 0; i < niveis; i += 1) {
    if (marcarNivelDano(caixas, marcador)) {
      aplicados += 1;
    }
  }

  return {
    caixas,
    aplicados,
    totalmenteAgravada: aplicados === 0,
  };
}

export function removerSuperficialTrilha(
  caixasAtuais: ReadonlyArray<string>,
  total: number,
  quantidade: number
): { caixas: MarcadorDano[]; removidos: number } {
  const caixas = normalizarTrilha(caixasAtuais, total);
  let removidos = 0;

  for (let i = caixas.length - 1; i >= 0 && removidos < quantidade; i -= 1) {
    if (caixas[i] === "/") {
      caixas[i] = "";
      removidos += 1;
    }
  }

  return { caixas, removidos };
}

export function recuperarComecoSessao(ficha: FichaDados): {
  ficha: FichaDados;
  vitalidadeRecuperada: number;
  vontadeRecuperada: number;
} {
  const copia = sincronizarTrilhasDano(ficha);
  const recVit = removerSuperficialTrilha(
    copia.dano.vitalidade,
    totalCaixasVitalidade(copia),
    Number(copia.atributos.fisicos.vigor || 1)
  );
  const recVon = removerSuperficialTrilha(
    copia.dano.vontade,
    totalCaixasVontade(copia),
    maiorRecuperacaoVontade(copia)
  );

  copia.dano.vitalidade = recVit.caixas;
  copia.dano.vontade = recVon.caixas;

  return {
    ficha: copia,
    vitalidadeRecuperada: recVit.removidos,
    vontadeRecuperada: recVon.removidos,
  };
}

export function converterAgravadoEmSuperficial(
  caixasAtuais: ReadonlyArray<string>,
  total: number,
  trilha: TrilhaDanoKey
): { ok: true; caixas: MarcadorDano[] } | { ok: false; erro: string } {
  const caixas = normalizarTrilha(caixasAtuais, total);
  const agravadoIdx = caixas.findIndex((item) => item === "X");
  if (agravadoIdx === -1) {
    return {
      ok: false,
      erro: `Não há dano agravado de ${nomeTrilha(trilha)} para converter.`,
    };
  }

  caixas[agravadoIdx] = "/";
  return { ok: true, caixas };
}

export function resumoDanoTexto(
  trilha: TrilhaDanoKey,
  caixasAtuais: ReadonlyArray<string>,
  total: number
): string {
  const contagem = contarDano(caixasAtuais, total);
  const debilitado = estaDebilitado(caixasAtuais, total);
  const foraConflito = contagem.agravado >= contagem.total && contagem.total > 0;
  const disponiveis = dadosDisponiveisTrilha(caixasAtuais, total);

  const partes = [
    `${contagem.superficial} superficial`,
    `${contagem.agravado} agravado`,
    `${disponiveis} dado(s) disponíveis para rolagem de ${nomeTrilha(trilha)}`,
  ];

  if (foraConflito) {
    partes.push("trilha totalmente agravada: fora do conflito");
  } else if (debilitado) {
    partes.push("debilitado: dano novo converte superficial em agravado");
  }

  return partes.join(" · ");
}
