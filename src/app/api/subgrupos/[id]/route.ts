import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { cronicaSubgrupos } from "@/db/schema";
import { obterUsuarioSessao } from "@/lib/auth";

const UuidSchema = z.uuid();
const AtualizarSubgrupoSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do subgrupo."),
  desespero: z.number().int(),
  perigo: z.number().int(),
  ficha_ids: z.array(z.uuid()).default([]),
});

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await obterUsuarioSessao();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: "Apenas o mestre admin pode editar subgrupos." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    if (!UuidSchema.safeParse(id).success) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const body = await request.json();
    const parsed = AtualizarSubgrupoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos." },
        { status: 400 }
      );
    }

    const db = getDb();
    const [atualizado] = await db
      .update(cronicaSubgrupos)
      .set({
        nome: parsed.data.nome,
        desespero: parsed.data.desespero,
        perigo: parsed.data.perigo,
        fichaIds: parsed.data.ficha_ids,
        updatedAt: new Date(),
      })
      .where(eq(cronicaSubgrupos.id, id))
      .returning({
        id: cronicaSubgrupos.id,
        nome: cronicaSubgrupos.nome,
        ficha_ids: cronicaSubgrupos.fichaIds,
        desespero: cronicaSubgrupos.desespero,
        perigo: cronicaSubgrupos.perigo,
        updated_at: cronicaSubgrupos.updatedAt,
      });

    if (!atualizado) {
      return NextResponse.json(
        { error: "Subgrupo não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({ subgrupo: atualizado });
  } catch (erro) {
    console.error("Erro em PUT /api/subgrupos/[id]:", erro);
    return NextResponse.json(
      { error: "Erro ao salvar subgrupo." },
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
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: "Apenas o mestre admin pode excluir subgrupos." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    if (!UuidSchema.safeParse(id).success) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const db = getDb();
    await db.delete(cronicaSubgrupos).where(eq(cronicaSubgrupos.id, id));
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("Erro em DELETE /api/subgrupos/[id]:", erro);
    return NextResponse.json(
      { error: "Erro ao excluir subgrupo." },
      { status: 500 }
    );
  }
}
