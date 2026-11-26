import { and, eq, inArray, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { cronicaSubgrupos, fichas } from "@/db/schema";
import { obterUsuarioSessao } from "@/lib/auth";

const IncrementarPerigoSchema = z.object({
  incremento: z.number().int().min(1).max(10).default(1),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await obterUsuarioSessao();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = IncrementarPerigoSchema.safeParse(body);
    const incremento = parsed.success ? parsed.data.incremento : 1;

    const db = getDb();
    const [subgrupo] = await db
      .select()
      .from(cronicaSubgrupos)
      .where(eq(cronicaSubgrupos.id, id))
      .limit(1);

    if (!subgrupo) {
      return NextResponse.json(
        { error: "Subgrupo não encontrado." },
        { status: 404 }
      );
    }

    if (!user.isAdmin) {
      const idsMembros = subgrupo.fichaIds ?? [];
      if (idsMembros.length === 0) {
        return NextResponse.json(
          { error: "Sem permissão para aumentar o Perigo deste subgrupo." },
          { status: 403 }
        );
      }

      const emailLower = user.email.trim().toLowerCase();
      const fichasDoUsuarioNoSubgrupo = await db
        .select({ id: fichas.id })
        .from(fichas)
        .where(
          and(
            inArray(fichas.id, idsMembros),
            or(
              eq(fichas.userId, user.id),
              sql`lower(trim(${fichas.ownerEmail})) = ${emailLower}`
            )
          )
        )
        .limit(1);

      if (fichasDoUsuarioNoSubgrupo.length === 0) {
        return NextResponse.json(
          { error: "Sem permissão para aumentar o Perigo deste subgrupo." },
          { status: 403 }
        );
      }
    }

    const [atualizado] = await db
      .update(cronicaSubgrupos)
      .set({
        perigo: sql`${cronicaSubgrupos.perigo} + ${incremento}`,
        updatedAt: new Date(),
      })
      .where(eq(cronicaSubgrupos.id, id))
      .returning({
        id: cronicaSubgrupos.id,
        nome: cronicaSubgrupos.nome,
        ficha_ids: cronicaSubgrupos.fichaIds,
        desespero: cronicaSubgrupos.desespero,
        perigo: cronicaSubgrupos.perigo,
      });

    return NextResponse.json({ subgrupo: atualizado });
  } catch (erro) {
    console.error("Erro em POST /api/subgrupos/[id]/perigo:", erro);
    return NextResponse.json(
      { error: "Erro ao aumentar Perigo do subgrupo." },
      { status: 500 }
    );
  }
}
