/* ==========================================================
   ASSPROM - Turmas no Supabase (dados reais, iguais em qualquer navegador)
   Mesmas funções de turmas.store.js; as regras de acesso ficam no banco (supabase/02-turmas.sql).
   ========================================================== */
window.Assprom = window.Assprom || {};
(function (A) {
  'use strict';
  const L = A.localStore;
  const db = function () { return A.db(); };

  // ---------- erros em português ----------
  function traduz(e) {
    const m = (e && e.message) || '';
    if (e && e.code === '23505') return /turmas_nome/.test(m) ? 'Já existe uma turma com esse nome.' : 'Esse registro já existe.';
    if (/does not exist|schema cache|Could not find the (table|function)/i.test(m)) return 'O banco ainda não tem as tabelas de turmas. Rode supabase/02-turmas.sql no SQL Editor do Supabase (veja o README).';
    if (/row-level security|permission denied/i.test(m)) return 'Você não tem permissão para fazer isso. (' + (e.code ? e.code + ': ' : '') + m + ')';
    if (/fetch|network/i.test(m)) return 'Sem conexão com o servidor. Verifique sua internet.';
    return m ? m + (e.code ? ' (' + e.code + ')' : '') : 'Não foi possível concluir. Tente novamente.';
  }
  async function ok(p) {                                  // desembrulha {data, error}
    const r = await p;
    if (r.error) throw new Error(traduz(r.error));
    return r.data;
  }
  // PostgREST devolve no máximo 1000 linhas por consulta: busca em páginas
  async function todas(fabrica) {
    const out = [];
    for (let de = 0; ; de += 1000) {
      const lote = await ok(fabrica().range(de, de + 999));
      out.push.apply(out, lote);
      if (lote.length < 1000) return out;
    }
  }
  async function meuId() {
    const s = await db().auth.getSession();
    if (!s.data.session) throw new Error('Sessão expirada. Entre de novo.');
    return s.data.session.user.id;
  }

  // ---------- datas ----------
  const br = function (iso) { const p = (iso || '').slice(0, 10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : ''; };
  const hhmm = function (d) { return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  function quando(iso) {
    const d = new Date(iso), hoje = new Date(), ontem = new Date(Date.now() - 864e5);
    const mesmo = function (a, b) { return a.toDateString() === b.toDateString(); };
    return (mesmo(d, hoje) ? 'hoje' : mesmo(d, ontem) ? 'ontem' : L.dm(d)) + ', ' + hhmm(d);
  }
  // "Dia N" da turma: dias úteis desde a data de início (Aprendizagem: 1 aula por semana)
  function diaAtualDe(t) {
    const total = L.regraDe(t.segmento, t.variante).total;
    const ini = new Date(t.data_inicio + 'T12:00:00'), hoje = new Date();
    hoje.setHours(12, 0, 0, 0);
    if (hoje <= ini) return 1;
    let n = 0;
    if (t.segmento === 'aprendizagem') n = Math.floor((hoje - ini) / (7 * 864e5)) + 1;
    else for (const d = new Date(ini); d <= hoje && n < 400; d.setDate(d.getDate() + 1)) { if (d.getDay() % 6) n++; }
    return Math.min(total, Math.max(1, n));
  }

  // ---------- leitura ----------
  // Traz turmas visíveis (minhas + compartilhadas comigo), alunos e presenças; monta o formato das telas
  async function carregar(turmaId, comObservacoes) {
    const eu = await meuId();
    let q = db().from('turmas').select('*').order('created_at', { ascending: false });
    if (turmaId) q = q.eq('id', turmaId);
    const turmas = await ok(q);
    if (!turmas.length) return [];
    const ids = turmas.map(function (t) { return t.id; });

    const [alunos, pres, donos] = await Promise.all([
      todas(function () { return db().from('profiles').select('id, nome, matricula, nascimento, telefone, turma_id').eq('role', 'aluno').in('turma_id', ids).order('nome').order('id'); }),
      todas(function () { return db().from('presencas').select('aluno_id, dia, status').in('turma_id', ids).order('aluno_id').order('dia'); }),
      ok(db().from('profiles').select('id, nome').in('id', turmas.filter(function (t) { return t.dono_id !== eu; }).map(function (t) { return t.dono_id; })))
    ]);
    const nomeDono = {}; donos.forEach(function (d) { nomeDono[d.id] = d.nome; });
    const reg = {};                                          // aluno -> { dia: 'p'|'f' }
    pres.forEach(function (p) { (reg[p.aluno_id] = reg[p.aluno_id] || {})[p.dia] = p.status; });

    const obs = {};
    if (comObservacoes && alunos.length) {
      const lista = await todas(function () {
        return db().from('observacoes').select('id, aluno_id, autor_id, texto, visibilidade, created_at')
          .in('aluno_id', alunos.map(function (a) { return a.id; })).order('created_at', { ascending: false }).order('id');
      });
      const autores = {};
      const ids2 = lista.map(function (o) { return o.autor_id; }).filter(function (v, i, a) { return v !== eu && a.indexOf(v) === i; });
      if (ids2.length) (await ok(db().from('profiles').select('id, nome').in('id', ids2))).forEach(function (a) { autores[a.id] = a.nome; });
      lista.forEach(function (o) {
        const nome = o.autor_id === eu ? (A.perfil && A.perfil.nome) || 'Você' : autores[o.autor_id] || 'Professor';
        (obs[o.aluno_id] = obs[o.aluno_id] || []).push({
          id: o.id, autor: o.autor_id === eu ? 'Você' : 'Prof. ' + nome.split(' ')[0], autorNome: nome,
          data: L.dm(new Date(o.created_at)), visibilidade: o.visibilidade, texto: o.texto
        });
      });
    }

    return turmas.map(function (t) {
      const base = { id: t.id, nome: t.nome, segmento: t.segmento, variante: t.variante, inicio: t.data_inicio,
        diaAtual: diaAtualDe(t), souDono: t.dono_id === eu, donoNome: nomeDono[t.dono_id] || '' };
      const total = L.regraDe(t.segmento, t.variante).total;
      const raw = alunos.filter(function (a) { return a.turma_id === t.id; }).map(function (a) {
        const r = reg[a.id] || {}, arr = [];
        for (let n = 1; n <= total; n++) arr.push(r[n] || (n === base.diaAtual ? 'h' : 'x'));   // sem registro: hoje aguarda, passado fica em branco
        return { id: a.id, turmaId: t.id, nome: a.nome, matricula: a.matricula || '', nascimento: br(a.nascimento),
          telefone: a.telefone, presencas: arr, observacoes: obs[a.id] || [] };
      });
      return A.calc.decTurmaCom(base, raw);
    });
  }

  A.remoteStore = {
    listTurmas: function () { return carregar(null, false); },
    getTurma: function (id) { return carregar(id, true).then(function (l) { return l[0] || null; }); },

    saveTurma: async function (d) {
      const linha = { nome: d.nome.trim(), segmento: d.segmento, variante: d.segmento === 'integracao' ? (d.variante || '4h') : null };
      if (d.inicio) linha.data_inicio = d.inicio;
      const q = d.id ? db().from('turmas').update(linha).eq('id', d.id) : db().from('turmas').insert(linha);
      const salva = await ok(q.select('id').single());
      return (await carregar(salva.id, false))[0];
    },
    deleteTurma: function (id) { return ok(db().from('turmas').delete().eq('id', id)).then(function () { return true; }); },

    saveAluno: function (id, p) {
      return ok(db().rpc('editar_aluno', { p_id: id, p_nome: p.nome, p_matricula: p.matricula, p_telefone: p.telefone || '' })).then(function () { return true; });
    },
    removeAluno: function (id) { return ok(db().rpc('remover_aluno', { p_id: id })).then(function () { return true; }); },

    addObservacao: function (alunoId, o) {
      return ok(db().from('observacoes').insert({ turma_id: o.turmaId, aluno_id: alunoId, texto: o.texto, visibilidade: o.visibilidade })).then(function () { return true; });
    },

    // ----- compartilhamento -----
    getShare: async function (turmaId) {
      const [c, acessos, ativ] = await Promise.all([
        ok(db().from('turma_compartilhamento').select('*').eq('turma_id', turmaId).maybeSingle()),
        ok(db().from('turma_acessos').select('professor_id, nivel').eq('turma_id', turmaId)),
        ok(db().from('turma_atividade').select('texto, created_at').eq('turma_id', turmaId).order('created_at', { ascending: false }).limit(8))
      ]);
      const nomes = {};
      if (acessos.length) (await ok(db().from('profiles').select('id, nome, segmento').in('id', acessos.map(function (a) { return a.professor_id; }))))
        .forEach(function (p) { nomes[p.id] = p; });
      return {
        escopo: c ? c.escopo : 'turma', alunoId: c ? c.aluno_id : null, observacoes: c ? c.observacoes : 'privada',
        temporario: { ativo: c ? c.temporario : false, ate: (c && c.ate) || '' },
        acessos: acessos.map(function (a) {
          const p = nomes[a.professor_id] || {};
          return { profId: a.professor_id, nome: p.nome || 'Professor', segmento: p.segmento || '', nivel: a.nivel };
        }),
        atividade: ativ.map(function (a) { return { texto: a.texto, quando: quando(a.created_at) }; })
      };
    },
    saveShare: async function (turmaId, cfg) {
      await ok(db().from('turma_compartilhamento').upsert({
        turma_id: turmaId, escopo: cfg.escopo, aluno_id: cfg.escopo === 'aluno' ? cfg.alunoId : null,
        observacoes: cfg.observacoes, temporario: cfg.temporario.ativo, ate: cfg.temporario.ativo ? cfg.temporario.ate : null
      }, { onConflict: 'turma_id' }));
      const atuais = (await ok(db().from('turma_acessos').select('professor_id').eq('turma_id', turmaId))).map(function (a) { return a.professor_id; });
      const ficam = cfg.acessos.map(function (a) { return a.profId; });
      const saem = atuais.filter(function (id) { return ficam.indexOf(id) === -1; });
      if (saem.length) await ok(db().from('turma_acessos').delete().eq('turma_id', turmaId).in('professor_id', saem));
      if (ficam.length) await ok(db().from('turma_acessos').upsert(cfg.acessos.map(function (a) {
        return { turma_id: turmaId, professor_id: a.profId, nivel: a.nivel };
      }), { onConflict: 'turma_id,professor_id' }));
      const novas = cfg.atividade.filter(function (a) { return a.quando === 'agora'; });
      if (novas.length) await ok(db().from('turma_atividade').insert(novas.map(function (a) { return { turma_id: turmaId, texto: a.texto }; })));
      return true;
    },

    resumo: function () { return carregar(null, false).then(A.calc.resumoDe); },

    // ----- professores para convidar -----
    buscarProfessor: function (q) {
      return ok(db().rpc('buscar_professor', { q: q })).then(function (l) { return l.map(function (p) { return { id: p.id, nome: p.nome, segmento: p.segmento || '', email: p.email }; }); });
    },
    sugestoesProfessores: async function () {
      const eu = await meuId();
      const l = await ok(db().from('profiles').select('id, nome, segmento').eq('role', 'professor').neq('id', eu).order('nome').limit(50));
      return l.map(function (p) { return { id: p.id, nome: p.nome, segmento: p.segmento || '', email: '' }; });
    }
  };
})(window.Assprom);
