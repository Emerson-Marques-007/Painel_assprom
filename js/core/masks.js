/* ==========================================================
   ASSPROM - Máscaras de digitação (use em data-mask="date|matricula|phone")
   ========================================================== */
(function (A) {
  'use strict';

  A.masks = {
    date: function (v) {
      v = v.replace(/\D/g, '').slice(0, 8);
      return v.replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
    },
    matricula: function (v) {
      v = v.replace(/\D/g, '').slice(0, 8);
      return v.replace(/^(\d{4})(\d)/, '$1-$2');
    },
    phone: function (v) {
      v = v.replace(/\D/g, '').slice(0, 11);
      if (v.length > 10) return v.replace(/^(\d{2})(\d{5})(\d)/, '($1) $2-$3');
      if (v.length > 6)  return v.replace(/^(\d{2})(\d{4})(\d)/, '($1) $2-$3');
      if (v.length > 2)  return v.replace(/^(\d{2})(\d)/, '($1) $2');
      return v;
    }
  };

  A.applyMasks = function (form) {
    form.querySelectorAll('[data-mask]').forEach(function (input) {
      input.addEventListener('input', function () {
        input.value = A.masks[input.dataset.mask](input.value);
      });
    });
  };
})(window.Assprom);
