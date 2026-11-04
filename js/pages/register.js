/* Páginas de cadastro (aluno e professor): a lógica vem do core */
(function (A) {
  'use strict';
  const form = document.getElementById('register-form');
  const role = form.dataset.role;                       // 'aluno' | 'professor'

  // Cadastro do aluno: a lista de turmas vem do Supabase (as que os professores criaram)
  if (role === 'aluno') {
    const sel = document.getElementById('turma');
    const msg = function (t) { sel.innerHTML = ''; const o = document.createElement('option'); o.value = ''; o.textContent = t; sel.appendChild(o); };
    Promise.resolve().then(function () { return A.db().rpc('turmas_abertas'); }).then(function (r) {
      if (r.error) throw r.error;
      if (!r.data.length) { msg('Nenhuma turma disponível ainda'); return; }
      msg('Selecione sua turma');
      r.data.forEach(function (t) { const o = document.createElement('option'); o.value = t.id; o.textContent = t.nome; sel.appendChild(o); });
    }).catch(function () { msg('Não foi possível carregar as turmas'); });
  }

  A.initForm(form, {
    onSubmit: async function (data) {
      if (role === 'aluno') data.turmaNome = document.getElementById('turma').selectedOptions[0].textContent;
      const res = await A.auth.signUp(role, data);
      if (res.session) await A.auth.signOut();          // cadastro não deixa logado: vai para o login
      A.notify(form, res.session
        ? 'Conta criada! Redirecionando para o login…'
        : 'Conta criada! Confirme seu e-mail para entrar.', 'success');
      if (res.session) setTimeout(function () { location.href = '../index.html?tipo=' + role; }, 1200);
    }
  });
})(window.Assprom);
