# ASSPROM — Gestão de turmas e presença

Sistema para organizar turmas dos cursos de informática (Capacitação, Integração e Aprendizagem) e acompanhar a presença dos alunos.
Por enquanto: login/cadastro de **professor** e **aluno** (Supabase), dashboard e telas de **Turmas** do professor. Hospedagem na **Vercel**.
Site estático (HTML + CSS + JS puro, sem build).

## Stack

| Camada | Tecnologia |
|---|---|
| Front-end | HTML, CSS, JS clássico (namespace global `Assprom`) |
| Autenticação e banco | Supabase (Auth + Postgres + RLS) |
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
│   ├── data/                  turmas.store.js (turmas, alunos, compartilhamento: DADOS FICTÍCIOS no navegador), dashboard.mock.js
│   └── pages/                 login, register, painel, dashboard, turmas, turma, compartilhar
└── supabase/schema.sql        Tabela profiles, RLS e trigger de criação de perfil
```

## Como funciona

**Cadastro**
- Aluno: nome, nascimento, matrícula, turma, telefone (ou caixinha **"Não tenho telefone"**), senha e termos.
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
- **Turmas:** filtros por segmento, um cartão por turma (andamento, alunos, frequência, primeiros alunos). Criar, editar e apagar turma; "Abrir turma" entra na página da turma. O professor cria as turmas aqui, não no cadastro.
- **Regras por segmento:** Capacitação = 5 dias seguidos; Integração 4h = 12 dias de 2 horas, 6h = 8 dias; Aprendizagem = 1 aula por semana, 33 aulas (10 Excel + 10 Word + 13 novas tecnologias).
- **Turma:** resumo (dia atual, frequência de hoje, em risco) e tabela com busca e filtros (Todos, Atenção, Risco). Até 12 dias aparecem as bolinhas (verde presente, vermelho falta, azul hoje, cinza ainda não chegou); acima disso (Aprendizagem) aparece "N presenças · N faltas".
- **Janela do aluno:** abre ao clicar na linha; pode ser arrastada, minimizada (vira pílula na base) e fechada; abrir outro aluno minimiza o anterior. Abas: Resumo, Conteúdos, Frequência, Observações (salva observação com visibilidade) e Contato (mostra "Sem telefone cadastrado" quando o aluno marcou "Não tenho telefone").
- **Compartilhar:** turma inteira ou um aluno; convite por nome/e-mail; nível (pode editar, pode comentar, só ver); acesso temporário com data; quem vê as observações; atividade recente. Salvar, Cancelar e Parar de compartilhar.
- **Frequência e status (cálculo atual):** presenças ÷ dias já encerrados (o dia de hoje sem confirmação não conta). Em dia ≥ 90%, Atenção 70–89%, Risco < 70%.

**Acesso às telas do professor**
- Só entra quem está logado e é professor; do contrário volta ao login (também se o Supabase não responder).
- Itens do menu e botões ainda sem tela mostram "Em breve" (`data-soon`).
- Prévia sem login: abra qualquer tela do professor com `?demo` (ex.: `pages/professor/turmas.html?demo`). Vale enquanto a aba estiver aberta; "Sair" encerra.
- Os dados de demonstração ficam no `localStorage` do navegador. Para voltar ao início, apague `assprom.demo.v1` nos dados do site.

## Configuração (primeira vez)

1. **Supabase:** crie o projeto e rode `supabase/schema.sql` no SQL Editor.
2. Authentication → Providers → Email: desligue **Confirm email** (ver Pontos de atenção).
3. Em `js/core/config.js`, troque `SUPABASE_URL` e `SUPABASE_ANON_KEY` (Project Settings → API). A anon key é pública; **nunca** use a `service_role` no front-end.
4. **Vercel:** importe o repositório, preset "Other", sem build command.
5. Supabase → Authentication → URL Configuration: coloque a URL da Vercel em **Site URL** (e em Redirect URLs).

Para testar local, sirva a pasta com qualquer servidor estático (ex.: `npx serve`) ou abra `index.html` direto no navegador.

## Como estender

- **Nova página:** `pages/<nome>.html` + `js/pages/<nome>.js` (+ `css/pages/<nome>.css` importado em `css/style.css`).
- **Nova tela do professor:** copie `pages/professor/turmas.html`, ponha `<aside class="sidebar" id="sidebar"></aside>` e chame `Assprom.shell.mount('<item do menu>')` (o menu, a proteção de acesso e o usuário vêm de `js/core/shell.js`; novos itens do menu ficam na lista `MENU` do mesmo arquivo).
- **Janelas e avisos:** `Assprom.modal.confirm(...)`, `Assprom.modal.form(...)` e `Assprom.toast('texto')` (`js/core/modal.js`).
- **Dados:** toda leitura/gravação de turmas passa por `Assprom.store` (`js/data/turmas.store.js`); todas as funções devolvem Promise para trocar pelo Supabase sem mexer nas telas.
- **Novo componente visual:** `css/components/<nome>.css` + `@import` em `css/style.css`.
- **Nova validação:** função em `Assprom.rules` (`js/core/validators.js`) e uso em `data-rules="required <regra>"`.
- **Nova máscara:** `Assprom.masks` (`js/core/masks.js`) e uso em `data-mask="<nome>"`.
- **Campo que desativa outro:** checkbox com `data-disables="id-do-campo"`.
- **Cores/fonte:** `css/base/variables.css`.
- Scripts são clássicos (sem `import`); ao migrar para Vite/React, dá para converter `Assprom.*` em módulos ES.

---

## Próximos passos sugeridos

1. **Ligar Turmas ao Supabase:** tabelas de turmas, alunos, presenças, observações e acessos com RLS; trocar o corpo de `Assprom.store` (ver #15 a #17).
2. **Presenças com QR code:** tela da professora (planilha + QR da aula) e leitura no celular do aluno.
3. **Painel do aluno:** início, meu curso, frequência, calendário, avisos e perfil.
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
| 4 | **Turmas do cadastro do aluno fixas no HTML** | A lista de turmas do cadastro do aluno não acompanha as turmas que o professor cria em Turmas. | Ler as turmas do Supabase no `<select>` do cadastro. |
| 5 | **Aluno sem e-mail = sem recuperação de senha** | "Esqueci minha senha" não funciona para e-mail fictício. | Fluxo de redefinição pelo professor/admin, ou e-mail real (ver #1). |
| 6 | **Painel provisório** | `painel.html` só mostra o nome; a proteção de páginas é feita no cliente. | Quando houver dados sensíveis, proteger por RLS em cada tabela (o cliente nunca é a barreira). |
| 7 | **`config.js` com valores de exemplo** | Sem preencher URL/anon key, o cadastro/login mostram "Supabase ainda não configurado". | Preencher antes do deploy. |
| 8 | **Sem limite de tentativas próprio** | Dependemos do rate limit padrão do Supabase. | Ajustar em Authentication → Rate Limits; avaliar CAPTCHA. |
| 9 | **Sem LGPD completa** | Guardamos nome, nascimento e telefone; os termos são só uma caixinha. | Páginas reais de termos/privacidade; política de exclusão de dados. |
| 10 | **Supabase gratuito pausa por inatividade** | Projeto sem uso pode ser pausado. | Considerar plano pago antes de uso real. |
| 11 | **Dashboard parcialmente fictício** | Aulas de hoje, pendências e a variação "+2% no mês" ainda são exemplos; o resto vem de Turmas. | Ligar às telas de Presenças e Calendário quando existirem. |
| 12 | **Modo `?demo` nas telas do professor** | Qualquer um abre as telas sem login. Hoje só mostra dado fictício, mas deixa de ser seguro quando houver dado real. | Remover o `?demo` (`isDemo()` em `js/core/shell.js`) assim que os dados reais forem ligados. |
| 13 | **Aluno sem painel** | Aluno logado cai no `painel.html` provisório. | Criar o dashboard do aluno. |
| 14 | **Telas do menu inexistentes** | Presenças, Calendário, Professores, Relatórios e Configurações mostram "Em breve"; "Chamada da turma" também. | Criar uma a uma (Presenças com QR code primeiro), mantendo esta lista atualizada. |
| 15 | **Dados de turmas só no navegador** | `localStorage`: cada navegador tem os seus dados, somem ao limpar o site e não há mais de um professor de verdade. | Criar tabelas (turmas, alunos, presenças, observações, acessos) no Supabase com RLS e trocar o corpo de `Assprom.store`. |
| 16 | **Permissões do compartilhamento só na tela** | "Pode editar / comentar / só ver" e o acesso temporário ainda não são aplicados. | Tabela de acessos por turma com nível e validade, aplicada por RLS (acesso vencido é ignorado). |
| 17 | **Observações privadas e o aluno** | A regra "privadas nunca aparecem para o aluno" precisa valer no banco, não só no JavaScript. | Filtrar por visibilidade com RLS/view ao criar o painel do aluno. |
| 18 | **"Outro professor vendo" é demonstração** | O aviso na janela do aluno é fixo (só para um aluno de exemplo). | Supabase Realtime (presence) quando houver mais de um professor. |
| 19 | **Apagar turma/aluno é definitivo** | Apagar uma turma apaga alunos e presenças junto. | Arquivar (soft delete) ou exportar antes de apagar. |
| 20 | **Regra de frequência e status é suposição** | 90% / 70% e "hoje sem confirmação não conta" foram assumidos para o esboço. | Confirmar com a coordenação e mover o cálculo para o banco (view). |
| 21 | **Regras dos segmentos a confirmar** | Quarto segmento ainda não descrito; 13 aulas de novas tecnologias a confirmar; duração de cada dia da Integração 6h; como registrar o resultado da avaliação da Capacitação (nota ou aprovado/reprovado). | Fechar com a coordenação e ajustar `regraDe()` em `turmas.store.js`. |
| 22 | **"Não tenho telefone": regra pendente** | Falta definir se o e-mail passa a ser obrigatório nesse caso. | Decidir e validar no cadastro do aluno. |

## Boas práticas ao evoluir

- **Toda tabela nova:** `enable row level security` e políticas explícitas. Sem política, ninguém lê; com política frouxa, todo mundo lê.
- **Nunca** colocar `service_role`, senhas ou tokens no repositório (nem em `config.js`).
- **Token do GitHub** compartilhado em chat/e-mail deve ser revogado na hora.
- Mudou o `schema.sql`? Rode a mudança no Supabase **e** commit no repo, para os dois não divergirem.
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
