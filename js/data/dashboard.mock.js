/* DADOS FICTÍCIOS do dashboard (esboço). Troque por consultas ao Supabase
   mantendo este mesmo formato: basta substituir Assprom.dashboardData(). */
window.Assprom = window.Assprom || {};
window.Assprom.dashboardData = async function () {
  return {
    turmas: 6,
    alunos: 95,
    frequencia: { media: 91, variacaoMes: 2 },
    aulasHoje: { total: 4, turmas: 3 },
    pendencias: { total: 6, chamadas: 3, avaliacoes: 3 },
    atencao: [
      { nome: 'Lucas Pereira', turma: 'Capacitação 12', motivo: 'Faltou no Dia 2 (Gmail)', nivel: 'risco' },
      { nome: 'Marina Costa',  turma: 'Integração 4h',  motivo: 'Faltou 2 dias seguidos', nivel: 'atencao' },
      { nome: 'Pedro Alves',   turma: 'Aprendizagem A', motivo: 'Excel: 3 aulas pendentes', nivel: 'atencao' },
      { nome: 'Julia Nunes',   turma: 'Capacitação 13', motivo: 'Ainda sem presença no Dia 1', nivel: 'risco' }
    ],
    aulas: [
      { hora: '08:00', titulo: 'Capacitação 12 · Dia 4',        local: 'Excel · Laboratório 1' },
      { hora: '10:00', titulo: 'Integração 4h · Dia 5 de 12',   local: 'Laboratório 2' },
      { hora: '14:00', titulo: 'Aprendizagem A · aula 14',      local: 'Laboratório 1' }
    ],
    segmentos: [
      { nome: 'Capacitação',  alunos: 26, cor: '#4560e1' },
      { nome: 'Integração',   alunos: 31, cor: '#0f9488' },
      { nome: 'Aprendizagem', alunos: 38, cor: '#b87400' }
    ]
  };
};
