# ASSPROM — Gestão de turmas e presença

Sistema para organizar turmas dos cursos de informática (Capacitação, Integração e Aprendizagem) e acompanhar a presença dos alunos.
Por enquanto: login/cadastro de **professor** e **aluno**, dashboard e telas de **Turmas** do professor, com dados **reais no Supabase** (iguais em qualquer navegador). Hospedagem na **Vercel**.
Site estático (HTML + CSS + JS puro, sem build).

## Stack

| Camada | Tecnologia |
|---|---|
| Front-end | HTML, CSS, JS clássico (namespace global `Assprom`) |
| Autenticação e banco | Supabase (Auth + Postgres + RLS). Tabelas: `profiles`, `turmas`, `presencas`, `observacoes`, `turma_compartilhamento`, `turma_acessos`, `turma_atividade` |
| Hospedagem | Vercel (deploy automático a partir do GitHub, preset "Other", sem build command) |
| Código | GitHub (`main`) |

## Estrutura

```
├── index.html                 Login (abas Professor / Aluno; ?tipo=aluno abre no aluno)
├── pages/
│   ├── cadastro-aluno.html
│   ├── cadastro-professor.html
│   ├── painel.html            Roteador pós-login: professor → professor/dashboard.html (aluno ainda provisório)
│   └── professor/
│       ├── dashboard.html     Dashboard (cartões, atenção, aulas, segmentos)
│       ├── turmas.html        Lista de turmas + criar/editar/apagar
│       ├── turma.html         Uma turma: resumo, tabela de alunos e janela do aluno
│       └── compartilhar.html  Compartilhar turma (ou um aluno) com outros professores
├── assets/img/                logo.png, pattern-tile.png
├── css/
│   ├── style.css              Só importa os demais (a ordem importa)
│   ├── base/                  variables.css (cores/fonte), reset.css
│   ├── layout/                auth-layout.css (login/cadastro), app-layout.css (menu lateral + conteúdo)
│   ├── components/            field, actions, tabs, notice, card (cartões, listas, selos, barras, chips, switch), modal
│   └── pages/                 register, dashboard, turmas, turma (+ janela do aluno), compartilhar
├── js/
│   ├── core/                  config, ui, validators, masks, auth, form, shell (menu lateral + proteção), modal (janelas/avisos), turma-form
│   ├── data/                  turmas.store.js (demonstração + escolha do armazenamento), turmas.supabase.js (dados reais), dashboard.mock.js
│   └── pages/                 login, register, painel, dashboard, turmas, turma, compartilhar
├── supabase/
│   ├── schema.sql             Tabela profiles, RLS e trigger de criação de perfil (rode primeiro)
│   └── 02-turmas.sql          Turmas, presenças, observações, compartilhamento, regras de acesso (RLS) e funções (rode depois)
```

## Como funciona

**Cadastro**
- Aluno: nome, nascimento, matrícula, **turma (lista das turmas reais criadas pelos professores)**, telefone (ou caixinha **"Não tenho telefone"**), senha e termos. Ao criar a conta, o aluno já entra na turma escolhida.
- Professor: nome, e-mail institucional, segmento, senha e termos.
- Ao criar a conta, um trigger no banco (`handle_new_user`) cria a linha em `profiles` com os dados do formulário.
- Com "Não tenho telefone" marcado, o campo é desativado e o telefone é salvo como `null`.

**Login**
- Professor entra com o e-mail institucional.
- Aluno entra com a **matrícula**, que internamente vira o e-mail `20240187@aluno.assprom.app` (o Supabase Auth exige e-mail).
- Após o login, vai para `pages/painel.html`, que envia o **professor** para `pages/professor/dashboard.html`.

**Dashboard do professor**
- Saudação por horário, data de hoje, cartões de números, alunos que precisam de atenção, aulas de hoje e alunos por segmento.
- Alunos, turmas, frequência, segmentos e "precisam de atenção" saem de `Assprom.store` (mesmos números das telas de Turmas). **Aulas de hoje e pendências ainda são fictícias.**
- Clicar em um aluno de "atenção" abre a janela dele na página da turma. "Nova turma" abre o formulário de criação.

