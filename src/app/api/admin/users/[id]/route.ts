import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { fichas, rolagensJogadoresPublicas, users } from "@/db/schema";
import { gerarHashSenha, obterUsuarioSessao } from "@/lib/auth";

const UuidSchema = z.uuid();
const AtualizarUsuarioSchema = z.object({
  email: z.email("E-mail inválido.").max(254).optional(),
  novaSenha: z
    .string()
    .min(6, "A nova senha precisa ter pelo menos 6 caracteres.")
    .max(128)
    .optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessao = await obterUsuarioSessao();
    if (!sessao) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (!sessao.isAdmin) {
      return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
    }

    const { id } = await context.params;
    if (!UuidSchema.safeParse(id).success) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const body = await request.json();
    const parsed = AtualizarUsuarioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos." },
        { status: 400 }
      );
    }

    const { email, novaSenha } = parsed.data;
    if (!email && !novaSenha) {
      return NextResponse.json(
        { error: "Informe um novo e-mail ou uma nova senha." },
        { status: 400 }
      );
    }

    const db = getDb();
    const [alvo] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!alvo) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const novoEmailLower = email ? email.trim().toLowerCase() : null;
    if (novoEmailLower && novoEmailLower !== alvo.email.trim().toLowerCase()) {
      const conflito = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(trim(${users.email})) = ${novoEmailLower}`)
        .limit(1);

      if (conflito.length > 0) {
        return NextResponse.json(
          { error: "Já existe outra conta usando este e-mail." },
          { status: 409 }
        );
      }
    }

    const passwordHash = novaSenha ? await gerarHashSenha(novaSenha) : null;

    await db.transaction(async (tx) => {
      const camposUpdate: Partial<typeof users.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (novoEmailLower) camposUpdate.email = novoEmailLower;
      if (passwordHash) camposUpdate.passwordHash = passwordHash;

      await tx.update(users).set(camposUpdate).where(eq(users.id, id));

      if (
        novoEmailLower &&
        novoEmailLower !== alvo.email.trim().toLowerCase()
      ) {
        const emailAntigoLower = alvo.email.trim().toLowerCase();
        await tx
          .update(fichas)
          .set({ ownerEmail: novoEmailLower, userId: id })
          .where(
            sql`${fichas.userId} = ${id} OR lower(trim(${fichas.ownerEmail})) = ${emailAntigoLower}`
          );

        await tx
          .update(rolagensJogadoresPublicas)
          .set({ ownerEmail: novoEmailLower, userId: id })
          .where(
            sql`${rolagensJogadoresPublicas.userId} = ${id} OR lower(trim(${rolagensJogadoresPublicas.ownerEmail})) = ${emailAntigoLower}`
          );
      }
    });

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("Erro em PATCH /api/admin/users/[id]:", erro);
    return NextResponse.json(
      { error: "Erro ao atualizar credenciais do usuário." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessao = await obterUsuarioSessao();
    if (!sessao) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (!sessao.isAdmin) {
      return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
    }

    const { id } = await context.params;
    if (!UuidSchema.safeParse(id).success) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    if (id === sessao.id) {
      return NextResponse.json(
        { error: "Você não pode excluir a própria conta administradora ativa." },
        { status: 400 }
      );
    }

    const db = getDb();
    await db.delete(users).where(eq(users.id, id));

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("Erro em DELETE /api/admin/users/[id]:", erro);
    return NextResponse.json(
      { error: "Erro ao excluir conta de usuário." },
      { status: 500 }
    );
  }
}
