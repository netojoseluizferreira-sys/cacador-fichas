# Caçador: A Revanche (5ª Edição) — Fichas Online

Aplicação full-stack em **Next.js (App Router) + TypeScript + Tailwind CSS + Drizzle ORM + Neon (PostgreSQL)** para criação de fichas, controle de sessão e **Escudo do Mestre**.

## Checklist Manual de Configuração e Deploy

- [ ] **1. Criar banco no Neon**
  - Crie um projeto PostgreSQL no [Neon](https://neon.tech) e copie a *Connection String* (`postgresql://...?sslmode=require`).

- [ ] **2. Configurar variáveis de ambiente locais (`.env`)**
  - Copie `.env.example` para `.env` na raiz do projeto e preencha:
    ```env
    DATABASE_URL="postgresql://usuario:senha@ep-seu-banco.neon.tech/neondb?sslmode=require"
    AUTH_SECRET="gere-uma-chave-longa-aleatoria-com-pelo-menos-32-caracteres"
    ADMIN_EMAIL="netojoseluizferreira@gmail.com"
    ```

- [ ] **3. Criar as tabelas no Neon**
  ```bash
  npm run db:push
  ```

- [ ] **4. Migrar os dados do backup sem perdas**
  - Garanta que `backup-cacador.json` (ou `backup-banco.json`) esteja na raiz do projeto e execute:
  ```bash
  npm run db:migrate-backup
  ```
  *(Preserva todos os UUIDs originais, subgrupos, rolagens, Escudo do Mestre e vincula automaticamente as fichas por `owner_email` quando cada jogador criar sua conta).*

- [ ] **5. Fazer deploy na Vercel**
  - Importe este repositório na [Vercel](https://vercel.com).
  - Em **Settings → Environment Variables**, adicione `DATABASE_URL`, `AUTH_SECRET` e `ADMIN_EMAIL`.
  - Clique em **Deploy**.
