/* ============================================================
 * stem/sims/math2.js — მათემატიკა: ალბათობა · ერთეულოვანი წრე (ტრიგონომეტრია)
 * ============================================================ */
(function (VL) {
  'use strict';
  const S = VL.STEM, D = S.draw, f = S.fmt;

  /* ============ 1. ალბათობა და დიდ რიცხვთა კანონი ============ */
  const EXP = { coin: { n: 'მონეტა (საფასური)', k: 2, lab: ['საფ.', 'გერბი'] }, die: { n: 'კამათელი', k: 6, lab: ['1', '2', '3', '4', '5', '6'] }, two: { n: 'ორი კამათლის ჯამი', k: 11, lab: ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] } };
  const theo = (e) => (e === 'two' ? [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1].map((x) => x / 36) : Array(EXP[e].k).fill(1 / EXP[e].k));
  const roll = (e) => (e === 'coin' ? (Math.random() < 0.5 ? 0 : 1) : e === 'die' ? Math.floor(Math.random() * 6) : Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6));
  const addN = (s, m) => { for (let i = 0; i < m; i++) { const r = roll(s.v.e); s.counts[r]++; s.n++; s.last = r; } s.hist.push([s.n, s.counts[s.v.e === 'two' ? 5 : 0] / s.n]); if (s.hist.length > 300) s.hist.shift(); };
  S.register({
    key: 'probability', subject: 'math', title: 'ალბათობა და დიდ რიცხვთა კანონი', icon: '🎲',
    summary: 'მონეტა, კამათელი, ორი კამათლის ჯამი — სიხშირე უახლოვდება ალბათობას',
    animated: true, playLabel: '▶ ავტომატური ცდები',
    vars: [
      { key: 'e', label: 'ექსპერიმენტი', type: 'select', value: 'die', options: Object.entries(EXP).map(([k, x]) => [k, x.n]), reset: true },
      { key: 'rate', label: 'ცდები წამში', min: 1, max: 500, step: 1, value: 20, unit: '' },
    ],
    presets: [],
    actions: [{ label: '🎲 1 ცდა', run(s) { addN(s, 1); } }, { label: '🎲 ×100', run(s) { addN(s, 100); } }, { label: '🎲 ×1000', run(s) { addN(s, 1000); } }, { label: '🗑 ნულიდან', run(s) { s.counts = Array(EXP[s.v.e].k).fill(0); s.n = 0; s.last = null; s.hist = []; } }],
    create: () => ({ counts: [], n: 0, hist: [] }),
    reset(s) { s.counts = Array(EXP[s.v.e].k).fill(0); s.n = 0; s.last = null; s.hist = []; s.acc = 0; },
    step(s, dt) { s.acc = (s.acc || 0) + dt * s.v.rate; const m = Math.floor(s.acc); if (m > 0) { s.acc -= m; addN(s, m); } },
    readouts(s) {
      const th = theo(s.v.e), dev = s.n ? Math.max(...s.counts.map((c, i) => Math.abs(c / s.n - th[i]))) : 0;
      return [['ცდების რაოდენობა', String(s.n)], ['ბოლო შედეგი', s.last === null ? '—' : EXP[s.v.e].lab[s.last]], ['მაქს. გადახრა ალბათობიდან', s.n ? f(dev * 100, 2) + '%' : '—'], ['თეორიული ალბათობა', s.v.e === 'two' ? 'P(7) = 6/36 ≈ 16.7%' : `1/${EXP[s.v.e].k} ≈ ${f(100 / EXP[s.v.e].k, 1)}%`]];
    },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      const ex = EXP[s.v.e], th = theo(s.v.e), gw = w * 0.58, gh = h - 70, x0 = 30, base = 30 + gh;
      const mx = Math.max(...th) * 1.6, bw = gw / ex.k;
      ctx.strokeStyle = '#495057'; ctx.beginPath(); ctx.moveTo(x0, base); ctx.lineTo(x0 + gw, base); ctx.stroke();
      ex.lab.forEach((l, i) => {
        const fr = s.n ? s.counts[i] / s.n : 0, x = x0 + i * bw;
        ctx.fillStyle = '#7048e8'; ctx.fillRect(x + bw * 0.15, base - Math.min(1, fr / mx) * gh, bw * 0.7, Math.min(1, fr / mx) * gh);
        ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + bw * 0.05, base - th[i] / mx * gh); ctx.lineTo(x + bw * 0.95, base - th[i] / mx * gh); ctx.stroke();
        D.text(ctx, l, x + bw / 2, base + 16, { align: 'center', size: 11 });
        if (s.n) D.text(ctx, f(fr * 100, 1) + '%', x + bw / 2, base - Math.min(1, fr / mx) * gh - 4, { align: 'center', size: 9, color: '#5f3dc4' });
      });
      D.text(ctx, '█ სიხშირე   — ალბათობა', x0, 20, { weight: 600, size: 11 });
      // კონვერგენციის გრაფიკი
      const gx = w * 0.66, ggw = w - gx - 10, p0 = th[s.v.e === 'two' ? 5 : 0];
      const nmax = Math.max(10, s.n);
      const m = D.plot(ctx, gx, 20, ggw, h - 50, { xmin: 0, xmax: nmax, ymin: 0, ymax: Math.min(1, p0 * 3) }, { xLabel: 'ცდები', stepY: p0 > 0.3 ? 0.25 : 0.1 });
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#e8590c'; ctx.beginPath(); ctx.moveTo(m.X(0), m.Y(p0)); ctx.lineTo(m.X(nmax), m.Y(p0)); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = '#7048e8'; ctx.lineWidth = 2; ctx.beginPath(); s.hist.forEach(([n, v], i) => (i ? ctx.lineTo(m.X(n), m.Y(v)) : ctx.moveTo(m.X(n), m.Y(v)))); ctx.stroke();
      D.text(ctx, `სიხშირე „${ex.lab[s.v.e === 'two' ? 5 : 0]}“`, gx + 6, 34, { size: 10, weight: 600, bg: 'rgba(255,255,255,.85)' });
    },
    bridge: {
      vars: (s) => ({ trials: s.n, last: s.last === null ? -1 : (s.v.e === 'two' ? s.last + 2 : s.last + 1), freq: s.n ? s.counts[0] / s.n : 0 }),
      writable: [],
      example: '// last — ბოლო შედეგი (კამათელზე 1–6)\nif (last == 6) {\n  led(true);\n  log("ექვსიანი! ცდა №" + trials);\n} else {\n  led(false);\n}',
    },
    challenges: [
      { key: 'law', title: 'დიდ რიცხვთა კანონი', kind: 'state', params: [{ key: 'n', label: 'მინ. ცდები', value: 2000 }],
        text: (p) => `ჩაატარე ≥ ${p.n} ცდა კამათლით, ისე რომ ყველა სახის სიხშირე ალბათობიდან (16.7%) 1.5%-ზე ნაკლებით გადაიხაროს.`,
        check(s, p) { if (s.v.e !== 'die') return { passed: false, message: 'აირჩიე „კამათელი“.' }; const dev = s.n ? Math.max(...s.counts.map((c) => Math.abs(c / s.n - 1 / 6))) : 1; const ok = s.n >= p.n && dev < 0.015; return { passed: ok, message: ok ? `სწორია! ${s.n} ცდა, გადახრა ${f(dev * 100, 2)}%.` : `${s.n} ცდა, მაქს. გადახრა ${f(dev * 100, 2)}%.` }; } },
      { key: 'seven', title: 'ყველაზე ხშირი ჯამი', kind: 'state', params: [],
        text: () => 'ორი კამათლის ჯამით ჩაატარე ≥ 500 ცდა და დარწმუნდი, რომ ყველაზე ხშირად 7 მოდის. რატომ?',
        check(s) { if (s.v.e !== 'two') return { passed: false, message: 'აირჩიე „ორი კამათლის ჯამი“.' }; const mx = s.counts.indexOf(Math.max(...s.counts)); const ok = s.n >= 500 && mx === 5; return { passed: ok, message: ok ? 'სწორია! 7 მიიღება 6 გზით (1+6, 2+5, …) — 6/36.' : `${s.n} ცდა, ყველაზე ხშირი: ${s.n ? mx + 2 : '—'}.` }; } },
      { key: 'rule-six', title: 'კოდი: ექვსიანის დეტექტორი', kind: 'rule', params: [],
        text: () => 'დაწერე წესი: LED ანთდეს, როცა last == 6, სხვა დროს ჩაქრეს.',
        vectors: () => [{ vars: { last: 6 }, expect: (o) => o.led === true, label: '6 → ჩართულია' }, { vars: { last: 3 }, expect: (o) => o.led !== true, label: '3 → ჩამქრალია' }] },
    ],
  });

  /* ============ 2. ერთეულოვანი წრე ============ */
  const R = Math.PI / 180;
  S.register({
    key: 'unitcircle', subject: 'math', title: 'ერთეულოვანი წრე (sin, cos, tg)', icon: '⭕',
    summary: 'კუთხე, რადიანი, სინუსი და კოსინუსი წრეზე და გრაფიკზე',
    animated: true, playLabel: '▶ ბრუნვა',
    vars: [{ key: 'a', label: 'კუთხე α', min: 0, max: 360, step: 1, value: 30, unit: '°', live: true }],
    presets: [{ label: '30°', values: { a: 30 } }, { label: '45°', values: { a: 45 } }, { label: '60°', values: { a: 60 } }, { label: '90°', values: { a: 90 } }, { label: '180°', values: { a: 180 } }],
    create: () => ({}), reset(s) { s.t = 0; }, step(s, dt) { s.t += dt; s.v.a = (s.v.a + dt * 40) % 360; },
    readouts(s) {
      const a = s.v.a * R, t = Math.abs(Math.cos(a)) < 1e-9 ? '∞' : f(Math.tan(a), 3);
      return [['sin α', f(Math.sin(a), 3)], ['cos α', f(Math.cos(a), 3)], ['tg α', t], ['რადიანი', f(a, 3) + ' (' + f(s.v.a / 180, 3) + 'π)'], ['მეოთხედი', ['I', 'II', 'III', 'IV'][Math.min(3, Math.floor((s.v.a % 360) / 90))]]];
    },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      const r = Math.min(w * 0.18, h * 0.38), cx = r + 30, cy = h / 2, a = s.v.a * R;
      ctx.strokeStyle = '#ced4da'; ctx.beginPath(); ctx.moveTo(cx - r - 14, cy); ctx.lineTo(cx + r + 14, cy); ctx.moveTo(cx, cy - r - 14); ctx.lineTo(cx, cy + r + 14); ctx.stroke();
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      const px = cx + r * Math.cos(a), py = cy - r * Math.sin(a);
      ctx.strokeStyle = '#f08c00'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 24, 0, -a, true); ctx.stroke();
      ctx.strokeStyle = '#343a40'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
      ctx.strokeStyle = '#e03131'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(px, cy); ctx.lineTo(px, py); ctx.stroke();
      ctx.strokeStyle = '#1c7ed6'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, cy); ctx.stroke();
      D.dot(ctx, px, py, 6, '#212529');
      D.text(ctx, `(${f(Math.cos(a), 2)}; ${f(Math.sin(a), 2)})`, px + (Math.cos(a) >= 0 ? 8 : -8), py - 8, { align: Math.cos(a) >= 0 ? 'left' : 'right', weight: 700, size: 11 });
      D.text(ctx, `α = ${Math.round(s.v.a)}°`, cx + 28, cy - 8, { color: '#e67700', weight: 700, size: 11 });
      const gx = cx + r + 40, gw = w - gx - 12;
      const m = D.plot(ctx, gx, cy - r - 10, gw, 2 * r + 20, { xmin: 0, xmax: 360, ymin: -1.2, ymax: 1.2 }, { stepX: 90, stepY: 0.5, xLabel: 'α°' });
      D.fn(ctx, m, (x) => Math.sin(x * R), 0, 360, '#e03131', 2.5); D.fn(ctx, m, (x) => Math.cos(x * R), 0, 360, '#1c7ed6', 2.5);
      ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = '#adb5bd'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(m.X(s.v.a), m.Y(Math.sin(a))); ctx.stroke(); ctx.restore();
      D.dot(ctx, m.X(s.v.a), m.Y(Math.sin(a)), 5, '#e03131'); D.dot(ctx, m.X(s.v.a), m.Y(Math.cos(a)), 5, '#1c7ed6');
      D.text(ctx, '— sin   — cos', gx + 6, cy - r - 16, { weight: 700, size: 11, color: '#495057' });
    },
    bridge: {
      vars: (s) => ({ angle: s.v.a, sinA: Math.sin(s.v.a * R), cosA: Math.cos(s.v.a * R) }),
      writable: [],
      example: '// LED ანთია, როცა წერტილი I მეოთხედშია (sinA > 0 და cosA > 0)\nif (sinA > 0 && cosA > 0) {\n  led(true);\n} else {\n  led(false);\n}',
    },
    challenges: [
      { key: 'half', title: 'sin α = 0.5', kind: 'state', params: [],
        text: () => 'იპოვე კუთხე II მეოთხედში, რომლის სინუსიც 0.5-ია.',
        check(s) { const ok = Math.abs(s.v.a - 150) < 0.6; return { passed: ok, message: ok ? 'სწორია! sin 150° = sin 30° = 0.5' : `sin ${Math.round(s.v.a)}° = ${f(Math.sin(s.v.a * R), 3)}.` }; } },
      { key: 'equal', title: 'sin = cos', kind: 'state', params: [],
        text: () => 'იპოვე კუთხე III მეოთხედში, სადაც sin α = cos α.',
        check(s) { const ok = Math.abs(s.v.a - 225) < 0.6; return { passed: ok, message: ok ? 'სწორია! 225°: sin = cos = −√2/2' : `sin = ${f(Math.sin(s.v.a * R), 2)}, cos = ${f(Math.cos(s.v.a * R), 2)}.` }; } },
      { key: 'rule-q', title: 'კოდი: მეოთხედის განსაზღვრა', kind: 'rule', params: [],
        text: () => 'დაწერე წესი: LED ანთდეს მხოლოდ II მეოთხედში (sinA > 0 და cosA < 0).',
        vectors: () => [[120, true], [60, false], [200, false], [300, false]].map(([d, e]) => ({ vars: { angle: d, sinA: Math.sin(d * R), cosA: Math.cos(d * R) }, expect: (o) => (o.led === true) === e, label: `${d}° → ${e ? 'ჩართულია' : 'ჩამქრალია'}` })) },
    ],
  });
})(window.VL);
