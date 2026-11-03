/* Dados do dashboard. Alunos, turmas, frequência, segmentos e "precisam de atenção" vêm de
   Assprom.store (mesmos números das telas de Turmas). Aulas de hoje e pendências ainda são
   FICTÍCIAS (dependem das telas de Presenças e Calendário). */
window.Assprom = window.Assprom || {};
window.Assprom.dashboardData = async function () {
  const A = window.Assprom, r = await A.store.resumo();
  return {
    turmas: r.turmas,
    alunos: r.alunos,
    frequencia: { media: r.freqMedia, variacaoMes: 2 },          // variação do mês: fictícia
    aulasHoje: { total: 4, turmas: 3 },                           // fictício
    pendencias: { total: 6, chamadas: 3, avaliacoes: 3 },         // fictício
    atencao: r.atencao.slice(0, 4).map(function (a) {
      return { id: a.id, turmaId: a.turmaId, nome: a.nome, turma: a.turmaNome, motivo: a.motivo, nivel: a.status };
    }),
    aulas: [
      { hora: '08:00', titulo: 'Capacitação 12 · Dia 4',        local: 'Excel · Laboratório 1' },
      { hora: '10:00', titulo: 'Integração 4h · Dia 5 de 12',   local: 'Laboratório 2' },
      { hora: '14:00', titulo: 'Aprendizagem A · aula 14',      local: 'Laboratório 1' }
    ],
    segmentos: [
      { nome: 'Capacitação',  alunos: r.porSegmento.capacitacao || 0,  cor: '#4560e1' },
      { nome: 'Integração',   alunos: r.porSegmento.integracao || 0,   cor: '#0f9488' },
      { nome: 'Aprendizagem', alunos: r.porSegmento.aprendizagem || 0, cor: '#b87400' }
    ]
  };
};