**Turmas (professor)**
- **Onde ficam os dados:** no Supabase. A turma que você cria aparece igual em qualquer navegador ou computador em que entrar com a mesma conta. (Só o modo `?demo` usa dados fictícios no navegador.)
- **Turmas:** filtros por segmento, um cartão por turma (andamento, alunos, frequência, primeiros alunos). Criar, editar e apagar (só o dono da turma); "Abrir turma" entra na página da turma. Turmas compartilhadas com você aparecem com "de <professor>". O professor cria as turmas aqui, não no cadastro.
- **Regras por segmento:** Capacitação = 5 dias seguidos; Integração 4h = 12 dias de 2 horas, 6h = 8 dias; Aprendizagem = 1 aula por semana, 33 aulas (10 Excel + 10 Word + 13 novas tecnologias).
- **"Dia N de M":** calculado pela **data de início** da turma (dias úteis; na Aprendizagem, 1 aula por semana). Não há feriados nem recesso.
- **Alunos da turma:** são as contas de aluno que escolheram a turma no cadastro. O professor edita nome, matrícula e telefone, ou remove o aluno da turma (a conta dele continua existindo).
- **Turma:** resumo (dia atual, frequência de hoje, em risco) e tabela com busca e filtros (Todos, Atenção, Risco). Até 12 dias aparecem as bolinhas (verde presente, vermelho falta, azul hoje, cinza sem registro ou ainda não chegou); acima disso (Aprendizagem) aparece "N presenças · N faltas".
- **Janela do aluno:** abre ao clicar na linha; pode ser arrastada, minimizada (vira pílula na base) e fechada; abrir outro aluno minimiza o anterior. Abas: Resumo, Conteúdos, Frequência, Observações (salva observação com visibilidade) e Contato (mostra "Sem telefone cadastrado" quando o aluno marcou "Não tenho telefone").
- **Compartilhar:** só o dono da turma altera. Convite por nome ou e-mail de um professor que **já tem conta**; nível (pode editar, pode comentar, só ver); acesso temporário com data; escopo turma inteira ou só um aluno; quem vê as observações; atividade recente. As permissões valem no banco (RLS), não só na tela.
- **Quem vê o quê (RLS):** o professor vê só as turmas que criou ou que foram compartilhadas com ele; observação "privada" só a autora vê; "professores" quem tem acesso; "aluno e família" também o aluno. Acesso temporário vencido deixa de valer sozinho.
- **Frequência e status (cálculo atual):** presenças ÷ dias já registrados (dia sem registro não conta). Em dia ≥ 90%, Atenção 70–89%, Risco < 70%. Enquanto não existir a tela de Presenças, ninguém tem registro e todos aparecem "em dia".

**Acesso às telas do professor**
- Só entra quem está logado e é professor; do contrário volta ao login (também se o Supabase não responder).
- Itens do menu e botões ainda sem tela mostram "Em breve" (`data-soon`).
- Prévia sem login: abra qualquer tela do professor com `?demo` (ex.: `pages/professor/turmas.html?demo`). Usa **dados fictícios** só daquele navegador e vale enquanto a aba estiver aberta; "Sair" encerra.
- Os dados de demonstração ficam no `localStorage` (chave `assprom.demo.v1`). Turmas criadas antes da migração para o Supabase eram só dessa demonstração e **não foram migradas**: crie-as de novo.

## Configuração (primeira vez)

1. **Supabase:** crie o projeto e rode, nesta ordem, `supabase/schema.sql` e `supabase/02-turmas.sql` no SQL Editor (os dois podem ser rodados de novo sem estragar nada).
2. Authentication → Providers → Email: desligue **Confirm email** (ver Pontos de atenção).
3. Em `js/core/config.js`, troque `SUPABASE_URL` e `SUPABASE_ANON_KEY` (Project Settings → API). A anon key é pública; **nunca** use a `service_role` no front-end.
4. **Vercel:** importe o repositório, preset "Other", sem build command.
5. Supabase → Authentication → URL Configuration: coloque a URL da Vercel em **Site URL** (e em Redirect URLs).

Para testar local, sirva a pasta com qualquer servidor estático (ex.: `npx serve`) ou abra `index.html` direto no navegador.

## Como estender

- **Nova página:** `pages/<nome>.html` + `js/pages/<nome>.js` (+ `css/pages/<nome>.css` importado em `css/style.css`).
- **Nova tela do professor:** copie `pages/professor/turmas.html`, ponha `<aside class="sidebar" id="sidebar"></aside>` e chame `Assprom.shell.mount('<item do menu>')` (o menu, a proteção de acesso e o usuário vêm de `js/core/shell.js`; novos itens do menu ficam na lista `MENU` do mesmo arquivo).
- **Janelas e avisos:** `Assprom.modal.confirm(...)`, `Assprom.modal.form(...)` e `Assprom.toast('texto')` (`js/core/modal.js`).
- **Dados:** toda leitura/gravação de turmas passa por `Assprom.store` (`js/data/turmas.store.js`), que usa `turmas.supabase.js` com login real e os dados fictícios com `?demo`. Todas as funções devolvem Promise. Mudou uma tabela? Ajuste `turmas.supabase.js` e o SQL, e rode os testes de acesso (ver Boas práticas).
- **Novo componente visual:** `css/components/<nome>.css` + `@import` em `css/style.css`.
- **Nova validação:** função em `Assprom.rules` (`js/core/validators.js`) e uso em `data-rules="required <regra>"`.
- **Nova máscara:** `Assprom.masks` (`js/core/masks.js`) e uso em `data-mask="<nome>"`.
- **Campo que desativa outro:** checkbox com `data-disables="id-do-campo"`.
- **Cores/fonte:** `css/base/variables.css`.
- Scripts são clássicos (sem `import`); ao migrar para Vite/React, dá para converter `Assprom.*` em módulos ES.

