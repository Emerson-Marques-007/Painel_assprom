-- ASSPROM · Turmas, alunos, presenças, observações e compartilhamento
-- Rode DEPOIS do schema.sql: Supabase > SQL Editor > New query > Run.
-- Pode rodar de novo sem estragar o que já existe.

-- ======================================================================
-- 1) Tabelas
-- ======================================================================
create table if not exists public.turmas (
  id           uuid primary key default gen_random_uuid(),
  dono_id      uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  nome         text not null check (length(trim(nome)) > 0),
  segmento     text not null check (segmento in ('capacitacao', 'integracao', 'aprendizagem')),
  variante     text check (variante in ('4h', '6h')),            -- só Integração
  data_inicio  date not null default current_date,               -- o "Dia N de M" é calculado a partir daqui
  created_at   timestamptz not null default now()
);
create unique index if not exists turmas_nome_por_dono on public.turmas (dono_id, lower(nome));

-- Em qual turma o aluno está (o aluno escolhe no cadastro; o professor pode remover)
alter table public.profiles add column if not exists turma_id uuid references public.turmas(id) on delete set null;
create index if not exists profiles_turma_id on public.profiles (turma_id);

create table if not exists public.presencas (
  turma_id       uuid not null references public.turmas(id) on delete cascade,
  aluno_id       uuid not null references public.profiles(id) on delete cascade,
  dia            int  not null check (dia between 1 and 60),
  status         text not null check (status in ('p', 'f')),     -- p = presente, f = faltou
  registrado_em  timestamptz not null default now(),
  primary key (aluno_id, turma_id, dia)
);

create table if not exists public.observacoes (
  id           uuid primary key default gen_random_uuid(),
  turma_id     uuid not null references public.turmas(id) on delete cascade,
  aluno_id     uuid not null references public.profiles(id) on delete cascade,
  autor_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  texto        text not null check (length(trim(texto)) > 0),
  visibilidade text not null check (visibilidade in ('privada', 'professores', 'aluno')),
  created_at   timestamptz not null default now()
);
create index if not exists observacoes_aluno on public.observacoes (aluno_id, created_at desc);

create table if not exists public.turma_compartilhamento (
  turma_id     uuid primary key references public.turmas(id) on delete cascade,
  escopo       text not null default 'turma' check (escopo in ('turma', 'aluno')),
  aluno_id     uuid references public.profiles(id) on delete set null,
  observacoes  text not null default 'privada' check (observacoes in ('privada', 'professores', 'aluno')),
  temporario   boolean not null default false,
  ate          date
);

create table if not exists public.turma_acessos (
  turma_id      uuid not null references public.turmas(id) on delete cascade,
  professor_id  uuid not null references public.profiles(id) on delete cascade,
  nivel         text not null check (nivel in ('editar', 'comentar', 'ver')),
  created_at    timestamptz not null default now(),
  primary key (turma_id, professor_id)
);

create table if not exists public.turma_atividade (
  id          uuid primary key default gen_random_uuid(),
  turma_id    uuid not null references public.turmas(id) on delete cascade,
  texto       text not null,
  created_at  timestamptz not null default now()
);
create index if not exists turma_atividade_turma on public.turma_atividade (turma_id, created_at desc);

-- ======================================================================
-- 2) Funções de apoio (security definer: leem sem disparar as regras de linha,
--    o que evita recursão entre as políticas)
-- ======================================================================
create or replace function public.sou_professor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'professor');
$$;

create or replace function public.eh_professor(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = uid and role = 'professor');
$$;

-- 'dono' | 'editar' | 'comentar' | 'ver' | null  (acesso temporário vencido = null)
create or replace function public.nivel_turma(tid uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.turmas t where t.id = tid and t.dono_id = auth.uid()) then 'dono'
    else (select a.nivel
            from public.turma_acessos a
            left join public.turma_compartilhamento c on c.turma_id = a.turma_id
           where a.turma_id = tid and a.professor_id = auth.uid()
             and (c.turma_id is null or not c.temporario or c.ate >= current_date))
  end;
$$;

