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

    // Caixinhas que desativam um campo (ex.: "Não tenho telefone")
    form.querySelectorAll('[data-disables]').forEach(function (box) {
      const target = document.getElementById(box.dataset.disables);
      const rules = target.dataset.rules;
      box.addEventListener('change', function () {
        target.disabled = box.checked;
        if (box.checked) { target.value = ''; target.removeAttribute('data-rules'); }
        else target.dataset.rules = rules;
        A.setError(target, '');
      });
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

      A.notify(form, '');
      A.setLoading(button, true);
      Promise.resolve(options.onSubmit ? options.onSubmit(data) : null)
        .catch(function (err) {
          A.notify(form, A.auth ? A.auth.message(err) : 'Ocorreu um erro. Tente novamente.', 'error');
          A.shake(button);
        })
        .finally(function () { A.setLoading(button, false); });
    });
  };
})(window.Assprom);
