/* Formulário de criar/editar turma (usado em Turmas e na página da turma) */
window.Assprom = window.Assprom || {};
(function (A) {
  'use strict';
  const S = A.store;

  // t = turma existente (editar) ou null (nova); existentes = lista para evitar nome repetido
  A.turmaForm = function (t, existentes, aoSalvar) {
    const hoje = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    A.modal.form({
      title: t ? 'Editar turma' : 'Nova turma',
      submitLabel: t ? 'Salvar' : 'Criar turma',
      fields: [
        { name: 'nome', label: 'Nome da turma', required: true, value: t ? t.nome : '', placeholder: 'Ex.: Capacitação 14' },
        { name: 'segmento', label: 'Segmento', type: 'select', value: t ? t.segmento : 'capacitacao', hint: ' ',
          options: [['capacitacao', 'Capacitação'], ['integracao', 'Integração'], ['aprendizagem', 'Aprendizagem']] },
        { name: 'variante', label: 'Contrato do aluno', type: 'select', value: (t && t.variante) || '4h',
          options: [['4h', '4 horas · 12 dias de 2 horas'], ['6h', '6 horas · 8 dias']],
          showIf: function (v) { return v.segmento === 'integracao'; } },
        { name: 'inicio', label: 'Data de início', type: 'date', required: true, value: (t && t.inicio) || hoje,
          hint: 'O "Dia N" da turma é contado a partir daqui (dias úteis; na Aprendizagem, 1 aula por semana).',
          showIf: function () { return S.temInicio; } }
      ],
      onChange: function (v) {
        const dica = document.getElementById('mh-segmento');
        if (dica) dica.textContent = 'Regra do curso: ' + S.regraDe(v.segmento, v.variante).texto;
      },
      onSubmit: function (v) {
        const igual = existentes.some(function (x) { return x.souDono !== false && (!t || x.id !== t.id) && A.semAcento(x.nome.trim()) === A.semAcento(v.nome.trim()); });
        if (igual) throw new Error('Já existe uma turma com esse nome.');
        return S.saveTurma(Object.assign({ id: t ? t.id : null }, v)).then(function (salva) {
          A.toast(t ? 'Turma atualizada' : 'Turma criada');
          return aoSalvar(salva);
        });
      }
    });
  };
})(window.Assprom);
