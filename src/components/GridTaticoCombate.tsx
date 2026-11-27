"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  CloudFog,
  Eye,
  EyeOff,
  Grid3X3,
  Hand,
  ImagePlus,
  Loader2,
  Lock,
  MapPin,
  Maximize2,
  Minimize2,
  Minus,
  MousePointer,
  Plus,
  Proportions,
  RefreshCw,
  Ruler,
  Settings,
  ShieldAlert,
  Sun,
  Trash2,
  Unlock,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { WidgetUltimaRolagemCanto } from "@/components/SimulacaoDadosTela";
import {
  comprimirImagemMapa,
  comprimirImagemToken,
  obterDimensoesImagem,
} from "@/lib/imagem-upload";
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

const PRESETS_TAMANHO_GRID: Array<{
  label: string;
  detalhe: string;
  colunas: number;
  linhas: number;
}> = [
  { label: "Compacto", detalhe: "12×10", colunas: 12, linhas: 10 },
  { label: "Padrão", detalhe: "20×14", colunas: 20, linhas: 14 },
  { label: "Amplo", detalhe: "28×20", colunas: 28, linhas: 20 },
  { label: "Enorme", detalhe: "36×26", colunas: 36, linhas: 26 },
];

const CORES_LINHA_GRID: Array<{ id: string; label: string; rgbaBase: string }> =
  [
    { id: "#ffffff", label: "Branca", rgbaBase: "255,255,255" },
    { id: "#000000", label: "Escura", rgbaBase: "0,0,0" },
    { id: "#f08b21", label: "Âmbar", rgbaBase: "240,139,33" },
  ];

const NIVEIS_OPACIDADE_GRID: Array<{ valor: number; label: string }> = [
  { valor: 0, label: "Oculta" },
  { valor: 0.18, label: "Suave" },
  { valor: 0.32, label: "Média" },
  { valor: 0.55, label: "Forte" },
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
  fotoSalva?: string;
}

