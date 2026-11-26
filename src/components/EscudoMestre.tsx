"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dices,
  Edit3,
  ListOrdered,
  Plus,
  RefreshCw,
  Save,
  Shield,
  SkipForward,
  Trash2,
  Users,
} from "lucide-react";
import { textoTipoRolagem } from "@/lib/regras";
import type {
  EscudoMestreEstado,
  FichaResumoOnline,
  ItemIniciativa,
  RegistroRolagemFicha,
  ResultadoRolagemMestre,
  SubgrupoCronica,
} from "@/types/ficha";

interface RolagemMestreDb {
  id: string;
  descricao: string;
  resultado: ResultadoRolagemMestre;
  createdAt: string;
}

interface RolagemJogadorDb {
  id: string;
  ownerEmail: string;
  fichaId: string | null;
  rolagemId: string;
  subgrupoId: string | null;
  subgrupoNome: string;
  personagem: string;
  jogador: string;
  descricao: string;
  resultado: RegistroRolagemFicha;
  createdAt: string;
}

interface SubgrupoEditavel extends SubgrupoCronica {
  nomeEdit: string;
  desesperoEdit: number;
  perigoEdit: number;
  membrosEdit: string[];
}

interface EscudoMestreProps {
  onEditarFichaAdmin: (fichaId: string) => void;
  onNotify: (msg: string, tipo?: "erro" | "info" | "sucesso") => void;
}

