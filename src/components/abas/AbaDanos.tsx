"use client";

import { useState } from "react";
import { HeartPulse, ShieldPlus, Sparkles } from "lucide-react";
import {
  alternarCaixaDano,
  aplicarDanoTrilha,
  converterAgravadoEmSuperficial,
  maiorRecuperacaoVontade,
  nomeTrilha,
  normalizarTrilha,
  recuperarComecoSessao,
  resumoDanoTexto,
  totalCaixasVitalidade,
  totalCaixasVontade,
} from "@/lib/regras";
import type { FichaDados, TipoDano, TrilhaDanoKey } from "@/types/ficha";

interface AbaDanosProps {
  ficha: FichaDados;
  onChangeAndPersist: (atualizada: FichaDados) => void;
  onNotify: (msg: string, tipo?: "erro" | "info" | "sucesso") => void;
}

export function AbaDanos({
  ficha,
  onChangeAndPersist,
  onNotify,
}: AbaDanosProps) {
  const [qtdVitalidade, setQtdVitalidade] = useState(1);
  const [tipoVitalidade, setTipoVitalidade] = useState<TipoDano>("superficial");
  const [qtdVontade, setQtdVontade] = useState(1);
  const [tipoVontade, setTipoVontade] = useState<TipoDano>("superficial");

  const maxVit = totalCaixasVitalidade(ficha);
  const maxVon = totalCaixasVontade(ficha);
  const caixasVit = normalizarTrilha(ficha.dano?.vitalidade, maxVit);
  const caixasVon = normalizarTrilha(ficha.dano?.vontade, maxVon);

  const handleToggleCaixa = (trilha: TrilhaDanoKey, index: number) => {
    const total = trilha === "vitalidade" ? maxVit : maxVon;
    const res = alternarCaixaDano(ficha.dano[trilha], total, index);
    if (!res.ok) {
      onNotify(res.erro, "erro");
      return;
    }
    onChangeAndPersist({
      ...ficha,
      dano: {
        ...ficha.dano,
        [trilha]: res.caixas,
      },
    });
  };

  const handleAplicarDano = (trilha: TrilhaDanoKey) => {
    if (!ficha.estado.finalizada) {
      onNotify("Finalize ou importe uma ficha antes de registrar dano.", "erro");
      return;
    }
    const total = trilha === "vitalidade" ? maxVit : maxVon;
    const qtd = trilha === "vitalidade" ? qtdVitalidade : qtdVontade;
    const tipo = trilha === "vitalidade" ? tipoVitalidade : tipoVontade;

    const res = aplicarDanoTrilha(ficha.dano[trilha], total, qtd, tipo);
    if (res.totalmenteAgravada) {
      onNotify(`${nomeTrilha(trilha)} já está totalmente agravada.`, "erro");
      return;
    }

    onChangeAndPersist({
      ...ficha,
      dano: {
        ...ficha.dano,
        [trilha]: res.caixas,
      },
    });
  };

  const handleComecarSessao = () => {
    if (!ficha.estado.finalizada) {
      onNotify("Finalize ou importe uma ficha antes de recuperar dano.", "erro");
      return;
    }
    const res = recuperarComecoSessao(ficha);
    onChangeAndPersist(res.ficha);
    onNotify(
      `Começo de sessão: ${res.vitalidadeRecuperada} dano(s) superficial(is) de Vitalidade e ${res.vontadeRecuperada} de Força de Vontade recuperado(s).`,
      "sucesso"
    );
  };

  const handleConverterAgravado = (trilha: TrilhaDanoKey) => {
    if (!ficha.estado.finalizada) {
      onNotify("Finalize ou importe uma ficha antes de curar dano.", "erro");
      return;
    }
    const total = trilha === "vitalidade" ? maxVit : maxVon;
    const res = converterAgravadoEmSuperficial(
      ficha.dano[trilha],
      total,
      trilha
    );
    if (!res.ok) {
      onNotify(res.erro, "erro");
      return;
    }
    onChangeAndPersist({
      ...ficha,
      dano: {
        ...ficha.dano,
        [trilha]: res.caixas,
      },
    });
    onNotify(
      `1 dano agravado de ${nomeTrilha(trilha)} convertido em superficial.`,
      "sucesso"
    );
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-[#f08b21] transition";

  return (
    <section className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-zinc-100">
          Danos e Recuperação
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Controle as caixinhas da ficha finalizada:{" "}
          <code className="text-amber-300">/</code> para dano superficial e{" "}
          <code className="text-red-400">X</code> para dano agravado.
        </p>
      </div>

      {/* Começo de sessão */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
        <div>
          <h3 className="font-display text-lg font-semibold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#f08b21]" />
            Começo de Sessão
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Recupera até{" "}
            <strong className="text-zinc-200">
              {ficha.atributos.fisicos.vigor}
            </strong>{" "}
            superficial de Vitalidade (Vigor) e até{" "}
            <strong className="text-zinc-200">
              {maiorRecuperacaoVontade(ficha)}
            </strong>{" "}
            superficial de Força de Vontade.
          </p>
        </div>

        <button
          type="button"
          onClick={handleComecarSessao}
          className="px-4 py-2.5 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider transition shrink-0 cursor-pointer"
        >
          Começar sessão
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vitalidade */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-[#f08b21]" />
              Caixinhas de Vitalidade ({maxVit})
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {caixasVit.map((marcador, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleToggleCaixa("vitalidade", idx)}
                aria-label={`Vitalidade caixa ${idx + 1}`}
                className={`w-11 h-11 rounded-md border-2 font-mono text-lg font-bold flex items-center justify-center transition cursor-pointer ${
                  marcador === "X"
                    ? "bg-red-950/60 border-red-500/80 text-red-200"
                    : marcador === "/"
                      ? "bg-amber-950/50 border-amber-500/70 text-amber-200"
                      : "bg-zinc-950 border-zinc-700 text-zinc-500 hover:border-zinc-500"
                }`}
              >
                {marcador}
              </button>
            ))}
          </div>

          <p className="text-xs text-zinc-400 font-medium">
            {resumoDanoTexto("vitalidade", caixasVit, maxVit)}
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Dano recebido
              </label>
              <input
                type="number"
                min={1}
                value={qtdVitalidade}
                onChange={(e) =>
                  setQtdVitalidade(Math.max(1, Number(e.target.value || 1)))
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Tipo
              </label>
              <select
                value={tipoVitalidade}
                onChange={(e) => setTipoVitalidade(e.target.value as TipoDano)}
                className={inputCls}
              >
                <option value="superficial">Superficial (÷2)</option>
                <option value="agravado">Agravado</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleAplicarDano("vitalidade")}
              className="px-4 py-2 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Aplicar dano
            </button>
            <button
              type="button"
              onClick={() => handleConverterAgravado("vitalidade")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-medium transition cursor-pointer"
            >
              <ShieldPlus className="w-3.5 h-3.5 text-emerald-400" />
              Medicina: agravado vira superficial
            </button>
          </div>
          <p className="text-[11px] text-zinc-500">
            Clique após tratamento com Medicina para converter 1 dano agravado
            de Vitalidade em superficial.
          </p>
        </div>

        {/* Força de Vontade */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold uppercase tracking-wider text-zinc-100">
              Caixinhas de Força de Vontade ({maxVon})
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {caixasVon.map((marcador, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleToggleCaixa("vontade", idx)}
                aria-label={`Força de Vontade caixa ${idx + 1}`}
                className={`w-11 h-11 rounded-md border-2 font-mono text-lg font-bold flex items-center justify-center transition cursor-pointer ${
                  marcador === "X"
                    ? "bg-red-950/60 border-red-500/80 text-red-200"
                    : marcador === "/"
                      ? "bg-amber-950/50 border-amber-500/70 text-amber-200"
                      : "bg-zinc-950 border-zinc-700 text-zinc-500 hover:border-zinc-500"
                }`}
              >
                {marcador}
              </button>
            ))}
          </div>

          <p className="text-xs text-zinc-400 font-medium">
            {resumoDanoTexto("vontade", caixasVon, maxVon)}
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Dano recebido
              </label>
              <input
                type="number"
                min={1}
                value={qtdVontade}
                onChange={(e) =>
                  setQtdVontade(Math.max(1, Number(e.target.value || 1)))
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Tipo
              </label>
              <select
                value={tipoVontade}
                onChange={(e) => setTipoVontade(e.target.value as TipoDano)}
                className={inputCls}
              >
                <option value="superficial">Superficial (÷2)</option>
                <option value="agravado">Agravado</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleAplicarDano("vontade")}
              className="px-4 py-2 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Aplicar dano
            </button>
            <button
              type="button"
              onClick={() => handleConverterAgravado("vontade")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-medium transition cursor-pointer"
            >
              <ShieldPlus className="w-3.5 h-3.5 text-emerald-400" />
              Recuperar agravado de Vontade
            </button>
          </div>
          <p className="text-[11px] text-zinc-500">
            Use quando Ambição, Ímpeto, Trunfos ou circunstâncias narrativas
            permitirem recuperar dano agravado de Força de Vontade.
          </p>
        </div>
      </div>
    </section>
  );
}
