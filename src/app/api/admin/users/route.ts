import { desc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { fichas, users } from "@/db/schema";
import {
  gerarHashSenha,
  obterUsuarioSessao,
  usuarioEhAdminPorEmail,
  vincularDadosPorEmail,
} from "@/lib/auth";

const CriarUsuarioAdminSchema = z.object({
  email: z.email("Informe um e-mail válido.").max(254),
  password: z
    .string()
    .min(6, "A senha precisa ter pelo menos 6 caracteres.")
    .max(128),
});

export async function GET() {
  try {
    const sessao = await obterUsuarioSessao();
    if (!sessao) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (!sessao.isAdmin) {
      return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
    }

    const db = getDb();
    const [listaUsuarios, listaFichas] = await Promise.all([
      db
        .select({
          id: users.id,
          email: users.email,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt)),
      db
        .select({
          id: fichas.id,
          nome: fichas.nome,
          ownerEmail: fichas.ownerEmail,
        })
        .from(fichas),
    ]);

    const fichasPorEmail = new Map<
      string,
      Array<{ id: string; nome: string }>
    >();
    for (const f of listaFichas) {
      const chave = f.ownerEmail.trim().toLowerCase();
      const atual = fichasPorEmail.get(chave) ?? [];
      atual.push({ id: f.id, nome: f.nome });
      fichasPorEmail.set(chave, atual);
    }

    const emailsCadastrados = new Set(
      listaUsuarios.map((u) => u.email.trim().toLowerCase())
    );

    const usuariosFormatados = listaUsuarios.map((u) => {
      const chave = u.email.trim().toLowerCase();
      const fichasDoUsuario = fichasPorEmail.get(chave) ?? [];
      return {
        id: u.id,
        email: u.email,
        isAdmin: usuarioEhAdminPorEmail(u.email),
        created_at: u.createdAt,
        updated_at: u.updatedAt,
        fichas: fichasDoUsuario,
      };
    });

    const emailsPendentes = [...fichasPorEmail.entries()]
      .filter(([email]) => !emailsCadastrados.has(email))
      .map(([email, fichasVinculadas]) => ({
        email,
        fichas: fichasVinculadas,
      }));

    return NextResponse.json({
      usuarios: usuariosFormatados,
      emailsSemConta: emailsPendentes,
    });
  } catch (erro) {
    console.error("Erro em GET /api/admin/users:", erro);
    return NextResponse.json(
      { error: "Erro ao listar contas cadastradas." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sessao = await obterUsuarioSessao();
    if (!sessao) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (!sessao.isAdmin) {
      return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = CriarUsuarioAdminSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos." },
        { status: 400 }
      );
    }

    const emailLower = parsed.data.email.trim().toLowerCase();
    const db = getDb();

    const existente = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(trim(${users.email})) = ${emailLower}`)
      .limit(1);

    if (existente.length > 0) {
      return NextResponse.json(
        { error: "Já existe uma conta cadastrada com este e-mail." },
        { status: 409 }
      );
    }

    const passwordHash = await gerarHashSenha(parsed.data.password);
    const [criado] = await db
      .insert(users)
      .values({
        email: emailLower,
        passwordHash,
      })
      .returning({
        id: users.id,
        email: users.email,
        createdAt: users.createdAt,
      });

    await vincularDadosPorEmail(criado.id, criado.email);

    return NextResponse.json({ usuario: criado }, { status: 201 });
  } catch (erro) {
    console.error("Erro em POST /api/admin/users:", erro);
    return NextResponse.json(
      { error: "Erro ao criar conta pelo painel Admin." },
      { status: 500 }
    );
  }
}
