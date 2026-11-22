/* ============================================================
 * stem/sims/chemistry2.js — ქიმია: აირების კანონები · ატომის აგებულება
 * ============================================================ */
(function (VL) {
  'use strict';
  const S = VL.STEM, D = S.draw, f = S.fmt;

  /* ============ 1. აირის კანონები PV = nRT ============ */
  const Rg = 8.314;
  const press = (s) => s.v.n * Rg * (s.v.T + 273.15) / (s.v.V / 1000) / 1000; // კპა
  S.register({
    key: 'gaslaws', subject: 'chemistry', title: 'აირის კანონები (PV = nRT)', icon: '🎈',
    summary: 'ბოილ-მარიოტის, შარლისა და გეი-ლუსაკის კანონები ნაწილაკების მოძრაობით',
    animated: true, autoplay: true,
    vars: [
      { key: 'V', label: 'მოცულობა V', min: 1, max: 20, step: 0.1, value: 10, unit: 'ლ' },
      { key: 'T', label: 'ტემპერატურა T', min: -100, max: 500, step: 1, value: 25, unit: '°C' },
      { key: 'n', label: 'ნივთიერების რაოდენობა n', min: 0.05, max: 2, step: 0.01, value: 0.4, unit: 'მოლი', reset: true },
    ],
    presets: [{ label: 'ნორმალური პირობები', values: { T: 0, V: 22.4, n: 1 } }, { label: 'ცხელი ჰაერის ბუშტი', values: { T: 100 } }, { label: 'შეკუმშვა', values: { V: 2 } }],
    create: () => ({ parts: [] }),
    reset(s) { s.t = 0; s.parts = []; const N = Math.round(10 + s.v.n * 40); for (let i = 0; i < N; i++) { const a = Math.random() * Math.PI * 2; s.parts.push({ x: Math.random(), y: Math.random(), dx: Math.cos(a), dy: Math.sin(a) }); } s.hits = 0; s.hitT = 0; s.rate = 0; },
    step(s, dt) {
      const sp = 0.6 * Math.sqrt((s.v.T + 273.15) / 298); s.t += dt; let hits = 0;
      const wfrac = s.v.V / 20;
      s.parts.forEach((q) => {
        q.x += q.dx * sp * dt / wfrac; q.y += q.dy * sp * dt;
        if (q.x < 0) { q.x = -q.x; q.dx *= -1; hits++; } if (q.x > 1) { q.x = 2 - q.x; q.dx *= -1; hits++; }
        if (q.y < 0) { q.y = -q.y; q.dy *= -1; hits++; } if (q.y > 1) { q.y = 2 - q.y; q.dy *= -1; hits++; }
      });
      s.hits += hits; s.hitT += dt; if (s.hitT > 0.5) { s.rate = s.hits / s.hitT; s.hits = 0; s.hitT = 0; }
    },
    readouts(s) { const P = press(s); return [['წნევა P', f(P, 1) + ' კპა (' + f(P / 101.325, 2) + ' ატმ)'], ['P·V', f(P * s.v.V, 1) + ' კპა·ლ'], ['აბსოლუტური T', f(s.v.T + 273.15, 1) + ' K'], ['კედელზე დარტყმები', f(s.rate, 0) + '/წმ']]; },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(0, 0, w, h);
      const bx = 16, by = 30, maxW = w * 0.55, bw = maxW * s.v.V / 20, bh = h - 60;
      ctx.fillStyle = `rgba(255,${220 - Math.max(0, s.v.T) * 0.3},${200 - Math.max(0, s.v.T) * 0.35},.5)`; ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx + maxW + 10, by); ctx.lineTo(bx, by); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + maxW + 10, by + bh); ctx.stroke();
      ctx.fillStyle = '#868e96'; ctx.fillRect(bx + bw, by + 2, 10, bh - 4); ctx.fillRect(bx + bw + 10, by + bh / 2 - 5, maxW - bw + 30, 10);
      s.parts.forEach((q) => D.dot(ctx, bx + 6 + q.x * (bw - 12), by + 6 + q.y * (bh - 12), 4.5, s.v.T > 150 ? '#e8590c' : s.v.T < -20 ? '#4dabf7' : '#7048e8'));
      D.text(ctx, `P = ${f(press(s), 0)} კპა`, bx, by - 10, { weight: 700, size: 14 });
      D.text(ctx, `V = ${s.v.V} ლ`, bx + bw / 2, by + bh + 18, { align: 'center' });
      // მანომეტრი
      const mx = w * 0.82, my = h * 0.42, mr = Math.min(60, w * 0.12), P = press(s), ang = Math.PI * (0.75 + 1.5 * Math.min(1, P / 1000));
      D.dot(ctx, mx, my, mr, '#fff', '#495057');
      for (let i = 0; i <= 10; i++) { const a = Math.PI * (0.75 + 0.15 * i); ctx.strokeStyle = '#868e96'; ctx.beginPath(); ctx.moveTo(mx + Math.cos(a) * mr * 0.8, my + Math.sin(a) * mr * 0.8); ctx.lineTo(mx + Math.cos(a) * mr * 0.95, my + Math.sin(a) * mr * 0.95); ctx.stroke(); }
      ctx.strokeStyle = '#c92a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(ang) * mr * 0.8, my + Math.sin(ang) * mr * 0.8); ctx.stroke();
      D.text(ctx, 'მანომეტრი (0–1000 კპა)', mx, my + mr + 18, { align: 'center', size: 10, color: '#868e96' });
      D.text(ctx, `${f(s.v.T, 0)} °C`, mx, my + mr + 40, { align: 'center', weight: 700, color: '#d9480f', size: 14 });
    },
    bridge: {
      vars: (s) => ({ pressure: press(s), volume: s.v.V, temperature: s.v.T, moles: s.v.n }),
      writable: [],
      example: '// უსაფრთხოების სარქველი: წნევა 500 კპა-ზე მეტი არ უნდა იყოს\nif (pressure > 500) {\n  alarm("საშიში წნევა! " + pressure.toFixed(0) + " კპა");\n  led(true);\n} else {\n  led(false);\n}',
    },
    challenges: [
      { key: 'boyle', title: 'ბოილ-მარიოტის კანონი', kind: 'state', params: [{ key: 'target', label: 'სამიზნე წნევა (კპა)', value: 400 }],
        text: (p) => `მუდმივ ტემპერატურაზე (25 °C) და n = 0.4 მოლზე შეცვალე მხოლოდ მოცულობა ისე, რომ წნევა იყოს ${p.target} კპა (±5). P·V = const!`,
        check(s, p) { const P = press(s), ok = s.v.T === 25 && Math.abs(s.v.n - 0.4) < 0.005 && Math.abs(P - p.target) <= 5; return { passed: ok, message: ok ? `სწორია! V = ${s.v.V} ლ, P·V = ${f(P * s.v.V, 0)}` : `P = ${f(P, 0)} კპა (T = ${s.v.T}°C, n = ${s.v.n}).` }; } },
      { key: 'charles', title: 'ორმაგი წნევა გათბობით', kind: 'state', params: [],
        text: () => 'V = 10 ლ და n = 0.4 მოლზე იპოვე ტემპერატურა, რომელზეც წნევა ორჯერ მეტია, ვიდრე 25 °C-ზე (±1%). მინიშნება: კელვინებში!',
        check(s) { const base = 0.4 * Rg * 298.15 / 0.01 / 1000, P = press(s), ok = s.v.V === 10 && Math.abs(s.v.n - 0.4) < 0.005 && Math.abs(P / base - 2) <= 0.02; return { passed: ok, message: ok ? `სწორია! T = ${s.v.T} °C ≈ 596 K = 2 × 298 K.` : `P = ${f(P, 0)} კპა, საჭიროა ${f(base * 2, 0)}.` }; } },
      { key: 'rule-valve', title: 'კოდი: უსაფრთხოების სარქველი', kind: 'rule', params: [{ key: 'max', label: 'მაქს. წნევა (კპა)', value: 500 }],
        text: (p) => `დაწერე წესი: თუ pressure > ${p.max} → alarm("…") და LED ჩართე, სხვა დროს LED ჩამქრალია.`,
        vectors: (p) => [{ vars: { pressure: p.max + 100 }, expect: (o) => !!o.alarm && o.led === true, label: `${p.max + 100} კპა → alarm` }, { vars: { pressure: 101 }, expect: (o) => !o.alarm && o.led !== true, label: '101 კპა → ნორმა' }] },
    ],
  });

  /* ============ 2. ატომის აგებულება ============ */
  const EL = ['', 'H წყალბადი', 'He ჰელიუმი', 'Li ლითიუმი', 'Be ბერილიუმი', 'B ბორი', 'C ნახშირბადი', 'N აზოტი', 'O ჟანგბადი', 'F ფტორი', 'Ne ნეონი', 'Na ნატრიუმი', 'Mg მაგნიუმი', 'Al ალუმინი', 'Si სილიციუმი', 'P ფოსფორი', 'S გოგირდი', 'Cl ქლორი', 'Ar არგონი', 'K კალიუმი', 'Ca კალციუმი'];
  const STABLE_N = [0, 0, 2, 4, 5, 6, 6, 7, 8, 10, 10, 12, 12, 14, 14, 16, 16, 18, 22, 20, 20];
  const atom = (s) => {
    const Z = s.v.p, N = s.v.n, E = s.v.e, el = EL[Z] || '—', q = Z - E;
    const shells = []; let left = E; [2, 8, 8, 18].forEach((c) => { if (left > 0) { shells.push(Math.min(c, left)); left -= c; } });
    const stable = Z > 0 && Math.abs(N - STABLE_N[Z]) <= (Z < 3 ? 1 : 1);
    return { Z, N, E, el, A: Z + N, q, shells, stable };
  };
  S.register({
    key: 'atom', subject: 'chemistry', title: 'ატომის აგებულება (ააწყე ატომი)', icon: '⚛️',
    summary: 'პროტონები, ნეიტრონები, ელექტრონები — ელემენტი, იზოტოპი, იონი, ელექტრონული შრეები',
    animated: true, autoplay: true,
    vars: [
      { key: 'p', label: 'პროტონები (Z)', min: 1, max: 20, step: 1, value: 6, unit: '' },
      { key: 'n', label: 'ნეიტრონები (N)', min: 0, max: 24, step: 1, value: 6, unit: '' },
      { key: 'e', label: 'ელექტრონები', min: 0, max: 22, step: 1, value: 6, unit: '' },
    ],
    presets: [{ label: 'წყალბადი ¹H', values: { p: 1, n: 0, e: 1 } }, { label: 'ჰელიუმი ⁴He', values: { p: 2, n: 2, e: 2 } }, { label: 'ნახშირბადი-14', values: { p: 6, n: 8, e: 6 } }, { label: 'Na⁺ იონი', values: { p: 11, n: 12, e: 10 } }, { label: 'Cl⁻ იონი', values: { p: 17, n: 18, e: 18 } }],
    create: () => ({}), reset(s) { s.t = 0; }, step(s, dt) { s.t += dt; },
    readouts(s) {
      const a = atom(s);
      return [['ელემენტი', a.el], ['მასური რიცხვი A = Z + N', String(a.A)], ['მუხტი', a.q === 0 ? '0 (ნეიტრალური ატომი)' : (a.q > 0 ? `+${a.q} (კათიონი)` : `${a.q} (ანიონი)`)], ['ელექტრონული შრეები', a.shells.join(', ') || '—'], ['ბირთვი', a.stable ? '✓ სტაბილური' : '⚠ არასტაბილური (რადიოაქტიური)']];
    },
    draw(ctx, s, w, h) {
      const a = atom(s); ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, w, h);
      const cx = w * 0.4, cy = h / 2, R0 = Math.min(w, h) * 0.12, dR = Math.min(w, h) * 0.1;
      a.shells.forEach((n, i) => {
        const r = R0 + dR * (i + 0.8); ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        for (let k = 0; k < n; k++) { const ang = s.t * (1.2 - i * 0.25) + k * 2 * Math.PI / n; D.dot(ctx, cx + r * Math.cos(ang), cy + r * Math.sin(ang), 5, '#4dabf7'); }
      });
      const tot = a.Z + a.N, nr = Math.max(8, Math.sqrt(tot) * 5.5);
      for (let i = 0; i < tot; i++) { const ang = i * 2.4, rr = nr * Math.sqrt(i / Math.max(1, tot)); D.dot(ctx, cx + rr * Math.cos(ang), cy + rr * Math.sin(ang), 5.5, i % 2 === 0 && i / 2 < a.Z ? '#ff6b6b' : (i < 2 * Math.min(a.Z, a.N) ? '#adb5bd' : (a.Z > a.N ? '#ff6b6b' : '#adb5bd')), '#212529'); }
      const sym = a.el.split(' ')[0];
      const bx = w * 0.72, by = h * 0.22, bs = Math.min(w * 0.22, 120);
      ctx.fillStyle = '#fff'; D.rrect(ctx, bx, by, bs, bs * 1.1, 8); ctx.fill();
      D.text(ctx, String(a.Z), bx + 8, by + 18, { weight: 700 }); D.text(ctx, String(a.A), bx + bs - 8, by + 18, { align: 'right', color: '#868e96' });
      D.text(ctx, sym, bx + bs / 2, by + bs * 0.68, { align: 'center', size: bs * 0.4, weight: 800 });
      if (a.q) D.text(ctx, a.q > 0 ? `${a.q > 1 ? a.q : ''}+` : `${a.q < -1 ? -a.q : ''}−`, bx + bs - 8, by + bs * 0.45, { align: 'right', size: 16, weight: 700, color: '#c92a2a' });
      D.text(ctx, (a.el.split(' ')[1] || ''), bx + bs / 2, by + bs * 1.0, { align: 'center', size: 11 });
      D.text(ctx, '● პროტონი  ● ნეიტრონი  ● ელექტრონი', 12, h - 12, { color: '#ced4da', size: 10 });
    },
    bridge: {
      vars: (s) => { const a = atom(s); return { protons: a.Z, neutrons: a.N, electrons: a.E, charge: a.q, mass: a.A }; },
      writable: [],
      example: '// LED ანთია ნეიტრალურ ატომზე; იონზე — შეტყობინება\nif (charge == 0) {\n  led(true);\n} else {\n  led(false);\n  log("იონი, მუხტი: " + charge);\n}',
    },
    challenges: [
      { key: 'oxygen', title: 'ააწყე ჟანგბადი-16', kind: 'state', params: [],
        text: () => 'ააწყე ნეიტრალური ჟანგბადის ატომი მასური რიცხვით 16.',
        check(s) { const a = atom(s), ok = a.Z === 8 && a.A === 16 && a.q === 0; return { passed: ok, message: ok ? 'სწორია! 8 პროტონი, 8 ნეიტრონი, 8 ელექტრონი (2, 6).' : `ახლა: ${a.el}, A = ${a.A}, მუხტი ${a.q}.` }; } },
      { key: 'ion', title: 'მაგნიუმის იონი Mg²⁺', kind: 'state', params: [],
        text: () => 'ააწყე მაგნიუმის იონი Mg²⁺ (სტაბილური ბირთვით). რამდენი ელექტრონი დარჩა გარე შრეზე?',
        check(s) { const a = atom(s), ok = a.Z === 12 && a.q === 2 && a.stable; return { passed: ok, message: ok ? 'სწორია! 10 ელექტრონი (2, 8) — ნეონის მსგავსი სრული შრე.' : `ახლა: ${a.el}, მუხტი ${a.q}${a.stable ? '' : ', ბირთვი არასტაბილურია'}.` }; } },
      { key: 'rule-ion', title: 'კოდი: იონის ტიპი', kind: 'rule', params: [],
        text: () => 'დაწერე წესი: charge > 0 → log("კათიონი"); charge < 0 → log("ანიონი"); charge == 0 → LED ჩართე.',
        vectors: () => [{ vars: { charge: 2 }, expect: (o) => o.logs.some((l) => /კათიონ/.test(l)) && o.led !== true, label: 'მუხტი +2 → „კათიონი“' }, { vars: { charge: -1 }, expect: (o) => o.logs.some((l) => /ანიონ/.test(l)), label: 'მუხტი −1 → „ანიონი“' }, { vars: { charge: 0 }, expect: (o) => o.led === true, label: 'მუხტი 0 → LED' }] },
    ],
  });
})(window.VL);
