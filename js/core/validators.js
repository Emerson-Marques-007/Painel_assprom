/* ==========================================================
   ASSPROM - Regras de validação (use em data-rules="required email ...")
   Para criar uma regra nova: adicione uma função em A.rules que
   devolva '' (ok) ou a mensagem de erro.
   ========================================================== */
(function (A) {
  'use strict';

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  A.rules = {
    required: function (input) {
      const empty = input.type === 'checkbox' ? !input.checked : !input.value.trim();
      return empty ? (input.dataset.required || 'Preencha este campo.') : '';
    },
    email: function (input) {
      return EMAIL.test(input.value.trim()) ? '' : 'Digite um e-mail válido.';
    },
    // Login do aluno: matrícula (2024-0187) ou e-mail
    loginid: function (input) {
      const v = input.value.trim();
      if (v.includes('@')) return EMAIL.test(v) ? '' : 'Digite um e-mail válido.';
      return /^\d{4}-\d{4}$/.test(v) ? '' : 'Use a matrícula (2024-0187) ou um e-mail válido.';
    },
    matricula: function (input) {
      return /^\d{4}-\d{4}$/.test(input.value) ? '' : 'Use o formato 2024-0000.';
    },
    date: function (input) {
      const m = input.value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!m) return 'Use o formato dd/mm/aaaa.';
      const d = new Date(+m[3], +m[2] - 1, +m[1]);
      const real = d.getFullYear() === +m[3] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[1];
      return real && d <= new Date() ? '' : 'Data inválida.';
    },
    phone: function (input) {
      const n = input.value.replace(/\D/g, '').length;
      return n === 10 || n === 11 ? '' : 'Digite o telefone com DDD.';
    },
    min6: function (input) {
      return input.value.length >= 6 ? '' : 'A senha deve ter pelo menos 6 caracteres.';
    },
    match: function (input) {
      const other = document.getElementById(input.dataset.match);
      return input.value === other.value ? '' : 'As senhas não conferem.';
    }
  };

  // Roda as regras do campo na ordem e mostra a primeira mensagem de erro
  A.validateInput = function (input) {
    const list = (input.dataset.rules || '').split(' ').filter(Boolean);
    for (let i = 0; i < list.length; i++) {
      const name = list[i];
      // Formato só é checado se houver conteúdo (o "required" cuida do vazio)
      if (name !== 'required' && input.type !== 'checkbox' && !input.value.trim()) continue;
      const message = A.rules[name](input);
      if (message) { A.setError(input, message); return false; }
    }
    A.setError(input, '');
    return true;
  };

  A.validateAll = function (form) {
    let ok = true;
    form.querySelectorAll('[data-rules]').forEach(function (input) {
      if (!A.validateInput(input)) ok = false;
    });
    return ok;
  };
})(window.Assprom);