-- Nível de quem está logado sobre um aluno (respeita "só um aluno" no compartilhamento)
create or replace function public.nivel_aluno(aid uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when p.turma_id is null then null
    when public.nivel_turma(p.turma_id) = 'dono' then 'dono'
    when public.nivel_turma(p.turma_id) is null then null
    when coalesce(c.escopo, 'turma') = 'turma' or c.aluno_id = aid then public.nivel_turma(p.turma_id)
    else null
  end
  from public.profiles p
  left join public.turma_compartilhamento c on c.turma_id = p.turma_id
  where p.id = aid and p.role = 'aluno';
$$;

create or replace function public.aluno_na_turma(aid uuid, tid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = aid and role = 'aluno' and turma_id = tid);
$$;

-- ======================================================================
-- 3) Regras de acesso (RLS)
-- ======================================================================
alter table public.turmas                  enable row level security;
alter table public.presencas               enable row level security;
alter table public.observacoes             enable row level security;
alter table public.turma_compartilhamento  enable row level security;
alter table public.turma_acessos           enable row level security;
alter table public.turma_atividade         enable row level security;

-- Turmas: vê quem é dono ou tem acesso; só o dono cria/edita/apaga
drop policy if exists "turmas: ver" on public.turmas;
create policy "turmas: ver" on public.turmas for select to authenticated
  using (dono_id = auth.uid() or public.nivel_turma(id) is not null);
drop policy if exists "turmas: criar" on public.turmas;
create policy "turmas: criar" on public.turmas for insert to authenticated
  with check (dono_id = auth.uid() and public.sou_professor());
drop policy if exists "turmas: editar" on public.turmas;
create policy "turmas: editar" on public.turmas for update to authenticated
  using (dono_id = auth.uid()) with check (dono_id = auth.uid());
drop policy if exists "turmas: apagar" on public.turmas;
create policy "turmas: apagar" on public.turmas for delete to authenticated
  using (dono_id = auth.uid());

-- Perfis: professor vê os alunos das turmas a que tem acesso e os outros professores
drop policy if exists "professor vê alunos" on public.profiles;
create policy "professor vê alunos" on public.profiles for select to authenticated
  using (role = 'aluno' and public.nivel_aluno(id) is not null);
drop policy if exists "professor vê professores" on public.profiles;
create policy "professor vê professores" on public.profiles for select to authenticated
  using (role = 'professor' and public.sou_professor());

-- Cada pessoa só pode alterar o próprio nome e telefone (nunca papel, turma ou matrícula)
revoke all on public.profiles from anon, authenticated;
grant update (nome, telefone) on public.profiles to authenticated;

-- Presenças: professor com acesso vê; só dono/editor registra; o aluno vê as dele
drop policy if exists "presencas: ver" on public.presencas;
create policy "presencas: ver" on public.presencas for select to authenticated
  using (aluno_id = auth.uid() or public.nivel_aluno(aluno_id) is not null);
drop policy if exists "presencas: registrar" on public.presencas;
create policy "presencas: registrar" on public.presencas for insert to authenticated
  with check (public.nivel_aluno(aluno_id) in ('dono', 'editar') and public.aluno_na_turma(aluno_id, turma_id));
drop policy if exists "presencas: corrigir" on public.presencas;
create policy "presencas: corrigir" on public.presencas for update to authenticated
  using (public.nivel_aluno(aluno_id) in ('dono', 'editar'))
  with check (public.nivel_aluno(aluno_id) in ('dono', 'editar') and public.aluno_na_turma(aluno_id, turma_id));
drop policy if exists "presencas: apagar" on public.presencas;
create policy "presencas: apagar" on public.presencas for delete to authenticated
  using (public.nivel_aluno(aluno_id) in ('dono', 'editar'));

-- Observações: privada = só a autora; professores = quem tem acesso; aluno = também o aluno
drop policy if exists "observacoes: ver" on public.observacoes;
create policy "observacoes: ver" on public.observacoes for select to authenticated
  using (
    autor_id = auth.uid()
    or (visibilidade = 'professores' and public.nivel_aluno(aluno_id) is not null)
    or (visibilidade = 'aluno' and (aluno_id = auth.uid() or public.nivel_aluno(aluno_id) is not null))
  );
