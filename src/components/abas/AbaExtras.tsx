"use client";

import type { FichaDados } from "@/types/ficha";

interface AbaExtrasProps {
  ficha: FichaDados;
  onChange: (atualizada: FichaDados) => void;
}

export function AbaExtras({ ficha, onChange }: AbaExtrasProps) {
  const inputCls =
    "w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#f08b21] transition";
  const labelCls =
    "block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5";

  return (
    <section className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-zinc-100">
          Equipamento, Caçada e Relações
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Campos narrativos e de apoio livres para edição durante toda a
          crônica.
        </p>
      </div>

      <div>
        <label className={labelCls}>Mapa de Relacionamentos</label>
        <textarea
          rows={3}
          value={ficha.mapaRelacionamentos}
          onChange={(e) =>
            onChange({ ...ficha, mapaRelacionamentos: e.target.value })
          }
          placeholder="Célula, pilares, aliados, contatos, inimigos, presas, orgs e tensões."
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Equipamentos</label>
          <textarea
            rows={4}
            value={ficha.equipamentos.equipamentos}
            onChange={(e) =>
              onChange({
                ...ficha,
                equipamentos: {
                  ...ficha.equipamentos,
                  equipamentos: e.target.value,
                },
              })
            }
            placeholder="Lanterna, gravador, carro, notebook, dossiês..."
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Armas</label>
          <textarea
            rows={4}
            value={ficha.equipamentos.armas}
            onChange={(e) =>
              onChange({
                ...ficha,
                equipamentos: {
                  ...ficha.equipamentos,
                  armas: e.target.value,
                },
              })
            }
            placeholder="Revólver, faca, bastão, espingarda, taser..."
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Presa</label>
          <input
            type="text"
            value={ficha.cacada.presa}
            onChange={(e) =>
              onChange({
                ...ficha,
                cacada: { ...ficha.cacada, presa: e.target.value },
              })
            }
            placeholder="Alvo sobrenatural ou ameaça atual"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Local da Caçada</label>
          <input
            type="text"
            value={ficha.cacada.local}
            onChange={(e) =>
              onChange({
                ...ficha,
                cacada: { ...ficha.cacada, local: e.target.value },
              })
            }
            placeholder="Hotel abandonado, docas, hospital..."
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Pistas e Descobertas</label>
          <textarea
            rows={4}
            value={ficha.cacada.pistas}
            onChange={(e) =>
              onChange({
                ...ficha,
                cacada: { ...ficha.cacada, pistas: e.target.value },
              })
            }
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Consequências</label>
          <textarea
            rows={4}
            value={ficha.cacada.consequencias}
            onChange={(e) =>
              onChange({
                ...ficha,
                cacada: { ...ficha.cacada, consequencias: e.target.value },
              })
            }
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Anotações</label>
        <textarea
          rows={4}
          value={ficha.anotacoes}
          onChange={(e) => onChange({ ...ficha, anotacoes: e.target.value })}
          className={inputCls}
        />
      </div>
    </section>
  );
}
