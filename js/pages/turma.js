/* Página de uma turma: resumo, tabela de alunos e janela do aluno */
(function (A) {
  'use strict';
  const h = A.h, S = A.store, esc = A.esc, $ = function (id) { return document.getElementById(id); };
  const params = new URLSearchParams(location.search);
  const turmaId = params.get('id');

  let turma = null, filtro = 'todos', busca = '';
  const wins = {};          // alunoId -> { tab, pos }
  const mins = {};          // alunoId -> true quando minimizada
  let ativa = null;         // aluno da janela aberta
  let winEl = null;

  const STATUS = { ok: ['Em dia', 'badge--ok'], atencao: ['Atenção', 'badge--warn'], risco: ['Risco', 'badge--risk'] };
  const VISIB = { privada: 'privada', professores: 'só professores', aluno: 'aluno e família' };
  function iniAutor(o) {
    if (o.autorNome) return A.initials(o.autorNome);
    const autor = o.autor;
    if (autor === 'Você') return A.initials(A.perfil.nome);
    const nome = autor.replace(/^Profa?\.\s*/, '');
    const p = S.PROFESSORES.filter(function (x) { return x.nome.split(' ')[0] === nome.split(' ')[0]; })[0];
    return A.initials(p ? p.nome : nome);
  }
  function corAutor(o) {
    if (o.autorNome) return A.avatarClass(o.autorNome);
    const autor = o.autor;
    if (autor === 'Você') return A.avatarClass(A.perfil.nome);
    const nome = autor.replace(/^Profa?\.\s*/, '');
    const p = S.PROFESSORES.filter(function (x) { return x.nome.split(' ')[0] === nome.split(' ')[0]; })[0];
    return A.avatarClass(p ? p.nome : nome);
  }
  const aluno = function (id) { return turma.alunos.filter(function (a) { return a.id === id; })[0]; };
  const btn = function (cls, nome, titulo, onclick) {
    const b = h('button', { type: 'button', class: cls, title: titulo, 'aria-label': titulo, onclick: onclick });
    b.innerHTML = A.icon(nome); return b;
  };

  // ---------- cabeçalho e resumo ----------
  function cabecalho() {
    const t = turma;
    $('crumb').textContent = t.nome;
    $('sigla').textContent = t.sigla;
    $('titulo').textContent = t.nome;
    $('sub').textContent = t.segmentoNome + ' · ' + t.qtdAlunos + (t.qtdAlunos === 1 ? ' aluno' : ' alunos') + ' · ' + t.regra;
    document.title = t.nome + ' | ASSPROM';
    $('editar').hidden = !t.souDono; $('apagar').hidden = !t.souDono;
    const mini = function (ico, cls, rotulo, valor) {
      const c = h('div', { class: 'minicard' }, h('span', { class: 'minicard__ico ' + cls }), h('div', {}, h('small', { text: rotulo }), h('strong', { text: valor })));
      c.querySelector('.minicard__ico').innerHTML = A.icon(ico); return c;
    };
    const m = $('minis'); m.innerHTML = '';
    m.appendChild(mini('calendario', '', t.unidade + ' atual', t.diaAtual + ' de ' + t.total));
    m.appendChild(mini('pulse', '', 'Frequência hoje', t.freqHoje === null ? '—' : t.freqHoje + '%'));
    m.appendChild(mini('alert', 'minicard__ico--red', 'Em risco', String(t.emRisco)));
  }

  // ---------- tabela ----------
  function linhas() {
    const q = A.semAcento(busca.trim());
    return turma.alunos.filter(function (a) {
      return (filtro === 'todos' || a.status === filtro) && (!q || A.semAcento(a.nome).indexOf(q) !== -1);
    });
  }

  function tabela() {
    const t = turma, box = $('tabela'); box.innerHTML = '';
    const pontos = t.total <= 12;
    box.appendChild(h('div', { class: 'tr tr--head', role: 'row' },
      h('span', { text: 'Aluno' }), h('span', { text: pontos ? t.unidade + 's 1 a ' + t.total : t.unidade + 's' }),
      h('span', { text: 'Freq.' }), h('span', { text: 'Status' }), h('span')));
    const lista = linhas();
    if (!lista.length) box.appendChild(h('div', { class: 'tr--empty', text: 'Nenhum aluno encontrado.' }));
    lista.forEach(function (a) {
      const st = STATUS[a.status];
      const mid = pontos
        ? h('div', { class: 'dots', 'aria-label': 'Presença por dia' }, ...a.presencas.map(function (p, i) {
            const nomes = { p: 'presente', f: 'faltou', h: 'hoje', x: i + 1 < t.diaAtual ? 'sem registro' : 'ainda não chegou' };
            return h('i', { class: 'dot dot--' + p, title: t.unidade + ' ' + (i + 1) + ': ' + nomes[p] });
          }))
        : h('span', { class: 'tr__sumario', text: a.presencas.filter(function (p) { return p === 'p'; }).length + ' presenças · ' + a.faltas + ' faltas' });
      const row = h('div', { class: 'tr tr--row' + (ativa === a.id ? ' is-open' : ''), role: 'row', tabindex: 0, 'data-id': a.id,
          onclick: function () { abrirJanela(a.id); },
          onkeydown: function (e) { if (e.key === 'Enter') abrirJanela(a.id); } },
        h('div', { class: 'tr__who' }, h('span', { class: 'avatar av-0', text: A.initials(a.nome) }), h('span', { text: a.nome })),
        mid,
        h('span', { class: 'tr__freq', text: a.freq === null ? '—' : a.freq + '%' }),
        h('span', { class: 'badge ' + st[1], text: st[0] }),
        h('div', { class: 'tr__acts' },
          btn('round-btn', 'edit', 'Editar ' + a.nome, function (e) { e.stopPropagation(); editarAluno(a); }),
          btn('round-btn round-btn--danger', 'trash', 'Remover ' + a.nome, function (e) { e.stopPropagation(); removerAluno(a); })));
      box.appendChild(row);
    });
  }

  function filtros() {
    const box = $('filtros'); box.innerHTML = '';
    [['todos', 'Todos'], ['atencao', 'Atenção'], ['risco', 'Risco']].forEach(function (f) {
      box.appendChild(h('button', { type: 'button', class: 'chip' + (filtro === f[0] ? ' is-on' : ''), 'aria-pressed': String(filtro === f[0]), text: f[1],
        onclick: function () { filtro = f[0]; filtros(); tabela(); } }));
    });
  }

  // ---------- ações de aluno ----------
  function editarAluno(a) {
    A.modal.form({
      title: 'Editar aluno', submitLabel: 'Salvar',
      fields: [
        { name: 'nome', label: 'Nome completo', required: true, value: a.nome },
        { name: 'matricula', label: 'Matrícula', required: true, value: a.matricula },
        { name: 'telefone', label: 'Telefone', value: a.telefone || '', placeholder: '(31) 90000-0000', hint: 'Deixe em branco se o aluno não tem telefone.' }
      ],
      onSubmit: function (v) {
        return S.saveAluno(a.id, { nome: v.nome.trim(), matricula: v.matricula.trim(), telefone: v.telefone.trim() || null })
          .then(function () { A.toast('Aluno atualizado'); return recarregar(); });
      }
    });
  }
  function removerAluno(a) {
    A.modal.confirm({ title: 'Remover ' + a.nome + '?', message: 'O aluno sai da turma ' + turma.nome + ' e o histórico de presenças dele é apagado. Isso não pode ser desfeito.',
      confirmLabel: 'Remover aluno', danger: true }).then(function (sim) {
      if (!sim) return;
      S.removeAluno(a.id).then(function () { delete wins[a.id]; delete mins[a.id]; if (ativa === a.id) ativa = null; A.toast('Aluno removido'); return recarregar(); }, function (e) { A.toast(e.message); });
    });
  }

  // ---------- janelas do aluno ----------
  function abrirJanela(id) {
    if (ativa && ativa !== id) mins[ativa] = true;
    wins[id] = wins[id] || { tab: 'resumo', pos: null };
    delete mins[id]; ativa = id;
    janelas(); tabela();
  }
  function minimizar(id) { mins[id] = true; if (ativa === id) ativa = null; janelas(); tabela(); }
  function fechar(id) { delete wins[id]; delete mins[id]; if (ativa === id) ativa = null; janelas(); tabela(); }

  function janelas() {
    const dock = $('dock'); dock.innerHTML = '';
    Object.keys(wins).forEach(function (id) {
      const a = aluno(id); if (!a) { delete wins[id]; delete mins[id]; return; }
      if (!mins[id]) return;
      dock.appendChild(h('div', { class: 'pillwin', role: 'button', tabindex: 0, title: 'Reabrir ' + a.nome,
          onclick: function () { abrirJanela(id); }, onkeydown: function (e) { if (e.key === 'Enter') abrirJanela(id); } },
        h('span', { class: 'avatar ' + A.avatarClass(a.nome), text: A.initials(a.nome) }),
        h('span', { text: a.nome }),
        h('button', { type: 'button', class: 'pillwin__x', 'aria-label': 'Fechar ' + a.nome, text: '×',
          onclick: function (e) { e.stopPropagation(); fechar(id); } })));
    });
    if (winEl) { winEl.remove(); winEl = null; }
    document.querySelector('.main').classList.toggle('has-window', Boolean(ativa && aluno(ativa)));
    if (ativa && aluno(ativa)) { winEl = construirJanela(aluno(ativa)); document.body.appendChild(winEl); }
  }

  const ABAS = [['resumo', 'Resumo'], ['conteudos', 'Conteúdos'], ['frequencia', 'Frequência'], ['obs', 'Observações'], ['contato', 'Contato']];

  function construirJanela(a) {
    const w = wins[a.id], st = STATUS[a.status];
    const el = h('section', { class: 'win', role: 'dialog', 'aria-label': 'Janela do aluno ' + a.nome });
    if (w.pos) { el.style.left = w.pos.left + 'px'; el.style.top = w.pos.top + 'px'; el.style.right = 'auto'; }

    const bar = h('div', { class: 'win__bar' }, h('span', { class: 'win__grip' }), h('span', { class: 'win__bar-title', text: 'Janela do aluno' }),
      btn('win__btn', 'minus', 'Minimizar', function () { minimizar(a.id); }),
      btn('win__btn', 'close', 'Fechar', function () { fechar(a.id); }));
    bar.querySelector('.win__grip').innerHTML = A.icon('grip');
    arrastar(el, bar, a.id);

    const quem = h('div', { class: 'win__who' },
      h('span', { class: 'win__avatar', text: A.initials(a.nome) }),
      h('div', { class: 'win__id' }, h('strong', { text: a.nome }), h('small', { text: turma.nome + ' · Matrícula ' + a.matricula })),
      h('div', { class: 'win__state' }, h('span', { class: 'badge ' + st[1], text: st[0] }),
        a.vistoPor ? h('span', { class: 'live', text: a.vistoPor + ' vendo' }) : null));

    const abas = h('div', { class: 'win__tabs', role: 'tablist' }, ...ABAS.map(function (t) {
      return h('button', { type: 'button', role: 'tab', class: 'win__tab' + (w.tab === t[0] ? ' is-on' : ''), 'aria-selected': String(w.tab === t[0]), text: t[1],
        onclick: function () { w.tab = t[0]; janelas(); } });
    }));
    const corpo = h('div', { class: 'win__body' });
    corpo.innerHTML = ({ resumo: abaResumo, conteudos: abaConteudos, frequencia: abaFrequencia, obs: abaObs, contato: abaContato })[w.tab](a);
    el.appendChild(bar); el.appendChild(quem); el.appendChild(abas); el.appendChild(corpo);
    ligarAba(el, a);
    return el;
  }

  function arrastar(el, bar, id) {
    bar.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button') || window.innerWidth <= 700) return;
      const r = el.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
      el.classList.add('is-dragging'); bar.setPointerCapture(e.pointerId);
      function mover(ev) {
        const left = Math.min(Math.max(0, ev.clientX - dx), window.innerWidth - r.width);
        const top = Math.min(Math.max(0, ev.clientY - dy), window.innerHeight - 49);
        el.style.left = left + 'px'; el.style.top = top + 'px'; el.style.right = 'auto';
        wins[id].pos = { left: left, top: top };
      }
      function soltar() { el.classList.remove('is-dragging'); bar.removeEventListener('pointermove', mover); bar.removeEventListener('pointerup', soltar); bar.removeEventListener('pointercancel', soltar); }
      bar.addEventListener('pointermove', mover); bar.addEventListener('pointerup', soltar); bar.addEventListener('pointercancel', soltar);
    });
  }

  // estado textual de um dia para o aluno
  function estadoDia(a, n) {
    const p = a.presencas[n - 1];
    if (p === 'p') return ['p', n === turma.diaAtual ? 'Presente hoje' : 'Presente'];
    if (p === 'f') return ['f', 'Faltou'];
    if (p === 'h') return ['h', 'Hoje'];
    return ['x', n < turma.diaAtual ? 'Sem registro' : n === turma.diaAtual + 1 ? 'Amanhã' : S.dm(S.dataDoDia(turma, n))];
  }

  function abaResumo(a) {
    const t = turma, dias = [];
    let terceiro;
    if (t.segmento === 'capacitacao') {
      const d = S.addDiasUteis(new Date(), t.total - t.diaAtual);
      terceiro = ['Avaliação', S.DIAS[d.getDay()], S.dm(d) + ' · 08:00', ''];
    } else {
      const resta = t.total - t.diaAtual;
      terceiro = ['Restam', String(resta), resta === 1 ? t.unidade.toLowerCase() : t.unidade.toLowerCase() + 's', ''];
    }
    const conteudoAtual = t.segmento === 'integracao' ? 'Integração ' + t.variante : S.conteudoDoDia(t, t.diaAtual);
    let cursoHtml = '';
    if (t.segmento === 'aprendizagem') {
      cursoHtml = '<div class="modules">' + S.MODULOS_APR.map(function (m) {
        const tot = m.ate - m.de + 1;
        const feitas = a.presencas.slice(m.de - 1, m.ate).filter(function (p) { return p === 'p'; }).length;
        return '<div><div class="modules__h"><span>' + esc(m.nome) + '</span><span>' + feitas + ' de ' + tot + '</span></div>' +
          '<div class="track"><i style="width:' + Math.round(feitas / tot * 100) + '%"></i></div></div>';
      }).join('') + '</div>';
    } else {
      for (let n = 1; n <= t.total; n++) {
        const e = estadoDia(a, n);
        const nome = t.segmento === 'capacitacao' ? (n === 5 ? 'Aval.' : S.CONTEUDOS_CAP[n - 1]) : 'Dia ' + n;
        dias.push('<div class="step"><span class="step__n step__n--' + e[0] + '">' + n + '</span><strong>' + esc(nome) + '</strong><small>' + esc(e[1]) + '</small></div>');
      }
      cursoHtml = '<div class="steps">' + dias.join('') + '</div>';
    }
    const o = a.observacoes[0];
    const obsHtml = o
      ? '<div class="obs"><span class="avatar ' + corAutor(o) + '">' + esc(iniAutor(o)) + '</span><div><small>' + esc(o.autor) + ' · ' + esc(o.data) + ' · ' + VISIB[o.visibilidade] + '</small><p>' + esc(o.texto) + '</p></div></div>'
      : '<div class="obs"><div><small>Observações</small><p>Nenhuma observação ainda.</p></div></div>';
    return '<div class="trio">' +
      '<div class="trio__c"><small>' + t.unidade + ' atual</small><strong>' + t.diaAtual + ' de ' + t.total + '</strong><em>' + esc(conteudoAtual) + '</em></div>' +
      '<div class="trio__c"><small>Frequência</small><strong>' + (a.freq === null ? '—' : a.freq + '%') + '</strong>' +
        (a.faltas ? '<em class="bad">' + a.faltas + (a.faltas === 1 ? ' falta' : ' faltas') + '</em>' : '<em>Sem faltas</em>') + '</div>' +
      '<div class="trio__c"><small>' + terceiro[0] + '</small><strong>' + esc(terceiro[1]) + '</strong><em>' + esc(terceiro[2]) + '</em></div></div>' +
      '<h3 class="sec">Conteúdos do curso</h3>' + cursoHtml + obsHtml +
      '<div class="win__foot">' +
        '<button class="pill pill--solid" type="button" data-act="compartilhar">' + A.icon('share') + 'Compartilhar</button>' +
        '<button class="pill" type="button" data-act="obs">Observação</button><span class="spacer"></span>' +
        '<button class="round-btn" type="button" data-act="editar" title="Editar aluno" aria-label="Editar aluno">' + A.icon('edit') + '</button>' +
        '<button class="round-btn round-btn--danger" type="button" data-act="remover" title="Remover aluno da turma" aria-label="Remover aluno da turma">' + A.icon('trash') + '</button></div>';
  }

  function abaConteudos(a) {
    let li = '';
    for (let n = 1; n <= turma.total; n++) {
      const e = estadoDia(a, n), cls = { p: 'badge--ok', f: 'badge--risk', h: 'tag', x: 'tag' }[e[0]];
      const nome = turma.segmento === 'integracao' ? 'Dia ' + n : 'Dia ' + n + ' · ' + S.conteudoDoDia(turma, n);
      li += '<li><span>' + esc(nome) + '</span><span class="badge ' + cls + '">' + esc(e[1]) + '</span></li>';
    }
    return '<ul class="rows">' + li + '</ul>';
  }

  function abaFrequencia(a) {
    let li = '';
    for (let n = 1; n <= turma.diaAtual; n++) {
      const p = a.presencas[n - 1], d = S.dm(S.dataDoDia(turma, n));
      const quando = p === 'p' ? 'Presente' : p === 'f' ? 'Falta' : n < turma.diaAtual ? 'Sem registro' : 'Aguardando QR';
      li += '<li><span>' + t2(n) + ' · ' + d + '</span><span class="badge ' + (p === 'p' ? 'badge--ok' : p === 'f' ? 'badge--risk' : 'tag') + '">' + esc(quando) + '</span></li>';
    }
    return '<div class="trio" style="margin-bottom:10px"><div class="trio__c"><small>Frequência</small><strong>' + (a.freq === null ? '—' : a.freq + '%') + '</strong></div>' +
      '<div class="trio__c"><small>Presenças</small><strong>' + a.presencas.filter(function (p) { return p === 'p'; }).length + '</strong></div>' +
      '<div class="trio__c"><small>Faltas</small><strong>' + a.faltas + '</strong></div></div><ul class="rows">' + li + '</ul>' +
      '<p class="card__hint">A presença é confirmada pelo aluno ao escanear o QR code da aula.</p>';
  }
  const t2 = function (n) { return turma.unidade + ' ' + n; };

  function abaObs(a) {
    const lista = a.observacoes.map(function (o) {
      return '<div class="obs"><span class="avatar ' + corAutor(o) + '">' + esc(iniAutor(o)) + '</span><div><small>' + esc(o.autor) + ' · ' + esc(o.data) + ' · ' + VISIB[o.visibilidade] + '</small><p>' + esc(o.texto) + '</p></div></div>';
    }).join('') || '<p class="card__hint">Nenhuma observação ainda.</p>';
    return '<div class="obs-form"><textarea id="obs-texto" rows="3" placeholder="Escreva uma observação sobre o aluno" aria-label="Observação"></textarea>' +
      '<select id="obs-visib" aria-label="Quem pode ver"><option value="privada">Privada (só você)</option><option value="professores" selected>Professores com acesso</option><option value="aluno">Aluno e família</option></select>' +
      '<button class="pill pill--solid" type="button" data-act="salvar-obs" style="align-self:flex-end">Salvar observação</button></div>' + lista;
  }

  function abaContato(a) {
    return '<dl class="kv"><dt>Matrícula</dt><dd>' + esc(a.matricula) + '</dd><dt>Nascimento</dt><dd>' + esc(a.nascimento) + '</dd>' +
      '<dt>Telefone</dt><dd>' + (a.telefone ? esc(a.telefone) : 'Sem telefone cadastrado (o aluno marcou "Não tenho telefone")') + '</dd>' +
      '<dt>Turma</dt><dd>' + esc(turma.nome) + '</dd><dt>Segmento</dt><dd>' + esc(turma.segmentoNome) + '</dd></dl>';
  }

  function ligarAba(el, a) {
    el.addEventListener('click', function (e) {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const act = b.dataset.act;
      if (act === 'compartilhar') location.href = 'compartilhar.html?turma=' + encodeURIComponent(turma.id) + '&aluno=' + encodeURIComponent(a.id);
      if (act === 'obs') { wins[a.id].tab = 'obs'; janelas(); const t = document.getElementById('obs-texto'); if (t) t.focus(); }
      if (act === 'editar') editarAluno(a);
      if (act === 'remover') removerAluno(a);
      if (act === 'salvar-obs') {
        const txt = document.getElementById('obs-texto').value.trim();
        if (!txt) { A.toast('Escreva a observação primeiro'); return; }
        S.addObservacao(a.id, { turmaId: turma.id, texto: txt, visibilidade: document.getElementById('obs-visib').value, autor: 'Você', autorNome: A.perfil.nome })
          .then(function () { A.toast('Observação salva'); return recarregar(); }, function (e) { A.toast(e.message); });
      }
    });
  }

  // ---------- carga ----------
  function tudo() { cabecalho(); filtros(); tabela(); janelas(); }
  function recarregar() {
    return S.getTurma(turmaId).then(function (t) {
      if (!t) { location.replace('turmas.html'); return; }
      turma = t; tudo();
    });
  }

  A.shell.mount('turmas').then(function () {
    $('editar').innerHTML = A.icon('edit'); $('apagar').innerHTML = A.icon('trash');
    $('busca').addEventListener('input', function (e) { busca = e.target.value; tabela(); });
    $('editar').addEventListener('click', function () {
      S.listTurmas().then(function (todas) { A.turmaForm(turma, todas, recarregar); });
    });
    $('apagar').addEventListener('click', function () {
      A.modal.confirm({ title: 'Apagar ' + turma.nome + '?', message: 'Os ' + turma.qtdAlunos + ' alunos e o histórico de presenças desta turma também serão apagados. Isso não pode ser desfeito.',
        confirmLabel: 'Apagar turma', danger: true }).then(function (sim) {
        if (sim) S.deleteTurma(turma.id).then(function () { location.href = 'turmas.html'; }, function (e) { A.toast(e.message); });
      });
    });
    return recarregar().catch(function (e) { $('tabela').innerHTML = ''; $('tabela').appendChild(h('div', { class: 'tr--empty', text: e.message || 'Não foi possível carregar a turma.' })); });
  }).then(function () {
    const alvo = params.get('aluno');
    if (turma && alvo && aluno(alvo)) abrirJanela(alvo);
  });
})(window.Assprom);
