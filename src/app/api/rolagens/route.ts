import { desc, eq, inArray, sql } from "drizzle-orm";
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
import { criarResultadoRolagemMestre } from "@/lib/regras";
import type { RegistroRolagemFicha } from "@/types/ficha";

const RolagemMestreSchema = z.object({
  origem: z.literal("mestre"),
  descricao: z.string().default("Rolagem do mestre"),
  dados: z.number().int().min(1).max(100),
  bonus: z.number().int().min(-50).max(50).default(0),
  visibilidade: z.enum(["publica", "privada"]).default("publica"),
});

const RolagemJogadorSchema = z.object({
  origem: z.literal("jogador"),
  fichaId: z.uuid(),
  rolagemId: z.string().min(1),
  subgrupoId: z.string().optional().nullable(),
  subgrupoNome: z.string().default(""),
  personagem: z.string().default("Ficha sem nome"),
  jogador: z.string().default(""),
  descricao: z.string().default("Rolagem"),
  resultado: z.record(z.string(), z.any()),
});

const CriarRolagemBodySchema = z.discriminatedUnion("origem", [
  RolagemMestreSchema,
  RolagemJogadorSchema,
]);

export async function GET(request: Request) {
  try {
    const user = await obterUsuarioSessao();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subgrupoId = searchParams.get("subgrupoId");
    const db = getDb();

    const publicasMestre = await db
      .select()
      .from(rolagensPublicas)
      .orderBy(desc(rolagensPublicas.createdAt))
      .limit(30);

    const publicasJogadores =
      subgrupoId && z.uuid().safeParse(subgrupoId).success
        ? await db
            .select()
            .from(rolagensJogadoresPublicas)
            .where(eq(rolagensJogadoresPublicas.subgrupoId, subgrupoId))
            .orderBy(desc(rolagensJogadoresPublicas.createdAt))
            .limit(60)
        : [];

    return NextResponse.json({
      publicasMestre,
      publicasJogadores,
    });
  } catch (erro) {
    console.error("Erro em GET /api/rolagens:", erro);
    return NextResponse.json(
      { error: "Erro ao carregar histórico de rolagens." },
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
    const parsed = CriarRolagemBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados de rolagem inválidos." },
        { status: 400 }
      );
    }

    const db = getDb();

    if (parsed.data.origem === "mestre") {
      if (!user.isAdmin) {
        return NextResponse.json(
          { error: "Apenas o mestre admin pode usar esta rolagem." },
          { status: 403 }
        );
      }

      const resultado = criarResultadoRolagemMestre(
        parsed.data.dados,
        parsed.data.bonus
      );
      const descricao = parsed.data.descricao.trim() || "Rolagem do mestre";
      const mestreEmail = obterEmailAdmin();

      if (parsed.data.visibilidade === "privada") {
        const [inserida] = await db
          .insert(rolagensPrivadas)
          .values({
            mestreEmail,
            descricao,
            resultado,
          })
          .returning();
        return NextResponse.json({ rolagem: inserida }, { status: 201 });
      } else {
        const [inserida] = await db
          .insert(rolagensPublicas)
          .values({
            mestreEmail,
            descricao,
            resultado,
          })
          .returning();
        return NextResponse.json({ rolagem: inserida }, { status: 201 });
      }
    }

    // Rolagem de jogador
    const {
      fichaId,
      rolagemId,
      subgrupoId,
      subgrupoNome,
      personagem,
      jogador,
      descricao,
      resultado,
    } = parsed.data;

    const [ficha] = await db
      .select({
        id: fichas.id,
        userId: fichas.userId,
        ownerEmail: fichas.ownerEmail,
      })
      .from(fichas)
      .where(eq(fichas.id, fichaId))
      .limit(1);

    if (!ficha) {
      return NextResponse.json(
        { error: "Ficha não encontrada." },
        { status: 404 }
      );
    }

    const ehDono =
      user.isAdmin ||
      ficha.userId === user.id ||
      ficha.ownerEmail.trim().toLowerCase() === user.email.trim().toLowerCase();

    if (!ehDono) {
      return NextResponse.json(
        { error: "Sem permissão para publicar rolagem nesta ficha." },
        { status: 403 }
      );
    }

    const subgrupoUuid =
      subgrupoId && z.uuid().safeParse(subgrupoId).success ? subgrupoId : null;

    const [salva] = await db
      .insert(rolagensJogadoresPublicas)
      .values({
        userId: user.id,
        ownerEmail: ficha.ownerEmail,
        fichaId,
        rolagemId,
        subgrupoId: subgrupoUuid,
        subgrupoNome: subgrupoNome || "",
        personagem: personagem || "Ficha sem nome",
        jogador: jogador || "",
        descricao: descricao || "Rolagem",
        resultado: resultado as unknown as RegistroRolagemFicha,
      })
      .onConflictDoUpdate({
        target: [
          rolagensJogadoresPublicas.fichaId,
          rolagensJogadoresPublicas.rolagemId,
        ],
        set: {
          subgrupoId: subgrupoUuid,
          subgrupoNome: subgrupoNome || "",
          personagem: personagem || "Ficha sem nome",
          jogador: jogador || "",
          descricao: descricao || "Rolagem",
          resultado: resultado as unknown as RegistroRolagemFicha,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({ rolagem: salva });
  } catch (erro) {
    console.error("Erro em POST /api/rolagens:", erro);
    return NextResponse.json(
      { error: "Erro ao registrar rolagem." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const user = await obterUsuarioSessao();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: "Apenas o mestre admin pode limpar o histórico de rolagens." },
        { status: 403 }
      );
    }

    const db = getDb();
    await db.transaction(async (tx) => {
      await tx.delete(rolagensPublicas);
      await tx.delete(rolagensPrivadas);
      await tx.delete(rolagensJogadoresPublicas);

      const [escudo] = await tx
        .select({ fichaIds: escudoMestre.fichaIds })
        .from(escudoMestre)
        .where(eq(escudoMestre.id, 1))
        .limit(1);

      const idsCronica = escudo?.fichaIds ?? [];
      if (idsCronica.length > 0) {
        await tx
          .update(fichas)
          .set({
            dados: sql`jsonb_set(${fichas.dados}, '{rolagens}', '[]'::jsonb, true)`,
            updatedAt: new Date(),
          })
          .where(inArray(fichas.id, idsCronica));
      }
    });

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("Erro em DELETE /api/rolagens:", erro);
    return NextResponse.json(
      { error: "Erro ao limpar histórico de rolagens." },
      { status: 500 }
    );
  }
}
