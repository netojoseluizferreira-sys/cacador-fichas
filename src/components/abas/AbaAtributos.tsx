"use client";

import { CaracteristicaRow } from "@/components/CaracteristicaRow";
import {
  ATRIBUTOS_GRUPOS,
  contarValoresAtributos,
  definirValorAtributo,
  obterValorAtributo,
  sincronizarTrilhasDano,
} from "@/lib/regras";
import type { AtributoId, FichaDados } from "@/types/ficha";

interface AbaAtributosProps {
  ficha: FichaDados;
  travada: boolean;
  onChange: (atualizada: FichaDados) => void;
}

export function AbaAtributos({
  ficha,
  travada,
  onChange,
}: AbaAtributosProps) {
  const contagem = contarValoresAtributos(ficha);
  const metas: Array<[number, number]> = [
    [4, 1],
    [3, 3],
    [2, 4],
    [1, 1],
  ];

  const alterarAtributo = (id: AtributoId, valor: number) => {
    const comAttr = definirValorAtributo(ficha, id, valor);
    onChange(sincronizarTrilhasDano(comAttr));
  };

  return (
    <section className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-zinc-100">
            Atributos
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Distribuição inicial: um nível 4, três 3, quatro 2 e um 1.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-zinc-950/80 border border-zinc-800 px-3.5 py-2 rounded-lg">
          {metas.map(([nivel, esperado]) => {
            const atual = contagem[nivel] || 0;
            const ok = atual === esperado;
            return (
              <span
                key={nivel}
                className={`text-xs font-semibold px-2 py-1 rounded ${
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {ATRIBUTOS_GRUPOS.map((grupo) => (
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
                  valor={obterValorAtributo(ficha, id)}
                  min={1}
                  max={5}
                  disabled={travada}
                  onChange={(v) => alterarAtributo(id, v)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
