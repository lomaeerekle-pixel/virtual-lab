/* ============================================================
 * stem/sims/biology2.js — ბიოლოგია: ეპიდემიის მოდელი (SIR) და ვაქცინაცია
 * ============================================================ */
(function (VL) {
  'use strict';
  const S = VL.STEM, D = S.draw, f = S.fmt;
  const N = 10000;

  function sirStep(st, v, ctrl, days) {
    const n = Math.max(1, Math.ceil(days / 0.05)), h = days / n, g = 1 / v.D, b = v.R0 * g * (ctrl.lockdown ? 0.4 : 1);
    for (let i = 0; i < n; i++) { const inf = b * st.S * st.I / N, rec = g * st.I; st.S -= inf * h; st.I += (inf - rec) * h; st.R += rec * h; st.day += h; }
    st.peak = Math.max(st.peak, st.I);
  }
  function init(st, v) { const vac = N * v.vac / 100; st.I = 10; st.R = vac; st.S = N - vac - 10; st.day = 0; st.peak = 10; st.hist = [[0, st.S, st.I, st.R]]; }

  S.register({
    key: 'epidemic', subject: 'biology', title: 'ეპიდემია და ვაქცინაცია (SIR მოდელი)', icon: '🦠',
    summary: 'R₀, კოლექტიური იმუნიტეტი, „მრუდის გაბრტყელება“ — მათემატიკა ჯანმრთელობისთვის',
    animated: true, defaultSpeed: 2,
    vars: [
      { key: 'R0', label: 'გავრცელების რიცხვი R₀', min: 0.5, max: 8, step: 0.1, value: 3, unit: '', reset: true },
      { key: 'D', label: 'ავადმყოფობის ხანგრძლივობა', min: 3, max: 21, step: 1, value: 7, unit: 'დღე', reset: true },
      { key: 'vac', label: 'ვაქცინირებული', min: 0, max: 95, step: 1, value: 0, unit: '%', reset: true },
    ],
    presets: [{ label: 'გრიპი (R₀ ≈ 1.5)', values: { R0: 1.5, D: 5 } }, { label: 'COVID-19 (R₀ ≈ 3)', values: { R0: 3, D: 10 } }, { label: 'წითელა (R₀ ≈ 15 → 8)', values: { R0: 8, D: 8 } }],
    create: () => ({ hist: [] }),
    reset(s) { init(s, s.v); s.t = 0; },
    step(s, dt) {
      const days = dt * 15; s.t += dt; if (s.day > 365) return;
      sirStep(s, s.v, s.ctrl, days);
      if (s.day - s.hist[s.hist.length - 1][0] > 1) s.hist.push([s.day, s.S, s.I, s.R]);
    },
    readouts(s) {
      const herd = Math.max(0, 1 - 1 / s.v.R0) * 100;
      return [['დღე', f(s.day, 0)], ['🟦 მგრძნობიარე', f(s.S, 0)], ['🟥 ავადმყოფი', f(s.I, 0) + ` (პიკი ${f(s.peak / N * 100, 1)}%)`], ['🟩 გამოჯანმრთელებული/იმუნური', f(s.R, 0)], ['კოლექტიური იმუნიტეტის ზღვარი', f(herd, 0) + '%'], ['შეზღუდვები', s.ctrl.lockdown ? '🏠 ჩართულია (−60% კონტაქტი)' : '—']];
    },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(0, 0, w, h);
      const gw = Math.min(w * 0.36, h - 30), cell = gw / 20, x0 = 12, y0 = (h - gw) / 2;
      const nI = Math.round(s.I / N * 400), nR = Math.round(s.R / N * 400);
      for (let k = 0; k < 400; k++) {
        const idx = (k * 157) % 400; const col = idx < nI ? '#fa5252' : idx < nI + nR ? '#40c057' : '#74c0fc';
        D.dot(ctx, x0 + (k % 20) * cell + cell / 2, y0 + Math.floor(k / 20) * cell + cell / 2, cell * 0.38, col);
      }
      const gx = x0 + gw + 24, ggw = w - gx - 10;
      const m = D.plot(ctx, gx, 12, ggw, h - 40, { xmin: 0, xmax: Math.max(60, Math.min(365, s.day * 1.2)), ymin: 0, ymax: N }, { xLabel: 'დღე', stepY: 2000 });
      const line = (k, c) => { ctx.strokeStyle = c; ctx.lineWidth = 2.5; ctx.beginPath(); s.hist.concat([[s.day, s.S, s.I, s.R]]).forEach((q, i) => (i ? ctx.lineTo(m.X(q[0]), m.Y(q[k])) : ctx.moveTo(m.X(q[0]), m.Y(q[k])))); ctx.stroke(); };
      line(1, '#1c7ed6'); line(2, '#e03131'); line(3, '#2f9e44');
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#ff8787'; ctx.beginPath(); ctx.moveTo(gx, m.Y(N * 0.15)); ctx.lineTo(gx + ggw, m.Y(N * 0.15)); ctx.stroke(); ctx.restore();
      D.text(ctx, 'საავადმყოფოს ტევადობა (15%)', gx + ggw - 4, m.Y(N * 0.15) - 4, { align: 'right', size: 10, color: '#c92a2a' });
    },
    bridge: {
      vars: (s) => ({ infected: s.I, susceptible: s.S, recovered: s.R, day: s.day, percent: s.I / N * 100 }),
      writable: [{ key: 'lockdown', label: 'შეზღუდვები (lockdown)', value: false }],
      example: '// შეზღუდვები, როცა ავადმყოფთა წილი 5%-ს აჭარბებს\nif (percent > 5) {\n  set("lockdown", true);\n} else {\n  set("lockdown", false);\n}',
    },
    challenges: [
      { key: 'herd', title: 'კოლექტიური იმუნიტეტი', kind: 'state', params: [],
        text: () => 'R₀ = 3-ზე იპოვე ვაქცინაციის მინიმალური დონე, რომლის დროსაც ეპიდემიის პიკი 1%-ზე ნაკლებია. შეადარე ფორმულას 1 − 1/R₀.',
        check(s) {
          if (Math.abs(s.v.R0 - 3) > 0.05) return { passed: false, message: 'დააყენე R₀ = 3.' };
          const st = {}; init(st, s.v); for (let d = 0; d < 365; d++) sirStep(st, s.v, { lockdown: false }, 1);
          const ok = st.peak / N < 0.01 && s.v.vac <= 75; return { passed: ok, message: ok ? `სწორია! ${s.v.vac}% ვაქცინაციით პიკი ${f(st.peak / N * 100, 2)}% (ზღვარი ≈ 67%).` : `პიკი ${f(st.peak / N * 100, 1)}%${s.v.vac > 75 ? ' — სცადე უფრო ნაკლები ვაქცინაციით' : ''}.` };
        } },
      { key: 'flatten', title: 'კოდი: მრუდის გაბრტყელება', kind: 'sim', params: [{ key: 'max', label: 'მაქს. პიკი (%)', value: 10 }],
        text: (p) => `დაწერე წესი, რომელიც set("lockdown", true/false)-ით შეინარჩუნებს ავადმყოფთა წილს ${p.max}%-ზე ქვემოთ მთელი წლის განმავლობაში (R₀ = 3, 7 დღე, ვაქცინაციის გარეშე). შეზღუდვები ყოველთვის ჩართული არ უნდა იყოს!`,
        check(s, p, ctx) {
          const sim = S.get('epidemic'), v = { R0: 3, D: 7, vac: 0 }, comp = S.Bridge.compile(ctx.ruleCode, Object.keys(sim.bridge.vars(s)));
          if (!comp.ok) return { passed: false, message: comp.error }; if (comp.empty) return { passed: false, message: 'ჩაწერე წესი „კოდის ხიდში“.' };
          const st = {}, ctrl = { lockdown: false }; init(st, v); let on = 0;
          try { for (let d = 0; d < 365 * 4; d++) { const o = comp.run({ infected: st.I, susceptible: st.S, recovered: st.R, day: st.day, percent: st.I / N * 100 }); if ('lockdown' in o.sets) ctrl.lockdown = !!o.sets.lockdown; if (ctrl.lockdown) on++; sirStep(st, v, ctrl, 0.25); } } catch (e) { return { passed: false, message: S.Bridge.translate(e) }; }
          const pk = st.peak / N * 100, frac = on / (365 * 4), ok = pk < p.max && frac < 0.95;
          return { passed: ok, message: ok ? `შესანიშნავია! პიკი ${f(pk, 1)}%, შეზღუდვები ${f(frac * 100, 0)}% დროის.` : `პიკი ${f(pk, 1)}%, შეზღუდვები ${f(frac * 100, 0)}% დროის.` };
        } },
      { key: 'rule-lock', title: 'კოდი: შეზღუდვების წესი', kind: 'rule', params: [{ key: 'th', label: 'ზღვარი (%)', value: 5 }],
        text: (p) => `დაწერე წესი: percent > ${p.th} → set("lockdown", true), სხვა შემთხვევაში set("lockdown", false).`,
        vectors: (p) => [{ vars: { percent: p.th + 3 }, expect: (o) => o.sets.lockdown === true, label: `${p.th + 3}% → true` }, { vars: { percent: 1 }, expect: (o) => o.sets.lockdown === false, label: '1% → false' }] },
    ],
  });
})(window.VL);
