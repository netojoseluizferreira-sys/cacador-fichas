import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import {
  criarTokenSessao,
  definirCookieSessao,
  gerarHashSenha,
  usuarioEhAdminPorEmail,
  verificarLimiteTentativasAuth,
  vincularDadosPorEmail,
} from "@/lib/auth";

const RegistroSchema = z.object({
  email: z.email("Informe um e-mail válido.").max(254),
  password: z
    .string()
    .min(6, "A senha precisa ter pelo menos 6 caracteres.")
    .max(128, "A senha é longa demais."),
});

export async function POST(request: Request) {
  try {
    if (!verificarLimiteTentativasAuth(request)) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde alguns minutos." },
        { status: 429 }
      );
    }
    const body = await request.json();
    const parsed = RegistroSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos." },
        { status: 400 }
      );
    }

    const emailNormalizado = parsed.data.email.trim().toLowerCase();
    const db = getDb();

    const existente = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(trim(${users.email})) = ${emailNormalizado}`)
      .limit(1);

    if (existente.length > 0) {
      return NextResponse.json(
        { error: "Já existe uma conta cadastrada com este e-mail." },
        { status: 409 }
      );
    }

    const passwordHash = await gerarHashSenha(parsed.data.password);
    const [novoUsuario] = await db
      .insert(users)
      .values({
        email: emailNormalizado,
        passwordHash,
      })
      .returning({ id: users.id, email: users.email });

    await vincularDadosPorEmail(novoUsuario.id, novoUsuario.email);

    const token = await criarTokenSessao({
      id: novoUsuario.id,
      email: novoUsuario.email,
    });
    await definirCookieSessao(token);

    return NextResponse.json({
      user: {
        id: novoUsuario.id,
        email: novoUsuario.email,
        isAdmin: usuarioEhAdminPorEmail(novoUsuario.email),
      },
    });
  } catch (erro) {
    console.error("Erro em POST /api/auth/register:", erro);
    return NextResponse.json(
      { error: "Erro interno ao criar conta." },
      { status: 500 }
    );
  }
}
