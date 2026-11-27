"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudOff,
  Crosshair,
  Dices,
  Download,
  FileJson,
  FileText,
  FolderOpen,
  HeartPulse,
  Home,
  ListOrdered,
  Loader2,
  Lock,
  LogOut,
  Menu,
  PlusCircle,
  Save,
  Shield,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { EscudoMestre } from "@/components/EscudoMestre";
import { MenuInicial } from "@/components/MenuInicial";
import { ModalMinhasFichas } from "@/components/ModalMinhasFichas";
import { AbaAtributos } from "@/components/abas/AbaAtributos";
import { AbaDanos } from "@/components/abas/AbaDanos";
import { AbaExtras } from "@/components/abas/AbaExtras";
import { AbaHabilidades } from "@/components/abas/AbaHabilidades";
import { AbaIdentidade } from "@/components/abas/AbaIdentidade";
import { AbaIniciativa } from "@/components/abas/AbaIniciativa";
import { AbaPrevia } from "@/components/abas/AbaPrevia";
import { AbaRolagem } from "@/components/abas/AbaRolagem";
import { AbaTrunfos } from "@/components/abas/AbaTrunfos";
import { AbaVantagens } from "@/components/abas/AbaVantagens";
import { AbaXp } from "@/components/abas/AbaXp";
import type { UsuarioSessao } from "@/lib/auth";
import {
  criarFichaVazia,
  detectarDistribuicaoHabilidades,
  gerarTextoFicha,
  nomeArquivoSeguro,
  nomeFichaAtual,
  normalizarFicha,
  totalCaixasVitalidade,
  totalCaixasVontade,
  validarFicha,
  xpDisponivel,
} from "@/lib/regras";
import type {
  FichaDados,
  FichaResumoOnline,
  RegistroRolagemFicha,
} from "@/types/ficha";

const STORAGE_KEY = "ficha-cacador-a-revanche-5e-v2";

type ModoTela = "menu" | "criacao" | "gerenciar" | "admin";
type EtapaId =
  | "identidade"
  | "atributos"
  | "habilidades"
  | "vantagens"
  | "trunfos"
  | "extras"
  | "dano"
  | "rolagem"
  | "iniciativa"
  | "xp"
  | "preview";

const ABAS_LABELS: Record<EtapaId, string> = {
  identidade: "Identidade",
  atributos: "Atributos",
  habilidades: "Habilidades",
  vantagens: "Vantagens",
  trunfos: "Trunfos",
  extras: "Extras",
  dano: "Danos",
  rolagem: "Rolagens e Grid",
  iniciativa: "Iniciativa",
  xp: "XP",
  preview: "Prévia",
};

const ETAPAS_CRIACAO: EtapaId[] = [
  "identidade",
  "atributos",
  "habilidades",
  "vantagens",
  "trunfos",
  "extras",
  "preview",
];

const ETAPAS_GERENCIAR: EtapaId[] = [
  "preview",
  "dano",
  "rolagem",
  "iniciativa",
  "xp",
  "extras",
];

const ETAPAS_ADMIN_EDIT: EtapaId[] = [
  "identidade",
  "atributos",
  "habilidades",
  "vantagens",
  "trunfos",
  "extras",
  "dano",
  "rolagem",
  "iniciativa",
  "xp",
  "preview",
];

interface Notificacao {
  id: number;
  texto: string;
  tipo: "erro" | "info" | "sucesso";
}

