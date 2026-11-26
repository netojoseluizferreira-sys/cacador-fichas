"use client";

import { useCallback, useEffect, useState } from "react";
import { Dices, Flame, RefreshCw } from "lucide-react";
import {
  calcularParadaRolagem,
  confirmarPerigoIncrementadoNaRolagem,
  executarRolagemFicha,
  marcarAflicaoNaRolagem,
  resolverTesteImpeto,
  textoTipoRolagem,
  TODAS_HABILIDADES,
  TODOS_ATRIBUTOS,
} from "@/lib/regras";
import type {
  AtributoId,
  FichaDados,
  HabilidadeId,
  RegistroRolagemFicha,
  ResultadoRolagemMestre,
  TipoRolagemBase,
} from "@/types/ficha";

interface RolagemPublicaMestreRow {
  id: string;
  descricao: string;
  resultado: ResultadoRolagemMestre;
  createdAt: string;
}

interface RolagemPublicaJogadorRow {
  id: string;
  ownerEmail: string;
  fichaId: string | null;
  rolagemId: string;
  subgrupoId: string | null;
  subgrupoNome: string;
  personagem: string;
  jogador: string;
  descricao: string;
  resultado: RegistroRolagemFicha;
  createdAt: string;
}

interface AbaRolagemProps {
  ficha: FichaDados;
  fichaAtualId: string | null;
  subgrupo: { id: string; nome: string; desespero: number; perigo: number };
  autenticado: boolean;
  onAtualizarFichaERolagem: (
    atualizada: FichaDados,
    rolagemPublicar?: RegistroRolagemFicha
  ) => Promise<void>;
  onRecarregarSubgrupo: () => Promise<void>;
  onNotify: (msg: string, tipo?: "erro" | "info" | "sucesso") => void;
}

