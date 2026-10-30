# ASSPROM — Telas de acesso

Abra `index.html` no navegador (funciona direto do disco, sem servidor).

## Estrutura

```
assprom/
├── index.html                    Login (abas Professor / Aluno; ?tipo=aluno abre no aluno)
├── pages/
│   ├── cadastro-aluno.html
│   └── cadastro-professor.html
├── assets/
│   └── img/                      logo.png, pattern-tile.png
├── css/
│   ├── style.css                 Só importa os demais (a ordem importa)
│   ├── base/                     variables.css (cores/fonte), reset.css
│   ├── layout/                   auth-layout.css (2 painéis + padrão animado)
│   ├── components/               field, actions (botão), tabs, notice
│   └── pages/                    register.css (estilos só do cadastro)
└── js/
    ├── core/                     ui, validators, masks, form (reutilizáveis)
    └── pages/                    login.js, register.js (1 arquivo por página)
```

## Como estender

- **Nova página:** crie `pages/<nome>.html`, `js/pages/<nome>.js` (e `css/pages/<nome>.css`, se precisar, importando em `css/style.css`).
- **Novo componente visual:** `css/components/<nome>.css` + `@import` em `css/style.css`.
- **Nova validação:** adicione uma função em `Assprom.rules` (`js/core/validators.js`) e use em `data-rules="required <regra>"`.
- **Nova máscara:** `Assprom.masks` (`js/core/masks.js`) e use em `data-mask="<nome>"`.
- **Cores/fonte:** `css/base/variables.css` (ex.: `--bg-panel` é o fundo do painel direito).
- **Back-end:** procure os `TODO` em `js/core/form.js` (envio) e `js/pages/login.js`.
- Os scripts são clássicos (sem `import`) para abrir direto pelo `file://`; ao migrar para Vite/React, dá para converter `Assprom.*` em módulos ES.
