/* ============================================================
 * stem/sims/biology.js — ბიოლოგია
 * ფოტოსინთეზი · მტაცებელი და მსხვერპლი · მენდელის გენეტიკა · ფერმენტები
 * ============================================================ */
(function (VL) {
  'use strict';
  const S = VL.STEM, D = S.draw, f = S.fmt;

  /* ============ 1. ფოტოსინთეზი ============ */
  const fL = (L) => L / (L + 25) * 1.25, fC = (c) => c / (c + 0.04) * 1.27;
  const fT = (T) => (T > 45 ? Math.max(0, 1 - (T - 45) / 7) * Math.exp(-Math.pow((T - 27) / 12, 2)) : Math.exp(-Math.pow((T - 27) / 12, 2)));
  const effL = (s) => (s.ctrl.lamp === false ? 0 : s.v.L);
  const rateOf = (L, c, T) => 60 * Math.min(1, fL(L)) * Math.min(1, fC(c)) * fT(T);
  const rate = (s) => rateOf(effL(s), s.v.co2, s.v.T);
  const limiting = (s) => {
    const a = [['სინათლე', Math.min(1, fL(effL(s)))], ['CO₂', Math.min(1, fC(s.v.co2))], ['ტემპერატურა', fT(s.v.T)]];
    return a.sort((x, y) => x[1] - y[1])[0][0];
  };
  S.register({
    key: 'photosynthesis', subject: 'biology', title: 'ფოტოსინთეზი და ლიმიტირებადი ფაქტორები', icon: '🌱',
    summary: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ — სინათლე, CO₂ და ტემპერატურა',
    animated: true, autoplay: true,
    vars: [
      { key: 'L', label: 'სინათლის ინტენსივობა', min: 0, max: 100, step: 1, value: 40, unit: '%' },
      { key: 'co2', label: 'CO₂ კონცენტრაცია', min: 0.01, max: 0.15, step: 0.005, value: 0.04, unit: '%' },
      { key: 'T', label: 'ტემპერატურა', min: 0, max: 55, step: 1, value: 22, unit: '°C' },
    ],
    presets: [{ label: '☁ მოღრუბლული', values: { L: 15 } }, { label: '☀ მზიანი დღე', values: { L: 90 } }, { label: '🏭 სათბური (CO₂ 0.1%)', values: { co2: 0.1, L: 80, T: 27 } }],
    create: () => ({ bubbles: [], acc: 0 }),
    reset(s) { s.t = 0; s.bubbles = []; s.acc = 0; s.total = 0; },
    step(s, dt) {
      s.t += dt; s.acc += rate(s) / 60 * dt * 3;
      while (s.acc >= 1) { s.acc -= 1; s.total++; s.bubbles.push({ x: Math.random() * 30 - 15, y: 0, r: 2 + Math.random() * 3 }); }
      s.bubbles.forEach((b) => { b.y += dt * 60; b.x += Math.sin(b.y / 10) * 0.3; });
      s.bubbles = s.bubbles.filter((b) => b.y < 400);
    },
    readouts(s) { return [['O₂ გამოყოფა', f(rate(s), 1) + ' ბუშტი/წთ'], ['ლიმიტირებადი ფაქტორი', limiting(s)], ['ნათურა', s.ctrl.lamp === false ? '⭘ გამორთულია' : '💡 ჩართულია'], ['დათვლილი ბუშტები', String(s.total)]]; },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(0, 0, w, h);
      const cx = w * 0.22, top = h * 0.2, bw = Math.min(170, w * 0.3), bh = h * 0.66, L = effL(s);
      // ნათურა
      const gr = ctx.createRadialGradient(cx - bw * 0.9, top, 4, cx - bw * 0.9, top, 120); gr.addColorStop(0, `rgba(255,224,102,${L / 110})`); gr.addColorStop(1, 'rgba(255,224,102,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w * 0.45, h);
      D.dot(ctx, Math.max(16, cx - bw * 0.9), top, 12, L > 0 ? '#ffd43b' : '#adb5bd', '#495057');
      // ჭიქა
      ctx.fillStyle = 'rgba(165,216,255,.45)'; ctx.fillRect(cx - bw / 2, top + 20, bw, bh - 20);
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx - bw / 2, top); ctx.lineTo(cx - bw / 2, top + bh); ctx.lineTo(cx + bw / 2, top + bh); ctx.lineTo(cx + bw / 2, top); ctx.stroke();
      // მცენარე (ელოდეა)
      const base = top + bh - 6;
      ctx.strokeStyle = '#2b8a3e'; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const x0 = cx - 20 + i * 20; ctx.beginPath(); ctx.moveTo(x0, base);
        ctx.quadraticCurveTo(x0 + 15 * Math.sin(s.t + i), base - bh * 0.35, x0 + 5, base - bh * 0.62); ctx.stroke();
        for (let j = 1; j < 8; j++) { const yy = base - j * bh * 0.075; ctx.fillStyle = '#40c057'; ctx.beginPath(); ctx.ellipse(x0 + (j % 2 ? 8 : -8), yy, 7, 3, j % 2 ? 0.5 : -0.5, 0, Math.PI * 2); ctx.fill(); }
      }
      s.bubbles.forEach((b) => { const y = base - bh * 0.62 - b.y; if (y > top + 22) D.dot(ctx, cx + 5 + b.x, y, b.r, 'rgba(255,255,255,.9)', 'rgba(116,192,252,.9)'); });
      D.text(ctx, `${f(rate(s), 1)} O₂/წთ`, cx, top - 10, { align: 'center', weight: 700, size: 14, color: '#2b8a3e' });
      // გრაფიკი: სიჩქარე სინათლის მიხედვით
      const gx = w * 0.46, gw = w - gx - 12;
      const m = D.plot(ctx, gx, 14, gw, h - 40, { xmin: 0, xmax: 100, ymin: 0, ymax: 65 }, { xLabel: 'სინათლე, %', yLabel: 'O₂/წთ', stepY: 10 });
      D.fn(ctx, m, (x) => rateOf(x, 0.15, 27), 0, 100, 'rgba(47,158,68,.3)', 2, [5, 4]);
      D.fn(ctx, m, (x) => rateOf(x, s.v.co2, s.v.T), 0, 100, '#2f9e44', 3);
      D.dot(ctx, m.X(L), m.Y(rate(s)), 7, '#e8590c', '#fff');
      D.text(ctx, `ლიმიტირებს: ${limiting(s)}`, gx + 10, 34, { weight: 700, color: '#c92a2a', bg: 'rgba(255,255,255,.85)' });
    },
    bridge: {
      vars: (s) => ({ light: s.v.L, co2: s.v.co2, temperature: s.v.T, rate: rate(s) }),
      writable: [{ key: 'lamp', label: 'ნათურა (lamp)', value: true }],
      example: '// სათბურის კონტროლერი\nif (temperature > 38) {\n  set("lamp", false);\n  alarm("ზედმეტად ცხელა მცენარისთვის!");\n} else {\n  set("lamp", true);\n}',
    },
    challenges: [
      { key: 'rate', title: 'მაქსიმალური ფოტოსინთეზი', kind: 'state', params: [{ key: 'min', label: 'მინ. სიჩქარე (O₂/წთ)', value: 50 }],
        text: (p) => `შეარჩიე პირობები ისე, რომ ჟანგბადის გამოყოფა იყოს ≥ ${p.min} ბუშტი/წთ.`,
        check(s, p) { const r = rate(s), ok = r >= p.min; return { passed: ok, message: ok ? `შესანიშნავია! ${f(r, 1)} O₂/წთ` : `${f(r, 1)} O₂/წთ — ლიმიტირებს: ${limiting(s)}.` }; } },
      { key: 'limit-co2', title: 'CO₂ როგორც ლიმიტირებადი ფაქტორი', kind: 'state', params: [],
        text: () => 'შექმენი პირობები, როცა სინათლე ≥ 80% და ტემპერატურა ოპტიმალურია (20–32 °C), მაგრამ სიჩქარეს მაინც CO₂ ზღუდავს.',
        check(s) { const ok = s.v.L >= 80 && s.v.T >= 20 && s.v.T <= 32 && limiting(s) === 'CO₂'; return { passed: ok, message: ok ? 'სწორია! სინათლის მატება ვეღარ დაეხმარება — CO₂-ა საჭირო.' : `ახლა ლიმიტირებს: ${limiting(s)} (სინათლე ${s.v.L}%, T ${s.v.T} °C).` }; } },
      { key: 'rule-heat', title: 'კოდი: სათბურის დაცვა', kind: 'rule', params: [{ key: 'max', label: 'მაქს. ტემპერატურა', value: 38 }],
        text: (p) => `დაწერე წესი: თუ temperature > ${p.max}, გამორთე ნათურა — set("lamp", false) — და alarm("…"); სხვა შემთხვევაში ნათურა ჩართე.`,
        vectors: (p) => [{ vars: { temperature: 25 }, expect: (o) => o.sets.lamp === true || o.sets.lamp === undefined, label: '25 °C → ნათურა ჩართულია' }, { vars: { temperature: p.max + 4 }, expect: (o) => o.sets.lamp === false && !!o.alarm, label: `${p.max + 4} °C → lamp = false + alarm` }] },
    ],
  });

  /* ============ 2. მტაცებელი და მსხვერპლი ============ */
  S.register({
    key: 'predprey', subject: 'biology', title: 'მტაცებელი და მსხვერპლი (ეკოსისტემა)', icon: '🦊',
    summary: 'კურდღლები და მელიები — ლოტკა-ვოლტერას მოდელი და პოპულაციის ციკლები',
    animated: true, defaultSpeed: 2,
    vars: [
      { key: 'a', label: 'კურდღლების გამრავლება', min: 0.2, max: 1.5, step: 0.05, value: 0.8, unit: '' },
      { key: 'K', label: 'გარემოს ტევადობა (საკვები)', min: 100, max: 1000, step: 10, value: 600, unit: '' },
      { key: 'b', label: 'ნადირობის ეფექტურობა', min: 0.005, max: 0.05, step: 0.001, value: 0.02, unit: '' },
      { key: 'c', label: 'მელიების სიკვდილიანობა', min: 0.1, max: 1, step: 0.05, value: 0.4, unit: '' },
      { key: 'd', label: 'საკვების გადამუშავება', min: 0.001, max: 0.02, step: 0.0005, value: 0.004, unit: '' },
      { key: 'x0', label: 'საწყისი კურდღლები', min: 10, max: 300, step: 5, value: 120, unit: '', reset: true },
      { key: 'y0', label: 'საწყისი მელიები', min: 2, max: 80, step: 1, value: 20, unit: '', reset: true },
    ],
    presets: [{ label: 'ბევრი მელია', values: { y0: 70 } }, { label: 'მწირი საკვები', values: { K: 150 } }],
    create: () => ({ hist: [] }),
    reset(s) { s.x = s.v.x0; s.y = s.v.y0; s.t = 0; s.hist = [[0, s.x, s.y]]; s.minY = s.y; },
    step(s, dt) {
      const n = Math.max(1, Math.ceil(dt / 0.01)), h = dt / n;
      const F = (x, y) => { const hunt = s.ctrl.hunting ? 0.3 : 0; return [s.v.a * x * (1 - x / s.v.K) - s.v.b * x * y, s.v.d * x * y - (s.v.c + hunt) * y]; };
      for (let i = 0; i < n; i++) {
        const k1 = F(s.x, s.y), k2 = F(s.x + h / 2 * k1[0], s.y + h / 2 * k1[1]), k3 = F(s.x + h / 2 * k2[0], s.y + h / 2 * k2[1]), k4 = F(s.x + h * k3[0], s.y + h * k3[1]);
        s.x = Math.max(0, s.x + h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0])); s.y = Math.max(0, s.y + h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]));
        if (s.y < 0.5) s.y = 0; if (s.x < 0.5) s.x = 0;
        s.t += h;
      }
      s.minY = Math.min(s.minY, s.y);
      if (s.t - s.hist[s.hist.length - 1][0] > 0.2) { s.hist.push([s.t, s.x, s.y]); if (s.hist.length > 600) s.hist.shift(); }
    },
    readouts(s) {
      const xe = s.v.c / s.v.d, ye = s.v.a / s.v.b * (1 - xe / s.v.K);
      return [['🐇 კურდღლები', String(Math.round(s.x))], ['🦊 მელიები', String(Math.round(s.y))], ['წონასწორობა (🐇; 🦊)', ye > 0 ? `${Math.round(xe)}; ${Math.round(ye)}` : 'მელიები ვერ გადარჩებიან'], ['დრო', f(s.t, 1) + ' წელი'], ['ნადირობა', s.ctrl.hunting ? '🎯 ჩართულია' : '—']];
    },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(0, 0, w, h);
      // მდელო
      const mw = w * 0.32;
      ctx.fillStyle = '#d3f9d8'; D.rrect(ctx, 10, 10, mw, h - 20, 12); ctx.fill();
      const nr = Math.min(60, Math.round(s.x / 10)), nf = Math.min(30, Math.round(s.y / 3));
      ctx.font = '16px system-ui'; ctx.textAlign = 'center';
      for (let i = 0; i < nr; i++) { const x = 24 + ((i * 53) % (mw - 30)), y = 30 + ((i * 37 + Math.floor(i / 7) * 13) % (h - 60)); ctx.fillText('🐇', x, y + Math.sin(s.t * 3 + i) * 2); }
      for (let i = 0; i < nf; i++) { const x = 30 + ((i * 71 + 20) % (mw - 40)), y = 40 + ((i * 59) % (h - 70)); ctx.fillText('🦊', x, y); }
      const gx = mw + 30, gw = w - gx - 12;
      const t1 = Math.max(30, s.t), t0 = Math.max(0, t1 - 30);
      const ymax = Math.max(100, ...s.hist.map((q) => Math.max(q[1], q[2] * 5))) * 1.1;
      const m = D.plot(ctx, gx, 14, gw, h - 40, { xmin: t0, xmax: t1, ymin: 0, ymax }, { xLabel: 'დრო, წელი', yLabel: 'რაოდენობა' });
      const line = (idx, col, k) => { ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); s.hist.filter((q) => q[0] >= t0).forEach((q, i) => (i ? ctx.lineTo(m.X(q[0]), m.Y(q[idx] * k)) : ctx.moveTo(m.X(q[0]), m.Y(q[idx] * k)))); ctx.stroke(); };
      line(1, '#7950f2', 1); line(2, '#e8590c', 5);
      D.text(ctx, '— 🐇 კურდღლები', gx + 8, 32, { color: '#7950f2', weight: 700, bg: 'rgba(255,255,255,.85)' });
      D.text(ctx, '— 🦊 მელიები ×5', gx + 8, 52, { color: '#e8590c', weight: 700, bg: 'rgba(255,255,255,.85)' });
    },
    bridge: {
      vars: (s) => ({ rabbits: s.x, foxes: s.y, time: s.t }),
      writable: [{ key: 'hunting', label: 'ნადირობა მელიებზე (hunting)', value: false }],
      example: '// ბუნების დაცვის სამსახური: მელიების რაოდენობის კონტროლი\nif (foxes > 40) {\n  set("hunting", true);\n} else {\n  set("hunting", false);\n}\nif (rabbits < 20) alarm("კურდღლები ქრებიან!");',
    },
    challenges: [
      { key: 'equilibrium', title: 'ეკოლოგიური წონასწორობა', kind: 'state', params: [],
        text: () => 'შეარჩიე საწყისი რაოდენობები (კურდღლები და მელიები) წონასწორობის მნიშვნელობებთან ახლოს (±5%), რომ პოპულაციები თითქმის არ იცვლებოდეს. მინიშნება: იხილე „წონასწორობა“ ჩვენებებში.',
        check(s) {
          const xe = s.v.c / s.v.d, ye = s.v.a / s.v.b * (1 - xe / s.v.K);
          if (ye <= 0) return { passed: false, message: 'ამ პარამეტრებით მელიები ვერ გადარჩებიან — გაზარდე საკვები ან შეამცირე სიკვდილიანობა.' };
          const ok = Math.abs(s.v.x0 - xe) / xe <= 0.05 && Math.abs(s.v.y0 - ye) / ye <= 0.05;
          return { passed: ok, message: ok ? `სწორია! (${Math.round(xe)}; ${Math.round(ye)}) — სისტემა სტაბილურია.` : `წონასწორობა ≈ (${Math.round(xe)}; ${Math.round(ye)}), შენ: (${s.v.x0}; ${s.v.y0}).` };
        } },
      { key: 'extinct', title: 'რატომ ქრებიან მელიები?', kind: 'state', params: [],
        text: () => 'შეარჩიე გარემოს ტევადობა (K) და სხვა პარამეტრები ისე, რომ მელიები ვეღარ გადარჩნენ (წონასწორობაში მელიები ≤ 0). რა კავშირია საკვებსა და მტაცებელს შორის?',
        check(s) { const xe = s.v.c / s.v.d; const ok = xe >= s.v.K; return { passed: ok, message: ok ? `სწორია: K = ${s.v.K} < c/d = ${Math.round(xe)} — კურდღლები ვერ კვებავს მელიებს.` : `ახლა K = ${s.v.K}, საჭიროა K ≤ c/d = ${Math.round(xe)}.` }; } },
      { key: 'rule-hunt', title: 'კოდი: პოპულაციის მართვა', kind: 'rule', params: [{ key: 'max', label: 'მელიების ზღვარი', value: 40 }],
        text: (p) => `დაწერე წესი: თუ foxes > ${p.max} → set("hunting", true), სხვა შემთხვევაში set("hunting", false).`,
        vectors: (p) => [{ vars: { foxes: p.max + 15 }, expect: (o) => o.sets.hunting === true, label: `foxes = ${p.max + 15} → hunting = true` }, { vars: { foxes: p.max - 20 }, expect: (o) => o.sets.hunting === false, label: `foxes = ${p.max - 20} → hunting = false`, hint: 'დაამატე else { set("hunting", false); }' }] },
    ],
  });

  /* ============ 3. მენდელის გენეტიკა ============ */
  const TRAITS = { pea: { n: 'ბარდის თესლის ფერი', dom: ['ყვითელი', '#fcc419'], rec: ['მწვანე', '#69db7c'], mid: ['ღია ყვითელ-მწვანე', '#c0eb75'] },
    flower: { n: 'ყვავილის ფერი', dom: ['წითელი', '#fa5252'], rec: ['თეთრი', '#f8f9fa'], mid: ['ვარდისფერი', '#faa2c1'] },
    eye: { n: 'თვალის ფერი (გამარტივებული)', dom: ['ყავისფერი', '#8b5a2b'], rec: ['ცისფერი', '#74c0fc'], mid: ['მწვანე-თაფლისფერი', '#a9a35a'] } };
  const GEN = ['AA', 'Aa', 'aa'];
  const alle = (g) => g.split('');
  const domCount = (a, b) => (a === 'A' ? 1 : 0) + (b === 'A' ? 1 : 0);
  const pheno = (s, dc) => { const t = TRAITS[s.v.trait]; return dc === 0 ? t.rec : (dc === 1 && s.v.incomplete ? t.mid : t.dom); };
  const expectedDom = (s) => { let n = 0; alle(s.v.p1).forEach((a) => alle(s.v.p2).forEach((b) => { if (domCount(a, b) >= (s.v.incomplete ? 2 : 1)) n++; })); return n * 25; };
  S.register({
    key: 'genetics', subject: 'biology', title: 'მენდელის გენეტიკა (პანეტის ცხრილი)', icon: '🧬',
    summary: 'დომინანტური და რეცესიული ალელები, მოსალოდნელი და მიღებული თანაფარდობა',
    animated: false,
    vars: [
      { key: 'trait', label: 'ნიშანი', type: 'select', value: 'pea', options: Object.entries(TRAITS).map(([k, t]) => [k, t.n]) },
      { key: 'p1', label: 'მშობელი 1', type: 'select', value: 'AA', options: GEN.map((g) => [g, g]) },
      { key: 'p2', label: 'მშობელი 2', type: 'select', value: 'aa', options: GEN.map((g) => [g, g]) },
      { key: 'incomplete', label: 'არასრული დომინირება', type: 'toggle', value: 0 },
      { key: 'N', label: 'შთამომავლების რაოდენობა', min: 4, max: 400, step: 4, value: 100, unit: '' },
    ],
    presets: [{ label: 'მენდელის F₁ (AA × aa)', values: { p1: 'AA', p2: 'aa' } }, { label: 'F₂ (Aa × Aa)', values: { p1: 'Aa', p2: 'Aa' } }, { label: 'ანალიზური შეჯვარება', values: { p1: 'Aa', p2: 'aa' } }],
    actions: [{ label: '🎲 შთამომავლობის მიღება', run(s) {
      const c = { 0: 0, 1: 0, 2: 0 }; s.offs = [];
      for (let i = 0; i < s.v.N; i++) { const a = alle(s.v.p1)[Math.random() < 0.5 ? 0 : 1], b = alle(s.v.p2)[Math.random() < 0.5 ? 0 : 1]; const dc = domCount(a, b); c[dc]++; if (s.offs.length < 120) s.offs.push(dc); }
      s.counts = c; s.lastDom = s.offs[s.offs.length - 1];
    } }],
    create: () => ({ counts: null, offs: [] }), reset(s) { s.counts = null; s.offs = []; s.lastDom = 1; }, step() { },
    readouts(s) {
      const obs = s.counts ? Math.round(100 * (s.counts[2] + (s.v.incomplete ? 0 : s.counts[1])) / s.v.N) : null;
      return [['მოსალოდნელი დომინანტური ფენოტიპი', expectedDom(s) + '%'], ['მიღებული', obs === null ? 'დააჭირე 🎲' : obs + '%'],
        ['გენოტიპები AA : Aa : aa', s.counts ? `${s.counts[2]} : ${s.counts[1]} : ${s.counts[0]}` : '—'], ['შეჯვარება', `${s.v.p1} × ${s.v.p2}`]];
    },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      const sz = Math.min(w * 0.42, h - 60) / 3, x0 = 20, y0 = 40;
      const a1 = alle(s.v.p1), a2 = alle(s.v.p2);
      D.text(ctx, 'პანეტის ცხრილი', x0, 24, { weight: 700, size: 14 });
      ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 2; i++) {
        D.text(ctx, a2[i], x0 + sz * (i + 1.5), y0 + sz * 0.6, { align: 'center', size: 22, weight: 700, color: a2[i] === 'A' ? '#1c7ed6' : '#e03131' });
        D.text(ctx, a1[i], x0 + sz * 0.5, y0 + sz * (i + 1.6), { align: 'center', size: 22, weight: 700, color: a1[i] === 'A' ? '#1c7ed6' : '#e03131' });
        for (let j = 0; j < 2; j++) {
          const dc = domCount(a1[i], a2[j]); const ph = pheno(s, dc);
          const x = x0 + sz * (j + 1), y = y0 + sz * (i + 1);
          ctx.fillStyle = '#f8f9fa'; ctx.fillRect(x, y, sz, sz); ctx.strokeRect(x, y, sz, sz);
          D.dot(ctx, x + sz / 2, y + sz * 0.42, sz * 0.22, ph[1], '#495057');
          D.text(ctx, (a1[i] === 'A' || a2[j] !== 'A') ? a1[i] + a2[j] : a2[j] + a1[i], x + sz / 2, y + sz * 0.88, { align: 'center', size: 14, weight: 700 });
        }
      }
      D.text(ctx, '♀ ' + s.v.p1 + ' × ♂ ' + s.v.p2, x0 + sz * 1.5, y0 + sz * 3 + 22, { align: 'center', weight: 700, color: '#495057' });
      // სვეტოვანი დიაგრამა
      const gx = x0 + sz * 3 + 40, gw = w - gx - 16, gh = h - 90;
      const t = TRAITS[s.v.trait];
      const cats = s.v.incomplete ? [[t.dom, 2], [t.mid, 1], [t.rec, 0]] : [[t.dom, -1], [t.rec, 0]];
      const exp = (dcSel) => { let n = 0; a1.forEach((a) => a2.forEach((b) => { const dc = domCount(a, b); if (dcSel === -1 ? dc >= 1 : dc === dcSel) n++; })); return n / 4; };
      const obs = (dcSel) => (s.counts ? (dcSel === -1 ? s.counts[1] + s.counts[2] : s.counts[dcSel]) / s.v.N : 0);
      D.text(ctx, 'ფენოტიპები: მოსალოდნელი ▒ / მიღებული █', gx, 24, { weight: 600, size: 12 });
      const bwid = gw / cats.length;
      cats.forEach(([ph, dc], i) => {
        const bx = gx + i * bwid + 8, base = 40 + gh;
        const e = exp(dc), o = obs(dc);
        ctx.fillStyle = ph[1]; ctx.globalAlpha = 0.35; ctx.fillRect(bx, base - e * gh, bwid * 0.4, e * gh); ctx.globalAlpha = 1;
        ctx.strokeStyle = '#495057'; ctx.strokeRect(bx, base - e * gh, bwid * 0.4, e * gh);
        ctx.fillStyle = ph[1]; ctx.fillRect(bx + bwid * 0.42, base - o * gh, bwid * 0.4, o * gh); ctx.strokeRect(bx + bwid * 0.42, base - o * gh, bwid * 0.4, o * gh);
        D.text(ctx, `${Math.round(e * 100)}% / ${s.counts ? Math.round(o * 100) + '%' : '—'}`, bx + bwid * 0.41, base - Math.max(e, o) * gh - 6, { align: 'center', size: 11, weight: 700 });
        D.text(ctx, ph[0], bx + bwid * 0.41, base + 16, { align: 'center', size: 11 });
      });
      ctx.strokeStyle = '#495057'; ctx.beginPath(); ctx.moveTo(gx, 40 + gh); ctx.lineTo(gx + gw, 40 + gh); ctx.stroke();
    },
    bridge: {
      vars: (s) => ({ dom: s.lastDom ?? 1, expected: expectedDom(s), total: s.v.N }),
      writable: [],
      example: '// dom — დომინანტური ალელების რაოდენობა (0, 1 ან 2) ბოლო შთამომავალში\nif (dom >= 1) {\n  led(true);   // დომინანტური ნიშანი\n  log("დომინანტური ფენოტიპი");\n} else {\n  led(false);\n  log("რეცესიული ფენოტიპი (aa)");\n}',
    },
    challenges: [
      { key: '3to1', title: 'თანაფარდობა 3 : 1', kind: 'state', params: [],
        text: () => 'შეარჩიე მშობლების გენოტიპები ისე, რომ შთამომავლობაში ფენოტიპების მოსალოდნელი თანაფარდობა იყოს 3 : 1 (75% დომინანტური, სრული დომინირებით).',
        check(s) { const ok = !s.v.incomplete && expectedDom(s) === 75; return { passed: ok, message: ok ? 'სწორია! Aa × Aa → 3 : 1 (მენდელის II კანონი).' : `ახლა მოსალოდნელია ${expectedDom(s)}% დომინანტური${s.v.incomplete ? ' (გამორთე არასრული დომინირება)' : ''}.` }; } },
      { key: 'sample', title: 'ალბათობა და შერჩევა', kind: 'state', params: [{ key: 'n', label: 'მინ. შთამომავლები', value: 200 }],
        text: (p) => `აირჩიე ≥ ${p.n} შთამომავალი, დააჭირე 🎲 და მიიღე შედეგი, რომელიც მოსალოდნელს 4%-ზე ნაკლებით აცდება. რატომ ჯობია დიდი შერჩევა?`,
        check(s, p) {
          if (!s.counts) return { passed: false, message: 'დააჭირე „🎲 შთამომავლობის მიღება“.' };
          const obs = 100 * (s.counts[2] + (s.v.incomplete ? 0 : s.counts[1])) / s.v.N, d = Math.abs(obs - expectedDom(s));
          const ok = s.v.N >= p.n && d < 4; return { passed: ok, message: ok ? `სწორია! სხვაობა ${f(d, 1)}%` : `N = ${s.v.N}, სხვაობა ${f(d, 1)}%${s.v.N < p.n ? ' — გაზარდე N' : ' — სცადე თავიდან'}.` };
        } },
      { key: 'rule-pheno', title: 'კოდი: ფენოტიპი გენოტიპიდან', kind: 'rule', params: [],
        text: () => 'ცვლადი dom — დომინანტური ალელების რაოდენობა (AA = 2, Aa = 1, aa = 0). დაწერე წესი: სრული დომინირებისას LED ანთდეს დომინანტურ ფენოტიპზე, ჩაქრეს — რეცესიულზე.',
        vectors: () => [{ vars: { dom: 2 }, expect: (o) => o.led === true, label: 'AA → ჩართულია' }, { vars: { dom: 1 }, expect: (o) => o.led === true, label: 'Aa → ჩართულია', hint: 'ჰეტეროზიგოტაც დომინანტურ ნიშანს ავლენს' }, { vars: { dom: 0 }, expect: (o) => o.led !== true, label: 'aa → ჩამქრალია' }] },
    ],
  });

  /* ============ 4. ფერმენტების აქტივობა ============ */
  const ENZ = { amylase: { n: 'ამილაზა (ნერწყვი)', T: 37, pH: 7 }, pepsin: { n: 'პეფსინი (კუჭი)', T: 37, pH: 2 }, catalase: { n: 'კატალაზა (ღვიძლი)', T: 40, pH: 7.5 }, thermo: { n: 'თერმოფილური ბაქტერიის ფერმენტი', T: 75, pH: 7 } };
  const actT = (T, opt) => (T <= opt ? Math.pow(2, (T - opt) / 10) : Math.max(0, 1 - Math.pow((T - opt) / 12, 2)));
  const actP = (p, opt) => Math.exp(-Math.pow((p - opt) / 1.6, 2));
  const activity = (s) => { const e = ENZ[s.v.enz]; return actT(s.v.T, e.T) * actP(s.v.pH, e.pH) * s.v.S / (s.v.S + 2) * (1 + 2 / 10); };
  const pct = (s) => Math.min(100, activity(s) * 100);
  S.register({
    key: 'enzyme', subject: 'biology', title: 'ფერმენტების აქტივობა', icon: '🧪',
    summary: 'ტემპერატურისა და pH-ის ოპტიმუმი, დენატურაცია, „კლიტე და გასაღები“',
    animated: true, autoplay: true,
    vars: [
      { key: 'enz', label: 'ფერმენტი', type: 'select', value: 'amylase', options: Object.entries(ENZ).map(([k, e]) => [k, e.n]) },
      { key: 'T', label: 'ტემპერატურა', min: 0, max: 95, step: 1, value: 25, unit: '°C' },
      { key: 'pH', label: 'pH', min: 1, max: 13, step: 0.1, value: 7, unit: '' },
      { key: 'S', label: 'სუბსტრატის კონცენტრაცია', min: 0.2, max: 10, step: 0.1, value: 10, unit: '' },
    ],
    presets: [{ label: 'ადამიანის სხეული (37°C)', values: { T: 37 } }, { label: 'კუჭის წვენი (pH 2)', values: { pH: 2 } }, { label: 'ადუღება (90°C)', values: { T: 90 } }],
    create: () => ({ ang: 0 }), reset(s) { s.t = 0; s.ang = 0; s.made = 0; },
    step(s, dt) { s.t += dt; s.ang += dt * pct(s) / 10; s.made += dt * pct(s) / 20; },
    readouts(s) { const e = ENZ[s.v.enz]; return [['აქტივობა', f(pct(s), 0) + '%'], ['ოპტიმუმი', `${e.T}°C, pH ${e.pH}`], ['მდგომარეობა', s.v.T > e.T + 10 ? '⚠ დენატურაცია' : s.v.T < e.T - 15 ? '❄ ნელი მოლეკულები' : '✓ აქტიური'], ['პროდუქტი', f(s.made, 1)]]; },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(0, 0, w, h);
      const e = ENZ[s.v.enz], den = Math.max(0, Math.min(1, (s.v.T - e.T - 5) / 15)) + Math.max(0, Math.min(1, (Math.abs(s.v.pH - e.pH) - 2) / 3));
      const cx = w * 0.2, cy = h * 0.45, R = Math.min(60, w * 0.1);
      // ფერმენტი („პაკმენი“) — დენატურაციისას ფორმა იშლება
      ctx.fillStyle = den > 0.6 ? '#adb5bd' : '#4dabf7';
      ctx.beginPath(); ctx.moveTo(cx, cy);
      for (let a = 0.35; a <= Math.PI * 2 - 0.35; a += 0.1) { const rr = R * (1 + den * 0.25 * Math.sin(a * 5 + s.t)); ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); }
      ctx.closePath(); ctx.fill();
      D.text(ctx, 'ფერმენტი', cx - R * 0.3, cy + 5, { align: 'center', color: '#fff', weight: 700, size: 11 });
      // სუბსტრატი მიფრინავს და იშლება
      const ph = (s.ang % 1);
      if (pct(s) > 2) {
        const sx = cx + R * 2.4 - ph * R * 1.6;
        if (ph < 0.75) { ctx.fillStyle = '#fab005'; ctx.beginPath(); ctx.moveTo(sx, cy); ctx.lineTo(sx + 26, cy - 12); ctx.lineTo(sx + 26, cy + 12); ctx.closePath(); ctx.fill(); }
        else { D.dot(ctx, cx + R * 1.4 + (ph - 0.75) * 120, cy - 20 - (ph - 0.75) * 60, 7, '#fab005'); D.dot(ctx, cx + R * 1.4 + (ph - 0.75) * 120, cy + 20 + (ph - 0.75) * 60, 7, '#fab005'); }
      }
      D.text(ctx, `${e.n}`, cx, 26, { align: 'center', weight: 700 });
      D.text(ctx, `აქტივობა ${f(pct(s), 0)}%`, cx, h - 22, { align: 'center', weight: 700, size: 15, color: pct(s) > 60 ? '#2b8a3e' : '#c92a2a' });
      // გრაფიკები
      const gx = w * 0.42, gw = w - gx - 12, gh = (h - 50) / 2;
      const m1 = D.plot(ctx, gx, 10, gw, gh, { xmin: 0, xmax: 95, ymin: 0, ymax: 1.1 }, { xLabel: 'T, °C', stepY: 0.5, stepX: 10 });
      D.fn(ctx, m1, (T) => actT(T, e.T), 0, 95, '#e8590c', 2.5); D.dot(ctx, m1.X(s.v.T), m1.Y(actT(s.v.T, e.T)), 6, '#e8590c', '#fff');
      const m2 = D.plot(ctx, gx, 30 + gh, gw, gh, { xmin: 1, xmax: 13, ymin: 0, ymax: 1.1 }, { xLabel: 'pH', stepY: 0.5, stepX: 1 });
      D.fn(ctx, m2, (p) => actP(p, e.pH), 1, 13, '#7048e8', 2.5); D.dot(ctx, m2.X(s.v.pH), m2.Y(actP(s.v.pH, e.pH)), 6, '#7048e8', '#fff');
    },
    bridge: {
      vars: (s) => ({ temperature: s.v.T, pH: s.v.pH, activity: pct(s) }),
      writable: [],
      example: '// დენატურაციის გამაფრთხილებელი\nif (temperature > 45) {\n  alarm("ფერმენტი იშლება (დენატურაცია)!");\n}\nif (activity > 80) {\n  led(true);\n} else {\n  led(false);\n}',
    },
    challenges: [
      { key: 'pepsin', title: 'კუჭის ფერმენტი', kind: 'state', params: [{ key: 'min', label: 'მინ. აქტივობა (%)', value: 90 }],
        text: (p) => `აირჩიე პეფსინი და მიაღწიე აქტივობას ≥ ${p.min}%. რა პირობებია კუჭში?`,
        check(s, p) { if (s.v.enz !== 'pepsin') return { passed: false, message: 'აირჩიე ფერმენტი: პეფსინი.' }; const a = pct(s), ok = a >= p.min; return { passed: ok, message: ok ? `სწორია! ${f(a, 0)}% (T ${s.v.T}°C, pH ${s.v.pH})` : `აქტივობა ${f(a, 0)}% — შეამოწმე pH და ტემპერატურა.` }; } },
      { key: 'denature', title: 'ცხელი წყაროს ბაქტერია', kind: 'state', params: [],
        text: () => 'იპოვე ტემპერატურა, რომელზეც ამილაზა უკვე თითქმის აღარ მუშაობს (< 10%), თერმოფილური ბაქტერიის ფერმენტი კი ≥ 80%-ით მუშაობს. მინიშნება: შეამოწმე ორივე ფერმენტი ერთ ტემპერატურაზე.',
        check(s) { const a = actT(s.v.T, ENZ.amylase.T) * actP(s.v.pH, 7), b = actT(s.v.T, ENZ.thermo.T) * actP(s.v.pH, 7); const ok = a < 0.1 && b >= 0.8; return { passed: ok, message: ok ? `სწორია! ${s.v.T}°C: ამილაზა ${f(a * 100, 0)}%, თერმოფილი ${f(b * 100, 0)}%.` : `${s.v.T}°C-ზე: ამილაზა ${f(a * 100, 0)}%, თერმოფილი ${f(b * 100, 0)}%.` }; } },
      { key: 'rule-denat', title: 'კოდი: დენატურაციის განგაში', kind: 'rule', params: [{ key: 'max', label: 'ზღვარი (°C)', value: 45 }],
        text: (p) => `დაწერე წესი: თუ temperature > ${p.max}, ჩართე alarm("…"); თუ activity > 80 — LED ჩართე, სხვა დროს ჩააქრე.`,
        vectors: (p) => [{ vars: { temperature: 37, activity: 95 }, expect: (o) => !o.alarm && o.led === true, label: '37°C, 95% → LED, განგაშის გარეშე' }, { vars: { temperature: p.max + 10, activity: 20 }, expect: (o) => !!o.alarm && o.led !== true, label: `${p.max + 10}°C, 20% → alarm, LED ჩამქრალია` }] },
    ],
  });
})(window.VL);
