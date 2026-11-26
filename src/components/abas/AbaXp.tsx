"use client";

import { useState } from "react";
import { Award, TrendingUp } from "lucide-react";
import {
  aplicarGastoXp,
  calcularCustoXp,
  registrarGanhoXp,
  SITUACOES_GANHO_XP,
  TIPOS_GASTO_XP,
  TODAS_HABILIDADES,
  TODOS_ATRIBUTOS,
  trunfosCatalogo,
  vantagensCatalogo,
  xpDisponivel,
  type TipoGastoXp,
} from "@/lib/regras";
import type { FichaDados } from "@/types/ficha";

interface AbaXpProps {
  ficha: FichaDados;
  onChangeAndPersist: (atualizada: FichaDados) => void;
  onNotify: (msg: string, tipo?: "erro" | "info" | "sucesso") => void;
}

export function AbaXp({ ficha, onChangeAndPersist, onNotify }: AbaXpProps) {
  const [situacaoId, setSituacaoId] = useState<string>(
    SITUACOES_GANHO_XP[0].id
  );
  const [qtdGanhoCustom, setQtdGanhoCustom] = useState(1);
  const [obsGanho, setObsGanho] = useState("");

  const [tipoGasto, setTipoGasto] = useState<TipoGastoXp>("atributo");
  const [alvoGasto, setAlvoGasto] = useState<string>(TODOS_ATRIBUTOS[0][0]);
  const [detalheGasto, setDetalheGasto] = useState("");
  const [pontosGasto, setPontosGasto] = useState(1);

  const disponivel = xpDisponivel(ficha);
  const custoCalculado = calcularCustoXp(
    ficha,
    tipoGasto,
    alvoGasto,
    pontosGasto
  );

  const opcoesAlvo = (() => {
    if (tipoGasto === "atributo") return TODOS_ATRIBUTOS;
    if (tipoGasto === "habilidade") return TODAS_HABILIDADES;
    if (tipoGasto === "vantagem")
      return vantagensCatalogo.map(
        (item, idx) => [String(idx), item.nome] as const
      );
    if (tipoGasto === "trunfo")
      return trunfosCatalogo.map(
        (item, idx) => [String(idx), item.nome] as const
      );
    return [["novo", "Novo registro"]] as const;
  })();

  const handleMudarTipoGasto = (novoTipo: TipoGastoXp) => {
    setTipoGasto(novoTipo);
    if (novoTipo === "atributo") setAlvoGasto(TODOS_ATRIBUTOS[0][0]);
    else if (novoTipo === "habilidade") setAlvoGasto(TODAS_HABILIDADES[0][0]);
    else if (novoTipo === "vantagem" || novoTipo === "trunfo")
      setAlvoGasto("0");
    else setAlvoGasto("novo");
    if (novoTipo !== "vantagem") setPontosGasto(1);
  };

  const handleGanharXp = () => {
    const res = registrarGanhoXp(ficha, situacaoId, qtdGanhoCustom, obsGanho);
    if (!res.ok) {
      onNotify(res.erro, "erro");
      return;
    }
    setObsGanho("");
    onChangeAndPersist(res.ficha);
    onNotify("XP registrado com sucesso.", "sucesso");
  };

  const handleGastarXp = () => {
    const res = aplicarGastoXp(ficha, {
      tipo: tipoGasto,
      alvo: alvoGasto,
      detalhe: detalheGasto,
      pontos: pontosGasto,
    });
    if (!res.ok) {
      onNotify(res.erro, "erro");
      return;
    }
    setDetalheGasto("");
    onChangeAndPersist(res.ficha);
    onNotify("Avanço de XP aplicado à ficha.", "sucesso");
  };

  const situacaoAtual = SITUACOES_GANHO_XP.find((s) => s.id === situacaoId);
  const inputCls =
    "w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#f08b21] disabled:opacity-55 transition";

  return (
    <section className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-zinc-100">
            Experiência (XP)
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Registre ganhos de sessão e aplique avanços seguindo os custos
            oficiais da 5ª Edição.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-zinc-950/80 border border-zinc-800 px-3.5 py-2 rounded-lg text-xs font-semibold">
          <span className="px-2.5 py-1 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
            Total: {ficha.estados.xpTotal}
          </span>
          <span className="px-2.5 py-1 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
            Gasto: {ficha.estados.xpGasto}
          </span>
          <span className="px-2.5 py-1 rounded bg-[#f08b21]/15 text-[#f08b21] border border-[#f08b21]/40">
            Disponível: {disponivel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ganhar XP */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-4 sm:p-5 space-y-4">
          <h3 className="font-display text-lg font-semibold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
            <Award className="w-4 h-4 text-[#f08b21]" />
            Ganhar XP
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px] gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Situação
              </label>
              <select
                value={situacaoId}
                onChange={(e) => setSituacaoId(e.target.value)}
                className={inputCls}
              >
                {SITUACOES_GANHO_XP.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Quantidade
              </label>
              <input
                type="number"
                min={1}
                disabled={situacaoAtual?.pontos !== null}
                value={
                  situacaoAtual?.pontos !== null
                    ? (situacaoAtual?.pontos ?? 1)
                    : qtdGanhoCustom
                }
                onChange={(e) =>
                  setQtdGanhoCustom(Math.max(1, Number(e.target.value || 1)))
                }
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Observação
            </label>
            <input
              type="text"
              value={obsGanho}
              onChange={(e) => setObsGanho(e.target.value)}
              placeholder="Ex: Sessão 03, confronto no necrotério"
              className={inputCls}
            />
          </div>

          <button
            type="button"
            onClick={handleGanharXp}
            className="px-4 py-2.5 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Registrar XP
          </button>
        </div>

        {/* Gastar XP */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-4 sm:p-5 space-y-4">
          <h3 className="font-display text-lg font-semibold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#f08b21]" />
            Gastar XP
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Avanço
              </label>
              <select
                value={tipoGasto}
                onChange={(e) =>
                  handleMudarTipoGasto(e.target.value as TipoGastoXp)
                }
                className={inputCls}
              >
                {TIPOS_GASTO_XP.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Alvo
              </label>
              <select
                value={alvoGasto}
                onChange={(e) => setAlvoGasto(e.target.value)}
                className={inputCls}
              >
                {opcoesAlvo.map(([id, nome]) => (
                  <option key={id} value={id}>
                    {nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px] gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Nome ou detalhe
              </label>
              <input
                type="text"
                value={detalheGasto}
                onChange={(e) => setDetalheGasto(e.target.value)}
                placeholder="Obrigatório p/ especializações e distinções"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Pontos
              </label>
              <input
                type="number"
                min={1}
                max={5}
                disabled={tipoGasto !== "vantagem"}
                value={tipoGasto === "vantagem" ? pontosGasto : 1}
                onChange={(e) =>
                  setPontosGasto(Math.max(1, Number(e.target.value || 1)))
                }
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
              Custo calculado
            </span>
            <strong className="font-display text-lg text-[#f08b21]">
              {custoCalculado} XP
            </strong>
          </div>

          <button
            type="button"
            onClick={handleGastarXp}
            className="px-4 py-2.5 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Aplicar avanço
          </button>
        </div>
      </div>

      {/* Histórico */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-4 sm:p-5 space-y-3">
        <h3 className="font-display text-lg font-semibold uppercase tracking-wider text-zinc-100">
          Histórico de Experiência
        </h3>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {ficha.xpLog.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">
              Nenhum registro de XP ainda.
            </p>
          ) : (
            ficha.xpLog
              .slice()
              .reverse()
              .map((linha, idx) => (
                <div
                  key={idx}
                  className="px-3.5 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs text-zinc-300"
                >
                  {linha}
                </div>
              ))
          )}
        </div>
      </div>
    </section>
  );
}