interface AlvoPermissaoJogador {
  chaveId: string;
  emailLower: string;
  nomePersonagem: string;
  detalheJogador: string;
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

function estaTravadoNaLista(
  lista: string[] | undefined,
  fichaId?: string | null,
  email?: string | null
): boolean {
  if (!Array.isArray(lista) || lista.length === 0) return false;
  const setNorm = new Set(lista.map((x) => x.trim().toLowerCase()));
  if (fichaId && setNorm.has(fichaId.trim().toLowerCase())) return true;
  if (email && setNorm.has(email.trim().toLowerCase())) return true;
  return false;
}

function obterRgbLinhaGrid(corHex: string): string {
  const achada = CORES_LINHA_GRID.find(
    (c) => c.id.toLowerCase() === (corHex || "").toLowerCase()
  );
  return achada ? achada.rgbaBase : "255,255,255";
}

const MAPA_INICIAL: MapaTaticoEstado = {
  versao: 1,
  visivelJogadores: false,
  posicionamentoJogadoresLiberado: true,
  movimentoJogadoresLiberado: true,
  jogadoresTravadosInsercao: [],
  jogadoresTravadosMovimento: [],
  titulo: "Cena de Conflito",
  imagemUrl: "",
  ajusteImagem: "esticar",
  temaFundo: "asfalto",
  colunas: 20,
  linhas: 14,
  opacidadeGrid: 0.32,
  corGrid: "#ffffff",
  fogCelulas: [],
  tokens: [],
  mapasSalvos: [],
  retratosSalvos: {},
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
  const [salvandoContador, setSalvandoContador] = useState(0);
  const [visivelParaJogador, setVisivelParaJogador] = useState(false);
  const [mapa, setMapaState] = useState<MapaTaticoEstado>(MAPA_INICIAL);
  const [minhasFichas, setMinhasFichas] = useState<FichaDisponivelJogador[]>(
    []
  );
  const [ultimaRolagem, setUltimaRolagem] =
    useState<UltimaRolagemResumo | null>(null);

  // Refs de sincronização anti-reversão (impedem que polling antigo desfaça ações)
  const mapaRef = useRef<MapaTaticoEstado>(MAPA_INICIAL);
  const mutacoesPendentesRef = useRef(0);
  const sequenciaMutacaoRef = useRef(0);
  const ultimoFimMutacaoRef = useRef(0);
  const versaoConhecidaRef = useRef(0);
  const filaMutacaoRef = useRef<Promise<unknown>>(Promise.resolve());
  const interagindoRef = useRef(false);

  const atualizarEstadoMapa = useCallback(
    (
      novoOuFn:
        | MapaTaticoEstado
        | ((atual: MapaTaticoEstado) => MapaTaticoEstado)
    ) => {
      setMapaState((prev) => {
        const base = mapaRef.current || prev;
        const proximo =
          typeof novoOuFn === "function" ? novoOuFn(base) : novoOuFn;
        mapaRef.current = proximo;
        return proximo;
      });
    },
    []
  );

  // Controles visuais locais de câmera e painéis do Mestre
  const [zoom, setZoom] = useState(1);
  const [telaCheia, setTelaCheia] = useState(false);
  const [ferramenta, setFerramenta] = useState<FerramentaMestre>("mover");
  const [configAberta, setConfigAberta] = useState(modo === "mestre");
  const [travasIndividuaisAberta, setTravasIndividuaisAberta] = useState(false);
  const [processandoUpload, setProcessandoUpload] = useState(false);

  // Rascunhos locais desacoplados do polling (para digitar sem pular ou apagar sozinho!)
  const [tituloDraft, setTituloDraft] = useState("Cena de Conflito");
  const [urlMapaDraft, setUrlMapaDraft] = useState("");
  const [colunasDraft, setColunasDraft] = useState("20");
  const [linhasDraft, setLinhasDraft] = useState("14");
  const editandoTituloRef = useRef(false);
  const editandoTamanhoRef = useRef(false);

  // Sincroniza rascunhos quando o mapa muda externamente e o usuário não está digitando neles
  useEffect(() => {
    if (!editandoTituloRef.current) {
      setTituloDraft(mapa.titulo || "Cena de Conflito");
    }
  }, [mapa.titulo]);

  useEffect(() => {
    if (!editandoTamanhoRef.current) {
      setColunasDraft(String(mapa.colunas));
      setLinhasDraft(String(mapa.linhas));
    }
  }, [mapa.colunas, mapa.linhas]);

  useEffect(() => {
    if (mapa.imagemUrl && !mapa.imagemUrl.startsWith("data:image/")) {
      setUrlMapaDraft(mapa.imagemUrl);
    } else if (!mapa.imagemUrl) {
      setUrlMapaDraft("");
    }
  }, [mapa.imagemUrl]);

  // Aparência e posicionamento do token do Jogador
  const [corMeuToken, setCorMeuToken] = useState("#f08b21");
  const [fotoMeuToken, setFotoMeuToken] = useState<string>("");
  const [aguardandoCliquePosicionar, setAguardandoCliquePosicionar] =
    useState(false);
  const [arrastandoToken, setArrastandoToken] = useState<{
    token: TokenMapa;
    alvoX: number;
    alvoY: number;
  } | null>(null);

  // Retângulo de Fog (Mestre) e Régua
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

  // Pan da câmera
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

  // Opções de inserção de Ameaças/PdMs e Tokens Personalizados pelo Mestre
  const [ameacaTamPadrao, setAmeacaTamPadrao] = useState<1 | 2 | 3>(1);
  const [ameacaInserirOculta, setAmeacaInserirOculta] = useState(true);

  const [novoTokNome, setNovoTokNome] = useState("");
  const [novoTokTipo, setNovoTokTipo] = useState<"ameaca" | "marcador">(
    "ameaca"
  );
  const [novoTokCor, setNovoTokCor] = useState("#ef4444");
  const [novoTokTamanho, setNovoTokTamanho] = useState<1 | 2 | 3>(1);
  const [novoTokOculto, setNovoTokOculto] = useState(false);
  const [novoTokImagem, setNovoTokImagem] = useState("");

  // Enfileira qualquer mutação (PATCH do Mestre ou POST do Jogador) em ordem estrita
  const enfileirarMutacao = useCallback(
    async <T,>(tarefa: () => Promise<T>): Promise<T> => {
      sequenciaMutacaoRef.current += 1;
      mutacoesPendentesRef.current += 1;
      setSalvandoContador((c) => c + 1);

      const execucao = filaMutacaoRef.current
        .catch(() => undefined)
        .then(() => tarefa());

      filaMutacaoRef.current = execucao.catch(() => undefined);

      try {
        return await execucao;
      } finally {
        mutacoesPendentesRef.current = Math.max(
          0,
          mutacoesPendentesRef.current - 1
        );
        ultimoFimMutacaoRef.current = Date.now();
        setSalvandoContador((c) => Math.max(0, c - 1));
      }
    },
    []
  );

  const carregarMapa = useCallback(
    async (silencioso = false) => {
      if (!autenticado) {
        setCarregando(false);
        return;
      }

      if (
        silencioso &&
        (interagindoRef.current ||
          mutacoesPendentesRef.current > 0 ||
          Date.now() - ultimoFimMutacaoRef.current < 1600)
      ) {
        return;
      }

      const seqAntes = sequenciaMutacaoRef.current;
      if (!silencioso) setCarregando(true);

      try {
        const atual = mapaRef.current;
        const params = new URLSearchParams();
        if (atual.imagemUrl) {
          params.set("imgLen", String(atual.imagemUrl.length));
          params.set("imgTail", atual.imagemUrl.slice(-24));
        }
        if (silencioso && modo === "mestre") {
          params.set("omitirGaleria", "1");
          params.set("galeriaCount", String(atual.mapasSalvos?.length ?? 0));
        }

        const qs = params.toString();
        const res = await fetch(`/api/mapa${qs ? `?${qs}` : ""}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = await res.json();

        // Se houve qualquer ação local enquanto o GET estava viajando, descarta o poll antigo!
        if (
          silencioso &&
          (interagindoRef.current ||
            mutacoesPendentesRef.current > 0 ||
            sequenciaMutacaoRef.current !== seqAntes)
        ) {
          return;
        }

        setVisivelParaJogador(Boolean(json.visivel));
        setMinhasFichas(json.minhasFichas ?? []);
        setUltimaRolagem(json.ultimaRolagem ?? null);

        if (json.mapa) {
          const versaoRemota = Number(json.mapa.versao || 1);
          if (
            silencioso &&
            versaoConhecidaRef.current > 0 &&
            versaoRemota < versaoConhecidaRef.current
          ) {
            return;
          }
          versaoConhecidaRef.current = Math.max(
            versaoConhecidaRef.current,
            versaoRemota
          );

          atualizarEstadoMapa((prev) => ({
            ...MAPA_INICIAL,
            ...json.mapa,
            imagemUrl: json.imagemUrlMantida
              ? prev.imagemUrl
              : (json.mapa.imagemUrl ?? ""),
            mapasSalvos: json.mapasSalvosMantidos
              ? (prev.mapasSalvos ?? [])
              : Array.isArray(json.mapa.mapasSalvos)
                ? json.mapa.mapasSalvos
                : [],
            retratosSalvos:
              json.mapa.retratosSalvos &&
              typeof json.mapa.retratosSalvos === "object"
                ? json.mapa.retratosSalvos
                : (prev.retratosSalvos ?? {}),
            jogadoresTravadosInsercao: Array.isArray(
              json.mapa.jogadoresTravadosInsercao
            )
              ? json.mapa.jogadoresTravadosInsercao
              : [],
            jogadoresTravadosMovimento: Array.isArray(
              json.mapa.jogadoresTravadosMovimento
            )
              ? json.mapa.jogadoresTravadosMovimento
              : [],
          }));
        }
      } catch {
        // Silencioso no polling
      } finally {
        if (!silencioso) setCarregando(false);
      }
    },
    [autenticado, modo, atualizarEstadoMapa]
  );

  useEffect(() => {
    void carregarMapa(false);
    if (!autenticado) return;

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        void carregarMapa(true);
      }
    }, 3500);

    const onVis = () => {
      if (document.visibilityState === "visible") {
        void carregarMapa(true);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [autenticado, carregarMapa]);

  // Identifica a ficha do jogador para colocar/mover token
  const fichaAlvoJogador = useMemo(() => {
    if (fichaAtualId) {
      const achada = minhasFichas.find((f) => f.id === fichaAtualId);
      if (achada) return achada;
    }
    return minhasFichas[0] ?? null;
  }, [fichaAtualId, minhasFichas]);

  // Carrega foto salva do token do jogador (priorizando foto salva no banco e depois localStorage)
  useEffect(() => {
    if (modo !== "jogador") return;
    if (fichaAlvoJogador?.fotoSalva) {
      setFotoMeuToken(fichaAlvoJogador.fotoSalva);
      return;
    }
    const chave = `cacador_token_foto_${fichaAlvoJogador?.id || "padrao"}`;
    try {
      const salva = localStorage.getItem(chave);
      if (salva) setFotoMeuToken(salva);
    } catch {
      // Ignorar storage indisponível
    }
  }, [modo, fichaAlvoJogador?.id, fichaAlvoJogador?.fotoSalva]);

  const salvarFotoLocalJogador = (dataUrl: string) => {
    setFotoMeuToken(dataUrl);
    const chave = `cacador_token_foto_${fichaAlvoJogador?.id || "padrao"}`;
    try {
      if (dataUrl) localStorage.setItem(chave, dataUrl);
      else localStorage.removeItem(chave);
    } catch {
      // Ignorar quota
    }
  };

  // Dispara uma atualização atômica por escopo no Mestre (nunca sobrescreve imagens/outros campos!)
  const executarPatchMestre = useCallback(
    async (
      otimistaFn: (atual: MapaTaticoEstado) => MapaTaticoEstado,
      payload: Record<string, unknown>
    ): Promise<boolean> => {
      const estadoAnterior = mapaRef.current;
      atualizarEstadoMapa(otimistaFn);

      return enfileirarMutacao(async () => {
        try {
          const res = await fetch("/api/mapa", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            atualizarEstadoMapa(estadoAnterior);
            onNotify(json.error || "Erro ao salvar alteração no mapa.", "erro");
            return false;
          }
          if (json.versao) {
            versaoConhecidaRef.current = Math.max(
              versaoConhecidaRef.current,
              Number(json.versao)
            );
          }
          if (
            mutacoesPendentesRef.current <= 1 &&
            (Array.isArray(json.mapasSalvos) || Array.isArray(json.tokens))
          ) {
            atualizarEstadoMapa((atual) => ({
              ...atual,
              versao: json.versao || atual.versao,
              ...(Array.isArray(json.mapasSalvos)
                ? { mapasSalvos: json.mapasSalvos }
                : {}),
              ...(json.retratosSalvos
                ? { retratosSalvos: json.retratosSalvos }
                : {}),
              ...(Array.isArray(json.tokens) ? { tokens: json.tokens } : {}),
            }));
          }
          return true;
        } catch {
          atualizarEstadoMapa(estadoAnterior);
          onNotify("Falha de conexão ao salvar alteração no mapa.", "erro");
          return false;
        }
      });
    },
    [atualizarEstadoMapa, enfileirarMutacao, onNotify]
  );

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

  const idFichaVerificacao =
    meuTokenNoMapa?.fichaId || fichaAlvoJogador?.id || fichaAtualId;

  const insercaoLiberadaParaMim = useMemo(() => {
    if (modo === "mestre") return true;
    if (!mapa.posicionamentoJogadoresLiberado) return false;
    return !estaTravadoNaLista(
      mapa.jogadoresTravadosInsercao,
      idFichaVerificacao,
      userEmail
    );
  }, [
    modo,
    mapa.posicionamentoJogadoresLiberado,
    mapa.jogadoresTravadosInsercao,
    idFichaVerificacao,
    userEmail,
  ]);

  const movimentoLiberadoParaMim = useMemo(() => {
    if (modo === "mestre") return true;
    if (!mapa.movimentoJogadoresLiberado) return false;
    return !estaTravadoNaLista(
      mapa.jogadoresTravadosMovimento,
      idFichaVerificacao,
      userEmail
    );
  }, [
    modo,
    mapa.movimentoJogadoresLiberado,
    mapa.jogadoresTravadosMovimento,
    idFichaVerificacao,
    userEmail,
  ]);

  useEffect(() => {
    if (!insercaoLiberadaParaMim && aguardandoCliquePosicionar) {
      setAguardandoCliquePosicionar(false);
    }
  }, [insercaoLiberadaParaMim, aguardandoCliquePosicionar]);

  const tokenPodeSerMovidoPorMim = useCallback(
    (t: TokenMapa) => {
      if (modo === "mestre") return true;
      if (!mapa.movimentoJogadoresLiberado) return false;
      const emailLower = userEmail.trim().toLowerCase();
      if (
        estaTravadoNaLista(
          mapa.jogadoresTravadosMovimento,
          t.fichaId,
          emailLower
        )
      ) {
        return false;
      }
      if (fichaAlvoJogador && t.fichaId === fichaAlvoJogador.id) return true;
      if (
        minhasFichas.some((mf) => mf.id === t.fichaId) ||
        (t.ownerEmail && t.ownerEmail.trim().toLowerCase() === emailLower)
      ) {
        return true;
      }
      return false;
    },
    [
      modo,
      mapa.movimentoJogadoresLiberado,
      mapa.jogadoresTravadosMovimento,
      userEmail,
      fichaAlvoJogador,
      minhasFichas,
    ]
  );

  // Lista consolidada de jogadores para o painel de travas individuais do Mestre
  const alvosPermissaoMestre = useMemo<AlvoPermissaoJogador[]>(() => {
    const mapaAlvos = new Map<string, AlvoPermissaoJogador>();

    for (const f of fichasCronicaMestre) {
      const nome = f.dados?.identidade?.nome?.trim() || f.nome || "Caçador";
      const jogador = f.dados?.identidade?.jogador?.trim();
      const emailLower = (f.owner_email || "").trim().toLowerCase();
      mapaAlvos.set(f.id, {
        chaveId: f.id,
        emailLower,
        nomePersonagem: nome,
        detalheJogador: jogador
          ? `${jogador} (${f.owner_email})`
          : f.owner_email,
      });
    }

    for (const t of mapa.tokens) {
      if (t.tipo !== "jogador") continue;
      const chave = t.fichaId || (t.ownerEmail || "").trim().toLowerCase();
      if (!chave || mapaAlvos.has(chave)) continue;
      mapaAlvos.set(chave, {
        chaveId: chave,
        emailLower: (t.ownerEmail || "").trim().toLowerCase(),
        nomePersonagem: t.nome,
        detalheJogador: t.ownerEmail || "Token no mapa",
      });
    }

    return [...mapaAlvos.values()];
  }, [fichasCronicaMestre, mapa.tokens]);

  const alternarTravaIndividual = async (
    tipo: "insercao" | "movimento",
    alvo: AlvoPermissaoJogador
  ) => {
    const atual = mapaRef.current;
    const listaAtual =
      tipo === "insercao"
        ? atual.jogadoresTravadosInsercao
        : atual.jogadoresTravadosMovimento;

    const jaTravado = estaTravadoNaLista(
      listaAtual,
      alvo.chaveId,
      alvo.emailLower
    );

    const chLower = alvo.chaveId.trim().toLowerCase();
    const emLower = alvo.emailLower.trim().toLowerCase();

    const novaLista = jaTravado
      ? listaAtual.filter((item) => {
          const norm = item.trim().toLowerCase();
          if (norm === chLower) return false;
          if (emLower && norm === emLower) return false;
          return true;
        })
      : [...listaAtual, alvo.chaveId];

    if (tipo === "insercao") {
      await executarPatchMestre(
        (m) => ({ ...m, jogadoresTravadosInsercao: novaLista }),
        { acao: "atualizar_travas", jogadoresTravadosInsercao: novaLista }
      );
    } else {
      await executarPatchMestre(
        (m) => ({ ...m, jogadoresTravadosMovimento: novaLista }),
        { acao: "atualizar_travas", jogadoresTravadosMovimento: novaLista }
      );
    }
  };

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

  // --- Ações do Jogador (Enfileiradas e Salvas no Banco!) ---
  const atualizarAparenciaTokenJogador = async (opcoes: {
    cor?: string;
    imagemUrl?: string;
  }) => {
    if (opcoes.cor !== undefined) setCorMeuToken(opcoes.cor);
    if (opcoes.imagemUrl !== undefined) {
      salvarFotoLocalJogador(opcoes.imagemUrl);
    }

    if (meuTokenNoMapa) {
      atualizarEstadoMapa((atual) => ({
        ...atual,
        tokens: atual.tokens.map((t) =>
          t.id === meuTokenNoMapa.id
            ? {
                ...t,
                ...(opcoes.cor !== undefined ? { cor: opcoes.cor } : {}),
                ...(opcoes.imagemUrl !== undefined
                  ? { imagemUrl: opcoes.imagemUrl || undefined }
                  : {}),
              }
            : t
        ),
      }));
    }

    await enfileirarMutacao(async () => {
      const resp = await fetch("/api/mapa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "atualizar_aparencia_meu_token",
          tokenId: meuTokenNoMapa?.id,
          fichaId: fichaAlvoJogador?.id,
          ...(opcoes.cor !== undefined ? { cor: opcoes.cor } : {}),
          ...(opcoes.imagemUrl !== undefined
            ? { imagemUrl: opcoes.imagemUrl }
            : {}),
        }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        onNotify(json.error || "Erro ao salvar aparência do token.", "erro");
        return;
      }
      if (json.versao) {
        versaoConhecidaRef.current = Math.max(
          versaoConhecidaRef.current,
          Number(json.versao)
        );
      }
    });
  };

  const handleUploadFotoMeuToken = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;

    setProcessandoUpload(true);
    try {
      const comprimida = await comprimirImagemToken(arquivo);
      await atualizarAparenciaTokenJogador({ imagemUrl: comprimida });
      onNotify("Foto do seu token salva com sucesso!", "sucesso");
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : "Falha ao processar imagem.",
        "erro"
      );
    } finally {
      setProcessandoUpload(false);
    }
  };

  const posicionarMeuTokenEm = async (x: number, y: number) => {
    if (!insercaoLiberadaParaMim) {
      onNotify(
        "O Mestre travou a inserção de token para você neste momento.",
        "erro"
      );
      setAguardandoCliquePosicionar(false);
      return;
    }
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

    const tokenOtimista: TokenMapa = {
      id: `tok-${fichaAlvoJogador.id.slice(0, 8)}`,
      nome: fichaAlvoJogador.nome,
      cor: corMeuToken,
      sigla: fichaAlvoJogador.sigla,
      imagemUrl: fotoMeuToken || undefined,
      x,
      y,
      tamanho: 1,
      tipo: "jogador",
      fichaId: fichaAlvoJogador.id,
      ownerEmail: userEmail,
      oculto: false,
    };

    const anterior = mapaRef.current;
    atualizarEstadoMapa((atual) => ({
      ...atual,
      tokens: [
        ...atual.tokens.filter((t) => t.fichaId !== fichaAlvoJogador.id),
        tokenOtimista,
      ],
    }));

    await enfileirarMutacao(async () => {
      const resp = await fetch("/api/mapa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "colocar_meu_token",
          fichaId: fichaAlvoJogador.id,
          x,
          y,
          cor: corMeuToken,
          imagemUrl: fotoMeuToken || undefined,
        }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        atualizarEstadoMapa(anterior);
        onNotify(json.error || "Não foi possível posicionar o token.", "erro");
        return;
      }
      if (json.versao) {
        versaoConhecidaRef.current = Math.max(
          versaoConhecidaRef.current,
          Number(json.versao)
        );
      }
    });
  };

  const recolherMeuToken = async () => {
    if (!meuTokenNoMapa) return;
    if (!insercaoLiberadaParaMim) {
      onNotify(
        "O Mestre travou a remoção/inserção do seu token no momento.",
        "erro"
      );
      return;
    }

    const tokenId = meuTokenNoMapa.id;
    const anterior = mapaRef.current;
    atualizarEstadoMapa((atual) => ({
      ...atual,
      tokens: atual.tokens.filter((t) => t.id !== tokenId),
    }));

    await enfileirarMutacao(async () => {
      const resp = await fetch("/api/mapa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "recolher_meu_token",
          tokenId,
        }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        atualizarEstadoMapa(anterior);
        onNotify(json.error || "Não foi possível recolher o token.", "erro");
        return;
      }
      if (json.versao) {
        versaoConhecidaRef.current = Math.max(
          versaoConhecidaRef.current,
          Number(json.versao)
        );
      }
    });
  };

  // --- Configuração, Tamanho do Grid e Salvamento de Imagem (Mestre) ---
  const salvarTituloCena = async () => {
    editandoTituloRef.current = false;
    const limpo = tituloDraft.trim() || "Cena de Conflito";
    setTituloDraft(limpo);
    if (limpo === mapaRef.current.titulo) return;
    await executarPatchMestre((m) => ({ ...m, titulo: limpo }), {
      acao: "atualizar_config",
      titulo: limpo,
    });
  };

  const aplicarTamanhoGrid = async (novasColunas: number, novasLinhas: number) => {
    editandoTamanhoRef.current = false;
    const col = Math.max(6, Math.min(44, Math.round(novasColunas || 20)));
    const lin = Math.max(6, Math.min(36, Math.round(novasLinhas || 14)));
    setColunasDraft(String(col));
    setLinhasDraft(String(lin));

    if (col === mapaRef.current.colunas && lin === mapaRef.current.linhas) {
      return;
    }

    await executarPatchMestre(
      (m) => ({
        ...m,
        colunas: col,
        linhas: lin,
        tokens: m.tokens.map((t) => {
          const tam = t.tamanho || 1;
          return {
            ...t,
            x: Math.max(0, Math.min(col - tam, t.x)),
            y: Math.max(0, Math.min(lin - tam, t.y)),
          };
        }),
      }),
      {
        acao: "atualizar_config",
        colunas: col,
        linhas: lin,
      }
    );
  };

  const aplicarTamanhoRascunho = () => {
    const c = Number.parseInt(colunasDraft, 10);
    const l = Number.parseInt(linhasDraft, 10);
    void aplicarTamanhoGrid(
      Number.isNaN(c) ? mapaRef.current.colunas : c,
      Number.isNaN(l) ? mapaRef.current.linhas : l
    );
  };

  const ajustarProporcaoPelaImagem = async () => {
    const url = mapaRef.current.imagemUrl;
    if (!url) {
      onNotify("Envie ou selecione uma imagem de mapa primeiro.", "info");
      return;
    }
    try {
      const { largura, altura } = await obterDimensoesImagem(url);
      const colAtual = mapaRef.current.colunas;
      const linhasProporcionais = Math.max(
        6,
        Math.min(36, Math.round(colAtual * (altura / largura)))
      );
      await aplicarTamanhoGrid(colAtual, linhasProporcionais);
      onNotify(
        `Grade ajustada para ${colAtual}×${linhasProporcionais} conforme a proporção da imagem!`,
        "sucesso"
      );
    } catch (err) {
      onNotify(
        err instanceof Error
          ? err.message
          : "Não foi possível ler a proporção desta imagem.",
        "erro"
      );
    }
  };

  const handleUploadImagemMapaMestre = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;

    setProcessandoUpload(true);
    try {
      const dataUrl = await comprimirImagemMapa(arquivo);
      const nomeSemExt = arquivo.name.replace(/\.[^/.]+$/, "");
      const ok = await executarPatchMestre(
        (m) => ({ ...m, imagemUrl: dataUrl, ajusteImagem: "esticar" }),
        {
          acao: "salvar_imagem_mapa",
          imagemUrl: dataUrl,
          nomeImagem: nomeSemExt || mNomePadrao(mapaRef.current.titulo),
          salvarNaGaleria: true,
          ajusteImagem: "esticar",
        }
      );
      if (ok) {
        onNotify(
          "Imagem do mapa salva no banco e adicionada aos Mapas Salvos!",
          "sucesso"
        );
      }
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : "Erro ao carregar imagem do mapa.",
        "erro"
      );
    } finally {
      setProcessandoUpload(false);
    }
  };

  const salvarUrlImagemMapaMestre = async () => {
    const limpo = urlMapaDraft.trim();
    const ok = await executarPatchMestre(
      (m) => ({ ...m, imagemUrl: limpo }),
      {
        acao: "salvar_imagem_mapa",
        imagemUrl: limpo,
        nomeImagem: mapaRef.current.titulo || "Mapa URL",
        salvarNaGaleria: Boolean(limpo),
      }
    );
    if (ok) {
      onNotify(
        limpo
          ? "URL da imagem salva no mapa!"
          : "Imagem removida (usando tema tático).",
        "sucesso"
      );
    }
  };

  const handleUploadFotoNovoTokenMestre = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;

    setProcessandoUpload(true);
    try {
      const dataUrl = await comprimirImagemToken(arquivo);
      setNovoTokImagem(dataUrl);
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : "Erro ao carregar foto do token.",
        "erro"
      );
    } finally {
      setProcessandoUpload(false);
    }
  };

  const handleTrocarFotoTokenExistenteMestre = async (
    tokenId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;

    setProcessandoUpload(true);
    try {
      const dataUrl = await comprimirImagemToken(arquivo);
      const ok = await executarPatchMestre(
        (m) => ({
          ...m,
          tokens: m.tokens.map((t) =>
            t.id === tokenId ? { ...t, imagemUrl: dataUrl } : t
          ),
        }),
        {
          acao: "editar_token",
          tokenId,
          imagemUrl: dataUrl,
        }
      );
      if (ok) {
        onNotify("Foto do token salva no banco!", "sucesso");
      }
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : "Erro ao atualizar foto do token.",
        "erro"
      );
    } finally {
      setProcessandoUpload(false);
    }
  };

  // --- Eventos de Ponteiro no Tabuleiro ---
  const handleBoardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (aguardandoCliquePosicionar) {
      const cel = converterClientParaCelula(e.clientX, e.clientY, 1);
      if (cel) {
        void posicionarMeuTokenEm(cel.x, cel.y);
      }
      return;
    }

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

      if (modo === "mestre") {
        await executarPatchMestre(
          (m) => ({
            ...m,
            tokens: m.tokens.map((t) =>
              t.id === token.id ? { ...t, x: alvoX, y: alvoY } : t
            ),
          }),
          {
            acao: "mover_token",
            tokenId: token.id,
            x: alvoX,
            y: alvoY,
          }
        );
      } else {
        const anterior = mapaRef.current;
        atualizarEstadoMapa((m) => ({
          ...m,
          tokens: m.tokens.map((t) =>
            t.id === token.id ? { ...t, x: alvoX, y: alvoY } : t
          ),
        }));

        await enfileirarMutacao(async () => {
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
          const j = await resp.json().catch(() => ({}));
          if (!resp.ok) {
            atualizarEstadoMapa(anterior);
            onNotify(j.error || "Movimento não permitido.", "erro");
            return;
          }
          if (j.versao) {
            versaoConhecidaRef.current = Math.max(
              versaoConhecidaRef.current,
              Number(j.versao)
            );
          }
        });
      }
      return;
    }

    if (selecaoFog && modo === "mestre") {
      const minX = Math.min(selecaoFog.inicioX, selecaoFog.fimX);
      const maxX = Math.max(selecaoFog.inicioX, selecaoFog.fimX);
      const minY = Math.min(selecaoFog.inicioY, selecaoFog.fimY);
      const maxY = Math.max(selecaoFog.inicioY, selecaoFog.fimY);
      setSelecaoFog(null);
      interagindoRef.current = false;

      const atual = mapaRef.current;
      const novoSet = new Set(atual.fogCelulas);
      for (let x = minX; x <= maxX; x += 1) {
        for (let y = minY; y <= maxY; y += 1) {
          const chave = `${x},${y}`;
          if (ferramenta === "fog_cobrir") novoSet.add(chave);
          else novoSet.delete(chave);
        }
      }
      const novasCelulas = [...novoSet];
      await executarPatchMestre((m) => ({ ...m, fogCelulas: novasCelulas }), {
        acao: "atualizar_fog",
        fogCelulas: novasCelulas,
      });
      return;
    }

    if (regua) {
      setRegua(null);
    }
  };

  // --- Ações Exclusivas do Mestre ---
  const cobrirTudoComFog = async () => {
    const atual = mapaRef.current;
    const todas: string[] = [];
    for (let x = 0; x < atual.colunas; x += 1) {
      for (let y = 0; y < atual.linhas; y += 1) {
        todas.push(`${x},${y}`);
      }
    }
    await executarPatchMestre((m) => ({ ...m, fogCelulas: todas }), {
      acao: "atualizar_fog",
      fogCelulas: todas,
    });
  };

  const revelarTodoFog = async () => {
    await executarPatchMestre((m) => ({ ...m, fogCelulas: [] }), {
      acao: "atualizar_fog",
      fogCelulas: [],
    });
  };

  const encontrarCelulaInicialLivre = (
    tamanho = 1
  ): { x: number; y: number } => {
    const atual = mapaRef.current;
    for (let y = 1; y <= Math.max(1, atual.linhas - tamanho - 1); y += 1) {
      for (let x = 1; x <= Math.max(1, atual.colunas - tamanho - 1); x += 1) {
        if (!atual.tokens.some((t) => t.x === x && t.y === y)) {
          return { x, y };
        }
      }
    }
    return { x: 0, y: 0 };
  };

  const buscarFotoSalvaNoCliente = (opcoes: {
    fichaId?: string;
    ameacaId?: string;
    email?: string;
  }) => {
    const retratos = mapaRef.current.retratosSalvos || {};
    if (opcoes.fichaId) {
      const f = retratos[`ficha:${opcoes.fichaId.trim().toLowerCase()}`];
      if (f) return f;
    }
    if (opcoes.ameacaId) {
      const a = retratos[`ameaca:${opcoes.ameacaId.trim().toLowerCase()}`];
      if (a) return a;
    }
    if (opcoes.email) {
      const e = retratos[`email:${opcoes.email.trim().toLowerCase()}`];
      if (e) return e;
    }
    return undefined;
  };

  const inserirCacadorPeloMestre = async (f: FichaResumoOnline) => {
    if (mapaRef.current.tokens.some((t) => t.fichaId === f.id)) {
      onNotify("Este caçador já está posicionado no grid.", "info");
      return;
    }
    const nome = f.dados?.identidade?.nome?.trim() || f.nome || "Caçador";
    const pos = encontrarCelulaInicialLivre(1);
    const fotoSalva = buscarFotoSalvaNoCliente({
      fichaId: f.id,
      email: f.owner_email,
    });
    const novo: TokenMapa = {
      id: `tok-${f.id.slice(0, 8)}`,
      nome,
      cor: "#f08b21",
      sigla: gerarSigla(nome),
      imagemUrl: fotoSalva,
      x: pos.x,
      y: pos.y,
      tamanho: 1,
      tipo: "jogador",
      fichaId: f.id,
      ownerEmail: f.owner_email,
      oculto: false,
    };
    await executarPatchMestre((m) => ({ ...m, tokens: [...m.tokens, novo] }), {
      acao: "adicionar_token",
      token: novo,
    });
  };

  const inserirAmeacaPeloMestre = async (a: AmeacaCronica) => {
    const pos = encontrarCelulaInicialLivre(ameacaTamPadrao);
    const ehAliadoPdm = a.categoria === "PdM / Aliado";
    const fotoSalva = buscarFotoSalvaNoCliente({ ameacaId: a.id });
    const novo: TokenMapa = {
      id: `ame-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      nome: a.nome,
      cor: ehAliadoPdm ? "#3b82f6" : "#dc2626",
      sigla: gerarSigla(a.nome),
      imagemUrl: fotoSalva,
      x: pos.x,
      y: pos.y,
      tamanho: ameacaTamPadrao,
      tipo: "ameaca",
      ameacaId: a.id,
      oculto: ameacaInserirOculta,
    };
    const ok = await executarPatchMestre(
      (m) => ({ ...m, tokens: [...m.tokens, novo] }),
      {
        acao: "adicionar_token",
        token: novo,
      }
    );
    if (ok) {
      onNotify(
        `"${a.nome}" inserido no grid (${ameacaInserirOculta ? "Oculto p/ jogadores" : "Visível"}).`,
        "info"
      );
    }
  };

  const criarTokenPersonalizadoMestre = async () => {
    if (!novoTokNome.trim()) {
      onNotify("Digite o nome do token personalizado ou NPC.", "erro");
      return;
    }
    const pos = encontrarCelulaInicialLivre(novoTokTamanho);
    const novo: TokenMapa = {
      id: `custom-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      nome: novoTokNome.trim(),
      cor: novoTokCor,
      sigla: gerarSigla(novoTokNome),
      imagemUrl: novoTokImagem || undefined,
      x: pos.x,
      y: pos.y,
      tamanho: novoTokTamanho,
      tipo: novoTokTipo,
      oculto: novoTokOculto,
    };
    setNovoTokNome("");
    setNovoTokImagem("");
    const ok = await executarPatchMestre(
      (m) => ({ ...m, tokens: [...m.tokens, novo] }),
      {
        acao: "adicionar_token",
        token: novo,
      }
    );
    if (ok) {
      onNotify(`Token "${novo.nome}" salvo no mapa!`, "sucesso");
    }
  };

  const temaSelecionado =
    TEMAS_FUNDO.find((t) => t.id === mapa.temaFundo) ?? TEMAS_FUNDO[0];

  const larguraPx = mapa.colunas * CELL_PX * zoom;
  const alturaPx = mapa.linhas * CELL_PX * zoom;
  const cellEscalada = CELL_PX * zoom;
  const rgbLinhaGrid = obterRgbLinhaGrid(mapa.corGrid || "#ffffff");

  const inputCls =
    "w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#f08b21] transition";

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

  const totalTravasIndividuais = new Set([
    ...mapa.jogadoresTravadosInsercao.map((x) => x.trim().toLowerCase()),
    ...mapa.jogadoresTravadosMovimento.map((x) => x.trim().toLowerCase()),
  ]).size;

  const fotoAtivaJogador = meuTokenNoMapa?.imagemUrl || fotoMeuToken;
  const corAtivaJogador = meuTokenNoMapa?.cor || corMeuToken;
  const imagemMapaEhUploadLocal = mapa.imagemUrl.startsWith("data:image/");
  const salvandoAgora = salvandoContador > 0 || processandoUpload;

  const textoStatusJogador = () => {
    if (!insercaoLiberadaParaMim && !movimentoLiberadoParaMim) {
      return "Inserção e movimentação travadas pelo Mestre neste momento.";
    }
    if (aguardandoCliquePosicionar) {
      return "Clique em qualquer quadrado revelado (sem Fog) no mapa abaixo para posicionar!";
    }
    if (meuTokenNoMapa) {
      if (!movimentoLiberadoParaMim) {
        return "Sua movimentação está travada pelo Mestre no momento.";
      }
      if (!insercaoLiberadaParaMim) {
        return "Arraste seu token pelas áreas sem Fog (recolher token está travado pelo Mestre).";
      }
      return "Arraste seu token livremente pelas áreas reveladas (sem Fog).";
    }
    if (!insercaoLiberadaParaMim) {
      return "O Mestre travou a opção de inserir seu token no mapa no momento.";
    }
    return "Personalize cor/foto do PC (salva automaticamente) e clique em 'Colocar meu token'.";
  };

  return (
    <div
      className={`${
        telaCheia
          ? "fixed inset-0 z-40 bg-[#09090b] p-4 flex flex-col gap-3 overflow-y-auto"
          : "bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 sm:p-5 space-y-4"
      }`}
    >
      {/* CABEÇALHO DO GRID + INDICADOR DE SINCRONIZAÇÃO */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-100">
            Grid Tático · {mapa.titulo || "Cena de Conflito"}
          </h3>
          <span className="text-xs font-mono text-zinc-500">
            ({mapa.colunas}×{mapa.linhas})
          </span>
          {salvandoAgora ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/60">
              <Loader2 className="w-3 h-3 animate-spin" />
              Salvando...
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
              <Check className="w-3 h-3 text-emerald-400" />
              Salvo · Ao vivo
            </span>
          )}
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
            title="Diminuir zoom da câmera"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="px-2 py-1 rounded-lg bg-zinc-950 text-zinc-300 border border-zinc-800 text-xs font-mono cursor-pointer"
            title="Resetar zoom para 100%"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() =>
              setZoom((z) => Math.min(1.8, Number((z + 0.15).toFixed(2))))
            }
            className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 text-zinc-300 border border-zinc-800 cursor-pointer"
            title="Aumentar zoom da câmera"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => void carregarMapa(false)}
            className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 text-zinc-300 border border-zinc-800 cursor-pointer"
            title="Sincronizar mapa agora"
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

      {/* BARRA EXCLUSIVA DO JOGADOR */}
      {modo === "jogador" && (
        <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div
              style={{
                backgroundColor: fotoAtivaJogador ? "#09090b" : corAtivaJogador,
                borderColor: fotoAtivaJogador ? corAtivaJogador : "#ffffffcc",
              }}
              className="w-11 h-11 rounded-full border-[3px] text-zinc-950 font-display font-bold text-sm flex items-center justify-center shadow overflow-hidden shrink-0"
            >
              {fotoAtivaJogador ? (
                <img
                  src={fotoAtivaJogador}
                  alt="Seu Token"
                  className="w-full h-full object-cover"
                />
              ) : (
                meuTokenNoMapa?.sigla ||
                fichaAlvoJogador?.sigla ||
                gerarSigla(nomePersonagemAtual || "Caçador")
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-xs sm:text-sm text-zinc-100">
                  {meuTokenNoMapa
                    ? `${meuTokenNoMapa.nome} no mapa (${meuTokenNoMapa.x + 1}, ${meuTokenNoMapa.y + 1})`
                    : `Token de ${fichaAlvoJogador?.nome || nomePersonagemAtual || "Seu Caçador"}`}
                </strong>
                {!insercaoLiberadaParaMim && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/70 border border-red-800/70 text-[10px] font-semibold text-red-300">
                    <Lock className="w-2.5 h-2.5" />
                    Inserção travada
                  </span>
                )}
                {!movimentoLiberadoParaMim && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/70 border border-red-800/70 text-[10px] font-semibold text-red-300">
                    <Lock className="w-2.5 h-2.5" />
                    Movimento travado
                  </span>
                )}
              </div>
              <span className="block text-[11px] text-zinc-400 mt-0.5">
                {textoStatusJogador()}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 mr-1">
              {CORES_TOKEN.slice(0, 6).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => void atualizarAparenciaTokenJogador({ cor: c })}
                  style={{ backgroundColor: c }}
                  className={`w-5 h-5 rounded-full border transition cursor-pointer ${
                    corAtivaJogador === c
                      ? "border-white scale-115"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                  title="Alterar cor do token"
                />
              ))}
            </div>

            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-medium transition cursor-pointer">
              <Camera className="w-3.5 h-3.5 text-[#f08b21]" />
              {processandoUpload ? "Salvando..." : "Foto do PC"}
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadFotoMeuToken}
                disabled={processandoUpload}
                className="hidden"
              />
            </label>

            {fotoAtivaJogador && (
              <button
                type="button"
                onClick={() =>
                  void atualizarAparenciaTokenJogador({ imagemUrl: "" })
                }
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 border border-zinc-800 cursor-pointer"
                title="Remover foto do token"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {!meuTokenNoMapa ? (
              <button
                type="button"
                disabled={!insercaoLiberadaParaMim}
                onClick={() => setAguardandoCliquePosicionar((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  aguardandoCliquePosicionar
                    ? "bg-emerald-500 text-zinc-950"
                    : "bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950"
                }`}
              >
                {insercaoLiberadaParaMim ? (
                  <MapPin className="w-3.5 h-3.5" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                {!insercaoLiberadaParaMim
                  ? "Inserção Travada"
                  : aguardandoCliquePosicionar
                    ? "Clique no mapa..."
                    : "Colocar meu token"}
              </button>
            ) : (
              <button
                type="button"
                disabled={!insercaoLiberadaParaMim}
                onClick={recolherMeuToken}
                title={
                  insercaoLiberadaParaMim
                    ? "Retirar seu token do mapa"
                    : "O Mestre travou o posicionamento/remoção de token"
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {!insercaoLiberadaParaMim && <Lock className="w-3 h-3" />}
                Recolher token
              </button>
            )}
          </div>
        </div>
      )}

      {/* BARRA DE FERRAMENTAS, TRAVAS E CONFIGURAÇÃO DO MESTRE */}
      {modo === "mestre" && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800 flex flex-wrap items-center justify-between gap-2.5">
            {/* Visibilidade e Travas Globais / Por Jogador */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const prox = !mapaRef.current.visivelJogadores;
                  void executarPatchMestre(
                    (m) => ({ ...m, visivelJogadores: prox }),
                    { acao: "atualizar_travas", visivelJogadores: prox }
                  );
                }}
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

              {/* Trava Global de Inserção */}
              <button
                type="button"
                onClick={() => {
                  const prox =
                    !mapaRef.current.posicionamentoJogadoresLiberado;
                  void executarPatchMestre(
                    (m) => ({ ...m, posicionamentoJogadoresLiberado: prox }),
                    {
                      acao: "atualizar_travas",
                      posicionamentoJogadoresLiberado: prox,
                    }
                  );
                }}
                title="Travar ou liberar a opção de todos os jogadores colocarem/recolherem tokens"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                  mapa.posicionamentoJogadoresLiberado
                    ? "bg-zinc-900 text-zinc-200 border-zinc-700"
                    : "bg-red-950/70 text-red-300 border-red-800/70"
                }`}
              >
                {mapa.posicionamentoJogadoresLiberado ? (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                    Inserção: Livre
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-red-400" />
                    Inserção: Travada (Todos)
                  </>
                )}
              </button>

              {/* Trava Global de Movimentação */}
              <button
                type="button"
                onClick={() => {
                  const prox = !mapaRef.current.movimentoJogadoresLiberado;
                  void executarPatchMestre(
                    (m) => ({ ...m, movimentoJogadoresLiberado: prox }),
                    {
                      acao: "atualizar_travas",
                      movimentoJogadoresLiberado: prox,
                    }
                  );
                }}
                title="Travar ou liberar a movimentação de todos os jogadores no mapa"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                  mapa.movimentoJogadoresLiberado
                    ? "bg-zinc-900 text-zinc-200 border-zinc-700"
                    : "bg-red-950/70 text-red-300 border-red-800/70"
                }`}
              >
                {mapa.movimentoJogadoresLiberado ? (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                    Movimento: Livre
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-red-400" />
                    Movimento: Travado (Todos)
                  </>
                )}
              </button>

              {/* Botão Travas por Jogador Específico */}
              <button
                type="button"
                onClick={() => setTravasIndividuaisAberta((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                  travasIndividuaisAberta
                    ? "bg-[#f08b21] text-zinc-950 border-[#f08b21]"
                    : totalTravasIndividuais > 0
                      ? "bg-amber-950/60 text-amber-200 border-amber-700/70"
                      : "bg-zinc-900 text-zinc-200 border-zinc-700"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Travas por Jogador
                {totalTravasIndividuais > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-bold">
                    {totalTravasIndividuais}
                  </span>
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
                Mapa, Grade &amp; Tokens
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

          {/* PAINEL DE TRAVAS GRANULARES (TODOS OU JOGADORES ESPECÍFICOS) */}
          {travasIndividuaisAberta && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                    Controle de Inserção e Movimentação (Todos ou Específicos)
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Trave ou libere todos de uma vez ou escolha exatamente quais
                    jogadores podem inserir/recolher e mover tokens.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      void executarPatchMestre(
                        (m) => ({
                          ...m,
                          posicionamentoJogadoresLiberado: true,
                          movimentoJogadoresLiberado: true,
                          jogadoresTravadosInsercao: [],
                          jogadoresTravadosMovimento: [],
                        }),
                        {
                          acao: "atualizar_travas",
                          posicionamentoJogadoresLiberado: true,
                          movimentoJogadoresLiberado: true,
                          jogadoresTravadosInsercao: [],
                          jogadoresTravadosMovimento: [],
                        }
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-800/60 text-[11px] font-semibold cursor-pointer"
                  >
                    Liberar Todos
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void executarPatchMestre(
                        (m) => ({
                          ...m,
                          posicionamentoJogadoresLiberado: false,
                          movimentoJogadoresLiberado: false,
                        }),
                        {
                          acao: "atualizar_travas",
                          posicionamentoJogadoresLiberado: false,
                          movimentoJogadoresLiberado: false,
                        }
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-red-950/70 hover:bg-red-900/70 text-red-300 border border-red-800/60 text-[11px] font-semibold cursor-pointer"
                  >
                    Travar Todos (Inserção + Movimento)
                  </button>
                </div>
              </div>

              {alvosPermissaoMestre.length === 0 ? (
                <p className="text-xs text-zinc-500 py-2">
                  Adicione fichas à crônica na aba &ldquo;Fichas &amp;
                  Jogadores&rdquo; para gerenciar travas individuais por
                  caçador.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {alvosPermissaoMestre.map((alvo) => {
                    const travadoInsIndividual = estaTravadoNaLista(
                      mapa.jogadoresTravadosInsercao,
                      alvo.chaveId,
                      alvo.emailLower
                    );
                    const travadoMovIndividual = estaTravadoNaLista(
                      mapa.jogadoresTravadosMovimento,
                      alvo.chaveId,
                      alvo.emailLower
                    );
                    const insEfetivamenteTravado =
                      !mapa.posicionamentoJogadoresLiberado ||
                      travadoInsIndividual;
                    const movEfetivamenteTravado =
                      !mapa.movimentoJogadoresLiberado || travadoMovIndividual;

                    return (
                      <div
                        key={alvo.chaveId}
                        className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <strong className="block text-xs text-zinc-100 truncate">
                            {alvo.nomePersonagem}
                          </strong>
                          <span className="block text-[10px] text-zinc-400 truncate">
                            {alvo.detalheJogador}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              void alternarTravaIndividual("insercao", alvo)
                            }
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border transition cursor-pointer ${
                              insEfetivamenteTravado
                                ? "bg-red-950/70 text-red-300 border-red-800/70"
                                : "bg-emerald-950/50 text-emerald-300 border-emerald-800/60"
                            }`}
                          >
                            {insEfetivamenteTravado ? (
                              <Lock className="w-3 h-3" />
                            ) : (
                              <Unlock className="w-3 h-3" />
                            )}
                            Inserir
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void alternarTravaIndividual("movimento", alvo)
                            }
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border transition cursor-pointer ${
                              movEfetivamenteTravado
                                ? "bg-red-950/70 text-red-300 border-red-800/70"
                                : "bg-emerald-950/50 text-emerald-300 border-emerald-800/60"
                            }`}
                          >
                            {movEfetivamenteTravado ? (
                              <Lock className="w-3 h-3" />
                            ) : (
                              <Unlock className="w-3 h-3" />
                            )}
                            Mover
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PAINEL ORGANIZADO: 1) IMAGEM & MAPAS SALVOS · 2) TAMANHO DA GRADE · 3) TOKENS */}
          {configAberta && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* BLOCO 1: CENÁRIO, UPLOAD DE IMAGEM E GALERIA SALVA */}
                <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/90 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                      1. Cenário &amp; Imagem do Mapa
                    </span>
                    {mapa.imagemUrl && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                        <Check className="w-3 h-3" />
                        Imagem salva no banco
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                        Nome da Cena
                      </label>
                      <input
                        type="text"
                        value={tituloDraft}
                        onFocus={() => {
                          editandoTituloRef.current = true;
                        }}
                        onChange={(e) => setTituloDraft(e.target.value)}
                        onBlur={() => void salvarTituloCena()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          }
                        }}
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                        {mapa.imagemUrl
                          ? "Encaixe da Imagem"
                          : "Tema Tático (sem imagem)"}
                      </label>
                      {mapa.imagemUrl ? (
                        <select
                          value={mapa.ajusteImagem || "esticar"}
                          onChange={(e) => {
                            const val = e.target.value as "esticar" | "cobrir";
                            void executarPatchMestre(
                              (m) => ({ ...m, ajusteImagem: val }),
                              { acao: "atualizar_config", ajusteImagem: val }
                            );
                          }}
                          className={inputCls}
                        >
                          <option value="esticar">
                            Mostrar Mapa Inteiro (sem cortar bordas)
                          </option>
                          <option value="cobrir">
                            Preencher Grade (cortar sobras)
                          </option>
                        </select>
                      ) : (
                        <select
                          value={mapa.temaFundo}
                          onChange={(e) => {
                            const tema = e.target.value as TemaFundoMapa;
                            void executarPatchMestre(
                              (m) => ({ ...m, temaFundo: tema }),
                              { acao: "atualizar_config", temaFundo: tema }
                            );
                          }}
                          className={inputCls}
                        >
                          {TEMAS_FUNDO.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Upload do PC + URL Externa com botão explícito Salvar */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 text-xs font-bold uppercase tracking-wider cursor-pointer shrink-0">
                        <Upload className="w-3.5 h-3.5" />
                        {processandoUpload
                          ? "Salvando..."
                          : "Enviar Mapa do PC"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadImagemMapaMestre}
                          disabled={processandoUpload}
                          className="hidden"
                        />
                      </label>

                      {mapa.imagemUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            void executarPatchMestre(
                              (m) => ({ ...m, imagemUrl: "" }),
                              {
                                acao: "salvar_imagem_mapa",
                                imagemUrl: "",
                                salvarNaGaleria: false,
                              }
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-red-300 border border-zinc-800 text-xs cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Usar fundo tático (sem imagem)
                        </button>
                      )}
                    </div>

                    {!imagemMapaEhUploadLocal && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="url"
                          value={urlMapaDraft}
                          onChange={(e) => setUrlMapaDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              void salvarUrlImagemMapaMestre();
                            }
                          }}
                          placeholder="Ou cole URL https:// da imagem e clique em Salvar URL..."
                          className={inputCls}
                        />
                        <button
                          type="button"
                          onClick={() => void salvarUrlImagemMapaMestre()}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold shrink-0 cursor-pointer"
                        >
                          Salvar URL
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Galeria Persistente de Mapas Salvos no Banco */}
                  {mapa.mapasSalvos && mapa.mapasSalvos.length > 0 && (
                    <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                        Mapas Salvos no Banco (clique para reutilizar)
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {mapa.mapasSalvos.map((item) => {
                          const ativo = mapa.imagemUrl === item.imagemUrl;
                          return (
                            <div
                              key={item.id}
                              className={`inline-flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-lg border text-xs transition ${
                                ativo
                                  ? "bg-[#f08b21]/15 border-[#f08b21] text-zinc-100"
                                  : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  void executarPatchMestre(
                                    (m) => ({
                                      ...m,
                                      imagemUrl: item.imagemUrl,
                                    }),
                                    {
                                      acao: "salvar_imagem_mapa",
                                      imagemUrl: item.imagemUrl,
                                      nomeImagem: item.nome,
                                      salvarNaGaleria: false,
                                    }
                                  )
                                }
                                className="inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <img
                                  src={item.imagemUrl}
                                  alt={item.nome}
                                  className="w-6 h-6 rounded object-cover border border-zinc-700"
                                />
                                <span className="max-w-[110px] truncate font-medium">
                                  {item.nome}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void executarPatchMestre(
                                    (m) => ({
                                      ...m,
                                      mapasSalvos: (m.mapasSalvos || []).filter(
                                        (x) => x.id !== item.id
                                      ),
                                    }),
                                    {
                                      acao: "remover_mapa_salvo",
                                      mapaSalvoId: item.id,
                                    }
                                  )
                                }
                                className="p-0.5 text-zinc-500 hover:text-red-400 cursor-pointer"
                                title="Excluir da galeria de mapas salvos"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* BLOCO 2: TAMANHO DO GRID & APARÊNCIA DAS LINHAS (CLARO E DIRETO!) */}
                <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/90 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-200">
                      <Grid3X3 className="w-3.5 h-3.5 text-[#f08b21]" />
                      2. Tamanho do Grid &amp; Grade
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {mapa.colunas} × {mapa.linhas} q (
                      {(mapa.colunas * 1.5).toFixed(0)}m ×{" "}
                      {(mapa.linhas * 1.5).toFixed(0)}m)
                    </span>
                  </div>

                  {/* Presets Rápidos de 1 Clique */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {PRESETS_TAMANHO_GRID.map((p) => {
                      const ativo =
                        mapa.colunas === p.colunas && mapa.linhas === p.linhas;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() =>
                            void aplicarTamanhoGrid(p.colunas, p.linhas)
                          }
                          className={`px-2 py-1.5 rounded-lg border text-center transition cursor-pointer ${
                            ativo
                              ? "bg-[#f08b21] text-zinc-950 border-[#f08b21] font-bold"
                              : "bg-zinc-950 hover:bg-zinc-900 text-zinc-300 border-zinc-800"
                          }`}
                        >
                          <span className="block text-[11px] leading-tight">
                            {p.label}
                          </span>
                          <span className="block text-[10px] opacity-80 font-mono">
                            {p.detalhe}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Ajuste Fino Largura × Altura com botões -/+ e digitação livre */}
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                        Largura (6 a 44 q)
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            void aplicarTamanhoGrid(
                              mapa.colunas - 1,
                              mapa.linhas
                            )
                          }
                          className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 cursor-pointer"
                          title="Diminuir 1 coluna"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={colunasDraft}
                          onFocus={() => {
                            editandoTamanhoRef.current = true;
                          }}
                          onChange={(e) =>
                            setColunasDraft(
                              e.target.value.replace(/[^0-9]/g, "")
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") aplicarTamanhoRascunho();
                          }}
                          className="w-full px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-center font-mono text-xs text-zinc-100 focus:outline-none focus:border-[#f08b21]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            void aplicarTamanhoGrid(
                              mapa.colunas + 1,
                              mapa.linhas
                            )
                          }
                          className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 cursor-pointer"
                          title="Aumentar 1 coluna"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                        Altura (6 a 36 q)
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            void aplicarTamanhoGrid(
                              mapa.colunas,
                              mapa.linhas - 1
                            )
                          }
                          className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 cursor-pointer"
                          title="Diminuir 1 linha"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={linhasDraft}
                          onFocus={() => {
                            editandoTamanhoRef.current = true;
                          }}
                          onChange={(e) =>
                            setLinhasDraft(
                              e.target.value.replace(/[^0-9]/g, "")
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") aplicarTamanhoRascunho();
                          }}
                          className="w-full px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-center font-mono text-xs text-zinc-100 focus:outline-none focus:border-[#f08b21]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            void aplicarTamanhoGrid(
                              mapa.colunas,
                              mapa.linhas + 1
                            )
                          }
                          className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 cursor-pointer"
                          title="Aumentar 1 linha"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={aplicarTamanhoRascunho}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold cursor-pointer h-[32px]"
                    >
                      Aplicar
                    </button>
                  </div>

                  {/* Ajustar proporção à imagem + Cor/Opacidade da Grade */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-800/80">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                        Linhas:
                      </span>
                      {NIVEIS_OPACIDADE_GRID.map((nv) => {
                        const ativo =
                          Math.abs((mapa.opacidadeGrid ?? 0.32) - nv.valor) <
                          0.05;
                        return (
                          <button
                            key={nv.label}
                            type="button"
                            onClick={() =>
                              void executarPatchMestre(
                                (m) => ({ ...m, opacidadeGrid: nv.valor }),
                                {
                                  acao: "atualizar_config",
                                  opacidadeGrid: nv.valor,
                                }
                              )
                            }
                            className={`px-2 py-0.5 rounded text-[11px] border cursor-pointer ${
                              ativo
                                ? "bg-zinc-200 text-zinc-950 border-zinc-200 font-semibold"
                                : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                            }`}
                          >
                            {nv.label}
                          </button>
                        );
                      })}

                      {CORES_LINHA_GRID.map((cg) => {
                        const ativa =
                          (mapa.corGrid || "#ffffff").toLowerCase() === cg.id;
                        return (
                          <button
                            key={cg.id}
                            type="button"
                            onClick={() =>
                              void executarPatchMestre(
                                (m) => ({ ...m, corGrid: cg.id }),
                                { acao: "atualizar_config", corGrid: cg.id }
                              )
                            }
                            className={`px-2 py-0.5 rounded text-[11px] border cursor-pointer ${
                              ativa
                                ? "border-[#f08b21] text-[#f08b21] bg-[#f08b21]/10 font-semibold"
                                : "border-zinc-800 text-zinc-400 bg-zinc-950"
                            }`}
                          >
                            {cg.label}
                          </button>
                        );
                      })}
                    </div>

                    {mapa.imagemUrl && (
                      <button
                        type="button"
                        onClick={() => void ajustarProporcaoPelaImagem()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#f08b21]/15 hover:bg-[#f08b21]/25 text-[#f08b21] border border-[#f08b21]/40 text-[11px] font-semibold cursor-pointer"
                        title="Calcula automaticamente a Altura (linhas) ideal para não achatar nem esticar a imagem do mapa"
                      >
                        <Proportions className="w-3.5 h-3.5" />
                        Ajustar à Proporção da Imagem
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* BLOCO 3: INSERÇÃO E GERENCIAMENTO DE TOKENS */}
              <div className="pt-3 border-t border-zinc-800 space-y-3">
                {/* Caçadores da Crônica */}
                <div className="space-y-1.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    3. Inserir Caçadores da Crônica (mantém foto salva)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {fichasCronicaMestre.length === 0 ? (
                      <span className="text-xs text-zinc-500">
                        Nenhuma ficha vinculada na crônica ainda.
                      </span>
                    ) : (
                      fichasCronicaMestre.map((f) => {
                        const nome =
                          f.dados?.identidade?.nome?.trim() ||
                          f.nome ||
                          "Caçador";
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => void inserirCacadorPeloMestre(f)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs cursor-pointer"
                          >
                            <UserPlus className="w-3 h-3 text-[#f08b21]" />+{" "}
                            {nome}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Ameaças, PdMs & NPCs cadastrados */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      Ameaças, PdMs &amp; NPCs Cadastrados
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={ameacaTamPadrao}
                        onChange={(e) =>
                          setAmeacaTamPadrao(
                            Number(e.target.value) as 1 | 2 | 3
                          )
                        }
                        className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-200"
                      >
                        <option value={1}>Inserir 1×1</option>
                        <option value={2}>Inserir 2×2</option>
                        <option value={3}>Inserir 3×3</option>
                      </select>
                      <label className="inline-flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ameacaInserirOculta}
                          onChange={(e) =>
                            setAmeacaInserirOculta(e.target.checked)
                          }
                          className="accent-[#f08b21]"
                        />
                        Inserir Oculto
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {ameacasMestre.length === 0 ? (
                      <span className="text-xs text-zinc-500">
                        Crie fichas na aba &ldquo;Ameaças &amp; PdMs&rdquo; para
                        inseri-las com 1 clique, ou crie tokens personalizados
                        abaixo.
                      </span>
                    ) : (
                      ameacasMestre.map((a) => {
                        const ehPdm = a.categoria === "PdM / Aliado";
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => void inserirAmeacaPeloMestre(a)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer ${
                              ehPdm
                                ? "bg-blue-950/40 hover:bg-blue-950/70 text-blue-200 border-blue-800/60"
                                : "bg-red-950/40 hover:bg-red-950/70 text-red-200 border-red-800/60"
                            }`}
                          >
                            {ehPdm ? (
                              <UserCheck className="w-3 h-3" />
                            ) : (
                              <ShieldAlert className="w-3 h-3" />
                            )}
                            + {a.nome}
                            <span className="text-[10px] opacity-70">
                              ({a.categoria})
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Criar Token Personalizado / NPC / Objeto */}
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/90 space-y-2.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                    Criar Token Personalizado (Ameaça, NPC, Aliado, Veículo ou
                    Objeto)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_150px_115px_52px_auto_auto_auto] gap-2 items-center">
                    <input
                      type="text"
                      value={novoTokNome}
                      onChange={(e) => setNovoTokNome(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          void criarTokenPersonalizadoMestre();
                        }
                      }}
                      placeholder="Nome (ex: Lobisomem, Policial, Van, Altar...)"
                      className={inputCls}
                    />

                    <select
                      value={novoTokTipo}
                      onChange={(e) =>
                        setNovoTokTipo(e.target.value as "ameaca" | "marcador")
                      }
                      className={inputCls}
                    >
                      <option value="ameaca">Ameaça / NPC</option>
                      <option value="marcador">Aliado / Objeto</option>
                    </select>

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
                      title="Cor da borda/fundo do token"
                      className="w-full h-[32px] rounded bg-zinc-950 border border-zinc-800 cursor-pointer"
                    />

                    <div className="flex items-center gap-1">
                      <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs cursor-pointer">
                        {novoTokImagem ? (
                          <img
                            src={novoTokImagem}
                            alt="Token"
                            className="w-4 h-4 rounded-full object-cover"
                          />
                        ) : (
                          <ImagePlus className="w-3.5 h-3.5 text-[#f08b21]" />
                        )}
                        {novoTokImagem ? "Foto pronta" : "Foto do PC"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadFotoNovoTokenMestre}
                          disabled={processandoUpload}
                          className="hidden"
                        />
                      </label>
                      {novoTokImagem && (
                        <button
                          type="button"
                          onClick={() => setNovoTokImagem("")}
                          className="p-1 text-zinc-400 hover:text-red-400 cursor-pointer"
                          title="Remover foto selecionada"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 cursor-pointer">
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
                      onClick={() => void criarTokenPersonalizadoMestre()}
                      className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Inserir
                    </button>
                  </div>
                </div>

                {/* Lista e Edição Rápida de Tokens Ativos no Mapa */}
                {mapa.tokens.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                        Tokens no Tabuleiro ({mapa.tokens.length}) — troque
                        foto, tamanho ou visibilidade
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          void executarPatchMestre(
                            (m) => ({ ...m, tokens: [] }),
                            { acao: "limpar_tokens" }
                          )
                        }
                        className="text-[11px] text-red-400 hover:underline cursor-pointer"
                      >
                        Remover todos do mapa
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {mapa.tokens.map((t) => (
                        <div
                          key={t.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs"
                        >
                          {t.imagemUrl ? (
                            <img
                              src={t.imagemUrl}
                              alt={t.nome}
                              style={{ borderColor: t.cor }}
                              className="w-5 h-5 rounded-full object-cover border-2"
                            />
                          ) : (
                            <span
                              style={{ backgroundColor: t.cor }}
                              className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[8px] font-bold text-zinc-950"
                            >
                              {t.sigla}
                            </span>
                          )}

                          <span className="text-zinc-200 font-medium max-w-[120px] truncate">
                            {t.nome}
                          </span>

                          <select
                            value={t.tamanho || 1}
                            onChange={(e) => {
                              const novoTam = Number(e.target.value) as
                                | 1
                                | 2
                                | 3;
                              void executarPatchMestre(
                                (m) => ({
                                  ...m,
                                  tokens: m.tokens.map((x) =>
                                    x.id === t.id
                                      ? { ...x, tamanho: novoTam }
                                      : x
                                  ),
                                }),
                                {
                                  acao: "editar_token",
                                  tokenId: t.id,
                                  tamanho: novoTam,
                                }
                              );
                            }}
                            className="px-1 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300"
                            title="Tamanho do token"
                          >
                            <option value={1}>1×1</option>
                            <option value={2}>2×2</option>
                            <option value={3}>3×3</option>
                          </select>

                          <label
                            className="p-1 rounded text-zinc-400 hover:text-[#f08b21] cursor-pointer"
                            title="Enviar foto do PC para este token (fica salva)"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(ev) =>
                                void handleTrocarFotoTokenExistenteMestre(
                                  t.id,
                                  ev
                                )
                              }
                              className="hidden"
                            />
                          </label>

                          {t.imagemUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                void executarPatchMestre(
                                  (m) => ({
                                    ...m,
                                    tokens: m.tokens.map((x) =>
                                      x.id === t.id
                                        ? { ...x, imagemUrl: undefined }
                                        : x
                                    ),
                                  }),
                                  {
                                    acao: "editar_token",
                                    tokenId: t.id,
                                    imagemUrl: "",
                                  }
                                )
                              }
                              className="p-0.5 rounded text-zinc-500 hover:text-amber-400 cursor-pointer"
                              title="Remover foto deste token"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              const proxOculto = !t.oculto;
                              void executarPatchMestre(
                                (m) => ({
                                  ...m,
                                  tokens: m.tokens.map((x) =>
                                    x.id === t.id
                                      ? { ...x, oculto: proxOculto }
                                      : x
                                  ),
                                }),
                                {
                                  acao: "editar_token",
                                  tokenId: t.id,
                                  oculto: proxOculto,
                                }
                              );
                            }}
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
                              void executarPatchMestre(
                                (m) => ({
                                  ...m,
                                  tokens: m.tokens.filter(
                                    (x) => x.id !== t.id
                                  ),
                                }),
                                { acao: "remover_token", tokenId: t.id }
                              )
                            }
                            className="p-1 rounded text-zinc-500 hover:text-red-400 cursor-pointer"
                            title="Remover token do mapa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
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
                    backgroundSize:
                      mapa.ajusteImagem === "cobrir" ? "cover" : "100% 100%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
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
            {mapa.opacidadeGrid > 0 && (
              <div
                style={{
                  backgroundSize: `${cellEscalada}px ${cellEscalada}px`,
                  backgroundImage: `linear-gradient(to right, rgba(${rgbLinhaGrid},${mapa.opacidadeGrid}) 1px, transparent 1px), linear-gradient(to bottom, rgba(${rgbLinhaGrid},${mapa.opacidadeGrid}) 1px, transparent 1px)`,
                }}
                className="absolute inset-0 pointer-events-none"
              />
            )}

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
              const temFoto = Boolean(tok.imagemUrl);

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
                    backgroundColor: temFoto ? "#09090b" : tok.cor || "#f08b21",
                    borderColor: temFoto
                      ? tok.cor || "#f08b21"
                      : "rgba(255,255,255,0.92)",
                  }}
                  className={`absolute rounded-full flex flex-col items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.8)] select-none transition-transform ${
                    tok.oculto
                      ? "opacity-55 border-[3px] border-dashed"
                      : "border-[3px]"
                  } ${
                    movivel
                      ? "cursor-grab active:cursor-grabbing hover:scale-105 z-20"
                      : "pointer-events-none z-10"
                  }`}
                  title={tok.nome}
                >
                  {temFoto ? (
                    <div className="w-full h-full rounded-full overflow-hidden pointer-events-none">
                      <img
                        src={tok.imagemUrl}
                        alt={tok.nome}
                        draggable={false}
                        className="w-full h-full object-cover select-none"
                      />
                    </div>
                  ) : (
                    <span
                      style={{
                        fontSize: `${Math.max(10, Math.round(13 * zoom))}px`,
                      }}
                      className="font-display font-extrabold text-zinc-950 leading-none drop-shadow-[0_1px_1px_rgba(255,255,255,0.45)]"
                    >
                      {tok.sigla}
                    </span>
                  )}
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

function mNomePadrao(titulo: string): string {
  return titulo?.trim() || "Mapa Enviado";
}
