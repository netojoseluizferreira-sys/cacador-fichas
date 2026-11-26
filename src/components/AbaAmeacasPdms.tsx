"use client";

import { useState } from "react";
import {
  Copy,
  Dices,
  Edit3,
  ListOrdered,
  Plus,
  RotateCcw,
  Skull,
  Trash2,
  X,
} from "lucide-react";
import { normalizarTrilha } from "@/lib/regras";
import type {
  AmeacaCronica,
  CategoriaAmeaca,
  MarcadorDano,
  ParadaExtraAmeaca,
  ResultadoRolagemMestre,
} from "@/types/ficha";

const CATEGORIAS_AMEACA: CategoriaAmeaca[] = [
  "Presa / Monstro",
  "Rival / Org",
  "PdM / Aliado",
  "Capanga / Grupo",
];

interface AbaAmeacasPdmsProps {
  ameacas: AmeacaCronica[];
  onSalvarAmeacas: (novas: AmeacaCronica[]) => Promise<boolean>;
  onEnviarParaIniciativa: (
    ameaca: AmeacaCronica,
    visivelParcial: boolean
  ) => Promise<void>;
  onRolagemRegistrada: () => void;
  onNotify: (msg: string, tipo?: "erro" | "info" | "sucesso") => void;
}

function criarAmeacaVazia(): AmeacaCronica {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    nome: "",
    categoria: "Presa / Monstro",
    dificuldadePadrao: "4 / 2",
    paradaFisico: 6,
    paradaSocial: 3,
    paradaMental: 4,
    paradasExtras: [],
    vitalidadeMax: 7,
    vitalidadeDano: Array.from({ length: 7 }, () => ""),
    vontadeMax: 5,
    vontadeDano: Array.from({ length: 5 }, () => ""),
    poderes: "",
    fraquezas: "",
    notas: "",
  };
}

function proximoCicloCaixaNpc(atual: MarcadorDano): MarcadorDano {
  if (atual === "") return "/";
  if (atual === "/") return "X";
  return "";
}

