"use client";

import { AlertTriangle, CheckCircle2, Download, FileJson } from "lucide-react";
import { gerarTextoFicha, validarFicha } from "@/lib/regras";
import type { FichaDados } from "@/types/ficha";

interface AbaPreviaProps {
  ficha: FichaDados;
  modoCriacao: boolean;
  onExportarTxt: () => void;
  onExportarJson: () => void;
}

export function AbaPrevia({
  ficha,
  modoCriacao,
  onExportarTxt,
  onExportarJson,
}: AbaPreviaProps) {
  const { erros, avisos } = validarFicha(ficha);
  const texto = gerarTextoFicha(ficha, { modoCriacao });

  return (
    <section className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-zinc-100">
            Prévia da Ficha
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Resumo completo pronto para consulta em mesa ou exportação.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onExportarTxt}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar .TXT
          </button>
          <button
            type="button"
            onClick={onExportarJson}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-medium text-xs uppercase tracking-wider transition cursor-pointer"
          >
            <FileJson className="w-3.5 h-3.5" />
            Exportar .JSON
          </button>
        </div>
      </div>

      {/* Validação */}
      <div className="space-y-2">
        {erros.length === 0 && avisos.length === 0 ? (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {ficha.estado.finalizada
              ? "Ficha finalizada e pronta para uso na crônica."
              : "Ficha válida e pronta para finalizar."}
          </div>
        ) : (
          <>
            {erros.map((erro, idx) => (
              <div
                key={`err-${idx}`}
                className="flex items-start gap-2 px-3.5 py-2.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-200 text-xs"
              >
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{erro}</span>
              </div>
            ))}
            {avisos.map((aviso, idx) => (
              <div
                key={`warn-${idx}`}
                className="flex items-start gap-2 px-3.5 py-2.5 rounded-lg bg-amber-950/35 border border-amber-800/50 text-amber-200 text-xs"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{aviso}</span>
              </div>
            ))}
          </>
        )}
      </div>

      <pre className="w-full p-5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words overflow-x-auto">
        {texto}
      </pre>
    </section>
  );
}
