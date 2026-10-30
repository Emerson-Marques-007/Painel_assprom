/* ==========================================================
   ASSPROM - Utilitários de interface (namespace global Assprom)
   Scripts clássicos (sem módulos) para funcionar abrindo o HTML direto do disco.
   Ordem de carga: ui -> validators -> masks -> form -> pages/*
   ========================================================== */
window.Assprom = window.Assprom || {};

(function (A) {
  'use strict';

  // Mostra (ou limpa) a mensagem de erro de um campo
  A.setError = function (input, message) {
    const field = input.closest('.field');
    const output = document.getElementById(input.id + '-error');
    field.classList.toggle('field--invalid', Boolean(message));
    if (output) output.textContent = message || '';
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  };

  // Balança um elemento (erro de validação)
  A.shake = function (element) {
    element.classList.remove('is-shaking');
    void element.offsetWidth;                    // reinicia a animação
    element.classList.add('is-shaking');
    element.addEventListener('animationend', function () {
      element.classList.remove('is-shaking');
    }, { once: true });
  };

  // Onda (ripple) no ponto do clique do botão
  A.ripple = function (button, event) {
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const el = document.createElement('span');
    el.className = 'btn__ripple';
    el.style.width = el.style.height = size + 'px';
    const x = event.clientX ? event.clientX - rect.left : rect.width / 2;
    const y = event.clientY ? event.clientY - rect.top : rect.height / 2;
    el.style.left = (x - size / 2) + 'px';
    el.style.top  = (y - size / 2) + 'px';
    button.appendChild(el);
    el.addEventListener('animationend', function () { el.remove(); });
  };

  // Aviso no topo do botão (type: 'error' | 'success'); mensagem vazia remove
  A.notify = function (form, message, type) {
    let box = form.querySelector('.notice[data-form-notice]');
    if (!message) { if (box) box.remove(); return; }
    if (!box) {
      box = document.createElement('p');
      box.setAttribute('data-form-notice', '');
      box.setAttribute('role', 'alert');
      form.querySelector('.btn').before(box);
    }
    box.className = 'notice notice--' + (type || 'error');
    box.textContent = message;
  };

  // Liga/desliga o spinner do botão
  A.setLoading = function (button, isLoading) {
    button.classList.toggle('is-loading', isLoading);
    button.disabled = isLoading;
  };
})(window.Assprom);
