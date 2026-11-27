"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  CloudFog,
  Eye,
  EyeOff,
  Hand,
  ImagePlus,
  Lock,
  MapPin,
  Maximize2,
  Minimize2,
  MousePointer,
  Plus,
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

const MAPA_INICIAL: MapaTaticoEstado = {
  visivelJogadores: false,
  posicionamentoJogadoresLiberado: true,
  movimentoJogadoresLiberado: true,
  jogadoresTravadosInsercao: [],
  jogadoresTravadosMovimento: [],
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

  // Controles visuais locais de câmera e painéis do Mestre
  const [zoom, setZoom] = useState(1);
  const [telaCheia, setTelaCheia] = useState(false);
  const [ferramenta, setFerramenta] = useState<FerramentaMestre>("mover");
  const [configAberta, setConfigAberta] = useState(modo === "mestre");
  const [travasIndividuaisAberta, setTravasIndividuaisAberta] = useState(false);
  const [processandoUpload, setProcessandoUpload] = useState(false);

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
          setMapa({
            ...MAPA_INICIAL,
            ...json.mapa,
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
          });
        }
      } catch {
        // Silencioso no polling
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

  // Identifica a ficha do jogador para colocar/mover token
  const fichaAlvoJogador = useMemo(() => {
    if (fichaAtualId) {
      const achada = minhasFichas.find((f) => f.id === fichaAtualId);
      if (achada) return achada;
    }
    return minhasFichas[0] ?? null;
  }, [fichaAtualId, minhasFichas]);

  // Carrega foto local salva do token do jogador
  useEffect(() => {
    if (modo !== "jogador") return;
    const chave = `cacador_token_foto_${fichaAlvoJogador?.id || "padrao"}`;
    try {
      const salva = localStorage.getItem(chave);
      if (salva) setFotoMeuToken(salva);
    } catch {
      // Ignorar storage indisponível
    }
  }, [modo, fichaAlvoJogador?.id]);

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

  // Permissões efetivas do jogador atual (Global + Individual)
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
        detalheJogador: jogador ? `${jogador} (${f.owner_email})` : f.owner_email,
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
    const listaAtual =
      tipo === "insercao"
        ? mapa.jogadoresTravadosInsercao
        : mapa.jogadoresTravadosMovimento;

    const jaTravado = estaTravadoNaLista(
      listaAtual,
      alvo.chaveId,
      alvo.emailLower
    );

    const chLower = alvo.chaveId.trim().toLowerCase();
    const emLower = alvo.emailLower.trim().toLowerCase();

    let novaLista: string[];
    if (jaTravado) {
      novaLista = listaAtual.filter((item) => {
        const norm = item.trim().toLowerCase();
        if (norm === chLower) return false;
        if (emLower && norm === emLower) return false;
        return true;
      });
    } else {
      novaLista = [...listaAtual, alvo.chaveId];
    }

    if (tipo === "insercao") {
      await salvarMapaMestre({
        ...mapa,
        jogadoresTravadosInsercao: novaLista,
      });
    } else {
      await salvarMapaMestre({
        ...mapa,
        jogadoresTravadosMovimento: novaLista,
      });
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

  // --- Ações do Jogador ---
  const atualizarAparenciaTokenJogador = async (opcoes: {
    cor?: string;
    imagemUrl?: string;
  }) => {
    if (opcoes.cor !== undefined) setCorMeuToken(opcoes.cor);
    if (opcoes.imagemUrl !== undefined) {
      salvarFotoLocalJogador(opcoes.imagemUrl);
    }

    if (!meuTokenNoMapa) return;

    const resp = await fetch("/api/mapa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        acao: "atualizar_aparencia_meu_token",
        tokenId: meuTokenNoMapa.id,
        ...(opcoes.cor !== undefined ? { cor: opcoes.cor } : {}),
        ...(opcoes.imagemUrl !== undefined
          ? { imagemUrl: opcoes.imagemUrl }
          : {}),
      }),
    });

    if (resp.ok) {
      await carregarMapa(true);
    } else {
      const j = await resp.json().catch(() => ({}));
      onNotify(j.error || "Erro ao atualizar aparência do token.", "erro");
    }
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
      onNotify("Foto do token carregada!", "sucesso");
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
    const json = await resp.json();
    if (!resp.ok) {
      onNotify(json.error || "Não foi possível posicionar o token.", "erro");
      return;
    }
    await carregarMapa(true);
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
    } else {
      const j = await resp.json().catch(() => ({}));
      onNotify(j.error || "Não foi possível recolher o token.", "erro");
    }
  };

  // --- Uploads de Imagem do Computador pelo Mestre ---
  const handleUploadImagemMapaMestre = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;

    setProcessandoUpload(true);
    try {
      const dataUrl = await comprimirImagemMapa(arquivo);
      const ok = await salvarMapaMestre({ ...mapa, imagemUrl: dataUrl });
      if (ok) {
        onNotify("Imagem do mapa enviada e aplicada com sucesso!", "sucesso");
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
      await salvarMapaMestre({
        ...mapa,
        tokens: mapa.tokens.map((t) =>
          t.id === tokenId ? { ...t, imagemUrl: dataUrl } : t
        ),
      });
      onNotify("Foto do token atualizada!", "sucesso");
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

  const encontrarCelulaInicialLivre = (
    tamanho = 1
  ): { x: number; y: number } => {
    for (let y = 1; y <= Math.max(1, mapa.linhas - tamanho - 1); y += 1) {
      for (let x = 1; x <= Math.max(1, mapa.colunas - tamanho - 1); x += 1) {
        if (!mapa.tokens.some((t) => t.x === x && t.y === y)) {
          return { x, y };
        }
      }
    }
    return { x: 0, y: 0 };
  };

  const inserirCacadorPeloMestre = async (f: FichaResumoOnline) => {
    const jaExiste = mapa.tokens.some((t) => t.fichaId === f.id);
    if (jaExiste) {
      onNotify("Este caçador já está posicionado no grid.", "info");
      return;
    }
    const nome = f.dados?.identidade?.nome?.trim() || f.nome || "Caçador";
    const pos = encontrarCelulaInicialLivre(1);
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
    const pos = encontrarCelulaInicialLivre(ameacaTamPadrao);
    const ehAliadoPdm = a.categoria === "PdM / Aliado";
    const novo: TokenMapa = {
      id: `ame-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      nome: a.nome,
      cor: ehAliadoPdm ? "#3b82f6" : "#dc2626",
      sigla: gerarSigla(a.nome),
      x: pos.x,
      y: pos.y,
      tamanho: ameacaTamPadrao,
      tipo: "ameaca",
      ameacaId: a.id,
      oculto: ameacaInserirOculta,
    };
    await salvarMapaMestre({ ...mapa, tokens: [...mapa.tokens, novo] });
    onNotify(
      `"${a.nome}" inserido no grid (${ameacaInserirOculta ? "Oculto p/ jogadores" : "Visível"}).`,
      "info"
    );
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
    await salvarMapaMestre({ ...mapa, tokens: [...mapa.tokens, novo] });
    onNotify(`Token "${novo.nome}" adicionado ao mapa!`, "sucesso");
  };

  const temaSelecionado =
    TEMAS_FUNDO.find((t) => t.id === mapa.temaFundo) ?? TEMAS_FUNDO[0];

  const larguraPx = mapa.colunas * CELL_PX * zoom;
  const alturaPx = mapa.linhas * CELL_PX * zoom;
  const cellEscalada = CELL_PX * zoom;

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
    return "Personalize cor/foto do PC e clique em 'Colocar meu token'.";
  };

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

      {/* BARRA EXCLUSIVA DO JOGADOR: FOTO DO TOKEN, COR, POSICIONAMENTO E TRAVAS */}
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
            {/* Seletor de cor do anel/fundo */}
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

            {/* Upload de imagem do computador para o token do jogador */}
            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-medium transition cursor-pointer">
              <Camera className="w-3.5 h-3.5 text-[#f08b21]" />
              {processandoUpload ? "Enviando..." : "Foto do PC"}
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

              {/* Trava Global de Inserção */}
              <button
                type="button"
                onClick={() =>
                  salvarMapaMestre({
                    ...mapa,
                    posicionamentoJogadoresLiberado:
                      !mapa.posicionamentoJogadoresLiberado,
                  })
                }
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
                onClick={() =>
                  salvarMapaMestre({
                    ...mapa,
                    movimentoJogadoresLiberado:
                      !mapa.movimentoJogadoresLiberado,
                  })
                }
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
                Mapa &amp; Tokens
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
                      salvarMapaMestre({
                        ...mapa,
                        posicionamentoJogadoresLiberado: true,
                        movimentoJogadoresLiberado: true,
                        jogadoresTravadosInsercao: [],
                        jogadoresTravadosMovimento: [],
                      })
                    }
                    className="px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-800/60 text-[11px] font-semibold cursor-pointer"
                  >
                    Liberar Todos
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      salvarMapaMestre({
                        ...mapa,
                        posicionamentoJogadoresLiberado: false,
                        movimentoJogadoresLiberado: false,
                      })
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
                            title={
                              !mapa.posicionamentoJogadoresLiberado
                                ? "A trava global de inserção está ativa para todos"
                                : "Alternar trava de inserção/remoção para este jogador"
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
                            title={
                              !mapa.movimentoJogadoresLiberado
                                ? "A trava global de movimento está ativa para todos"
                                : "Alternar trava de movimentação para este jogador"
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

          {/* PAINEL EXPANSÍVEL DE MAPA, UPLOAD DE IMAGEM E INSERÇÃO DE TOKENS */}
          {configAberta && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
              {/* Configuração do Mapa + Upload do Computador */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
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

                <div className="lg:col-span-2 space-y-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Imagem do Mapa (Upload do PC ou URL)
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f08b21]/15 hover:bg-[#f08b21]/25 text-[#f08b21] border border-[#f08b21]/50 text-xs font-semibold cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      {processandoUpload ? "Processando..." : "Enviar do PC"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadImagemMapaMestre}
                        disabled={processandoUpload}
                        className="hidden"
                      />
                    </label>

                    {imagemMapaEhUploadLocal ? (
                      <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-emerald-300 min-w-0 flex-1">
                        <img
                          src={mapa.imagemUrl}
                          alt="Preview Mapa"
                          className="w-5 h-5 rounded object-cover shrink-0"
                        />
                        <span className="truncate">Imagem do PC ativa</span>
                        <button
                          type="button"
                          onClick={() =>
                            salvarMapaMestre({ ...mapa, imagemUrl: "" })
                          }
                          className="ml-auto text-zinc-400 hover:text-red-400 cursor-pointer"
                          title="Remover imagem do mapa"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <input
                          type="url"
                          value={mapa.imagemUrl}
                          onChange={(e) =>
                            setMapa({ ...mapa, imagemUrl: e.target.value })
                          }
                          placeholder="Ou cole URL https://..."
                          className={inputCls}
                        />
                        {mapa.imagemUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              salvarMapaMestre({ ...mapa, imagemUrl: "" })
                            }
                            className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-red-400 border border-zinc-800 cursor-pointer"
                            title="Limpar URL"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Tema (se sem imagem)
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

                <button
                  type="button"
                  onClick={() => salvarMapaMestre(mapa)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider cursor-pointer h-[32px]"
                >
                  Salvar Mapa
                </button>
              </div>

              {/* INSERÇÃO DE TOKENS: CAÇADORES, AMEAÇAS/PDMs E TOKENS PERSONALIZADOS */}
              <div className="pt-3 border-t border-zinc-800 space-y-3">
                {/* 1. Caçadores da Crônica */}
                <div className="space-y-1.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Caçadores da Crônica
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
                            onClick={() => inserirCacadorPeloMestre(f)}
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

                {/* 2. Ameaças, Monstros, Rivais e PdMs cadastrados */}
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
                        Crie fichas de Ameaças e PdMs na aba &ldquo;Ameaças &amp;
                        PdMs&rdquo; para inseri-las com 1 clique, ou crie tokens
                        personalizados abaixo.
                      </span>
                    ) : (
                      ameacasMestre.map((a) => {
                        const ehPdm = a.categoria === "PdM / Aliado";
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => inserirAmeacaPeloMestre(a)}
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

                {/* 3. Criar Token Personalizado / NPC / Objeto com Upload de Foto */}
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

                    {/* Botão de Upload de Foto para o Token Personalizado */}
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
                      onClick={criarTokenPersonalizadoMestre}
                      className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Inserir
                    </button>
                  </div>
                </div>

                {/* 4. Lista e Edição Rápida de Tokens Ativos no Mapa */}
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
                          salvarMapaMestre({ ...mapa, tokens: [] })
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

                          {/* Alterar tamanho rapidamente */}
                          <select
                            value={t.tamanho || 1}
                            onChange={(e) =>
                              salvarMapaMestre({
                                ...mapa,
                                tokens: mapa.tokens.map((x) =>
                                  x.id === t.id
                                    ? {
                                        ...x,
                                        tamanho: Number(e.target.value) as
                                          | 1
                                          | 2
                                          | 3,
                                      }
                                    : x
                                ),
                              })
                            }
                            className="px-1 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300"
                            title="Tamanho do token"
                          >
                            <option value={1}>1×1</option>
                            <option value={2}>2×2</option>
                            <option value={3}>3×3</option>
                          </select>

                          {/* Enviar/trocar foto de qualquer token já posicionado */}
                          <label
                            className="p-1 rounded text-zinc-400 hover:text-[#f08b21] cursor-pointer"
                            title="Enviar foto do PC para este token"
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
                                salvarMapaMestre({
                                  ...mapa,
                                  tokens: mapa.tokens.map((x) =>
                                    x.id === t.id
                                      ? { ...x, imagemUrl: undefined }
                                      : x
                                  ),
                                })
                              }
                              className="p-0.5 rounded text-zinc-500 hover:text-amber-400 cursor-pointer"
                              title="Remover foto deste token"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              salvarMapaMestre({
                                ...mapa,
                                tokens: mapa.tokens.map((x) =>
                                  x.id === t.id
                                    ? { ...x, oculto: !x.oculto }
                                    : x
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
                                tokens: mapa.tokens.filter(
                                  (x) => x.id !== t.id
                                ),
                              })
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