---

## Próximos passos sugeridos

1. ~~Ligar Turmas ao Supabase~~ (feito em 2026-11-04).
2. **Presenças com QR code:** tela da professora (planilha + QR da aula) e leitura no celular do aluno. A tabela `presencas` já existe e a regra de acesso também; falta a tela que grava.
3. **Painel do aluno:** início, meu curso, frequência, calendário, avisos e perfil (o aluno já pode ler as próprias presenças e as observações liberadas para ele).
4. **Calendário, Professores, Relatórios e Configurações** do professor.
5. Fechar com a coordenação as regras pendentes (#21 e #22).

---

# Pontos de atenção

> **Regra do projeto:** a cada mudança relevante (nova tabela, nova página, nova regra de acesso, mudança de configuração), revise esta seção:
> adicione os novos riscos, marque como ✅ o que for resolvido e registre a data. Nada some da lista; vira histórico.

## Abertos

| # | Ponto | Por que importa | Sugestão |
|---|---|---|---|
| 1 | **"Confirm email" desligado** no Supabase | Alunos usam e-mail fictício e não conseguem confirmar. Qualquer pessoa pode cadastrar um e-mail que não é dela. | Pedir e-mail real ao aluno e religar a confirmação. |
| 2 | **Cadastro de professor aberto** | O `role` vem do formulário: qualquer pessoa cria conta de professor. | Aprovação manual (campo `aprovado` em `profiles`) ou código de convite. |
| 3 | **Matrícula não é validada** | Qualquer pessoa pode se cadastrar com qualquer matrícula. | Tabela de matrículas/turmas autorizadas, conferida no cadastro. |
| 4 | **Aluno escolhe qualquer turma no cadastro** | A lista de turmas é pública (sem login) e o aluno entra direto na turma escolhida, sem aprovação. | Código de acesso da turma ou aprovação do professor. |
| 5 | **Aluno sem e-mail = sem recuperação de senha** | "Esqueci minha senha" não funciona para e-mail fictício. | Fluxo de redefinição pelo professor/admin, ou e-mail real (ver #1). |
| 6 | **Painel provisório** | `painel.html` só mostra o nome; a proteção de páginas é feita no cliente. | Quando houver dados sensíveis, proteger por RLS em cada tabela (o cliente nunca é a barreira). |
| 7 | **`config.js` com valores de exemplo** | Sem preencher URL/anon key, o cadastro/login mostram "Supabase ainda não configurado". | Preencher antes do deploy. |
| 8 | **Sem limite de tentativas próprio** | Dependemos do rate limit padrão do Supabase. | Ajustar em Authentication → Rate Limits; avaliar CAPTCHA. |
| 9 | **Sem LGPD completa** | Guardamos nome, nascimento e telefone; os termos são só uma caixinha. | Páginas reais de termos/privacidade; política de exclusão de dados. |
| 10 | **Supabase gratuito pausa por inatividade** | Projeto sem uso pode ser pausado. | Considerar plano pago antes de uso real. |
| 11 | **Dashboard parcialmente fictício** | Aulas de hoje, pendências e a variação "+2% no mês" ainda são exemplos; o resto vem de Turmas. | Ligar às telas de Presenças e Calendário quando existirem. |
| 12 | **Modo `?demo` nas telas do professor** | Qualquer um abre as telas sem login, mas só vê dados fictícios do próprio navegador (nunca os reais). | Remover o `?demo` (`isDemo()` em `js/core/shell.js`) quando não for mais útil. |
| 13 | **Aluno sem painel** | Aluno logado cai no `painel.html` provisório. | Criar o dashboard do aluno. |
| 14 | **Telas do menu inexistentes** | Presenças, Calendário, Professores, Relatórios e Configurações mostram "Em breve"; "Chamada da turma" também. | Criar uma a uma (Presenças com QR code primeiro), mantendo esta lista atualizada. |
| 16 | **Migrações do banco são manuais** | O SQL é colado no editor do Supabase; esquecer de rodar o `02-turmas.sql` faz as telas de turmas mostrarem erro. | Migrar para Supabase CLI (`supabase db push`) com os arquivos versionados. |
| 17 | **Regras de acesso testadas só em um Postgres local** | As 52 verificações de RLS passaram num banco local que imita o Supabase, não no seu projeto. | Repetir no Supabase real: professor A não vê turma de B, aluno não vira professor, observação privada, acesso vencido. |
| 18 | **"Outro professor vendo" é demonstração** | O aviso na janela do aluno só existe no `?demo`. | Supabase Realtime (presence) quando houver mais de um professor. |
| 19 | **Apagar turma/aluno é definitivo** | Apagar uma turma apaga alunos e presenças junto. | Arquivar (soft delete) ou exportar antes de apagar. |
| 20 | **Regra de frequência e status é suposição** | 90% / 70% e "hoje sem confirmação não conta" foram assumidos para o esboço. | Confirmar com a coordenação e mover o cálculo para o banco (view). |
| 21 | **Regras dos segmentos a confirmar** | Quarto segmento ainda não descrito; 13 aulas de novas tecnologias a confirmar; duração de cada dia da Integração 6h; como registrar o resultado da avaliação da Capacitação (nota ou aprovado/reprovado). | Fechar com a coordenação e ajustar `regraDe()` em `turmas.store.js`. |
| 22 | **"Não tenho telefone": regra pendente** | Falta definir se o e-mail passa a ser obrigatório nesse caso. | Decidir e validar no cadastro do aluno. |
| 23 | **Presenças sem tela** | A tabela existe, mas nada grava nela ainda: todo dia passado aparece "sem registro" e a frequência não é calculada. | Tela de Presenças / QR code (ver Próximos passos). |
| 24 | **Lista de turmas aberta ao público** | A função `turmas_abertas()` mostra id, nome e segmento das turmas sem login (necessário no cadastro do aluno). | Aceitável para nomes genéricos; evite dados pessoais no nome da turma. |
| 25 | **Cadastro de professor aberto (#2) e turmas** | Quem criar conta de professor pode criar turmas e convidar outros professores, mas não vê dados de quem não compartilhou com ele (RLS). | Aprovação do professor (ver #2). |
| 26 | **Convite só para quem já tem conta** | Compartilhar exige que o professor já tenha criado a conta; não há convite por e-mail pendente. | Fluxo de convite por e-mail (Supabase Auth invite) se for necessário. |
| 27 | **"Dia N" sem feriados nem recesso** | O dia da turma conta dias úteis desde a data de início. | Tabela de feriados/recessos ou "dia da aula" gravado quando a chamada for feita. |
| 28 | **Apagar turma desvincula os alunos** | Os alunos continuam com a conta, mas sem turma (e perdem o vínculo; observações e presenças da turma somem). | Arquivar em vez de apagar (ver #19). |

## Boas práticas ao evoluir

- **Toda tabela nova:** `enable row level security` e políticas explícitas. Sem política, ninguém lê; com política frouxa, todo mundo lê.
- **Nunca** colocar `service_role`, senhas ou tokens no repositório (nem em `config.js`).
- **Token do GitHub** compartilhado em chat/e-mail deve ser revogado na hora.
- Mudou o `schema.sql` ou o `02-turmas.sql`? Rode a mudança no Supabase **e** commit no repo, para os dois não divergirem. Depois de mexer em regras de acesso (RLS), repita os testes: professor A não vê turma de B, aluno não vira professor, observação privada só da autora, acesso vencido some.
- Mudou a URL da Vercel (domínio próprio)? Atualize Site URL e Redirect URLs no Supabase.
- Testar sempre: cadastro com e sem telefone, login por matrícula, login de professor, sair e voltar ao painel sem sessão.

## Resolvidos

| Data | Ponto |
|---|---|
| 2026-10-30 | Envio do formulário era simulado: agora cadastra e autentica no Supabase. |
| 2026-10-30 | Professor sem destino após o login: criado o dashboard (com dados fictícios, ver #11). |
| 2026-10-30 | Aluno sem telefone não conseguia se cadastrar: caixinha "Não tenho telefone". |
| 2026-11-03 | Professor sem telas de turma: criadas Turmas, Turma + janela do aluno e Compartilhar (dados fictícios, ver #15 a #19). |
| 2026-11-03 | Menu lateral do professor ganhou o efeito animado do login (só do meio para baixo). |
| 2026-11-03 | CSS do menu lateral com marcadores de conflito (`<<<<<<<`) após aplicar um patch: corrigido; sempre conferir `git diff` e buscar `<<<<<<<` antes de commitar. |
| 2026-11-04 | Turmas só existiam no `localStorage` (cada navegador via turmas diferentes): agora ficam no Supabase, com regras de acesso no banco (antigos #15 a #17). |
| 2026-11-04 | Lista de turmas do cadastro do aluno era fixa no HTML: agora vem das turmas criadas pelos professores (antigo #4). |
| 2026-11-04 | Qualquer usuário podia alterar o próprio `role` em `profiles`: agora só nome e telefone são editáveis pelo próprio usuário. |
