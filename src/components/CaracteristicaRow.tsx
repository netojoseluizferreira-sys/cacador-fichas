"use client";

import { Minus, Plus } from "lucide-react";

interface CaracteristicaRowProps {
  nome: string;
  valor: number;
  min: number;
  max?: number;
  disabled?: boolean;
  onChange: (novoValor: number) => void;
}

export function CaracteristicaRow({
  nome,
  valor,
  min,
  max = 5,
  disabled = false,
  onChange,
}: CaracteristicaRowProps) {
  const handleDotClick = (nivel: number) => {
    if (disabled) return;
    if (nivel === valor && min === 0) {
      onChange(0);
    } else if (nivel >= min && nivel <= max) {
      onChange(nivel);
    }
  };

  const decrementar = () => {
    if (disabled || valor <= min) return;
    onChange(valor - 1);
  };

  const incrementar = () => {
    if (disabled || valor >= max) return;
    onChange(valor + 1);
  };

  return (
    <div className="flex items-center justify-between gap-3 py-2 px-2.5 rounded-md bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors">
      <span className="text-sm font-medium text-zinc-200 truncate">{nome}</span>

      <div className="flex items-center gap-2.5 shrink-0">
        {/* Bolinhas clicáveis estilo World of Darkness */}
        <div
          className="hidden sm:flex items-center gap-1"
          role="group"
          aria-label={`Nível de ${nome}`}
        >
          {[1, 2, 3, 4, 5].map((nivel) => {
            const preenchido = valor >= nivel;
            return (
              <button
                key={nivel}
                type="button"
                disabled={disabled || nivel < min}
                onClick={() => handleDotClick(nivel)}
                title={`${nome}: nível ${nivel}`}
                className={`w-3.5 h-3.5 rounded-full border transition-all ${
                  preenchido
                    ? "bg-[#f08b21] border-[#f08b21] shadow-[0_0_6px_rgba(240,139,33,0.35)]"
                    : "bg-zinc-900 border-zinc-600 hover:border-zinc-400"
                } ${
                  disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
              />
            );
          })}
        </div>

        {/* Controles compactos - / valor / + (alvos maiores para toque no celular) */}
        <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-md p-0.5">
          <button
            type="button"
            disabled={disabled || valor <= min}
            onClick={decrementar}
            aria-label={`Diminuir ${nome}`}
            className="w-8 h-8 sm:w-6 sm:h-6 flex items-center justify-center rounded text-zinc-300 sm:text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 active:bg-zinc-700 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Minus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </button>
          <span className="w-6 sm:w-5 text-center font-display text-base font-semibold text-zinc-100 tabular-nums">
            {valor}
          </span>
          <button
            type="button"
            disabled={disabled || valor >= max}
            onClick={incrementar}
            aria-label={`Aumentar ${nome}`}
            className="w-8 h-8 sm:w-6 sm:h-6 flex items-center justify-center rounded text-zinc-300 sm:text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 active:bg-zinc-700 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
