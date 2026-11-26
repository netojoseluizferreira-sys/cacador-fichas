"use client";

import { FileText, Trash2, X } from "lucide-react";
import type { FichaResumoOnline } from "@/types/ficha";

interface ModalMinhasFichasProps {
  aberto: boolean;
  fichas: FichaResumoOnline[];
  carregando: boolean;
  onFechar: () => void;
  onCarregarFicha: (id: string) => void;
  onExcluirFicha: (id: string) => void;
}

function formatarData(valor: string): string {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "sem data";
  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function ModalMinhasFichas({
  aberto,
  fichas,
  carregando,
  onFechar,
  onCarregarFicha,
  onExcluirFicha,
}: ModalMinhasFichasProps) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-[#141416] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-100">
              Minhas Fichas Online
            </h2>
            <p className="text-xs text-zinc-400">
              Selecione uma ficha salva no banco para abrir ou gerenciar.
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-3">
          {carregando ? (
            <p className="text-sm text-zinc-400 py-8 text-center">
              Carregando fichas...
            </p>
          ) : fichas.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-zinc-800 rounded-lg">
              <p className="text-sm text-zinc-400">
                Nenhuma ficha salva online para esta conta ainda.
              </p>
            </div>
          ) : (
            fichas.map((ficha) => (
              <div
                key={ficha.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-zinc-950/70 border border-zinc-800/90 hover:border-zinc-700 transition"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#f08b21] shrink-0" />
                    <strong className="text-sm font-semibold text-zinc-100 truncate">
                      {ficha.nome || "Ficha sem nome"}
                    </strong>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                        ficha.dados?.estado?.finalizada
                          ? "bg-emerald-950/70 text-emerald-300 border border-emerald-800/60"
                          : "bg-amber-950/70 text-amber-300 border border-amber-800/60"
                      }`}
                    >
                      {ficha.dados?.estado?.finalizada
                        ? "Finalizada"
                        : "Em criação"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    {ficha.owner_email} · Atualizada em{" "}
                    {formatarData(ficha.updated_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onCarregarFicha(ficha.id)}
                    className="px-3.5 py-1.5 rounded-md bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs transition cursor-pointer"
                  >
                    Carregar
                  </button>
                  <button
                    type="button"
                    onClick={() => onExcluirFicha(ficha.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-red-950/60 text-zinc-300 hover:text-red-300 border border-zinc-800 hover:border-red-800/70 text-xs transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
