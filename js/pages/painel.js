/* Painel provisório: prova que login e sessão funcionam */
(function (A) {
  'use strict';
  A.auth.profile().then(function (p) {
    if (!p) { location.href = '../index.html'; return; }          // sem sessão: volta ao login
    document.getElementById('ola').textContent = 'Olá, ' + p.nome.split(' ')[0] + '!';
    document.getElementById('info').textContent =
      p.role === 'aluno' ? 'Aluno · matrícula ' + p.matricula + ' · ' + p.turma : 'Professor · ' + p.segmento;
  }).catch(function () { location.href = '../index.html'; });
  document.getElementById('sair').addEventListener('click', function () {
    A.auth.signOut().finally(function () { location.href = '../index.html'; });
  });
})(window.Assprom);
