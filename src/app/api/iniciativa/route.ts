import { eq, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { escudoMestre, fichas } from "@/db/schema";
import { obterUsuarioSessao } from "@/lib/auth";
import type { VisibilidadeIniciativa } from "@/types/ficha";

export async function GET() {
  try {
    const user = await obterUsuarioSessao();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const db = getDb();
    const [escudo] = await db
      .select()
      .from(escudoMestre)
      .where(eq(escudoMestre.id, 1))
      .limit(1);

    const lista = Array.isArray(escudo?.iniciativa) ? escudo.iniciativa : [];
    const definida = Boolean(escudo?.iniciativaDefinida);
    const visibilidade: VisibilidadeIniciativa =
      escudo?.iniciativaVisibilidade === "total" ||
      escudo?.iniciativaVisibilidade === "parcial"
        ? escudo.iniciativaVisibilidade
        : "invisivel";

    if (!definida || lista.length === 0) {
      return NextResponse.json({
        disponivel: false,
        motivo: "Nenhuma iniciativa ativa definida pelo Mestre no momento.",
        visibilidade,
        definida: false,
        itens: [],
      });
    }

    if (visibilidade === "invisivel" && !user.isAdmin) {
      return NextResponse.json({
        disponivel: false,
        motivo: "A iniciativa está oculta pelo Mestre no momento.",
        visibilidade: "invisivel",
        definida: true,
        itens: [],
      });
    }

    const emailLower = user.email.trim().toLowerCase();
    const minhasFichas = await db
      .select({ id: fichas.id })
      .from(fichas)
      .where(
        or(
          eq(fichas.userId, user.id),
          sql`lower(trim(${fichas.ownerEmail})) = ${emailLower}`
        )
      );

    const minhasFichaIds = new Set(minhasFichas.map((f) => f.id));

    const participaDaIniciativa =
      user.isAdmin ||
      lista.some(
        (item) =>
          (item.fichaId && minhasFichaIds.has(item.fichaId)) ||
          (item.ownerEmail &&
            item.ownerEmail.trim().toLowerCase() === emailLower)
      );

    if (!participaDaIniciativa) {
      return NextResponse.json({
        disponivel: false,
        motivo:
          "A visualização da iniciativa está disponível apenas para jogadores participantes deste combate.",
        visibilidade,
        definida: true,
        itens: [],
      });
    }

    const turnoIdx = Math.min(
      Math.max(0, Number(escudo?.turno ?? 0)),
      lista.length - 1
    );

    if (visibilidade === "total" || (visibilidade === "invisivel" && user.isAdmin)) {
      return NextResponse.json({
        disponivel: true,
        visibilidade,
        definida: true,
        totalParticipantes: lista.length,
        turnoAtualPosicao: turnoIdx + 1,
        turnoAtualNome: lista[turnoIdx]?.nome ?? null,
        itens: lista.map((item, idx) => ({
          id: item.id,
          posicao: idx + 1,
          nome: item.nome,
          detalhe: item.detalhe || "",
          valor: item.valor,
          ehTurnoAtual: idx === turnoIdx,
          ehMeuPersonagem: Boolean(
            (item.fichaId && minhasFichaIds.has(item.fichaId)) ||
              (item.ownerEmail &&
                item.ownerEmail.trim().toLowerCase() === emailLower)
          ),
        })),
      });
    }

    // Visibilidade parcial: retorna somente os membros que o mestre deixou visíveis,
    // preservando a posição real deles na ordem de iniciativa.
    const itemTurno = lista[turnoIdx];
    const turnoVisivel = Boolean(itemTurno?.visivel);

    const itensParciais = lista
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => Boolean(item.visivel))
      .map(({ item, idx }) => ({
        id: item.id,
        posicao: idx + 1,
        nome: item.nome,
        detalhe: item.detalhe || "",
        valor: item.valor,
        ehTurnoAtual: idx === turnoIdx,
        ehMeuPersonagem: Boolean(
          (item.fichaId && minhasFichaIds.has(item.fichaId)) ||
            (item.ownerEmail &&
              item.ownerEmail.trim().toLowerCase() === emailLower)
        ),
      }));

    return NextResponse.json({
      disponivel: true,
      visibilidade: "parcial",
      definida: true,
      totalParticipantes: lista.length,
      turnoAtualPosicao: turnoIdx + 1,
      turnoAtualNome: turnoVisivel ? (itemTurno?.nome ?? null) : null,
      itens: itensParciais,
    });
  } catch (erro) {
    console.error("Erro em GET /api/iniciativa:", erro);
    return NextResponse.json(
      { error: "Erro ao consultar iniciativa." },
      { status: 500 }
    );
  }
}
