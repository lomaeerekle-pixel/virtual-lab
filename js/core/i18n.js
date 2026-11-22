/* ============================================================
 * i18n.js — ენის გადართვა (ქართული ⇄ English)
 *
 * The app is written in Georgian. In English mode this layer translates
 * what the user sees, without touching the program logic:
 *   • DOM text and the placeholder / title / aria-label / alt attributes
 *     (a MutationObserver translates everything that gets rendered),
 *   • text drawn on <canvas> (simulation labels),
 *   • code put into editors programmatically (starter-code comments).
 * Translations come from js/i18n/en.js (Georgian source → English).
 * Fragments are matched word-by-word, so dynamic strings such as
 * "T = 1.52 წმ" become "T = 1.52 s".
 * ============================================================ */
(function (VL) {
  'use strict';
  const KEY = 'vlab.lang';
  let lang = 'ka';
  try { lang = localStorage.getItem(KEY) || 'ka'; } catch (e) { /* ignore */ }
  if (lang !== 'en') lang = 'ka';

  const I = VL.i18n = {
    lang,
    isEn: lang === 'en',
    set(l) {
      try { localStorage.setItem(KEY, l === 'en' ? 'en' : 'ka'); } catch (e) { /* ignore */ }
      location.reload();
    },
    toggle() { I.set(I.isEn ? 'ka' : 'en'); },
    tr: (s) => s,
  };
  document.documentElement.lang = I.isEn ? 'en' : 'ka';
  if (!I.isEn) return;

  /* ---------- dictionary & matcher ---------- */
  const dict = VL.I18N_EN || {};
  const GE = /[Ⴀ-ჿ]/;
  const isLetter = (c) => c >= 0x10D0 && c <= 0x10FF;
  const isWs = (c) => c === 32 || c === 9 || c === 10 || c === 13 || c === 160;
  const norm = (s) => s.replace(/\s+/g, ' ').trim();

  // candidates grouped by first character, longest first
  const byFirst = new Map();
  for (const k of Object.keys(dict)) {
    if (!k) continue;
    const letters = (k.match(/[ა-ჿ]/g) || []).length;
    if (!letters && k.length < 2) continue;
    const c = k.charCodeAt(0);
    if (!byFirst.has(c)) byFirst.set(c, []);
    byFirst.get(c).push(k);
  }
  byFirst.forEach((arr) => arr.sort((a, b) => b.length - a.length));

  // match key at s[i], treating any whitespace run in s as one space; returns end index or -1
  function matchAt(s, i, key) {
    let j = i;
    for (let p = 0; p < key.length; p++) {
      const kc = key.charCodeAt(p);
      if (kc === 32) {
        if (j >= s.length || !isWs(s.charCodeAt(j))) return -1;
        while (j < s.length && isWs(s.charCodeAt(j))) j++;
        continue;
      }
      if (s.charCodeAt(j) !== kc) return -1;
      j++;
    }
    // word boundary after a Georgian letter
    if (isLetter(key.charCodeAt(key.length - 1)) && j < s.length && isLetter(s.charCodeAt(j))) return -1;
    return j;
  }

  const cache = new Map();
  function tr(s) {
    if (s == null) return s;
    s = String(s);
    if (!GE.test(s)) return s;
    const hit = cache.get(s);
    if (hit !== undefined) return hit;
    let out;
    const n = norm(s);
    if (Object.prototype.hasOwnProperty.call(dict, n)) {
      out = s.match(/^\s*/)[0] + dict[n] + s.match(/\s*$/)[0];
    } else {
      let res = '', i = 0, last = 0;
      while (i < s.length) {
        const c = s.charCodeAt(i);
        const prevLetter = i > 0 && isLetter(s.charCodeAt(i - 1));
        const cands = byFirst.get(c);
        let end = -1, key = null;
        if (cands && !(isLetter(c) && prevLetter)) {
          for (const k of cands) { const e = matchAt(s, i, k); if (e > 0) { end = e; key = k; break; } }
        }
        if (end > 0) { res += s.slice(last, i) + dict[key]; i = last = end; }
        else i++;
      }
      out = res + s.slice(last);
    }
    if (cache.size > 6000) cache.clear();
    cache.set(s, out);
    return out;
  }
  I.tr = tr;

  /* ---------- canvas text ---------- */
  const C2D = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (C2D) {
    ['fillText', 'strokeText', 'measureText'].forEach((fn) => {
      const orig = C2D[fn];
      C2D[fn] = function (text, ...rest) { return orig.call(this, tr(text), ...rest); };
    });
  }

  /* ---------- code put into editors programmatically ---------- */
  const TA = window.HTMLTextAreaElement && HTMLTextAreaElement.prototype;
  const desc = TA && Object.getOwnPropertyDescriptor(TA, 'value');
  if (desc && desc.set) {
    Object.defineProperty(TA, 'value', {
      configurable: true, enumerable: desc.enumerable,
      get() { return desc.get.call(this); },
      set(v) { desc.set.call(this, typeof v === 'string' && GE.test(v) ? tr(v) : v); },
    });
  }

  /* ---------- DOM ---------- */
  const SKIP = 'textarea, pre, script, style, [contenteditable="true"], [data-noi18n]';
  const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  function trText(node) {
    const p = node.parentElement;
    if (!p || p.closest(SKIP)) return;
    const v = node.data;
    if (!GE.test(v)) return;
    const t = tr(v);
    if (t !== v) node.data = t;
  }
  function trAttrs(el) {
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (v && GE.test(v)) { const t = tr(v); if (t !== v) el.setAttribute(a, t); }
    }
    if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit') && GE.test(el.value)) el.value = tr(el.value);
  }
  function walk(root) {
    if (root.nodeType === 3) return trText(root);
    if (root.nodeType !== 1 || root.closest(SKIP)) return;
    trAttrs(root);
    root.querySelectorAll('[placeholder],[title],[aria-label],[alt],input[type=button],input[type=submit]').forEach(trAttrs);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (tw.nextNode()) nodes.push(tw.currentNode);
    nodes.forEach(trText);
  }
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'childList') m.addedNodes.forEach(walk);
      else if (m.type === 'characterData') trText(m.target);
      else if (m.type === 'attributes' && m.target.nodeType === 1 && !m.target.closest(SKIP)) trAttrs(m.target);
    }
  });
  function start() {
    walk(document.documentElement);
    mo.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (document.documentElement) start();
})(window.VL = window.VL || {});
