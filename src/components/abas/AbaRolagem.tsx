"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, Dices, Flame } from "lucide-react";
import { GridTaticoCombate } from "@/components/GridTaticoCombate";
import {
  HistoricoCentralizado,
  type RolagemJogadorFeedItem,
  type RolagemMestreFeedItem,
} from "@/components/HistoricoCentralizado";
import {
  ModalSimulacaoRolagem,
  type EventoAnimacaoRolagem,
} from "@/components/SimulacaoDadosTela";
import {
  adicionarDadosDesesperoNaRolagem,
  calcularParadaRolagem,
  confirmarPerigoIncrementadoNaRolagem,
  executarRolagemFicha,
  marcarAflicaoNaRolagem,
  obterEspecializacoesDaHabilidade,
  rerolarDadosComVontade,
  resolverTesteImpeto,
  TODAS_HABILIDADES,
  TODOS_ATRIBUTOS,
} from "@/lib/regras";
import type {
  AtributoId,
  FichaDados,
  HabilidadeId,
  RegistroRolagemFicha,
  TipoRolagemBase,
} from "@/types/ficha";

interface AbaRolagemProps {
  ficha: FichaDados;
  fichaAtualId: string | null;
  userEmail: string;
  isAdmin: boolean;
  subgrupo: { id: string; nome: string; desespero: number; perigo: number };
  autenticado: boolean;
  onAtualizarFichaERolagem: (
    atualizada: FichaDados,
    rolagemPublicar?: RegistroRolagemFicha
  ) => Promise<void>;
  onRecarregarSubgrupo: () => Promise<void>;
  onNotify: (msg: string, tipo?: "erro" | "info" | "sucesso") => void;
}

