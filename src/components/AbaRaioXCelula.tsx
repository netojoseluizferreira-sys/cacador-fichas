"use client";

import {
  AlertOctagon,
  Edit3,
  Flame,
  HeartPulse,
  RefreshCw,
  ScanEye,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import {
  contarDano,
  estaDebilitado,
  normalizarTrilha,
  totalCaixasVitalidade,
  totalCaixasVontade,
  xpDisponivel,
} from "@/lib/regras";
import type { FichaResumoOnline, SubgrupoCronica } from "@/types/ficha";

interface AbaRaioXCelulaProps {
  fichasCronica: FichaResumoOnline[];
  subgrupos: SubgrupoCronica[];
  carregando: boolean;
  onAtualizar: () => void;
  onEditarFichaAdmin: (fichaId: string) => void;
  onIrParaFichas: () => void;
}

export function AbaRaioXCelula({
  fichasCronica,
  subgrupos,
  carregando,
  onAtualizar,
  onEditarFichaAdmin,
  onIrParaFichas,
}: AbaRaioXCelulaProps) {
  return (
    <div className="space-y-5">
      <div className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#f08b21]/10 border border-[#f08b21]/30 flex items-center justify-center text-[#f08b21]">
            <ScanEye className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-100">
                Raio-X da Célula ({fichasCronica.length})
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Ao vivo
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Monitoramento instantâneo de Vitalidade, Força de Vontade,
              Atributos, Trunfos e Pilares dos caçadores da crônica.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onAtualizar}
          disabled={carregando}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${carregando ? "animate-spin" : ""}`}
          />
          Atualizar
        </button>
      </div>

      {fichasCronica.length === 0 ? (
        <div className="bg-[#141416] border border-dashed border-zinc-800 rounded-xl py-12 px-4 text-center space-y-3">
          <p className="text-sm text-zinc-400">
            Nenhuma ficha está marcada na Crônica ainda.
          </p>
          <button
            type="button"
            onClick={onIrParaFichas}
            className="px-4 py-2 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Selecionar fichas na aba Fichas &amp; Jogadores
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {fichasCronica.map((resumo) => {
            const d = resumo.dados;
            const nome =
              d?.identidade?.nome?.trim() || resumo.nome || "Ficha sem nome";
            const jogador =
              d?.identidade?.jogador?.trim() || resumo.owner_email;
            const subgrupo = subgrupos.find((s) =>
              (s.ficha_ids ?? []).includes(resumo.id)
            );

            const maxVit = totalCaixasVitalidade(d);
            const maxVon = totalCaixasVontade(d);
            const caixasVit = normalizarTrilha(d?.dano?.vitalidade, maxVit);
            const caixasVon = normalizarTrilha(d?.dano?.vontade, maxVon);
            const contVit = contarDano(caixasVit, maxVit);
            const contVon = contarDano(caixasVon, maxVon);

            const debVit = estaDebilitado(caixasVit, maxVit);
            const foraVit =
              contVit.agravado >= contVit.total && contVit.total > 0;
            const debVon = estaDebilitado(caixasVon, maxVon);

            const ultimaImpeto = [...(d?.rolagens ?? [])]
              .reverse()
              .find((r) => r.impeto);
            const emAflicao = Boolean(ultimaImpeto?.aflicao);

            const fis = d.atributos.fisicos;
            const soc = d.atributos.sociais;
            const men = d.atributos.mentais;

            return (
              <div
                key={resumo.id}
                className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Topo do Card */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-display text-2xl font-bold uppercase tracking-wide text-zinc-100 truncate">
                          {nome}
                        </h4>
                        {d.cacador?.credo && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#f08b21]/15 text-[#f08b21] border border-[#f08b21]/40">
                            {d.cacador.credo}
                          </span>
                        )}
                        {d.cacador?.impeto && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-900 text-amber-300 border border-zinc-800">
                            Ímpeto: {d.cacador.impeto}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Jogador: <strong className="text-zinc-300">{jogador}</strong>
                        {d.identidade?.conceito
                          ? ` · ${d.identidade.conceito}`
                          : ""}
                        {subgrupo
                          ? ` · Grupo: ${subgrupo.nome} (Desesp. ${subgrupo.desespero} / Perigo ${subgrupo.perigo})`
                          : ""}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onEditarFichaAdmin(resumo.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-semibold shrink-0 transition cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#f08b21]" />
                      Ficha
                    </button>
                  </div>

                  {/* Alertas Críticos de Estado */}
                  {(foraVit || debVit || debVon || emAflicao) && (
                    <div className="flex flex-wrap gap-1.5">
                      {foraVit ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase bg-red-950/90 text-red-200 border border-red-700">
                          <AlertOctagon className="w-3.5 h-3.5" />
                          Fora de Conflito (Vitalidade)
                        </span>
                      ) : (
                        debVit && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase bg-amber-950/80 text-amber-200 border border-amber-700/70">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Debilitado (Vitalidade)
                          </span>
                        )
                      )}
                      {debVon && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase bg-purple-950/80 text-purple-200 border border-purple-700/70">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Debilitado (Vontade)
                        </span>
                      )}
                      {emAflicao && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase bg-red-950/80 text-red-300 border border-red-800/70">
                          <Flame className="w-3.5 h-3.5" />
                          Último Ímpeto em Aflição
                        </span>
                      )}
                    </div>
                  )}

                  {/* Trilhas de Vitalidade e Força de Vontade */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-300 flex items-center gap-1">
                          <HeartPulse className="w-3.5 h-3.5 text-[#f08b21]" />
                          Vitalidade
                        </span>
                        <span className="text-zinc-400">
                          {contVit.vazias} livres · {contVit.superficial}/ ·{" "}
                          {contVit.agravado}X
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {caixasVit.map((m, idx) => (
                          <span
                            key={idx}
                            className={`w-6 h-6 rounded border font-mono text-xs font-bold flex items-center justify-center ${
                              m === "X"
                                ? "bg-red-950/70 border-red-500/80 text-red-200"
                                : m === "/"
                                  ? "bg-amber-950/60 border-amber-500/70 text-amber-200"
                                  : "bg-zinc-900 border-zinc-700 text-zinc-600"
                            }`}
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-300 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                          Vontade
                        </span>
                        <span className="text-zinc-400">
                          {contVon.vazias} livres · {contVon.superficial}/ ·{" "}
                          {contVon.agravado}X
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {caixasVon.map((m, idx) => (
                          <span
                            key={idx}
                            className={`w-6 h-6 rounded border font-mono text-xs font-bold flex items-center justify-center ${
                              m === "X"
                                ? "bg-red-950/70 border-red-500/80 text-red-200"
                                : m === "/"
                                  ? "bg-amber-950/60 border-amber-500/70 text-amber-200"
                                  : "bg-zinc-900 border-zinc-700 text-zinc-600"
                            }`}
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Resumo compacto de Atributos */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
                      <span className="block text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                        Físicos
                      </span>
                      <strong className="text-zinc-200 font-mono">
                        F{fis.forca} · D{fis.destreza} · V{fis.vigor}
                      </strong>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
                      <span className="block text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                        Sociais
                      </span>
                      <strong className="text-zinc-200 font-mono">
                        C{soc.carisma} · M{soc.manipulacao} · A
                        {soc.autocontrole}
                      </strong>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
                      <span className="block text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                        Mentais
                      </span>
                      <strong className="text-zinc-200 font-mono">
                        I{men.inteligencia} · R{men.raciocinio} · D
                        {men.determinacao}
                      </strong>
                    </div>
                  </div>

                  {/* Trunfos & Pilares */}
                  <div className="space-y-2 text-xs">
                    {(d.trunfos?.length > 0 || d.distincoes?.length > 0) && (
                      <div className="flex flex-wrap gap-1.5">
                        {d.trunfos?.map((t, i) => (
                          <span
                            key={`t-${i}`}
                            className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-200 border border-zinc-700 font-medium"
                          >
                            Trunfo: {t.nome}
                          </span>
                        ))}
                        {d.distincoes?.map((dist, i) => (
                          <span
                            key={`d-${i}`}
                            className="px-2 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-zinc-800"
                          >
                            {dist.nome}
                          </span>
                        ))}
                      </div>
                    )}

                    {d.pilares?.filter(Boolean).length > 0 && (
                      <p className="text-zinc-400">
                        <strong className="text-zinc-300">Pilares:</strong>{" "}
                        {d.pilares.filter(Boolean).join(" · ")}
                      </p>
                    )}

                    {(d.identidade?.ambicao || d.identidade?.desejo) && (
                      <p className="text-zinc-500">
                        {d.identidade.ambicao
                          ? `Ambição: ${d.identidade.ambicao}`
                          : ""}
                        {d.identidade.ambicao && d.identidade.desejo
                          ? " · "
                          : ""}
                        {d.identidade.desejo
                          ? `Desejo: ${d.identidade.desejo}`
                          : ""}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/70 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>XP disponível: {xpDisponivel(d)}</span>
                  <span>{resumo.owner_email}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
