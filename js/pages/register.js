/* Páginas de cadastro (aluno e professor): a lógica vem do core */
(function (A) {
  'use strict';
  const form = document.getElementById('register-form');
  const role = form.dataset.role;                       // 'aluno' | 'professor'

  A.initForm(form, {
    onSubmit: async function (data) {
      const res = await A.auth.signUp(role, data);
      if (res.session) await A.auth.signOut();          // cadastro não deixa logado: vai para o login
      A.notify(form, res.session
        ? 'Conta criada! Redirecionando para o login…'
        : 'Conta criada! Confirme seu e-mail para entrar.', 'success');
      if (res.session) setTimeout(function () { location.href = '../index.html?tipo=' + role; }, 1200);
    }
  });
})(window.Assprom);
