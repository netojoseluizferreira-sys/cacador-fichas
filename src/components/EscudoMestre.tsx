"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Cloud,
  Dices,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Layers,
  ListOrdered,
  Play,
  Plus,
  RefreshCw,
  Save,
  ScanEye,
  Search,
  Shield,
  ShieldAlert,
  SkipBack,
  SkipForward,
  Skull,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { AbaAdminContas } from "@/components/AbaAdminContas";
import { AbaAmeacasPdms } from "@/components/AbaAmeacasPdms";
import { AbaRaioXCelula } from "@/components/AbaRaioXCelula";
import { GridTaticoCombate } from "@/components/GridTaticoCombate";
import {
  HistoricoCentralizado,
  type RolagemJogadorFeedItem,
  type RolagemMestreFeedItem,
} from "@/components/HistoricoCentralizado";
import {
  ModalSimulacaoRolagem,
  type EventoAnimacaoRolagem,
} from "@/components/SimulacaoDadosTela";
import type {
  AmeacaCronica,
  EscudoMestreEstado,
  FichaResumoOnline,
  ItemIniciativa,
  SubgrupoCronica,
  VisibilidadeIniciativa,
} from "@/types/ficha";

interface SubgrupoEditavel extends SubgrupoCronica {
  nomeEdit: string;
  desesperoEdit: number;
  perigoEdit: number;
  membrosEdit: string[];
}

type AbaEscudoId =
  | "raiox"
  | "fichas"
  | "grupos"
  | "ameacas"
  | "rolagens"
  | "iniciativa"
  | "notas"
  | "admin";