export function AbaAmeacasPdms({
  ameacas,
  onSalvarAmeacas,
  onEnviarParaIniciativa,
  onRolagemRegistrada,
  onNotify,
}: AbaAmeacasPdmsProps) {
  const [visibilidadeRolagem, setVisibilidadeRolagem] = useState<
    "privada" | "publica"
  >("privada");
  const [ultimoResultado, setUltimoResultado] = useState<{
    titulo: string;
    visibilidade: "privada" | "publica";
    resultado: ResultadoRolagemMestre;
  } | null>(null);

  const [formAberto, setFormAberto] = useState(false);
  const [rascunho, setRascunho] = useState<AmeacaCronica>(() =>
    criarAmeacaVazia()
  );
  const [novaParadaNome, setNovaParadaNome] = useState("");
  const [novaParadaDados, setNovaParadaDados] = useState(6);

  const abrirNovo = () => {
    setRascunho(criarAmeacaVazia());
    setNovaParadaNome("");
    setNovaParadaDados(6);
    setFormAberto(true);
  };

  const abrirEdicao = (alvo: AmeacaCronica) => {
    setRascunho({
      ...structuredClone(alvo),
      vitalidadeDano: normalizarTrilha(alvo.vitalidadeDano, alvo.vitalidadeMax),
      vontadeDano: normalizarTrilha(alvo.vontadeDano, alvo.vontadeMax),
    });
    setNovaParadaNome("");
    setNovaParadaDados(6);
    setFormAberto(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const adicionarParadaExtraNoRascunho = () => {
    if (!novaParadaNome.trim()) return;
    const item: ParadaExtraAmeaca = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      nome: novaParadaNome.trim(),
      dados: Math.max(1, Math.round(novaParadaDados || 1)),
    };
    setRascunho((prev) => ({
      ...prev,
      paradasExtras: [...prev.paradasExtras, item],
    }));
    setNovaParadaNome("");
  };

  const salvarFormulario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rascunho.nome.trim()) {
      onNotify("Informe o nome da Ameaça ou PdM.", "erro");
      return;
    }

    const normalizado: AmeacaCronica = {
      ...rascunho,
      nome: rascunho.nome.trim(),
      vitalidadeDano: normalizarTrilha(
        rascunho.vitalidadeDano,
        rascunho.vitalidadeMax
      ),
      vontadeDano: normalizarTrilha(rascunho.vontadeDano, rascunho.vontadeMax),
    };

    const existe = ameacas.some((a) => a.id === normalizado.id);
    const novaLista = existe
      ? ameacas.map((a) => (a.id === normalizado.id ? normalizado : a))
      : [normalizado, ...ameacas];

    if (await onSalvarAmeacas(novaLista)) {
      setFormAberto(false);
      onNotify(
        existe ? "Ficha de ameaça/PdM atualizada." : "Ameaça/PdM criada!",
        "sucesso"
      );
    }
  };

  const duplicarAmeaca = async (origem: AmeacaCronica) => {
    const copia: AmeacaCronica = {
      ...structuredClone(origem),
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      nome: `${origem.nome} (Cópia)`,
      vitalidadeDano: Array.from({ length: origem.vitalidadeMax }, () => ""),
      vontadeDano: Array.from({ length: origem.vontadeMax }, () => ""),
    };
    if (await onSalvarAmeacas([copia, ...ameacas])) {
      onNotify(`"${copia.nome}" criada.`, "sucesso");
    }
  };

  const excluirAmeaca = async (alvo: AmeacaCronica) => {
    if (!window.confirm(`Excluir "${alvo.nome}" do bestiário da crônica?`))
      return;
    const novaLista = ameacas.filter((a) => a.id !== alvo.id);
    if (await onSalvarAmeacas(novaLista)) {
      onNotify(`"${alvo.nome}" removida.`, "info");
    }
  };

  const alternarCaixaDanoAmeaca = async (
    ameacaId: string,
    trilha: "vitalidade" | "vontade",
    idx: number
  ) => {
    const novaLista = ameacas.map((a) => {
      if (a.id !== ameacaId) return a;
      const max = trilha === "vitalidade" ? a.vitalidadeMax : a.vontadeMax;
      const atual = normalizarTrilha(
        trilha === "vitalidade" ? a.vitalidadeDano : a.vontadeDano,
        max
      );
      atual[idx] = proximoCicloCaixaNpc(atual[idx] || "");
      return trilha === "vitalidade"
        ? { ...a, vitalidadeDano: atual }
        : { ...a, vontadeDano: atual };
    });
    await onSalvarAmeacas(novaLista);
  };

  const limparDanoAmeaca = async (ameacaId: string) => {
    const novaLista: AmeacaCronica[] = ameacas.map((a) => {
      if (a.id !== ameacaId) return a;
      return {
        ...a,
        vitalidadeDano: Array.from(
          { length: a.vitalidadeMax },
          (): MarcadorDano => ""
        ),
        vontadeDano: Array.from(
          { length: a.vontadeMax },
          (): MarcadorDano => ""
        ),
      };
    });
    await onSalvarAmeacas(novaLista);
  };

  const rolarParadaAmeaca = async (
    ameacaNome: string,
    rotuloParada: string,
    dados: number
  ) => {
    const qtd = Math.max(1, Math.round(dados || 1));
    const descricao = `${ameacaNome} — ${rotuloParada} (${qtd}d)`;

    const res = await fetch("/api/rolagens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origem: "mestre",
        descricao,
        dados: qtd,
        bonus: 0,
        visibilidade: visibilidadeRolagem,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      onNotify(json.error || "Erro ao rolar parada da ameaça.", "erro");
      return;
    }

    if (json.rolagem?.resultado) {
      setUltimoResultado({
        titulo: descricao,
        visibilidade: visibilidadeRolagem,
        resultado: json.rolagem.resultado,
      });
    }
    onRolagemRegistrada();
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#f08b21] transition";

  return (
    <div className="space-y-5">
      {/* Barra Superior */}
      <div className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#f08b21]/10 border border-[#f08b21]/30 flex items-center justify-center text-[#f08b21]">
            <Skull className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-100">
              Ameaças, Presas &amp; PdMs ({ameacas.length})
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Cadastre antagonistas e aliados com Vitalidade própria, rolagem em
              1 clique e envio rápido para a Iniciativa.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg p-1 text-xs">
            <span className="px-2 text-zinc-400 font-medium">Rolagens:</span>
            <button
              type="button"
              onClick={() => setVisibilidadeRolagem("privada")}
              className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                visibilidadeRolagem === "privada"
                  ? "bg-purple-950 text-purple-200 border border-purple-700/60"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Privadas
            </button>
            <button
              type="button"
              onClick={() => setVisibilidadeRolagem("publica")}
              className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                visibilidadeRolagem === "publica"
                  ? "bg-amber-950 text-amber-200 border border-amber-700/60"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Públicas
            </button>
          </div>

          <button
            type="button"
            onClick={() => (formAberto ? setFormAberto(false) : abrirNovo())}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            {formAberto ? (
              <>
                <X className="w-4 h-4" />
                Fechar formulário
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Nova Ameaça / PdM
              </>
            )}
          </button>
        </div>
      </div>

      {/* Resultado instantâneo da última rolagem de Ameaça */}
      {ultimoResultado && (
        <div className="p-4 rounded-xl bg-zinc-950 border border-[#f08b21]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  ultimoResultado.visibilidade === "privada"
                    ? "bg-purple-950 text-purple-300 border border-purple-700/60"
                    : "bg-amber-950 text-amber-300 border border-amber-700/60"
                }`}
              >
                {ultimoResultado.visibilidade === "privada"
                  ? "Privada"
                  : "Pública"}
              </span>
              <strong className="text-sm text-zinc-100">
                {ultimoResultado.titulo}
              </strong>
            </div>
            <p className="text-zinc-300">
              Dados:{" "}
              {ultimoResultado.resultado.dados.map((d, i) => (
                <span
                  key={i}
                  className={`font-mono font-bold mr-1.5 ${
                    d === 10
                      ? "text-[#f08b21]"
                      : d >= 6
                        ? "text-emerald-300"
                        : "text-zinc-400"
                  }`}
                >
                  [{d}]
                </span>
              ))}
            </p>
            <p className="text-zinc-200">
              Sucessos:{" "}
              <strong className="text-base text-[#f08b21]">
                {ultimoResultado.resultado.sucessos}
              </strong>{" "}
              ({ultimoResultado.resultado.sucessosBase} em 6+, +
              {ultimoResultado.resultado.sucessosExtras} por pares de 10) ·
              Crítico:{" "}
              {ultimoResultado.resultado.critico ? "SIM!" : "não"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setUltimoResultado(null)}
            className="self-end sm:self-center p-1.5 rounded text-zinc-500 hover:text-zinc-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Formulário de Criação / Edição */}
      {formAberto && (
        <form
          onSubmit={salvarFormulario}
          className="bg-[#141416] border border-[#f08b21]/40 rounded-xl p-5 sm:p-6 space-y-5"
        >
          <h4 className="font-display text-xl font-bold uppercase tracking-wide text-[#f08b21]">
            {ameacas.some((a) => a.id === rascunho.id)
              ? `Editando: ${rascunho.nome || "Ameaça"}`
              : "Cadastrar Nova Ameaça ou PdM"}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Nome *
              </label>
              <input
                type="text"
                required
                value={rascunho.nome}
                onChange={(e) =>
                  setRascunho({ ...rascunho, nome: e.target.value })
                }
                placeholder="Ex: Carniçal Vigia / Agente Silva"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Categoria
              </label>
              <select
                value={rascunho.categoria}
                onChange={(e) =>
                  setRascunho({ ...rascunho, categoria: e.target.value })
                }
                className={inputCls}
              >
                {CATEGORIAS_AMEACA.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Dificuldade Geral (Forte / Fraca)
              </label>
              <input
                type="text"
                value={rascunho.dificuldadePadrao}
                onChange={(e) =>
                  setRascunho({
                    ...rascunho,
                    dificuldadePadrao: e.target.value,
                  })
                }
                placeholder="Ex: 4 / 2"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Parada Físico
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={rascunho.paradaFisico}
                onChange={(e) =>
                  setRascunho({
                    ...rascunho,
                    paradaFisico: Number(e.target.value || 0),
                  })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Parada Social
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={rascunho.paradaSocial}
                onChange={(e) =>
                  setRascunho({
                    ...rascunho,
                    paradaSocial: Number(e.target.value || 0),
                  })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Parada Mental
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={rascunho.paradaMental}
                onChange={(e) =>
                  setRascunho({
                    ...rascunho,
                    paradaMental: Number(e.target.value || 0),
                  })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Vitalidade Máx.
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={rascunho.vitalidadeMax}
                onChange={(e) =>
                  setRascunho({
                    ...rascunho,
                    vitalidadeMax: Math.max(1, Number(e.target.value || 1)),
                  })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Vontade Máx.
              </label>
              <input
                type="number"
                min={0}
                max={30}
                value={rascunho.vontadeMax}
                onChange={(e) =>
                  setRascunho({
                    ...rascunho,
                    vontadeMax: Math.max(0, Number(e.target.value || 0)),
                  })
                }
                className={inputCls}
              />
            </div>
          </div>

          {/* Paradas Especiais Excepcionais */}
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-3">
            <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Paradas Excepcionais / Ataques Específicos
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px_auto] gap-2.5 items-end">
              <input
                type="text"
                value={novaParadaNome}
                onChange={(e) => setNovaParadaNome(e.target.value)}
                placeholder="Ex: Garras, Armas de Fogo, Furtividade, Dominar..."
                className={inputCls}
              />
              <input
                type="number"
                min={1}
                max={50}
                value={novaParadaDados}
                onChange={(e) =>
                  setNovaParadaDados(Math.max(1, Number(e.target.value || 1)))
                }
                className={inputCls}
              />
              <button
                type="button"
                onClick={adicionarParadaExtraNoRascunho}
                className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold h-[38px] cursor-pointer"
              >
                + Parada
              </button>
            </div>

            {rascunho.paradasExtras.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {rascunho.paradasExtras.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-200"
                  >
                    {p.nome} ({p.dados}d)
                    <button
                      type="button"
                      onClick={() =>
                        setRascunho((prev) => ({
                          ...prev,
                          paradasExtras: prev.paradasExtras.filter(
                            (x) => x.id !== p.id
                          ),
                        }))
                      }
                      className="text-zinc-500 hover:text-red-400 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Poderes, Dotes e Armas
              </label>
              <textarea
                rows={3}
                value={rascunho.poderes}
                onChange={(e) =>
                  setRascunho({ ...rascunho, poderes: e.target.value })
                }
                placeholder="Ex: Potência, Regeneração (+2 Vit/turno), Escopeta (+3 dano)..."
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Fraquezas e Banimentos
              </label>
              <textarea
                rows={3}
                value={rascunho.fraquezas}
                onChange={(e) =>
                  setRascunho({ ...rascunho, fraquezas: e.target.value })
                }
                placeholder="Ex: Fogo causa agravado, prata anula regeneração..."
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Notas e Táticas
              </label>
              <textarea
                rows={3}
                value={rascunho.notas}
                onChange={(e) =>
                  setRascunho({ ...rascunho, notas: e.target.value })
                }
                placeholder="Motivação, covil, comportamento em combate..."
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setFormAberto(false)}
              className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider cursor-pointer"
            >
              Salvar Ameaça / PdM
            </button>
          </div>
        </form>
      )}

      {/* Lista de Cards de Ameaças e PdMs */}
      {ameacas.length === 0 ? (
        <div className="bg-[#141416] border border-dashed border-zinc-800 rounded-xl py-12 px-4 text-center">
          <p className="text-sm text-zinc-400">
            Nenhuma Ameaça ou PdM cadastrado ainda. Clique em{" "}
            <strong className="text-zinc-200">+ Nova Ameaça / PdM</strong> acima
            para criar sua primeira Presa ou antagonista!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {ameacas.map((a) => {
            const caixasVit = normalizarTrilha(a.vitalidadeDano, a.vitalidadeMax);
            const caixasVon = normalizarTrilha(a.vontadeDano, a.vontadeMax);

            return (
              <div
                key={a.id}
                className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Cabeçalho do Card */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-display text-2xl font-bold uppercase tracking-wide text-zinc-100">
                          {a.nome}
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-950/60 text-red-300 border border-red-800/50">
                          {a.categoria}
                        </span>
                        {a.dificuldadePadrao && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-700">
                            Dif. {a.dificuldadePadrao}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEnviarParaIniciativa(a, false)}
                        title="Enviar para Iniciativa (oculto na parcial por padrão)"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[#f08b21] border border-[#f08b21]/40 text-xs font-semibold transition cursor-pointer"
                      >
                        <ListOrdered className="w-3.5 h-3.5" />+ Inic.
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicarAmeaca(a)}
                        title="Duplicar (ex: Capanga #2)"
                        className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirEdicao(a)}
                        title="Editar"
                        className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => excluirAmeaca(a)}
                        title="Excluir"
                        className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/60 text-zinc-400 hover:text-red-300 border border-zinc-800 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Botões de Rolagem Rápida em 1 Clique */}
                  <div className="space-y-2">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      Rolar Parada em 1 Clique ({visibilidadeRolagem}):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          rolarParadaAmeaca(a.nome, "Físico", a.paradaFisico)
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-[#f08b21] hover:text-zinc-950 text-zinc-200 border border-zinc-700 text-xs font-semibold transition cursor-pointer"
                      >
                        <Dices className="w-3.5 h-3.5" />
                        Físico ({a.paradaFisico}d)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          rolarParadaAmeaca(a.nome, "Social", a.paradaSocial)
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-[#f08b21] hover:text-zinc-950 text-zinc-200 border border-zinc-700 text-xs font-semibold transition cursor-pointer"
                      >
                        <Dices className="w-3.5 h-3.5" />
                        Social ({a.paradaSocial}d)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          rolarParadaAmeaca(a.nome, "Mental", a.paradaMental)
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-[#f08b21] hover:text-zinc-950 text-zinc-200 border border-zinc-700 text-xs font-semibold transition cursor-pointer"
                      >
                        <Dices className="w-3.5 h-3.5" />
                        Mental ({a.paradaMental}d)
                      </button>

                      {a.paradasExtras.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            rolarParadaAmeaca(a.nome, p.nome, p.dados)
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f08b21]/15 hover:bg-[#f08b21] text-[#f08b21] hover:text-zinc-950 border border-[#f08b21]/40 text-xs font-semibold transition cursor-pointer"
                        >
                          <Dices className="w-3.5 h-3.5" />
                          {p.nome} ({p.dados}d)
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Trilhas Interativas de Vitalidade e Vontade */}
                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-300">
                        Vitalidade ({a.vitalidadeMax}) — clique para alternar{" "}
                        <code className="text-amber-300">/</code> e{" "}
                        <code className="text-red-400">X</code>
                      </span>
                      <button
                        type="button"
                        onClick={() => limparDanoAmeaca(a.id)}
                        className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Curar tudo
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {caixasVit.map((m, idx) => (
                        <button
                          key={`vit-${idx}`}
                          type="button"
                          onClick={() =>
                            alternarCaixaDanoAmeaca(a.id, "vitalidade", idx)
                          }
                          className={`w-8 h-8 rounded-md border-2 font-mono text-sm font-bold flex items-center justify-center transition cursor-pointer ${
                            m === "X"
                              ? "bg-red-950/60 border-red-500/80 text-red-200"
                              : m === "/"
                                ? "bg-amber-950/50 border-amber-500/70 text-amber-200"
                                : "bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>

                    {a.vontadeMax > 0 && (
                      <div className="pt-2 border-t border-zinc-800/70 space-y-1.5">
                        <span className="block text-xs font-semibold text-zinc-400">
                          Força de Vontade ({a.vontadeMax})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {caixasVon.map((m, idx) => (
                            <button
                              key={`von-${idx}`}
                              type="button"
                              onClick={() =>
                                alternarCaixaDanoAmeaca(a.id, "vontade", idx)
                              }
                              className={`w-7 h-7 rounded border font-mono text-xs font-bold flex items-center justify-center transition cursor-pointer ${
                                m === "X"
                                  ? "bg-red-950/60 border-red-500/80 text-red-200"
                                  : m === "/"
                                    ? "bg-amber-950/50 border-amber-500/70 text-amber-200"
                                    : "bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500"
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Poderes, Fraquezas e Notas */}
                  {(a.poderes || a.fraquezas || a.notas) && (
                    <div className="space-y-1.5 text-xs leading-relaxed">
                      {a.poderes && (
                        <p className="text-zinc-300">
                          <strong className="text-[#f08b21]">Poderes:</strong>{" "}
                          {a.poderes}
                        </p>
                      )}
                      {a.fraquezas && (
                        <p className="text-zinc-300">
                          <strong className="text-red-400">Fraquezas:</strong>{" "}
                          {a.fraquezas}
                        </p>
                      )}
                      {a.notas && (
                        <p className="text-zinc-400">
                          <strong className="text-zinc-300">Notas:</strong>{" "}
                          {a.notas}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
