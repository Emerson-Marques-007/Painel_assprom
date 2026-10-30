/* ==========================================================
   ASSPROM - Página de login: abas Professor/Aluno + "Lembrar de mim"
   ========================================================== */
(function (A) {
  'use strict';

  const form = document.getElementById('login-form');
  const tabs = form.querySelector('.tabs');
  const idInput = document.getElementById('identifier');
  const remember = document.getElementById('remember');
  const STORAGE_KEY = 'assprom:login';

  // Tudo que muda entre as abas fica aqui. Para um novo perfil, adicione um item.
  const modes = {
    professor: {
      label: 'E-mail institucional',
      placeholder: 'nome@escola.org.br',
      type: 'email',
      icon: 'mail',
      rules: 'required email',
      required: 'Informe seu e-mail institucional.',
      hint: 'Acesse suas turmas, chamadas e relatórios.',
      signupText: 'Criar conta de professor',
      signupHref: 'pages/cadastro-professor.html'
    },
    aluno: {
      label: 'Matrícula ou e-mail',
      placeholder: '2024-0187',
      type: 'text',
      icon: 'id',
      rules: 'required loginid',
      required: 'Informe sua matrícula ou e-mail.',
      hint: 'Veja seu curso, sua frequência e escaneie a presença.',
      signupText: 'Criar conta de aluno',
      signupHref: 'pages/cadastro-aluno.html'
    }
  };

  function setMode(name, animate) {
    const m = modes[name];
    tabs.dataset.active = name;
    tabs.querySelectorAll('.tab').forEach(function (tab) {
      tab.setAttribute('aria-selected', String(tab.dataset.mode === name));
    });

    document.getElementById('identifier-label').textContent = m.label;
    idInput.placeholder = m.placeholder;
    idInput.type = m.type;
    idInput.dataset.rules = m.rules;
    idInput.dataset.required = m.required;
    form.querySelectorAll('[data-icon]').forEach(function (icon) {
      icon.hidden = icon.dataset.icon !== m.icon;
    });
    document.getElementById('form-hint').textContent = m.hint;
    const signup = document.getElementById('signup-link');
    signup.textContent = m.signupText;
    signup.href = m.signupHref;
    A.setError(idInput, '');
    A.setError(document.getElementById('password'), '');

    if (animate) {
      form.querySelectorAll('[data-swap]').forEach(function (el) {
        el.classList.remove('swap');
        void el.offsetWidth;
        el.classList.add('swap');
      });
    }
  }

  tabs.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () { setMode(tab.dataset.mode, true); });
  });

  // Aba inicial: ?tipo=aluno | ?tipo=professor (padrão: professor)
  const wanted = new URLSearchParams(location.search).get('tipo');
  setMode(modes[wanted] ? wanted : 'professor', false);

  // Restaura o "Lembrar de mim"
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && modes[saved.tipo]) {
      setMode(saved.tipo, false);
      idInput.value = saved.id || '';
      remember.checked = true;
    }
  } catch (e) { /* localStorage pode estar bloqueado; ignorar */ }

  A.initForm(form, {
    onValid: function () {
      try {
        if (remember.checked) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ tipo: tabs.dataset.active, id: idInput.value.trim() }));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) { /* ignorar */ }
    }
  });
})(window.Assprom);