function formatarData(valor?: string): string {
  if (!valor) return "sem data";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "sem data";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function nomeFichaMesa(ficha: FichaResumoOnline): string {
  return (
    ficha.dados?.identidade?.nome?.trim() || ficha.nome || "Ficha sem nome"
  );
}

function jogadorFichaMesa(ficha: FichaResumoOnline): string {
  return ficha.dados?.identidade?.jogador?.trim() || ficha.owner_email || "";
}

export function EscudoMestre({
  onEditarFichaAdmin,
  onNotify,
}: EscudoMestreProps) {
  const [carregando, setCarregando] = useState(true);
  const [escudo, setEscudo] = useState<EscudoMestreEstado>({
    ficha_ids: [],
    notas: "",
    iniciativa: [],
    turno: 0,
  });
  const [todasFichas, setTodasFichas] = useState<FichaResumoOnline[]>([]);
  const [subgrupos, setSubgrupos] = useState<SubgrupoEditavel[]>([]);
  const [rolagensMestre, setRolagensMestre] = useState<{
    publicas: RolagemMestreDb[];
    privadas: RolagemMestreDb[];
  }>({ publicas: [], privadas: [] });
  const [rolagensJogadoresDb, setRolagensJogadoresDb] = useState<
    RolagemJogadorDb[]
  >([]);

  // Criação de subgrupo
  const [novoSubNome, setNovoSubNome] = useState("");
  const [novoSubDesespero, setNovoSubDesespero] = useState(0);
  const [novoSubPerigo, setNovoSubPerigo] = useState(0);

  // Rolagem do mestre
  const [mestreDesc, setMestreDesc] = useState("");
  const [mestreDados, setMestreDados] = useState(3);
  const [mestreBonus, setMestreBonus] = useState(0);
  const [mestreVisibilidade, setMestreVisibilidade] = useState<
    "publica" | "privada"
  >("publica");

  // Iniciativa
  const [iniFichaId, setIniFichaId] = useState("");
  const [iniFichaOrdem, setIniFichaOrdem] = useState(0);
  const [iniOutroNome, setIniOutroNome] = useState("");
  const [iniOutroOrdem, setIniOutroOrdem] = useState(0);

  const carregarTudo = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fetch("/api/escudo");
      const data = await res.json();
      if (!res.ok) {
        onNotify(data.error || "Erro ao carregar Escudo do Mestre.", "erro");
        return;
      }

      setEscudo(data.escudo);
      setTodasFichas(data.fichas ?? []);
      setSubgrupos(
        (data.subgrupos ?? []).map((s: SubgrupoCronica) => ({
          ...s,
          nomeEdit: s.nome,
          desesperoEdit: Number(s.desespero || 0),
          perigoEdit: Number(s.perigo || 0),
          membrosEdit: Array.isArray(s.ficha_ids) ? [...s.ficha_ids] : [],
        }))
      );
      setRolagensMestre(
        data.rolagensMestre ?? { publicas: [], privadas: [] }
      );
      setRolagensJogadoresDb(data.rolagensJogadores ?? []);

      const selecionadas = (data.fichas ?? []).filter(
        (f: FichaResumoOnline) =>
          (data.escudo?.ficha_ids ?? []).includes(f.id)
      );
      if (selecionadas.length > 0) {
        setIniFichaId((prev) =>
          selecionadas.some((f: FichaResumoOnline) => f.id === prev)
            ? prev
            : selecionadas[0].id
        );
      } else {
        setIniFichaId("");
      }
    } catch {
      onNotify("Falha de conexão ao carregar o Escudo.", "erro");
    } finally {
      setCarregando(false);
    }
  }, [onNotify]);

  useEffect(() => {
    carregarTudo();
  }, [carregarTudo]);

  const salvarEscudoRemoto = async (novoEstado: EscudoMestreEstado) => {
    const res = await fetch("/api/escudo", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novoEstado),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      onNotify(data.error || "Erro ao salvar Escudo do Mestre.", "erro");
      return false;
    }
    return true;
  };

  const alternarFichaCronica = async (fichaId: string, marcada: boolean) => {
    const conjunto = new Set(escudo.ficha_ids);
    if (marcada) conjunto.add(fichaId);
    else conjunto.delete(fichaId);

    const novoEstado: EscudoMestreEstado = {
      ...escudo,
      ficha_ids: [...conjunto],
    };
    setEscudo(novoEstado);
    await salvarEscudoRemoto(novoEstado);

    const selecionadas = todasFichas.filter((f) =>
      novoEstado.ficha_ids.includes(f.id)
    );
    if (
      selecionadas.length > 0 &&
      !selecionadas.some((f) => f.id === iniFichaId)
    ) {
      setIniFichaId(selecionadas[0].id);
    }
  };

  const criarSubgrupo = async () => {
    if (!novoSubNome.trim()) {
      onNotify("Informe o nome do subgrupo.", "erro");
      return;
    }

    const res = await fetch("/api/subgrupos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: novoSubNome.trim(),
        desespero: novoSubDesespero,
        perigo: novoSubPerigo,
        ficha_ids: [],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onNotify(data.error || "Erro ao criar subgrupo.", "erro");
      return;
    }

    setNovoSubNome("");
    setNovoSubDesespero(0);
    setNovoSubPerigo(0);
    onNotify("Subgrupo criado.", "sucesso");
    await carregarTudo();
  };

  const salvarSubgrupo = async (sub: SubgrupoEditavel) => {
    const res = await fetch(`/api/subgrupos/${sub.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: sub.nomeEdit.trim() || "Subgrupo",
        desespero: sub.desesperoEdit,
        perigo: sub.perigoEdit,
        ficha_ids: sub.membrosEdit,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onNotify(data.error || "Erro ao salvar subgrupo.", "erro");
      return;
    }
    onNotify(`Subgrupo "${sub.nomeEdit}" atualizado.`, "sucesso");
    await carregarTudo();
  };

  const excluirSubgrupo = async (id: string) => {
    if (!window.confirm("Excluir este subgrupo da crônica?")) return;
    const res = await fetch(`/api/subgrupos/${id}`, { method: "DELETE" });
    if (!res.ok) {
      onNotify("Erro ao excluir subgrupo.", "erro");
      return;
    }
    onNotify("Subgrupo excluído.", "info");
    await carregarTudo();
  };

  const rolarPeloMestre = async () => {
    const res = await fetch("/api/rolagens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origem: "mestre",
        descricao: mestreDesc.trim() || "Rolagem do mestre",
        dados: Math.max(1, mestreDados),
        bonus: mestreBonus,
        visibilidade: mestreVisibilidade,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onNotify(data.error || "Erro ao realizar rolagem do mestre.", "erro");
      return;
    }
    setMestreDesc("");
    await carregarTudo();
  };

  const limparTodoHistoricoRolagens = async () => {
    if (
      !window.confirm(
        "Limpar todo o histórico de rolagens do mestre e dos jogadores da crônica?"
      )
    ) {
      return;
    }
    const res = await fetch("/api/rolagens", { method: "DELETE" });
    if (!res.ok) {
      onNotify("Erro ao limpar histórico de rolagens.", "erro");
      return;
    }
    onNotify("Histórico de rolagens limpo.", "sucesso");
    await carregarTudo();
  };

  const salvarAnotacoes = async () => {
    if (await salvarEscudoRemoto(escudo)) {
      onNotify("Anotações do mestre salvas.", "sucesso");
    }
  };

  const fichasCronica = todasFichas.filter((f) =>
    escudo.ficha_ids.includes(f.id)
  );

  const adicionarJogadorIniciativa = async () => {
    const ficha = fichasCronica.find((f) => f.id === iniFichaId);
    if (!ficha) {
      onNotify("Selecione uma ficha da crônica.", "erro");
      return;
    }
    const novaLista: ItemIniciativa[] = [
      ...escudo.iniciativa,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        nome: nomeFichaMesa(ficha),
        detalhe: jogadorFichaMesa(ficha),
        fichaId: ficha.id,
        tipo: "jogador",
        valor: iniFichaOrdem,
      },
    ].sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0));

    const novoEstado: EscudoMestreEstado = {
      ...escudo,
      iniciativa: novaLista,
      turno: Math.min(escudo.turno, Math.max(0, novaLista.length - 1)),
    };
    setEscudo(novoEstado);
    setIniFichaOrdem(0);
    await salvarEscudoRemoto(novoEstado);
  };

  const adicionarOutroIniciativa = async () => {
    if (!iniOutroNome.trim()) {
      onNotify("Informe o nome para adicionar à iniciativa.", "erro");
      return;
    }
    const novaLista: ItemIniciativa[] = [
      ...escudo.iniciativa,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        nome: iniOutroNome.trim(),
        valor: iniOutroOrdem,
      },
    ].sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0));

    const novoEstado: EscudoMestreEstado = {
      ...escudo,
      iniciativa: novaLista,
      turno: Math.min(escudo.turno, Math.max(0, novaLista.length - 1)),
    };
    setEscudo(novoEstado);
    setIniOutroNome("");
    setIniOutroOrdem(0);
    await salvarEscudoRemoto(novoEstado);
  };

  const removerItemIniciativa = async (id: string) => {
    const novaLista = escudo.iniciativa.filter((item) => item.id !== id);
    const novoTurno = novaLista.length === 0 || escudo.turno >= novaLista.length ? 0 : escudo.turno;
    const novoEstado: EscudoMestreEstado = {
      ...escudo,
      iniciativa: novaLista,
      turno: novoTurno,
    };
    setEscudo(novoEstado);
    await salvarEscudoRemoto(novoEstado);
  };

  const avancarTurno = async () => {
    if (escudo.iniciativa.length === 0) return;
    const novoEstado: EscudoMestreEstado = {
      ...escudo,
      turno: (escudo.turno + 1) % escudo.iniciativa.length,
    };
    setEscudo(novoEstado);
    await salvarEscudoRemoto(novoEstado);
  };

  const limparIniciativa = async () => {
    if (!window.confirm("Limpar toda a lista de iniciativa?")) return;
    const novoEstado: EscudoMestreEstado = {
      ...escudo,
      iniciativa: [],
      turno: 0,
    };
    setEscudo(novoEstado);
    await salvarEscudoRemoto(novoEstado);
  };

  // Combinação de rolagens dos jogadores (tabela pública + fichas da crônica)
  const idsCronicaSet = new Set(escudo.ficha_ids);
  const subgrupoIdsCronica = new Set(
    subgrupos
      .filter((s) => (s.ficha_ids ?? []).some((id) => idsCronicaSet.has(id)))
      .map((s) => s.id)
  );

  const rolagensJogadoresCombinadas = (() => {
    const mapa = new Map<
      string,
      {
        chave: string;
        personagem: string;
        ownerEmail: string;
        jogador: string;
        descricao: string;
        resultado: RegistroRolagemFicha;
        createdAt: string;
      }
    >();

    for (const r of rolagensJogadoresDb) {
      const pertence =
        (r.fichaId && idsCronicaSet.has(r.fichaId)) ||
        (r.subgrupoId && subgrupoIdsCronica.has(r.subgrupoId));
      if (!pertence) continue;
      const chave = `${r.fichaId || ""}:${r.rolagemId || r.id}`;
      if (!mapa.has(chave)) {
        mapa.set(chave, {
          chave,
          personagem: r.personagem || "Ficha sem nome",
          ownerEmail: r.ownerEmail || "",
          jogador: r.jogador || "",
          descricao: r.descricao || "Rolagem",
          resultado: r.resultado,
          createdAt: r.createdAt || r.resultado?.data,
        });
      }
    }

    for (const ficha of fichasCronica) {
      const listaRols = Array.isArray(ficha.dados?.rolagens)
        ? ficha.dados.rolagens
        : [];
      for (const rol of listaRols) {
        const chave = `${ficha.id}:${rol.id}`;
        if (!mapa.has(chave)) {
          mapa.set(chave, {
            chave,
            personagem: nomeFichaMesa(ficha),
            ownerEmail: ficha.owner_email || "",
            jogador: ficha.dados?.identidade?.jogador || "",
            descricao: rol.descricao || "Rolagem",
            resultado: rol,
            createdAt: rol.data,
          });
        }
      }
    }

    return [...mapa.values()].sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    );
  })();

  const rolagensMestreCombinadas = [
    ...rolagensMestre.privadas.map((r) => ({ ...r, privada: true })),
    ...rolagensMestre.publicas.map((r) => ({ ...r, privada: false })),
  ].sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime()
  );

  const inputCls =
    "w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#f08b21] transition";

  return (
    <section className="space-y-6">
      {/* Cabeçalho do Escudo */}
      <div className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#f08b21]/10 border border-[#f08b21]/30 flex items-center justify-center text-[#f08b21]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-zinc-100">
              Escudo do Mestre
            </h2>
            <p className="text-sm text-zinc-400">
              Gestão das fichas da crônica, subgrupos (Desespero/Perigo),
              rolagens, anotações e iniciativa.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={carregarTudo}
          disabled={carregando}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-semibold uppercase tracking-wider transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw
            className={`w-4 h-4 ${carregando ? "animate-spin" : ""}`}
          />
          Atualizar tudo
        </button>
      </div>

      {/* 1. Fichas da Crônica */}
      <div className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-4">
        <h3 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#f08b21]" />
          Fichas Cadastradas ({todasFichas.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
          {todasFichas.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">
              Nenhuma ficha salva no banco ainda.
            </p>
          ) : (
            todasFichas.map((ficha) => {
              const naCronica = escudo.ficha_ids.includes(ficha.id);
              return (
                <div
                  key={ficha.id}
                  className={`flex items-center justify-between gap-3 p-3.5 rounded-lg border transition ${
                    naCronica
                      ? "bg-zinc-900/70 border-[#f08b21]/40"
                      : "bg-zinc-950/70 border-zinc-800"
                  }`}
                >
                  <div className="min-w-0">
                    <strong className="block text-sm text-zinc-100 truncate">
                      {nomeFichaMesa(ficha)}
                    </strong>
                    <span className="block text-xs text-zinc-400 truncate">
                      {ficha.owner_email}
                    </span>
                    <span className="block text-[11px] text-zinc-500">
                      Atualizada em {formatarData(ficha.updated_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={naCronica}
                        onChange={(e) =>
                          alternarFichaCronica(ficha.id, e.target.checked)
                        }
                        className="rounded border-zinc-700 bg-zinc-900 accent-[#f08b21]"
                      />
                      Crônica
                    </label>

                    <button
                      type="button"
                      onClick={() => onEditarFichaAdmin(ficha.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs transition cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar ficha
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Subgrupos, Desespero e Perigo */}
      <div className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-5">
        <h3 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-100">
          Subgrupos, Desespero e Perigo
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px_130px_auto] gap-3 items-end bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-lg">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Nome do subgrupo
            </label>
            <input
              type="text"
              value={novoSubNome}
              onChange={(e) => setNovoSubNome(e.target.value)}
              placeholder="Ex: Grupo no hospital"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Desespero
            </label>
            <input
              type="number"
              value={novoSubDesespero}
              onChange={(e) => setNovoSubDesespero(Number(e.target.value || 0))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Perigo
            </label>
            <input
              type="number"
              value={novoSubPerigo}
              onChange={(e) => setNovoSubPerigo(Number(e.target.value || 0))}
              className={inputCls}
            />
          </div>
          <button
            type="button"
            onClick={criarSubgrupo}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider transition h-[38px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Criar subgrupo
          </button>
        </div>

        <div className="space-y-4">
          {subgrupos.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">
              Nenhum subgrupo criado.
            </p>
          ) : (
            subgrupos.map((sub, idx) => (
              <div
                key={sub.id}
                className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                      Nome
                    </label>
                    <input
                      type="text"
                      value={sub.nomeEdit}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSubgrupos((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, nomeEdit: val } : item
                          )
                        );
                      }}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                      Desespero
                    </label>
                    <input
                      type="number"
                      value={sub.desesperoEdit}
                      onChange={(e) => {
                        const val = Number(e.target.value || 0);
                        setSubgrupos((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, desesperoEdit: val } : item
                          )
                        );
                      }}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                      Perigo
                    </label>
                    <input
                      type="number"
                      value={sub.perigoEdit}
                      onChange={(e) => {
                        const val = Number(e.target.value || 0);
                        setSubgrupos((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, perigoEdit: val } : item
                          )
                        );
                      }}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Membros do Subgrupo
                  </span>
                  {fichasCronica.length === 0 ? (
                    <p className="text-xs text-zinc-500">
                      Marque fichas como &quot;Crônica&quot; acima para
                      alocá-las neste subgrupo.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {fichasCronica.map((ficha) => {
                        const checked = sub.membrosEdit.includes(ficha.id);
                        return (
                          <label
                            key={ficha.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 cursor-pointer select-none"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const marcado = e.target.checked;
                                setSubgrupos((prev) =>
                                  prev.map((item, i) => {
                                    if (i !== idx) return item;
                                    const setIds = new Set(item.membrosEdit);
                                    if (marcado) setIds.add(ficha.id);
                                    else setIds.delete(ficha.id);
                                    return {
                                      ...item,
                                      membrosEdit: [...setIds],
                                    };
                                  })
                                );
                              }}
                              className="rounded border-zinc-700 bg-zinc-950 accent-[#f08b21]"
                            />
                            {nomeFichaMesa(ficha)}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => salvarSubgrupo(sub)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs transition cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Salvar subgrupo
                  </button>
                  <button
                    type="button"
                    onClick={() => excluirSubgrupo(sub.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-red-950/60 text-zinc-300 hover:text-red-300 border border-zinc-800 text-xs transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Histórico de Rolagens dos Jogadores */}
      <div className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-100">
            Histórico de Rolagens dos Jogadores
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={carregarTudo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Atualizar
            </button>
            <button
              type="button"
              onClick={limparTodoHistoricoRolagens}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-red-950/60 text-zinc-300 hover:text-red-300 border border-zinc-800 text-xs transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar todo histórico
            </button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
          {rolagensJogadoresCombinadas.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">
              Nenhuma rolagem de jogador nas fichas da crônica ainda.
            </p>
          ) : (
            rolagensJogadoresCombinadas.slice(0, 80).map((item) => {
              const r = item.resultado;
              const decisaoImpeto = r.impeto
                ? r.aflicao
                  ? " · Ímpeto: Aflição"
                  : r.perigoIncrementado
                    ? " · Ímpeto: Perigo aumentado"
                    : Number(r.desesperoOnes || 0) > 0
                      ? " · Ímpeto: aguardando decisão"
                      : ""
                : "";

              return (
                <div
                  key={item.chave}
                  className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800/90 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-sm text-[#f08b21]">
                      {item.personagem} · {textoTipoRolagem(r.tipo)}
                    </strong>
                    <span className="text-zinc-500">
                      {formatarData(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-zinc-500">
                    {item.ownerEmail}
                    {item.jogador ? ` — ${item.jogador}` : ""}
                  </p>
                  <p className="text-zinc-300">{item.descricao}</p>
                  <p className="text-zinc-400">
                    Dados: {(r.dados || []).join(", ") || "nenhum"}
                  </p>
                  {r.impeto && (
                    <p className="text-amber-300">
                      Dados de Desespero:{" "}
                      {(r.dadosDesespero || []).join(", ") || "nenhum"} (
                      {Number(r.desesperoOnes || 0)} resultado(s) 1)
                    </p>
                  )}
                  <p className="text-zinc-200">
                    Sucessos: <strong>{r.sucessos}</strong> ({r.sucessosBase} em
                    6+, +{r.sucessosExtras} por pares de 10) · Crítico:{" "}
                    {r.critico ? "sim" : "não"}
                    {decisaoImpeto}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Rolagem do Mestre + Anotações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-4">
          <h3 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-100 flex items-center gap-2">
            <Dices className="w-5 h-5 text-[#f08b21]" />
            Rolagem do Mestre
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Descrição
              </label>
              <input
                type="text"
                value={mestreDesc}
                onChange={(e) => setMestreDesc(e.target.value)}
                placeholder="Ex: Percepção do monstro"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Dados
              </label>
              <input
                type="number"
                min={1}
                value={mestreDados}
                onChange={(e) =>
                  setMestreDados(Math.max(1, Number(e.target.value || 1)))
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Bônus
              </label>
              <input
                type="number"
                value={mestreBonus}
                onChange={(e) => setMestreBonus(Number(e.target.value || 0))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Visibilidade
              </label>
              <select
                value={mestreVisibilidade}
                onChange={(e) =>
                  setMestreVisibilidade(
                    e.target.value as "publica" | "privada"
                  )
                }
                className={inputCls}
              >
                <option value="publica">Pública</option>
                <option value="privada">Privada</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={rolarPeloMestre}
            className="px-4 py-2.5 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Rolar dados do Mestre
          </button>

          <div className="max-h-64 overflow-y-auto space-y-2 pt-2">
            {rolagensMestreCombinadas.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">
                Nenhuma rolagem do mestre ainda.
              </p>
            ) : (
              rolagensMestreCombinadas.map((item) => (
                <div
                  key={`${item.privada ? "priv" : "pub"}-${item.id}`}
                  className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong
                      className={
                        item.privada ? "text-purple-300" : "text-amber-300"
                      }
                    >
                      {item.privada ? "Privada" : "Pública"} · {item.descricao}
                    </strong>
                    <span className="text-zinc-500">
                      {formatarData(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-zinc-400">
                    Dados: {(item.resultado?.dados || []).join(", ")}
                  </p>
                  <p className="text-zinc-200">
                    Sucessos: <strong>{item.resultado?.sucessos ?? 0}</strong> (
                    {item.resultado?.sucessosBase ?? 0} em 6+, +
                    {item.resultado?.sucessosExtras ?? 0} por pares de 10) ·
                    Crítico: {item.resultado?.critico ? "sim" : "não"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Anotações */}
        <div className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 flex flex-col space-y-4">
          <h3 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-100">
            Anotações da Sessão
          </h3>
          <textarea
            rows={10}
            value={escudo.notas}
            onChange={(e) => setEscudo({ ...escudo, notas: e.target.value })}
            placeholder="Notas privadas da sessão, pistas, monstros, consequências..."
            className={`${inputCls} flex-1 min-h-[220px]`}
          />
          <button
            type="button"
            onClick={salvarAnotacoes}
            className="self-start inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Salvar anotações
          </button>
        </div>
      </div>

      {/* 5. Rastreador de Iniciativa */}
      <div className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-100 flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-[#f08b21]" />
            Rastreador de Iniciativa
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={avancarTurno}
              disabled={escudo.iniciativa.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider disabled:opacity-40 transition cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Próximo turno
            </button>
            <button
              type="button"
              onClick={limparIniciativa}
              disabled={escudo.iniciativa.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-red-950/60 text-zinc-300 hover:text-red-300 border border-zinc-800 text-xs disabled:opacity-40 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Adicionar jogador da crônica */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_auto] gap-2.5 items-end bg-zinc-900/40 border border-zinc-800/80 p-3.5 rounded-lg">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Jogador da crônica
              </label>
              <select
                value={iniFichaId}
                onChange={(e) => setIniFichaId(e.target.value)}
                className={inputCls}
              >
                {fichasCronica.length === 0 ? (
                  <option value="">Nenhuma ficha na crônica</option>
                ) : (
                  fichasCronica.map((f) => (
                    <option key={f.id} value={f.id}>
                      {nomeFichaMesa(f)}
                      {jogadorFichaMesa(f) ? ` — ${jogadorFichaMesa(f)}` : ""}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Ordem
              </label>
              <input
                type="number"
                value={iniFichaOrdem}
                onChange={(e) => setIniFichaOrdem(Number(e.target.value || 0))}
                className={inputCls}
              />
            </div>
            <button
              type="button"
              onClick={adicionarJogadorIniciativa}
              className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold h-[38px] transition cursor-pointer"
            >
              + Jogador
            </button>
          </div>

          {/* Adicionar NPC/Monstro */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_auto] gap-2.5 items-end bg-zinc-900/40 border border-zinc-800/80 p-3.5 rounded-lg">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Outro (Ameaça / NPC)
              </label>
              <input
                type="text"
                value={iniOutroNome}
                onChange={(e) => setIniOutroNome(e.target.value)}
                placeholder="Monstro, capanga, evento..."
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Ordem
              </label>
              <input
                type="number"
                value={iniOutroOrdem}
                onChange={(e) => setIniOutroOrdem(Number(e.target.value || 0))}
                className={inputCls}
              />
            </div>
            <button
              type="button"
              onClick={adicionarOutroIniciativa}
              className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold h-[38px] transition cursor-pointer"
            >
              + Outro
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {escudo.iniciativa.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">
              Nenhum combatente cadastrado na iniciativa.
            </p>
          ) : (
            escudo.iniciativa.map((item, idx) => {
              const ativo = idx === escudo.turno;
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border transition ${
                    ativo
                      ? "bg-[#f08b21]/10 border-[#f08b21] shadow-[0_0_12px_rgba(240,139,33,0.15)]"
                      : "bg-zinc-950 border-zinc-800"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-8 h-8 rounded-md font-display font-bold text-base flex items-center justify-center shrink-0 ${
                        ativo
                          ? "bg-[#f08b21] text-zinc-950"
                          : "bg-zinc-900 text-zinc-300 border border-zinc-800"
                      }`}
                    >
                      {item.valor}
                    </span>
                    <div className="min-w-0">
                      <strong className="block text-sm text-zinc-100 truncate">
                        {ativo ? "Turno atual · " : ""}
                        {item.nome}
                      </strong>
                      {item.detalhe && (
                        <span className="block text-xs text-zinc-400 truncate">
                          {item.detalhe}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removerItemIniciativa(item.id)}
                    className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition cursor-pointer"
                    aria-label="Remover da iniciativa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
