"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CloudFog,
  Eye,
  EyeOff,
  Hand,
  Lock,
  MapPin,
  Maximize2,
  Minimize2,
  MousePointer,
  Plus,
  RefreshCw,
  Ruler,
  Settings,
  Sun,
  Trash2,
  Unlock,
  UserPlus,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { WidgetUltimaRolagemCanto } from "@/components/SimulacaoDadosTela";
import type {
  AmeacaCronica,
  FichaResumoOnline,
  MapaTaticoEstado,
  TemaFundoMapa,
  TokenMapa,
  UltimaRolagemResumo,
} from "@/types/ficha";

const CELL_PX = 48;

const CORES_TOKEN = [
  "#f08b21",
  "#10b981",
  "#3b82f6",
  "#a855f7",
  "#ef4444",
  "#eab308",
  "#ec4899",
  "#71717a",
];

const TEMAS_FUNDO: Array<{
  id: TemaFundoMapa;
  label: string;
  estiloCss: React.CSSProperties;
}> = [
  {
    id: "asfalto",
    label: "Asfalto Urbano Noturno",
    estiloCss: {
      backgroundColor: "#141519",
      backgroundImage:
        "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 0), linear-gradient(135deg, #181a20 0%, #0f1014 100%)",
      backgroundSize: "16px 16px, 100% 100%",
    },
  },
  {
    id: "galpao",
    label: "Galpão / Fábrica Abandonada",
    estiloCss: {
      backgroundColor: "#1c1917",
      backgroundImage:
        "repeating-linear-gradient(45deg, rgba(240,139,33,0.03) 0px, rgba(240,139,33,0.03) 12px, transparent 12px, transparent 24px), linear-gradient(180deg, #211d1a 0%, #141210 100%)",
    },
  },
  {
    id: "hospital",
    label: "Hospital / Necrotério",
    estiloCss: {
      backgroundColor: "#111b1e",
      backgroundImage:
        "radial-gradient(circle at 50% 50%, rgba(45,212,191,0.06), transparent 70%), linear-gradient(180deg, #132226 0%, #0b1316 100%)",
    },
  },
  {
    id: "subterraneo",
    label: "Subterrâneo / Esgoto",
    estiloCss: {
      backgroundColor: "#12130f",
      backgroundImage:
        "radial-gradient(rgba(132,204,22,0.04) 2px, transparent 0), linear-gradient(180deg, #171912 0%, #0c0d09 100%)",
      backgroundSize: "24px 24px, 100% 100%",
    },
  },
  {
    id: "floresta",
    label: "Mata Escura / Cemitério",
    estiloCss: {
      backgroundColor: "#0d1612",
      backgroundImage:
        "radial-gradient(rgba(16,185,129,0.05) 2px, transparent 0), linear-gradient(180deg, #101e17 0%, #09110d 100%)",
      backgroundSize: "20px 20px, 100% 100%",
    },
  },
];

type FerramentaMestre =
  | "mover"
  | "fog_cobrir"
  | "fog_revelar"
  | "regua"
  | "pan";

interface FichaDisponivelJogador {
  id: string;
  nome: string;
  sigla: string;
}

interface GridTaticoCombateProps {
  modo: "jogador" | "mestre";
  autenticado: boolean;
  fichaAtualId?: string | null;
  nomePersonagemAtual?: string;
  userEmail?: string;
  fichasCronicaMestre?: FichaResumoOnline[];
  ameacasMestre?: AmeacaCronica[];
  onNotify: (msg: string, tipo?: "erro" | "info" | "sucesso") => void;
}