interface EscudoMestreProps {
  userEmail: string;
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
  userEmail,
  onEditarFichaAdmin,
  onNotify,
}: EscudoMestreProps) {
  const [abaAtiva, setAbaAtiva] = useState<AbaEscudoId>("raiox");
  const [carregando, setCarregando] = useState(true);
  const [buscaFicha, setBuscaFicha] = useState("");
  const [statusNotas, setStatusNotas] = useState<
    "idle" | "pendente" | "salvo"
  >("idle");
  const timerNotasRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [escudo, setEscudo] = useState<EscudoMestreEstado>({
    ficha_ids: [],
    notas: "",
    iniciativa: [],
    turno: 0,
    iniciativa_visibilidade: "invisivel",
    iniciativa_definida: false,
    ameacas: [],
  });
  const [todasFichas, setTodasFichas] = useState<FichaResumoOnline[]>([]);
  const [subgrupos, setSubgrupos] = useState<SubgrupoEditavel[]>([]);
  const [rolagensMestre, setRolagensMestre] = useState<{
    publicas: RolagemMestreFeedItem[];
    privadas: RolagemMestreFeedItem[];
  }>({ publicas: [], privadas: [] });
  const [rolagensJogadoresDb, setRolagensJogadoresDb] = useState<
    RolagemJogadorFeedItem[]
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
  const [eventoAnimacaoMestre, setEventoAnimacaoMestre] =
    useState<EventoAnimacaoRolagem | null>(null);

  // Iniciativa - inserção
  const [iniFichaId, setIniFichaId] = useState("");
  const [iniOutroNome, setIniOutroNome] = useState("");
  const [iniOutroVisivelParcial, setIniOutroVisivelParcial] = useState(false);

  const carregarTudo = useCallback(
    async (silencioso = false) => {
      if (!silencioso) setCarregando(true);
      try {
        const res = await fetch("/api/escudo", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          if (!silencioso) {
            onNotify(data.error || "Erro ao carregar Escudo do Mestre.", "erro");
          }
          return;
        }

        setEscudo((prev) => {
          // Na atualização silenciosa em background da aba rolagens, preserva rascunho de notas/iniciativa não salvo se o mestre estiver digitando
          if (silencioso) {
            return {
              ...prev,
              ficha_ids: data.escudo?.ficha_ids ?? prev.ficha_ids,
            };
          }
          return {
            ficha_ids: data.escudo?.ficha_ids ?? [],
            notas: data.escudo?.notas ?? "",
            iniciativa: data.escudo?.iniciativa ?? [],
            turno: data.escudo?.turno ?? 0,
            iniciativa_visibilidade:
              data.escudo?.iniciativa_visibilidade ?? "invisivel",
            iniciativa_definida: Boolean(data.escudo?.iniciativa_definida),
            ameacas: Array.isArray(data.escudo?.ameacas)
              ? data.escudo.ameacas
              : [],
          };
        });

        setTodasFichas(data.fichas ?? []);
        if (!silencioso) {
          setSubgrupos(
            (data.subgrupos ?? []).map((s: SubgrupoCronica) => ({
              ...s,
              nomeEdit: s.nome,
              desesperoEdit: Number(s.desespero || 0),
              perigoEdit: Number(s.perigo || 0),
              membrosEdit: Array.isArray(s.ficha_ids) ? [...s.ficha_ids] : [],
            }))
          );
        }
        setRolagensMestre(
          data.rolagensMestre ?? { publicas: [], privadas: [] }
        );
        setRolagensJogadoresDb(data.rolagensJogadores ?? []);

        const selecionadas = (data.fichas ?? []).filter(
          (f: FichaResumoOnline) =>
            (data.escudo?.ficha_ids ?? []).includes(f.id)
        );
        if (selecionadas.length > 0) {
          setIniFichaId((atual) =>
            selecionadas.some((f: FichaResumoOnline) => f.id === atual)
              ? atual
              : selecionadas[0].id
          );
        } else {
          setIniFichaId("");
        }
      } catch {
        if (!silencioso) {
          onNotify("Falha de conexão ao carregar o Escudo.", "erro");
        }
      } finally {
        if (!silencioso) setCarregando(false);
      }
    },
    [onNotify]
  );

  useEffect(() => {
    carregarTudo(false);
  }, [carregarTudo]);

  // Atualização em tempo real do Raio-X e do Histórico quando ativos
  useEffect(() => {
    if (abaAtiva !== "rolagens" && abaAtiva !== "raiox") return;
    const intervalo = setInterval(() => {
      if (document.visibilityState === "visible") {
        carregarTudo(true);
      }
    }, 4500);
    return () => clearInterval(intervalo);
  }, [abaAtiva, carregarTudo]);

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

  // --- Fichas ---
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
  };

  const excluirFichaPeloMestre = async (ficha: FichaResumoOnline) => {
    if (
      !window.confirm(
        `Excluir permanentemente a ficha "${nomeFichaMesa(ficha)}" (${ficha.owner_email})?`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/fichas/${ficha.id}`, { method: "DELETE" });
    if (!res.ok) {
      onNotify("Erro ao excluir ficha.", "erro");
      return;
    }
    onNotify("Ficha excluída.", "info");
    await carregarTudo(false);
  };

  // --- Subgrupos ---
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
    await carregarTudo(false);
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
    await carregarTudo(false);
  };

  const excluirSubgrupo = async (id: string) => {
    if (!window.confirm("Excluir este subgrupo da crônica?")) return;
    const res = await fetch(`/api/subgrupos/${id}`, { method: "DELETE" });
    if (!res.ok) {
      onNotify("Erro ao excluir subgrupo.", "erro");
      return;
    }
    onNotify("Subgrupo excluído.", "info");
    await carregarTudo(false);
  };

  // --- Rolagens ---
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
    if (data.rolagem?.resultado) {
      setEventoAnimacaoMestre({
        id: data.rolagem.id,
        titulo:
          mestreVisibilidade === "privada"
            ? "Rolagem Privada do Mestre"
            : "Rolagem Pública do Mestre",
        subtitulo: data.rolagem.descricao,
        dados: data.rolagem.resultado.dados ?? [],
        sucessos: Number(data.rolagem.resultado.sucessos ?? 0),
        critico: Boolean(data.rolagem.resultado.critico),
      });
    }
    setMestreDesc("");
    await carregarTudo(true);
  };

  const limparTodoHistoricoRolagens = async () => {
    if (
      !window.confirm(
        "Limpar todo o histórico de rolagens do mestre (públicas e privadas) e dos jogadores?"
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
    await carregarTudo(false);
  };

  // --- Iniciativa (Novo Fluxo: Inserir todos -> Definir valores -> Modificar Ordem e Visibilidade) ---
  const fichasCronica = useMemo(
    () => todasFichas.filter((f) => escudo.ficha_ids.includes(f.id)),
    [todasFichas, escudo.ficha_ids]
  );

  const adicionarTodosJogadoresCronica = async () => {
    if (fichasCronica.length === 0) {
      onNotify(
        "Marque ao menos uma ficha como 'Crônica' na aba Fichas & Jogadores primeiro.",
        "erro"
      );
      return;
    }

    const idsJaPresentes = new Set(
      escudo.iniciativa.map((i) => i.fichaId).filter(Boolean)
    );
    const novosItens: ItemIniciativa[] = fichasCronica
      .filter((f) => !idsJaPresentes.has(f.id))
      .map((f) => ({
        id: `${Date.now()}-${f.id.slice(0, 8)}-${Math.random().toString(16).slice(2, 6)}`,
        nome: nomeFichaMesa(f),
        detalhe: jogadorFichaMesa(f),
        fichaId: f.id,
        ownerEmail: f.owner_email,
        tipo: "jogador",
        valor: 0,
        visivel: true,
      }));

    if (novosItens.length === 0) {
      onNotify(
        "Todos os jogadores da crônica já estão na lista de iniciativa.",
        "info"
      );
      return;
    }

    const novoEstado: EscudoMestreEstado = {
      ...escudo,
      iniciativa: [...escudo.iniciativa, ...novosItens],
    };
    setEscudo(novoEstado);
    await salvarEscudoRemoto(novoEstado);
    onNotify(
      `${novosItens.length} jogador(es) adicionado(s). Preencha a iniciativa de cada um e clique em 'Definir / Ordenar Iniciativa'.`,
      "sucesso"
    );
  };

  const adicionarUmJogadorIniciativa = async () => {
    const ficha = fichasCronica.find((f) => f.id === iniFichaId);
    if (!ficha) {
      onNotify("Selecione uma ficha da crônica.", "erro");
      return;
    }
    const novoItem: ItemIniciativa = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      nome: nomeFichaMesa(ficha),
      detalhe: jogadorFichaMesa(ficha),
      fichaId: ficha.id,
      ownerEmail: ficha.owner_email,
      tipo: "jogador",
      valor: 0,
      visivel: true,
    };
    const novoEstado: EscudoMestreEstado = {
      ...escudo,
      iniciativa: [...escudo.iniciativa, novoItem],
    };
    setEscudo(novoEstado);
    await salvarEscudoRemoto(novoEstado);
  };

  const adicionarOutroIniciativa = async () => {
    if (!iniOutroNome.trim()) {
      onNotify("Informe o nome da ameaça ou NPC.", "erro");
      return;
    }
    const novoItem: ItemIniciativa = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      nome: iniOutroNome.trim(),
      tipo: "npc",
      valor: 0,
      visivel: iniOutroVisivelParcial,
    };
    const novoEstado: EscudoMestreEstado = {
      ...escudo,
      iniciativa: [...escudo.iniciativa, novoItem],
    };
    setEscudo(novoEstado);
    setIniOutroNome("");
    await salvarEscudoRemoto(novoEstado);
  };

  const atualizarValorItemLocal = (id: string, valor: number) => {
    setEscudo((prev) => ({
      ...prev,
      iniciativa: prev.iniciativa.map((item) =>
        item.id === id ? { ...item, valor } : item
      ),
    }));
  };

  const definirEOrdenarIniciativa = async () => {
    if (escudo.iniciativa.length === 0) {
      onNotify("Adicione participantes antes de definir a iniciativa.", "erro");
      return;
    }
    const ordenada = [...escudo.iniciativa].sort(
      (a, b) => Number(b.valor || 0) - Number(a.valor || 0)
    );
    const novoEstado: EscudoMestreEstado = {
      ...escudo,
      iniciativa: ordenada,
      turno: 0,
      iniciativa_definida: true,
    };
    setEscudo(novoEstado);
    if (await salvarEscudoRemoto(novoEstado)) {
      onNotify("Iniciativa definida e ordenada!", "sucesso");
    }
  };

  const salvarValoresSemReordenar = async () => {
    if (await salvarEscudoRemoto(escudo)) {
      onNotify("Alterações da iniciativa salvas.", "sucesso");
    }
  };

  const moverItemOrdem = async (index: number, direcao: -1 | 1) => {
    const destino = index + direcao;
    if (destino < 0 || destino >= escudo.iniciativa.length) return;

    const idTurnoAtual = escudo.iniciativa[escudo.turno]?.id;
    const copia = [...escudo.iniciativa];
    const [movido] = copia.splice(index, 1);
    copia.splice(destino, 0, movido);

    const novoIndiceTurno = idTurnoAtual
      ? Math.max(
          0,
          copia.findIndex((i) => i.id === idTurnoAtual)
        )
      : escudo.turno;

    const novoEstado: EscudoMestreEstado = {
      ...escudo,
      iniciativa: copia,
      turno: novoIndiceTurno,
    };
    setEscudo(novoEstado);
    await salvarEscudoRemoto(novoEstado);
  };

  const alternarVisivelItemParcial = async (id: string) => {
    const novaLista = escudo.iniciativa.map((item) =>
      item.id === id ? { ...item, visivel: !item.visivel } : item
    );
    const novoEstado: EscudoMestreEstado = {
      ...escudo,
      iniciativa: novaLista,
    };
    setEscudo(novoEstado);
    await salvarEscudoRemoto(novoEstado);
  };

  const alterarVisibilidadeGlobal = async (
    novaVisibilidade: VisibilidadeIniciativa
  ) => {
    const novoEstado: EscudoMestreEstado = {
      ...escudo,
      iniciativa_visibilidade: novaVisibilidade,
    };
    setEscudo(novoEstado);
    if (await salvarEscudoRemoto(novoEstado)) {
      const labels: Record<VisibilidadeIniciativa, string> = {
        total: "Visibilidade Total ativada para os jogadores na iniciativa.",
        parcial:
          "Visibilidade Parcial ativada (apenas membros com olho ativo aparecem).",
        invisivel: "Iniciativa ocultada para todos os jogadores.",
      };
      onNotify(labels[novaVisibilidade], "info");
    }
  };

  const definirTurnoDireto = async (idx: number) => {
    const novoEstado: EscudoMestreEstado = {
      ...escudo,
      turno: idx,
    };
    setEscudo(novoEstado);
    await salvarEscudoRemoto(novoEstado);
  };

  const mudarTurnoDelta = async (delta: -1 | 1) => {
    const len = escudo.iniciativa.length;
    if (len === 0) return;
    const proximo = (escudo.turno + delta + len) % len;
    const novoEstado: EscudoMestreEstado = {
      ...escudo,
      turno: proximo,
    };
    setEscudo(novoEstado);
    await salvarEscudoRemoto(novoEstado);
  };

  const removerItemIniciativa = async (id: string) => {
    const novaLista = escudo.iniciativa.filter((item) => item.id !== id);
    const novoTurno =
      novaLista.length === 0 || escudo.turno >= novaLista.length
        ? 0
        : escudo.turno;
    const novoEstado: EscudoMestreEstado = {
      ...escudo,
      iniciativa: novaLista,
      turno: novoTurno,
      iniciativa_definida:
        novaLista.length === 0 ? false : escudo.iniciativa_definida,
    };
    setEscudo(novoEstado);
    await salvarEscudoRemoto(novoEstado);
  };

  const limparIniciativa = async () => {
    if (!window.confirm("Encerrar e limpar toda a lista de iniciativa?"))
      return;
    const novoEstado: EscudoMestreEstado = {
      ...escudo,
      iniciativa: [],
      turno: 0,
      iniciativa_definida: false,
    };
    setEscudo(novoEstado);
    await salvarEscudoRemoto(novoEstado);
  };

  // --- Ameaças & PdMs ---
  const salvarListaAmeacas = async (novas: AmeacaCronica[]) => {
    const novoEstado: EscudoMestreEstado = {
      ...escudo,
      ameacas: novas,
    };
    setEscudo(novoEstado);
    return salvarEscudoRemoto(novoEstado);
  };

  const enviarAmeacaParaIniciativa = async (
    ameaca: AmeacaCronica,
    visivelParcial: boolean
  ) => {
    const novoItem: ItemIniciativa = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      nome: ameaca.nome,
      detalhe: `${ameaca.categoria}${ameaca.dificuldadePadrao ? ` · Dif. ${ameaca.dificuldadePadrao}` : ""}`,
      tipo: "npc",
      valor: 0,
      visivel: visivelParcial,
    };
    const novoEstado: EscudoMestreEstado = {
      ...escudo,
      iniciativa: [...escudo.iniciativa, novoItem],
    };
    setEscudo(novoEstado);
    if (await salvarEscudoRemoto(novoEstado)) {
      onNotify(`"${ameaca.nome}" enviada para a aba Iniciativa!`, "sucesso");
    }
  };

  // --- Anotações (com Auto-Save) ---
  const alterarAnotacoesComAutoSave = (texto: string) => {
    const novoEstado: EscudoMestreEstado = { ...escudo, notas: texto };
    setEscudo(novoEstado);
    setStatusNotas("pendente");
    if (timerNotasRef.current) {
      clearTimeout(timerNotasRef.current);
    }
    timerNotasRef.current = setTimeout(async () => {
      timerNotasRef.current = null;
      if (await salvarEscudoRemoto(novoEstado)) {
        setStatusNotas("salvo");
      }
    }, 1500);
  };

  const salvarAnotacoes = async () => {
    if (timerNotasRef.current) {
      clearTimeout(timerNotasRef.current);
      timerNotasRef.current = null;
    }
    if (await salvarEscudoRemoto(escudo)) {
      setStatusNotas("salvo");
      onNotify("Anotações do mestre salvas.", "sucesso");
    }
  };

  // Consolida todas as jogadas de jogadores (tabela pública + fichas salvas) para o histórico do Mestre
  const todasJogadasJogadoresParaMestre = useMemo(() => {
    const mapa = new Map<string, RolagemJogadorFeedItem>();
    for (const r of rolagensJogadoresDb) {
      const chave = `${r.fichaId || "sem-ficha"}:${r.rolagemId || r.id}`;
      mapa.set(chave, r);
    }
    for (const ficha of todasFichas) {
      const lista = Array.isArray(ficha.dados?.rolagens)
        ? ficha.dados.rolagens
        : [];
      for (const rol of lista) {
        const chave = `${ficha.id}:${rol.id}`;
        if (!mapa.has(chave)) {
          mapa.set(chave, {
            id: chave,
            ownerEmail: ficha.owner_email || "",
            fichaId: ficha.id,
            rolagemId: rol.id,
            subgrupoId: rol.subgrupoId || null,
            subgrupoNome: rol.subgrupoNome || "",
            personagem: nomeFichaMesa(ficha),
            jogador: ficha.dados?.identidade?.jogador || "",
            descricao: rol.descricao || "Rolagem",
            resultado: rol,
            createdAt: rol.data,
          });
        }
      }
    }
    return [...mapa.values()];
  }, [rolagensJogadoresDb, todasFichas]);

  const fichasFiltradas = useMemo(() => {
    const q = buscaFicha.trim().toLowerCase();
    if (!q) return todasFichas;
    return todasFichas.filter(
      (f) =>
        nomeFichaMesa(f).toLowerCase().includes(q) ||
        f.owner_email.toLowerCase().includes(q) ||
        jogadorFichaMesa(f).toLowerCase().includes(q)
    );
  }, [todasFichas, buscaFicha]);

  const abas: Array<{
    id: AbaEscudoId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }> = [
    {
      id: "raiox",
      label: "Raio-X da Célula",
      icon: ScanEye,
      badge: fichasCronica.length,
    },
    {
      id: "fichas",
      label: "Fichas & Jogadores",
      icon: Users,
      badge: todasFichas.length,
    },
    {
      id: "grupos",
      label: "Grupos",
      icon: Layers,
      badge: subgrupos.length,
    },
    {
      id: "ameacas",
      label: "Ameaças & PdMs",
      icon: Skull,
      badge: escudo.ameacas.length || undefined,
    },
    {
      id: "rolagens",
      label: "Rolagens e Grid",
      icon: Dices,
    },
    {
      id: "iniciativa",
      label: "Iniciativa",
      icon: ListOrdered,
      badge: escudo.iniciativa.length || undefined,
    },
    {
      id: "notas",
      label: "Anotações",
      icon: FileText,
    },
    {
      id: "admin",
      label: "Admin (Contas)",
      icon: UserCog,
    },
  ];

  const inputCls =
    "w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#f08b21] transition";

  return (
    <section className="space-y-5">
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
              Controle centralizado da crônica, grupos, iniciativa, rolagens e
              credenciais de acesso.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => carregarTudo(false)}
          disabled={carregando}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-semibold uppercase tracking-wider transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw
            className={`w-4 h-4 ${carregando ? "animate-spin" : ""}`}
          />
          Sincronizar Escudo
        </button>
      </div>

      {/* Navegação por Abas do Escudo */}
      <nav
        aria-label="Seções do Escudo do Mestre"
        className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-zinc-800"
      >
        {abas.map((aba) => {
          const Icon = aba.icon;
          const ativa = abaAtiva === aba.id;
          return (
            <button
              key={aba.id}
              type="button"
              onClick={() => setAbaAtiva(aba.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold uppercase tracking-wider whitespace-nowrap border-b-2 transition cursor-pointer ${
                ativa
                  ? "border-[#f08b21] text-[#f08b21] bg-[#141416]"
                  : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{aba.label}</span>
              {aba.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    ativa
                      ? "bg-[#f08b21]/20 text-[#f08b21]"
                      : "bg-zinc-900 text-zinc-400"
                  }`}
                >
                  {aba.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ABA 0: RAIO-X DA CÉLULA */}
      {abaAtiva === "raiox" && (
        <AbaRaioXCelula
          fichasCronica={fichasCronica}
          subgrupos={subgrupos}
          carregando={carregando}
          onAtualizar={() => carregarTudo(false)}
          onEditarFichaAdmin={onEditarFichaAdmin}
          onIrParaFichas={() => setAbaAtiva("fichas")}
        />
      )}

      {/* ABA AMEAÇAS & PDMS */}
      {abaAtiva === "ameacas" && (
        <AbaAmeacasPdms
          ameacas={escudo.ameacas}
          onSalvarAmeacas={salvarListaAmeacas}
          onEnviarParaIniciativa={enviarAmeacaParaIniciativa}
          onRolagemRegistrada={() => carregarTudo(true)}
          onNotify={onNotify}
        />
      )}

      {/* ABA 1: FICHAS & JOGADORES */}
      {abaAtiva === "fichas" && (
        <div className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-100">
                Fichas &amp; Jogadores ({todasFichas.length})
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Marque a caixinha <strong>Crônica</strong> nas fichas que
                participam da campanha atual ou clique em{" "}
                <strong>Editar ficha</strong> para alterar qualquer atributo sem
                travas.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={buscaFicha}
                onChange={(e) => setBuscaFicha(e.target.value)}
                placeholder="Buscar caçador ou e-mail..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#f08b21]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fichasFiltradas.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-6">
                Nenhuma ficha encontrada.
              </p>
            ) : (
              fichasFiltradas.map((ficha) => {
                const naCronica = escudo.ficha_ids.includes(ficha.id);
                return (
                  <div
                    key={ficha.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition ${
                      naCronica
                        ? "bg-zinc-900/70 border-[#f08b21]/40"
                        : "bg-zinc-950/70 border-zinc-800"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm text-zinc-100 truncate">
                          {nomeFichaMesa(ficha)}
                        </strong>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                            ficha.dados?.estado?.finalizada
                              ? "bg-emerald-950/70 text-emerald-300 border border-emerald-800/60"
                              : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                          }`}
                        >
                          {ficha.dados?.estado?.finalizada
                            ? "Finalizada"
                            : "Rascunho"}
                        </span>
                      </div>
                      <span className="block text-xs text-zinc-400 truncate mt-0.5">
                        {ficha.owner_email}
                        {ficha.dados?.identidade?.jogador
                          ? ` (${ficha.dados.identidade.jogador})`
                          : ""}
                      </span>
                      <span className="block text-[11px] text-zinc-500 mt-0.5">
                        Atualizada em {formatarData(ficha.updated_at)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 cursor-pointer select-none px-2 py-1 rounded bg-zinc-950/80 border border-zinc-800">
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Editar ficha
                      </button>

                      <button
                        type="button"
                        onClick={() => excluirFichaPeloMestre(ficha)}
                        title="Excluir ficha"
                        className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/60 text-zinc-400 hover:text-red-300 border border-zinc-800 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ABA 2: GRUPOS */}
      {abaAtiva === "grupos" && (
        <div className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-5">
          <div>
            <h3 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-100">
              Subgrupos da Crônica, Desespero e Perigo
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Organize células ou subgrupos divididos na cena e ajuste os níveis
              de Desespero e Perigo sincronizados com as fichas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px_130px_auto] gap-3 items-end bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-xl">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Nome do subgrupo
              </label>
              <input
                type="text"
                value={novoSubNome}
                onChange={(e) => setNovoSubNome(e.target.value)}
                placeholder="Ex: Célula Principal / Grupo no Hospital"
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
                onChange={(e) =>
                  setNovoSubDesespero(Number(e.target.value || 0))
                }
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
              Criar grupo
            </button>
          </div>

          <div className="space-y-4">
            {subgrupos.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-4">
                Nenhum subgrupo criado ainda.
              </p>
            ) : (
              subgrupos.map((sub, idx) => (
                <div
                  key={sub.id}
                  className="p-4 sm:p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                        Nome do Grupo
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
                      <label className="block text-xs font-semibold uppercase tracking-wider text-amber-300/90 mb-1">
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
                      <label className="block text-xs font-semibold uppercase tracking-wider text-red-400/90 mb-1">
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
                      Membros deste Grupo
                    </span>
                    {fichasCronica.length === 0 ? (
                      <p className="text-xs text-zinc-500">
                        Vá até a aba <strong>Fichas &amp; Jogadores</strong> e
                        marque fichas como &quot;Crônica&quot; para alocá-las.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2.5">
                        {fichasCronica.map((ficha) => {
                          const checked = sub.membrosEdit.includes(ficha.id);
                          return (
                            <label
                              key={ficha.id}
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition ${
                                checked
                                  ? "bg-[#f08b21]/15 border-[#f08b21]/50 text-zinc-100"
                                  : "bg-zinc-900 border-zinc-800 text-zinc-400"
                              }`}
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
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs transition cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Salvar grupo
                    </button>
                    <button
                      type="button"
                      onClick={() => excluirSubgrupo(sub.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/60 text-zinc-300 hover:text-red-300 border border-zinc-800 text-xs transition cursor-pointer"
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
      )}

      {/* ABA 3: ROLAGENS & HISTÓRICO CENTRALIZADO DO MESTRE */}
      {abaAtiva === "rolagens" && (
        <div className="space-y-6">
          {/* Rolador do Mestre */}
          <div className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-4">
            <h3 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-100 flex items-center gap-2">
              <Dices className="w-5 h-5 text-[#f08b21]" />
              Rolagem do Mestre
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_110px_110px_150px_auto] gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  value={mestreDesc}
                  onChange={(e) => setMestreDesc(e.target.value)}
                  placeholder="Ex: Percepção da Presa / Ataque"
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
              <button
                type="button"
                onClick={rolarPeloMestre}
                className="px-5 py-2 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider h-[38px] transition cursor-pointer"
              >
                Rolar
              </button>
            </div>
          </div>

          {/* Histórico Centralizado (Estilo Mestre: Públicas + Privadas + Jogadores) */}
          <div className="bg-[#141416] border border-zinc-800/90 rounded-xl p-2 sm:p-3">
            <HistoricoCentralizado
              estilo="mestre"
              userEmail={userEmail}
              publicasMestre={rolagensMestre.publicas}
              privadasMestre={rolagensMestre.privadas}
              jogadores={todasJogadasJogadoresParaMestre}
              carregando={carregando}
              aoVivo={true}
              onAtualizar={() => carregarTudo(false)}
              onLimparTudo={limparTodoHistoricoRolagens}
            />
          </div>

          {/* Grid Tático Completo do Mestre no final da aba Rolagens e Grid */}
          <div className="bg-[#141416] border border-zinc-800/90 rounded-xl p-2 sm:p-3">
            <GridTaticoCombate
              modo="mestre"
              autenticado={true}
              userEmail={userEmail}
              fichasCronicaMestre={fichasCronica}
              ameacasMestre={escudo.ameacas}
              onNotify={onNotify}
            />
          </div>
        </div>
      )}

      {/* ABA 4: INICIATIVA (NOVO FLUXO COMPLETO) */}
      {abaAtiva === "iniciativa" && (
        <div className="space-y-6">
          {/* Painel de Visibilidade para os Jogadores */}
          <div className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-100">
                  Visibilidade da Iniciativa para Jogadores
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Altere a qualquer momento como os jogadores participantes veem
                  a aba <strong>Iniciativa</strong> nas fichas deles.
                </p>
              </div>
              <span
                className={`self-start sm:self-auto px-2.5 py-1 rounded-full text-xs font-semibold ${
                  escudo.iniciativa_definida
                    ? "bg-emerald-950/70 text-emerald-300 border border-emerald-800/60"
                    : "bg-amber-950/70 text-amber-300 border border-amber-800/60"
                }`}
              >
                {escudo.iniciativa_definida
                  ? "Iniciativa Definida (Ativa)"
                  : "Em preparação"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(
                [
                  {
                    id: "total",
                    titulo: "Visibilidade Total",
                    desc: "Todos os jogadores na iniciativa veem a lista completa de participantes e posições.",
                    icon: Eye,
                  },
                  {
                    id: "parcial",
                    titulo: "Visibilidade Parcial",
                    desc: "Jogadores na iniciativa veem apenas a posição real dos membros marcados com olho visível.",
                    icon: ShieldAlert,
                  },
                  {
                    id: "invisivel",
                    titulo: "Invisível",
                    desc: "Ninguém consegue ver a iniciativa, exceto o Mestre.",
                    icon: EyeOff,
                  },
                ] as const
              ).map((opcao) => {
                const Icon = opcao.icon;
                const selecionado =
                  escudo.iniciativa_visibilidade === opcao.id;
                return (
                  <button
                    key={opcao.id}
                    type="button"
                    onClick={() => alterarVisibilidadeGlobal(opcao.id)}
                    className={`text-left p-4 rounded-xl border transition cursor-pointer ${
                      selecionado
                        ? "bg-[#f08b21]/12 border-[#f08b21] shadow-[0_0_15px_rgba(240,139,33,0.12)]"
                        : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon
                        className={`w-4 h-4 ${
                          selecionado ? "text-[#f08b21]" : "text-zinc-400"
                        }`}
                      />
                      <strong
                        className={`text-sm ${
                          selecionado ? "text-[#f08b21]" : "text-zinc-200"
                        }`}
                      >
                        {opcao.titulo}
                      </strong>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {opcao.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Passo 1: Inserir Participantes */}
          <div className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-100">
                  1. Inserir Participantes
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Insira todos os combatentes primeiro e depois preencha os
                  valores de iniciativa na lista abaixo.
                </p>
              </div>

              <button
                type="button"
                onClick={adicionarTodosJogadoresCronica}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider transition cursor-pointer self-start sm:self-auto"
              >
                <Users className="w-4 h-4" />
                Adicionar todos da crônica ({fichasCronica.length})
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Inserir jogador individual */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2.5 items-end bg-zinc-900/40 border border-zinc-800/80 p-3.5 rounded-xl">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Adicionar jogador específico
                  </label>
                  <select
                    value={iniFichaId}
                    onChange={(e) => setIniFichaId(e.target.value)}
                    className={inputCls}
                  >
                    {fichasCronica.length === 0 ? (
                      <option value="">Nenhuma ficha marcada na crônica</option>
                    ) : (
                      fichasCronica.map((f) => (
                        <option key={f.id} value={f.id}>
                          {nomeFichaMesa(f)}
                          {jogadorFichaMesa(f)
                            ? ` — ${jogadorFichaMesa(f)}`
                            : ""}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={adicionarUmJogadorIniciativa}
                  className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold h-[38px] transition cursor-pointer"
                >
                  + Inserir Jogador
                </button>
              </div>

              {/* Inserir NPC / Ameaça */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2.5 items-end bg-zinc-900/40 border border-zinc-800/80 p-3.5 rounded-xl">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Adicionar Ameaça / NPC
                  </label>
                  <input
                    type="text"
                    value={iniOutroNome}
                    onChange={(e) => setIniOutroNome(e.target.value)}
                    placeholder="Ex: Vampiro, Capanga, Emboscada..."
                    className={inputCls}
                  />
                </div>
                <label className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 h-[38px] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={iniOutroVisivelParcial}
                    onChange={(e) =>
                      setIniOutroVisivelParcial(e.target.checked)
                    }
                    className="rounded border-zinc-700 bg-zinc-900 accent-[#f08b21]"
                  />
                  Visível na Parcial
                </label>
                <button
                  type="button"
                  onClick={adicionarOutroIniciativa}
                  className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold h-[38px] transition cursor-pointer"
                >
                  + Inserir Outro
                </button>
              </div>
            </div>
          </div>

          {/* Passo 2: Definir Valores, Controlar Turnos e Modificar Ordem */}
          <div className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-100">
                  2. Valores, Ordem e Turnos ({escudo.iniciativa.length})
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Digite a iniciativa de todos e clique em{" "}
                  <strong>Definir e Ordenar</strong>. Use as setas{" "}
                  <strong>↑ / ↓</strong> para ajustar a ordem manualmente a
                  qualquer momento e o ícone de <strong>olho</strong> para a
                  Visibilidade Parcial.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={definirEOrdenarIniciativa}
                  disabled={escudo.iniciativa.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider disabled:opacity-40 transition cursor-pointer"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  {escudo.iniciativa_definida
                    ? "Reordenar por valor"
                    : "Definir e Ordenar"}
                </button>

                <button
                  type="button"
                  onClick={salvarValoresSemReordenar}
                  disabled={escudo.iniciativa.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-medium disabled:opacity-40 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Salvar valores
                </button>

                <button
                  type="button"
                  onClick={() => mudarTurnoDelta(-1)}
                  disabled={escudo.iniciativa.length === 0}
                  title="Turno anterior"
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-medium disabled:opacity-40 transition cursor-pointer"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => mudarTurnoDelta(1)}
                  disabled={escudo.iniciativa.length === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold text-xs uppercase tracking-wider disabled:opacity-40 transition cursor-pointer"
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

            {escudo.iniciativa.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-zinc-800 rounded-xl">
                <p className="text-xs text-zinc-500">
                  Nenhum participante inserido na iniciativa ainda.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {escudo.iniciativa.map((item, idx) => {
                  const ativo =
                    escudo.iniciativa_definida && idx === escudo.turno;
                  const visivelParcial = Boolean(item.visivel);

                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl border transition ${
                        ativo
                          ? "bg-[#f08b21]/12 border-[#f08b21] shadow-[0_0_14px_rgba(240,139,33,0.16)]"
                          : "bg-zinc-950 border-zinc-800"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-9 h-9 rounded-lg font-display font-bold text-base flex items-center justify-center shrink-0 tabular-nums ${
                            ativo
                              ? "bg-[#f08b21] text-zinc-950"
                              : "bg-zinc-900 text-zinc-300 border border-zinc-800"
                          }`}
                        >
                          {idx + 1}º
                        </span>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-sm text-zinc-100 truncate">
                              {item.nome}
                            </strong>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                item.tipo === "jogador"
                                  ? "bg-zinc-900 text-zinc-300 border border-zinc-700"
                                  : "bg-red-950/60 text-red-300 border border-red-800/50"
                              }`}
                            >
                              {item.tipo === "jogador" ? "Jogador" : "NPC"}
                            </span>
                            {ativo && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                                Turno Atual
                              </span>
                            )}
                          </div>
                          {item.detalhe && (
                            <span className="block text-xs text-zinc-500 truncate">
                              {item.detalhe}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {/* Input de valor de iniciativa */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                            Inic.:
                          </span>
                          <input
                            type="number"
                            value={item.valor}
                            onChange={(e) =>
                              atualizarValorItemLocal(
                                item.id,
                                Number(e.target.value || 0)
                              )
                            }
                            className="w-20 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-sm font-display font-bold text-center text-zinc-100 focus:outline-none focus:border-[#f08b21]"
                          />
                        </div>

                        {/* Subir / Descer ordem manualmente */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moverItemOrdem(idx, -1)}
                            title="Subir na ordem"
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 disabled:opacity-30 transition cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === escudo.iniciativa.length - 1}
                            onClick={() => moverItemOrdem(idx, 1)}
                            title="Descer na ordem"
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 disabled:opacity-30 transition cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Toggle de visibilidade individual para Visibilidade Parcial */}
                        <button
                          type="button"
                          onClick={() => alternarVisivelItemParcial(item.id)}
                          title={
                            visivelParcial
                              ? "Visível para jogadores na Visibilidade Parcial (clique para ocultar)"
                              : "Oculto na Visibilidade Parcial (clique para revelar)"
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                            visivelParcial
                              ? "bg-emerald-950/60 border-emerald-700/60 text-emerald-300"
                              : "bg-zinc-900 border-zinc-800 text-zinc-500"
                          }`}
                        >
                          {visivelParcial ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">Visível</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">Oculto</span>
                            </>
                          )}
                        </button>

                        {/* Definir turno diretamente neste combatente */}
                        {escudo.iniciativa_definida && !ativo && (
                          <button
                            type="button"
                            onClick={() => definirTurnoDireto(idx)}
                            title="Colocar o turno atual neste participante"
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-[#f08b21] border border-zinc-800 transition cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Remover */}
                        <button
                          type="button"
                          onClick={() => removerItemIniciativa(item.id)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition cursor-pointer"
                          aria-label="Remover da iniciativa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 5: ANOTAÇÕES */}
      {abaAtiva === "notas" && (
        <div className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 flex flex-col space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-100">
                Anotações Privadas da Crônica
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Registre pistas, PdMs, ameaças, relógios e consequências da
                sessão.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {statusNotas !== "idle" && (
                <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  {statusNotas === "pendente"
                    ? "Auto-save..."
                    : "Salvo automaticamente"}
                </span>
              )}
              <button
                type="button"
                onClick={salvarAnotacoes}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Salvar anotações
              </button>
            </div>
          </div>

          <textarea
            rows={16}
            value={escudo.notas}
            onChange={(e) => alterarAnotacoesComAutoSave(e.target.value)}
            placeholder="Notas privadas da sessão, pistas, monstros, consequências..."
            className={`${inputCls} min-h-[360px] leading-relaxed`}
          />
        </div>
      )}

      {/* ABA 6: ADMIN (CONTAS E CREDENCIAIS) */}
      {abaAtiva === "admin" && <AbaAdminContas onNotify={onNotify} />}

      <ModalSimulacaoRolagem
        evento={eventoAnimacaoMestre}
        onFechar={() => setEventoAnimacaoMestre(null)}
      />
    </section>
  );
}
