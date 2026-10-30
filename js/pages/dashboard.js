/* ==========================================================
   ASSPROM - Dashboard do professor
   1) garante que há um professor logado (ou modo demo: ?demo)
   2) busca os dados (Assprom.dashboardData) e desenha a tela
   ========================================================== */
(function (A) {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };
  const ICONS = {
    users: '<path d="M3 19c.5-3.4 3-5.3 6-5.3s5.5 1.9 6 5.3"/><circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14.2c2.4 0 4.1 1.5 4.5 4.3"/>',
    pulse: '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',
    cal:   '<rect x="3.5" y="5" width="17" height="15" rx="2.4"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    bell:  '<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z"/><path d="M10 21h4"/>'
  };

  // Escapa texto antes de ir para innerHTML (nomes vindos do banco nunca viram HTML)
  const esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  const initials = function (nome) {
    const p = nome.trim().split(/\s+/);
    return ((p[0] || '')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  };
  const plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : many); };

  let toastTimer;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2200);
  }

  function header(profile, d) {
    const h = new Date().getHours();
    const first = profile.nome.trim().split(/\s+/)[0];
    const date = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

    $('greeting').textContent = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    $('first-name').textContent = first;
    $('today').textContent = date.charAt(0).toUpperCase() + date.slice(1);
    $('summary').textContent = 'Você tem ' + plural(d.aulasHoje.total, 'aula', 'aulas') + ' hoje e ' +
      plural(d.pendencias.total, 'pendência', 'pendências') + ' para resolver.';
    $('user-name').textContent = profile.nome;
    $('user-initials').textContent = initials(profile.nome);
    $('nav-turmas').textContent = d.turmas;
    document.title = 'Dashboard | ASSPROM';
  }

  function stat(cls, label, value, sub, icon) {
    return '<article class="stat ' + cls + '"><span class="stat__label">' + label + '</span>' +
      '<strong class="stat__value">' + value + '</strong><span class="stat__sub">' + sub + '</span>' +
      '<span class="stat__icon"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[icon] + '</svg></span></article>';
  }

  function stats(d) {
    const v = d.frequencia.variacaoMes;
    const trend = '<span class="badge badge--up">' + (v >= 0 ? '+' : '') + v + '% no mês</span>';
    $('stats').innerHTML =
      stat('stat--primary', 'Alunos', esc(d.alunos), 'em ' + plural(d.turmas, 'turma', 'turmas'), 'users') +
      stat('', 'Frequência média', esc(d.frequencia.media) + '%', trend, 'pulse') +
      stat('', 'Aulas hoje', esc(d.aulasHoje.total), 'em ' + plural(d.aulasHoje.turmas, 'turma', 'turmas'), 'cal') +
      stat('', 'Pendências hoje', esc(d.pendencias.total),
        plural(d.pendencias.chamadas, 'chamada', 'chamadas') + ' · ' + plural(d.pendencias.avaliacoes, 'avaliação', 'avaliações'), 'bell');
  }

  function lists(d) {
    $('attention').innerHTML = d.atencao.length ? d.atencao.map(function (a) {
      const risk = a.nivel === 'risco';
      return '<li class="list__row" tabindex="0" data-aluno="' + esc(a.nome) + '">' +
        '<span class="avatar">' + esc(initials(a.nome)) + '</span>' +
        '<span class="list__main"><strong>' + esc(a.nome) + '</strong><small>' + esc(a.turma) + '</small></span>' +
        '<span class="list__note">' + esc(a.motivo) + '</span>' +
        '<span class="badge ' + (risk ? 'badge--risk' : 'badge--warn') + '">' + (risk ? 'Risco' : 'Atenção') + '</span></li>';
    }).join('') : '<li class="empty">Nenhum aluno precisando de atenção. 🎉</li>';

    $('lessons').innerHTML = d.aulas.length ? d.aulas.map(function (a) {
      return '<li class="list__row"><span class="time-chip">' + esc(a.hora) + '</span>' +
        '<span class="list__main"><strong>' + esc(a.titulo) + '</strong><small>' + esc(a.local) + '</small></span></li>';
    }).join('') : '<li class="empty">Sem aulas hoje.</li>';

    const total = d.segmentos.reduce(function (s, x) { return s + x.alunos; }, 0) || 1;
    $('segments').innerHTML = d.segmentos.map(function (s) {
      return '<li><div class="bars__head"><span>' + esc(s.nome) + '</span><span>' + plural(s.alunos, 'aluno', 'alunos') + '</span></div>' +
        '<div class="bars__track"><div class="bars__fill" style="background:' + esc(s.cor) + '" data-w="' + (s.alunos / total * 100).toFixed(1) + '"></div></div></li>';
    }).join('');
    // anima as barras depois de entrarem na tela
    requestAnimationFrame(function () {
      document.querySelectorAll('.bars__fill').forEach(function (b) { b.style.width = b.dataset.w + '%'; });
    });
  }

  function interactions() {
    document.querySelectorAll('[data-soon]').forEach(function (el) {
      el.addEventListener('click', function (e) { e.preventDefault(); toast('Em breve'); });
    });
    $('attention').addEventListener('click', function (e) {
      const row = e.target.closest('[data-aluno]');
      if (row) toast('Janela do aluno ' + row.dataset.aluno + ': em breve');
    });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('search').focus(); }
    });
    $('logout').addEventListener('click', function () {
      const done = function () { location.href = '../../index.html'; };
      try { A.auth.signOut().then(done, done); } catch (e) { done(); }
    });
  }

  // Quem pode ver: professor logado. "?demo" mostra só os dados fictícios (sem login).
  async function whoAmI() {
    if (new URLSearchParams(location.search).has('demo')) {
      return { nome: 'Ana Souza', role: 'professor' };
    }
    const p = await A.auth.profile();
    if (!p) { location.replace('../../index.html'); return null; }
    if (p.role !== 'professor') { location.replace('../painel.html'); return null; }
    return p;
  }

  whoAmI().then(function (profile) {
    if (!profile) return;
    return A.dashboardData().then(function (d) {
      header(profile, d); stats(d); lists(d); interactions();
    });
  }).catch(function () { location.replace('../../index.html'); });
})(window.Assprom);
