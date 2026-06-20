create table if not exists public.fichas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  owner_email text not null,
  nome text not null default 'Ficha sem nome',
  sistema text not null default 'Caçador: A Revanche 5ª Edição',
  dados jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fichas_user_id_idx on public.fichas(user_id);
create index if not exists fichas_owner_email_idx on public.fichas(owner_email);
create index if not exists fichas_updated_at_idx on public.fichas(updated_at desc);

alter table public.fichas enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists fichas_set_updated_at on public.fichas;
create trigger fichas_set_updated_at
before update on public.fichas
for each row execute function public.set_updated_at();

drop policy if exists "Usuários veem suas fichas e admin vê todas" on public.fichas;
create policy "Usuários veem suas fichas e admin vê todas"
on public.fichas
for select
to authenticated
using (
  user_id = auth.uid()
  or auth.jwt() ->> 'email' in ('netojoseluizferreira@gmail.com', 'netojoseluizferrreira@gmail.com')
);

drop policy if exists "Usuários criam suas fichas" on public.fichas;
create policy "Usuários criam suas fichas"
on public.fichas
for insert
to authenticated
with check (
  user_id = auth.uid()
  and owner_email = auth.jwt() ->> 'email'
);

drop policy if exists "Usuários editam suas fichas e admin edita todas" on public.fichas;
create policy "Usuários editam suas fichas e admin edita todas"
on public.fichas
for update
to authenticated
using (
  user_id = auth.uid()
  or auth.jwt() ->> 'email' in ('netojoseluizferreira@gmail.com', 'netojoseluizferrreira@gmail.com')
)
with check (
  user_id = auth.uid()
  or auth.jwt() ->> 'email' in ('netojoseluizferreira@gmail.com', 'netojoseluizferrreira@gmail.com')
);

drop policy if exists "Usuários apagam suas fichas e admin apaga todas" on public.fichas;
create policy "Usuários apagam suas fichas e admin apaga todas"
on public.fichas
for delete
to authenticated
using (
  user_id = auth.uid()
  or auth.jwt() ->> 'email' in ('netojoseluizferreira@gmail.com', 'netojoseluizferrreira@gmail.com')
);

create table if not exists public.escudo_mestre (
  id integer primary key default 1 check (id = 1),
  mestre_email text not null default 'netojoseluizferreira@gmail.com',
  ficha_ids uuid[] not null default '{}',
  notas text not null default '',
  iniciativa jsonb not null default '[]'::jsonb,
  turno integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.escudo_mestre enable row level security;

drop trigger if exists escudo_mestre_set_updated_at on public.escudo_mestre;
create trigger escudo_mestre_set_updated_at
before update on public.escudo_mestre
for each row execute function public.set_updated_at();

drop policy if exists "Apenas admin gerencia escudo" on public.escudo_mestre;
create policy "Apenas admin gerencia escudo"
on public.escudo_mestre
for all
to authenticated
using (auth.jwt() ->> 'email' in ('netojoseluizferreira@gmail.com', 'netojoseluizferrreira@gmail.com'))
with check (auth.jwt() ->> 'email' in ('netojoseluizferreira@gmail.com', 'netojoseluizferrreira@gmail.com'));

create table if not exists public.rolagens_publicas (
  id uuid primary key default gen_random_uuid(),
  mestre_email text not null default 'netojoseluizferreira@gmail.com',
  descricao text not null default 'Rolagem publica',
  resultado jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists rolagens_publicas_created_at_idx on public.rolagens_publicas(created_at desc);
alter table public.rolagens_publicas enable row level security;

drop policy if exists "Todos autenticados leem rolagens publicas" on public.rolagens_publicas;
create policy "Todos autenticados leem rolagens publicas"
on public.rolagens_publicas
for select
to authenticated
using (true);

drop policy if exists "Apenas admin cria rolagens publicas" on public.rolagens_publicas;
create policy "Apenas admin cria rolagens publicas"
on public.rolagens_publicas
for insert
to authenticated
with check (auth.jwt() ->> 'email' in ('netojoseluizferreira@gmail.com', 'netojoseluizferrreira@gmail.com'));

drop policy if exists "Apenas admin apaga rolagens publicas" on public.rolagens_publicas;
create policy "Apenas admin apaga rolagens publicas"
on public.rolagens_publicas
for delete
to authenticated
using (auth.jwt() ->> 'email' in ('netojoseluizferreira@gmail.com', 'netojoseluizferrreira@gmail.com'));

create table if not exists public.rolagens_privadas (
  id uuid primary key default gen_random_uuid(),
  mestre_email text not null default 'netojoseluizferreira@gmail.com',
  descricao text not null default 'Rolagem privada',
  resultado jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists rolagens_privadas_created_at_idx on public.rolagens_privadas(created_at desc);
alter table public.rolagens_privadas enable row level security;

drop policy if exists "Apenas admin le rolagens privadas" on public.rolagens_privadas;
create policy "Apenas admin le rolagens privadas"
on public.rolagens_privadas
for select
to authenticated
using (auth.jwt() ->> 'email' in ('netojoseluizferreira@gmail.com', 'netojoseluizferrreira@gmail.com'));

drop policy if exists "Apenas admin cria rolagens privadas" on public.rolagens_privadas;
create policy "Apenas admin cria rolagens privadas"
on public.rolagens_privadas
for insert
to authenticated
with check (auth.jwt() ->> 'email' in ('netojoseluizferreira@gmail.com', 'netojoseluizferrreira@gmail.com'));

drop policy if exists "Apenas admin apaga rolagens privadas" on public.rolagens_privadas;
create policy "Apenas admin apaga rolagens privadas"
on public.rolagens_privadas
for delete
to authenticated
using (auth.jwt() ->> 'email' in ('netojoseluizferreira@gmail.com', 'netojoseluizferrreira@gmail.com'));
