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
  or auth.jwt() ->> 'email' = 'netojoseluizferreira@gmail.com'
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
  or auth.jwt() ->> 'email' = 'netojoseluizferreira@gmail.com'
)
with check (
  user_id = auth.uid()
  or auth.jwt() ->> 'email' = 'netojoseluizferreira@gmail.com'
);

drop policy if exists "Usuários apagam suas fichas e admin apaga todas" on public.fichas;
create policy "Usuários apagam suas fichas e admin apaga todas"
on public.fichas
for delete
to authenticated
using (
  user_id = auth.uid()
  or auth.jwt() ->> 'email' = 'netojoseluizferreira@gmail.com'
);
