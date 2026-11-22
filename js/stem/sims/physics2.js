/* ============================================================
 * stem/sims/physics2.js — ფიზიკა (დამატებითი): ზამბარის რხევა, ტალღები
 * ============================================================ */
(function (VL) {
  'use strict';
  const S = VL.STEM, D = S.draw, f = S.fmt;

  /* ============ ზამბარიანი საქანელა (ჰუკის კანონი) ============ */
  const Tsp = (s) => 2 * Math.PI * Math.sqrt(s.v.m / s.v.k);
  S.register({
    key: 'spring', subject: 'physics', title: 'ზამბარიანი საქანელა (ჰუკის კანონი)', icon: '🌀',
    summary: 'F = −kx, T = 2π√(m/k) — რხევა, ენერგია, მილევა',
    animated: true, autoplay: true,
    vars: [
      { key: 'k', label: 'სიხისტე k', min: 5, max: 100, step: 1, value: 20, unit: 'ნ/მ' },
      { key: 'm', label: 'მასა m', min: 0.1, max: 2, step: 0.05, value: 0.5, unit: 'კგ' },
      { key: 'A', label: 'ამპლიტუდა', min: 0.05, max: 0.3, step: 0.01, value: 0.15, unit: 'მ', reset: true },
      { key: 'b', label: 'მილევა', min: 0, max: 1, step: 0.01, value: 0, unit: '' },
    ],
    presets: [{ label: 'რბილი ზამბარა', values: { k: 8 } }, { label: 'ხისტი ზამბარა', values: { k: 80 } }, { label: 'მძიმე ტვირთი', values: { m: 1.8 } }],
    create: () => ({ hist: [] }),
    reset(s) { s.x = s.v.A; s.vel = 0; s.t = 0; s.hist = []; },
    step(s, dt) {
      const n = Math.max(1, Math.ceil(dt / 0.002)), h = dt / n;
      for (let i = 0; i < n; i++) { const a = (-s.v.k * s.x - s.v.b * s.vel) / s.v.m; s.vel += a * h; s.x += s.vel * h; s.t += h; }
      if (!s.hist.length || s.t - s.hist[s.hist.length - 1][0] > 0.03) { s.hist.push([s.t, s.x]); if (s.hist.length > 400) s.hist.shift(); }
    },
    readouts(s) {
      const Ek = 0.5 * s.v.m * s.vel * s.vel, Ep = 0.5 * s.v.k * s.x * s.x;
      return [['T = 2π√(m/k)', f(Tsp(s), 3) + ' წმ'], ['გადახრა x', f(s.x * 100, 1) + ' სმ'], ['ძალა F = −kx', f(-s.v.k * s.x, 2) + ' ნ'],
        ['კინეტიკური ენერგია', f(Ek, 3) + ' ჯ'], ['პოტენციური ენერგია', f(Ep, 3) + ' ჯ']];
    },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(0, 0, w, h);
      const cx = w * 0.22, top = 20, eq = h * 0.5, sc = (h * 0.32) / 0.3;
      ctx.fillStyle = '#adb5bd'; ctx.fillRect(cx - 50, top - 10, 100, 10);
      const y = eq + s.x * sc, coils = 14;
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, top);
      for (let i = 1; i <= coils; i++) ctx.lineTo(cx + (i % 2 ? 14 : -14), top + (y - 24 - top) * i / (coils + 1));
      ctx.lineTo(cx, y - 24); ctx.stroke();
      const sz = 22 + s.v.m * 12;
      ctx.fillStyle = '#e8590c'; D.rrect(ctx, cx - sz / 2, y - 24, sz, sz, 6); ctx.fill();
      D.text(ctx, `${s.v.m} კგ`, cx, y - 24 + sz / 2 + 4, { align: 'center', color: '#fff', weight: 700, size: 11 });
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#74c0fc'; ctx.beginPath(); ctx.moveTo(cx - 60, eq - 24 + sz / 2); ctx.lineTo(cx + 60, eq - 24 + sz / 2); ctx.stroke(); ctx.restore();
      if (Math.abs(s.x) > 0.005) D.arrow(ctx, cx + 40, y - 24 + sz / 2, cx + 40, y - 24 + sz / 2 - s.v.k * s.x * 3, '#c92a2a', 2.5);
      const gx = w * 0.42, gw = w - gx - 12;
      const t0 = Math.max(0, s.t - 6);
      const m = D.plot(ctx, gx, 14, gw, h - 40, { xmin: t0, xmax: t0 + 6, ymin: -0.32, ymax: 0.32 }, { xLabel: 't, წმ', yLabel: 'x, მ', stepY: 0.1 });
      ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 2.5; ctx.beginPath();
      s.hist.filter(([t]) => t >= t0).forEach(([t, x], i) => (i ? ctx.lineTo(m.X(t), m.Y(x)) : ctx.moveTo(m.X(t), m.Y(x)))); ctx.stroke();
      D.text(ctx, `T = ${f(Tsp(s), 2)} წმ`, gx + 8, 32, { weight: 700, color: '#d9480f', bg: 'rgba(255,255,255,.85)' });
    },
    bridge: {
      vars: (s) => ({ x: s.x, velocity: s.vel, force: -s.v.k * s.x, time: s.t, period: Tsp(s) }),
      writable: [],
      example: '// LED ანთდება წონასწორობის წერტილის გავლისას\nif (abs(x) < 0.01) {\n  led(true);\n} else {\n  led(false);\n}',
    },
    challenges: [
      { key: 'period', title: 'სამიზნე პერიოდი', kind: 'state', params: [{ key: 'target', label: 'T (წმ)', value: 1.5 }, { key: 'tol', label: 'ცდომილება', value: 0.03 }],
        text: (p) => `შეარჩიე k და m ისე, რომ რხევის პერიოდი იყოს ${p.target} წმ (±${p.tol}).`,
        check(s, p) { const T = Tsp(s), ok = Math.abs(T - p.target) <= p.tol; return { passed: ok, message: ok ? `სწორია! T = ${f(T, 3)} წმ (k = ${s.v.k}, m = ${s.v.m})` : `T = ${f(T, 3)} წმ — ${T > p.target ? 'გაზარდე k ან შეამცირე m' : 'შეამცირე k ან გაზარდე m'}.` }; } },
      { key: 'force', title: 'დრეკადობის ძალა', kind: 'state', params: [{ key: 'target', label: 'მაქს. ძალა (ნ)', value: 6 }],
        text: (p) => `შეარჩიე k და ამპლიტუდა ისე, რომ მაქსიმალური დრეკადობის ძალა F = k·A იყოს ${p.target} ნ (±0.2).`,
        check(s, p) { const F = s.v.k * s.v.A, ok = Math.abs(F - p.target) <= 0.2; return { passed: ok, message: ok ? `სწორია! F = ${f(F)} ნ` : `F = k·A = ${f(F)} ნ.` }; } },
      { key: 'rule-zero', title: 'კოდი: წონასწორობის სენსორი', kind: 'rule', params: [],
        text: () => 'დაწერე წესი: LED ანთდეს, როცა |x| < 0.01 მ (ტვირთი წონასწორობის წერტილთანაა), სხვა დროს ჩაქრეს.',
        vectors: () => [{ vars: { x: 0 }, expect: (o) => o.led === true, label: 'x = 0 → ჩართულია' }, { vars: { x: -0.005 }, expect: (o) => o.led === true, label: 'x = −0.005 → ჩართულია', hint: 'abs(x)' }, { vars: { x: 0.12 }, expect: (o) => o.led !== true, label: 'x = 0.12 → ჩამქრალია' }] },
    ],
  });

  /* ============ ტალღები და ინტერფერენცია ============ */
  const lam = (s) => s.v.v / s.v.f;
  const sumAmp = (s) => (s.v.two ? Math.sqrt(s.v.A * s.v.A + s.v.A2 * s.v.A2 + 2 * s.v.A * s.v.A2 * Math.cos(s.v.ph * Math.PI / 180)) : s.v.A);
  S.register({
    key: 'waves', subject: 'physics', title: 'ტალღები და ინტერფერენცია', icon: '🌊',
    summary: 'v = λ·f — ტალღის სიგრძე, სიხშირე, ორი ტალღის შეკრება',
    animated: true, autoplay: true,
    vars: [
      { key: 'A', label: 'ამპლიტუდა A₁', min: 0.2, max: 2, step: 0.1, value: 1, unit: 'მ' },
      { key: 'f', label: 'სიხშირე f', min: 0.2, max: 3, step: 0.05, value: 1, unit: 'ჰც' },
      { key: 'v', label: 'გავრცელების სიჩქარე v', min: 1, max: 10, step: 0.5, value: 4, unit: 'მ/წ' },
      { key: 'two', label: 'მეორე ტალღა', type: 'toggle', value: 0 },
      { key: 'A2', label: 'ამპლიტუდა A₂', min: 0, max: 2, step: 0.1, value: 1, unit: 'მ' },
      { key: 'ph', label: 'ფაზური სხვაობა φ', min: 0, max: 360, step: 5, value: 0, unit: '°' },
    ],
    presets: [{ label: 'კონსტრუქციული ინტერფერენცია', values: { two: 1, ph: 0, A2: 1 } }, { label: 'დესტრუქციული', values: { two: 1, ph: 180, A2: 1, A: 1 } }],
    create: () => ({}), reset(s) { s.t = 0; }, step(s, dt) { s.t += dt; },
    readouts(s) { return [['ტალღის სიგრძე λ = v/f', f(lam(s), 2) + ' მ'], ['პერიოდი T = 1/f', f(1 / s.v.f, 2) + ' წმ'], ['ჯამური ამპლიტუდა', f(sumAmp(s), 2) + ' მ'], ['ტალღები', s.v.two ? 'ორი (სუპერპოზიცია)' : 'ერთი']]; },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(0, 0, w, h);
      const m = D.plot(ctx, 10, 10, w - 20, h - 30, { xmin: 0, xmax: 12, ymin: -4.2, ymax: 4.2 }, { xLabel: 'x, მ', yLabel: 'y, მ', stepX: 1, stepY: 1 });
      const k = 2 * Math.PI / lam(s), om = 2 * Math.PI * s.v.f, ph = s.v.ph * Math.PI / 180;
      const y1 = (x) => s.v.A * Math.sin(k * x - om * s.t), y2 = (x) => s.v.A2 * Math.sin(k * x - om * s.t + ph);
      D.fn(ctx, m, y1, 0, 12, s.v.two ? 'rgba(28,126,214,.6)' : '#1c7ed6', s.v.two ? 2 : 3);
      if (s.v.two) { D.fn(ctx, m, y2, 0, 12, 'rgba(247,103,7,.7)', 2, [6, 5]); D.fn(ctx, m, (x) => y1(x) + y2(x), 0, 12, '#7048e8', 3.5); }
      const L = lam(s);
      if (L < 11) { ctx.strokeStyle = '#2f9e44'; ctx.lineWidth = 2; const x0 = (Math.PI / 2 + om * s.t) / k % L; const yy = m.Y(3.7); D.arrow(ctx, m.X(x0), yy, m.X(x0 + L), yy, '#2f9e44', 2); D.text(ctx, `λ = ${f(L, 2)} მ`, m.X(x0 + L / 2), yy - 6, { align: 'center', color: '#2b8a3e', weight: 700 }); }
      D.dot(ctx, m.X(0), m.Y(s.v.two ? y1(0) + y2(0) : y1(0)), 7, '#e03131', '#fff');
    },
    bridge: {
      vars: (s) => { const k = 2 * Math.PI / lam(s), om = 2 * Math.PI * s.v.f; const y = s.v.A * Math.sin(-om * s.t) + (s.v.two ? s.v.A2 * Math.sin(-om * s.t + s.v.ph * Math.PI / 180) : 0); void k; return { y, amplitude: sumAmp(s), wavelength: lam(s), frequency: s.v.f, time: s.t }; },
      writable: [],
      example: '// LED ანთდება ტალღის „მწვერვალზე“ (წითელი წერტილი x = 0-ზე)\nif (y > 0.8 * amplitude) {\n  led(true);\n} else {\n  led(false);\n}',
    },
    challenges: [
      { key: 'wavelength', title: 'ტალღის სიგრძე', kind: 'state', params: [{ key: 'target', label: 'λ (მ)', value: 2.5 }],
        text: (p) => `შეარჩიე v და f ისე, რომ ტალღის სიგრძე იყოს λ = ${p.target} მ (±0.05).`,
        check(s, p) { const L = lam(s), ok = Math.abs(L - p.target) <= 0.05; return { passed: ok, message: ok ? `სწორია! λ = ${f(L)} მ` : `λ = v/f = ${f(L)} მ.` }; } },
      { key: 'cancel', title: 'ტალღების ჩაქრობა', kind: 'state', params: [],
        text: () => 'ჩართე მეორე ტალღა და შეარჩიე A₂ და φ ისე, რომ ჯამური ტალღა თითქმის გაქრეს (ამპლიტუდა < 0.05 მ). ასე მუშაობს ხმაურის ჩამხშობი ყურსასმენები!',
        check(s) { const a = sumAmp(s), ok = !!s.v.two && a < 0.05; return { passed: ok, message: ok ? 'შესანიშნავია! დესტრუქციული ინტერფერენცია (φ = 180°, A₁ = A₂).' : (s.v.two ? `ჯამური ამპლიტუდა ${f(a)} მ.` : 'ჩართე „მეორე ტალღა“.') }; } },
      { key: 'rule-crest', title: 'კოდი: მწვერვალის დეტექტორი', kind: 'rule', params: [],
        text: () => 'დაწერე წესი: LED ანთდეს, როცა y > 0.8·amplitude, სხვა შემთხვევაში ჩაქრეს.',
        vectors: () => [{ vars: { y: 0.95, amplitude: 1 }, expect: (o) => o.led === true, label: 'y = 0.95, A = 1 → ჩართულია' }, { vars: { y: 0.5, amplitude: 1 }, expect: (o) => o.led !== true, label: 'y = 0.5 → ჩამქრალია' }, { vars: { y: 1.7, amplitude: 2 }, expect: (o) => o.led === true, label: 'y = 1.7, A = 2 → ჩართულია' }, { vars: { y: -1, amplitude: 1 }, expect: (o) => o.led !== true, label: 'y = −1 → ჩამქრალია' }] },
    ],
  });
})(window.VL);
