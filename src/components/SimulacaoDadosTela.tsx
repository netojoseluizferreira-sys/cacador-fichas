"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Dices, Flame, Sparkles, X } from "lucide-react";
import type { UltimaRolagemResumo } from "@/types/ficha";

interface DadoD10VisualProps {
  valor: number;
  desespero?: boolean;
  girando?: boolean;
  tamanho?: "sm" | "md" | "lg";
}

export function DadoD10Visual({
  valor,
  desespero = false,
  girando = false,
  tamanho = "md",
}: DadoD10VisualProps) {
  const [faceTemporaria, setFaceTemporaria] = useState(valor);

  useEffect(() => {
    if (!girando) {
      setFaceTemporaria(valor);
      return;
    }
    const timer = setInterval(() => {
      setFaceTemporaria(Math.floor(Math.random() * 10) + 1);
    }, 65);
    return () => clearInterval(timer);
  }, [girando, valor]);

  const numeroExibido = girando ? faceTemporaria : valor;
  const ehDez = !girando && valor === 10;
  const ehSucesso = !girando && valor >= 6;
  const ehFalhaDesespero = !girando && desespero && valor === 1;

  const dims =
    tamanho === "lg"
      ? "w-14 h-14 text-lg"
      : tamanho === "sm"
        ? "w-8 h-8 text-xs"
        : "w-11 h-11 text-sm";

  const cores = girando
    ? desespero
      ? "text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.45)]"
      : "text-zinc-200 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
    : ehFalhaDesespero
      ? "text-red-200 drop-shadow-[0_0_12px_rgba(239,68,68,0.85)]"
      : ehDez
        ? "text-zinc-950 drop-shadow-[0_0_14px_rgba(240,139,33,0.9)]"
        : ehSucesso
          ? desespero
            ? "text-amber-100 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
            : "text-emerald-200 drop-shadow-[0_0_8px_rgba(16,185,129,0.45)]"
          : "text-zinc-400";

  const fillPoligono = girando
    ? desespero
      ? "#451a03"
      : "#18181b"
    : ehFalhaDesespero
      ? "#7f1d1d"
      : ehDez
        ? "#f08b21"
        : ehSucesso
          ? desespero
            ? "#78350f"
            : "#064e3b"
          : desespero
            ? "#291509"
            : "#141417";

  const strokePoligono = girando
    ? desespero
      ? "#f59e0b"
      : "#71717a"
    : ehFalhaDesespero
      ? "#ef4444"
      : ehDez
        ? "#fde68a"
        : ehSucesso
          ? desespero
            ? "#fbbf24"
            : "#34d399"
          : desespero
            ? "#92400e"
            : "#3f3f46";

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none transition-transform duration-200 ${dims} ${
        girando ? "animate-spin" : "scale-100"
      }`}
      title={
        desespero
          ? `Dado de Desespero: ${valor}`
          : `Dado Normal: ${valor}`
      }
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      >
        {/* Silhueta facetada de um d10 */}
        <polygon
          points="50,4 93,34 78,92 22,92 7,34"
          fill={fillPoligono}
          stroke={strokePoligono}
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <polyline
          points="50,4 50,24 93,34"
          fill="none"
          stroke={strokePoligono}
          strokeOpacity="0.45"
          strokeWidth="2"
        />
        <polyline
          points="50,24 7,34"
          fill="none"
          stroke={strokePoligono}
          strokeOpacity="0.45"
          strokeWidth="2"
        />
        <polyline
          points="7,34 32,74 50,92 68,74 93,34"
          fill="none"
          stroke={strokePoligono}
          strokeOpacity="0.35"
          strokeWidth="2"
        />
      </svg>
      <span className={`relative z-10 font-mono font-extrabold ${cores}`}>
        {numeroExibido}
      </span>
    </div>
  );
}

export interface EventoAnimacaoRolagem {
  id: string;
  titulo: string;
  subtitulo?: string;
  dados: number[];
  dadosDesespero?: number[];
  sucessos: number;
  critico: boolean;
  desesperoOnes?: number;
}

interface ModalSimulacaoRolagemProps {
  evento: EventoAnimacaoRolagem | null;
  onFechar: () => void;
}

export function ModalSimulacaoRolagem({
  evento,
  onFechar,
}: ModalSimulacaoRolagemProps) {
  const [girando, setGirando] = useState(true);

  useEffect(() => {
    if (!evento) return;
    setGirando(true);
    const tParar = setTimeout(() => {
      setGirando(false);
    }, 850);
    const tFechar = setTimeout(() => {
      onFechar();
    }, 4600);

    return () => {
      clearTimeout(tParar);
      clearTimeout(tFechar);
    };
  }, [evento, onFechar]);

  if (!evento) return null;

  const dadosDesespero = evento.dadosDesespero ?? [];
  const temUmDesespero = !girando && Number(evento.desesperoOnes || 0) > 0;

  return (
    <div
      onClick={onFechar}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-[#111114]/95 border border-zinc-700/90 shadow-[0_25px_70px_rgba(0,0,0,0.85)] p-6 space-y-5 cursor-default"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#f08b21]">
              <Dices className="w-3.5 h-3.5" />
              {girando ? "Rolando Dados..." : "Resultado da Parada"}
            </span>
            <h3 className="font-display text-2xl font-bold uppercase tracking-wide text-zinc-100 mt-0.5">
              {evento.titulo}
            </h3>
            {evento.subtitulo && (
              <p className="text-xs text-zinc-400 mt-0.5">{evento.subtitulo}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Bandeja de Dados d10 */}
        <div className="p-4 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {evento.dados.map((valor, idx) => (
              <DadoD10Visual
                key={`norm-${idx}`}
                valor={valor}
                girando={girando}
                tamanho="lg"
              />
            ))}
            {dadosDesespero.map((valor, idx) => (
              <DadoD10Visual
                key={`desp-${idx}`}
                valor={valor}
                desespero={true}
                girando={girando}
                tamanho="lg"
              />
            ))}
          </div>

          {dadosDesespero.length > 0 && (
            <p className="text-center text-[11px] text-amber-300/80">
              <Flame className="w-3 h-3 inline mr-1" />
               Inclui {dadosDesespero.length} Dado(s) de Desespero
            </p>
          )}
        </div>

        {/* Rodapé com Sucessos */}
        <div className="text-center space-y-1 min-h-[52px] flex flex-col items-center justify-center">
          {girando ? (
            <p className="font-display text-lg uppercase tracking-widest text-zinc-400 animate-pulse">
              Calculando destino...
            </p>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2">
                {evento.critico && (
                  <Sparkles className="w-5 h-5 text-[#f08b21]" />
                )}
                <span
                  className={`font-display text-3xl font-bold uppercase tracking-wider ${
                    evento.critico
                      ? "text-[#f08b21]"
                      : evento.sucessos > 0
                        ? "text-emerald-400"
                        : "text-zinc-400"
                  }`}
                >
                  {evento.sucessos}{" "}
                  {evento.sucessos === 1 ? "Sucesso" : "Sucessos"}
                  {evento.critico ? " · Crítico!" : ""}
                </span>
              </div>
              {temUmDesespero && (
                <p className="text-xs font-semibold text-red-400">
                  Atenção: caiu {evento.desesperoOnes} resultado(s) 1 nos Dados
                  de Desespero!
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface WidgetUltimaRolagemCantoProps {
  rolagem: UltimaRolagemResumo | null;
}

export function WidgetUltimaRolagemCanto({
  rolagem,
}: WidgetUltimaRolagemCantoProps) {
  const [minimizado, setMinimizado] = useState(false);
  const [girando, setGirando] = useState(false);
  const ultimoIdVistoRef = useRef<string | null>(null);

  useEffect(() => {
    if (!rolagem) return;
    if (
      ultimoIdVistoRef.current !== null &&
      ultimoIdVistoRef.current !== rolagem.id
    ) {
      setMinimizado(false);
      setGirando(true);
      const t = setTimeout(() => setGirando(false), 800);
      ultimoIdVistoRef.current = rolagem.id;
      return () => clearTimeout(t);
    }
    ultimoIdVistoRef.current = rolagem.id;
  }, [rolagem]);

  if (!rolagem) {
    return (
      <div className="pointer-events-auto rounded-xl bg-zinc-950/90 backdrop-blur-md border border-zinc-800/90 px-3 py-2 shadow-xl text-[11px] text-zinc-500">
        Nenhuma rolagem recente
      </div>
    );
  }

  const dadosDesespero = rolagem.dadosDesespero ?? [];

  return (
    <div className="pointer-events-auto w-64 sm:w-72 rounded-xl bg-zinc-950/92 backdrop-blur-md border border-zinc-700/80 shadow-2xl overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setMinimizado((v) => !v)}
        className="w-full px-3 py-2 flex items-center justify-between gap-2 bg-zinc-900/90 border-b border-zinc-800/80 text-left cursor-pointer"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Dices className="w-3.5 h-3.5 text-[#f08b21] shrink-0" />
          <span className="font-semibold text-zinc-200 truncate">
            Última: {rolagem.etiqueta}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`px-1.5 py-0.5 rounded font-mono font-bold text-[11px] ${
              rolagem.critico
                ? "bg-[#f08b21] text-zinc-950"
                : rolagem.sucessos > 0
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                  : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {girando ? "..." : `${rolagem.sucessos} suc.`}
          </span>
          {minimizado ? (
            <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          )}
        </div>
      </button>

      {!minimizado && (
        <div className="p-3 space-y-2">
          <p className="text-[11px] text-zinc-400 line-clamp-2">
            {rolagem.descricao}
          </p>

          <div className="flex flex-wrap gap-1">
            {(rolagem.dados || []).slice(0, 12).map((d, i) => (
              <DadoD10Visual
                key={`c-n-${i}`}
                valor={d}
                girando={girando}
                tamanho="sm"
              />
            ))}
            {dadosDesespero.slice(0, 6).map((d, i) => (
              <DadoD10Visual
                key={`c-d-${i}`}
                valor={d}
                desespero={true}
                girando={girando}
                tamanho="sm"
              />
            ))}
          </div>

          {!girando && (
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-800/80">
              <span className="text-zinc-300">
                Sucessos: <strong>{rolagem.sucessos}</strong>
                {rolagem.critico ? " · Crítico!" : ""}
              </span>
              {rolagem.aflicao && (
                <span className="text-red-400 font-semibold">Aflição</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
