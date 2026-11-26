import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import {
  criarTokenSessao,
  definirCookieSessao,
  usuarioEhAdminPorEmail,
  verificarLimiteTentativasAuth,
  verificarSenhaTimingSafe,
  vincularDadosPorEmail,
} from "@/lib/auth";

const LoginSchema = z.object({
  email: z.email("Informe um e-mail válido.").max(254),
  password: z.string().min(1, "Informe sua senha.").max(128),
});

export async function POST(request: Request) {
  try {
    if (!verificarLimiteTentativasAuth(request)) {
      return NextResponse.json(
        { error: "Muitas tentativas de login. Aguarde alguns minutos." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Credenciais inválidas." },
        { status: 400 }
      );
    }

    const emailNormalizado = parsed.data.email.trim().toLowerCase();
    const db = getDb();

    const [usuario] = await db
      .select()
      .from(users)
      .where(sql`lower(trim(${users.email})) = ${emailNormalizado}`)
      .limit(1);

    const senhaCorreta = await verificarSenhaTimingSafe(
      parsed.data.password,
      usuario?.passwordHash
    );

    if (!usuario || !senhaCorreta) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    await vincularDadosPorEmail(usuario.id, usuario.email);

    const token = await criarTokenSessao({
      id: usuario.id,
      email: usuario.email,
    });
    await definirCookieSessao(token);

    return NextResponse.json({
      user: {
        id: usuario.id,
        email: usuario.email,
        isAdmin: usuarioEhAdminPorEmail(usuario.email),
      },
    });
  } catch (erro) {
    console.error("Erro em POST /api/auth/login:", erro);
    return NextResponse.json(
      { error: "Erro interno ao realizar login." },
      { status: 500 }
    );
  }
}
