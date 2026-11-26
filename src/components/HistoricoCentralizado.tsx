"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { textoTipoRolagem } from "@/lib/regras";
import type {
  RegistroRolagemFicha,
  ResultadoRolagemMestre,
} from "@/types/ficha";

export interface RolagemMestreFeedItem {
  id: string;
  descricao: string;
  resultado: ResultadoRolagemMestre;
  createdAt: string;
}

export interface RolagemJogadorFeedItem {
  id: string;
  ownerEmail: string;
  fichaId: string | null;
  rolagemId: string;
  subgrupoId?: string | null;
  subgrupoNome?: string;
  personagem: string;
  jogador: string;
  descricao: string;
  resultado: RegistroRolagemFicha;
  createdAt: string;
}

type CategoriaItem =
  | "minha"
  | "outro_jogador"
  | "mestre_publica"
  | "mestre_privada";

interface ItemUnificado {
  chave: string;
  categoria: CategoriaItem;
  data: string;
  personagem?: string;
  ownerEmail?: string;
  jogador?: string;
  subgrupoNome?: string;
  fichaId?: string | null;
  descricao: string;
  mestreResultado?: ResultadoRolagemMestre;
  jogadorResultado?: RegistroRolagemFicha;
}

interface HistoricoCentralizadoProps {
  estilo: "jogador" | "mestre";
  userEmail?: string;
  fichaAtualId?: string | null;
  rolagensLocaisFicha?: RegistroRolagemFicha[];
  personagemLocal?: string;
  jogadorLocal?: string;
  publicasMestre: RolagemMestreFeedItem[];
  privadasMestre?: RolagemMestreFeedItem[];
  jogadores: RolagemJogadorFeedItem[];
  carregando?: boolean;
  aoVivo?: boolean;
  resolvendoPerigoId?: string | null;
  onAtualizar: () => void;
  onLimparTudo?: () => void;
  onResolverImpeto?: (rolagemId: string, passou: boolean) => void;
  onMarcarAflicao?: (rolagemId: string) => void;
  onAumentarPerigo?: (rolagem: RegistroRolagemFicha) => void;
}

