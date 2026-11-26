import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { cronicaSubgrupos, escudoMestre, fichas } from "@/db/schema";
import { obterUsuarioSessao, type UsuarioSessao } from "@/lib/auth";
import { nomeFichaAtual, normalizarFicha } from "@/lib/regras";

const UuidSchema = z.uuid("ID de ficha inválido.");
const AtualizarFichaBodySchema = z.object({
  dados: z.unknown(),
});

function usuarioPodeAcessarFicha(
  fichaRow: { userId: string | null; ownerEmail: string },
  user: UsuarioSessao
): boolean {
  if (user.isAdmin) return true;
  if (fichaRow.userId && fichaRow.userId === user.id) return true;
  return (
    fichaRow.ownerEmail.trim().toLowerCase() === user.email.trim().toLowerCase()
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await obterUsuarioSessao();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { id } = await context.params;
    const validId = UuidSchema.safeParse(id);
    if (!validId.success) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const db = getDb();
    const [ficha] = await db
      .select()
      .from(fichas)
      .where(eq(fichas.id, id))
      .limit(1);

    if (!ficha) {
      return NextResponse.json(
        { error: "Ficha não encontrada." },
        { status: 404 }
      );
    }

    if (!usuarioPodeAcessarFicha(ficha, user)) {
      return NextResponse.json(
        { error: "Sem permissão para acessar esta ficha." },
        { status: 403 }
      );
    }

    const [subgrupo] = await db
      .select({
        id: cronicaSubgrupos.id,
        nome: cronicaSubgrupos.nome,
        desespero: cronicaSubgrupos.desespero,
        perigo: cronicaSubgrupos.perigo,
        ficha_ids: cronicaSubgrupos.fichaIds,
      })
      .from(cronicaSubgrupos)
      .where(sql`${id}::uuid = ANY(${cronicaSubgrupos.fichaIds})`)
      .limit(1);

    return NextResponse.json({
      ficha: {
        id: ficha.id,
        nome: ficha.nome,
        owner_email: ficha.ownerEmail,
        updated_at: ficha.updatedAt,
        created_at: ficha.createdAt,
        dados: normalizarFicha(ficha.dados),
      },
      subgrupo: subgrupo ?? null,
    });
  } catch (erro) {
    console.error("Erro em GET /api/fichas/[id]:", erro);
    return NextResponse.json(
      { error: "Erro ao abrir ficha." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await obterUsuarioSessao();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { id } = await context.params;
    if (!UuidSchema.safeParse(id).success) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const body = await request.json();
    const parsed = AtualizarFichaBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload de ficha inválido." },
        { status: 400 }
      );
    }

    const db = getDb();
    const [existente] = await db
      .select()
      .from(fichas)
      .where(eq(fichas.id, id))
      .limit(1);

    if (!existente) {
      return NextResponse.json(
        { error: "Ficha não encontrada." },
        { status: 404 }
      );
    }

    if (!usuarioPodeAcessarFicha(existente, user)) {
      return NextResponse.json(
        { error: "Sem permissão para editar esta ficha." },
        { status: 403 }
      );
    }

    const dadosNormalizados = normalizarFicha(parsed.data.dados);
    if (existente.dados?.estado?.finalizada && !user.isAdmin) {
      dadosNormalizados.estado.finalizada = true;
    }
    dadosNormalizados.estado.ultimaAtualizacao = new Date().toISOString();

    const [atualizada] = await db
      .update(fichas)
      .set({
        nome: nomeFichaAtual(dadosNormalizados),
        sistema: dadosNormalizados.sistema,
        dados: dadosNormalizados,
        updatedAt: new Date(),
      })
      .where(eq(fichas.id, id))
      .returning({
        id: fichas.id,
        nome: fichas.nome,
        owner_email: fichas.ownerEmail,
        updated_at: fichas.updatedAt,
        created_at: fichas.createdAt,
        dados: fichas.dados,
      });

    return NextResponse.json({ ficha: atualizada });
  } catch (erro) {
    console.error("Erro em PUT /api/fichas/[id]:", erro);
    return NextResponse.json(
      { error: "Erro ao atualizar ficha." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await obterUsuarioSessao();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { id } = await context.params;
    if (!UuidSchema.safeParse(id).success) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const db = getDb();
    const [existente] = await db
      .select()
      .from(fichas)
      .where(eq(fichas.id, id))
      .limit(1);

    if (!existente) {
      return NextResponse.json(
        { error: "Ficha não encontrada." },
        { status: 404 }
      );
    }

    if (!usuarioPodeAcessarFicha(existente, user)) {
      return NextResponse.json(
        { error: "Sem permissão para excluir esta ficha." },
        { status: 403 }
      );
    }

    await db.transaction(async (tx) => {
      await tx.delete(fichas).where(eq(fichas.id, id));
      await tx.execute(
        sql`UPDATE ${escudoMestre} SET ficha_ids = array_remove(ficha_ids, ${id}::uuid)`
      );
      await tx.execute(
        sql`UPDATE ${cronicaSubgrupos} SET ficha_ids = array_remove(ficha_ids, ${id}::uuid)`
      );
    });

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("Erro em DELETE /api/fichas/[id]:", erro);
    return NextResponse.json(
      { error: "Erro ao excluir ficha." },
      { status: 500 }
    );
  }
}