drop policy if exists "observacoes: criar" on public.observacoes;
create policy "observacoes: criar" on public.observacoes for insert to authenticated
  with check (autor_id = auth.uid()
              and public.nivel_aluno(aluno_id) in ('dono', 'editar', 'comentar')
              and public.aluno_na_turma(aluno_id, turma_id));
drop policy if exists "observacoes: apagar" on public.observacoes;
create policy "observacoes: apagar" on public.observacoes for delete to authenticated
  using (autor_id = auth.uid());

-- Compartilhamento: só o dono altera
drop policy if exists "compartilhamento: ver" on public.turma_compartilhamento;
create policy "compartilhamento: ver" on public.turma_compartilhamento for select to authenticated
  using (public.nivel_turma(turma_id) is not null);
drop policy if exists "compartilhamento: criar" on public.turma_compartilhamento;
create policy "compartilhamento: criar" on public.turma_compartilhamento for insert to authenticated
  with check (public.nivel_turma(turma_id) = 'dono');
drop policy if exists "compartilhamento: editar" on public.turma_compartilhamento;
create policy "compartilhamento: editar" on public.turma_compartilhamento for update to authenticated
  using (public.nivel_turma(turma_id) = 'dono') with check (public.nivel_turma(turma_id) = 'dono');
drop policy if exists "compartilhamento: apagar" on public.turma_compartilhamento;
create policy "compartilhamento: apagar" on public.turma_compartilhamento for delete to authenticated
  using (public.nivel_turma(turma_id) = 'dono');

drop policy if exists "acessos: ver" on public.turma_acessos;
create policy "acessos: ver" on public.turma_acessos for select to authenticated
  using (professor_id = auth.uid() or public.nivel_turma(turma_id) = 'dono');
drop policy if exists "acessos: criar" on public.turma_acessos;
create policy "acessos: criar" on public.turma_acessos for insert to authenticated
  with check (public.nivel_turma(turma_id) = 'dono' and public.eh_professor(professor_id) and professor_id <> auth.uid());
drop policy if exists "acessos: editar" on public.turma_acessos;
create policy "acessos: editar" on public.turma_acessos for update to authenticated
  using (public.nivel_turma(turma_id) = 'dono') with check (public.nivel_turma(turma_id) = 'dono');
drop policy if exists "acessos: apagar" on public.turma_acessos;
create policy "acessos: apagar" on public.turma_acessos for delete to authenticated
  using (public.nivel_turma(turma_id) = 'dono');

drop policy if exists "atividade: ver" on public.turma_atividade;
create policy "atividade: ver" on public.turma_atividade for select to authenticated
  using (public.nivel_turma(turma_id) is not null);
drop policy if exists "atividade: registrar" on public.turma_atividade;
create policy "atividade: registrar" on public.turma_atividade for insert to authenticated
  with check (public.nivel_turma(turma_id) in ('dono', 'editar'));

-- Visitante sem login não acessa nenhuma tabela nova
revoke all on public.turmas, public.presencas, public.observacoes,
              public.turma_compartilhamento, public.turma_acessos, public.turma_atividade from anon;

-- Permissões das tabelas para quem está logado. Projetos novos do Supabase NÃO liberam tabelas
-- criadas por SQL sozinhos; sem estas linhas aparece "permission denied" ao criar turma.
-- (As regras de linha acima continuam decidindo quem vê/altera o quê.)
grant usage on schema public to anon, authenticated;
revoke truncate, references, trigger on public.turmas, public.presencas, public.observacoes,
      public.turma_compartilhamento, public.turma_acessos, public.turma_atividade from authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.turmas, public.presencas, public.observacoes,
      public.turma_compartilhamento, public.turma_acessos, public.turma_atividade to authenticated;
grant all on public.turmas, public.presencas, public.observacoes,
      public.turma_compartilhamento, public.turma_acessos, public.turma_atividade to service_role;

