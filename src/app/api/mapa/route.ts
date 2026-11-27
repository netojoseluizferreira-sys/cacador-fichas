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
  MapaTaticoEstado,
  TemaFundoMapa,
  TokenMapa,
  UltimaRolagemResumo,
} from "@/types/ficha";

const TokenSchema = z.object({
  id: z.string(),
  nome: z.string(),
  cor: z.string().default("#f08b21"),
  sigla: z.string().max(4).default("CA"),
  x: z.number().int().min(0).max(60),
  y: z.number().int().min(0).max(60),
  tamanho: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
  tipo: z.enum(["jogador", "ameaca", "marcador"]).default("jogador"),
  fichaId: z.string().optional(),
  ownerEmail: z.string().optional(),
  ameacaId: z.string().optional(),
  oculto: z.boolean().optional(),
});

const SalvarMapaMestreSchema = z.object({
  visivelJogadores: z.boolean().default(false),
  movimentoJogadoresLiberado: z.boolean().default(true),
  titulo: z.string().max(120).default("Cena de Conflito"),
  imagemUrl: z.string().max(2000).default(""),
  temaFundo: z
    .enum(["asfalto", "galpao", "hospital", "subterraneo", "floresta"])
    .default("asfalto"),
  colunas: z.number().int().min(6).max(40).default(20),
  linhas: z.number().int().min(6).max(32).default(14),
  opacidadeGrid: z.number().min(0.05).max(1).default(0.3),
  corGrid: z.string().max(32).default("#ffffff"),
  fogCelulas: z.array(z.string()).max(2000).default([]),
  tokens: z.array(TokenSchema).max(120).default([]),
});

const AcaoJogadorSchema = z.discriminatedUnion("acao", [
  z.object({
    acao: z.literal("colocar_meu_token"),
    fichaId: z.uuid(),
    x: z.number().int().min(0).max(60),
    y: z.number().int().min(0).max(60),
    cor: z.string().max(24).optional(),
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
]);

function normalizarMapa(bruto?: Partial<MapaTaticoEstado> | null): MapaTaticoEstado {
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

  return {
    visivelJogadores: Boolean(bruto?.visivelJogadores),
    movimentoJogadoresLiberado:
      bruto?.movimentoJogadoresLiberado === undefined
        ? true
        : Boolean(bruto.movimentoJogadoresLiberado),
    titulo: String(bruto?.titulo || "Cena de Conflito"),
    imagemUrl: String(bruto?.imagemUrl || ""),
    temaFundo: tema,
    colunas: Math.max(6, Math.min(40, Number(bruto?.colunas || 20))),
    linhas: Math.max(6, Math.min(32, Number(bruto?.linhas || 14))),
    opacidadeGrid: Math.max(
      0.05,
      Math.min(1, Number(bruto?.opacidadeGrid ?? 0.28))
    ),
    corGrid: String(bruto?.corGrid || "#ffffff"),
    fogCelulas: Array.isArray(bruto?.fogCelulas) ? bruto.fogCelulas : [],
    tokens: Array.isArray(bruto?.tokens) ? bruto.tokens : [],
    updatedAt: bruto?.updatedAt || "",
  };
}

function gerarSigla(nome: string): string {
  const partes = nome
    .trim()
    .split(/\s+/)
    .filter(Boolean);
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
      .orderBy(desc(rolagensJogadoresPublicas.createdAt))
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

export async function GET() {
  try {
    const user = await obterUsuarioSessao();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

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
    }));

    if (user.isAdmin) {
      return NextResponse.json({
        visivel: true,
        isAdmin: true,
        mapa: mapaCompleto,
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

    // Oculta tokens furtivos e tokens de inimigos dentro do Fog of War
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
      mapa: {
        ...mapaCompleto,
        tokens: tokensVisiveisParaJogador,
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

    const mapaParaSalvar: MapaTaticoEstado = {
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    };

    const db = getDb();
    await db
      .insert(escudoMestre)
      .values({
        id: 1,
        mestreEmail: obterEmailAdmin(),
        mapaTatico: mapaParaSalvar,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: escudoMestre.id,
        set: {
          mapaTatico: mapaParaSalvar,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ mapa: mapaParaSalvar });
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
      if (!user.isAdmin && !mapa.visivelJogadores) {
        return { erro: "O mapa não está ativo no momento.", status: 403 };
      }
      if (!user.isAdmin && !mapa.movimentoJogadoresLiberado) {
        return {
          erro: "O Mestre pausou a movimentação dos jogadores no mapa.",
          status: 403,
        };
      }

      const fogSet = new Set(mapa.fogCelulas);
      const acao = parsed.data;

      if (acao.acao === "colocar_meu_token") {
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
        const novoToken: TokenMapa = {
          id:
            existenteIdx !== -1
              ? mapa.tokens[existenteIdx].id
              : `tok-${ficha.id.slice(0, 8)}`,
          nome: nomePersonagem,
          cor: acao.cor || "#f08b21",
          sigla: gerarSigla(nomePersonagem),
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
        let autorizado = user.isAdmin;
        if (!autorizado) {
          if (
            tokenAlvo.ownerEmail &&
            tokenAlvo.ownerEmail.trim().toLowerCase() === emailLower
          ) {
            autorizado = true;
          } else if (tokenAlvo.fichaId) {
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
              autorizado = true;
            }
          }
        }

        if (!autorizado) {
          return {
            erro: "Você só pode mover o token do seu próprio personagem.",
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
          return { ok: true };
        }
        const tokenAlvo = mapa.tokens[idx];
        const autorizado =
          user.isAdmin ||
          (tokenAlvo.ownerEmail &&
            tokenAlvo.ownerEmail.trim().toLowerCase() === emailLower);

        if (!autorizado && tokenAlvo.fichaId) {
          const [ficha] = await tx
            .select({ userId: fichas.userId, ownerEmail: fichas.ownerEmail })
            .from(fichas)
            .where(eq(fichas.id, tokenAlvo.fichaId))
            .limit(1);
          if (
            !ficha ||
            (ficha.userId !== user.id &&
              ficha.ownerEmail.trim().toLowerCase() !== emailLower)
          ) {
            return { erro: "Sem permissão para recolher este token.", status: 403 };
          }
        } else if (!autorizado) {
          return { erro: "Sem permissão para recolher este token.", status: 403 };
        }

        mapa.tokens.splice(idx, 1);
      }

      mapa.updatedAt = new Date().toISOString();
      await tx
        .update(escudoMestre)
        .set({ mapaTatico: mapa, updatedAt: new Date() })
        .where(eq(escudoMestre.id, 1));

      return { ok: true, mapa };
    });

    if ("erro" in resultado) {
      return NextResponse.json(
        { error: resultado.erro },
        { status: resultado.status }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("Erro em POST /api/mapa:", erro);
    return NextResponse.json(
      { error: "Erro ao atualizar token no mapa." },
      { status: 500 }
    );
  }
}
