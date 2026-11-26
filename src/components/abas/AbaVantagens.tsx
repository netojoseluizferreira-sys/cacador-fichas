"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  custoTexto,
  defeitosCatalogo,
  excedeLimiteCriacao,
  pontosCatalogoSemAlerta,
  totalPontosItens,
  validarPontosCatalogo,
  vantagensCatalogo,
} from "@/lib/regras";
import type { FichaDados } from "@/types/ficha";

interface AbaVantagensProps {
  ficha: FichaDados;
  travada: boolean;
  adminEditando: boolean;
  onChange: (atualizada: FichaDados) => void;
  onNotify: (msg: string, tipo?: "erro" | "info") => void;
}

export function AbaVantagens({
  ficha,
  travada,
  adminEditando,
  onChange,
  onNotify,
}: AbaVantagensProps) {
  const [vantIdx, setVantIdx] = useState(0);
  const [vantPontos, setVantPontos] = useState(
    vantagensCatalogo[0]?.valores?.[0] ?? vantagensCatalogo[0]?.min ?? 1
  );
  const [vantDetalhe, setVantDetalhe] = useState("");

  const [defIdx, setDefIdx] = useState(0);
  const [defPontos, setDefPontos] = useState(
    defeitosCatalogo[0]?.valores?.[0] ?? defeitosCatalogo[0]?.min ?? 1
  );
  const [defDetalhe, setDefDetalhe] = useState("");

  const vantSelecionada = vantagensCatalogo[vantIdx] ?? vantagensCatalogo[0];
  const defSelecionado = defeitosCatalogo[defIdx] ?? defeitosCatalogo[0];

  const totalVant = totalPontosItens(ficha.vantagens);
  const totalDef = totalPontosItens(ficha.defeitos);

  const vantPassaLimite =
    !adminEditando &&
    excedeLimiteCriacao(
      "vantagem",
      ficha.vantagens,
      pontosCatalogoSemAlerta(vantSelecionada, vantPontos)
    );

  const defPassaLimite =
    !adminEditando &&
    excedeLimiteCriacao(
      "defeito",
      ficha.defeitos,
      pontosCatalogoSemAlerta(defSelecionado, defPontos)
    );

  const adicionarVantagem = () => {
    if (travada) return;
    const res = validarPontosCatalogo(vantSelecionada, vantPontos);
    if (!res.ok) {
      onNotify(res.erro, "erro");
      return;
    }
    if (
      !adminEditando &&
      excedeLimiteCriacao("vantagem", ficha.vantagens, res.pontos)
    ) {
      onNotify(
        `Vantagens não podem passar de 7 pontos na criação. Atual: ${totalVant}, tentativa: +${res.pontos}.`,
        "erro"
      );
      return;
    }
    onChange({
      ...ficha,
      vantagens: [
        ...ficha.vantagens,
        {
          nome: vantSelecionada.nome,
          categoria: vantSelecionada.categoria,
          pontos: res.pontos,
          detalhe: vantDetalhe.trim(),
          resumo: vantSelecionada.resumo,
        },
      ],
    });
    setVantDetalhe("");
  };

  const adicionarDefeito = () => {
    if (travada) return;
    const res = validarPontosCatalogo(defSelecionado, defPontos);
    if (!res.ok) {
      onNotify(res.erro, "erro");
      return;
    }
    if (
      !adminEditando &&
      excedeLimiteCriacao("defeito", ficha.defeitos, res.pontos)
    ) {
      onNotify(
        `Defeitos não podem passar de 2 pontos na criação. Atual: ${totalDef}, tentativa: +${res.pontos}.`,
        "erro"
      );
      return;
    }
    onChange({
      ...ficha,
      defeitos: [
        ...ficha.defeitos,
        {
          nome: defSelecionado.nome,
          categoria: defSelecionado.categoria,
          pontos: res.pontos,
          detalhe: defDetalhe.trim(),
          resumo: defSelecionado.resumo,
        },
      ],
    });
    setDefDetalhe("");
  };

  const removerVantagem = (idx: number) => {
    if (travada) return;
    onChange({
      ...ficha,
      vantagens: ficha.vantagens.filter((_, i) => i !== idx),
    });
  };

  const removerDefeito = (idx: number) => {
    if (travada) return;
    onChange({
      ...ficha,
      defeitos: ficha.defeitos.filter((_, i) => i !== idx),
    });
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#f08b21] disabled:opacity-55 transition";

  return (
    <section className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-zinc-100">
            Vantagens e Defeitos
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Criação inicial: 7 pontos de Vantagens e 2 pontos de Defeitos.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-zinc-950/80 border border-zinc-800 px-3.5 py-2 rounded-lg">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded ${
              totalVant === 7
                ? "bg-emerald-950/70 text-emerald-300 border border-emerald-800/60"
                : "bg-zinc-900 text-zinc-300 border border-zinc-800"
            }`}
          >
            Vantagens: {totalVant}/7
          </span>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded ${
              totalDef === 2
                ? "bg-emerald-950/70 text-emerald-300 border border-emerald-800/60"
                : "bg-zinc-900 text-zinc-300 border border-zinc-800"
            }`}
          >
            Defeitos: {totalDef}/2
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna Vantagens */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-4 sm:p-5 space-y-4">
          <h3 className="font-display text-lg font-semibold uppercase tracking-wider text-[#f08b21]">
            Adicionar Vantagem
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_84px] gap-3">
            <select
              disabled={travada}
              value={vantIdx}
              onChange={(e) => {
                const novoIdx = Number(e.target.value);
                const cat = vantagensCatalogo[novoIdx];
                setVantIdx(novoIdx);
                if (cat) {
                  setVantPontos(cat.valores?.[0] ?? cat.min);
                }
              }}
              className={inputCls}
            >
              {vantagensCatalogo.map((item, idx) => (
                <option key={item.nome} value={idx}>
                  {item.nome} ({item.categoria})
                </option>
              ))}
            </select>

            <input
              type="number"
              disabled={travada}
              min={vantSelecionada.min}
              max={vantSelecionada.max}
              value={vantPontos}
              onChange={(e) => setVantPontos(Number(e.target.value || 1))}
              aria-label="Pontos da vantagem"
              className={inputCls}
            />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              disabled={travada}
              value={vantDetalhe}
              onChange={(e) => setVantDetalhe(e.target.value)}
              placeholder="Detalhe: pessoa, lugar, facção..."
              className={inputCls}
            />
            <button
              type="button"
              disabled={
                travada || (!adminEditando && (vantPassaLimite || totalVant >= 7))
              }
              onClick={adicionarVantagem}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 text-xs text-zinc-400 leading-relaxed">
            <strong className="text-zinc-200">{vantSelecionada.nome}</strong> (
            {vantSelecionada.categoria}) · Custo: {custoTexto(vantSelecionada)}{" "}
            ponto(s). {vantSelecionada.resumo}
          </div>

          <div className="space-y-2 pt-1">
            {ficha.vantagens.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">
                Nenhuma vantagem selecionada.
              </p>
            ) : (
              ficha.vantagens.map((item, idx) => (
                <div
                  key={`${item.nome}-${idx}`}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800"
                >
                  <div className="min-w-0">
                    <strong className="text-sm text-zinc-100">
                      {item.nome} ({item.pontos})
                    </strong>
                    <span className="block text-xs text-zinc-400">
                      {item.categoria}
                      {item.detalhe ? ` · ${item.detalhe}` : ""}
                    </span>
                    {item.resumo && (
                      <small className="block text-xs text-zinc-500 mt-1">
                        {item.resumo}
                      </small>
                    )}
                  </div>
                  {!travada && (
                    <button
                      type="button"
                      onClick={() => removerVantagem(idx)}
                      className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition cursor-pointer"
                      aria-label="Remover vantagem"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Coluna Defeitos */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-4 sm:p-5 space-y-4">
          <h3 className="font-display text-lg font-semibold uppercase tracking-wider text-zinc-200">
            Adicionar Defeito
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_84px] gap-3">
            <select
              disabled={travada}
              value={defIdx}
              onChange={(e) => {
                const novoIdx = Number(e.target.value);
                const cat = defeitosCatalogo[novoIdx];
                setDefIdx(novoIdx);
                if (cat) {
                  setDefPontos(cat.valores?.[0] ?? cat.min);
                }
              }}
              className={inputCls}
            >
              {defeitosCatalogo.map((item, idx) => (
                <option key={item.nome} value={idx}>
                  {item.nome} ({item.categoria})
                </option>
              ))}
            </select>

            <input
              type="number"
              disabled={travada}
              min={defSelecionado.min}
              max={defSelecionado.max}
              value={defPontos}
              onChange={(e) => setDefPontos(Number(e.target.value || 1))}
              aria-label="Pontos do defeito"
              className={inputCls}
            />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              disabled={travada}
              value={defDetalhe}
              onChange={(e) => setDefDetalhe(e.target.value)}
              placeholder="Detalhe: inimigo, segredo, dívida..."
              className={inputCls}
            />
            <button
              type="button"
              disabled={
                travada || (!adminEditando && (defPassaLimite || totalDef >= 2))
              }
              onClick={adicionarDefeito}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 text-xs text-zinc-400 leading-relaxed">
            <strong className="text-zinc-200">{defSelecionado.nome}</strong> (
            {defSelecionado.categoria}) · Custo: {custoTexto(defSelecionado)}{" "}
            ponto(s). {defSelecionado.resumo}
          </div>

          <div className="space-y-2 pt-1">
            {ficha.defeitos.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">
                Nenhum defeito selecionado.
              </p>
            ) : (
              ficha.defeitos.map((item, idx) => (
                <div
                  key={`${item.nome}-${idx}`}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800"
                >
                  <div className="min-w-0">
                    <strong className="text-sm text-zinc-100">
                      {item.nome} ({item.pontos})
                    </strong>
                    <span className="block text-xs text-zinc-400">
                      {item.categoria}
                      {item.detalhe ? ` · ${item.detalhe}` : ""}
                    </span>
                    {item.resumo && (
                      <small className="block text-xs text-zinc-500 mt-1">
                        {item.resumo}
                      </small>
                    )}
                  </div>
                  {!travada && (
                    <button
                      type="button"
                      onClick={() => removerDefeito(idx)}
                      className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition cursor-pointer"
                      aria-label="Remover defeito"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
