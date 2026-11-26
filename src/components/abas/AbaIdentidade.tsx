"use client";

import { CREDOS, IMPETOS } from "@/lib/regras";
import type { FichaDados } from "@/types/ficha";

interface AbaIdentidadeProps {
  ficha: FichaDados;
  travada: boolean;
  onChange: (atualizada: FichaDados) => void;
}

export function AbaIdentidade({
  ficha,
  travada,
  onChange,
}: AbaIdentidadeProps) {
  const atualizarIdentidade = (
    campo: keyof FichaDados["identidade"],
    valor: string
  ) => {
    onChange({
      ...ficha,
      identidade: { ...ficha.identidade, [campo]: valor },
    });
  };

  const atualizarCacador = (
    campo: keyof FichaDados["cacador"],
    valor: string
  ) => {
    onChange({
      ...ficha,
      cacador: { ...ficha.cacador, [campo]: valor },
    });
  };

  const atualizarPilar = (index: number, valor: string) => {
    const atuais = [
      ficha.pilares[0] ?? "",
      ficha.pilares[1] ?? "",
      ficha.pilares[2] ?? "",
    ];
    atuais[index] = valor;
    onChange({
      ...ficha,
      pilares: atuais,
    });
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#f08b21] disabled:opacity-55 disabled:cursor-not-allowed transition";
  const labelCls =
    "block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5";

  return (
    <section className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-zinc-100">
          Identidade, Credo e Ímpeto
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Defina quem é o caçador, o que ele quer, por que caça e quem o mantém
          humano.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className={labelCls}>Nome do Caçador *</label>
          <input
            type="text"
            disabled={travada}
            value={ficha.identidade.nome}
            onChange={(e) => atualizarIdentidade("nome", e.target.value)}
            placeholder="Ex: Gabriel Ferraz"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Jogador</label>
          <input
            type="text"
            disabled={travada}
            value={ficha.identidade.jogador}
            onChange={(e) => atualizarIdentidade("jogador", e.target.value)}
            placeholder="Ex: Neto"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Crônica</label>
          <input
            type="text"
            disabled={travada}
            value={ficha.identidade.cronica}
            onChange={(e) => atualizarIdentidade("cronica", e.target.value)}
            placeholder="Ex: Portas no Escuro"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Narrador</label>
          <input
            type="text"
            disabled={travada}
            value={ficha.identidade.narrador}
            onChange={(e) => atualizarIdentidade("narrador", e.target.value)}
            placeholder="Ex: Mestre da mesa"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Conceito *</label>
          <input
            type="text"
            disabled={travada}
            value={ficha.identidade.conceito}
            onChange={(e) => atualizarIdentidade("conceito", e.target.value)}
            placeholder="Ex: Detetive obcecado"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Célula</label>
          <input
            type="text"
            disabled={travada}
            value={ficha.identidade.celula}
            onChange={(e) => atualizarIdentidade("celula", e.target.value)}
            placeholder="Ex: Célula São Leopoldo"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Ambição *</label>
          <input
            type="text"
            disabled={travada}
            value={ficha.identidade.ambicao}
            onChange={(e) => atualizarIdentidade("ambicao", e.target.value)}
            placeholder="Objetivo concreto de longo prazo"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Desejo</label>
          <input
            type="text"
            disabled={travada}
            value={ficha.identidade.desejo}
            onChange={(e) => atualizarIdentidade("desejo", e.target.value)}
            placeholder="Vontade imediata da sessão"
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Credo *</label>
          <select
            disabled={travada}
            value={ficha.cacador.credo}
            onChange={(e) => atualizarCacador("credo", e.target.value)}
            className={inputCls}
          >
            <option value="">Selecione</option>
            {CREDOS.map((credo) => (
              <option key={credo} value={credo}>
                {credo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Ímpeto *</label>
          <select
            disabled={travada}
            value={ficha.cacador.impeto}
            onChange={(e) => atualizarCacador("impeto", e.target.value)}
            className={inputCls}
          >
            <option value="">Selecione</option>
            {IMPETOS.map((impeto) => (
              <option key={impeto} value={impeto}>
                {impeto}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Descrição do Ímpeto</label>
        <textarea
          rows={3}
          disabled={travada}
          value={ficha.cacador.descricaoImpeto}
          onChange={(e) => atualizarCacador("descricaoImpeto", e.target.value)}
          placeholder="O que empurra esse Caçador contra o sobrenatural?"
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-zinc-800/80">
        {[0, 1, 2].map((idx) => (
          <div key={idx}>
            <label className={labelCls}>
              Pilar {idx + 1} {idx === 0 ? "*" : ""}
            </label>
            <input
              type="text"
              disabled={travada}
              value={ficha.pilares[idx] ?? ""}
              onChange={(e) => atualizarPilar(idx, e.target.value)}
              placeholder="Pessoa importante e vulnerável"
              className={inputCls}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