export function CacadorApp() {
  const [user, setUser] = useState<UsuarioSessao | null>(null);
  const [carregandoAuth, setCarregandoAuth] = useState(true);

  const [modoTela, setModoTela] = useState<ModoTela>("menu");
  const [etapaAtiva, setEtapaAtiva] = useState<EtapaId>("identidade");
  const [ficha, setFicha] = useState<FichaDados>(() => criarFichaVazia());
  const [fichaAtualId, setFichaAtualId] = useState<string | null>(null);
  const [adminEditandoFicha, setAdminEditandoFicha] = useState(false);
  const [salvandoOnline, setSalvandoOnline] = useState(false);
  const [statusNuvem, setStatusNuvem] = useState<
    "idle" | "pendente" | "salvando" | "salvo" | "erro"
  >("idle");

  const fichaAtualIdRef = useRef<string | null>(null);
  const timerAutoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emVooSaveRef = useRef(false);
  const filaSaveRef = useRef<FichaDados | null>(null);

  useEffect(() => {
    fichaAtualIdRef.current = fichaAtualId;
  }, [fichaAtualId]);

  const [subgrupoCronica, setSubgrupoCronica] = useState({
    id: "",
    nome: "",
    desespero: 0,
    perigo: 0,
  });

  const [modalFichasAberto, setModalFichasAberto] = useState(false);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [minhasFichas, setMinhasFichas] = useState<FichaResumoOnline[]>([]);
  const [carregandoFichas, setCarregandoFichas] = useState(false);

  const [notificacao, setNotificacao] = useState<Notificacao | null>(null);
  const inputImportRef = useRef<HTMLInputElement | null>(null);

  const notificar = useCallback(
    (texto: string, tipo: "erro" | "info" | "sucesso" = "info") => {
      const id = Date.now();
      setNotificacao({ id, texto, tipo });
      setTimeout(() => {
        setNotificacao((atual) => (atual?.id === id ? null : atual));
      }, 4500);
    },
    []
  );

  // Carrega sessão inicial e eventual rascunho local
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user ?? null);
        }
      } catch {
        // Offline/erro inicial silencioso
      } finally {
        setCarregandoAuth(false);
      }

      try {
        const salvo = localStorage.getItem(STORAGE_KEY);
        if (salvo) {
          const parsed = normalizarFicha(JSON.parse(salvo));
          parsed.distribuicaoHabilidades =
            detectarDistribuicaoHabilidades(parsed);
          setFicha(parsed);
        }
      } catch {
        // Ignora cache inválido
      }
    })();
  }, []);

  const salvarLocal = useCallback((dados: FichaDados) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
    } catch {
      // Ignora quota
    }
  }, []);

  const montarFichaSincronizada = useCallback(
    (base: FichaDados): FichaDados => {
      const maxVit = totalCaixasVitalidade(base);
      const maxVon = totalCaixasVontade(base);
      return {
        ...base,
        estado: {
          ...base.estado,
          ultimaAtualizacao: new Date().toISOString(),
        },
        estados: {
          ...base.estados,
          vitalidadeCaixas: maxVit,
          forcaDeVontadeCaixas: maxVon,
          desespero: subgrupoCronica.desespero,
          perigo: subgrupoCronica.perigo,
          subgrupoCronica: subgrupoCronica.nome,
          xpDisponivel: xpDisponivel(base),
        },
      };
    },
    [subgrupoCronica]
  );

  const persistirNaNuvem = useCallback(
    async (dadosParaSalvar: FichaDados): Promise<string | null> => {
      if (!user) return null;

      if (emVooSaveRef.current) {
        filaSaveRef.current = dadosParaSalvar;
        return fichaAtualIdRef.current;
      }

      emVooSaveRef.current = true;
      setStatusNuvem("salvando");

      try {
        const idExistente = fichaAtualIdRef.current;
        const url = idExistente ? `/api/fichas/${idExistente}` : "/api/fichas";
        const method = idExistente ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dados: dadosParaSalvar }),
        });

        if (!res.ok) {
          setStatusNuvem("erro");
          return idExistente;
        }

        const json = await res.json();
        const idRetornado: string | null =
          json.ficha?.id ?? idExistente ?? null;

        if (idRetornado && idRetornado !== fichaAtualIdRef.current) {
          fichaAtualIdRef.current = idRetornado;
          setFichaAtualId(idRetornado);
        }

        setStatusNuvem("salvo");
        return idRetornado;
      } catch {
        setStatusNuvem("erro");
        return fichaAtualIdRef.current;
      } finally {
        emVooSaveRef.current = false;
        if (filaSaveRef.current) {
          const proximo = filaSaveRef.current;
          filaSaveRef.current = null;
          void persistirNaNuvem(proximo);
        }
      }
    },
    [user]
  );

  const agendarAutoSave = useCallback(
    (dadosSincronizados: FichaDados) => {
      if (!user || modoTela === "menu" || modoTela === "admin") return;

      const temConteudoMinimo =
        Boolean(fichaAtualIdRef.current) ||
        Boolean(dadosSincronizados.identidade.nome.trim()) ||
        Boolean(dadosSincronizados.identidade.conceito.trim()) ||
        Boolean(dadosSincronizados.estado.finalizada);

      if (!temConteudoMinimo) return;

      setStatusNuvem("pendente");
      if (timerAutoSaveRef.current) {
        clearTimeout(timerAutoSaveRef.current);
      }
      timerAutoSaveRef.current = setTimeout(() => {
        timerAutoSaveRef.current = null;
        void persistirNaNuvem(dadosSincronizados);
      }, 1500);
    },
    [user, modoTela, persistirNaNuvem]
  );

  const descarregarAutoSavePendente = useCallback(
    (dadosAtuais: FichaDados) => {
      if (timerAutoSaveRef.current) {
        clearTimeout(timerAutoSaveRef.current);
        timerAutoSaveRef.current = null;
        if (user && modoTela !== "menu" && modoTela !== "admin") {
          void persistirNaNuvem(montarFichaSincronizada(dadosAtuais));
        }
      }
    },
    [user, modoTela, persistirNaNuvem, montarFichaSincronizada]
  );

  const atualizarFichaLocal = useCallback(
    (nova: FichaDados) => {
      const sincronizada = montarFichaSincronizada(nova);
      setFicha(sincronizada);
      salvarLocal(sincronizada);
      agendarAutoSave(sincronizada);
    },
    [montarFichaSincronizada, salvarLocal, agendarAutoSave]
  );

  const salvarOnlineSilencioso = useCallback(
    async (dadosParaSalvar: FichaDados) => {
      if (!user || modoTela === "admin") return;
      if (timerAutoSaveRef.current) {
        clearTimeout(timerAutoSaveRef.current);
        timerAutoSaveRef.current = null;
      }
      await persistirNaNuvem(dadosParaSalvar);
    },
    [user, modoTela, persistirNaNuvem]
  );

  const atualizarFichaEPersistir = useCallback(
    async (nova: FichaDados) => {
      const sincronizada = montarFichaSincronizada(nova);
      setFicha(sincronizada);
      salvarLocal(sincronizada);
      await salvarOnlineSilencioso(sincronizada);
    },
    [montarFichaSincronizada, salvarLocal, salvarOnlineSilencioso]
  );

  const recarregarSubgrupoDaFicha = useCallback(
    async (idAlvo?: string | null) => {
      const id = idAlvo ?? fichaAtualId;
      if (!user || !id) {
        setSubgrupoCronica({ id: "", nome: "", desespero: 0, perigo: 0 });
        return;
      }
      try {
        const res = await fetch(
          `/api/subgrupos?fichaId=${encodeURIComponent(id)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.subgrupo) {
            setSubgrupoCronica({
              id: data.subgrupo.id || "",
              nome: data.subgrupo.nome || "",
              desespero: Number(data.subgrupo.desespero || 0),
              perigo: Number(data.subgrupo.perigo || 0),
            });
            return;
          }
        }
      } catch {
        // Ignora
      }
      setSubgrupoCronica({ id: "", nome: "", desespero: 0, perigo: 0 });
    },
    [user, fichaAtualId]
  );

  const atualizarFichaERolagem = useCallback(
    async (nova: FichaDados, rolagemPublicar?: RegistroRolagemFicha) => {
      const sincronizada = montarFichaSincronizada(nova);
      setFicha(sincronizada);
      salvarLocal(sincronizada);

      if (user && modoTela !== "admin") {
        if (timerAutoSaveRef.current) {
          clearTimeout(timerAutoSaveRef.current);
          timerAutoSaveRef.current = null;
        }
        const idParaRolagem = await persistirNaNuvem(sincronizada);

        if (rolagemPublicar && idParaRolagem) {
          try {
            await fetch("/api/rolagens", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                origem: "jogador",
                fichaId: idParaRolagem,
                rolagemId: String(rolagemPublicar.id),
                subgrupoId: rolagemPublicar.subgrupoId || null,
                subgrupoNome: rolagemPublicar.subgrupoNome || "",
                personagem:
                  sincronizada.identidade.nome.trim() || "Ficha sem nome",
                jogador: sincronizada.identidade.jogador.trim() || "",
                descricao: rolagemPublicar.descricao || "Rolagem",
                resultado: rolagemPublicar,
              }),
            });
          } catch {
            // Silencioso
          }
        }
      }
    },
    [
      montarFichaSincronizada,
      salvarLocal,
      user,
      modoTela,
      persistirNaNuvem,
    ]
  );

  // Autenticação
  const handleLogin = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      notificar(data.error || "Erro ao entrar.", "erro");
      return;
    }
    setUser(data.user);
    notificar("Sessão iniciada com sucesso.", "sucesso");
  };

  const handleRegister = async (email: string, password: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      notificar(data.error || "Erro ao criar conta.", "erro");
      return;
    }
    setUser(data.user);
    notificar("Conta criada e fichas vinculadas automaticamente!", "sucesso");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setFichaAtualId(null);
    setAdminEditandoFicha(false);
    setModoTela("menu");
    notificar("Você saiu da conta.", "info");
  };

  // Fluxo de Fichas
  const iniciarNovaFicha = () => {
    if (!user) {
      notificar("Entre com sua conta antes de criar uma ficha.", "erro");
      return;
    }
    if (
      modoTela !== "menu" &&
      !window.confirm(
        "Criar uma nova ficha? As alterações não salvas na ficha atual serão substituídas."
      )
    ) {
      return;
    }
    const vazia = criarFichaVazia();
    localStorage.removeItem(STORAGE_KEY);
    if (timerAutoSaveRef.current) {
      clearTimeout(timerAutoSaveRef.current);
      timerAutoSaveRef.current = null;
    }
    fichaAtualIdRef.current = null;
    setFichaAtualId(null);
    setStatusNuvem("idle");
    setAdminEditandoFicha(false);
    setSubgrupoCronica({ id: "", nome: "", desespero: 0, perigo: 0 });
    setFicha(vazia);
    setModoTela("criacao");
    setEtapaAtiva("identidade");
    salvarLocal(vazia);
  };

  const abrirModalMinhasFichas = async () => {
    if (!user) {
      notificar("Entre na sua conta para ver suas fichas online.", "erro");
      return;
    }
    setModalFichasAberto(true);
    setCarregandoFichas(true);
    try {
      const res = await fetch("/api/fichas");
      const data = await res.json();
      if (res.ok) {
        setMinhasFichas(data.fichas ?? []);
      } else {
        notificar(data.error || "Erro ao carregar fichas.", "erro");
      }
    } finally {
      setCarregandoFichas(false);
    }
  };

  const carregarFichaPorId = async (
    id: string,
    opcoes?: { adminEdit?: boolean }
  ) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/fichas/${id}`);
      const data = await res.json();
      if (!res.ok) {
        notificar(data.error || "Erro ao abrir ficha.", "erro");
        return;
      }

      const fichaCarregada = normalizarFicha(data.ficha.dados);
      fichaCarregada.distribuicaoHabilidades =
        detectarDistribuicaoHabilidades(fichaCarregada);

      const sub = data.subgrupo
        ? {
            id: data.subgrupo.id || "",
            nome: data.subgrupo.nome || "",
            desespero: Number(data.subgrupo.desespero || 0),
            perigo: Number(data.subgrupo.perigo || 0),
          }
        : { id: "", nome: "", desespero: 0, perigo: 0 };

      fichaCarregada.estados.desespero = sub.desespero;
      fichaCarregada.estados.perigo = sub.perigo;
      fichaCarregada.estados.subgrupoCronica = sub.nome;

      const ehAdminEdit = Boolean(opcoes?.adminEdit && user.isAdmin);
      fichaAtualIdRef.current = data.ficha.id;
      setFichaAtualId(data.ficha.id);
      setStatusNuvem("salvo");
      setSubgrupoCronica(sub);
      setAdminEditandoFicha(ehAdminEdit);
      setFicha(fichaCarregada);
      salvarLocal(fichaCarregada);
      setModalFichasAberto(false);

      if (ehAdminEdit) {
        setModoTela("gerenciar");
        setEtapaAtiva("identidade");
      } else if (fichaCarregada.estado.finalizada) {
        setModoTela("gerenciar");
        setEtapaAtiva("preview");
      } else {
        setModoTela("criacao");
        setEtapaAtiva("identidade");
      }
    } catch {
      notificar("Falha de conexão ao abrir ficha.", "erro");
    }
  };

  const excluirFichaOnline = async (id: string) => {
    if (!window.confirm("Excluir permanentemente esta ficha do banco online?"))
      return;
    const res = await fetch(`/api/fichas/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      notificar(data.error || "Erro ao excluir ficha.", "erro");
      return;
    }
    if (fichaAtualId === id) {
      setFichaAtualId(null);
    }
    notificar("Ficha excluída.", "info");
    await abrirModalMinhasFichas();
  };

  const salvarFichaOnlineManual = async () => {
    if (!user) {
      notificar("Entre com sua conta antes de salvar online.", "erro");
      return;
    }
    if (timerAutoSaveRef.current) {
      clearTimeout(timerAutoSaveRef.current);
      timerAutoSaveRef.current = null;
    }
    setSalvandoOnline(true);
    try {
      const sincronizada = montarFichaSincronizada(ficha);
      const idSalvo = await persistirNaNuvem(sincronizada);
      if (idSalvo) {
        setFicha(sincronizada);
        salvarLocal(sincronizada);
        notificar("Ficha salva na nuvem com sucesso.", "sucesso");
      } else {
        notificar("Erro ao salvar ficha online.", "erro");
      }
    } finally {
      setSalvandoOnline(false);
    }
  };

  const finalizarFicha = async () => {
    const { erros } = validarFicha(ficha);
    if (erros.length > 0) {
      setEtapaAtiva("preview");
      notificar("Ainda há pendências antes de finalizar a ficha.", "erro");
      return;
    }

    const finalizada: FichaDados = montarFichaSincronizada({
      ...ficha,
      estado: {
        finalizada: true,
        ultimaAtualizacao: new Date().toISOString(),
      },
      xpLog: [
        ...ficha.xpLog,
        "Ficha finalizada. Evolução mecânica futura deve ser registrada por XP; Extras continuam livres.",
      ],
    });

    setFicha(finalizada);
    setModoTela("gerenciar");
    setEtapaAtiva("preview");
    salvarLocal(finalizada);
    if (fichaAtualId) {
      await salvarOnlineSilencioso(finalizada);
    }
    notificar("Ficha finalizada! Abas de sessão liberadas.", "sucesso");
  };

  // Exportação e Importação
  const baixarArquivo = (nome: string, conteudo: string, mime: string) => {
    const blob = new Blob([conteudo], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportarTxt = () => {
    const sincronizada = montarFichaSincronizada(ficha);
    baixarArquivo(
      `${nomeArquivoSeguro(sincronizada.identidade.nome)}.txt`,
      gerarTextoFicha(sincronizada, { modoCriacao: modoTela === "criacao" }),
      "text/plain"
    );
  };

  const exportarJson = () => {
    const sincronizada = montarFichaSincronizada(ficha);
    baixarArquivo(
      `${nomeArquivoSeguro(sincronizada.identidade.nome)}.json`,
      JSON.stringify(sincronizada, null, 2),
      "application/json"
    );
  };

  const handleImportarJsonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const bruto = JSON.parse(String(reader.result || "{}"));
        const carregada = normalizarFicha(bruto);
        if (!carregada.estado.finalizada) {
          carregada.xpLog = [
            ...carregada.xpLog,
            "Ficha importada e tratada como finalizada para uso em Prévia, XP e Extras.",
          ];
        }
        carregada.estado.finalizada = true;
        carregada.distribuicaoHabilidades =
          detectarDistribuicaoHabilidades(carregada);

        setFichaAtualId(null);
        setAdminEditandoFicha(false);
        setSubgrupoCronica({ id: "", nome: "", desespero: 0, perigo: 0 });
        setFicha(carregada);
        salvarLocal(carregada);
        setModoTela("gerenciar");
        setEtapaAtiva("preview");
        notificar(
          "Ficha JSON importada! Clique em 'Salvar online' para guardá-la na sua conta.",
          "sucesso"
        );
      } catch {
        notificar("O arquivo selecionado não é um JSON de ficha válido.", "erro");
      }
      e.target.value = "";
    };
    reader.readAsText(arquivo, "UTF-8");
  };

  const travadaMecanica = ficha.estado.finalizada && !adminEditandoFicha;
  const etapasVisiveis =
    modoTela === "criacao"
      ? ETAPAS_CRIACAO
      : adminEditandoFicha
        ? ETAPAS_ADMIN_EDIT
        : ETAPAS_GERENCIAR;

  return (
    <div className="min-h-screen flex flex-col">
      <input
        ref={inputImportRef}
        type="file"
        accept=".json"
        onChange={handleImportarJsonChange}
        className="hidden"
      />

      {/* Toast flutuante */}
      {notificacao && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-in fade-in slide-in-from-bottom-2">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-sm ${
              notificacao.tipo === "erro"
                ? "bg-red-950/95 border-red-700 text-red-100"
                : notificacao.tipo === "sucesso"
                  ? "bg-emerald-950/95 border-emerald-700 text-emerald-100"
                  : "bg-zinc-900/95 border-zinc-700 text-zinc-100"
            }`}
          >
            <span className="flex-1">{notificacao.texto}</span>
            <button
              type="button"
              onClick={() => setNotificacao(null)}
              className="text-zinc-400 hover:text-zinc-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header Minimalista e Responsivo (Compacto com Gaveta no Celular, Completo em Tablet/PC) */}
      <header className="sticky top-0 z-30 bg-[#09090b]/95 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                setMenuMobileAberto(false);
                setAdminEditandoFicha(false);
                setModoTela("menu");
              }}
              className="flex items-center gap-2 sm:gap-2.5 text-left group cursor-pointer min-w-0"
            >
              <div className="w-8 h-8 rounded-lg bg-[#f08b21]/15 border border-[#f08b21]/40 flex items-center justify-center text-[#f08b21] group-hover:bg-[#f08b21] group-hover:text-zinc-950 transition shrink-0">
                <Crosshair className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="hidden sm:block text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                  Caçador: A Revanche · 5ª Ed.
                </span>
                <span className="block font-display text-base sm:text-lg font-bold uppercase tracking-wide text-zinc-100 leading-tight truncate max-w-[165px] sm:max-w-none">
                  {modoTela === "menu"
                    ? "Fichas Online"
                    : modoTela === "admin"
                      ? "Escudo do Mestre"
                      : nomeFichaAtual(ficha)}
                </span>
              </div>
            </button>

            {adminEditandoFicha && modoTela !== "menu" && (
              <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#f08b21]/15 text-[#f08b21] border border-[#f08b21]/40">
                <Shield className="w-3 h-3" />
                Modo Mestre (Destravado)
              </span>
            )}
          </div>

          {modoTela !== "menu" && (
            <>
              {/* AÇÕES COMPACTAS EXCLUSIVAS DE CELULAR (< md) */}
              <div className="flex md:hidden items-center gap-1.5 shrink-0">
                {modoTela !== "admin" && user && statusNuvem !== "idle" && (
                  <button
                    type="button"
                    onClick={salvarFichaOnlineManual}
                    title="Status do salvamento na nuvem"
                    className={`p-2 rounded-lg border transition cursor-pointer ${
                      statusNuvem === "erro"
                        ? "bg-red-950/70 border-red-700/70 text-red-200"
                        : statusNuvem === "salvando" ||
                            statusNuvem === "pendente"
                          ? "bg-zinc-900 border-zinc-800 text-amber-300"
                          : "bg-zinc-950 border-zinc-800 text-emerald-400"
                    }`}
                  >
                    {statusNuvem === "salvando" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : statusNuvem === "erro" ? (
                      <CloudOff className="w-4 h-4" />
                    ) : (
                      <Cloud className="w-4 h-4" />
                    )}
                  </button>
                )}

                {modoTela !== "admin" && (
                  <button
                    type="button"
                    disabled={!user || salvandoOnline}
                    onClick={salvarFichaOnlineManual}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#f08b21] text-zinc-950 font-bold text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Salvar
                  </button>
                )}

                {modoTela === "criacao" && (
                  <button
                    type="button"
                    onClick={finalizarFicha}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-zinc-950 font-bold text-xs uppercase tracking-wider cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Fim
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setMenuMobileAberto((v) => !v)}
                  aria-label="Abrir menu de ações"
                  className={`p-2 rounded-lg border transition cursor-pointer ${
                    menuMobileAberto
                      ? "bg-[#f08b21] text-zinc-950 border-[#f08b21]"
                      : "bg-zinc-900 text-zinc-200 border-zinc-800"
                  }`}
                >
                  {menuMobileAberto ? (
                    <X className="w-4 h-4" />
                  ) : (
                    <Menu className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* BARRA COMPLETA DE TABLET & PC (md+) — INALTERADA */}
              <div className="hidden md:flex flex-wrap items-center gap-2">
                {modoTela !== "admin" && (
                  <>
                    {user && statusNuvem !== "idle" && (
                      <button
                        type="button"
                        onClick={salvarFichaOnlineManual}
                        title="Status do salvamento automático (clique para salvar agora)"
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                          statusNuvem === "erro"
                            ? "bg-red-950/70 border-red-700/70 text-red-200"
                            : statusNuvem === "salvando" ||
                                statusNuvem === "pendente"
                              ? "bg-zinc-900 border-zinc-800 text-amber-300"
                              : "bg-zinc-950 border-zinc-800 text-emerald-400"
                        }`}
                      >
                        {statusNuvem === "salvando" ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Salvando...</span>
                          </>
                        ) : statusNuvem === "pendente" ? (
                          <>
                            <Cloud className="w-3.5 h-3.5" />
                            <span>Auto-save...</span>
                          </>
                        ) : statusNuvem === "erro" ? (
                          <>
                            <CloudOff className="w-3.5 h-3.5" />
                            <span>Tentar salvar</span>
                          </>
                        ) : (
                          <>
                            <Cloud className="w-3.5 h-3.5" />
                            <span>Salvo</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={!user || salvandoOnline}
                      onClick={salvarFichaOnlineManual}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider disabled:opacity-50 transition cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {salvandoOnline ? "Salvando..." : "Salvar"}
                    </button>

                    {modoTela === "criacao" && (
                      <button
                        type="button"
                        onClick={finalizarFicha}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold text-xs uppercase tracking-wider transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Finalizar
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={iniciarNovaFicha}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-medium transition cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Nova</span>
                    </button>

                    <button
                      type="button"
                      onClick={abrirModalMinhasFichas}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-medium transition cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Fichas</span>
                    </button>

                    <button
                      type="button"
                      onClick={exportarTxt}
                      title="Exportar ficha em .TXT"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      TXT
                    </button>

                    <button
                      type="button"
                      onClick={exportarJson}
                      title="Exportar ficha em .JSON"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs transition cursor-pointer"
                    >
                      <FileJson className="w-3.5 h-3.5" />
                      JSON
                    </button>

                    <button
                      type="button"
                      onClick={() => inputImportRef.current?.click()}
                      title="Importar ficha .JSON"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                {user?.isAdmin && modoTela !== "admin" && (
                  <button
                    type="button"
                    onClick={() => {
                      descarregarAutoSavePendente(ficha);
                      setAdminEditandoFicha(false);
                      setModoTela("admin");
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[#f08b21] border border-[#f08b21]/40 text-xs font-semibold transition cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Escudo
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    descarregarAutoSavePendente(ficha);
                    setAdminEditandoFicha(false);
                    setModoTela("menu");
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs transition cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" />
                  Menu
                </button>

                {user && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    title={`Conectado: ${user.email} — Clique para sair`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* GAVETA DE AÇÕES RÁPIDAS MOBILE (< md) */}
        {modoTela !== "menu" && menuMobileAberto && (
          <div className="md:hidden border-t border-zinc-800 bg-[#0d0d10] px-3 py-3 space-y-2.5 shadow-2xl">
            <div className="grid grid-cols-2 gap-2">
              {modoTela !== "admin" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuMobileAberto(false);
                      abrirModalMinhasFichas();
                    }}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-zinc-900 text-zinc-100 border border-zinc-800 text-xs font-medium cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4 text-[#f08b21]" />
                    Minhas Fichas
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuMobileAberto(false);
                      iniciarNovaFicha();
                    }}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-zinc-900 text-zinc-100 border border-zinc-800 text-xs font-medium cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-emerald-400" />
                    Nova Ficha
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuMobileAberto(false);
                      exportarTxt();
                    }}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800 text-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Exportar .TXT
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuMobileAberto(false);
                      exportarJson();
                    }}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800 text-xs cursor-pointer"
                  >
                    <FileJson className="w-3.5 h-3.5" />
                    Exportar .JSON
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuMobileAberto(false);
                      inputImportRef.current?.click();
                    }}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800 text-xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Importar .JSON
                  </button>
                </>
              )}

              {user?.isAdmin && modoTela !== "admin" && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuMobileAberto(false);
                    descarregarAutoSavePendente(ficha);
                    setAdminEditandoFicha(false);
                    setModoTela("admin");
                  }}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 text-[#f08b21] border border-[#f08b21]/40 text-xs font-semibold cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Escudo do Mestre
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setMenuMobileAberto(false);
                  descarregarAutoSavePendente(ficha);
                  setAdminEditandoFicha(false);
                  setModoTela("menu");
                }}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 text-zinc-200 border border-zinc-800 text-xs cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                Menu Inicial
              </button>

              {user && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuMobileAberto(false);
                    void handleLogout();
                  }}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-950 text-red-300 border border-zinc-800 text-xs cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sair da Conta
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Conteúdo Principal */}
      {modoTela === "menu" ? (
        <div className="flex-1">
          <MenuInicial
            user={user}
            carregandoAuth={carregandoAuth}
            onLogin={handleLogin}
            onRegister={handleRegister}
            onLogout={handleLogout}
            onCriarFicha={iniciarNovaFicha}
            onAbrirMinhasFichas={abrirModalMinhasFichas}
            onAbrirEscudo={() => {
              setAdminEditandoFicha(false);
              setModoTela("admin");
            }}
            onImportarJson={() => inputImportRef.current?.click()}
          />
        </div>
      ) : modoTela === "admin" ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
          <EscudoMestre
            userEmail={user?.email || ""}
            onEditarFichaAdmin={(id) =>
              carregarFichaPorId(id, { adminEdit: true })
            }
            onNotify={notificar}
          />
        </main>
      ) : (
        <main
          className={`flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-3.5 sm:py-6 space-y-3.5 sm:space-y-5 ${
            modoTela === "gerenciar" && !adminEditandoFicha ? "pb-20 sm:pb-6" : ""
          }`}
        >
          {/* FAIXA HUD ULTRA-COMPACTA DE 1 LINHA NO CELULAR (< sm) */}
          <section className="sm:hidden grid grid-cols-5 gap-1.5 bg-[#141416] border border-zinc-800/90 rounded-xl p-2 text-center">
            <div className="rounded-lg bg-zinc-950/70 py-1.5 px-1">
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
                Vit
              </span>
              <strong className="font-display text-base font-bold text-zinc-100 leading-tight">
                {totalCaixasVitalidade(ficha)}
              </strong>
            </div>
            <div className="rounded-lg bg-zinc-950/70 py-1.5 px-1">
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
                Von
              </span>
              <strong className="font-display text-base font-bold text-zinc-100 leading-tight">
                {totalCaixasVontade(ficha)}
              </strong>
            </div>
            <div className="rounded-lg bg-zinc-950/70 py-1.5 px-1">
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
                XP
              </span>
              <strong className="font-display text-base font-bold text-[#f08b21] leading-tight">
                {xpDisponivel(ficha)}
              </strong>
            </div>
            <div className="rounded-lg bg-zinc-950/70 py-1.5 px-1">
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
                Desesp.
              </span>
              <strong className="font-display text-base font-bold text-amber-300 leading-tight">
                {subgrupoCronica.desespero}
              </strong>
            </div>
            <div className="rounded-lg bg-zinc-950/70 py-1.5 px-1">
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
                Perigo
              </span>
              <strong className="font-display text-base font-bold text-red-400 leading-tight">
                {subgrupoCronica.perigo}
              </strong>
            </div>
          </section>

          {/* PAINEL DE 6 CARTÕES EM TABLET & PC (sm+) — INALTERADO */}
          <section className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-[#141416] border border-zinc-800/90 rounded-xl px-4 py-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Estado
              </span>
              <strong className="font-display text-lg font-bold text-zinc-100">
                {ficha.estado.finalizada ? "Finalizada" : "Em criação"}
              </strong>
            </div>
            <div className="bg-[#141416] border border-zinc-800/90 rounded-xl px-4 py-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Vitalidade
              </span>
              <strong className="font-display text-xl font-bold text-zinc-100">
                {totalCaixasVitalidade(ficha)}
              </strong>
            </div>
            <div className="bg-[#141416] border border-zinc-800/90 rounded-xl px-4 py-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Força de Vontade
              </span>
              <strong className="font-display text-xl font-bold text-zinc-100">
                {totalCaixasVontade(ficha)}
              </strong>
            </div>
            <div className="bg-[#141416] border border-zinc-800/90 rounded-xl px-4 py-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                XP Disponível
              </span>
              <strong className="font-display text-xl font-bold text-[#f08b21]">
                {xpDisponivel(ficha)}
              </strong>
            </div>
            <div className="bg-[#141416] border border-zinc-800/90 rounded-xl px-4 py-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Desespero
              </span>
              <strong className="font-display text-xl font-bold text-amber-300">
                {subgrupoCronica.desespero}
              </strong>
            </div>
            <div className="bg-[#141416] border border-zinc-800/90 rounded-xl px-4 py-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Perigo
              </span>
              <strong className="font-display text-xl font-bold text-red-400">
                {subgrupoCronica.perigo}
              </strong>
            </div>
          </section>

          {/* SELETOR DE ETAPAS COMPACTO NO CELULAR PARA CRIAÇÃO / EDIÇÃO MESTRE (< sm) */}
          {(modoTela !== "gerenciar" || adminEditandoFicha) && (
            <div className="sm:hidden flex items-center gap-1.5 bg-[#141416] border border-zinc-800/90 rounded-xl p-1.5">
              <button
                type="button"
                disabled={etapasVisiveis.indexOf(etapaAtiva) <= 0}
                onClick={() => {
                  const idx = etapasVisiveis.indexOf(etapaAtiva);
                  if (idx > 0) setEtapaAtiva(etapasVisiveis[idx - 1]);
                }}
                className="p-2 rounded-lg bg-zinc-900 text-zinc-200 border border-zinc-800 disabled:opacity-35 cursor-pointer"
                aria-label="Etapa anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={etapaAtiva}
                onChange={(e) => setEtapaAtiva(e.target.value as EtapaId)}
                className="flex-1 px-2.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-semibold uppercase tracking-wider text-[#f08b21] focus:outline-none"
              >
                {etapasVisiveis.map((aba, idx) => (
                  <option key={aba} value={aba}>
                    {idx + 1}/{etapasVisiveis.length} · {ABAS_LABELS[aba]}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={
                  etapasVisiveis.indexOf(etapaAtiva) >=
                  etapasVisiveis.length - 1
                }
                onClick={() => {
                  const idx = etapasVisiveis.indexOf(etapaAtiva);
                  if (idx < etapasVisiveis.length - 1) {
                    setEtapaAtiva(etapasVisiveis[idx + 1]);
                  }
                }}
                className="p-2 rounded-lg bg-zinc-900 text-zinc-200 border border-zinc-800 disabled:opacity-35 cursor-pointer"
                aria-label="Próxima etapa"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Navegação por Abas Tradicional em Tablet & PC (sm+) */}
          <nav
            aria-label="Etapas da ficha"
            className="hidden sm:flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-zinc-800"
          >
            {etapasVisiveis.map((aba) => {
              const ativa = etapaAtiva === aba;
              return (
                <button
                  key={aba}
                  type="button"
                  onClick={() => setEtapaAtiva(aba)}
                  className={`px-4 py-2.5 rounded-t-lg text-xs font-semibold uppercase tracking-wider whitespace-nowrap border-b-2 transition cursor-pointer ${
                    ativa
                      ? "border-[#f08b21] text-[#f08b21] bg-[#141416]"
                      : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                  }`}
                >
                  {ABAS_LABELS[aba]}
                </button>
              );
            })}
          </nav>

          {/* Aviso de Trava Mecânica (oculto no modo gerenciar mobile para economizar espaço vertical) */}
          {travadaMecanica && (
            <div className="hidden sm:flex items-center gap-2.5 px-4 py-3 rounded-lg bg-zinc-900/70 border border-zinc-800 text-xs text-zinc-300">
              <Lock className="w-4 h-4 text-[#f08b21] shrink-0" />
              <span>
                Ficha finalizada. A criação mecânica está bloqueada; use a aba{" "}
                <strong className="text-zinc-100">XP</strong> para evolução. A
                aba <strong className="text-zinc-100">Extras</strong> continua
                livremente editável.
              </span>
            </div>
          )}

          {/* Conteúdo da Aba Ativa */}
          {etapaAtiva === "identidade" && (
            <AbaIdentidade
              ficha={ficha}
              travada={travadaMecanica}
              onChange={atualizarFichaLocal}
            />
          )}
          {etapaAtiva === "atributos" && (
            <AbaAtributos
              ficha={ficha}
              travada={travadaMecanica}
              onChange={atualizarFichaLocal}
            />
          )}
          {etapaAtiva === "habilidades" && (
            <AbaHabilidades
              ficha={ficha}
              travada={travadaMecanica}
              onChange={atualizarFichaLocal}
            />
          )}
          {etapaAtiva === "vantagens" && (
            <AbaVantagens
              ficha={ficha}
              travada={travadaMecanica}
              adminEditando={adminEditandoFicha}
              onChange={atualizarFichaLocal}
              onNotify={notificar}
            />
          )}
          {etapaAtiva === "trunfos" && (
            <AbaTrunfos
              ficha={ficha}
              travada={travadaMecanica}
              adminEditando={adminEditandoFicha}
              onChange={atualizarFichaLocal}
              onNotify={notificar}
            />
          )}
          {etapaAtiva === "extras" && (
            <AbaExtras ficha={ficha} onChange={atualizarFichaLocal} />
          )}
          {etapaAtiva === "dano" && (
            <AbaDanos
              ficha={ficha}
              onChangeAndPersist={atualizarFichaEPersistir}
              onNotify={notificar}
            />
          )}
          {etapaAtiva === "rolagem" && (
            <AbaRolagem
              ficha={ficha}
              fichaAtualId={fichaAtualId}
              userEmail={user?.email || ""}
              isAdmin={Boolean(user?.isAdmin)}
              subgrupo={subgrupoCronica}
              autenticado={Boolean(user)}
              onAtualizarFichaERolagem={atualizarFichaERolagem}
              onRecarregarSubgrupo={() => recarregarSubgrupoDaFicha()}
              onNotify={notificar}
            />
          )}
          {etapaAtiva === "iniciativa" && (
            <AbaIniciativa autenticado={Boolean(user)} />
          )}
          {etapaAtiva === "xp" && (
            <AbaXp
              ficha={ficha}
              onChangeAndPersist={atualizarFichaEPersistir}
              onNotify={notificar}
            />
          )}
          {etapaAtiva === "preview" && (
            <AbaPrevia
              ficha={montarFichaSincronizada(ficha)}
              modoCriacao={modoTela === "criacao"}
              onExportarTxt={exportarTxt}
              onExportarJson={exportarJson}
            />
          )}
        </main>
      )}

      {/* BARRA INFERIOR FIXA ESTILO APP NO CELULAR (< sm) DURANTE JOGO */}
      {modoTela === "gerenciar" && !adminEditandoFicha && (
        <nav
          aria-label="Navegação rápida da ficha no celular"
          className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-[#0c0c0f]/95 backdrop-blur-md border-t border-zinc-800/90 grid grid-cols-6 px-1 py-1.5"
        >
          {(
            [
              { id: "preview", label: "Ficha", icon: FileText },
              { id: "dano", label: "Danos", icon: HeartPulse },
              { id: "rolagem", label: "Rolagem", icon: Dices },
              { id: "iniciativa", label: "Iniciat.", icon: ListOrdered },
              { id: "xp", label: "XP", icon: Sparkles },
              { id: "extras", label: "Extras", icon: BookOpen },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const ativa = etapaAtiva === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setEtapaAtiva(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 rounded-lg transition cursor-pointer ${
                  ativa ? "text-[#f08b21] bg-[#f08b21]/10" : "text-zinc-400"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[9px] font-semibold tracking-tight leading-none">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      <footer
        className={`py-5 border-t border-zinc-900 text-center text-xs text-zinc-600 ${
          modoTela === "gerenciar" && !adminEditandoFicha ? "hidden sm:block" : ""
        }`}
      >
        Caçador: A Revanche (5ª Edição) · Plataforma de Fichas &amp; Escudo da
        Crônica
      </footer>

      <ModalMinhasFichas
        aberto={modalFichasAberto}
        fichas={minhasFichas}
        carregando={carregandoFichas}
        onFechar={() => setModalFichasAberto(false)}
        onCarregarFicha={(id) => carregarFichaPorId(id)}
        onExcluirFicha={excluirFichaOnline}
      />
    </div>
  );
}
