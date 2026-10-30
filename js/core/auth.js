/* ==========================================================
   ASSPROM - Autenticação com Supabase
   Aluno entra com matrícula: ela vira o e-mail interno 20240187@aluno.assprom.app
   Professor entra com o e-mail institucional.
   ========================================================== */
(function (A) {
  'use strict';

  const ALUNO_DOMAIN = 'aluno.assprom.app';
  let client = null;

  A.db = function () {
    const c = A.config || {};
    if (!window.supabase || !c.SUPABASE_URL || c.SUPABASE_URL.indexOf('SEU-PROJETO') !== -1) {
      throw new Error('CONFIG');
    }
    return client || (client = window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY));
  };

  const studentEmail = function (matricula) { return matricula.replace(/\D/g, '') + '@' + ALUNO_DOMAIN; };
  const isoDate = function (br) { const p = br.split('/'); return p[2] + '-' + p[1] + '-' + p[0]; };
  const loginEmail = function (id) {
    const v = id.trim();
    return v.indexOf('@') !== -1 ? v.toLowerCase() : studentEmail(v);
  };

  A.auth = {
    // role: 'aluno' | 'professor'; data = campos do formulário
    signUp: async function (role, d) {
      const aluno = role === 'aluno';
      const meta = aluno
        ? { role: role, nome: d.nome.trim(), matricula: d.matricula, nascimento: isoDate(d.nascimento),
            turma: d.turma, telefone: d.telefone || null }   // sem telefone => null
        : { role: role, nome: d.nome.trim(), segmento: d.segmento };
      const res = await A.db().auth.signUp({
        email: aluno ? studentEmail(d.matricula) : d.email.trim().toLowerCase(),
        password: d.password,
        options: { data: meta }
      });
      if (res.error) throw res.error;
      return res.data;
    },

    signIn: async function (id, password) {
      const res = await A.db().auth.signInWithPassword({ email: loginEmail(id), password: password });
      if (res.error) throw res.error;
      return res.data;
    },

    // Devolve o perfil (tabela profiles) de quem está logado, ou null
    profile: async function () {
      const s = await A.db().auth.getSession();
      if (!s.data.session) return null;
      const r = await A.db().from('profiles').select('*').eq('id', s.data.session.user.id).single();
      return r.error ? null : r.data;
    },

    signOut: function () { return A.db().auth.signOut(); },

    message: function (err) {
      const m = (err && err.message) || '';
      if (m === 'CONFIG') return 'Supabase ainda não configurado (js/core/config.js).';
      if (/invalid login/i.test(m)) return 'Matrícula/e-mail ou senha incorretos.';
      if (/already registered|already been registered|duplicate/i.test(m)) return 'Já existe uma conta com esses dados.';
      if (/not confirmed/i.test(m)) return 'Confirme seu e-mail antes de entrar.';
      if (/rate limit|too many/i.test(m)) return 'Muitas tentativas. Aguarde um pouco e tente de novo.';
      if (/fetch|network/i.test(m)) return 'Sem conexão com o servidor. Verifique sua internet.';
      return 'Não foi possível concluir. Tente novamente.';
    }
  };
})(window.Assprom);
