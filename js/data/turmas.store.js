/* ==========================================================
   ASSPROM - Dados de turmas, alunos e compartilhamento
   PROVISÓRIO: dados fictícios guardados no localStorage do navegador.
   Todas as funções devolvem Promise: para ligar ao Supabase, troque
   só o corpo de Assprom.store mantendo os mesmos nomes e formatos.
   ========================================================== */
window.Assprom = window.Assprom || {};
(function (A) {
  'use strict';

  const KEY = 'assprom.demo.v1';

  const SEGMENTOS = {
    capacitacao:  { nome: 'Capacitação',  unidade: 'Dia'  },
    integracao:   { nome: 'Integração',   unidade: 'Dia'  },
    aprendizagem: { nome: 'Aprendizagem', unidade: 'Aula' }
  };
  const CONTEUDOS_CAP = ['Windows', 'Gmail', 'Word', 'Excel', 'Avaliação'];
  const MODULOS_APR = [
    { nome: 'Excel', de: 1, ate: 10 }, { nome: 'Word', de: 11, ate: 20 },
    { nome: 'Novas tecnologias', de: 21, ate: 33 }   // 33 = 10 + 10 + 13 (o 13 ainda precisa ser confirmado)
  ];
  const PROFESSORES = [
    { nome: 'Carlos Menezes', segmento: 'Aprendizagem', email: 'carlos.menezes@assprom.org' },
    { nome: 'Marta Oliveira', segmento: 'Capacitação',  email: 'marta.oliveira@assprom.org' },
    { nome: 'Rui Fonseca',    segmento: 'Integração',   email: 'rui.fonseca@assprom.org' }
  ];

  // Regras de cada curso (variante só existe na Integração: '4h' ou '6h')
  function regraDe(segmento, variante) {
    if (segmento === 'capacitacao') return { total: 5, texto: '5 dias seguidos' };
    if (segmento === 'integracao')  return variante === '6h'
      ? { total: 8,  texto: '8 dias de curso' }
      : { total: 12, texto: '12 dias de 2 horas' };
    return { total: 33, texto: '1 aula por semana' };
  }

  // "Capacitação 12" -> C12 · "Integração 4h" -> I4 · "Aprendizagem A" -> AA
  function siglaDe(nome) {
    const p = nome.trim().split(/\s+/);
    const ini = (p[0] || '?')[0].toUpperCase();
    if (p.length < 2) return ini;
    return ini + p[p.length - 1].replace(/h$/i, '').toUpperCase();
  }

  // ---------- semente (dados fictícios, 95 alunos em 6 turmas) ----------
  function prng(seed) {                       // gerador pseudoaleatório fixo: mesmos dados sempre
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const PRIMEIROS = ['Ana','Bruno','Carla','Daniel','Eduarda','Felipe','Gabriela','Henrique','Isabela','João','Karina','Leonardo','Mariana','Nicolas','Olívia','Paulo','Quésia','Rodrigo','Sabrina','Tiago','Úrsula','Vinícius','Wesley','Yasmin','Zaira','Alice','Bernardo','Cecília','Davi','Elisa','Fábio','Giovana','Hugo','Ingrid','Jorge','Kelly','Lívia','Murilo','Natália','Otávio'];
  const SOBRENOMES = ['Silva','Santos','Oliveira','Souza','Rodrigues','Ferreira','Alves','Pereira','Lima','Gomes','Ribeiro','Carvalho','Almeida','Lopes','Soares','Fernandes','Vieira','Barbosa','Rocha','Dias','Nascimento','Andrade','Moreira','Nunes','Marques'];

  function semente() {
    const turmasDef = [
      { id: 't-c12', nome: 'Capacitação 12', segmento: 'capacitacao', dia: 4,  n: 14, f: .93 },
      { id: 't-c13', nome: 'Capacitação 13', segmento: 'capacitacao', dia: 1,  n: 12, f: 1 },
      { id: 't-i4',  nome: 'Integração 4h',  segmento: 'integracao',  variante: '4h', dia: 5,  n: 16, f: .88 },
      { id: 't-i6',  nome: 'Integração 6h',  segmento: 'integracao',  variante: '6h', dia: 6,  n: 15, f: .90 },
      { id: 't-aa',  nome: 'Aprendizagem A', segmento: 'aprendizagem', dia: 14, n: 18, f: .86 },
      { id: 't-ab',  nome: 'Aprendizagem B', segmento: 'aprendizagem', dia: 9,  n: 20, f: .79 }
    ];
    // Os 7 primeiros da Capacitação 12 seguem o esboço (p=presente f=falta h=hoje x=futuro)
    const fixos = [
      ['Lucas Pereira', 'ppfh'.split('')], ['Marina Costa', 'pppf'.split('')], ['Pedro Alves', 'pppp'.split('')],
      ['Julia Nunes', 'pppp'.split('')], ['Rafael Lima', 'pppp'.split('')], ['Beatriz Souza', 'pppp'.split('')],
      ['Caio Martins', 'pppf'.split('')]
    ];
    fixos[0][1] = ['p', 'f', 'p', 'h'];
    const usados = new Set(fixos.map(function (f) { return f[0]; }));
    const turmas = [], alunos = [], share = {};
    let k = 0;

    turmasDef.forEach(function (d, ti) {
      const r = regraDe(d.segmento, d.variante), rnd = prng(101 + ti * 17);
      turmas.push({ id: d.id, nome: d.nome, segmento: d.segmento, variante: d.variante || null, diaAtual: d.dia });
      for (let i = 0; i < d.n; i++) {
        let nome, pres;
        if (d.id === 't-c12' && i < fixos.length) {
          nome = fixos[i][0]; pres = fixos[i][1].slice();
        } else {
          do { nome = PRIMEIROS[(k * 7 + ti) % PRIMEIROS.length] + ' ' + SOBRENOMES[(k * 11 + 3 * ti) % SOBRENOMES.length]; k++; }
          while (usados.has(nome));
          pres = [];
          for (let n = 0; n < d.dia; n++) {
            const hoje = n === d.dia - 1;
            pres.push(hoje && rnd() < .12 ? 'h' : (rnd() < d.f ? 'p' : 'f'));
          }
          if (d.id === 't-c12' && nome === 'Thiago Barbosa') pres = ['p', 'f', 'f', 'p'];
        }
        usados.add(nome);
        while (pres.length < r.total) pres.push('x');
        const first = alunos.length;
        alunos.push({
          id: 'a-' + (first + 1), turmaId: d.id, nome: nome,
          matricula: nome === 'Lucas Pereira' ? '2026-0187' : '2026-' + String(200 + first).padStart(4, '0'),
          nascimento: (10 + first % 18) + '/0' + (1 + first % 9) + '/' + (2000 + first % 7),
          telefone: first % 9 === 4 ? null : '(31) 9' + String(8000 + first * 37).slice(0, 4) + '-' + String(1000 + first * 53).slice(0, 4),
          presencas: pres, observacoes: []
        });
      }
    });
    // garante um segundo aluno em risco na Capacitação 12 (como no esboço: "Em risco 2")
    let tb = alunos.find(function (a) { return a.turmaId === 't-c12' && a.nome === 'Thiago Barbosa'; });
    if (!tb) { tb = alunos.filter(function (a) { return a.turmaId === 't-c12'; })[9]; tb.presencas = ['p', 'f', 'f', 'p', 'x']; }
    alunos[0].observacoes.push({ id: 'o-1', autor: 'Prof. Carlos', data: '27/10', visibilidade: 'professores',
      texto: 'Faltou ao Dia 2 (Gmail). Reforçar antes da avaliação.' });
    alunos[0].vistoPor = 'Prof. Carlos';      // aviso de "outro professor vendo" (demonstração)

    share['t-c12'] = {
      escopo: 'turma', alunoId: alunos[0].id, observacoes: 'professores',
      temporario: { ativo: true, ate: '2026-11-30' },
      acessos: [
        { nome: 'Carlos Menezes', segmento: 'Aprendizagem', nivel: 'editar' },
        { nome: 'Marta Oliveira', segmento: 'Capacitação',  nivel: 'comentar' },
        { nome: 'Rui Fonseca',    segmento: 'Integração',   nivel: 'ver' }
      ],
      atividade: [
        { texto: 'Prof. Carlos visualizou a turma', quando: 'hoje, 09:12' },
        { texto: 'Profa. Marta editou presenças',   quando: 'ontem, 16:40' },
        { texto: 'Você compartilhou com Prof. Rui', quando: '20/10, 10:05' }
      ]
    };
    return { turmas: turmas, alunos: alunos, share: share, seq: 1000 };
  }

  // ---------- persistência ----------
  let db = null;
  function load() {
    if (db) return db;
    try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
    if (!db || !db.turmas) db = semente();
    return db;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* sem espaço: segue em memória */ } }
  const nextId = function (p) { load(); db.seq += 1; return p + '-' + db.seq; };

  // ---------- datas ----------
  function addDiasUteis(date, n) {            // n pode ser negativo
    const d = new Date(date), step = n < 0 ? -1 : 1;
    for (let i = 0; i < Math.abs(n); i++) { do { d.setDate(d.getDate() + step); } while (d.getDay() === 0 || d.getDay() === 6); }
    return d;
  }
  const dm = function (d) { return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); };
  const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  function dataDoDia(t, n) {                  // data da aula nº n
    const hoje = new Date();
    return t.segmento === 'aprendizagem'
      ? new Date(hoje.getTime() + (n - t.diaAtual) * 7 * 864e5)
      : addDiasUteis(hoje, n - t.diaAtual);
  }

  // ---------- cálculos ----------
  function conteudoDoDia(t, n) {
    if (t.segmento === 'capacitacao') return CONTEUDOS_CAP[n - 1];
    if (t.segmento === 'aprendizagem') return MODULOS_APR.filter(function (m) { return n >= m.de && n <= m.ate; })[0].nome;
    return 'Dia ' + n;
  }
  function decAluno(a, t) {
    const res = a.presencas.filter(function (p) { return p === 'p' || p === 'f'; });
    const pres = res.filter(function (p) { return p === 'p'; }).length;
    const freq = res.length ? Math.round(pres / res.length * 100) : null;
    const faltas = res.length - pres;
    const status = freq === null || freq >= 90 ? 'ok' : freq >= 70 ? 'atencao' : 'risco';
    let motivo = '';
    const idxF = a.presencas.map(function (p, i) { return p === 'f' ? i + 1 : 0; }).filter(Boolean);
    if (faltas) {
      if (t.segmento === 'aprendizagem') motivo = conteudoDoDia(t, t.diaAtual) + ': ' + faltas + (faltas === 1 ? ' aula pendente' : ' aulas pendentes');
      else if (idxF.length > 1 && idxF[idxF.length - 1] - idxF[0] === idxF.length - 1) motivo = 'Faltou ' + idxF.length + ' dias seguidos';
      else motivo = 'Faltou no Dia ' + idxF[0] + (t.segmento === 'capacitacao' ? ' (' + conteudoDoDia(t, idxF[0]) + ')' : '');
    } else if (!res.length) motivo = 'Ainda sem presença no ' + SEGMENTOS[t.segmento].unidade + ' 1';
    return Object.assign({}, a, { freq: freq, faltas: faltas, status: status, motivo: motivo, turmaNome: t.nome, turmaSegmento: t.segmento });
  }
  function decTurma(t) {
    const r = regraDe(t.segmento, t.variante), seg = SEGMENTOS[t.segmento];
    const al = load().alunos.filter(function (a) { return a.turmaId === t.id; }).map(function (a) { return decAluno(a, t); });
    const comFreq = al.filter(function (a) { return a.freq !== null; });
    const hojeP = al.filter(function (a) { return a.presencas[t.diaAtual - 1] === 'p'; }).length;
    const hojeF = al.filter(function (a) { return a.presencas[t.diaAtual - 1] === 'f'; }).length;
    return Object.assign({}, t, {
      sigla: siglaDe(t.nome), regra: r.texto, total: r.total, unidade: seg.unidade, segmentoNome: seg.nome,
      qtdAlunos: al.length,
      freq: comFreq.length ? Math.round(comFreq.reduce(function (s, a) { return s + a.freq; }, 0) / comFreq.length) : null,
      freqHoje: hojeP + hojeF ? Math.round(hojeP / (hojeP + hojeF) * 100) : null,
      emRisco: al.filter(function (a) { return a.status === 'risco'; }).length,
      alunos: al
    });
  }
  const find = function (id) { return load().turmas.filter(function (t) { return t.id === id; })[0]; };
  const ok = function (v) { return Promise.resolve(v); };

  A.store = {
    SEGMENTOS: SEGMENTOS, CONTEUDOS_CAP: CONTEUDOS_CAP, MODULOS_APR: MODULOS_APR, PROFESSORES: PROFESSORES,
    regraDe: regraDe, siglaDe: siglaDe, conteudoDoDia: conteudoDoDia, dataDoDia: dataDoDia, addDiasUteis: addDiasUteis, dm: dm, DIAS: DIAS,

    listTurmas: function () { return ok(load().turmas.map(decTurma)); },
    getTurma: function (id) { const t = find(id); return ok(t ? decTurma(t) : null); },

    saveTurma: function (d) {                 // {id?, nome, segmento, variante}
      load();
      const r = regraDe(d.segmento, d.variante);
      let t = d.id ? find(d.id) : null;
      if (!t) { t = { id: nextId('t'), diaAtual: 1 }; db.turmas.push(t); }
      t.nome = d.nome.trim(); t.segmento = d.segmento; t.variante = d.segmento === 'integracao' ? (d.variante || '4h') : null;
      t.diaAtual = Math.min(t.diaAtual, r.total);
      db.alunos.forEach(function (a) {        // ajusta o tamanho do histórico se a regra mudou
        if (a.turmaId !== t.id) return;
        while (a.presencas.length < r.total) a.presencas.push('x');
        a.presencas.length = r.total;
      });
      save(); return ok(decTurma(t));
    },
    deleteTurma: function (id) {
      load();
      db.turmas = db.turmas.filter(function (t) { return t.id !== id; });
      db.alunos = db.alunos.filter(function (a) { return a.turmaId !== id; });
      delete db.share[id]; save(); return ok(true);
    },
    saveAluno: function (id, patch) {
      load(); const a = db.alunos.filter(function (x) { return x.id === id; })[0];
      Object.assign(a, patch); save(); return ok(true);
    },
    removeAluno: function (id) {
      load(); db.alunos = db.alunos.filter(function (a) { return a.id !== id; }); save(); return ok(true);
    },
    addObservacao: function (alunoId, o) {    // {texto, visibilidade, autor}
      load(); const a = db.alunos.filter(function (x) { return x.id === alunoId; })[0];
      const d = new Date();
      a.observacoes.unshift({ id: nextId('o'), autor: o.autor, data: dm(d), visibilidade: o.visibilidade, texto: o.texto });
      save(); return ok(true);
    },
    getShare: function (turmaId) {
      load();
      return ok(JSON.parse(JSON.stringify(db.share[turmaId] || {
        escopo: 'turma', alunoId: null, observacoes: 'privada', temporario: { ativo: false, ate: '' }, acessos: [], atividade: []
      })));
    },
    saveShare: function (turmaId, cfg) { load(); db.share[turmaId] = cfg; save(); return ok(true); },

    // Resumo para o dashboard
    resumo: function () {
      return A.store.listTurmas().then(function (ts) {
        const al = ts.reduce(function (l, t) { return l.concat(t.alunos); }, []);
        const comFreq = al.filter(function (a) { return a.freq !== null; });
        const seg = {};
        ts.forEach(function (t) { seg[t.segmento] = (seg[t.segmento] || 0) + t.qtdAlunos; });
        return {
          turmas: ts.length, alunos: al.length,
          freqMedia: comFreq.length ? Math.round(comFreq.reduce(function (s, a) { return s + a.freq; }, 0) / comFreq.length) : 0,
          porSegmento: seg,
          atencao: al.filter(function (a) { return a.status !== 'ok'; })
            .sort(function (x, y) { return (x.status === y.status ? 0 : x.status === 'risco' ? -1 : 1) || x.freq - y.freq; })
        };
      });
    }
  };
})(window.Assprom);
