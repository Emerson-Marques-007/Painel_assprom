/* Compartilhar turma (ou um aluno) com outros professores */
(function (A) {
  'use strict';
  const h = A.h, S = A.store, $ = function (id) { return document.getElementById(id); };
  const params = new URLSearchParams(location.search);
  const turmaId = params.get('turma');
  const NIVEIS = [['editar', 'Pode editar'], ['comentar', 'Pode comentar'], ['ver', 'Só ver']];
  const VISIB = [
    ['privada', 'lock', 'Privada', 'Só você'],
    ['professores', 'turmas', 'Professores', 'Quem tem acesso à turma'],
    ['aluno', 'eye', 'Aluno e família', 'Todos podem ver']
  ];
  let turma = null, cfg = null, dono = 'Você', salvos = [];

  const isoParaBr = function (iso) { const p = (iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : ''; };
  const ico = function (el, nome) { el.innerHTML = A.icon(nome); return el; };
  const btn = function (cls, nome, titulo, onclick) {
    return ico(h('button', { type: 'button', class: cls, title: titulo, 'aria-label': titulo, onclick: onclick }), nome);
  };

  function escopo() {
    const box = $('escopo'); box.innerHTML = '';
    const alunoSel = turma.alunos.filter(function (a) { return a.id === cfg.alunoId; })[0];
    [['turma', 'turmas', 'Turma inteira', turma.nome + ' · ' + turma.qtdAlunos + ' alunos'],
     ['aluno', 'user', 'Só um aluno', alunoSel ? alunoSel.nome : 'Escolha um aluno']].forEach(function (o) {
      const b = h('button', { type: 'button', class: 'opt' + (cfg.escopo === o[0] ? ' is-on' : ''), role: 'radio', 'aria-checked': String(cfg.escopo === o[0]),
        onclick: function () {
          cfg.escopo = o[0];
          if (o[0] === 'aluno' && !cfg.alunoId && turma.alunos.length) cfg.alunoId = turma.alunos[0].id;
          escopo();
        } },
        h('span', { class: 'opt__ico' }), h('strong', { text: o[2] }), h('small', { text: o[3] }));
      b.querySelector('.opt__ico').innerHTML = A.icon(o[1]);
      box.appendChild(b);
    });
    $('linha-aluno').hidden = cfg.escopo !== 'aluno';
    const sel = $('aluno-sel'); sel.innerHTML = '';
    turma.alunos.forEach(function (a) { sel.appendChild(h('option', { value: a.id, text: a.nome, selected: a.id === cfg.alunoId })); });
  }

  function acessos() {
    const ul = $('acessos'); ul.innerHTML = '';
    ul.appendChild(h('li', { class: 'list__row' },
      h('span', { class: 'avatar ' + A.avatarClass(dono), text: A.initials(dono) }),
      h('span', { class: 'list__main' }, h('strong', { text: dono }), h('small', { text: 'Você · proprietária' })),
      h('span', { class: 'badge badge--up', text: 'Proprietária' })));
    cfg.acessos.forEach(function (p, i) {
      const sel = h('select', { class: 'level', 'aria-label': 'Permissão de ' + p.nome,
        onchange: function (e) { p.nivel = e.target.value; } },
        ...NIVEIS.map(function (n) { return h('option', { value: n[0], text: n[1], selected: n[0] === p.nivel }); }));
      ul.appendChild(h('li', { class: 'list__row' },
        h('span', { class: 'avatar ' + A.avatarClass(p.nome), text: A.initials(p.nome) }),
        h('span', { class: 'list__main' }, h('strong', { text: p.nome }), h('small', { text: p.segmento })),
        sel,
        btn('round-btn round-btn--danger', 'trash', 'Remover acesso de ' + p.nome, function () { cfg.acessos.splice(i, 1); acessos(); })));
    });
    $('parar').disabled = !cfg.acessos.length;
    const dl = $('lista-profs'); dl.innerHTML = '';
    S.PROFESSORES.filter(function (p) { return !cfg.acessos.some(function (x) { return x.nome === p.nome; }); })
      .forEach(function (p) { dl.appendChild(h('option', { value: p.nome, label: p.segmento + ' · ' + p.email })); });
  }

  function temporario() {
    const t = cfg.temporario, sw = $('temp-switch');
    sw.setAttribute('aria-checked', String(t.ativo));
    $('temp-info').textContent = t.ativo ? (t.ate ? 'Termina em ' + isoParaBr(t.ate) : 'Escolha a data de término') : 'Sem data de término';
    $('temp-data').hidden = !t.ativo; $('temp-data').value = t.ate || '';
  }

  function visibilidade() {
    const box = $('visib'); box.innerHTML = '';
    VISIB.forEach(function (v) {
      const b = h('button', { type: 'button', class: 'opt' + (cfg.observacoes === v[0] ? ' is-on' : ''), role: 'radio', 'aria-checked': String(cfg.observacoes === v[0]),
        onclick: function () { cfg.observacoes = v[0]; visibilidade(); } },
        h('span', { class: 'opt__ico' }), h('span', { class: 'opt__t' }, h('strong', { text: v[2] }), h('small', { text: v[3] })));
      b.querySelector('.opt__ico').innerHTML = A.icon(v[1]); box.appendChild(b);
    });
  }

  function atividade() {
    const ol = $('atividade'); ol.innerHTML = '';
    if (!cfg.atividade.length) ol.appendChild(h('li', {}, h('small', { text: 'Nenhuma atividade ainda.' })));
    cfg.atividade.slice(0, 6).forEach(function (a) { ol.appendChild(h('li', {}, h('strong', { text: a.texto }), h('small', { text: a.quando }))); });
  }

  function desenhar() { escopo(); acessos(); temporario(); visibilidade(); atividade(); }

  // "joana.lima@escola.org" -> "Joana Lima"
  function nomeDoEmail(t) {
    return t.split('@')[0].split(/[._-]+/).filter(Boolean).map(function (s) { return s[0].toUpperCase() + s.slice(1); }).join(' ');
  }

  function convidar(e) {
    e.preventDefault();
    const campo = $('convite-nome'), erro = $('convite-erro'), txt = campo.value.trim();
    erro.hidden = true;
    const falha = function (m) { erro.textContent = m; erro.hidden = false; };
    if (!txt) return falha('Digite o nome ou o e-mail do professor.');
    const q = A.semAcento(txt);
    const conhecido = S.PROFESSORES.filter(function (p) { return A.semAcento(p.nome) === q || p.email === q || A.semAcento(p.nome).indexOf(q) === 0; })[0];
    const nome = conhecido ? conhecido.nome : (txt.indexOf('@') !== -1 ? nomeDoEmail(txt) : txt);
    if (A.semAcento(nome) === A.semAcento(dono)) return falha('Você já é a proprietária desta turma.');
    if (cfg.acessos.some(function (p) { return A.semAcento(p.nome) === A.semAcento(nome); })) return falha('Esse professor já tem acesso.');
    cfg.acessos.push({ nome: nome, segmento: conhecido ? conhecido.segmento : 'Convite pendente', nivel: 'ver' });
    campo.value = ''; acessos();
  }

  function salvar() {
    const t = cfg.temporario;
    if (t.ativo && (!t.ate || t.ate < new Date().toISOString().slice(0, 10))) { A.toast('Escolha uma data de término no futuro'); return; }
    if (cfg.escopo === 'aluno' && !cfg.alunoId) { A.toast('Escolha o aluno a compartilhar'); return; }
    cfg.acessos.forEach(function (p) {
      if (salvos.indexOf(p.nome) === -1) cfg.atividade.unshift({ texto: 'Você compartilhou com Prof. ' + p.nome.split(' ')[0], quando: 'agora' });
    });
    S.saveShare(turma.id, cfg).then(function () {
      salvos = cfg.acessos.map(function (p) { return p.nome; });
      atividade(); A.toast('Acesso salvo');
    });
  }

  function parar() {
    A.modal.confirm({ title: 'Parar de compartilhar?', message: 'Os ' + cfg.acessos.length + ' professores deixam de ter acesso a ' + (cfg.escopo === 'aluno' ? 'este aluno' : 'esta turma') + '. Você continua como proprietária.',
      confirmLabel: 'Parar de compartilhar', danger: true }).then(function (sim) {
      if (!sim) return;
      cfg.acessos = []; cfg.atividade.unshift({ texto: 'Você parou de compartilhar', quando: 'agora' });
      S.saveShare(turma.id, cfg).then(function () { salvos = []; desenhar(); A.toast('Compartilhamento encerrado'); });
    });
  }

  A.shell.mount('turmas').then(function (perfil) {
    dono = perfil.nome;
    return S.getTurma(turmaId);
  }).then(function (t) {
    if (!t) { location.replace('turmas.html'); return; }
    turma = t;
    return S.getShare(t.id);
  }).then(function (c) {
    if (!c) return;
    cfg = c; salvos = cfg.acessos.map(function (p) { return p.nome; });
    const alvo = params.get('aluno');
    if (alvo && turma.alunos.some(function (a) { return a.id === alvo; })) { cfg.escopo = 'aluno'; cfg.alunoId = alvo; }
    $('crumb').textContent = turma.nome; $('crumb').href = 'turma.html?id=' + encodeURIComponent(turma.id);
    document.title = 'Compartilhar ' + turma.nome + ' | ASSPROM';
    ico($('ico-parar'), 'trash'); ico($('ico-lock'), 'lock'); ico($('ico-clock'), 'clock');
    $('aluno-sel').addEventListener('change', function (e) { cfg.alunoId = e.target.value; escopo(); });
    $('convite').addEventListener('submit', convidar);
    $('temp-switch').addEventListener('click', function () {
      cfg.temporario.ativo = !cfg.temporario.ativo;
      if (cfg.temporario.ativo && !cfg.temporario.ate) cfg.temporario.ate = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
      temporario();
    });
    $('temp-data').addEventListener('change', function (e) { cfg.temporario.ate = e.target.value; temporario(); });
    $('parar').addEventListener('click', parar);
    $('salvar').addEventListener('click', salvar);
    $('cancelar').addEventListener('click', function () { location.href = 'turma.html?id=' + encodeURIComponent(turma.id); });
    desenhar();
  });
})(window.Assprom);
