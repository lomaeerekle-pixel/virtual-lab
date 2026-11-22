/* ============================================================
 * formulas/engine.js — ფორმულების ძრავა
 *  • TeX-ის მსგავსი მინი-სინტაქსის რენდერი (\frac, \sqrt, ^, _, ბერძნული ასოები)
 *  • რიცხვითი ამომხსნელი: ნებისმიერი ცვლადის პოვნა დანარჩენებით
 * ============================================================ */
(function (VL) {
  'use strict';
  const FM = VL.Formulas = VL.Formulas || { list: [], subjects: {}, topics: {} };
  const esc = (s) => VL.U.esc(s);

  const SYM = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ', epsilon: 'ε', eta: 'η', theta: 'θ', lambda: 'λ', mu: 'μ', nu: 'ν', pi: 'π',
    rho: 'ρ', sigma: 'σ', Sigma: 'Σ', tau: 'τ', phi: 'φ', varphi: 'φ', omega: 'ω', Omega: 'Ω', Gamma: 'Γ', chi: 'χ', xi: 'ξ',
  };
  const OPS = { cdot: '·', times: '×', pm: '±', approx: '≈', le: '≤', ge: '≥', ne: '≠', infty: '∞', to: '→', deg: '°', quad: ' ', Rightarrow: '⇒', Leftrightarrow: '⇔', sum: 'Σ', percent: '%', ldots: '…', lceil: '⌈', rceil: '⌉', land: '∧', lor: '∨', oplus: '⊕', circ: '°' };
  const FN = ['sin', 'cos', 'tg', 'ctg', 'lg', 'ln', 'log', 'max', 'min', 'arcsin', 'arccos', 'arctg', 'exp'];

  /** მინი-TeX → HTML */
  FM.tex = function (src) {
    let i = 0; const s = String(src);
    const readName = () => { let n = ''; while (i < s.length && /[A-Za-z]/.test(s[i])) n += s[i++]; return n; };
    function group() {
      while (s[i] === ' ') i++;
      if (s[i] === '{') { i++; const h = seq('}'); i++; return h; }
      return atom();
    }
    function atom() {
      const c = s[i];
      if (c === '\\') {
        i++; const name = readName();
        if (!name) { const ch = s[i++]; return esc(ch); }
        if (name === 'frac') { const a = group(), b = group(); return `<span class="fx-fr"><span class="fx-n">${a}</span><span class="fx-d">${b}</span></span>`; }
        if (name === 'sqrt') { let idx = ''; if (s[i] === '[') { const e = s.indexOf(']', i); idx = s.slice(i + 1, e); i = e + 1; } const a = group(); return `<span class="fx-sq">${idx ? `<sup class="fx-idx">${esc(idx)}</sup>` : ''}√<span class="fx-rad">${a}</span></span>`; }
        if (name === 'text') { const a = group(); return `<span class="fx-t">${a}</span>`; }
        if (name === 'vec') { const a = group(); return `<span class="fx-vec">${a}</span>`; }
        if (name === 'overline' || name === 'bar') { const a = group(); return `<span class="fx-ol">${a}</span>`; }
        if (FN.includes(name)) return `<span class="fx-fn">${name}</span>`;
        if (SYM[name]) return `<i>${SYM[name]}</i>`;
        if (OPS[name]) return ` ${OPS[name]} `.replace(/^ (°|%) $/, '$1');
        return esc(name);
      }
      if (c === '{') { i++; const h = seq('}'); i++; return h; }
      i++;
      if (/[A-Za-z]/.test(c)) return `<i>${c}</i>`;
      if (c === '=') return ' = ';
      if (c === '+') return ' + ';
      if (c === '-') return ' − ';
      if (c === '*') return ' · ';
      if (c === '~') return ' ';
      return esc(c);
    }
    function seq(stop) {
      let out = '';
      while (i < s.length && s[i] !== stop) {
        if (s[i] === '^' || s[i] === '_') { const t = s[i++]; const g = group(); out += t === '^' ? `<sup>${g}</sup>` : `<sub>${g}</sub>`; continue; }
        out += atom();
      }
      return out;
    }
    return `<span class="fx">${seq(null)}</span>`;
  };

  /** ცვლადის სიმბოლოს TeX ავტომატურად: v0 → v_0, rho → \rho, Ek → E_k */
  FM.symTex = (key) => {
    if (SYM[key]) return '\\' + key;
    const m = /^([A-Za-z]+?)(\d+|[a-z]+)?$/.exec(key);
    const greekPre = Object.keys(SYM).find((g) => key.startsWith(g) && key.length > g.length);
    if (greekPre) return '\\' + greekPre + '_{' + key.slice(greekPre.length) + '}';
    if (m && m[2] && m[1].length === 1) return m[1] + '_{' + m[2] + '}';
    return key;
  };

  /** რიცხვითი ამოხსნა: f(vals) = 0 უცნობი k-სთვის */
  FM.solve = function (f, vals, k, hint) {
    const g = (x) => { const v = { ...vals }; v[k] = x; const r = f(v); return Number.isFinite(r) ? r : NaN; };
    const good = (x) => Number.isFinite(x) && Math.abs(g(x)) <= 1e-7 * (1 + Math.abs(x));
    let x0 = Number.isFinite(hint) && hint !== 0 ? hint : 1, x1 = x0 * 1.05 + 0.01;
    for (let it = 0; it < 80; it++) {
      const g0 = g(x0), g1 = g(x1);
      if (!Number.isFinite(g0) || !Number.isFinite(g1)) break;
      if (g1 === g0) break;
      const x2 = x1 - g1 * (x1 - x0) / (g1 - g0);
      if (!Number.isFinite(x2)) break;
      x0 = x1; x1 = x2;
      if (Math.abs(x1 - x0) < 1e-12 * (1 + Math.abs(x1))) break;
    }
    if (good(x1)) return x1;
    // ნიშნის ცვლილების ძებნა ლოგარითმულ ბადეზე
    const pts = [0];
    for (let e = -6; e <= 9; e += 0.05) { pts.push(Math.pow(10, e)); pts.push(-Math.pow(10, e)); }
    pts.sort((a, b) => a - b);
    const prefer = (hint || 1) >= 0 ? 1 : -1;
    let best = NaN;
    for (let j = 0; j < pts.length - 1; j++) {
      let a = pts[j], b = pts[j + 1], ga = g(a), gb = g(b);
      if (!Number.isFinite(ga) || !Number.isFinite(gb) || ga * gb > 0) continue;
      for (let it = 0; it < 200; it++) { const m = (a + b) / 2, gm = g(m); if (!Number.isFinite(gm)) break; if (ga * gm <= 0) { b = m; gb = gm; } else { a = m; ga = gm; } }
      const r = (a + b) / 2;
      if (good(r) || Math.abs(g(r)) < 1e-6 * (1 + Math.abs(r))) { if (Number.isNaN(best) || (Math.sign(r) === prefer && Math.sign(best) !== prefer)) best = r; if (Math.sign(r) === prefer) break; }
    }
    return best;
  };

  FM.fmt = (x) => {
    if (!Number.isFinite(x)) return '—';
    const a = Math.abs(x);
    if (a !== 0 && (a >= 1e7 || a < 1e-4)) { const [m, e] = x.toExponential(3).split('e'); return `${(+m)}·10<sup>${+e}</sup>`; }
    return String(+x.toPrecision(5));
  };

  FM.add = (subj, topic, list) => list.forEach(([name, tex, vars, f, extra]) => {
    FM.list.push({ id: `${subj}-${FM.list.length}`, subj, topic, name, tex, vars: (vars || []).map(([k, label, unit, def, sym]) => ({ k, label, unit: unit || '', def, sym: sym || FM.symTex(k) })), f, ...(extra || {}) });
  });

  /* ---------- დამხმარე მათემატიკური ფუნქციები მონაცემებისთვის ---------- */
  const R = Math.PI / 180;
  FM.M = { sinD: (a) => Math.sin(a * R), cosD: (a) => Math.cos(a * R), tanD: (a) => Math.tan(a * R), g: 9.81, G: 6.674e-11, c: 3e8, h: 6.626e-34, NA: 6.022e23, R: 8.314, k: 8.99e9, sigma: 5.67e-8 };
})(window.VL);
