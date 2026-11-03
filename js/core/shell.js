/* ==========================================================
   ASSPROM - Estrutura das telas do professor (menu lateral + proteção de acesso)
   Uso em cada página:  Assprom.shell.mount('turmas').then(function (perfil) { ... })
   ========================================================== */
window.Assprom = window.Assprom || {};
(function (A) {
  'use strict';

  const ICONS = {
    dashboard: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>',
    turmas: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.5-3.4 3-5.3 6-5.3s5.5 1.9 6 5.3"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14.2c2.4 0 4.1 1.5 4.5 4.3"/>',
    presencas: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 6l1.2 1.2L7 4.8M3.5 12l1.2 1.2L7 10.8M3.5 18l1.2 1.2L7 16.8"/>',
    calendario: '<rect x="3.5" y="5" width="17" height="15" rx="2.4"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    professores: '<path d="M12 4L2.5 9 12 14l9.5-5z"/><path d="M6 11.2v4.3c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.3M21.5 9v5.5"/>',
    relatorios: '<path d="M5 20V12M12 20V5M19 20v-9"/>',
    config: '<circle cx="12" cy="12" r="3.4"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8"/>',
    edit: '<path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z"/><path d="M14.5 6.5l3 3"/>',
    trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5"/>',
    share: '<circle cx="6" cy="12" r="2.4"/><circle cx="17.5" cy="6" r="2.4"/><circle cx="17.5" cy="18" r="2.4"/><path d="M8.2 11l7.1-3.9M8.2 13l7.1 3.9"/>',
    alert: '<path d="M12 4L2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17v.2"/>',
    pulse: '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2.4"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.6-3.8 3.4-5.8 7-5.8s6.4 2 7 5.8"/>',
    grip: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
    minus: '<path d="M6 12h12"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    sair: '<path d="M10 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20H10M15 8l4 4-4 4M19 12H9"/>'
  };
  A.icon = function (name, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name] + '</svg>';
  };
  A.ICONS = ICONS;

  // Páginas existentes têm href; as demais mostram "Em breve"
  const MENU = [
    { key: 'dashboard',   label: 'Dashboard',     href: 'dashboard.html' },
    { key: 'turmas',      label: 'Turmas',        href: 'turmas.html', badge: true },
    { key: 'presencas',   label: 'Presenças' },
    { key: 'calendario',  label: 'Calendário' },
    { key: 'professores', label: 'Professores' },
    { key: 'relatorios',  label: 'Relatórios' },
    { sep: true },
    { key: 'config',      label: 'Configurações' }
  ];

  const initials = function (n) {
    const p = n.trim().split(/\s+/);
    return ((p[0] || '')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  };
  A.initials = initials;
  const CORES_FIXAS = { 'Ana Souza': 0, 'Carlos Menezes': 1, 'Marta Oliveira': 2, 'Rui Fonseca': 0, 'Marina Costa': 2, 'Caio Martins': 1 };
  A.avatarClass = function (nome) {                 // cor fixa por nome (av-0 ... av-4)
    if (nome in CORES_FIXAS) return 'av-' + CORES_FIXAS[nome];
    let n = 0; for (let i = 0; i < nome.length; i++) n += nome.charCodeAt(i);
    return 'av-' + (n % 5);
  };

  // Modo demonstração (?demo): só dados fictícios, sem login. Dura enquanto a aba estiver aberta.
  function isDemo() {
    try {
      if (new URLSearchParams(location.search).has('demo')) sessionStorage.setItem('assprom-demo', '1');
      return sessionStorage.getItem('assprom-demo') === '1';
    } catch (e) { return new URLSearchParams(location.search).has('demo'); }
  }

  function quem() {
    if (isDemo()) return Promise.resolve({ nome: 'Ana Souza', role: 'professor' });
    return A.auth.profile().then(function (p) {
      if (!p) { location.replace('../../index.html'); return null; }
      if (p.role !== 'professor') { location.replace('../painel.html'); return null; }
      return p;
    }).catch(function () { location.replace('../../index.html'); return null; });   // sem conexão/config: volta ao login
  }

  function render(active, perfil) {
    const side = document.getElementById('sidebar');
    side.classList.add('sidebar');
    const items = MENU.map(function (m) {
      if (m.sep) return '<hr class="nav__sep">';
      const on = m.key === active;
      return '<a class="nav__item' + (on ? ' is-active' : '') + '" href="' + (m.href || '#') + '"' +
        (m.href ? '' : ' data-soon') + (on ? ' aria-current="page"' : '') + '>' + A.icon(m.key) +
        '<span>' + m.label + '</span>' + (m.badge ? '<b class="nav__badge" id="nav-turmas"></b>' : '') + '</a>';
    }).join('');
    side.innerHTML =
      '<div class="sidebar__pattern" aria-hidden="true"></div>' +
      '<img class="sidebar__logo" src="../../assets/img/logo.png" alt="ASSPROM">' +
      '<nav class="nav" aria-label="Principal">' + items + '</nav>' +
      '<div class="sidebar__user"><span class="avatar avatar--light"></span>' +
      '<div class="sidebar__who"><strong></strong><small>Professor</small></div>' +
      '<button class="icon-btn" id="logout" type="button" title="Sair" aria-label="Sair">' + A.icon('sair') + '</button></div>';
    side.querySelector('.avatar').textContent = initials(perfil.nome);
    side.querySelector('.sidebar__who strong').textContent = perfil.nome;

    side.querySelector('#logout').addEventListener('click', function () {
      const done = function () { try { sessionStorage.removeItem('assprom-demo'); } catch (e) { /* ok */ } location.href = '../../index.html'; };
      try { A.auth.signOut().then(done, done); } catch (e) { done(); }
    });
    document.addEventListener('click', function (e) {
      const soon = e.target.closest('[data-soon]');
      if (soon) { e.preventDefault(); A.toast('Em breve'); }
    });
    A.store.listTurmas().then(function (l) { const b = document.getElementById('nav-turmas'); if (b) b.textContent = l.length; });
  }

  A.shell = {
    isDemo: isDemo,
    mount: function (active) {
      return quem().then(function (perfil) {
        if (!perfil) return new Promise(function () { /* redirecionando */ });
        A.perfil = perfil;
        render(active, perfil);
        return perfil;
      });
    }
  };
})(window.Assprom);
