import bcrypt from "bcryptjs";
import { isNull, sql, and } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { fichas, rolagensJogadoresPublicas } from "@/db/schema";

export const SESSION_COOKIE_NAME = "cacador_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 dias
const ADMIN_EMAIL_PADRAO = "netojoseluizferreira@gmail.com";
const ADMIN_EMAILS_LEGADOS = ["netojoseluizferrreira@gmail.com"];

export interface UsuarioSessao {
  id: string;
  email: string;
  isAdmin: boolean;
}

function obterSegredoJwt(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.trim().length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET não está configurada ou é curta demais (mínimo de 16 caracteres)."
      );
    }
    return new TextEncoder().encode(
      "dev-secret-cacador-a-revanche-5e-local-only-key"
    );
  }
  return new TextEncoder().encode(secret);
}

export function obterEmailAdmin(): string {
  return (process.env.ADMIN_EMAIL || ADMIN_EMAIL_PADRAO).trim().toLowerCase();
}

export function usuarioEhAdminPorEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalizado = email.trim().toLowerCase();
  const adminsConfigurados = (process.env.ADMIN_EMAIL || ADMIN_EMAIL_PADRAO)
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return (
    adminsConfigurados.includes(normalizado) ||
    ADMIN_EMAILS_LEGADOS.includes(normalizado)
  );
}

const DUMMY_PASSWORD_HASH =
  "$2b$10$CwTycUXWue0Thq9StjUM0uJ8h0R6V7W8p8g1bQ6yM6o9W8xZ5Y2K.";

const tentativasAuthPorIp = new Map<
  string,
  { count: number; resetAt: number }
>();

export function verificarLimiteTentativasAuth(
  request: Request,
  limite = 15,
  janelaMs = 5 * 60 * 1000
): boolean {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";
  const agora = Date.now();
  const registro = tentativasAuthPorIp.get(ip);

  if (!registro || agora > registro.resetAt) {
    tentativasAuthPorIp.set(ip, { count: 1, resetAt: agora + janelaMs });
    return true;
  }

  if (registro.count >= limite) {
    return false;
  }

  registro.count += 1;
  return true;
}

export async function verificarSenhaTimingSafe(
  senha: string,
  hash?: string | null
): Promise<boolean> {
  const alvo = hash || DUMMY_PASSWORD_HASH;
  const ok = await bcrypt.compare(senha, alvo);
  return Boolean(hash && ok);
}

export async function gerarHashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, 10);
}

export async function verificarSenha(
  senha: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

export async function criarTokenSessao(payload: {
  id: string;
  email: string;
}): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(obterSegredoJwt());
}

export async function verificarTokenSessao(
  token: string
): Promise<UsuarioSessao | null> {
  try {
    const { payload } = await jwtVerify(token, obterSegredoJwt());
    const id = payload.sub;
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!id || !email) {
      return null;
    }
    return {
      id,
      email,
      isAdmin: usuarioEhAdminPorEmail(email),
    };
  } catch {
    return null;
  }
}

export async function obterUsuarioSessao(): Promise<UsuarioSessao | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return verificarTokenSessao(token);
}

export async function definirCookieSessao(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function limparCookieSessao(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Vincula fichas e rolagens migradas do backup ao novo ID de usuário
 * comparando `owner_email` de forma case-insensitive.
 */
export async function vincularDadosPorEmail(
  userId: string,
  email: string
): Promise<void> {
  const db = getDb();
  const emailLower = email.trim().toLowerCase();

  await db
    .update(fichas)
    .set({ userId })
    .where(
      and(
        isNull(fichas.userId),
        sql`lower(trim(${fichas.ownerEmail})) = ${emailLower}`
      )
    );

  await db
    .update(rolagensJogadoresPublicas)
    .set({ userId })
    .where(
      and(
        isNull(rolagensJogadoresPublicas.userId),
        sql`lower(trim(${rolagensJogadoresPublicas.ownerEmail})) = ${emailLower}`
      )
    );
}