function gerarSigla(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "CA";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

const MAPA_INICIAL: MapaTaticoEstado = {
  visivelJogadores: false,
  movimentoJogadoresLiberado: true,
  titulo: "Cena de Conflito",
  imagemUrl: "",
  temaFundo: "asfalto",
  colunas: 20,
  linhas: 14,
  opacidadeGrid: 0.28,
  corGrid: "#ffffff",
  fogCelulas: [],
  tokens: [],
};

export function GridTaticoCombate({
  modo,
  autenticado,
  fichaAtualId = null,
  nomePersonagemAtual = "",
  userEmail = "",
  fichasCronicaMestre = [],
  ameacasMestre = [],
  onNotify,
}: GridTaticoCombateProps) {
  const [carregando, setCarregando] = useState(true);
  const [visivelParaJogador, setVisivelParaJogador] = useState(false);
  const [mapa, setMapa] = useState<MapaTaticoEstado>(MAPA_INICIAL);
  const [minhasFichas, setMinhasFichas] = useState<FichaDisponivelJogador[]>(
    []
  );
  const [ultimaRolagem, setUltimaRolagem] =
    useState<UltimaRolagemResumo | null>(null);

  // Controles visuais locais de câmera e ferramentas
  const [zoom, setZoom] = useState(1);
  const [telaCheia, setTelaCheia] = useState(false);
  const [ferramenta, setFerramenta] = useState<FerramentaMestre>("mover");
  const [configAberta, setConfigAberta] = useState(false);

  // Estado de posicionamento/arrasto de token
  const [corMeuToken, setCorMeuToken] = useState("#f08b21");
  const [aguardandoCliquePosicionar, setAguardandoCliquePosicionar] =
    useState(false);
  const [arrastandoToken, setArrastandoToken] = useState<{
    token: TokenMapa;
    alvoX: number;
    alvoY: number;
  } | null>(null);

  // Estado de retângulo de Fog (Mestre) e Régua
  const [selecaoFog, setSelecaoFog] = useState<{
    inicioX: number;
    inicioY: number;
    fimX: number;
    fimY: number;
  } | null>(null);

  const [regua, setRegua] = useState<{
    inicioX: number;
    inicioY: number;
    fimX: number;
    fimY: number;
  } | null>(null);

  // Estado de Pan (arrastar scroll da viewport)
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const panStateRef = useRef<{
    ativo: boolean;
    startClientX: number;
    startClientY: number;
    scrollLeft: number;
    scrollTop: number;
  }>({
    ativo: false,
    startClientX: 0,
    startClientY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  // Inserção de tokens pelo Mestre
  const [novoTokNome, setNovoTokNome] = useState("");
  const [novoTokCor, setNovoTokCor] = useState("#ef4444");
  const [novoTokTamanho, setNovoTokTamanho] = useState<1 | 2 | 3>(1);
  const [novoTokOculto, setNovoTokOculto] = useState(false);

  const interagindoRef = useRef(false);

  const carregarMapa = useCallback(
    async (silencioso = false) => {
      if (!autenticado) {
        setCarregando(false);
        return;
      }
      if (silencioso && interagindoRef.current) return;
      if (!silencioso) setCarregando(true);

      try {
        const res = await fetch("/api/mapa", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        setVisivelParaJogador(Boolean(json.visivel));
        setMinhasFichas(json.minhasFichas ?? []);
        setUltimaRolagem(json.ultimaRolagem ?? null);
        if (json.mapa) {
          setMapa(json.mapa);
        }
      } catch {
        // Silencioso
      } finally {
        if (!silencioso) setCarregando(false);
      }
    },
    [autenticado]
  );

  useEffect(() => {
    carregarMapa(false);
    if (!autenticado) return;

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        carregarMapa(true);
      }
    }, 3500);

    const onVis = () => {
      if (document.visibilityState === "visible") {
        carregarMapa(true);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [autenticado, carregarMapa]);

  const salvarMapaMestre = async (novoMapa: MapaTaticoEstado) => {
    setMapa(novoMapa);
    try {
      const res = await fetch("/api/mapa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novoMapa),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        onNotify(j.error || "Erro ao salvar mapa tático.", "erro");
        return false;
      }
      return true;
    } catch {
      onNotify("Falha de conexão ao salvar mapa.", "erro");
      return false;
    }
  };

  const fogSet = useMemo(() => new Set(mapa.fogCelulas), [mapa.fogCelulas]);

  const celulaTemFog = useCallback(
    (x: number, y: number, tamanho = 1) => {
      for (let dx = 0; dx < tamanho; dx += 1) {
        for (let dy = 0; dy < tamanho; dy += 1) {
          if (fogSet.has(`${x + dx},${y + dy}`)) return true;
        }
      }
      return false;
    },
    [fogSet]
  );

  // Identifica a ficha do jogador para colocar/mover token
  const fichaAlvoJogador = useMemo(() => {
    if (fichaAtualId) {
      const achada = minhasFichas.find((f) => f.id === fichaAtualId);
      if (achada) return achada;
    }
    return minhasFichas[0] ?? null;
  }, [fichaAtualId, minhasFichas]);

  const meuTokenNoMapa = useMemo(() => {
    const emailLower = userEmail.trim().toLowerCase();
    if (fichaAlvoJogador) {
      const porFicha = mapa.tokens.find(
        (t) => t.fichaId === fichaAlvoJogador.id
      );
      if (porFicha) return porFicha;
    }
    return (
      mapa.tokens.find(
        (t) =>
          t.tipo === "jogador" &&
          t.ownerEmail &&
          t.ownerEmail.trim().toLowerCase() === emailLower
      ) ?? null
    );
  }, [mapa.tokens, fichaAlvoJogador, userEmail]);

  const tokenPodeSerMovidoPorMim = useCallback(
    (t: TokenMapa) => {
      if (modo === "mestre") return true;
      if (!mapa.movimentoJogadoresLiberado) return false;
      const emailLower = userEmail.trim().toLowerCase();
      if (fichaAlvoJogador && t.fichaId === fichaAlvoJogador.id) return true;
      if (
        minhasFichas.some((mf) => mf.id === t.fichaId) ||
        (t.ownerEmail && t.ownerEmail.trim().toLowerCase() === emailLower)
      ) {
        return true;
      }
      return false;
    },
    [modo, mapa.movimentoJogadoresLiberado, userEmail, fichaAlvoJogador, minhasFichas]
  );

  const converterClientParaCelula = (
    clientX: number,
    clientY: number,
    tamanhoToken = 1
  ): { x: number; y: number } | null => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const escala = CELL_PX * zoom;
    const brutoX = Math.floor((clientX - rect.left) / escala);
    const brutoY = Math.floor((clientY - rect.top) / escala);
    return {
      x: Math.max(0, Math.min(mapa.colunas - tamanhoToken, brutoX)),
      y: Math.max(0, Math.min(mapa.linhas - tamanhoToken, brutoY)),
    };
  };

  // --- Ações do Jogador ---
  const posicionarMeuTokenEm = async (x: number, y: number) => {
    if (!fichaAlvoJogador) {
      onNotify(
        "Salve sua ficha online primeiro para posicionar o token no mapa.",
        "erro"
      );
      return;
    }
    if (modo !== "mestre" && celulaTemFog(x, y, 1)) {
      onNotify(
        "Você não pode colocar seu token em uma área coberta pelo Fog!",
        "erro"
      );
      return;
    }

    setAguardandoCliquePosicionar(false);
    const resp = await fetch("/api/mapa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        acao: "colocar_meu_token",
        fichaId: fichaAlvoJogador.id,
        x,
        y,
        cor: corMeuToken,
      }),
    });
    const json = await resp.json();
    if (!resp.ok) {
      onNotify(json.error || "Não foi possível posicionar o token.", "erro");
      return;
    }
    await carregarMapa(true);
  };

  const recolherMeuToken = async () => {
    if (!meuTokenNoMapa) return;
    const resp = await fetch("/api/mapa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        acao: "recolher_meu_token",
        tokenId: meuTokenNoMapa.id,
      }),
    });
    if (resp.ok) {
      await carregarMapa(true);
    }
  };

  // --- Eventos de Ponteiro no Tabuleiro ---
  const handleBoardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Clique para posicionar o próprio token (Jogador)
    if (aguardandoCliquePosicionar) {
      const cel = converterClientParaCelula(e.clientX, e.clientY, 1);
      if (cel) {
        void posicionarMeuTokenEm(cel.x, cel.y);
      }
      return;
    }

    // Botão do meio ou ferramenta Pan -> arrastar câmera
    if (e.button === 1 || ferramenta === "pan") {
      const vp = viewportRef.current;
      if (!vp) return;
      panStateRef.current = {
        ativo: true,
        startClientX: e.clientX,
        startClientY: e.clientY,
        scrollLeft: vp.scrollLeft,
        scrollTop: vp.scrollTop,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    const cel = converterClientParaCelula(e.clientX, e.clientY, 1);
    if (!cel) return;

    if (
      modo === "mestre" &&
      (ferramenta === "fog_cobrir" || ferramenta === "fog_revelar")
    ) {
      interagindoRef.current = true;
      setSelecaoFog({
        inicioX: cel.x,
        inicioY: cel.y,
        fimX: cel.x,
        fimY: cel.y,
      });
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (ferramenta === "regua") {
      setRegua({
        inicioX: cel.x,
        inicioY: cel.y,
        fimX: cel.x,
        fimY: cel.y,
      });
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handleBoardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (panStateRef.current.ativo) {
      const vp = viewportRef.current;
      if (!vp) return;
      const dx = e.clientX - panStateRef.current.startClientX;
      const dy = e.clientY - panStateRef.current.startClientY;
      vp.scrollLeft = panStateRef.current.scrollLeft - dx;
      vp.scrollTop = panStateRef.current.scrollTop - dy;
      return;
    }

    if (arrastandoToken) {
      const cel = converterClientParaCelula(
        e.clientX,
        e.clientY,
        arrastandoToken.token.tamanho || 1
      );
      if (
        cel &&
        (cel.x !== arrastandoToken.alvoX || cel.y !== arrastandoToken.alvoY)
      ) {
        setArrastandoToken({
          ...arrastandoToken,
          alvoX: cel.x,
          alvoY: cel.y,
        });
      }
      return;
    }

    if (selecaoFog) {
      const cel = converterClientParaCelula(e.clientX, e.clientY, 1);
      if (cel) {
        setSelecaoFog((prev) =>
          prev ? { ...prev, fimX: cel.x, fimY: cel.y } : null
        );
      }
      return;
    }

    if (regua) {
      const cel = converterClientParaCelula(e.clientX, e.clientY, 1);
      if (cel) {
        setRegua((prev) =>
          prev ? { ...prev, fimX: cel.x, fimY: cel.y } : null
        );
      }
    }
  };

  const handleBoardPointerUp = async () => {
    if (panStateRef.current.ativo) {
      panStateRef.current.ativo = false;
      return;
    }

    // Finalizar arrasto de Token
    if (arrastandoToken) {
      const { token, alvoX, alvoY } = arrastandoToken;
      setArrastandoToken(null);
      interagindoRef.current = false;

      if (alvoX === token.x && alvoY === token.y) return;

      if (modo !== "mestre" && celulaTemFog(alvoX, alvoY, token.tamanho || 1)) {
        onNotify(
          "Movimento bloqueado: você não pode mover seu token para dentro do Fog!",
          "erro"
        );
        return;
      }

      const tokensAntigos = mapa.tokens;
      const novosTokens = mapa.tokens.map((t) =>
        t.id === token.id ? { ...t, x: alvoX, y: alvoY } : t
      );

      if (modo === "mestre") {
        await salvarMapaMestre({ ...mapa, tokens: novosTokens });
      } else {
        setMapa((prev) => ({ ...prev, tokens: novosTokens }));
        const resp = await fetch("/api/mapa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            acao: "mover_meu_token",
            tokenId: token.id,
            x: alvoX,
            y: alvoY,
          }),
        });
        if (!resp.ok) {
          const j = await resp.json().catch(() => ({}));
          setMapa((prev) => ({ ...prev, tokens: tokensAntigos }));
          onNotify(j.error || "Movimento não permitido.", "erro");
        }
      }
      return;
    }

    // Finalizar retângulo de Fog (Mestre)
    if (selecaoFog && modo === "mestre") {
      const minX = Math.min(selecaoFog.inicioX, selecaoFog.fimX);
      const maxX = Math.max(selecaoFog.inicioX, selecaoFog.fimX);
      const minY = Math.min(selecaoFog.inicioY, selecaoFog.fimY);
      const maxY = Math.max(selecaoFog.inicioY, selecaoFog.fimY);
      setSelecaoFog(null);
      interagindoRef.current = false;

      const novoSet = new Set(mapa.fogCelulas);
      for (let x = minX; x <= maxX; x += 1) {
        for (let y = minY; y <= maxY; y += 1) {
          const chave = `${x},${y}`;
          if (ferramenta === "fog_cobrir") novoSet.add(chave);
          else novoSet.delete(chave);
        }
      }
      await salvarMapaMestre({ ...mapa, fogCelulas: [...novoSet] });
      return;
    }

    if (regua) {
      setRegua(null);
    }
  };

  // --- Ações Exclusivas do Mestre ---
  const cobrirTudoComFog = async () => {
    const todas: string[] = [];
    for (let x = 0; x < mapa.colunas; x += 1) {
      for (let y = 0; y < mapa.linhas; y += 1) {
        todas.push(`${x},${y}`);
      }
    }
    await salvarMapaMestre({ ...mapa, fogCelulas: todas });
  };

  const revelarTodoFog = async () => {
    await salvarMapaMestre({ ...mapa, fogCelulas: [] });
  };

  const encontrarCelulaInicialLivre = (): { x: number; y: number } => {
    for (let y = 1; y < mapa.linhas - 1; y += 1) {
      for (let x = 1; x < mapa.colunas - 1; x += 1) {
        if (!mapa.tokens.some((t) => t.x === x && t.y === y)) {
          return { x, y };
        }
      }
    }
    return { x: 1, y: 1 };
  };

  const inserirCacadorPeloMestre = async (f: FichaResumoOnline) => {
    const jaExiste = mapa.tokens.some((t) => t.fichaId === f.id);
    if (jaExiste) {
      onNotify("Este caçador já está posicionado no grid.", "info");
      return;
    }
    const nome = f.dados?.identidade?.nome?.trim() || f.nome || "Caçador";
    const pos = encontrarCelulaInicialLivre();
    const novo: TokenMapa = {
      id: `tok-${f.id.slice(0, 8)}`,
      nome,
      cor: "#f08b21",
      sigla: gerarSigla(nome),
      x: pos.x,
      y: pos.y,
      tamanho: 1,
      tipo: "jogador",
      fichaId: f.id,
      ownerEmail: f.owner_email,
      oculto: false,
    };
    await salvarMapaMestre({ ...mapa, tokens: [...mapa.tokens, novo] });
  };

  const inserirAmeacaPeloMestre = async (a: AmeacaCronica) => {
    const pos = encontrarCelulaInicialLivre();
    const novo: TokenMapa = {
      id: `ame-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      nome: a.nome,
      cor: "#dc2626",
      sigla: gerarSigla(a.nome),
      x: pos.x,
      y: pos.y,
      tamanho: 1,
      tipo: "ameaca",
      ameacaId: a.id,
      oculto: true,
    };
    await salvarMapaMestre({ ...mapa, tokens: [...mapa.tokens, novo] });
    onNotify(
      `"${a.nome}" inserida no mapa como Oculta (clique no olho para revelar).`,
      "info"
    );
  };

  const criarTokenAvulsoMestre = async () => {
    if (!novoTokNome.trim()) return;
    const pos = encontrarCelulaInicialLivre();
    const novo: TokenMapa = {
      id: `avulso-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      nome: novoTokNome.trim(),
      cor: novoTokCor,
      sigla: gerarSigla(novoTokNome),
      x: pos.x,
      y: pos.y,
      tamanho: novoTokTamanho,
      tipo: "ameaca",
      oculto: novoTokOculto,
    };
    setNovoTokNome("");
    await salvarMapaMestre({ ...mapa, tokens: [...mapa.tokens, novo] });
  };

  const temaSelecionado =
    TEMAS_FUNDO.find((t) => t.id === mapa.temaFundo) ?? TEMAS_FUNDO[0];

  const larguraPx = mapa.colunas * CELL_PX * zoom;
  const alturaPx = mapa.linhas * CELL_PX * zoom;
  const cellEscalada = CELL_PX * zoom;

  const inputCls =
    "w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#f08b21] transition";

  // Visão quando o jogador não está autenticado ou o Mestre deixou o mapa oculto
  if (modo === "jogador" && !visivelParaJogador) {
    return (
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-6 text-center space-y-2">
        <EyeOff className="w-7 h-7 text-zinc-600 mx-auto" />
        <h3 className="font-display text-lg font-bold uppercase tracking-wide text-zinc-300">
          Grid Tático Oculto
        </h3>
        <p className="text-xs text-zinc-500">
          {carregando
            ? "Carregando grid tático..."
            : "O Narrador ainda não liberou um mapa tático para esta cena."}
        </p>
      </div>
    );
  }

  const distanciaReguaCasas = regua
    ? Math.max(
        Math.abs(regua.fimX - regua.inicioX),
        Math.abs(regua.fimY - regua.inicioY)
      )
    : 0;

  return (
    <div
      className={`${
        telaCheia
          ? "fixed inset-0 z-40 bg-[#09090b] p-4 flex flex-col gap-3 overflow-y-auto"
          : "bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 sm:p-5 space-y-4"
      }`}
    >
      {/* CABEÇALHO DO GRID */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-100">
            Grid Tático · {mapa.titulo || "Cena de Conflito"}
          </h3>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Ao vivo
          </span>
        </div>

        {/* Controles de Zoom, Régua e Tela Cheia */}
        <div className="flex flex-wrap items-center gap-1.5">
          {modo === "jogador" && (
            <button
              type="button"
              onClick={() =>
                setFerramenta((f) => (f === "regua" ? "mover" : "regua"))
              }
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                ferramenta === "regua"
                  ? "bg-[#f08b21] text-zinc-950 border-[#f08b21]"
                  : "bg-zinc-950 text-zinc-300 border-zinc-800 hover:bg-zinc-900"
              }`}
            >
              <Ruler className="w-3.5 h-3.5" />
              Régua
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))
            }
            className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 text-zinc-300 border border-zinc-800 cursor-pointer"
            title="Diminuir zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="px-2 py-1 rounded-lg bg-zinc-950 text-zinc-300 border border-zinc-800 text-xs font-mono cursor-pointer"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() =>
              setZoom((z) => Math.min(1.8, Number((z + 0.15).toFixed(2))))
            }
            className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 text-zinc-300 border border-zinc-800 cursor-pointer"
            title="Aumentar zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => carregarMapa(false)}
            className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 text-zinc-300 border border-zinc-800 cursor-pointer"
            title="Sincronizar mapa"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setTelaCheia((v) => !v)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 text-zinc-300 border border-zinc-800 text-xs cursor-pointer"
          >
            {telaCheia ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                Reduzir
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                Expandir
              </>
            )}
          </button>
        </div>
      </div>

      {/* BARRA EXCLUSIVA DO JOGADOR: ÁREA PARA COLOCAR E GERENCIAR SEU TOKEN */}
      {modo === "jogador" && (
        <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div
              style={{ backgroundColor: meuTokenNoMapa?.cor || corMeuToken }}
              className="w-9 h-9 rounded-full border-2 border-white/80 text-zinc-950 font-display font-bold text-sm flex items-center justify-center shadow"
            >
              {meuTokenNoMapa?.sigla ||
                fichaAlvoJogador?.sigla ||
                gerarSigla(nomePersonagemAtual || "Caçador")}
            </div>

            <div>
              <strong className="block text-xs sm:text-sm text-zinc-100">
                {meuTokenNoMapa
                  ? `${meuTokenNoMapa.nome} está no mapa (${meuTokenNoMapa.x + 1}, ${meuTokenNoMapa.y + 1})`
                  : `Token de ${fichaAlvoJogador?.nome || nomePersonagemAtual || "Seu Caçador"}`}
              </strong>
              <span className="block text-[11px] text-zinc-400">
                {!mapa.movimentoJogadoresLiberado
                  ? "Movimentação temporariamente pausada pelo Mestre."
                  : aguardandoCliquePosicionar
                    ? "Clique em qualquer quadrado revelado (sem Fog) no mapa abaixo para posicionar!"
                    : meuTokenNoMapa
                      ? "Arraste seu token livremente pelas áreas reveladas (sem Fog)."
                      : "Escolha a cor e clique em 'Colocar no Mapa'."}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!meuTokenNoMapa && (
              <div className="flex items-center gap-1 mr-1">
                {CORES_TOKEN.slice(0, 6).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCorMeuToken(c)}
                    style={{ backgroundColor: c }}
                    className={`w-5 h-5 rounded-full border transition cursor-pointer ${
                      corMeuToken === c
                        ? "border-white scale-115"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                    aria-label="Cor do token"
                  />
                ))}
              </div>
            )}

            {!meuTokenNoMapa ? (
              <button
                type="button"
                disabled={!mapa.movimentoJogadoresLiberado}
                onClick={() => setAguardandoCliquePosicionar((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition cursor-pointer disabled:opacity-40 ${
                  aguardandoCliquePosicionar
                    ? "bg-emerald-500 text-zinc-950"
                    : "bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                {aguardandoCliquePosicionar
                  ? "Clique no mapa..."
                  : "Colocar meu token"}
              </button>
            ) : (
              <button
                type="button"
                disabled={!mapa.movimentoJogadoresLiberado}
                onClick={recolherMeuToken}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs transition cursor-pointer disabled:opacity-40"
              >
                Recolher token
              </button>
            )}
          </div>
        </div>
      )}

      {/* BARRA DE FERRAMENTAS E CONFIGURAÇÃO DO MESTRE */}
      {modo === "mestre" && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800 flex flex-wrap items-center justify-between gap-2.5">
            {/* Visibilidade e trava */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  salvarMapaMestre({
                    ...mapa,
                    visivelJogadores: !mapa.visivelJogadores,
                  })
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  mapa.visivelJogadores
                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/70"
                    : "bg-zinc-900 text-zinc-400 border-zinc-700"
                }`}
              >
                {mapa.visivelJogadores ? (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    Visível p/ Jogadores
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    Oculto p/ Jogadores
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  salvarMapaMestre({
                    ...mapa,
                    movimentoJogadoresLiberado:
                      !mapa.movimentoJogadoresLiberado,
                  })
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                  mapa.movimentoJogadoresLiberado
                    ? "bg-zinc-900 text-zinc-200 border-zinc-700"
                    : "bg-red-950/70 text-red-300 border-red-800/70"
                }`}
              >
                {mapa.movimentoJogadoresLiberado ? (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                    Movimento Livre
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-red-400" />
                    Movimento Travado
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setConfigAberta((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                  configAberta
                    ? "bg-[#f08b21] text-zinc-950 border-[#f08b21]"
                    : "bg-zinc-900 text-zinc-200 border-zinc-700"
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                Configurar Mapa &amp; Tokens
              </button>
            </div>

            {/* Ferramentas de Interação e Fog */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "mover", label: "Mover", icon: MousePointer },
                  { id: "fog_cobrir", label: "Cobrir Fog", icon: CloudFog },
                  { id: "fog_revelar", label: "Revelar Fog", icon: Sun },
                  { id: "regua", label: "Régua", icon: Ruler },
                  { id: "pan", label: "Câmera", icon: Hand },
                ] as const
              ).map((tool) => {
                const Icon = tool.icon;
                const ativa = ferramenta === tool.id;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => setFerramenta(tool.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      ativa
                        ? "bg-[#f08b21] text-zinc-950 border-[#f08b21]"
                        : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tool.label}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={cobrirTudoComFog}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs cursor-pointer"
                title="Cobrir todo o mapa com Névoa"
              >
                Tudo Fog
              </button>
              <button
                type="button"
                onClick={revelarTodoFog}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs cursor-pointer"
                title="Limpar toda a Névoa"
              >
                Limpar Fog
              </button>
            </div>
          </div>

          {/* Painel Expansível de Configuração do Mapa e Tokens */}
          {configAberta && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Nome da Cena
                  </label>
                  <input
                    type="text"
                    value={mapa.titulo}
                    onChange={(e) =>
                      setMapa({ ...mapa, titulo: e.target.value })
                    }
                    className={inputCls}
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    URL da Imagem do Mapa (opcional)
                  </label>
                  <input
                    type="url"
                    value={mapa.imagemUrl}
                    onChange={(e) =>
                      setMapa({ ...mapa, imagemUrl: e.target.value })
                    }
                    placeholder="https://... (deixe vazio para usar tema tático)"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Tema de Fundo
                  </label>
                  <select
                    value={mapa.temaFundo}
                    onChange={(e) =>
                      setMapa({
                        ...mapa,
                        temaFundo: e.target.value as TemaFundoMapa,
                      })
                    }
                    className={inputCls}
                  >
                    {TEMAS_FUNDO.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                      Colunas
                    </label>
                    <input
                      type="number"
                      min={6}
                      max={40}
                      value={mapa.colunas}
                      onChange={(e) =>
                        setMapa({
                          ...mapa,
                          colunas: Math.max(
                            6,
                            Math.min(40, Number(e.target.value || 20))
                          ),
                        })
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                      Linhas
                    </label>
                    <input
                      type="number"
                      min={6}
                      max={32}
                      value={mapa.linhas}
                      onChange={(e) =>
                        setMapa({
                          ...mapa,
                          linhas: Math.max(
                            6,
                            Math.min(32, Number(e.target.value || 14))
                          ),
                        })
                      }
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => salvarMapaMestre(mapa)}
                  className="px-4 py-1.5 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Aplicar configurações do mapa
                </button>
              </div>

              {/* Inserção Rápida de Tokens (Caçadores, Ameaças e Avulsos) */}
              <div className="pt-3 border-t border-zinc-800 space-y-3">
                <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Inserir Tokens no Grid
                </span>

                <div className="flex flex-wrap gap-2">
                  {fichasCronicaMestre.map((f) => {
                    const nome =
                      f.dados?.identidade?.nome?.trim() || f.nome || "Caçador";
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => inserirCacadorPeloMestre(f)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs cursor-pointer"
                      >
                        <UserPlus className="w-3 h-3 text-[#f08b21]" />+ {nome}
                      </button>
                    );
                  })}

                  {ameacasMestre.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => inserirAmeacaPeloMestre(a)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-950/70 text-red-200 border border-red-800/60 text-xs cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      {a.nome}
                    </button>
                  ))}
                </div>

                {/* Criar token avulso */}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px_110px_auto_auto] gap-2 items-end">
                  <input
                    type="text"
                    value={novoTokNome}
                    onChange={(e) => setNovoTokNome(e.target.value)}
                    placeholder="Token avulso (ex: Guarda, Carro, Explosivo...)"
                    className={inputCls}
                  />
                  <select
                    value={novoTokTamanho}
                    onChange={(e) =>
                      setNovoTokTamanho(Number(e.target.value) as 1 | 2 | 3)
                    }
                    className={inputCls}
                  >
                    <option value={1}>Tamanho 1×1</option>
                    <option value={2}>Tamanho 2×2</option>
                    <option value={3}>Tamanho 3×3</option>
                  </select>
                  <input
                    type="color"
                    value={novoTokCor}
                    onChange={(e) => setNovoTokCor(e.target.value)}
                    className="w-full h-[30px] rounded bg-zinc-900 border border-zinc-800 cursor-pointer"
                  />
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={novoTokOculto}
                      onChange={(e) => setNovoTokOculto(e.target.checked)}
                      className="accent-[#f08b21]"
                    />
                    Oculto
                  </label>
                  <button
                    type="button"
                    onClick={criarTokenAvulsoMestre}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold cursor-pointer"
                  >
                    + Adicionar
                  </button>
                </div>

                {/* Lista de tokens ativos no mapa */}
                {mapa.tokens.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {mapa.tokens.map((t) => (
                      <div
                        key={t.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs"
                      >
                        <span
                          style={{ backgroundColor: t.cor }}
                          className="w-3 h-3 rounded-full inline-block"
                        />
                        <span className="text-zinc-200 font-medium">
                          {t.nome}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            salvarMapaMestre({
                              ...mapa,
                              tokens: mapa.tokens.map((x) =>
                                x.id === t.id ? { ...x, oculto: !x.oculto } : x
                              ),
                            })
                          }
                          title={
                            t.oculto
                              ? "Token oculto para jogadores (clique para revelar)"
                              : "Token visível (clique para ocultar)"
                          }
                          className={`p-1 rounded cursor-pointer ${
                            t.oculto ? "text-zinc-500" : "text-emerald-400"
                          }`}
                        >
                          {t.oculto ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            salvarMapaMestre({
                              ...mapa,
                              tokens: mapa.tokens.filter((x) => x.id !== t.id),
                            })
                          }
                          className="p-1 rounded text-zinc-500 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => salvarMapaMestre({ ...mapa, tokens: [] })}
                      className="text-[11px] text-red-400 hover:underline ml-2 cursor-pointer"
                    >
                      Remover todos
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONTAINER DA VIEWPORT DO TABULEIRO + OVERLAY DA ÚLTIMA ROLAGEM NO CANTO */}
      <div className="relative rounded-xl border border-zinc-800 bg-[#070709] overflow-hidden">
        <div
          ref={viewportRef}
          className={`overflow-auto ${
            telaCheia ? "h-[calc(100vh-210px)]" : "max-h-[580px] min-h-[380px]"
          }`}
        >
          <div
            ref={boardRef}
            onPointerDown={handleBoardPointerDown}
            onPointerMove={handleBoardPointerMove}
            onPointerUp={handleBoardPointerUp}
            style={{
              width: `${larguraPx}px`,
              height: `${alturaPx}px`,
              ...(mapa.imagemUrl
                ? {
                    backgroundImage: `url("${mapa.imagemUrl}")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundColor: "#111114",
                  }
                : temaSelecionado.estiloCss),
            }}
            className={`relative select-none mx-auto touch-none ${
              aguardandoCliquePosicionar
                ? "cursor-crosshair"
                : ferramenta === "pan"
                  ? "cursor-grab active:cursor-grabbing"
                  : ferramenta === "fog_cobrir" ||
                      ferramenta === "fog_revelar" ||
                      ferramenta === "regua"
                    ? "cursor-crosshair"
                    : "cursor-default"
            }`}
          >
            {/* Linhas da Grade */}
            <div
              style={{
                backgroundSize: `${cellEscalada}px ${cellEscalada}px`,
                backgroundImage: `linear-gradient(to right, rgba(255,255,255,${mapa.opacidadeGrid}) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,${mapa.opacidadeGrid}) 1px, transparent 1px)`,
              }}
              className="absolute inset-0 pointer-events-none"
            />

            {/* Camada de Fog of War */}
            {mapa.fogCelulas.map((coord) => {
              const [cx, cy] = coord.split(",").map(Number);
              if (
                Number.isNaN(cx) ||
                Number.isNaN(cy) ||
                cx < 0 ||
                cy < 0 ||
                cx >= mapa.colunas ||
                cy >= mapa.linhas
              ) {
                return null;
              }
              return (
                <div
                  key={`fog-${coord}`}
                  style={{
                    left: `${cx * cellEscalada}px`,
                    top: `${cy * cellEscalada}px`,
                    width: `${cellEscalada + 0.5}px`,
                    height: `${cellEscalada + 0.5}px`,
                  }}
                  className={`absolute pointer-events-none ${
                    modo === "mestre"
                      ? "bg-black/60 border border-zinc-700/30"
                      : "bg-[#050507]"
                  }`}
                />
              );
            })}

            {/* Preview de Seleção de Retângulo de Fog (Mestre) */}
            {selecaoFog && (
              <div
                style={{
                  left: `${Math.min(selecaoFog.inicioX, selecaoFog.fimX) * cellEscalada}px`,
                  top: `${Math.min(selecaoFog.inicioY, selecaoFog.fimY) * cellEscalada}px`,
                  width: `${(Math.abs(selecaoFog.fimX - selecaoFog.inicioX) + 1) * cellEscalada}px`,
                  height: `${(Math.abs(selecaoFog.fimY - selecaoFog.inicioY) + 1) * cellEscalada}px`,
                }}
                className={`absolute pointer-events-none border-2 ${
                  ferramenta === "fog_cobrir"
                    ? "bg-black/50 border-amber-400"
                    : "bg-emerald-500/25 border-emerald-400"
                }`}
              />
            )}

            {/* Preview de Destino do Token sendo Arrastado */}
            {arrastandoToken && (
              <div
                style={{
                  left: `${arrastandoToken.alvoX * cellEscalada}px`,
                  top: `${arrastandoToken.alvoY * cellEscalada}px`,
                  width: `${(arrastandoToken.token.tamanho || 1) * cellEscalada}px`,
                  height: `${(arrastandoToken.token.tamanho || 1) * cellEscalada}px`,
                }}
                className={`absolute pointer-events-none rounded-xl border-2 transition-all duration-75 ${
                  modo !== "mestre" &&
                  celulaTemFog(
                    arrastandoToken.alvoX,
                    arrastandoToken.alvoY,
                    arrastandoToken.token.tamanho || 1
                  )
                    ? "bg-red-500/35 border-red-500"
                    : "bg-emerald-500/25 border-emerald-400"
                }`}
              />
            )}

            {/* Tokens no Mapa */}
            {mapa.tokens.map((tok) => {
              const sendoArrastado = arrastandoToken?.token.id === tok.id;
              const posX = sendoArrastado ? arrastandoToken.alvoX : tok.x;
              const posY = sendoArrastado ? arrastandoToken.alvoY : tok.y;
              const tam = tok.tamanho || 1;
              const movivel =
                ferramenta === "mover" && tokenPodeSerMovidoPorMim(tok);

              return (
                <div
                  key={tok.id}
                  onPointerDown={(e) => {
                    if (!movivel) return;
                    e.stopPropagation();
                    interagindoRef.current = true;
                    setArrastandoToken({
                      token: tok,
                      alvoX: tok.x,
                      alvoY: tok.y,
                    });
                    boardRef.current?.setPointerCapture(e.pointerId);
                  }}
                  style={{
                    left: `${posX * cellEscalada + 3}px`,
                    top: `${posY * cellEscalada + 3}px`,
                    width: `${tam * cellEscalada - 6}px`,
                    height: `${tam * cellEscalada - 6}px`,
                    backgroundColor: tok.cor || "#f08b21",
                  }}
                  className={`absolute rounded-full flex flex-col items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.75)] select-none transition-transform ${
                    tok.oculto
                      ? "opacity-55 border-2 border-dashed border-white"
                      : "border-2 border-white/90"
                  } ${
                    movivel
                      ? "cursor-grab active:cursor-grabbing hover:scale-105 z-20"
                      : "pointer-events-none z-10"
                  }`}
                  title={tok.nome}
                >
                  <span
                    style={{
                      fontSize: `${Math.max(10, Math.round(13 * zoom))}px`,
                    }}
                    className="font-display font-extrabold text-zinc-950 leading-none drop-shadow-[0_1px_1px_rgba(255,255,255,0.45)]"
                  >
                    {tok.sigla}
                  </span>
                  <span className="absolute -bottom-5 px-1.5 py-0.5 rounded bg-black/85 text-[10px] font-semibold text-zinc-100 whitespace-nowrap pointer-events-none border border-zinc-700/70">
                    {tok.nome}
                  </span>
                </div>
              );
            })}

            {/* Régua de Distância */}
            {regua && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-30"
                aria-hidden="true"
              >
                <line
                  x1={(regua.inicioX + 0.5) * cellEscalada}
                  y1={(regua.inicioY + 0.5) * cellEscalada}
                  x2={(regua.fimX + 0.5) * cellEscalada}
                  y2={(regua.fimY + 0.5) * cellEscalada}
                  stroke="#f08b21"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                />
                <rect
                  x={(regua.fimX + 0.5) * cellEscalada - 46}
                  y={(regua.fimY + 0.5) * cellEscalada - 34}
                  width="92"
                  height="24"
                  rx="6"
                  fill="#09090b"
                  stroke="#f08b21"
                />
                <text
                  x={(regua.fimX + 0.5) * cellEscalada}
                  y={(regua.fimY + 0.5) * cellEscalada - 18}
                  textAnchor="middle"
                  fill="#f4f4f5"
                  fontSize="11"
                  fontWeight="bold"
                >
                  {distanciaReguaCasas} q ({(distanciaReguaCasas * 1.5).toFixed(1)}m)
                </text>
              </svg>
            )}
          </div>
        </div>

        {/* OVERLAY FIXO NO CANTO DO MAPA: ÚLTIMA ROLAGEM REALIZADA */}
        <div className="pointer-events-none absolute bottom-3 right-3 z-30">
          <WidgetUltimaRolagemCanto rolagem={ultimaRolagem} />
        </div>
      </div>
    </div>
  );
}
