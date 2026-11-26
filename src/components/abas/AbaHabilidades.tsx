"use client";

import { CaracteristicaRow } from "@/components/CaracteristicaRow";
import {
  contarValoresHabilidades,
  definirValorHabilidade,
  DISTRIBUICOES_HABILIDADES,
  HABILIDADES_GRUPOS,
  obterValorHabilidade,
} from "@/lib/regras";
import type {
  DistribuicaoHabilidadesKey,
  FichaDados,
  HabilidadeId,
} from "@/types/ficha";

interface AbaHabilidadesProps {
  ficha: FichaDados;
  travada: boolean;
  onChange: (atualizada: FichaDados) => void;
}

export function AbaHabilidades({
  ficha,
  travada,
  onChange,
}: AbaHabilidadesProps) {
  const distKey: DistribuicaoHabilidadesKey =
    ficha.distribuicaoHabilidades ?? "pau";
  const dist = DISTRIBUICOES_HABILIDADES[distKey].niveis;
  const contagem = contarValoresHabilidades(ficha);

  const alterarHabilidade = (id: HabilidadeId, valor: number) => {
    onChange(definirValorHabilidade(ficha, id, valor));
  };

  const alterarEspecializacao = (
    chave: keyof FichaDados["especializacoes"],
    valor: string
  ) => {
    onChange({
      ...ficha,
      especializacoes: {
        ...ficha.especializacoes,
        [chave]: valor,
      },
    });
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#f08b21] disabled:opacity-55 disabled:cursor-not-allowed transition";

  return (
    <section className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-zinc-100">
            Habilidades
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Escolha a distribuição inicial e aloque os pontos nas Habilidades.
          </p>
        </div>

        <div className="w-full md:w-80">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            Distribuição
          </label>
          <select
            disabled={travada}
            value={distKey}
            onChange={(e) =>
              onChange({
                ...ficha,
                distribuicaoHabilidades: e.target
                  .value as DistribuicaoHabilidadesKey,
              })
            }
            className={inputCls}
          >
            {Object.entries(DISTRIBUICOES_HABILIDADES).map(([key, item]) => (
              <option key={key} value={key}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-zinc-950/80 border border-zinc-800 px-3.5 py-2.5 rounded-lg">
        {([4, 3, 2, 1] as const).map((nivel) => {
          const atual = contagem[nivel] || 0;
          const esperado = dist[nivel];
          const ok = atual === esperado;
          return (
            <span
              key={nivel}
              className={`text-xs font-semibold px-2.5 py-1 rounded ${
                ok
                  ? "bg-emerald-950/70 text-emerald-300 border border-emerald-800/60"
                  : "bg-zinc-900 text-zinc-400 border border-zinc-800"
              }`}
            >
              Nível {nivel}: {atual}/{esperado}
            </span>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {HABILIDADES_GRUPOS.map((grupo) => (
          <div
            key={grupo.chave}
            className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-4 space-y-2.5"
          >
            <h3 className="font-display text-lg font-semibold uppercase tracking-wider text-[#f08b21] pb-2 border-b border-zinc-800">
              {grupo.grupo}
            </h3>
            <div className="space-y-2">
              {grupo.itens.map(([id, nome]) => (
                <CaracteristicaRow
                  key={id}
                  nome={nome}
                  valor={obterValorHabilidade(ficha, id)}
                  min={0}
                  max={5}
                  disabled={travada}
                  onChange={(v) => alterarHabilidade(id, v)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-4 sm:p-5 space-y-4">
        <h3 className="font-display text-lg font-semibold uppercase tracking-wider text-zinc-200">
          Especializações
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Especialização gratuita
            </label>
            <input
              type="text"
              disabled={travada}
              value={ficha.especializacoes.livre}
              onChange={(e) => alterarEspecializacao("livre", e.target.value)}
              placeholder="Ex: Armas de Fogo - Saque rápido"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Ciência
            </label>
            <input
              type="text"
              disabled={travada}
              value={ficha.especializacoes.ciencia}
              onChange={(e) => alterarEspecializacao("ciencia", e.target.value)}
              placeholder="Obrigatória se Ciência tiver pontos"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Erudição
            </label>
            <input
              type="text"
              disabled={travada}
              value={ficha.especializacoes.academicos}
              onChange={(e) =>
                alterarEspecializacao("academicos", e.target.value)
              }
              placeholder="Obrigatória se Erudição tiver pontos"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Ofícios
            </label>
            <input
              type="text"
              disabled={travada}
              value={ficha.especializacoes.oficios}
              onChange={(e) => alterarEspecializacao("oficios", e.target.value)}
              placeholder="Obrigatória se Ofícios tiver pontos"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Performance
            </label>
            <input
              type="text"
              disabled={travada}
              value={ficha.especializacoes.performance}
              onChange={(e) =>
                alterarEspecializacao("performance", e.target.value)
              }
              placeholder="Obrigatória se Performance tiver pontos"
              className={inputCls}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
