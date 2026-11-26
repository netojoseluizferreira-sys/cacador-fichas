import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import {
  cronicaSubgrupos,
  escudoMestre,
  fichas,
  rolagensJogadoresPublicas,
  rolagensPrivadas,
  rolagensPublicas,
} from "@/db/schema";
import { obterEmailAdmin, obterUsuarioSessao } from "@/lib/auth";

const ItemIniciativaSchema = z.object({
  id: z.string(),
  nome: z.string(),
  detalhe: z.string().optional(),
  fichaId: z.string().optional(),
  tipo: z.string().optional(),
  valor: z.number(),
});

const SalvarEscudoSchema = z.object({
  ficha_ids: z.array(z.uuid()).default([]),
  notas: z.string().default(""),
  iniciativa: z.array(ItemIniciativaSchema).default([]),
  turno: z.number().int().min(0).default(0),
});

export async function GET() {
  try {
    const user = await obterUsuarioSessao();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: "Apenas a conta administradora pode acessar o Escudo do Mestre." },
        { status: 403 }
      );
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
          fichaIds: [],
          notas: "",
          iniciativa: [],
          turno: 0,
        })
        .returning();
    }

    const [
      todasFichas,
      subgrupos,
      publicasMestre,
      privadasMestre,
      rolagensJogadores,
    ] = await Promise.all([
      db
        .select({
          id: fichas.id,
          nome: fichas.nome,
          owner_email: fichas.ownerEmail,
          updated_at: fichas.updatedAt,
          created_at: fichas.createdAt,
          dados: fichas.dados,
        })
        .from(fichas)
        .orderBy(desc(fichas.updatedAt)),
      db
        .select({
          id: cronicaSubgrupos.id,
          nome: cronicaSubgrupos.nome,
          ficha_ids: cronicaSubgrupos.fichaIds,
          desespero: cronicaSubgrupos.desespero,
          perigo: cronicaSubgrupos.perigo,
          updated_at: cronicaSubgrupos.updatedAt,
        })
        .from(cronicaSubgrupos)
        .orderBy(desc(cronicaSubgrupos.updatedAt)),
      db
        .select()
        .from(rolagensPublicas)
        .orderBy(desc(rolagensPublicas.createdAt))
        .limit(15),
      db
        .select()
        .from(rolagensPrivadas)
        .orderBy(desc(rolagensPrivadas.createdAt))
        .limit(15),
      db
        .select()
        .from(rolagensJogadoresPublicas)
        .orderBy(desc(rolagensJogadoresPublicas.createdAt))
        .limit(120),
    ]);

    return NextResponse.json({
      escudo: {
        ficha_ids: escudo.fichaIds ?? [],
        notas: escudo.notas ?? "",
        iniciativa: escudo.iniciativa ?? [],
        turno: escudo.turno ?? 0,
      },
      fichas: todasFichas,
      subgrupos,
      rolagensMestre: {
        publicas: publicasMestre,
        privadas: privadasMestre,
      },
      rolagensJogadores,
    });
  } catch (erro) {
    console.error("Erro em GET /api/escudo:", erro);
    return NextResponse.json(
      { error: "Erro ao carregar Escudo do Mestre." },
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
        { error: "Apenas o mestre admin pode salvar o escudo." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = SalvarEscudoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados do escudo inválidos." },
        { status: 400 }
      );
    }

    const db = getDb();
    const [atualizado] = await db
      .insert(escudoMestre)
      .values({
        id: 1,
        mestreEmail: obterEmailAdmin(),
        fichaIds: parsed.data.ficha_ids,
        notas: parsed.data.notas,
        iniciativa: parsed.data.iniciativa,
        turno: parsed.data.turno,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: escudoMestre.id,
        set: {
          mestreEmail: obterEmailAdmin(),
          fichaIds: parsed.data.ficha_ids,
          notas: parsed.data.notas,
          iniciativa: parsed.data.iniciativa,
          turno: parsed.data.turno,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({
      escudo: {
        ficha_ids: atualizado.fichaIds ?? [],
        notas: atualizado.notas ?? "",
        iniciativa: atualizado.iniciativa ?? [],
        turno: atualizado.turno ?? 0,
      },
    });
  } catch (erro) {
    console.error("Erro em PUT /api/escudo:", erro);
    return NextResponse.json(
      { error: "Erro ao salvar Escudo do Mestre." },
      { status: 500 }
    );
  }
}
