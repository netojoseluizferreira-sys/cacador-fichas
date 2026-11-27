import { desc, eq, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import {
  escudoMestre,
  fichas,
  rolagensJogadoresPublicas,
  rolagensPrivadas,
  rolagensPublicas,
} from "@/db/schema";
import { obterEmailAdmin, obterUsuarioSessao } from "@/lib/auth";
import type {
  MapaImagemSalva,
  MapaTaticoEstado,
  TemaFundoMapa,
  TokenMapa,
  UltimaRolagemResumo,
} from "@/types/ficha";

const TokenSchema = z.object({
  id: z.string().min(1),
  nome: z.string().min(1).max(120),
  cor: z.string().max(32).default("#f08b21"),
  sigla: z.string().max(4).default("CA"),
  imagemUrl: z.string().max(500_000).optional(),
  x: z.number().int().min(0).max(60),
  y: z.number().int().min(0).max(60),
  tamanho: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
  tipo: z.enum(["jogador", "ameaca", "marcador"]).default("jogador"),
  fichaId: z.string().optional(),
  ownerEmail: z.string().optional(),
  ameacaId: z.string().optional(),
  oculto: z.boolean().optional(),
});

const MapaSalvoItemSchema = z.object({
  id: z.string().min(1),
  nome: z.string().max(120),
  imagemUrl: z.string().max(3_000_000),
});

const SalvarMapaMestreSchema = z.object({
  versao: z.number().int().optional(),
  visivelJogadores: z.boolean().default(false),
  posicionamentoJogadoresLiberado: z.boolean().default(true),
  movimentoJogadoresLiberado: z.boolean().default(true),
  jogadoresTravadosInsercao: z.array(z.string()).max(200).default([]),
  jogadoresTravadosMovimento: z.array(z.string()).max(200).default([]),
  titulo: z.string().max(120).default("Cena de Conflito"),
  imagemUrl: z.string().max(3_000_000).default(""),
  ajusteImagem: z.enum(["esticar", "cobrir"]).default("esticar"),
  temaFundo: z
    .enum(["asfalto", "galpao", "hospital", "subterraneo", "floresta"])
    .default("asfalto"),
  colunas: z.number().int().min(6).max(44).default(20),
  linhas: z.number().int().min(6).max(36).default(14),
  opacidadeGrid: z.number().min(0).max(1).default(0.28),
  corGrid: z.string().max(32).default("#ffffff"),
  fogCelulas: z.array(z.string()).max(2500).default([]),
  tokens: z.array(TokenSchema).max(150).default([]),
  mapasSalvos: z.array(MapaSalvoItemSchema).max(8).optional(),
  retratosSalvos: z.record(z.string(), z.string().max(500_000)).optional(),
});

const PatchMestreSchema = z.discriminatedUnion("acao", [
  z.object({
    acao: z.literal("atualizar_travas"),
    visivelJogadores: z.boolean().optional(),
    posicionamentoJogadoresLiberado: z.boolean().optional(),
    movimentoJogadoresLiberado: z.boolean().optional(),
    jogadoresTravadosInsercao: z.array(z.string()).max(200).optional(),
    jogadoresTravadosMovimento: z.array(z.string()).max(200).optional(),
  }),
  z.object({
    acao: z.literal("atualizar_config"),
    titulo: z.string().max(120).optional(),
    temaFundo: z
      .enum(["asfalto", "galpao", "hospital", "subterraneo", "floresta"])
      .optional(),
    colunas: z.number().int().min(6).max(44).optional(),
    linhas: z.number().int().min(6).max(36).optional(),
    opacidadeGrid: z.number().min(0).max(1).optional(),
    corGrid: z.string().max(32).optional(),
    ajusteImagem: z.enum(["esticar", "cobrir"]).optional(),
  }),
  z.object({
    acao: z.literal("salvar_imagem_mapa"),
    imagemUrl: z.string().max(3_000_000),
    nomeImagem: z.string().max(120).optional(),
    salvarNaGaleria: z.boolean().optional(),
    ajusteImagem: z.enum(["esticar", "cobrir"]).optional(),
    colunas: z.number().int().min(6).max(44).optional(),
    linhas: z.number().int().min(6).max(36).optional(),
  }),
  z.object({
    acao: z.literal("remover_mapa_salvo"),
    mapaSalvoId: z.string().min(1),
  }),
  z.object({
    acao: z.literal("atualizar_fog"),
    fogCelulas: z.array(z.string()).max(2500),
  }),
  z.object({
    acao: z.literal("mover_token"),
    tokenId: z.string().min(1),
    x: z.number().int().min(0).max(60),
    y: z.number().int().min(0).max(60),
  }),
  z.object({
    acao: z.literal("adicionar_token"),
    token: TokenSchema,
  }),
  z.object({
    acao: z.literal("editar_token"),
    tokenId: z.string().min(1),
    oculto: z.boolean().optional(),
    tamanho: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    cor: z.string().max(32).optional(),
    nome: z.string().min(1).max(120).optional(),
    imagemUrl: z.string().max(500_000).optional(),
  }),
  z.object({
    acao: z.literal("remover_token"),
    tokenId: z.string().min(1),
  }),
  z.object({
    acao: z.literal("limpar_tokens"),
  }),
]);

const AcaoJogadorSchema = z.discriminatedUnion("acao", [
  z.object({
    acao: z.literal("colocar_meu_token"),
    fichaId: z.uuid(),
    x: z.number().int().min(0).max(60),
    y: z.number().int().min(0).max(60),
    cor: z.string().max(32).optional(),
    imagemUrl: z.string().max(500_000).optional(),
  }),
  z.object({
    acao: z.literal("mover_meu_token"),
    tokenId: z.string().min(1),
    x: z.number().int().min(0).max(60),
    y: z.number().int().min(0).max(60),
  }),
  z.object({
    acao: z.literal("recolher_meu_token"),
    tokenId: z.string().min(1),
  }),
  z.object({
    acao: z.literal("atualizar_aparencia_meu_token"),
    tokenId: z.string().optional(),
    fichaId: z.string().optional(),
    cor: z.string().max(32).optional(),
    imagemUrl: z.string().max(500_000).optional(),
  }),
]);

function normalizarMapa(
  bruto?: Partial<MapaTaticoEstado> | null
): MapaTaticoEstado {
  const temasValidos: TemaFundoMapa[] = [
    "asfalto",
    "galpao",
    "hospital",
    "subterraneo",
    "floresta",
  ];
  const tema: TemaFundoMapa =
    bruto?.temaFundo && temasValidos.includes(bruto.temaFundo)
      ? bruto.temaFundo
      : "asfalto";

  const ajuste = bruto?.ajusteImagem === "cobrir" ? "cobrir" : "esticar";

  return {
    versao: Math.max(1, Number(bruto?.versao || 1)),
    visivelJogadores: Boolean(bruto?.visivelJogadores),
    posicionamentoJogadoresLiberado:
      bruto?.posicionamentoJogadoresLiberado === undefined
        ? true
        : Boolean(bruto.posicionamentoJogadoresLiberado),
    movimentoJogadoresLiberado:
      bruto?.movimentoJogadoresLiberado === undefined
        ? true
        : Boolean(bruto.movimentoJogadoresLiberado),
    jogadoresTravadosInsercao: Array.isArray(bruto?.jogadoresTravadosInsercao)
      ? bruto.jogadoresTravadosInsercao
      : [],
    jogadoresTravadosMovimento: Array.isArray(bruto?.jogadoresTravadosMovimento)
      ? bruto.jogadoresTravadosMovimento
      : [],
    titulo: String(bruto?.titulo || "Cena de Conflito"),
    imagemUrl: String(bruto?.imagemUrl || ""),
    ajusteImagem: ajuste,
    temaFundo: tema,
    colunas: Math.max(6, Math.min(44, Number(bruto?.colunas || 20))),
    linhas: Math.max(6, Math.min(36, Number(bruto?.linhas || 14))),
    opacidadeGrid: Math.max(
      0,
      Math.min(1, Number(bruto?.opacidadeGrid ?? 0.28))
    ),
    corGrid: String(bruto?.corGrid || "#ffffff"),
    fogCelulas: Array.isArray(bruto?.fogCelulas) ? bruto.fogCelulas : [],
    tokens: Array.isArray(bruto?.tokens) ? bruto.tokens : [],
    mapasSalvos: Array.isArray(bruto?.mapasSalvos)
      ? bruto.mapasSalvos.slice(0, 6)
      : [],
    retratosSalvos:
      bruto?.retratosSalvos && typeof bruto.retratosSalvos === "object"
        ? { ...bruto.retratosSalvos }
        : {},
    updatedAt: bruto?.updatedAt || "",
  };
}

function registrarRetratoToken(
  retratos: Record<string, string>,
  opcoes: {
    fichaId?: string;
    ameacaId?: string;
    email?: string;
    imagemUrl?: string;
  }
) {
  if (opcoes.imagemUrl === undefined) return;
  const chaves: string[] = [];
  if (opcoes.fichaId) chaves.push(`ficha:${opcoes.fichaId.trim().toLowerCase()}`);
  if (opcoes.ameacaId)
    chaves.push(`ameaca:${opcoes.ameacaId.trim().toLowerCase()}`);
  if (opcoes.email) chaves.push(`email:${opcoes.email.trim().toLowerCase()}`);

  for (const ch of chaves) {
    if (opcoes.imagemUrl) {
      retratos[ch] = opcoes.imagemUrl;
    } else {
      delete retratos[ch];
    }
  }
}

function buscarRetratoSalvo(
  retratos: Record<string, string> | undefined,
  opcoes: { fichaId?: string; ameacaId?: string; email?: string }
): string | undefined {
  if (!retratos) return undefined;
  if (opcoes.fichaId) {
    const v = retratos[`ficha:${opcoes.fichaId.trim().toLowerCase()}`];
    if (v) return v;
  }
  if (opcoes.ameacaId) {
    const v = retratos[`ameaca:${opcoes.ameacaId.trim().toLowerCase()}`];
    if (v) return v;
  }
  if (opcoes.email) {
    const v = retratos[`email:${opcoes.email.trim().toLowerCase()}`];
    if (v) return v;
  }
  return undefined;
}

function ajustarTokensEFogAoTamanho(mapa: MapaTaticoEstado) {
  mapa.tokens = mapa.tokens.map((t) => {
    const tam = t.tamanho || 1;
    const maxCol = Math.max(0, mapa.colunas - tam);
    const maxLin = Math.max(0, mapa.linhas - tam);
    return {
      ...t,
      x: Math.max(0, Math.min(maxCol, t.x)),
      y: Math.max(0, Math.min(maxLin, t.y)),
    };
  });

  mapa.fogCelulas = mapa.fogCelulas.filter((coord) => {
    const [cx, cy] = coord.split(",").map(Number);
    return (
      !Number.isNaN(cx) &&
      !Number.isNaN(cy) &&
      cx >= 0 &&
      cy >= 0 &&
      cx < mapa.colunas &&
      cy < mapa.linhas
    );
  });
}

function salvarNaGaleriaMapas(
  listaAtual: MapaImagemSalva[] | undefined,
  imagemUrl: string,
  nomeSugerido?: string
): MapaImagemSalva[] {
  const lista = Array.isArray(listaAtual) ? [...listaAtual] : [];
  const limpo = imagemUrl.trim();
  if (!limpo) return lista;

  const semDuplicado = lista.filter((m) => m.imagemUrl !== limpo);
  const existente = lista.find((m) => m.imagemUrl === limpo);
  const nomeFinal =
    nomeSugerido?.trim() ||
    existente?.nome ||
    `Mapa ${lista.length + 1}`;

  return [
    {
      id: existente?.id || `map-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      nome: nomeFinal.slice(0, 80),
      imagemUrl: limpo,
    },
    ...semDuplicado,
  ].slice(0, 5);
}

function jogadorEstaTravadoNaLista(
  lista: string[],
  fichaId?: string | null,
  email?: string | null
): boolean {
  const setNorm = new Set(lista.map((x) => x.trim().toLowerCase()));
  if (fichaId && setNorm.has(fichaId.trim().toLowerCase())) return true;
  if (email && setNorm.has(email.trim().toLowerCase())) return true;
  return false;
}

function gerarSigla(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "CA";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

function tokenOcupaFog(
  x: number,
  y: number,
  tamanho: number,
  fogSet: Set<string>
): boolean {
  for (let dx = 0; dx < tamanho; dx += 1) {
    for (let dy = 0; dy < tamanho; dy += 1) {
      if (fogSet.has(`${x + dx},${y + dy}`)) {
        return true;
      }
    }
  }
  return false;
}

async function buscarUltimaRolagem(
  isAdmin: boolean
): Promise<UltimaRolagemResumo | null> {
  const db = getDb();
  const [ultPubMestre, ultPrivMestre, ultJog] = await Promise.all([
    db
      .select()
      .from(rolagensPublicas)
      .orderBy(desc(rolagensPublicas.createdAt))
      .limit(1),
    isAdmin
      ? db
          .select()
          .from(rolagensPrivadas)
          .orderBy(desc(rolagensPrivadas.createdAt))
          .limit(1)
      : Promise.resolve([]),
    db
      .select()
      .from(rolagensJogadoresPublicas)
      .orderBy(desc(rolagensJogadoresPublicas.updatedAt))
      .limit(1),
  ]);

  const candidatos: UltimaRolagemResumo[] = [];

  if (ultPubMestre[0]) {
    const m = ultPubMestre[0];
    candidatos.push({
      id: `mpub-${m.id}`,
      autor: "Mestre",
      etiqueta: "Mestre · Pública",
      descricao: m.descricao,
      dados: m.resultado?.dados ?? [],
      sucessos: Number(m.resultado?.sucessos ?? 0),
      critico: Boolean(m.resultado?.critico),
      data: m.createdAt.toISOString(),
    });
  }

  if (isAdmin && ultPrivMestre[0]) {
    const m = ultPrivMestre[0];
    candidatos.push({
      id: `mpriv-${m.id}`,
      autor: "Mestre",
      etiqueta: "Mestre · Privada",
      descricao: m.descricao,
      dados: m.resultado?.dados ?? [],
      sucessos: Number(m.resultado?.sucessos ?? 0),
      critico: Boolean(m.resultado?.critico),
      data: m.createdAt.toISOString(),
    });
  }

  if (ultJog[0]) {
    const j = ultJog[0];
    const r = j.resultado;
    candidatos.push({
      id: `jog-${j.id}-${j.updatedAt.getTime()}`,
      autor: j.personagem || "Jogador",
      etiqueta: j.personagem || "Jogador",
      descricao: r?.descricao || j.descricao,
      dados: r?.dados ?? [],
      dadosDesespero: r?.dadosDesespero ?? [],
      sucessos: Number(r?.sucessos ?? 0),
      critico: Boolean(r?.critico),
      aflicao: Boolean(r?.aflicao),
      data: (j.updatedAt || j.createdAt).toISOString(),
    });
  }

  if (candidatos.length === 0) return null;
  candidatos.sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
  );
  return candidatos[0];
}

export async function GET(request: Request) {
  try {
    const user = await obterUsuarioSessao();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const imgLenParam = Number(searchParams.get("imgLen") || -1);
    const imgTailParam = searchParams.get("imgTail") || "";
    const omitirGaleria = searchParams.get("omitirGaleria") === "1";
    const galeriaCountParam = Number(searchParams.get("galeriaCount") || -1);

    const db = getDb();
    let [escudo] = await db
      .select()
      .from(escudoMestre)
      .where(eq(escudoMestre.id, 1))
      .limit(1);

    if (!escudo) {
      [escudo] = await db
        .insert(escudoMestre)
        .values({
          id: 1,
          mestreEmail: obterEmailAdmin(),
          mapaTatico: normalizarMapa(null),
        })
        .returning();
    }

    const emailLower = user.email.trim().toLowerCase();
    const [minhasFichas, ultimaRolagem] = await Promise.all([
      db
        .select({
          id: fichas.id,
          nome: fichas.nome,
          ownerEmail: fichas.ownerEmail,
          dados: fichas.dados,
        })
        .from(fichas)
        .where(
          or(
            eq(fichas.userId, user.id),
            sql`lower(trim(${fichas.ownerEmail})) = ${emailLower}`
          )
        ),
      buscarUltimaRolagem(user.isAdmin),
    ]);

    const mapaCompleto = normalizarMapa(escudo.mapaTatico);
    const minhasFichasResumo = minhasFichas.map((f) => ({
      id: f.id,
      nome: f.dados?.identidade?.nome?.trim() || f.nome || "Caçador",
      sigla: gerarSigla(
        f.dados?.identidade?.nome?.trim() || f.nome || "Caçador"
      ),
      fotoSalva:
        buscarRetratoSalvo(mapaCompleto.retratosSalvos, {
          fichaId: f.id,
          email: emailLower,
        }) || "",
    }));

    const imagemIgualNoCliente =
      imgLenParam > 0 &&
      mapaCompleto.imagemUrl.length === imgLenParam &&
      mapaCompleto.imagemUrl.slice(-24) === imgTailParam;

    if (user.isAdmin) {
      const galeriaIgualNoCliente =
        omitirGaleria &&
        (mapaCompleto.mapasSalvos?.length ?? 0) === galeriaCountParam;

      return NextResponse.json({
        visivel: true,
        isAdmin: true,
        imagemUrlMantida: imagemIgualNoCliente,
        mapasSalvosMantidos: galeriaIgualNoCliente,
        mapa: {
          ...mapaCompleto,
          imagemUrl: imagemIgualNoCliente ? "" : mapaCompleto.imagemUrl,
          mapasSalvos: galeriaIgualNoCliente ? [] : mapaCompleto.mapasSalvos,
        },
        minhasFichas: minhasFichasResumo,
        ultimaRolagem,
      });
    }

    if (!mapaCompleto.visivelJogadores) {
      return NextResponse.json({
        visivel: false,
        isAdmin: false,
        mapa: null,
        minhasFichas: minhasFichasResumo,
        ultimaRolagem,
      });
    }

    const fogSet = new Set(mapaCompleto.fogCelulas);
    const meusIds = new Set(minhasFichas.map((f) => f.id));

    const tokensVisiveisParaJogador = mapaCompleto.tokens.filter((t) => {
      const ehMeu =
        (t.fichaId && meusIds.has(t.fichaId)) ||
        (t.ownerEmail && t.ownerEmail.trim().toLowerCase() === emailLower);
      if (ehMeu) return true;
      if (t.oculto) return false;
      if (tokenOcupaFog(t.x, t.y, t.tamanho || 1, fogSet)) return false;
      return true;
    });

    return NextResponse.json({
      visivel: true,
      isAdmin: false,
      imagemUrlMantida: imagemIgualNoCliente,
      mapa: {
        ...mapaCompleto,
        imagemUrl: imagemIgualNoCliente ? "" : mapaCompleto.imagemUrl,
        tokens: tokensVisiveisParaJogador,
        mapasSalvos: [],
        retratosSalvos: {},
      },
      minhasFichas: minhasFichasResumo,
      ultimaRolagem,
    });
  } catch (erro) {
    console.error("Erro em GET /api/mapa:", erro);
    return NextResponse.json(
      { error: "Erro ao carregar mapa tático." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await obterUsuarioSessao();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: "Apenas o Mestre pode alterar o mapa." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = PatchMestreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || "Atualização de mapa inválida.",
        },
        { status: 400 }
      );
    }

    const db = getDb();
    const acao = parsed.data;

    const resultado = await db.transaction(async (tx) => {
      const [escudo] = await tx
        .select()
        .from(escudoMestre)
        .where(eq(escudoMestre.id, 1))
        .limit(1);

      const mapa = normalizarMapa(escudo?.mapaTatico);
      const retratos = { ...(mapa.retratosSalvos || {}) };

      if (acao.acao === "atualizar_travas") {
        if (acao.visivelJogadores !== undefined) {
          mapa.visivelJogadores = acao.visivelJogadores;
        }
        if (acao.posicionamentoJogadoresLiberado !== undefined) {
          mapa.posicionamentoJogadoresLiberado =
            acao.posicionamentoJogadoresLiberado;
        }
        if (acao.movimentoJogadoresLiberado !== undefined) {
          mapa.movimentoJogadoresLiberado = acao.movimentoJogadoresLiberado;
        }
        if (acao.jogadoresTravadosInsercao !== undefined) {
          mapa.jogadoresTravadosInsercao = acao.jogadoresTravadosInsercao;
        }
        if (acao.jogadoresTravadosMovimento !== undefined) {
          mapa.jogadoresTravadosMovimento = acao.jogadoresTravadosMovimento;
        }
      } else if (acao.acao === "atualizar_config") {
        if (acao.titulo !== undefined) mapa.titulo = acao.titulo;
        if (acao.temaFundo !== undefined) mapa.temaFundo = acao.temaFundo;
        if (acao.colunas !== undefined) mapa.colunas = acao.colunas;
        if (acao.linhas !== undefined) mapa.linhas = acao.linhas;
        if (acao.opacidadeGrid !== undefined) {
          mapa.opacidadeGrid = acao.opacidadeGrid;
        }
        if (acao.corGrid !== undefined) mapa.corGrid = acao.corGrid;
        if (acao.ajusteImagem !== undefined) {
          mapa.ajusteImagem = acao.ajusteImagem;
        }
        ajustarTokensEFogAoTamanho(mapa);
      } else if (acao.acao === "salvar_imagem_mapa") {
        mapa.imagemUrl = acao.imagemUrl.trim();
        if (acao.ajusteImagem !== undefined) {
          mapa.ajusteImagem = acao.ajusteImagem;
        }
        if (acao.colunas !== undefined) mapa.colunas = acao.colunas;
        if (acao.linhas !== undefined) mapa.linhas = acao.linhas;
        if (mapa.imagemUrl && acao.salvarNaGaleria !== false) {
          mapa.mapasSalvos = salvarNaGaleriaMapas(
            mapa.mapasSalvos,
            mapa.imagemUrl,
            acao.nomeImagem || mapa.titulo
          );
        }
        ajustarTokensEFogAoTamanho(mapa);
      } else if (acao.acao === "remover_mapa_salvo") {
        mapa.mapasSalvos = (mapa.mapasSalvos || []).filter(
          (m) => m.id !== acao.mapaSalvoId
        );
      } else if (acao.acao === "atualizar_fog") {
        mapa.fogCelulas = acao.fogCelulas;
        ajustarTokensEFogAoTamanho(mapa);
      } else if (acao.acao === "mover_token") {
        const idx = mapa.tokens.findIndex((t) => t.id === acao.tokenId);
        if (idx !== -1) {
          const tam = mapa.tokens[idx].tamanho || 1;
          mapa.tokens[idx] = {
            ...mapa.tokens[idx],
            x: Math.max(0, Math.min(mapa.colunas - tam, acao.x)),
            y: Math.max(0, Math.min(mapa.linhas - tam, acao.y)),
          };
        }
      } else if (acao.acao === "adicionar_token") {
        const tok = { ...acao.token };
        if (
          tok.tipo === "jogador" &&
          tok.fichaId &&
          mapa.tokens.some((t) => t.fichaId === tok.fichaId)
        ) {
          return { mapa };
        }
        if (!tok.imagemUrl) {
          const fotoSalva = buscarRetratoSalvo(retratos, {
            fichaId: tok.fichaId,
            ameacaId: tok.ameacaId,
            email: tok.ownerEmail,
          });
          if (fotoSalva) tok.imagemUrl = fotoSalva;
        } else {
          registrarRetratoToken(retratos, {
            fichaId: tok.fichaId,
            ameacaId: tok.ameacaId,
            email: tok.ownerEmail,
            imagemUrl: tok.imagemUrl,
          });
        }
        const tam = tok.tamanho || 1;
        tok.x = Math.max(0, Math.min(mapa.colunas - tam, tok.x));
        tok.y = Math.max(0, Math.min(mapa.linhas - tam, tok.y));
        mapa.tokens.push(tok);
      } else if (acao.acao === "editar_token") {
        const idx = mapa.tokens.findIndex((t) => t.id === acao.tokenId);
        if (idx !== -1) {
          const atual = mapa.tokens[idx];
          const novoTam = acao.tamanho ?? atual.tamanho ?? 1;
          const novaImg =
            acao.imagemUrl !== undefined
              ? acao.imagemUrl || undefined
              : atual.imagemUrl;

          if (acao.imagemUrl !== undefined) {
            registrarRetratoToken(retratos, {
              fichaId: atual.fichaId,
              ameacaId: atual.ameacaId,
              email: atual.ownerEmail,
              imagemUrl: acao.imagemUrl,
            });
          }

          mapa.tokens[idx] = {
            ...atual,
            ...(acao.oculto !== undefined ? { oculto: acao.oculto } : {}),
            ...(acao.cor !== undefined ? { cor: acao.cor } : {}),
            ...(acao.nome !== undefined
              ? { nome: acao.nome, sigla: gerarSigla(acao.nome) }
              : {}),
            tamanho: novoTam,
            imagemUrl: novaImg,
            x: Math.max(0, Math.min(mapa.colunas - novoTam, atual.x)),
            y: Math.max(0, Math.min(mapa.linhas - novoTam, atual.y)),
          };
        }
      } else if (acao.acao === "remover_token") {
        mapa.tokens = mapa.tokens.filter((t) => t.id !== acao.tokenId);
      } else if (acao.acao === "limpar_tokens") {
        mapa.tokens = [];
      }

      mapa.retratosSalvos = retratos;
      mapa.versao = (mapa.versao || 1) + 1;
      mapa.updatedAt = new Date().toISOString();

      await tx
        .insert(escudoMestre)
        .values({
          id: 1,
          mestreEmail: obterEmailAdmin(),
          mapaTatico: mapa,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: escudoMestre.id,
          set: {
            mapaTatico: mapa,
            updatedAt: new Date(),
          },
        });

      return { mapa };
    });

    return NextResponse.json({
      ok: true,
      versao: resultado.mapa.versao,
      mapasSalvos: resultado.mapa.mapasSalvos,
      retratosSalvos: resultado.mapa.retratosSalvos,
      tokens: resultado.mapa.tokens,
    });
  } catch (erro) {
    console.error("Erro em PATCH /api/mapa:", erro);
    return NextResponse.json(
      { error: "Erro ao atualizar mapa tático." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await obterUsuarioSessao();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: "Apenas o Mestre pode configurar o mapa." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = SalvarMapaMestreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || "Configuração de mapa inválida.",
        },
        { status: 400 }
      );
    }

    const db = getDb();
    const mapaSalvo = await db.transaction(async (tx) => {
      const [atualRow] = await tx
        .select()
        .from(escudoMestre)
        .where(eq(escudoMestre.id, 1))
        .limit(1);

      const anterior = normalizarMapa(atualRow?.mapaTatico);
      const novo: MapaTaticoEstado = {
        ...parsed.data,
        versao: (anterior.versao || 1) + 1,
        mapasSalvos: parsed.data.mapasSalvos ?? anterior.mapasSalvos ?? [],
        retratosSalvos:
          parsed.data.retratosSalvos ?? anterior.retratosSalvos ?? {},
        updatedAt: new Date().toISOString(),
      };

      if (novo.imagemUrl) {
        novo.mapasSalvos = salvarNaGaleriaMapas(
          novo.mapasSalvos,
          novo.imagemUrl,
          novo.titulo
        );
      }
      ajustarTokensEFogAoTamanho(novo);

      await tx
        .insert(escudoMestre)
        .values({
          id: 1,
          mestreEmail: obterEmailAdmin(),
          mapaTatico: novo,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: escudoMestre.id,
          set: {
            mapaTatico: novo,
            updatedAt: new Date(),
          },
        });

      return novo;
    });

    return NextResponse.json({
      ok: true,
      versao: mapaSalvo.versao,
      mapa: mapaSalvo,
    });
  } catch (erro) {
    console.error("Erro em PUT /api/mapa:", erro);
    return NextResponse.json(
      { error: "Erro ao salvar mapa tático." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await obterUsuarioSessao();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = AcaoJogadorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Ação inválida no mapa." },
        { status: 400 }
      );
    }

    const db = getDb();
    const emailLower = user.email.trim().toLowerCase();

    const resultado = await db.transaction(async (tx) => {
      const [escudo] = await tx
        .select()
        .from(escudoMestre)
        .where(eq(escudoMestre.id, 1))
        .limit(1);

      const mapa = normalizarMapa(escudo?.mapaTatico);
      const retratos = { ...(mapa.retratosSalvos || {}) };

      if (
        !user.isAdmin &&
        !mapa.visivelJogadores &&
        parsed.data.acao !== "atualizar_aparencia_meu_token"
      ) {
        return { erro: "O mapa não está ativo no momento.", status: 403 };
      }

      const fogSet = new Set(mapa.fogCelulas);
      const acao = parsed.data;

      const verificarDonoDoToken = async (tokenAlvo: TokenMapa) => {
        if (user.isAdmin) return true;
        if (
          tokenAlvo.ownerEmail &&
          tokenAlvo.ownerEmail.trim().toLowerCase() === emailLower
        ) {
          return true;
        }
        if (tokenAlvo.fichaId) {
          const [ficha] = await tx
            .select({ userId: fichas.userId, ownerEmail: fichas.ownerEmail })
            .from(fichas)
            .where(eq(fichas.id, tokenAlvo.fichaId))
            .limit(1);
          if (
            ficha &&
            (ficha.userId === user.id ||
              ficha.ownerEmail.trim().toLowerCase() === emailLower)
          ) {
            return true;
          }
        }
        return false;
      };

      if (acao.acao === "colocar_meu_token") {
        if (
          !user.isAdmin &&
          (!mapa.posicionamentoJogadoresLiberado ||
            jogadorEstaTravadoNaLista(
              mapa.jogadoresTravadosInsercao,
              acao.fichaId,
              emailLower
            ))
        ) {
          return {
            erro: "O Mestre travou a opção de inserir/posicionar seu token no mapa.",
            status: 403,
          };
        }

        const [ficha] = await tx
          .select()
          .from(fichas)
          .where(eq(fichas.id, acao.fichaId))
          .limit(1);

        if (!ficha) {
          return { erro: "Ficha não encontrada.", status: 404 };
        }

        const ehDono =
          user.isAdmin ||
          ficha.userId === user.id ||
          ficha.ownerEmail.trim().toLowerCase() === emailLower;

        if (!ehDono) {
          return {
            erro: "Você só pode posicionar o token do seu próprio personagem.",
            status: 403,
          };
        }

        const x = Math.max(0, Math.min(mapa.colunas - 1, acao.x));
        const y = Math.max(0, Math.min(mapa.linhas - 1, acao.y));

        if (!user.isAdmin && fogSet.has(`${x},${y}`)) {
          return {
            erro: "Não é permitido posicionar seu token em uma área coberta pela Névoa (Fog).",
            status: 400,
          };
        }

        const nomePersonagem =
          ficha.dados?.identidade?.nome?.trim() || ficha.nome || "Caçador";

        const existenteIdx = mapa.tokens.findIndex(
          (t) => t.fichaId === ficha.id
        );
        const tokenExistente =
          existenteIdx !== -1 ? mapa.tokens[existenteIdx] : undefined;

        if (acao.imagemUrl !== undefined) {
          registrarRetratoToken(retratos, {
            fichaId: ficha.id,
            email: ficha.ownerEmail,
            imagemUrl: acao.imagemUrl,
          });
        }

        const imagemFinal =
          acao.imagemUrl !== undefined
            ? acao.imagemUrl || undefined
            : tokenExistente?.imagemUrl ||
              buscarRetratoSalvo(retratos, {
                fichaId: ficha.id,
                email: ficha.ownerEmail,
              });

        const novoToken: TokenMapa = {
          id: tokenExistente?.id || `tok-${ficha.id.slice(0, 8)}`,
          nome: nomePersonagem,
          cor: acao.cor || tokenExistente?.cor || "#f08b21",
          sigla: gerarSigla(nomePersonagem),
          imagemUrl: imagemFinal,
          x,
          y,
          tamanho: 1,
          tipo: "jogador",
          fichaId: ficha.id,
          ownerEmail: ficha.ownerEmail,
          oculto: false,
        };

        if (existenteIdx !== -1) {
          mapa.tokens[existenteIdx] = novoToken;
        } else {
          mapa.tokens.push(novoToken);
        }
      } else if (acao.acao === "mover_meu_token") {
        const idx = mapa.tokens.findIndex((t) => t.id === acao.tokenId);
        if (idx === -1) {
          return { erro: "Token não encontrado no mapa.", status: 404 };
        }

        const tokenAlvo = mapa.tokens[idx];
        if (!(await verificarDonoDoToken(tokenAlvo))) {
          return {
            erro: "Você só pode mover o token do seu próprio personagem.",
            status: 403,
          };
        }

        if (
          !user.isAdmin &&
          (!mapa.movimentoJogadoresLiberado ||
            jogadorEstaTravadoNaLista(
              mapa.jogadoresTravadosMovimento,
              tokenAlvo.fichaId,
              emailLower
            ))
        ) {
          return {
            erro: "Sua movimentação no mapa está travada pelo Mestre no momento.",
            status: 403,
          };
        }

        const tam = tokenAlvo.tamanho || 1;
        const x = Math.max(0, Math.min(mapa.colunas - tam, acao.x));
        const y = Math.max(0, Math.min(mapa.linhas - tam, acao.y));

        if (!user.isAdmin && tokenOcupaFog(x, y, tam, fogSet)) {
          return {
            erro: "Movimento bloqueado: esta área está coberta pela Névoa (Fog).",
            status: 400,
          };
        }

        mapa.tokens[idx] = { ...tokenAlvo, x, y };
      } else if (acao.acao === "recolher_meu_token") {
        const idx = mapa.tokens.findIndex((t) => t.id === acao.tokenId);
        if (idx === -1) {
          return { ok: true, versao: mapa.versao };
        }
        const tokenAlvo = mapa.tokens[idx];
        if (!(await verificarDonoDoToken(tokenAlvo))) {
          return {
            erro: "Sem permissão para recolher este token.",
            status: 403,
          };
        }
        if (
          !user.isAdmin &&
          (!mapa.posicionamentoJogadoresLiberado ||
            jogadorEstaTravadoNaLista(
              mapa.jogadoresTravadosInsercao,
              tokenAlvo.fichaId,
              emailLower
            ))
        ) {
          return {
            erro: "O Mestre travou o posicionamento/remoção do seu token.",
            status: 403,
          };
        }

        mapa.tokens.splice(idx, 1);
      } else if (acao.acao === "atualizar_aparencia_meu_token") {
        let fichaValidadaId: string | undefined;

        if (acao.fichaId) {
          const [ficha] = await tx
            .select({
              id: fichas.id,
              userId: fichas.userId,
              ownerEmail: fichas.ownerEmail,
            })
            .from(fichas)
            .where(eq(fichas.id, acao.fichaId))
            .limit(1);

          if (
            ficha &&
            (user.isAdmin ||
              ficha.userId === user.id ||
              ficha.ownerEmail.trim().toLowerCase() === emailLower)
          ) {
            fichaValidadaId = ficha.id;
          }
        }

        if (acao.imagemUrl !== undefined) {
          registrarRetratoToken(retratos, {
            fichaId: fichaValidadaId,
            email: emailLower,
            imagemUrl: acao.imagemUrl,
          });
        }

        if (acao.tokenId) {
          const idx = mapa.tokens.findIndex((t) => t.id === acao.tokenId);
          if (idx !== -1) {
            const tokenAlvo = mapa.tokens[idx];
            if (!(await verificarDonoDoToken(tokenAlvo))) {
              return {
                erro: "Sem permissão para editar este token.",
                status: 403,
              };
            }
            if (acao.imagemUrl !== undefined && tokenAlvo.fichaId) {
              registrarRetratoToken(retratos, {
                fichaId: tokenAlvo.fichaId,
                email: tokenAlvo.ownerEmail || emailLower,
                imagemUrl: acao.imagemUrl,
              });
            }
            mapa.tokens[idx] = {
              ...tokenAlvo,
              cor: acao.cor !== undefined ? acao.cor : tokenAlvo.cor,
              imagemUrl:
                acao.imagemUrl !== undefined
                  ? acao.imagemUrl || undefined
                  : tokenAlvo.imagemUrl,
            };
          }
        }
      }

      mapa.retratosSalvos = retratos;
      mapa.versao = (mapa.versao || 1) + 1;
      mapa.updatedAt = new Date().toISOString();

      await tx
        .insert(escudoMestre)
        .values({
          id: 1,
          mestreEmail: obterEmailAdmin(),
          mapaTatico: mapa,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: escudoMestre.id,
          set: {
            mapaTatico: mapa,
            updatedAt: new Date(),
          },
        });

      return { ok: true, versao: mapa.versao };
    });

    if ("erro" in resultado) {
      return NextResponse.json(
        { error: resultado.erro },
        { status: resultado.status }
      );
    }

    return NextResponse.json({ ok: true, versao: resultado.versao });
  } catch (erro) {
    console.error("Erro em POST /api/mapa:", erro);
    return NextResponse.json(
      { error: "Erro ao atualizar token no mapa." },
      { status: 500 }
    );
  }
}