function formatarData(valor?: string): string {
  if (!valor) return "";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function HistoricoCentralizado({
  estilo,
  userEmail = "",
  fichaAtualId = null,
  rolagensLocaisFicha = [],
  personagemLocal = "Ficha sem nome",
  jogadorLocal = "",
  publicasMestre,
  privadasMestre = [],
  jogadores,
  carregando = false,
  aoVivo = true,
  resolvendoPerigoId = null,
  onAtualizar,
  onLimparTudo,
  onResolverImpeto,
  onMarcarAflicao,
  onAumentarPerigo,
}: HistoricoCentralizadoProps) {
  const [filtro, setFiltro] = useState<string>("todas");
  const emailLower = userEmail.trim().toLowerCase();

  const idsLocaisFicha = useMemo(
    () => new Set(rolagensLocaisFicha.map((r) => r.id)),
    [rolagensLocaisFicha]
  );

  const itensUnificados = useMemo(() => {
    const mapa = new Map<string, ItemUnificado>();

    // 1. Rolagens públicas do Mestre
    for (const m of publicasMestre) {
      const chave = `mestre-pub-${m.id}`;
      mapa.set(chave, {
        chave,
        categoria: "mestre_publica",
        data: m.createdAt || m.resultado?.data,
        descricao: m.descricao || "Rolagem do mestre",
        mestreResultado: m.resultado,
      });
    }

    // 2. Rolagens privadas do Mestre (apenas no estilo Mestre)
    if (estilo === "mestre") {
      for (const m of privadasMestre) {
        const chave = `mestre-priv-${m.id}`;
        mapa.set(chave, {
          chave,
          categoria: "mestre_privada",
          data: m.createdAt || m.resultado?.data,
          descricao: m.descricao || "Rolagem privada",
          mestreResultado: m.resultado,
        });
      }
    }

    // 3. Rolagens dos jogadores vindas do banco
    const chavesJogadoresVistas = new Set<string>();
    for (const j of jogadores) {
      const idDedup = `${j.fichaId || "sem-ficha"}:${j.rolagemId || j.id}`;
      if (chavesJogadoresVistas.has(idDedup)) continue;
      chavesJogadoresVistas.add(idDedup);

      const ehMinha =
        Boolean(fichaAtualId && j.fichaId === fichaAtualId) ||
        Boolean(emailLower && j.ownerEmail?.trim().toLowerCase() === emailLower);

      // Se for da ficha aberta localmente, prefere o estado local mais recente (para botões de Ímpeto)
      const localCorrespondente =
        fichaAtualId && j.fichaId === fichaAtualId
          ? rolagensLocaisFicha.find((r) => r.id === j.rolagemId)
          : undefined;

      mapa.set(`jog-${idDedup}`, {
        chave: `jog-${idDedup}`,
        categoria: ehMinha ? "minha" : "outro_jogador",
        data: j.createdAt || j.resultado?.data,
        personagem: j.personagem || "Ficha sem nome",
        ownerEmail: j.ownerEmail || "",
        jogador: j.jogador || "",
        subgrupoNome: j.subgrupoNome || "",
        fichaId: j.fichaId,
        descricao: j.descricao || j.resultado?.descricao || "Rolagem",
        jogadorResultado: localCorrespondente ?? j.resultado,
      });
    }

    // 4. Rolagens locais da ficha atual que ainda não sincronizaram
    for (const local of rolagensLocaisFicha) {
      const idDedup = `${fichaAtualId || "local"}:${local.id}`;
      const tambemSemFicha = `sem-ficha:${local.id}`;
      if (
        chavesJogadoresVistas.has(idDedup) ||
        chavesJogadoresVistas.has(tambemSemFicha)
      ) {
        continue;
      }
      mapa.set(`local-${local.id}`, {
        chave: `local-${local.id}`,
        categoria: "minha",
        data: local.data,
        personagem: personagemLocal || "Ficha sem nome",
        ownerEmail: userEmail,
        jogador: jogadorLocal,
        subgrupoNome: local.subgrupoNome || "",
        fichaId: fichaAtualId,
        descricao: local.descricao || "Rolagem",
        jogadorResultado: local,
      });
    }

    return [...mapa.values()].sort(
      (a, b) =>
        new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime()
    );
  }, [
    publicasMestre,
    privadasMestre,
    jogadores,
    rolagensLocaisFicha,
    estilo,
    fichaAtualId,
    emailLower,
    personagemLocal,
    jogadorLocal,
    userEmail,
  ]);

  const itensFiltrados = useMemo(() => {
    if (filtro === "todas") return itensUnificados;
    if (filtro === "minhas") {
      return itensUnificados.filter((i) => i.categoria === "minha");
    }
    if (filtro === "outros") {
      return itensUnificados.filter((i) => i.categoria === "outro_jogador");
    }
    if (filtro === "jogadores") {
      return itensUnificados.filter(
        (i) => i.categoria === "minha" || i.categoria === "outro_jogador"
      );
    }
    if (filtro === "mestre_pub") {
      return itensUnificados.filter((i) => i.categoria === "mestre_publica");
    }
    if (filtro === "mestre_priv") {
      return itensUnificados.filter((i) => i.categoria === "mestre_privada");
    }
    return itensUnificados;
  }, [itensUnificados, filtro]);

  const abasFiltro =
    estilo === "mestre"
      ? [
          { id: "todas", label: "Todas" },
          { id: "jogadores", label: "Jogadores" },
          { id: "mestre_pub", label: "Mestre (Públicas)" },
          { id: "mestre_priv", label: "Mestre (Privadas)" },
        ]
      : [
          { id: "todas", label: "Todas" },
          { id: "minhas", label: "Minhas jogadas" },
          { id: "outros", label: "Outros jogadores" },
          { id: "mestre_pub", label: "Mestre" },
        ];

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-100">
            Histórico Centralizado da Mesa
          </h3>
          {aoVivo && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Ao vivo
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onAtualizar}
            disabled={carregando}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs transition cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${carregando ? "animate-spin" : ""}`}
            />
            Atualizar
          </button>

          {estilo === "mestre" && onLimparTudo && (
            <button
              type="button"
              onClick={onLimparTudo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/60 text-zinc-300 hover:text-red-300 border border-zinc-800 text-xs transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar todo histórico
            </button>
          )}
        </div>
      </div>

      {/* Filtros rápidos */}
      <div className="flex flex-wrap gap-1.5">
        {abasFiltro.map((aba) => (
          <button
            key={aba.id}
            type="button"
            onClick={() => setFiltro(aba.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              filtro === aba.id
                ? "bg-[#f08b21] text-zinc-950"
                : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
            }`}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {/* Lista Unificada */}
      <div className="max-h-[520px] overflow-y-auto space-y-2.5 pr-1">
        {itensFiltrados.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-zinc-800 rounded-lg">
            <p className="text-xs text-zinc-500">
              Nenhuma rolagem encontrada para este filtro.
            </p>
          </div>
        ) : (
          itensFiltrados.slice(0, 120).map((item) => {
            // Card de rolagem do Mestre (Pública ou Privada)
            if (
              item.categoria === "mestre_publica" ||
              item.categoria === "mestre_privada"
            ) {
              const res = item.mestreResultado;
              const privada = item.categoria === "mestre_privada";
              const dados = Array.isArray(res?.dados) ? res.dados : [];

              return (
                <div
                  key={item.chave}
                  className={`p-3.5 rounded-lg bg-zinc-950 border space-y-1.5 text-xs ${
                    privada ? "border-purple-800/60" : "border-amber-800/40"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          privada
                            ? "bg-purple-950/80 text-purple-300 border border-purple-700/60"
                            : "bg-amber-950/80 text-amber-300 border border-amber-700/60"
                        }`}
                      >
                        {privada ? "Mestre · Privada" : "Mestre · Pública"}
                      </span>
                      <strong className="text-sm text-zinc-100">
                        {item.descricao}
                      </strong>
                    </div>
                    <span className="text-zinc-500">
                      {formatarData(item.data)}
                    </span>
                  </div>

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

                  <p className="text-zinc-200">
                    Sucessos: <strong>{res?.sucessos ?? 0}</strong> (
                    {res?.sucessosBase ?? 0} em 6+, +{res?.sucessosExtras ?? 0}{" "}
                    por pares de 10) · Crítico:{" "}
                    <span
                      className={
                        res?.critico
                          ? "text-[#f08b21] font-semibold"
                          : "text-zinc-400"
                      }
                    >
                      {res?.critico ? "sim" : "não"}
                    </span>
                  </p>
                </div>
              );
            }

            // Card de rolagem de Jogador (Minha ou de Outro Jogador)
            const r = item.jogadorResultado!;
            const dados = Array.isArray(r.dados) ? r.dados : [];
            const dadosDesespero = Array.isArray(r.dadosDesespero)
              ? r.dadosDesespero
              : [];
            const qtdOnes = Number(r.desesperoOnes || 0);
            const ehMinha = item.categoria === "minha";
            const podeInteragirImpeto =
              ehMinha &&
              idsLocaisFicha.has(r.id) &&
              Boolean(onResolverImpeto && onMarcarAflicao && onAumentarPerigo);

            const statusImpetoResumo = r.impeto
              ? r.aflicao
                ? " · Ímpeto: Aflição"
                : r.perigoIncrementado || r.resolucaoImpeto === "perigo"
                  ? " · Ímpeto: Perigo aumentado"
                  : qtdOnes > 0
                    ? " · Ímpeto: aguardando decisão"
                    : ""
              : "";

            return (
              <div
                key={item.chave}
                className={`p-3.5 rounded-lg bg-zinc-950 border space-y-1.5 text-xs ${
                  ehMinha ? "border-[#f08b21]/45" : "border-zinc-800/90"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        ehMinha
                          ? "bg-[#f08b21]/20 text-[#f08b21] border border-[#f08b21]/40"
                          : "bg-zinc-900 text-zinc-300 border border-zinc-700"
                      }`}
                    >
                      {ehMinha && estilo === "jogador"
                        ? "Sua jogada"
                        : "Jogador"}
                    </span>
                    <strong className="text-sm text-zinc-100">
                      {item.personagem} · {textoTipoRolagem(r.tipo)}
                    </strong>
                    {item.subgrupoNome && (
                      <span className="text-[11px] text-zinc-500">
                        [{item.subgrupoNome}]
                      </span>
                    )}
                  </div>
                  <span className="text-zinc-500">
                    {formatarData(item.data)}
                  </span>
                </div>

                {(estilo === "mestre" || item.jogador) && (
                  <p className="text-zinc-500">
                    {estilo === "mestre" ? item.ownerEmail : ""}
                    {estilo === "mestre" && item.jogador ? " — " : ""}
                    {item.jogador ? `Jogador: ${item.jogador}` : ""}
                  </p>
                )}

                <p className="text-zinc-300">
                  {item.descricao} · {r.totalDados || dados.length} dado(s)
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

                {r.impeto && (
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
                  Sucessos: <strong>{r.sucessos}</strong> ({r.sucessosBase} em
                  6+, +{r.sucessosExtras} por pares de 10) · Crítico:{" "}
                  <span
                    className={
                      r.critico
                        ? "text-[#f08b21] font-semibold"
                        : "text-zinc-400"
                    }
                  >
                    {r.critico ? "sim" : "não"}
                  </span>
                  {!podeInteragirImpeto && statusImpetoResumo}
                </p>

                {/* Botões interativos de resolução de 1 em Dado de Desespero para a própria ficha */}
                {podeInteragirImpeto && r.impeto && qtdOnes > 0 && (
                  <div className="mt-2 pt-2 border-t border-zinc-800 space-y-2">
                    {r.aflicao ? (
                      <p className="text-red-300 font-medium">
                        Falha crítica / Aflição: o teste falha e o Caçador não
                        pode usar Dados de Desespero até se redimir pelo Ímpeto.
                      </p>
                    ) : r.perigoIncrementado ||
                      r.resolucaoImpeto === "perigo" ? (
                      <p className="text-amber-300">
                        Perigo do subgrupo já foi aumentado. Resolução de Ímpeto
                        concluída.
                      </p>
                    ) : r.impetoPassou === null ||
                      r.impetoPassou === undefined ? (
                      <div className="space-y-2">
                        <p className="text-amber-200 font-medium">
                          Saiu 1 em Dado de Desespero: o teste passou?
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onResolverImpeto?.(r.id, true)}
                            className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium cursor-pointer"
                          >
                            Passou
                          </button>
                          <button
                            type="button"
                            onClick={() => onResolverImpeto?.(r.id, false)}
                            className="px-3 py-1 rounded bg-red-950/70 hover:bg-red-900/70 text-red-200 border border-red-800/60 font-medium cursor-pointer"
                          >
                            Falhou
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-amber-200">
                          Teste passou com 1 em Desespero: mantenha a vitória
                          aumentando Perigo em +{qtdOnes}, ou trate como falha e
                          entre em Aflição.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {r.subgrupoId && !r.perigoIncrementado && (
                            <button
                              type="button"
                              disabled={resolvendoPerigoId === r.id}
                              onClick={() => onAumentarPerigo?.(r)}
                              className="px-3 py-1.5 rounded bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold disabled:opacity-50 cursor-pointer"
                            >
                              Aumentar Perigo +{qtdOnes}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={resolvendoPerigoId === r.id}
                            onClick={() => onMarcarAflicao?.(r.id)}
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
  );
}