-- ======================================================================
-- 4) Funções chamadas pelo site
-- ======================================================================
-- Lista de turmas para o cadastro do aluno (roda antes do login): só id, nome e segmento
create or replace function public.turmas_abertas() returns table (id uuid, nome text, segmento text)
language sql stable security definer set search_path = public as $$
  select t.id, t.nome, t.segmento from public.turmas t order by t.created_at desc;
$$;

-- Procura um professor por e-mail exato ou parte do nome (para o convite de compartilhamento)
create or replace function public.buscar_professor(q text) returns table (id uuid, nome text, segmento text, email text)
language sql stable security definer set search_path = public, auth as $$
  select p.id, p.nome, p.segmento, u.email::text
    from public.profiles p join auth.users u on u.id = p.id
   where public.sou_professor() and p.role = 'professor' and p.id <> auth.uid()
     and length(trim(q)) >= 3
     and (lower(u.email) = lower(trim(q)) or strpos(lower(p.nome), lower(trim(q))) > 0)
   order by (lower(u.email) = lower(trim(q))) desc, p.nome
   limit 5;
$$;

create or replace function public.editar_aluno(p_id uuid, p_nome text, p_matricula text, p_telefone text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.nivel_aluno(p_id), '') not in ('dono', 'editar') then
    raise exception 'Sem permissão para editar este aluno.';
  end if;
  update public.profiles
     set nome = trim(p_nome), matricula = trim(p_matricula), telefone = nullif(trim(coalesce(p_telefone, '')), '')
   where id = p_id and role = 'aluno';
exception when unique_violation then
  raise exception 'Já existe um aluno com essa matrícula.';
end $$;

-- Tira o aluno da turma (a conta dele continua existindo) e apaga as presenças dele nela
create or replace function public.remover_aluno(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_turma uuid;
begin
  if coalesce(public.nivel_aluno(p_id), '') not in ('dono', 'editar') then
    raise exception 'Sem permissão para remover este aluno.';
  end if;
  select turma_id into v_turma from public.profiles where id = p_id;
  delete from public.presencas where aluno_id = p_id and turma_id = v_turma;
  update public.profiles set turma_id = null where id = p_id;
end $$;

revoke all on function public.sou_professor(), public.eh_professor(uuid), public.nivel_turma(uuid),
  public.nivel_aluno(uuid), public.aluno_na_turma(uuid, uuid), public.buscar_professor(text),
  public.editar_aluno(uuid, text, text, text), public.remover_aluno(uuid) from public, anon;
grant execute on function public.sou_professor(), public.eh_professor(uuid), public.nivel_turma(uuid),
  public.nivel_aluno(uuid), public.aluno_na_turma(uuid, uuid), public.buscar_professor(text),
  public.editar_aluno(uuid, text, text, text), public.remover_aluno(uuid) to authenticated;
revoke all on function public.turmas_abertas() from public;
grant execute on function public.turmas_abertas() to anon, authenticated;

-- ======================================================================
-- 5) Cadastro: o aluno entra já na turma escolhida
-- ======================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_turma uuid; v_nome_turma text;
begin
  begin v_turma := nullif(new.raw_user_meta_data->>'turma_id', '')::uuid;
  exception when others then v_turma := null; end;
  select nome into v_nome_turma from public.turmas where id = v_turma;
  if v_nome_turma is null then v_turma := null; end if;

  insert into public.profiles (id, role, nome, matricula, nascimento, turma, turma_id, telefone, segmento)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'aluno'),
    coalesce(new.raw_user_meta_data->>'nome', ''),
    new.raw_user_meta_data->>'matricula',
    nullif(new.raw_user_meta_data->>'nascimento', '')::date,
    coalesce(v_nome_turma, new.raw_user_meta_data->>'turma'),
    v_turma,
    nullif(new.raw_user_meta_data->>'telefone', ''),
    new.raw_user_meta_data->>'segmento'
  );
  return new;
end $$;

-- ======================================================================
-- 6) Avisa a API do Supabase que o esquema mudou (sem isso, às vezes ela só enxerga as tabelas novas depois de alguns minutos)
-- ======================================================================
notify pgrst, 'reload schema';
