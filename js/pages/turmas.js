/* Lista de turmas do professor */
(function (A) {
  'use strict';
  const h = A.h, S = A.store, $ = function (id) { return document.getElementById(id); };
  const FILTROS = [['todas', 'Todas'], ['capacitacao', 'Capacitação'], ['integracao', 'Integração'], ['aprendizagem', 'Aprendizagem']];
  let turmas = [], filtro = 'todas';

  const corFreq = function (f) { return f === null ? '' : f >= 90 ? 'freq--good' : f >= 80 ? 'freq--warn' : 'freq--bad'; };
  const icone = function (cls, nome, titulo, onclick) {
    const b = h('button', { type: 'button', class: cls, title: titulo, 'aria-label': titulo, onclick: onclick });
    b.innerHTML = A.icon(nome); return b;
  };

  function cartao(t, i) {
    const pct = Math.round(t.diaAtual / t.total * 100);
    const card = h('article', { class: 'tcard', style: 'animation-delay:' + (i * 40) + 'ms' },
      h('div', { class: 'tcard__head' },
        h('span', { class: 'sigla', text: t.sigla }),
        h('div', { class: 'tcard__name' }, h('strong', { text: t.nome }), h('small', { text: t.regra })),
        h('div', { class: 'tcard__btns' },
          icone('round-btn', 'edit', 'Editar ' + t.nome, function () { A.turmaForm(t, turmas, recarregar); }),
          icone('round-btn round-btn--danger', 'trash', 'Apagar ' + t.nome, function () { apagar(t); }))),
      h('div', { class: 'tcard__prog' },
        h('span', { class: 'tag tag--' + t.segmento, text: t.segmentoNome }),
        h('span', { text: t.unidade + ' ' + t.diaAtual + ' de ' + t.total })),
      h('div', { class: 'track', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': t.total, 'aria-valuenow': t.diaAtual },
        h('i', { style: 'width:' + pct + '%' })),
      h('div', { class: 'tcard__stats' },
        h('div', { class: 'mini' }, h('small', { text: 'Alunos' }), h('strong', { text: String(t.qtdAlunos) })),
        h('div', { class: 'mini' }, h('small', { text: 'Frequência' }),
          h('strong', { class: corFreq(t.freq), text: t.freq === null ? '—' : t.freq + '%' }))),
      h('div', { class: 'tcard__foot' },
        t.alunos.length
          ? h('div', { class: 'stack' }, ...t.alunos.slice(0, 3).map(function (a) {
              return h('span', { class: 'avatar av-0', title: a.nome, text: A.initials(a.nome) }); }))
          : h('span', { class: 'stack__none', text: 'Sem alunos ainda' }),
        h('a', { class: 'pill pill--solid', href: 'turma.html?id=' + encodeURIComponent(t.id), text: 'Abrir turma' })));
    return card;
  }

  function render() {
    $('resumo').textContent = turmas.length === 1 ? '1 turma em andamento' : turmas.length + ' turmas em andamento';
    $('filtros').innerHTML = '';
    FILTROS.forEach(function (f) {
      $('filtros').appendChild(h('button', {
        type: 'button', class: 'chip' + (filtro === f[0] ? ' is-on' : ''), 'aria-pressed': String(filtro === f[0]), text: f[1],
        onclick: function () { filtro = f[0]; render(); }
      }));
    });
    const lista = turmas.filter(function (t) { return filtro === 'todas' || t.segmento === filtro; });
    const box = $('turmas'); box.innerHTML = '';
    if (!lista.length) {
      box.appendChild(h('p', { class: 'empty-block', text: turmas.length ? 'Nenhuma turma neste segmento.' : 'Você ainda não tem turmas. Toque em "Nova turma" para criar a primeira.' }));
      return;
    }
    lista.forEach(function (t, i) { box.appendChild(cartao(t, i)); });
  }

  function recarregar() {
    return S.listTurmas().then(function (l) {
      turmas = l; render();
      const b = document.getElementById('nav-turmas'); if (b) b.textContent = l.length;
    });
  }

  function apagar(t) {
    A.modal.confirm({
      title: 'Apagar ' + t.nome + '?',
      message: 'Os ' + t.qtdAlunos + ' alunos e o histórico de presenças desta turma também serão apagados. Isso não pode ser desfeito.',
      confirmLabel: 'Apagar turma', danger: true
    }).then(function (sim) {
      if (sim) S.deleteTurma(t.id).then(function () { A.toast('Turma apagada'); return recarregar(); });
    });
  }

  A.shell.mount('turmas').then(function () {
    $('nova').addEventListener('click', function () { A.turmaForm(null, turmas, recarregar); });
    return recarregar();
  }).then(function () {
    if (new URLSearchParams(location.search).has('nova')) {          // veio do atalho "Nova turma" do dashboard
      history.replaceState(null, '', location.pathname);
      A.turmaForm(null, turmas, recarregar);
    }
  });
})(window.Assprom);
