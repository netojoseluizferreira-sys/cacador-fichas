"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { distincoesPorTrunfo, trunfosCatalogo } from "@/lib/regras";
import type { FichaDados } from "@/types/ficha";

interface AbaTrunfosProps {
  ficha: FichaDados;
  travada: boolean;
  adminEditando: boolean;
  onChange: (atualizada: FichaDados) => void;
  onNotify: (msg: string, tipo?: "erro" | "info") => void;
}

export function AbaTrunfos({
  ficha,
  travada,
  adminEditando,
  onChange,
  onNotify,
}: AbaTrunfosProps) {
  const [trunfoIdx, setTrunfoIdx] = useState(0);
  const [trunfoDetalhe, setTrunfoDetalhe] = useState("");
  const [distincaoIdx, setDistincaoIdx] = useState(0);
  const [distincaoDetalhe, setDistincaoDetalhe] = useState("");

  const trunfoSelecionado = trunfosCatalogo[trunfoIdx] ?? trunfosCatalogo[0];
  const trunfoBaseDistincao =
    ficha.trunfos.length === 1
      ? ficha.trunfos[0].nome
      : trunfoSelecionado.nome;

  const opcoesDistincao = distincoesPorTrunfo[trunfoBaseDistincao] ?? [];
  const distincaoSelecionada =
    opcoesDistincao[distincaoIdx] ?? opcoesDistincao[0];

  const trunfoValido =
    (ficha.trunfos.length === 2 && ficha.distincoes.length === 0) ||
    (ficha.trunfos.length === 1 && ficha.distincoes.length === 2);

  const distincaoDesabilitada =
    travada ||
    (!adminEditando &&
      (ficha.trunfos.length !== 1 || ficha.distincoes.length >= 2));

  const adicionarTrunfo = () => {
    if (travada) return;
    if (!adminEditando && ficha.trunfos.length >= 2) {
      onNotify(
        "Você já escolheu dois Trunfos. Remova um deles para trocar.",
        "erro"
      );
      return;
    }
    if (!adminEditando && ficha.distincoes.length > 0) {
      onNotify(
        "Você escolheu o caminho de um Trunfo com Distinções. Remova as Distinções para pegar um segundo Trunfo.",
        "erro"
      );
      return;
    }

    onChange({
      ...ficha,
      trunfos: [
        ...ficha.trunfos,
        {
          nome: trunfoSelecionado.nome,
          categoria: trunfoSelecionado.categoria,
          detalhe: trunfoDetalhe.trim(),
          resumo: trunfoSelecionado.resumo,
        },
      ],
    });
    setTrunfoDetalhe("");
    setDistincaoIdx(0);
  };

  const adicionarDistincao = () => {
    if (travada) return;
    if (ficha.trunfos.length < 1) {
      onNotify("Adicione um Trunfo antes de adicionar Distinções.", "erro");
      return;
    }
    if (!adminEditando && ficha.trunfos.length !== 1) {
      onNotify(
        "Distinções só ficam disponíveis quando a ficha tem exatamente um Trunfo.",
        "erro"
      );
      return;
    }
    if (!adminEditando && ficha.distincoes.length >= 2) {
      onNotify("A criação permite no máximo duas Distinções.", "erro");
      return;
    }
    const listaDoTrunfo = distincoesPorTrunfo[ficha.trunfos[0].nome] ?? [];
    const escolhida = listaDoTrunfo[distincaoIdx] ?? listaDoTrunfo[0];
    if (!escolhida) {
      onNotify("Escolha uma Distinção válida para o Trunfo selecionado.", "erro");
      return;
    }

    onChange({
      ...ficha,
      distincoes: [
        ...ficha.distincoes,
        {
          nome: escolhida.nome,
          categoria: "Distinção",
          trunfo: ficha.trunfos[0].nome,
          detalhe: distincaoDetalhe.trim(),
          resumo: escolhida.resumo,
        },
      ],
    });
    setDistincaoDetalhe("");
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#f08b21] disabled:opacity-55 transition";

  return (
    <section className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-zinc-100">
            Trunfos e Distinções
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Escolha dois Trunfos, ou um Trunfo e duas Distinções.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-zinc-950/80 border border-zinc-800 px-3.5 py-2 rounded-lg">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded ${
              trunfoValido
                ? "bg-emerald-950/70 text-emerald-300 border border-emerald-800/60"
                : "bg-zinc-900 text-zinc-300 border border-zinc-800"
            }`}
          >
            Trunfos: {ficha.trunfos.length} · Distinções:{" "}
            {ficha.distincoes.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trunfos */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-4 sm:p-5 space-y-4">
          <h3 className="font-display text-lg font-semibold uppercase tracking-wider text-[#f08b21]">
            Trunfos
          </h3>

          <select
            disabled={travada}
            value={trunfoIdx}
            onChange={(e) => {
              setTrunfoIdx(Number(e.target.value));
              setDistincaoIdx(0);
            }}
            className={inputCls}
          >
            {trunfosCatalogo.map((item, idx) => (
              <option key={item.nome} value={idx}>
                {item.nome} ({item.categoria})
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              type="text"
              disabled={travada}
              value={trunfoDetalhe}
              onChange={(e) => setTrunfoDetalhe(e.target.value)}
              placeholder="Forma na ficção, ferramenta ou origem"
              className={inputCls}
            />
            <button
              type="button"
              disabled={
                travada ||
                (!adminEditando &&
                  (ficha.trunfos.length >= 2 || ficha.distincoes.length > 0))
              }
              onClick={adicionarTrunfo}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 text-xs text-zinc-400 leading-relaxed">
            <strong className="text-zinc-200">{trunfoSelecionado.nome}</strong>{" "}
            ({trunfoSelecionado.categoria}) · {trunfoSelecionado.resumo}
          </div>

          <div className="space-y-2 pt-1">
            {ficha.trunfos.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">
                Nenhum trunfo selecionado.
              </p>
            ) : (
              ficha.trunfos.map((item, idx) => (
                <div
                  key={`${item.nome}-${idx}`}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800"
                >
                  <div className="min-w-0">
                    <strong className="text-sm text-zinc-100">{item.nome}</strong>
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
                      onClick={() =>
                        onChange({
                          ...ficha,
                          trunfos: ficha.trunfos.filter((_, i) => i !== idx),
                        })
                      }
                      className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition cursor-pointer"
                      aria-label="Remover trunfo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Distinções */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-4 sm:p-5 space-y-4">
          <h3 className="font-display text-lg font-semibold uppercase tracking-wider text-zinc-200">
            Distinções
          </h3>

          <select
            disabled={distincaoDesabilitada}
            value={distincaoIdx}
            onChange={(e) => setDistincaoIdx(Number(e.target.value))}
            className={inputCls}
          >
            {opcoesDistincao.map((item, idx) => (
              <option key={item.nome} value={idx}>
                {item.nome}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              type="text"
              disabled={distincaoDesabilitada}
              value={distincaoDetalhe}
              onChange={(e) => setDistincaoDetalhe(e.target.value)}
              placeholder="Detalhe, criatura, habilidade ou forma específica"
              className={inputCls}
            />
            <button
              type="button"
              disabled={distincaoDesabilitada}
              onClick={adicionarDistincao}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 text-xs text-zinc-400 leading-relaxed">
            {ficha.trunfos.length >= 2 && !adminEditando ? (
              "Você escolheu dois Trunfos; Distinções ficam travadas neste caminho de criação."
            ) : distincaoSelecionada ? (
              <>
                <strong className="text-zinc-200">
                  {distincaoSelecionada.nome}
                </strong>{" "}
                ({trunfoBaseDistincao}) · {distincaoSelecionada.resumo}
              </>
            ) : (
              "Escolha um Trunfo para ver suas Distinções."
            )}
          </div>

          <div className="space-y-2 pt-1">
            {ficha.distincoes.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">
                Nenhuma distinção selecionada.
              </p>
            ) : (
              ficha.distincoes.map((item, idx) => (
                <div
                  key={`${item.nome}-${idx}`}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800"
                >
                  <div className="min-w-0">
                    <strong className="text-sm text-zinc-100">{item.nome}</strong>
                    <span className="block text-xs text-zinc-400">
                      {item.categoria}
                      {item.trunfo ? ` · ${item.trunfo}` : ""}
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
                      onClick={() =>
                        onChange({
                          ...ficha,
                          distincoes: ficha.distincoes.filter(
                            (_, i) => i !== idx
                          ),
                        })
                      }
                      className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition cursor-pointer"
                      aria-label="Remover distinção"
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
