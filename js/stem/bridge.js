/* ============================================================
 * stem/bridge.js — „საგანი + კოდი“ ხიდი
 * მოსწავლე წერს მარტივ წესებს (JavaScript/Arduino-ს მსგავსი
 * სინტაქსი), რომლებიც ყოველ კადრზე სრულდება სიმულაციის
 * ცვლადებზე და მართავს LED-ს, განგაშს, ჟურნალს და
 * სიმულაციის მართვად პარამეტრებს (მაგ. გამათბობელი, სარქველი).
 * ============================================================ */
(function (VL) {
  'use strict';
  const C = VL.CodeUtil;
  const B = VL.STEM.Bridge = {};

  const HELPERS = ['abs', 'min', 'max', 'round', 'floor', 'ceil', 'sqrt', 'pow', 'sin', 'cos', 'tan', 'PI', 'map', 'constrain', 'HIGH', 'LOW'];
  const HELPER_VALUES = [Math.abs, Math.min, Math.max, Math.round, Math.floor, Math.ceil, Math.sqrt, Math.pow, Math.sin, Math.cos, Math.tan, Math.PI,
    (x, a, b, c, d) => (x - a) * (d - c) / (b - a) + c, (x, a, b) => Math.min(b, Math.max(a, x)), 1, 0];

  function translate(e) {
    const m = String((e && e.message) || e);
    if (m === '__LOOP__') return 'უსასრულო ციკლი: წესი ერთ კადრში 20000-ზე მეტ გამეორებას აკეთებს.';
    return VL.Tech.translateError(e);
  }

  /** წესის კომპილაცია. აბრუნებს { ok, run(vars) | error } */
  B.compile = (code, names) => {
    if (!String(code || '').trim()) return { ok: true, empty: true, run: () => ({ led: null, alarm: null, logs: [], sets: {} }) };
    try {
      const { code: masked, strs } = C.mask(code);
      let c = masked.replace(/\b(?:const\s+)?(?:unsigned\s+)?(?:int|float|double|long|bool|boolean|byte)\s+(?=[A-Za-z_])/g, 'let ');
      c = C.insertLoopStmt(c, '__g();');
      c = C.unmask(c, strs);
      const safe = names.filter((n) => /^[A-Za-z_]\w*$/.test(n));
      const body = `"use strict"; let __n = 0; const __g = () => { if (++__n > 20000) throw new Error('__LOOP__'); };
        let { ${safe.join(', ')} } = __v;
        { ${c}\n }`;
      const fn = new Function('__v', 'led', 'alarm', 'log', 'set', ...HELPERS, body);
      return {
        ok: true,
        run(vars) {
          const out = { led: null, alarm: null, logs: [], sets: {} };
          fn(vars, (v) => { out.led = !!v; }, (m) => { out.alarm = String(m ?? 'განგაში!'); }, (m) => { if (out.logs.length < 20) out.logs.push(String(m)); }, (k, v) => { out.sets[k] = v; }, ...HELPER_VALUES);
          return out;
        },
      };
    } catch (e) { return { ok: false, error: translate(e) }; }
  };
  B.translate = translate;

  /** წესის შემოწმება სატესტო ვექტორებით */
  B.test = (code, names, vectors, defaults) => {
    const checks = [];
    if (!String(code || '').trim()) return { passed: false, score: 0, checks: [{ label: 'წესი ცარიელია', ok: false, hint: 'ჩაწერე წესი „კოდის ხიდის“ ველში.' }] };
    const comp = B.compile(code, names);
    if (!comp.ok) return { passed: false, score: 0, checks: [{ label: 'წესის კომპილაცია', ok: false, hint: comp.error }] };
    vectors.forEach((v) => {
      let ok = false, hint = v.hint || '';
      try { ok = !!v.expect(comp.run({ ...defaults, ...v.vars })); }
      catch (e) { hint = translate(e); }
      checks.push({ label: v.label, ok, hint: ok ? '' : hint });
    });
    const n = checks.filter((c) => c.ok).length;
    return { passed: n === checks.length, score: Math.round(100 * n / checks.length), checks };
  };
})(window.VL);
