# ASSPROM — Acesso (login e cadastro)

Telas de login e cadastro de **professor** e **aluno**, com autenticação via **Supabase** e hospedagem na **Vercel**.
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
│   └── painel.html            Painel provisório (prova que login/sessão funcionam)
├── assets/img/                logo.png, pattern-tile.png
├── css/
│   ├── style.css              Só importa os demais (a ordem importa)
│   ├── base/                  variables.css (cores/fonte), reset.css
│   ├── layout/                auth-layout.css (2 painéis + padrão animado)
│   ├── components/            field, actions (botão), tabs, notice
│   └── pages/                 register.css
├── js/
│   ├── core/                  config, ui, validators, masks, auth, form
│   └── pages/                 login.js, register.js, painel.js
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
- Após o login, vai para `pages/painel.html`.

## Configuração (primeira vez)

1. **Supabase:** crie o projeto e rode `supabase/schema.sql` no SQL Editor.
2. Authentication → Providers → Email: desligue **Confirm email** (ver Pontos de atenção).
3. Em `js/core/config.js`, troque `SUPABASE_URL` e `SUPABASE_ANON_KEY` (Project Settings → API). A anon key é pública; **nunca** use a `service_role` no front-end.
4. **Vercel:** importe o repositório, preset "Other", sem build command.
5. Supabase → Authentication → URL Configuration: coloque a URL da Vercel em **Site URL** (e em Redirect URLs).

Para testar local, sirva a pasta com qualquer servidor estático (ex.: `npx serve`) ou abra `index.html` direto no navegador.

## Como estender

- **Nova página:** `pages/<nome>.html` + `js/pages/<nome>.js` (+ `css/pages/<nome>.css` importado em `css/style.css`).
- **Novo componente visual:** `css/components/<nome>.css` + `@import` em `css/style.css`.
- **Nova validação:** função em `Assprom.rules` (`js/core/validators.js`) e uso em `data-rules="required <regra>"`.
- **Nova máscara:** `Assprom.masks` (`js/core/masks.js`) e uso em `data-mask="<nome>"`.
- **Campo que desativa outro:** checkbox com `data-disables="id-do-campo"`.
- **Cores/fonte:** `css/base/variables.css`.
- Scripts são clássicos (sem `import`); ao migrar para Vite/React, dá para converter `Assprom.*` em módulos ES.

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
| 4 | **Turmas fixas no HTML** | Mudar turma exige editar o código. | Tabela `turmas` no Supabase e carregar no `<select>`. |
| 5 | **Aluno sem e-mail = sem recuperação de senha** | "Esqueci minha senha" não funciona para e-mail fictício. | Fluxo de redefinição pelo professor/admin, ou e-mail real (ver #1). |
| 6 | **Painel provisório** | `painel.html` só mostra o nome; a proteção de páginas é feita no cliente. | Quando houver dados sensíveis, proteger por RLS em cada tabela (o cliente nunca é a barreira). |
| 7 | **`config.js` com valores de exemplo** | Sem preencher URL/anon key, o cadastro/login mostram "Supabase ainda não configurado". | Preencher antes do deploy. |
| 8 | **Sem limite de tentativas próprio** | Dependemos do rate limit padrão do Supabase. | Ajustar em Authentication → Rate Limits; avaliar CAPTCHA. |
| 9 | **Sem LGPD completa** | Guardamos nome, nascimento e telefone; os termos são só uma caixinha. | Páginas reais de termos/privacidade; política de exclusão de dados. |
| 10 | **Supabase gratuito pausa por inatividade** | Projeto sem uso pode ser pausado. | Considerar plano pago antes de uso real. |

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
| 2026-10-30 | Aluno sem telefone não conseguia se cadastrar: caixinha "Não tenho telefone". |
