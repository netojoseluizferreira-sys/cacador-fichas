"use client";

import { useCallback, useEffect, useState } from "react";
import {
  KeyRound,
  Mail,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";

interface UsuarioAdminItem {
  id: string;
  email: string;
  isAdmin: boolean;
  created_at: string;
  updated_at: string;
  fichas: Array<{ id: string; nome: string }>;
}

interface EmailSemContaItem {
  email: string;
  fichas: Array<{ id: string; nome: string }>;
}

interface AbaAdminContasProps {
  onNotify: (msg: string, tipo?: "erro" | "info" | "sucesso") => void;
}

function formatarData(valor?: string): string {
  if (!valor) return "sem data";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "sem data";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function AbaAdminContas({ onNotify }: AbaAdminContasProps) {
  const [usuarios, setUsuarios] = useState<UsuarioAdminItem[]>([]);
  const [emailsSemConta, setEmailsSemConta] = useState<EmailSemContaItem[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [novoEmail, setNovoEmail] = useState("");
  const [novaSenhaCriacao, setNovaSenhaCriacao] = useState("");
  const [criando, setCriando] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [emailEdit, setEmailEdit] = useState("");
  const [senhaReset, setSenhaReset] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const carregarContas = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        onNotify(data.error || "Erro ao carregar contas.", "erro");
        return;
      }
      setUsuarios(data.usuarios ?? []);
      setEmailsSemConta(data.emailsSemConta ?? []);
    } catch {
      onNotify("Falha de conexão ao listar contas.", "erro");
    } finally {
      setCarregando(false);
    }
  }, [onNotify]);

  useEffect(() => {
    carregarContas();
  }, [carregarContas]);

  const handleCriarConta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoEmail.trim() || !novaSenhaCriacao) return;
    setCriando(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: novoEmail.trim(),
          password: novaSenhaCriacao,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify(data.error || "Erro ao criar conta.", "erro");
        return;
      }
      setNovoEmail("");
      setNovaSenhaCriacao("");
      onNotify("Conta criada e vinculada às fichas existentes!", "sucesso");
      await carregarContas();
    } finally {
      setCriando(false);
    }
  };

  const iniciarEdicao = (u: UsuarioAdminItem) => {
    if (editandoId === u.id) {
      setEditandoId(null);
      setSenhaReset("");
      return;
    }
    setEditandoId(u.id);
    setEmailEdit(u.email);
    setSenhaReset("");
  };

  const salvarAlteracaoUsuario = async (u: UsuarioAdminItem) => {
    const payload: { email?: string; novaSenha?: string } = {};
    if (emailEdit.trim().toLowerCase() !== u.email.trim().toLowerCase()) {
      payload.email = emailEdit.trim();
    }
    if (senhaReset.trim()) {
      payload.novaSenha = senhaReset.trim();
    }

    if (!payload.email && !payload.novaSenha) {
      onNotify("Altere o e-mail ou digite uma nova senha para salvar.", "info");
      return;
    }

    setSalvandoEdicao(true);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify(data.error || "Erro ao atualizar conta.", "erro");
        return;
      }
      setEditandoId(null);
      setSenhaReset("");
      onNotify(`Credenciais de ${payload.email || u.email} atualizadas.`, "sucesso");
      await carregarContas();
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const excluirConta = async (u: UsuarioAdminItem) => {
    if (
      !window.confirm(
        `Excluir a credencial de acesso de "${u.email}"? (As fichas vinculadas a este e-mail continuarão salvas no banco).`
      )
    ) {
      return;
    }

    const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      onNotify(data.error || "Erro ao excluir conta.", "erro");
      return;
    }
    onNotify(`Conta ${u.email} removida.`, "info");
    await carregarContas();
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#f08b21] transition";

  return (
    <div className="space-y-6">
      {/* Criar Nova Credencial */}
      <div className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-100 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#f08b21]" />
              Cadastrar Nova Conta
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Crie manualmente o acesso de um jogador (se houver fichas migradas
              com esse e-mail, o vínculo ocorre automaticamente).
            </p>
          </div>
          <button
            type="button"
            onClick={carregarContas}
            disabled={carregando}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs transition cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${carregando ? "animate-spin" : ""}`}
            />
            Atualizar
          </button>
        </div>

        <form
          onSubmit={handleCriarConta}
          className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              E-mail do Jogador
            </label>
            <input
              type="email"
              required
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              placeholder="jogador@exemplo.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Senha Inicial (mín. 6 caracteres)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={novaSenhaCriacao}
              onChange={(e) => setNovaSenhaCriacao(e.target.value)}
              placeholder="Defina uma senha inicial"
              className={inputCls}
            />
          </div>
          <button
            type="submit"
            disabled={criando}
            className="px-4 py-2 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider h-[38px] disabled:opacity-50 transition cursor-pointer"
          >
            {criando ? "Criando..." : "Criar conta"}
          </button>
        </form>
      </div>

      {/* Contas Ativas */}
      <div className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-4">
        <h3 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-100 flex items-center gap-2">
          <UsersRound className="w-5 h-5 text-[#f08b21]" />
          Pessoas com Credenciais no Site ({usuarios.length})
        </h3>

        {carregando ? (
          <p className="text-xs text-zinc-400 py-6 text-center">
            Carregando contas cadastradas...
          </p>
        ) : usuarios.length === 0 ? (
          <p className="text-xs text-zinc-500 italic">
            Nenhuma conta registrada ainda.
          </p>
        ) : (
          <div className="space-y-3">
            {usuarios.map((u) => {
              const aberto = editandoId === u.id;
              return (
                <div
                  key={u.id}
                  className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/90 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm text-zinc-100 truncate">
                          {u.email}
                        </strong>
                        {u.isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#f08b21]/20 text-[#f08b21] border border-[#f08b21]/40">
                            <ShieldCheck className="w-3 h-3" />
                            Admin / Mestre
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-zinc-900 text-zinc-400 border border-zinc-800">
                            <UserCheck className="w-3 h-3" />
                            Jogador
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-500 mt-1">
                        Criada em {formatarData(u.created_at)} ·{" "}
                        {u.fichas.length} ficha(s) vinculada(s)
                        {u.fichas.length > 0
                          ? `: ${u.fichas.map((f) => f.nome).join(", ")}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => iniciarEdicao(u)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-medium transition cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-[#f08b21]" />
                        {aberto ? "Cancelar" : "Editar / Senha"}
                      </button>

                      {!u.isAdmin && (
                        <button
                          type="button"
                          onClick={() => excluirConta(u)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/60 text-zinc-300 hover:text-red-300 border border-zinc-800 text-xs transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remover
                        </button>
                      )}
                    </div>
                  </div>

                  {aberto && (
                    <div className="pt-3 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                          <Mail className="w-3 h-3 inline mr-1" />
                          Alterar E-mail
                        </label>
                        <input
                          type="email"
                          value={emailEdit}
                          onChange={(e) => setEmailEdit(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                          <KeyRound className="w-3 h-3 inline mr-1" />
                          Redefinir Senha (opcional)
                        </label>
                        <input
                          type="password"
                          minLength={6}
                          value={senhaReset}
                          onChange={(e) => setSenhaReset(e.target.value)}
                          placeholder="Deixe vazio para manter a atual"
                          className={inputCls}
                        />
                      </div>
                      <button
                        type="button"
                        disabled={salvandoEdicao}
                        onClick={() => salvarAlteracaoUsuario(u)}
                        className="px-4 py-2 rounded-lg bg-[#f08b21] hover:bg-[#ff9c33] text-zinc-950 font-semibold text-xs uppercase tracking-wider h-[38px] disabled:opacity-50 transition cursor-pointer"
                      >
                        {salvandoEdicao ? "Salvando..." : "Salvar"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* E-mails de fichas migradas que ainda não criaram conta */}
      {emailsSemConta.length > 0 && (
        <div className="bg-[#141416] border border-zinc-800/90 rounded-xl p-5 sm:p-6 space-y-3">
          <h3 className="font-display text-lg font-bold uppercase tracking-wide text-amber-300">
            E-mails com Fichas Aguardando Cadastro ({emailsSemConta.length})
          </h3>
          <p className="text-xs text-zinc-400">
            Estes jogadores possuem fichas salvas no banco, mas ainda não
            criaram sua senha. Eles podem clicar em &quot;Criar conta&quot; na
            tela inicial ou você pode pré-criar acima.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {emailsSemConta.map((item) => (
              <div
                key={item.email}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800"
              >
                <div className="min-w-0">
                  <strong className="block text-xs text-zinc-200 truncate">
                    {item.email}
                  </strong>
                  <span className="block text-[11px] text-zinc-500 truncate">
                    Fichas: {item.fichas.map((f) => f.nome).join(", ")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNovoEmail(item.email);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-700/40 text-xs font-medium shrink-0 cursor-pointer"
                >
                  Preencher acima
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
