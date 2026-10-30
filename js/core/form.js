/* ==========================================================
   ASSPROM - Liga tudo em um formulário:
   máscaras, validação, efeitos do botão e envio.
   Uso: Assprom.initForm(form, { onValid: function (data) { ... } })
   ========================================================== */
(function (A) {
  'use strict';

  A.initForm = function (form, options) {
    options = options || {};
    const button = form.querySelector('.btn');

    A.applyMasks(form);

    // Limpa o erro assim que a pessoa volta a digitar / marcar / escolher
    form.querySelectorAll('[data-rules]').forEach(function (input) {
      const evt = input.type === 'checkbox' || input.tagName === 'SELECT' ? 'change' : 'input';
      input.addEventListener(evt, function () { A.setError(input, ''); });
    });

    button.addEventListener('click', function (event) { A.ripple(button, event); });

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      if (!A.validateAll(form)) {
        A.shake(button);
        form.querySelectorAll('.field--invalid .field__box').forEach(A.shake);
        return;
      }

      const data = Object.fromEntries(new FormData(form));
      if (options.onValid) options.onValid(data);

      // TODO: enviar ao back-end, por exemplo:
      // fetch('/api/...', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(data) });
      console.log('Formulário válido:', data);

      // Simulação de 1,5s com spinner; troque pelo .finally() do fetch real
      A.setLoading(button, true);
      setTimeout(function () { A.setLoading(button, false); }, 1500);
    });
  };
})(window.Assprom);
