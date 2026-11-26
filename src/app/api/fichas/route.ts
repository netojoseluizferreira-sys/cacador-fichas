import { desc, eq, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { fichas } from "@/db/schema";
import { obterUsuarioSessao } from "@/lib/auth";
import { nomeFichaAtual, normalizarFicha } from "@/lib/regras";

const SalvarFichaBodySchema = z.object({
  dados: z.unknown(),
});

export async function GET(request: Request) {
  try {
    const user = await obterUsuarioSessao();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const todas = searchParams.get("todas") === "true" && user.isAdmin;
    const db = getDb();

    const emailLower = user.email.trim().toLowerCase();

    const lista = todas
      ? await db
          .select({
            id: fichas.id,
            nome: fichas.nome,
            owner_email: fichas.ownerEmail,
            updated_at: fichas.updatedAt,
            created_at: fichas.createdAt,
            dados: fichas.dados,
          })
          .from(fichas)
          .orderBy(desc(fichas.updatedAt))
      : await db
          .select({
            id: fichas.id,
            nome: fichas.nome,
            owner_email: fichas.ownerEmail,
            updated_at: fichas.updatedAt,
            created_at: fichas.createdAt,
            dados: fichas.dados,
          })
          .from(fichas)
          .where(
            or(
              eq(fichas.userId, user.id),
              sql`lower(trim(${fichas.ownerEmail})) = ${emailLower}`
            )
          )
          .orderBy(desc(fichas.updatedAt));

    return NextResponse.json({ fichas: lista });
  } catch (erro) {
    console.error("Erro em GET /api/fichas:", erro);
    return NextResponse.json(
      { error: "Erro ao carregar fichas." },
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
    const parsed = SalvarFichaBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload de ficha inválido." },
        { status: 400 }
      );
    }

    const dadosNormalizados = normalizarFicha(parsed.data.dados);
    dadosNormalizados.estado.ultimaAtualizacao = new Date().toISOString();

    const db = getDb();
    const [criada] = await db
      .insert(fichas)
      .values({
        userId: user.id,
        ownerEmail: user.email.trim().toLowerCase(),
        nome: nomeFichaAtual(dadosNormalizados),
        sistema: dadosNormalizados.sistema,
        dados: dadosNormalizados,
      })
      .returning({
        id: fichas.id,
        nome: fichas.nome,
        owner_email: fichas.ownerEmail,
        updated_at: fichas.updatedAt,
        created_at: fichas.createdAt,
        dados: fichas.dados,
      });

    return NextResponse.json({ ficha: criada }, { status: 201 });
  } catch (erro) {
    console.error("Erro em POST /api/fichas:", erro);
    return NextResponse.json(
      { error: "Erro ao criar ficha online." },
      { status: 500 }
    );
  }
}
