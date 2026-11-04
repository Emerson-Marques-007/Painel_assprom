-- ASSPROM · Diagnóstico do banco (só leitura; não altera nada)
-- Supabase > SQL Editor > New query > cole tudo > Run. Me envie o resultado (print ou texto).
select ordem, item, detalhe from (

  select 1 as ordem, 'tabela' as item,
         t.tablename || ' · RLS ' || case when t.rowsecurity then 'ligada' else 'DESLIGADA' end as detalhe
    from pg_tables t
   where t.schemaname = 'public'
     and t.tablename in ('profiles','turmas','presencas','observacoes','turma_compartilhamento','turma_acessos','turma_atividade')

  union all
  select 2, 'tabela que FALTA', n
    from unnest(array['turmas','presencas','observacoes','turma_compartilhamento','turma_acessos','turma_atividade']) n
   where not exists (select 1 from pg_tables where schemaname = 'public' and tablename = n)

  union all
  select 3, 'permissão (authenticated)', table_name || ' · ' || string_agg(privilege_type, ', ' order by privilege_type)
    from information_schema.role_table_grants
   where table_schema = 'public' and grantee = 'authenticated'
     and table_name in ('profiles','turmas','presencas','observacoes','turma_compartilhamento','turma_acessos','turma_atividade')
   group by table_name

  union all
  select 4, 'regras (policies)', tablename || ' · ' || count(*) || ' regra(s)'
    from pg_policies where schemaname = 'public' group by tablename

  union all
  select 5, 'função', p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('sou_professor','nivel_turma','nivel_aluno','turmas_abertas','buscar_professor','editar_aluno','remover_aluno','handle_new_user')

  union all
  select 6, 'contas', role || ' · ' || count(*) || ' conta(s)' from public.profiles group by role

  union all
  select 7, 'professor', nome || ' · id ' || id from public.profiles where role = 'professor'

) x order by ordem, detalhe;
