import { desc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { cronicaSubgrupos } from "@/db/schema";
import { obterUsuarioSessao } from "@/lib/auth";

const CriarSubgrupoSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do subgrupo."),
  desespero: z.number().int().default(0),
  perigo: z.number().int().default(0),
  ficha_ids: z.array(z.uuid()).default([]),
});

export async function GET(request: Request) {
  try {
    const user = await obterUsuarioSessao();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fichaId = searchParams.get("fichaId");
    const db = getDb();

    if (fichaId && z.uuid().safeParse(fichaId).success) {
      const [subgrupo] = await db
        .select({
          id: cronicaSubgrupos.id,
          nome: cronicaSubgrupos.nome,
          ficha_ids: cronicaSubgrupos.fichaIds,
          desespero: cronicaSubgrupos.desespero,
          perigo: cronicaSubgrupos.perigo,
          updated_at: cronicaSubgrupos.updatedAt,
        })
        .from(cronicaSubgrupos)
        .where(sql`${fichaId}::uuid = ANY(${cronicaSubgrupos.fichaIds})`)
        .limit(1);

      return NextResponse.json({ subgrupo: subgrupo ?? null });
    }

    const lista = await db
      .select({
        id: cronicaSubgrupos.id,
        nome: cronicaSubgrupos.nome,
        ficha_ids: cronicaSubgrupos.fichaIds,
        desespero: cronicaSubgrupos.desespero,
        perigo: cronicaSubgrupos.perigo,
        updated_at: cronicaSubgrupos.updatedAt,
      })
      .from(cronicaSubgrupos)
      .orderBy(desc(cronicaSubgrupos.updatedAt));

    return NextResponse.json({ subgrupos: lista });
  } catch (erro) {
    console.error("Erro em GET /api/subgrupos:", erro);
    return NextResponse.json(
      { error: "Erro ao carregar subgrupos." },
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
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: "Apenas o mestre admin pode criar subgrupos." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = CriarSubgrupoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos." },
        { status: 400 }
      );
    }

    const db = getDb();
    const [criado] = await db
      .insert(cronicaSubgrupos)
      .values({
        nome: parsed.data.nome,
        desespero: parsed.data.desespero,
        perigo: parsed.data.perigo,
        fichaIds: parsed.data.ficha_ids,
      })
      .returning({
        id: cronicaSubgrupos.id,
        nome: cronicaSubgrupos.nome,
        ficha_ids: cronicaSubgrupos.fichaIds,
        desespero: cronicaSubgrupos.desespero,
        perigo: cronicaSubgrupos.perigo,
        updated_at: cronicaSubgrupos.updatedAt,
      });

    return NextResponse.json({ subgrupo: criado }, { status: 201 });
  } catch (erro) {
    console.error("Erro em POST /api/subgrupos:", erro);
    return NextResponse.json(
      { error: "Erro ao criar subgrupo." },
      { status: 500 }
    );
  }
}