export function AbaRolagem({
  ficha,
  fichaAtualId,
  userEmail,
  isAdmin,
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
  const [usarEspecializacao, setUsarEspecializacao] = useState(false);
  const [nomeEspecializacao, setNomeEspecializacao] = useState("");
  const [usarImpeto, setUsarImpeto] = useState(false);
  const [animarDados, setAnimarDados] = useState(true);
  const [eventoAnimacao, setEventoAnimacao] =
    useState<EventoAnimacaoRolagem | null>(null);
  const [resolvendoPerigoId, setResolvendoPerigoId] = useState<string | null>(
    null
  );

  const [publicasMestre, setPublicasMestre] = useState<RolagemMestreFeedItem[]>(
    []
  );
  const [privadasMestre, setPrivadasMestre] = useState<RolagemMestreFeedItem[]>(
    []
  );
  const [publicasJogadores, setPublicasJogadores] = useState<
    RolagemJogadorFeedItem[]
  >([]);
  const [carregandoFeed, setCarregandoFeed] = useState(false);

  const especializacoesHabilidade = useMemo(
    () => obterEspecializacoesDaHabilidade(ficha, habilidade),
    [ficha, habilidade]
  );

  const handleMudarHabilidade = (novaHab: HabilidadeId) => {
    setHabilidade(novaHab);
    setUsarEspecializacao(false);
    setNomeEspecializacao("");
  };

  const alternarEspecializacaoChip = (nomeSpec: string) => {
    if (usarEspecializacao && nomeEspecializacao === nomeSpec) {
      setUsarEspecializacao(false);
      setNomeEspecializacao("");
    } else {
      setUsarEspecializacao(true);
      setNomeEspecializacao(nomeSpec);
    }
  };

  const parada = calcularParadaRolagem(ficha, {
    tipo,
    atributo1,
    atributo2,
    habilidade,
    bonus,
    usarEspecializacao,
    nomeEspecializacao,
  });

  const carregarFeedCentralizado = useCallback(
    async (silencioso = false) => {
      if (!autenticado) return;
      if (!silencioso) setCarregandoFeed(true);
      try {
        const res = await fetch("/api/rolagens", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setPublicasMestre(data.publicasMestre ?? []);
          setPrivadasMestre(data.privadasMestre ?? []);
          setPublicasJogadores(data.publicasJogadores ?? []);
        }
      } catch {
        // Silencioso
      } finally {
        if (!silencioso) setCarregandoFeed(false);
      }
    },
    [autenticado]
  );

  useEffect(() => {
    carregarFeedCentralizado(false);
    if (!autenticado) return;

    const intervalo = setInterval(() => {
      if (document.visibilityState === "visible") {
        carregarFeedCentralizado(true);
      }
    }, 4000);

    const onFocus = () => {
      if (document.visibilityState === "visible") {
        carregarFeedCentralizado(true);
      }
    };
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [autenticado, carregarFeedCentralizado]);

  const handleRolar = async (comImpeto: boolean) => {
    const res = executarRolagemFicha(
      ficha,
      {
        tipo,
        atributo1,
        atributo2,
        habilidade,
        bonus,
        usarEspecializacao,
        nomeEspecializacao,
      },
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

    if (animarDados) {
      setEventoAnimacao({
        id: res.rolagem.id,
        titulo: ficha.identidade.nome.trim() || "Rolagem de Dados",
        subtitulo: res.rolagem.descricao,
        dados: res.rolagem.dados,
        dadosDesespero: res.rolagem.dadosDesespero,
        sucessos: res.rolagem.sucessos,
        critico: res.rolagem.critico,
        desesperoOnes: res.rolagem.desesperoOnes,
      });
    }

    await onAtualizarFichaERolagem(res.ficha, res.rolagem);
    await carregarFeedCentralizado(true);
  };

  const handleRerolarComVontade = async (
    rolagemId: string,
    indices: number[]
  ) => {
    const res = rerolarDadosComVontade(ficha, rolagemId, indices);
    if (!res.ok) {
      onNotify(res.erro, "erro");
      return;
    }
    if (animarDados) {
      setEventoAnimacao({
        id: `${res.rolagemAtualizada.id}-reroll`,
        titulo: "Re-rolagem de Força de Vontade",
        subtitulo: res.rolagemAtualizada.descricao,
        dados: res.rolagemAtualizada.dados,
        dadosDesespero: res.rolagemAtualizada.dadosDesespero,
        sucessos: res.rolagemAtualizada.sucessos,
        critico: res.rolagemAtualizada.critico,
        desesperoOnes: res.rolagemAtualizada.desesperoOnes,
      });
    }
    await onAtualizarFichaERolagem(res.ficha, res.rolagemAtualizada);
    await carregarFeedCentralizado(true);
    onNotify(
      `Re-rolagem concluída! 1 ponto de Força de Vontade superficial marcado (${res.rolagemAtualizada.sucessos} sucesso(s)).`,
      "sucesso"
    );
  };

  const handleForcarComDesespero = async (rolagemId: string) => {
    const res = adicionarDadosDesesperoNaRolagem(ficha, rolagemId, {
      id: subgrupo.id,
      nome: subgrupo.nome,
      desespero: subgrupo.desespero,
    });
    if (!res.ok) {
      onNotify(res.erro, "erro");
      return;
    }
    if (animarDados) {
      setEventoAnimacao({
        id: `${res.rolagemAtualizada.id}-desp`,
        titulo: "Dados de Desespero (+Ímpeto)",
        subtitulo: res.rolagemAtualizada.descricao,
        dados: res.rolagemAtualizada.dados,
        dadosDesespero: res.rolagemAtualizada.dadosDesespero,
        sucessos: res.rolagemAtualizada.sucessos,
        critico: res.rolagemAtualizada.critico,
        desesperoOnes: res.rolagemAtualizada.desesperoOnes,
      });
    }
    await onAtualizarFichaERolagem(res.ficha, res.rolagemAtualizada);
    await carregarFeedCentralizado(true);
    onNotify(
      `Dados de Desespero rolados! Total de sucessos: ${res.rolagemAtualizada.sucessos}.`,
      "info"
    );
  };

  const handleResolverImpeto = async (rolagemId: string, passou: boolean) => {
    const { ficha: novaFicha, rolagemAtualizada } = resolverTesteImpeto(
      ficha,
      rolagemId,
      passou
    );
    if (!rolagemAtualizada) return;
    await onAtualizarFichaERolagem(novaFicha, rolagemAtualizada);
    await carregarFeedCentralizado(true);
  };

  const handleMarcarAflicao = async (rolagemId: string) => {
    const { ficha: novaFicha, rolagemAtualizada } = marcarAflicaoNaRolagem(
      ficha,
      rolagemId
    );
    if (!rolagemAtualizada) return;
    await onAtualizarFichaERolagem(novaFicha, rolagemAtualizada);
    await carregarFeedCentralizado(true);
  };

  const handleAumentarPerigo = async (item: RegistroRolagemFicha) => {
    if (!item.subgrupoId) {
      onNotify(
        "Não foi possível identificar o subgrupo desta rolagem.",
        "erro"
      );
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
      await carregarFeedCentralizado(true);
      onNotify(`Perigo do subgrupo aumentado em +${incremento}.`, "sucesso");
    } finally {
      setResolvendoPerigoId(null);
    }
  };

  const usaAtributo1 =
    tipo === "atributoHabilidade" || tipo === "atributoAtributo";
  const usaHabilidade = tipo === "atributoHabilidade";
  const usaAtributo2 = tipo === "atributoAtributo";

  const inputCls =
    "w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-[#f08b21] transition";

  return (
    <section className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-zinc-100">
          Rolagem de Dados &amp; Histórico
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Monte sua parada, ative Especializações (+1 dado) e re-role usando
          Força de Vontade ou Dados de Desespero.
        </p>
      </div>

      {/* Montador de parada */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 sm:p-5 space-y-4">
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
                onChange={(e) =>
                  handleMudarHabilidade(e.target.value as HabilidadeId)
                }
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

        {/* Barra rápida de Especializações (+1 dado) */}
        {usaHabilidade && (
          <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 mr-1">
                <Award className="w-3.5 h-3.5 text-[#f08b21]" />
                Especialização:
              </span>

              <button
                type="button"
                onClick={() => {
                  if (usarEspecializacao && !nomeEspecializacao) {
                    setUsarEspecializacao(false);
                  } else {
                    setUsarEspecializacao(true);
                    setNomeEspecializacao("");
                  }
                }}
                className={`px-3 py-1 rounded-md text-xs font-semibold border transition cursor-pointer ${
                  usarEspecializacao && !nomeEspecializacao
                    ? "bg-[#f08b21] text-zinc-950 border-[#f08b21]"
                    : "bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-500"
                }`}
              >
                +1 Especialização
              </button>

              {especializacoesHabilidade.sugeridas.map((spec) => {
                const ativa =
                  usarEspecializacao && nomeEspecializacao === spec;
                return (
                  <button
                    key={`sug-${spec}`}
                    type="button"
                    onClick={() => alternarEspecializacaoChip(spec)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold border transition cursor-pointer ${
                      ativa
                        ? "bg-[#f08b21] text-zinc-950 border-[#f08b21]"
                        : "bg-emerald-950/50 text-emerald-300 border-emerald-800/60 hover:border-emerald-600"
                    }`}
                  >
                    +1 {spec}
                  </button>
                );
              })}

              {especializacoesHabilidade.outrasLivres.map((spec) => {
                const ativa =
                  usarEspecializacao && nomeEspecializacao === spec;
                return (
                  <button
                    key={`liv-${spec}`}
                    type="button"
                    onClick={() => alternarEspecializacaoChip(spec)}
                    className={`px-3 py-1 rounded-md text-xs font-medium border transition cursor-pointer ${
                      ativa
                        ? "bg-[#f08b21] text-zinc-950 border-[#f08b21]"
                        : "bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                    }`}
                  >
                    +1 {spec}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-amber-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={usarImpeto}
                onChange={(e) => setUsarImpeto(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 accent-[#f08b21]"
              />
              Usar Ímpeto
            </label>

            <label className="inline-flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={animarDados}
                onChange={(e) => setAnimarDados(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 accent-[#f08b21]"
              />
              Simulação de dados na tela
            </label>
          </div>
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

      {/* Histórico Centralizado Único */}
      <HistoricoCentralizado
        estilo={isAdmin ? "mestre" : "jogador"}
        userEmail={userEmail}
        fichaAtualId={fichaAtualId}
        rolagensLocaisFicha={ficha.rolagens}
        personagemLocal={ficha.identidade.nome || "Ficha sem nome"}
        jogadorLocal={ficha.identidade.jogador || ""}
        publicasMestre={publicasMestre}
        privadasMestre={privadasMestre}
        jogadores={publicasJogadores}
        carregando={carregandoFeed}
        aoVivo={autenticado}
        resolvendoPerigoId={resolvendoPerigoId}
        onAtualizar={() => carregarFeedCentralizado(false)}
        onResolverImpeto={handleResolverImpeto}
        onMarcarAflicao={handleMarcarAflicao}
        onAumentarPerigo={handleAumentarPerigo}
        onRerolarComVontade={handleRerolarComVontade}
        onForcarComDesespero={handleForcarComDesespero}
      />

      {/* Grid Tático de Combate no final da aba Rolagens e Grid */}
      <GridTaticoCombate
        modo="jogador"
        autenticado={autenticado}
        fichaAtualId={fichaAtualId}
        nomePersonagemAtual={ficha.identidade.nome || "Caçador"}
        userEmail={userEmail}
        onNotify={onNotify}
      />

      <ModalSimulacaoRolagem
        evento={eventoAnimacao}
        onFechar={() => setEventoAnimacao(null)}
      />
    </section>
  );
}