function formatarData(valor?: string): string {
  if (!valor) return "";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function AbaRolagem({
  ficha,
  fichaAtualId,
  subgrupo,
  autenticado,
  onAtualizarFichaERolagem,
  onRecarregarSubgrupo,
  onNotify,
}: AbaRolagemProps) {
  const [tipo, setTipo] = useState<TipoRolagemBase>("atributoHabilidade");
  const [atributo1, setAtributo1] = useState<AtributoId>("forca");
  const [atributo2, setAtributo2] = useState<AtributoId>("vigor");
  const [habilidade, setHabilidade] = useState<HabilidadeId>("armasBrancas");
  const [bonus, setBonus] = useState(0);
  const [usarImpeto, setUsarImpeto] = useState(false);
  const [resolvendoPerigoId, setResolvendoPerigoId] = useState<string | null>(
    null
  );

  const [publicasMestre, setPublicasMestre] = useState<
    RolagemPublicaMestreRow[]
  >([]);
  const [publicasJogadores, setPublicasJogadores] = useState<
    RolagemPublicaJogadorRow[]
  >([]);
  const [carregandoPublicas, setCarregandoPublicas] = useState(false);

  const parada = calcularParadaRolagem(ficha, {
    tipo,
    atributo1,
    atributo2,
    habilidade,
    bonus,
  });

  const carregarHistoricoPublico = useCallback(async () => {
    if (!autenticado) return;
    setCarregandoPublicas(true);
    try {
      const qs = subgrupo.id
        ? `?subgrupoId=${encodeURIComponent(subgrupo.id)}`
        : "";
      const res = await fetch(`/api/rolagens${qs}`);
      if (res.ok) {
        const data = await res.json();
        setPublicasMestre(data.publicasMestre ?? []);
        setPublicasJogadores(data.publicasJogadores ?? []);
      }
    } catch {
      // Silencioso
    } finally {
      setCarregandoPublicas(false);
    }
  }, [autenticado, subgrupo.id]);

  useEffect(() => {
    carregarHistoricoPublico();
  }, [carregarHistoricoPublico]);

  const handleRolar = async (comImpeto: boolean) => {
    const res = executarRolagemFicha(
      ficha,
      { tipo, atributo1, atributo2, habilidade, bonus },
      {
        usarImpeto: comImpeto,
        impetoMarcado: usarImpeto,
        subgrupo: {
          id: subgrupo.id,
          nome: subgrupo.nome,
          desespero: subgrupo.desespero,
        },
      }
    );

    if (!res.ok) {
      onNotify(res.erro, "erro");
      return;
    }

    await onAtualizarFichaERolagem(res.ficha, res.rolagem);
    if (autenticado && fichaAtualId) {
      await carregarHistoricoPublico();
    }
  };

  const handleResolverImpeto = async (rolagemId: string, passou: boolean) => {
    const { ficha: novaFicha, rolagemAtualizada } = resolverTesteImpeto(
      ficha,
      rolagemId,
      passou
    );
    if (!rolagemAtualizada) return;
    await onAtualizarFichaERolagem(novaFicha, rolagemAtualizada);
    await carregarHistoricoPublico();
  };

  const handleMarcarAflicao = async (rolagemId: string) => {
    const { ficha: novaFicha, rolagemAtualizada } = marcarAflicaoNaRolagem(
      ficha,
      rolagemId
    );
    if (!rolagemAtualizada) return;
    await onAtualizarFichaERolagem(novaFicha, rolagemAtualizada);
    await carregarHistoricoPublico();
  };

  const handleAumentarPerigo = async (item: RegistroRolagemFicha) => {
    if (!item.subgrupoId) {
      onNotify("Não foi possível identificar o subgrupo desta rolagem.", "erro");
      return;
    }
    if (
      item.resolucaoImpeto ||
      item.perigoIncrementado ||
      item.aflicao ||
      resolvendoPerigoId === item.id
    ) {
      return;
    }

    const incremento = Math.max(1, Number(item.desesperoOnes || 1));
    setResolvendoPerigoId(item.id);

    try {
      const resp = await fetch(`/api/subgrupos/${item.subgrupoId}/perigo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incremento }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        onNotify(json.error || "Erro ao aumentar Perigo.", "erro");
        return;
      }

      const { ficha: novaFicha, rolagemAtualizada } =
        confirmarPerigoIncrementadoNaRolagem(ficha, item.id);
      await onRecarregarSubgrupo();
      await onAtualizarFichaERolagem(
        novaFicha,
        rolagemAtualizada ?? undefined
      );
      await carregarHistoricoPublico();
      onNotify(`Perigo do subgrupo aumentado em +${incremento}.`, "sucesso");
    } finally {
      setResolvendoPerigoId(null);
    }
  };

  const usaAtributo1 =
    tipo === "atributoHabilidade" || tipo === "atributoAtributo";
  const usaHabilidade = tipo === "atributoHabilidade";
  const usaAtributo2 = tipo === "atributoAtributo";

  const itensPublicosCombinados = [
    ...publicasMestre.map((m) => ({
      chave: `mestre-${m.id}`,
      data: m.createdAt || m.resultado?.data,
      tipo: "mestre" as const,
      mestre: m,
    })),
    ...publicasJogadores.map((j) => ({
      chave: `jog-${j.id}`,
      data: j.createdAt || j.resultado?.data,
      tipo: "jogador" as const,
      jogador: j,
    })),
  ].sort(
    (a, b) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime()
  );

  const inputCls =
    "w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-[#f08b21] transition";

  return (
    <section className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-zinc-100">
          Rolagem de Dados
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Monte a parada, aplique bônus e role dados normais ou com Dados de
          Desespero (Ímpeto).
        </p>
      </div>

      {/* Montador de parada */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Tipo de rolagem
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoRolagemBase)}
              className={inputCls}
            >
              <option value="atributoHabilidade">Atributo + Habilidade</option>
              <option value="atributoAtributo">Atributo + Atributo</option>
              <option value="vitalidade">Vitalidade</option>
              <option value="vontade">Força de Vontade</option>
            </select>
          </div>

          {usaAtributo1 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Atributo
              </label>
              <select
                value={atributo1}
                onChange={(e) => setAtributo1(e.target.value as AtributoId)}
                className={inputCls}
              >
                {TODOS_ATRIBUTOS.map(([id, nome]) => (
                  <option key={id} value={id}>
                    {nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {usaHabilidade && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Habilidade
              </label>
              <select
                value={habilidade}
                onChange={(e) => setHabilidade(e.target.value as HabilidadeId)}
                className={inputCls}
              >
                {TODAS_HABILIDADES.map(([id, nome]) => (
                  <option key={id} value={id}>
                    {nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {usaAtributo2 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Segundo Atributo
              </label>
              <select
                value={atributo2}
                onChange={(e) => setAtributo2(e.target.value as AtributoId)}
                className={inputCls}
              >
                {TODOS_ATRIBUTOS.map(([id, nome]) => (
                  <option key={id} value={id}>
                    {nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Outros bônus
            </label>
            <input
              type="number"
              value={bonus}
              onChange={(e) => setBonus(Number(e.target.value || 0))}
              className={inputCls}
            />
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-sm text-zinc-200">
            <span className="font-semibold text-[#f08b21]">
              Parada: {parada.total} dado(s)
              {usarImpeto
                ? ` + ${subgrupo.desespero} Dado(s) de Desespero`
                : ""}
            </span>
            <span className="text-zinc-400"> — {parada.descricao}</span>
          </div>

          <label className="inline-flex items-center gap-2 text-sm font-medium text-amber-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={usarImpeto}
              onChange={(e) => setUsarImpeto(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-900 accent-[#f08b21]"
            />
            Usar Ímpeto
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleRolar(false)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            <Dices className="w-4 h-4" />
            Rolar dados
          </button>

          <button
            type="button"
            onClick={() => handleRolar(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-600/50 font-semibold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            <Flame className="w-4 h-4" />
            Rolar com Ímpeto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resultados da Ficha */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-4 sm:p-5 space-y-3">
          <h3 className="font-display text-lg font-semibold uppercase tracking-wider text-zinc-100">
            Resultados desta Ficha
          </h3>

          <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1">
            {ficha.rolagens.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">
                Nenhuma rolagem realizada ainda.
              </p>
            ) : (
              ficha.rolagens
                .slice()
                .reverse()
                .map((item) => {
                  const dados = Array.isArray(item.dados) ? item.dados : [];
                  const dadosDesespero = Array.isArray(item.dadosDesespero)
                    ? item.dadosDesespero
                    : [];
                  const qtdOnes = Number(item.desesperoOnes || 0);

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800/90 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-sm text-[#f08b21]">
                          {textoTipoRolagem(item.tipo)}
                        </strong>
                        <span className="text-zinc-500">
                          {formatarData(item.data)}
                        </span>
                      </div>

                      <p className="text-zinc-300">
                        {item.descricao} · {item.totalDados} dado(s)
                      </p>

                      <p className="text-zinc-400">
                        Dados:{" "}
                        {dados.length
                          ? dados.map((d, idx) => (
                              <span
                                key={idx}
                                className={`inline-block font-mono font-bold mr-1.5 ${
                                  d === 10
                                    ? "text-[#f08b21]"
                                    : d >= 6
                                      ? "text-emerald-300"
                                      : "text-zinc-400"
                                }`}
                              >
                                [{d}]
                              </span>
                            ))
                          : "nenhum"}
                      </p>

                      {item.impeto && (
                        <p className="text-amber-300/90">
                          Dados de Desespero:{" "}
                          {dadosDesespero.length
                            ? dadosDesespero.map((d, idx) => (
                                <span
                                  key={idx}
                                  className={`inline-block font-mono font-bold mr-1.5 ${
                                    d === 1
                                      ? "text-red-400"
                                      : d >= 6
                                        ? "text-amber-200"
                                        : "text-zinc-400"
                                  }`}
                                >
                                  [{d}]
                                </span>
                              ))
                            : "nenhum"}{" "}
                          ({qtdOnes} resultado(s) 1)
                        </p>
                      )}

                      <p className="text-zinc-200">
                        Sucessos: <strong>{item.sucessos}</strong> (
                        {item.sucessosBase} em 6+, +{item.sucessosExtras} por
                        pares de 10) · Crítico:{" "}
                        <span
                          className={
                            item.critico
                              ? "text-[#f08b21] font-semibold"
                              : "text-zinc-400"
                          }
                        >
                          {item.critico ? "sim" : "não"}
                        </span>
                      </p>

                      {/* Resolução interativa de 1 em Dado de Desespero */}
                      {item.impeto && qtdOnes > 0 && (
                        <div className="mt-2 pt-2 border-t border-zinc-800 space-y-2">
                          {item.aflicao ? (
                            <p className="text-red-300 font-medium">
                              Falha crítica / Aflição: o teste falha e o Caçador
                              não pode usar Dados de Desespero até se redimir
                              pelo Ímpeto.
                            </p>
                          ) : item.perigoIncrementado ||
                            item.resolucaoImpeto === "perigo" ? (
                            <p className="text-amber-300">
                              Perigo do subgrupo já foi aumentado. Resolução de
                              Ímpeto concluída.
                            </p>
                          ) : item.impetoPassou === null ||
                            item.impetoPassou === undefined ? (
                            <div className="space-y-2">
                              <p className="text-amber-200 font-medium">
                                Saiu 1 em Dado de Desespero: o teste passou?
                              </p>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleResolverImpeto(item.id, true)
                                  }
                                  className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium cursor-pointer"
                                >
                                  Passou
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleResolverImpeto(item.id, false)
                                  }
                                  className="px-3 py-1 rounded bg-red-950/70 hover:bg-red-900/70 text-red-200 border border-red-800/60 font-medium cursor-pointer"
                                >
                                  Falhou
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-amber-200">
                                Teste passou com 1 em Desespero: mantenha a
                                vitória aumentando Perigo em +{qtdOnes}, ou
                                trate como falha e entre em Aflição.
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {item.subgrupoId && !item.perigoIncrementado && (
                                  <button
                                    type="button"
                                    disabled={resolvendoPerigoId === item.id}
                                    onClick={() => handleAumentarPerigo(item)}
                                    className="px-3 py-1.5 rounded bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold disabled:opacity-50 cursor-pointer"
                                  >
                                    Aumentar Perigo +{qtdOnes}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={resolvendoPerigoId === item.id}
                                  onClick={() => handleMarcarAflicao(item.id)}
                                  className="px-3 py-1.5 rounded bg-red-950/70 hover:bg-red-900/70 text-red-200 border border-red-800/60 font-medium cursor-pointer"
                                >
                                  Tratar como falha / Aflição
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Histórico Público da Crônica */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold uppercase tracking-wider text-zinc-100">
              Histórico Público da Crônica
            </h3>
            <button
              type="button"
              onClick={carregarHistoricoPublico}
              disabled={carregandoPublicas}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs transition cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${carregandoPublicas ? "animate-spin" : ""}`}
              />
              Atualizar
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1">
            {!autenticado ? (
              <p className="text-xs text-zinc-500 italic">
                Entre na sua conta para acompanhar as rolagens públicas da
                crônica.
              </p>
            ) : itensPublicosCombinados.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">
                Nenhuma rolagem pública registrada ainda.
              </p>
            ) : (
              itensPublicosCombinados.slice(0, 80).map((entrada) => {
                if (entrada.tipo === "mestre") {
                  const m = entrada.mestre;
                  const res = m.resultado;
                  return (
                    <div
                      key={entrada.chave}
                      className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800/90 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-amber-300">
                          Pública (Mestre) · {m.descricao}
                        </strong>
                        <span className="text-zinc-500">
                          {formatarData(m.createdAt)}
                        </span>
                      </div>
                      <p className="text-zinc-400">
                        Dados: {(res.dados || []).join(", ") || "nenhum"}
                      </p>
                      <p className="text-zinc-200">
                        Sucessos: <strong>{res.sucessos}</strong> (
                        {res.sucessosBase} em 6+, +{res.sucessosExtras} por
                        pares de 10) · Crítico: {res.critico ? "sim" : "não"}
                      </p>
                    </div>
                  );
                }

                const j = entrada.jogador;
                const r = j.resultado;
                const decisaoImpeto = r.impeto
                  ? r.aflicao
                    ? " · Ímpeto: Aflição"
                    : r.perigoIncrementado
                      ? " · Ímpeto: Perigo aumentado"
                      : Number(r.desesperoOnes || 0) > 0
                        ? " · Ímpeto: aguardando decisão"
                        : ""
                  : "";

                return (
                  <div
                    key={entrada.chave}
                    className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800/90 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-zinc-100">
                        {j.personagem} · {textoTipoRolagem(r.tipo)}
                      </strong>
                      <span className="text-zinc-500">
                        {formatarData(j.createdAt)}
                      </span>
                    </div>
                    <p className="text-zinc-500">
                      {j.ownerEmail}
                      {j.jogador ? ` (${j.jogador})` : ""}
                    </p>
                    <p className="text-zinc-300">{j.descricao}</p>
                    <p className="text-zinc-400">
                      Dados: {(r.dados || []).join(", ") || "nenhum"}
                    </p>
                    {r.impeto && (
                      <p className="text-amber-300/90">
                        Desespero:{" "}
                        {(r.dadosDesespero || []).join(", ") || "nenhum"} (
                        {Number(r.desesperoOnes || 0)} resultado(s) 1)
                      </p>
                    )}
                    <p className="text-zinc-200">
                      Sucessos: <strong>{r.sucessos}</strong> ({r.sucessosBase}{" "}
                      em 6+, +{r.sucessosExtras} por pares de 10) · Crítico:{" "}
                      {r.critico ? "sim" : "não"}
                      {decisaoImpeto}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
