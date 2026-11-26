"use client";

import { useState } from "react";
import {
  Crosshair,
  FolderOpen,
  LogIn,
  LogOut,
  PlusCircle,
  Shield,
  Upload,
  UserPlus,
} from "lucide-react";
import type { UsuarioSessao } from "@/lib/auth";

interface MenuInicialProps {
  user: UsuarioSessao | null;
  carregandoAuth: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onCriarFicha: () => void;
  onAbrirMinhasFichas: () => void;
  onAbrirEscudo: () => void;
  onImportarJson: () => void;
}

export function MenuInicial({
  user,
  carregandoAuth,
  onLogin,
  onRegister,
  onLogout,
  onCriarFicha,
  onAbrirMinhasFichas,
  onAbrirEscudo,
  onImportarJson,
}: MenuInicialProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (modo: "login" | "register") => {
    if (!email.trim() || !password) return;
    setEnviando(true);
    try {
      if (modo === "login") {
        await onLogin(email, password);
      } else {
        await onRegister(email, password);
      }
      setPassword("");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="max-w-xl mx-auto px-4 py-12 sm:py-20">
      <div className="bg-[#141416] border border-zinc-800/90 rounded-xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#f08b21]/10 border border-[#f08b21]/30 flex items-center justify-center text-[#f08b21]">
            <Crosshair className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#f08b21]">
              Caçador: A Revanche · 5ª Edição
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-wide uppercase text-zinc-100">
              Central da Célula
            </h1>
          </div>
        </div>

        <p className="text-sm text-zinc-400 leading-relaxed mb-6">
          Crie, gerencie e sincronize fichas de caçadores online. Ao criar conta
          com o mesmo e-mail utilizado anteriormente, suas fichas da crônica são
          vinculadas automaticamente.
        </p>

        <div className="mb-6 p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
              Status da Sessão
            </span>
            <strong className="block text-sm text-zinc-200 truncate">
              {carregandoAuth
                ? "Verificando sessão..."
                : user
                  ? `Conectado como ${user.email}`
                  : "Desconectado — Entre ou crie sua conta"}
            </strong>
          </div>
          {user && (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          )}
        </div>

        {!user ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit("login");
            }}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="authEmail"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5"
              >
                E-mail
              </label>
              <input
                id="authEmail"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu-email@exemplo.com"
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#f08b21] focus:ring-1 focus:ring-[#f08b21]/40 transition"
              />
            </div>

            <div>
              <label
                htmlFor="authSenha"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5"
              >
                Senha
              </label>
              <input
                id="authSenha"
                type="password"
                required
                minLength={6}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#f08b21] focus:ring-1 focus:ring-[#f08b21]/40 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="submit"
                disabled={enviando || carregandoAuth}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-sm transition disabled:opacity-50 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                {enviando ? "Aguarde..." : "Entrar"}
              </button>

              <button
                type="button"
                disabled={enviando || carregandoAuth}
                onClick={() => handleSubmit("register")}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-100 font-medium text-sm border border-zinc-700 transition disabled:opacity-50 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Criar conta
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onCriarFicha}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-sm transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Criar nova ficha
            </button>

            <button
              type="button"
              onClick={onAbrirMinhasFichas}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-100 font-medium text-sm border border-zinc-700/80 transition cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              Minhas fichas
            </button>

            <button
              type="button"
              onClick={onImportarJson}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900/70 hover:bg-zinc-800 text-zinc-300 font-medium text-sm border border-zinc-800 transition cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Importar JSON
            </button>

            {user.isAdmin && (
              <button
                type="button"
                onClick={onAbrirEscudo}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[#f08b21] font-semibold text-sm border border-[#f08b21]/40 transition cursor-pointer"
              >
                <Shield className="w-4 h-4" />
                Escudo do Mestre
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
