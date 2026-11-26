"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, ListOrdered, RefreshCw, Swords } from "lucide-react";
import type { VisibilidadeIniciativa } from "@/types/ficha";

interface ItemIniciativaJogadorView {
  id: string;
  posicao: number;
  nome: string;
  detalhe: string;
  valor: number;
  ehTurnoAtual: boolean;
  ehMeuPersonagem: boolean;
}

interface RespostaIniciativa {
  disponivel: boolean;
  motivo?: string;
  visibilidade: VisibilidadeIniciativa;
  definida: boolean;
  totalParticipantes?: number;
  turnoAtualPosicao?: number;
  turnoAtualNome?: string | null;
  itens: ItemIniciativaJogadorView[];
}

interface AbaIniciativaProps {
  autenticado: boolean;
}

export function AbaIniciativa({ autenticado }: AbaIniciativaProps) {
  const [dados, setDados] = useState<RespostaIniciativa | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregarIniciativa = useCallback(
    async (silencioso = false) => {
      if (!autenticado) {
        setCarregando(false);
        return;
      }
      if (!silencioso) setCarregando(true);
      try {
        const res = await fetch("/api/iniciativa", { cache: "no-store" });
        if (res.ok) {
          const json: RespostaIniciativa = await res.json();
          setDados(json);
        }
      } catch {
        // Silencioso
      } finally {
        if (!silencioso) setCarregando(false);
      }
    },
    [autenticado]
  );

  useEffect(() => {
    carregarIniciativa(false);
    if (!autenticado) return;

    const intervalo = setInterval(() => {
      if (document.visibilityState === "visible") {
        carregarIniciativa(true);
      }
    }, 4000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        carregarIniciativa(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [autenticado, carregarIniciativa]);

  return (
    <section className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#f08b21]/10 border border-[#f08b21]/30 flex items-center justify-center text-[#f08b21]">
            <ListOrdered className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-zinc-100">
                Ordem de Iniciativa
              </h2>
              {autenticado && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Ao vivo
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-400 mt-0.5">
              Acompanhe os turnos do conflito atual conforme liberado pelo
              Narrador.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => carregarIniciativa(false)}
          disabled={carregando}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${carregando ? "animate-spin" : ""}`}
          />
          Atualizar
        </button>
      </div>

      {!autenticado ? (
        <div className="py-12 text-center border border-dashed border-zinc-800 rounded-xl">
          <p className="text-sm text-zinc-400">
            Entre na sua conta para acompanhar a iniciativa da sessão.
          </p>
        </div>
      ) : !dados || !dados.disponivel ? (
        <div className="py-12 px-4 text-center bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-2">
          <EyeOff className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="text-sm font-medium text-zinc-300">
            {dados?.motivo || "Nenhuma iniciativa disponível no momento."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Barra de resumo do turno e modo */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
            <div className="flex items-center gap-2.5">
              <Swords className="w-4 h-4 text-[#f08b21]" />
              <span className="text-sm text-zinc-300">
                Turno atual:{" "}
                <strong className="text-zinc-100">
                  {dados.turnoAtualPosicao}º na ordem
                  {dados.turnoAtualNome
                    ? ` — ${dados.turnoAtualNome}`
                    : " (combatente oculto)"}
                </strong>
              </span>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                dados.visibilidade === "total"
                  ? "bg-emerald-950/70 text-emerald-300 border border-emerald-800/60"
                  : "bg-amber-950/70 text-amber-300 border border-amber-800/60"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              {dados.visibilidade === "total"
                ? "Visibilidade Total"
                : `Visibilidade Parcial (${dados.itens.length} de ${dados.totalParticipantes} revelados)`}
            </span>
          </div>

          {/* Lista de participantes visíveis */}
          {dados.itens.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-zinc-800 rounded-xl">
              <p className="text-xs text-zinc-400">
                A iniciativa está em modo parcial, mas nenhum combatente foi
                revelado ainda.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {dados.itens.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border transition ${
                    item.ehTurnoAtual
                      ? "bg-[#f08b21]/12 border-[#f08b21] shadow-[0_0_16px_rgba(240,139,33,0.16)]"
                      : item.ehMeuPersonagem
                        ? "bg-zinc-900/70 border-zinc-700"
                        : "bg-zinc-950 border-zinc-800/90"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`px-2.5 py-1.5 rounded-lg font-display font-bold text-base tabular-nums shrink-0 ${
                        item.ehTurnoAtual
                          ? "bg-[#f08b21] text-zinc-950"
                          : "bg-zinc-900 text-zinc-300 border border-zinc-800"
                      }`}
                    >
                      {item.posicao}º
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm sm:text-base text-zinc-100 truncate">
                          {item.nome}
                        </strong>
                        {item.ehMeuPersonagem && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#f08b21]/20 text-[#f08b21] border border-[#f08b21]/40">
                            Você
                          </span>
                        )}
                        {item.ehTurnoAtual && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                            Turno Atual
                          </span>
                        )}
                      </div>
                      {item.detalhe && (
                        <span className="block text-xs text-zinc-400 truncate mt-0.5">
                          {item.detalhe}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="block text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                      Iniciativa
                    </span>
                    <strong className="font-display text-lg text-zinc-200 tabular-nums">
                      {item.valor}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
