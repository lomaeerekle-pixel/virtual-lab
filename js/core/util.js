/* ============================================================
 * util.js — საერთო დამხმარე ფუნქციები (DOM, მოდალები, შეტყობინებები)
 * ============================================================ */
window.VL = window.VL || {};
(function (VL) {
  'use strict';
  const U = {};

  U.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.$ = (sel, root = document) => root.querySelector(sel);
  U.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  U.uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  U.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  U.round = (n, d = 2) => { const f = Math.pow(10, d); return Math.round(n * f) / f; };
  U.debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  const MONTHS = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];
  U.fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
    if (isNaN(d)) return '—';
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };
  U.fmtDateTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${U.fmtDate(iso)}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  U.todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

  /** დელეგირებული მოვლენები */
  U.on = (root, type, selector, handler) => {
    root.addEventListener(type, (e) => {
      const t = e.target.closest(selector);
      if (t && root.contains(t)) handler(e, t);
    });
  };

  /** Toast შეტყობინება */
  U.toast = (msg, type = 'info', ms = 2800) => {
    const box = document.getElementById('toasts');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.textContent = msg;
    box.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, ms);
  };

  /**
   * მოდალური ფანჯარა
   * opts: { title, html, wide, onMount(el, close), actions: [{label, cls, onClick(el, close) => false|Promise}] }
   */
  U.modal = (opts) => {
    const root = document.getElementById('modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal ${opts.wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h3>${U.esc(opts.title || '')}</h3>
          <button class="icon-btn" data-close aria-label="დახურვა">✕</button>
        </div>
        <div class="modal-body">${opts.html || ''}</div>
        ${opts.actions && opts.actions.length ? `<div class="modal-actions">${opts.actions.map((a, i) => `<button class="btn ${a.cls || ''}" data-act="${i}">${U.esc(a.label)}</button>`).join('')}</div>` : ''}
      </div>`;
    root.appendChild(wrap);
    document.body.classList.add('no-scroll');
    const close = () => { wrap.remove(); if (!root.children.length) document.body.classList.remove('no-scroll'); };
    wrap.addEventListener('click', async (e) => {
      if (e.target === wrap || e.target.closest('[data-close]')) return close();
      const b = e.target.closest('[data-act]');
      if (b) {
        const a = opts.actions[+b.dataset.act];
        if (!a.onClick) return close();
        b.disabled = true;
        try {
          const r = await a.onClick(wrap, close);
          if (r !== false) close();
        } catch (err) {
          U.toast(err.message || String(err), 'error');
        } finally { b.disabled = false; }
      }
    });
    wrap.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    if (opts.onMount) opts.onMount(wrap, close);
    const first = wrap.querySelector('input,select,textarea');
    if (first) setTimeout(() => first.focus(), 30);
    return close;
  };

  U.confirm = (msg, { okLabel = 'დადასტურება', danger = false, title = 'დადასტურება' } = {}) => new Promise((resolve) => {
    let done = false;
    const close = U.modal({
      title, html: `<p>${U.esc(msg)}</p>`,
      actions: [
        { label: 'გაუქმება', cls: 'btn-ghost', onClick: () => { done = true; resolve(false); } },
        { label: okLabel, cls: danger ? 'btn-danger' : 'btn-primary', onClick: () => { done = true; resolve(true); } },
      ],
    });
    // თუ ფონზე დააჭირეს — false
    const obs = new MutationObserver(() => { if (!document.body.contains(document.querySelector('.modal-backdrop')) && !done) { resolve(false); obs.disconnect(); } });
    obs.observe(document.getElementById('modal-root'), { childList: true });
    void close;
  });

  U.copy = async (text) => {
    try { await navigator.clipboard.writeText(text); U.toast('დაკოპირდა', 'success'); }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); U.toast('დაკოპირდა', 'success'); } catch (e2) { U.toast('კოპირება ვერ მოხერხდა', 'error'); }
      ta.remove();
    }
  };

  /** ფორმის მონაცემები ობიექტად */
  U.formData = (form) => {
    const o = {};
    new FormData(form).forEach((v, k) => { o[k] = typeof v === 'string' ? v.trim() : v; });
    return o;
  };

  U.roleLabel = (r) => ({ admin: 'ადმინისტრატორი', teacher: 'მასწავლებელი', student: 'მოსწავლე' }[r] || r);
  U.labLabel = (l) => ({ tech: 'ტექნიკური ლაბი', stem: 'STEM ლაბი' }[l] || l);

  /** ცარიელი მდგომარეობის ბლოკი */
  U.empty = (text, icon = '📭') => `<div class="empty"><div class="empty-icon">${icon}</div><p>${U.esc(text)}</p></div>`;

  VL.U = U;
})(window.VL);
