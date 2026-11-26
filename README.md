# Caçador: A Revanche (5ª Edição) — Fichas & Escudo da Crônica

Plataforma web full-stack para criação e gerenciamento de fichas de personagens, rolagens compartilhadas e **Escudo do Mestre** para mesas de **Caçador: A Revanche (5ª Edição)** (*World of Darkness*).

---

## Funcionalidades

### Criação e Regras Oficiais (5ª Edição)
- **Validação automática de criação:**
  - **Atributos:** distribuição oficial (`1×4`, `3×3`, `4×2`, `1×1`).
  - **Habilidades:** suporte aos três perfis oficiais (*Pau para toda obra*, *Equilibrado* e *Especialista*) + controle de Especializações gratuitas e obrigatórias.
  - **Vantagens e Defeitos:** catálogo oficial integrado (`7` pontos de Vantagens e `2` pontos de Defeitos iniciais).
  - **Trunfos e Distinções:** validação dos caminhos de criação (`2 Trunfos` ou `1 Trunfo + 2 Distinções` vinculadas).
- **Trava mecânica pós-finalização:** ao finalizar a ficha, atributos e vantagens iniciais são bloqueados para edição direta, liberando evolução exclusivamente por **XP** (mantendo anotações, equipamentos e mapa de relacionamentos livres).

### Jogo em Sessão
- **Controle de Danos e Recuperação:** trilhas interativas de **Vitalidade** (`Vigor + 3`) e **Força de Vontade** (`Autocontrole + Determinação`) com dano superficial (`/`), agravado (`X`), conversão por Medicina e recuperação automática de começo de sessão.
- **Sistema de Experiência (XP):** registro de ganhos de sessão e compra automática de avanços pelos custos oficiais do livro, com histórico detalhado.
- **Rolador de Dados e Ímpeto:** paradas de `Atributo + Habilidade`, `Atributo + Atributo`, `Vitalidade` e `Força de Vontade`, cálculo de críticos em pares de `10`, rolagem com **Dados de Desespero** e fluxo interativo para resultado `1` em Desespero (**Aflição** ou incremento atômico de **Perigo** no subgrupo da crônica).
- **Exportação e Importação:** download da ficha formatada em `.txt` ou `.json`, além de importação de arquivos `.json`.

### Escudo do Mestre
- Seleção das fichas ativas da crônica e **edição destravada** de qualquer ficha de jogador.
- Gestão de **Subgrupos** com medidores de **Desespero** e **Perigo** sincronizados com as fichas dos membros.
- Rolador dedicado do Narrador com visibilidade **Pública** ou **Privada**.
- Feed em tempo real sob demanda com histórico de rolagens dos jogadores e limpeza unificada.
- Bloco de anotações privadas da sessão e **Rastreador de Iniciativa** com controle de turnos.

---

## Stack Tecnológica

- **Frontend & Backend:** [Next.js 15 (App Router)](https://nextjs.org/) + [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Estilização & Ícones:** [Tailwind CSS v4](https://tailwindcss.com/) + [Lucide React](https://lucide.dev/)
- **Banco de Dados & ORM:** [Neon (Serverless PostgreSQL)](https://neon.tech/) + [Drizzle ORM](https://orm.drizzle.team/)
- **Validação:** [Zod](https://zod.dev/)
- **Autenticação:** E-mail/senha com hash `bcryptjs` e sessão JWT (`jose`) via cookie `HttpOnly`

---

## Estrutura do Projeto

```text
├── data/
│   └── catalogo.json          # Catálogo oficial de Vantagens, Defeitos, Trunfos e Distinções
├── scripts/
│   └── migrar-backup.ts       # Script transacional de importação de backup JSON
├── src/
│   ├── app/
│   │   ├── api/               # Rotas de backend (auth, fichas, escudo, subgrupos, rolagens)
│   │   ├── globals.css        # Tema dark World of Darkness (Tailwind v4)
│   │   ├── layout.tsx         # Fontes (Barlow Condensed & Inter) e metadados
│   │   └── page.tsx           # Entrada principal da aplicação
│   ├── components/
│   │   ├── abas/              # Abas modulares da ficha (Identidade, Atributos, Danos, Rolagem, XP...)
│   │   ├── CacadorApp.tsx     # Orquestrador de estado, navegação e sincronização online
│   │   ├── CaracteristicaRow.tsx
│   │   ├── EscudoMestre.tsx   # Painel exclusivo do Narrador
│   │   ├── MenuInicial.tsx
│   │   └── ModalMinhasFichas.tsx
│   ├── db/
│   │   ├── index.ts           # Pool de conexão serverless com o Neon
│   │   └── schema.ts          # Tabelas e índices no PostgreSQL (Drizzle)
│   ├── lib/
│   │   ├── auth.ts            # Sessão JWT, cookies HttpOnly, bcrypt e controle de Admin
│   │   └── regras/            # Regras de negócio puras desacopladas de UI
│   └── types/
│       └── ficha.ts           # Tipagens de domínio da ficha e do Escudo
└── drizzle.config.ts
```

---

## Como Executar Localmente

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
Copie o arquivo `.env.example` para `.env` e preencha os valores:
```env
DATABASE_URL="postgresql://usuario:senha@ep-exemplo.neon.tech/neondb?sslmode=require"
AUTH_SECRET="sua-chave-secreta-aleatoria-com-no-minimo-32-caracteres"
ADMIN_EMAIL="email-do-narrador@exemplo.com"
```

### 3. Sincronizar tabelas no PostgreSQL
```bash
npm run db:push
```

### 4. Iniciar servidor de desenvolvimento
```bash
npm run dev
```
Acesse `http://localhost:3000`.

---

## Scripts Disponíveis

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o ambiente de desenvolvimento em `http://localhost:3000` |
| `npm run build` | Gera o build otimizado de produção e valida tipos/lint |
| `npm run start` | Executa o servidor de produção após o build |
| `npm run lint` | Roda a verificação estática do ESLint |
| `npm run db:push` | Aplica o schema do Drizzle diretamente no banco Neon |
| `npm run db:studio` | Abre a interface visual do Drizzle Studio para inspecionar o banco |
| `npm run db:migrate-backup` | Importa um backup JSON para o Neon em transação única |

---

## Deploy na Vercel

1. Conecte o repositório GitHub a um novo projeto na [Vercel](https://vercel.com/).
2. Em **Settings → Environment Variables**, configure `DATABASE_URL`, `AUTH_SECRET` e `ADMIN_EMAIL`.
3. Execute o **Deploy**.
