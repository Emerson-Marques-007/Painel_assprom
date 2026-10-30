-- Rode no Supabase: SQL Editor > New query > Run
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('professor','aluno')),
  nome        text not null,
  matricula   text unique,
  nascimento  date,
  turma       text,
  telefone    text,            -- null quando marcou "Não tenho telefone"
  segmento    text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "ler o próprio perfil" on public.profiles
  for select using (auth.uid() = id);
create policy "editar o próprio perfil" on public.profiles
  for update using (auth.uid() = id);

-- Cria o perfil automaticamente quando a conta é criada
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, nome, matricula, nascimento, turma, telefone, segmento)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'aluno'),
    coalesce(new.raw_user_meta_data->>'nome', ''),
    new.raw_user_meta_data->>'matricula',
    nullif(new.raw_user_meta_data->>'nascimento', '')::date,
    new.raw_user_meta_data->>'turma',
    nullif(new.raw_user_meta_data->>'telefone', ''),
    new.raw_user_meta_data->>'segmento'
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
