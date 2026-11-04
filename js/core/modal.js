/* ==========================================================
   ASSPROM - Aviso rápido (toast), caixa de confirmação e formulário em janela
   ========================================================== */
window.Assprom = window.Assprom || {};
(function (A) {
  'use strict';

  // Cria elemento: h('div', {class:'x'}, filhos...)
  A.h = function (tag, attrs) {
    const el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') el.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) el.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    Array.prototype.slice.call(arguments, 2).forEach(function (c) {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  };
  const h = A.h;

  // Escapa texto antes de usar em innerHTML
  A.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  A.semAcento = function (s) { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };

  let toastTimer;
  A.toast = function (msg) {
    let t = document.getElementById('toast');
    if (!t) { t = h('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2400);
  };

  function open(opts) {
    const prev = document.activeElement;
    const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title });
    const back = h('div', { class: 'modal-back' }, box);
    function close() {
      document.removeEventListener('keydown', onKey);
      back.remove();
      if (prev && prev.focus) prev.focus();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    box.appendChild(h('h2', { class: 'modal__title', text: opts.title }));
    if (opts.message) box.appendChild(h('p', { class: 'modal__msg', text: opts.message }));
    if (opts.body) box.appendChild(opts.body);
    const bar = h('div', { class: 'modal__actions' });
    opts.actions.forEach(function (a) {
      bar.appendChild(h('button', {
        type: a.submit ? 'submit' : 'button', class: 'pill pill--sm ' + (a.kind === 'solid' ? 'pill--solid' : a.kind === 'danger' ? 'pill--danger-solid' : ''),
        text: a.label, onclick: a.submit ? null : (a.onClick ? function () { a.onClick(close); } : close)
      }));
    });
    (opts.form || box).appendChild(bar);
    if (opts.form) box.appendChild(opts.form);
    back.addEventListener('mousedown', function (e) { if (e.target === back) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(back);
    const first = box.querySelector('input,select,textarea') || box.querySelector('.pill--solid,.pill--danger-solid');
    if (first) first.focus();
    return { close: close, box: box };
  }

  A.modal = {
    // Pergunta sim/não. Devolve Promise<boolean>
    confirm: function (o) {
      return new Promise(function (resolve) {
        let done = false;
        const m = open({
          title: o.title, message: o.message,
          actions: [
            { label: o.cancelLabel || 'Cancelar', onClick: function (c) { done = true; c(); resolve(false); } },
            { label: o.confirmLabel || 'Confirmar', kind: o.danger ? 'danger' : 'solid', onClick: function (c) { done = true; c(); resolve(true); } }
          ]
        });
        new MutationObserver(function (_, ob) { if (!document.body.contains(m.box) && !done) { done = true; resolve(false); ob.disconnect(); } })
          .observe(document.body, { childList: true });
      });
    },

    // Formulário. fields: [{name,label,type:'text'|'select'|'textarea',options:[[valor,rótulo]],value,placeholder,required,hint,showIf(values)}]
    // onSubmit(values) pode devolver Promise; se lançar Error, a mensagem aparece no formulário.
    form: function (o) {
      const form = h('form', { class: 'modal__form', novalidate: true });
      const rows = {};
      const values = function () {
        const v = {};
        o.fields.forEach(function (f) { v[f.name] = form.elements[f.name].value; });
        return v;
      };
      const refresh = function () {
        const v = values();
        o.fields.forEach(function (f) { if (f.showIf) rows[f.name].hidden = !f.showIf(v); });
        if (o.onChange) o.onChange(v, form);
      };
      o.fields.forEach(function (f) {
        let input;
        if (f.type === 'select') {
          input = h('select', { name: f.name, id: 'mf-' + f.name }, ...f.options.map(function (op) { return h('option', { value: op[0], text: op[1] }); }));
        } else if (f.type === 'textarea') {
          input = h('textarea', { name: f.name, id: 'mf-' + f.name, rows: 3, placeholder: f.placeholder || '' });
        } else {
          input = h('input', { name: f.name, id: 'mf-' + f.name, type: f.type === 'date' ? 'date' : 'text', placeholder: f.placeholder || '', autocomplete: 'off' });
        }
        input.value = f.value == null ? '' : f.value;
        input.addEventListener('input', refresh); input.addEventListener('change', refresh);
        rows[f.name] = h('div', { class: 'mfield' },
          h('label', { for: 'mf-' + f.name, text: f.label }), input,
          f.hint ? h('small', { class: 'mfield__hint', id: 'mh-' + f.name, text: f.hint }) : null,
          h('small', { class: 'mfield__error', id: 'me-' + f.name, role: 'alert' }));
        form.appendChild(rows[f.name]);
      });
      const err = h('p', { class: 'notice notice--error', hidden: true, role: 'alert' });
      form.appendChild(err);

      const m = open({
        title: o.title, form: form,
        actions: [
          { label: 'Cancelar' },
          { label: o.submitLabel || 'Salvar', kind: 'solid', submit: true }
        ]
      });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const v = values(); let bad = false;
        o.fields.forEach(function (f) {
          const out = document.getElementById('me-' + f.name);
          const visible = !rows[f.name].hidden;
          const miss = visible && f.required && !String(v[f.name]).trim();
          out.textContent = miss ? 'Preencha este campo.' : '';
          if (miss) bad = true;
        });
        if (bad) return;
        err.hidden = true;
        Promise.resolve().then(function () { return o.onSubmit(v); }).then(function () { m.close(); }, function (ex) { err.textContent = ex.message || 'Não foi possível salvar.'; err.hidden = false; });
      });
      refresh();
      return m;
    }
  };
})(window.Assprom);
