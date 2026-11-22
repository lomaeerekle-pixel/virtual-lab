/* ============================================================
 * stem/sims/astronomy.js — ასტრონომია
 * პლანეტის ორბიტა (ნიუტონი, კეპლერი) · მთვარის ფაზები
 * ============================================================ */
(function (VL) {
  'use strict';
  const S = VL.STEM, D = S.draw, f = S.fmt;
  const G4 = 4 * Math.PI * Math.PI; // GM☉ ერთეულებში ა.ე.³/წელი²

  /* ============ 1. ორბიტა ============ */
  const orb = (s) => {
    const GM = G4 * s.v.M, r = s.v.r0, v = s.v.vf * Math.sqrt(GM / r);
    const E = v * v / 2 - GM / r;
    if (E >= 0) return { esc: true, v0: v };
    const a = -GM / (2 * E), h = r * v, e = Math.sqrt(Math.max(0, 1 + 2 * E * h * h / (GM * GM)));
    return { esc: false, a, e, T: Math.sqrt(a * a * a / s.v.M), v0: v, peri: a * (1 - e), apo: a * (1 + e) };
  };
  S.register({
    key: 'orbit', subject: 'astro', title: 'პლანეტის ორბიტა (კეპლერის კანონები)', icon: '🪐',
    summary: 'გრავიტაცია, ელიფსური ორბიტა, პერიოდი T² ∝ a³ და გაქცევის სიჩქარე',
    animated: true, autoplay: true,
    vars: [
      { key: 'M', label: 'ვარსკვლავის მასა', min: 0.5, max: 3, step: 0.05, value: 1, unit: 'M☉', reset: true },
      { key: 'r0', label: 'საწყისი მანძილი', min: 0.3, max: 3, step: 0.05, value: 1, unit: 'ა.ე.', reset: true },
      { key: 'vf', label: 'სიჩქარე (წრიულის ×)', min: 0.4, max: 1.6, step: 0.01, value: 1, unit: '', reset: true },
    ],
    presets: [{ label: '🌍 დედამიწა', values: { M: 1, r0: 1, vf: 1 } }, { label: '🔴 მარსი', values: { M: 1, r0: 1.52, vf: 1 } }, { label: '☄ კომეტა', values: { r0: 0.5, vf: 1.35 } }, { label: '🚀 გაქცევა', values: { vf: 1.45 } }],
    create: () => ({ trail: [] }),
    reset(s) { const o = orb(s); s.x = s.v.r0; s.y = 0; s.vx = 0; s.vy = o.v0; s.t = 0; s.trail = []; },
    step(s, dt) {
      const yrs = dt * 0.5; const n = Math.max(1, Math.ceil(yrs / 0.0005)), h = yrs / n, GM = G4 * s.v.M;
      for (let i = 0; i < n; i++) {
        const r3 = Math.pow(s.x * s.x + s.y * s.y, 1.5); s.vx -= GM * s.x / r3 * h; s.vy -= GM * s.y / r3 * h;
        s.x += s.vx * h; s.y += s.vy * h; s.t += h;
        if (s.x * s.x + s.y * s.y < 0.003) { s.vx = s.vy = 0; break; }
      }
      s.trail.push([s.x, s.y]); if (s.trail.length > 900) s.trail.shift();
    },
    readouts(s) {
      const o = orb(s), r = Math.hypot(s.x, s.y), sp = Math.hypot(s.vx, s.vy) * 4.74;
      return o.esc ? [['ორბიტა', '🚀 გაქცევა (ღია ტრაექტორია)'], ['მანძილი', f(r, 2) + ' ა.ე.'], ['სიჩქარე', f(sp, 1) + ' კმ/წმ']]
        : [['დიდი ნახევარღერძი a', f(o.a, 3) + ' ა.ე.'], ['ექსცენტრისიტეტი e', f(o.e, 3)], ['პერიოდი T', f(o.T, 3) + ' წელი'], ['მანძილი r', f(r, 2) + ' ა.ე.'], ['სიჩქარე', f(sp, 1) + ' კმ/წმ'], ['T² / a³', f(o.T * o.T / (o.a * o.a * o.a), 3)]];
    },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) D.dot(ctx, (i * 97) % w, (i * 57 + i * i) % h, 0.8, 'rgba(255,255,255,.5)');
      const o = orb(s); const ext = o.esc ? 4 : Math.max(o.apo, 0.5) * 1.15;
      const sc = Math.min(w, h) / 2 / ext; const cx = w / 2 + (o.esc ? 0 : (o.a - o.apo + o.a * 0) * 0), cy = h / 2;
      const X = (x) => cx + x * sc, Y = (y) => cy - y * sc;
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; [1, 2, 3].forEach((r) => { if (r < ext * 1.4) { ctx.beginPath(); ctx.arc(cx, cy, r * sc, 0, Math.PI * 2); ctx.stroke(); D.text(ctx, r + ' ა.ე.', cx + r * sc + 3, cy - 3, { color: 'rgba(255,255,255,.35)', size: 9 }); } });
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 22 + s.v.M * 6); g.addColorStop(0, '#fff3bf'); g.addColorStop(0.5, '#ffd43b'); g.addColorStop(1, 'rgba(250,176,5,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 22 + s.v.M * 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#74c0fc'; ctx.lineWidth = 1.8; ctx.beginPath(); s.trail.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)))); ctx.stroke();
      D.dot(ctx, X(s.x), Y(s.y), 7, '#339af0', '#fff');
      D.arrow(ctx, X(s.x), Y(s.y), X(s.x) + s.vx * 6, Y(s.y) - s.vy * 6, '#69db7c', 2);
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(X(s.x), Y(s.y)); ctx.stroke(); ctx.setLineDash([]);
      D.text(ctx, o.esc ? '🚀 გაქცევის ტრაექტორია' : `T = ${f(o.T, 2)} წელი, e = ${f(o.e, 2)}`, 12, 22, { color: '#fff', weight: 700 });
      D.text(ctx, `t = ${f(s.t, 2)} წელი`, 12, 40, { color: 'rgba(255,255,255,.6)' });
    },
    bridge: {
      vars: (s) => { const o = orb(s); return { distance: Math.hypot(s.x, s.y), speed: Math.hypot(s.vx, s.vy) * 4.74, time: s.t, period: o.esc ? 0 : o.T, eccentricity: o.esc ? 1 : o.e }; },
      writable: [],
      example: '// LED ანთდება, როცა პლანეტა ვარსკვლავთან ახლოსაა (პერიჰელიონი)\nif (distance < 0.8) {\n  led(true);\n  log("სიჩქარე: " + speed.toFixed(1) + " კმ/წმ");\n} else {\n  led(false);\n}',
    },
    challenges: [
      { key: 'circular', title: 'წრიული ორბიტა', kind: 'state', params: [{ key: 'r', label: 'რადიუსი (ა.ე.)', value: 2 }],
        text: (p) => `შექმენი თითქმის წრიული ორბიტა (e < 0.02) ${p.r} ა.ე. რადიუსით (±0.05). რა პერიოდი მიიღე?`,
        check(s, p) { const o = orb(s); if (o.esc) return { passed: false, message: 'პლანეტა გაიქცა — შეამცირე სიჩქარე.' }; const ok = o.e < 0.02 && Math.abs(o.a - p.r) <= 0.05; return { passed: ok, message: ok ? `სწორია! T = ${f(o.T, 2)} წელი — კეპლერის III კანონი: T² = a³/M.` : `a = ${f(o.a, 2)} ა.ე., e = ${f(o.e, 3)}.` }; } },
      { key: 'period', title: 'სამიზნე პერიოდი', kind: 'state', params: [{ key: 'target', label: 'T (წელი)', value: 2 }],
        text: (p) => `შეარჩიე პარამეტრები ისე, რომ პლანეტის ორბიტული პერიოდი იყოს ${p.target} წელი (±0.05).`,
        check(s, p) { const o = orb(s); if (o.esc) return { passed: false, message: 'ორბიტა ღიაა.' }; const ok = Math.abs(o.T - p.target) <= 0.05; return { passed: ok, message: ok ? `სწორია! T = ${f(o.T, 3)} წელი, a = ${f(o.a, 2)} ა.ე.` : `T = ${f(o.T, 3)} წელი.` }; } },
      { key: 'escape', title: 'გაქცევის სიჩქარე', kind: 'state', params: [],
        text: () => 'იპოვე მინიმალური სიჩქარის კოეფიციენტი, რომლითაც პლანეტა ვარსკვლავს სამუდამოდ ტოვებს (ღია ტრაექტორია), მაგრამ 1.45-ზე ნაკლები. რამდენჯერ მეტია წრიულზე?',
        check(s) { const o = orb(s), ok = o.esc && s.v.vf < 1.45; return { passed: ok, message: ok ? `სწორია! ×${s.v.vf} ≥ √2 ≈ 1.414.` : (o.esc ? 'გაქცევაა, მაგრამ სიჩქარე ზედმეტად დიდია.' : 'ორბიტა ჯერ კიდევ ჩაკეტილია.') }; } },
      { key: 'rule-near', title: 'კოდი: პერიჰელიონის სენსორი', kind: 'rule', params: [{ key: 'd', label: 'მანძილის ზღვარი', value: 0.8 }],
        text: (p) => `დაწერე წესი: LED ანთდეს, როცა distance < ${p.d} ა.ე., სხვა დროს ჩაქრეს.`,
        vectors: (p) => [{ vars: { distance: p.d - 0.2 }, expect: (o) => o.led === true, label: `distance = ${f(p.d - 0.2, 1)} → ჩართულია` }, { vars: { distance: p.d + 0.5 }, expect: (o) => o.led !== true, label: `distance = ${f(p.d + 0.5, 1)} → ჩამქრალია` }] },
    ],
  });

  /* ============ 2. მთვარის ფაზები ============ */
  const P = 29.53;
  const illum = (d) => (1 - Math.cos(2 * Math.PI * d / P)) / 2;
  const phaseName = (d) => {
    const x = d / P;
    if (x < 0.03 || x > 0.97) return '🌑 ახალი მთვარე'; if (x < 0.22) return '🌒 მზარდი ნამგალა'; if (x < 0.28) return '🌓 პირველი მეოთხედი';
    if (x < 0.47) return '🌔 მზარდი მთვარე'; if (x < 0.53) return '🌕 სავსე მთვარე'; if (x < 0.72) return '🌖 კლებადი მთვარე'; if (x < 0.78) return '🌗 ბოლო მეოთხედი'; return '🌘 კლებადი ნამგალა';
  };
  S.register({
    key: 'moon', subject: 'astro', title: 'მთვარის ფაზები', icon: '🌙',
    summary: 'მზე–დედამიწა–მთვარე: რატომ იცვლება მთვარის ფორმა ცაზე?',
    animated: true, playLabel: '▶ მთვარის მოძრაობა',
    vars: [{ key: 'd', label: 'მთვარის ასაკი', min: 0, max: 29.5, step: 0.1, value: 4, unit: 'დღე', live: true }],
    presets: [{ label: '🌑 ახალი', values: { d: 0 } }, { label: '🌓 I მეოთხედი', values: { d: 7.4 } }, { label: '🌕 სავსე', values: { d: 14.8 } }, { label: '🌗 III მეოთხედი', values: { d: 22.1 } }],
    create: () => ({}), reset(s) { s.t = 0; }, step(s, dt) { s.t += dt; s.v.d = (s.v.d + dt * 2) % P; },
    readouts(s) { return [['ფაზა', phaseName(s.v.d)], ['განათებული ნაწილი', f(illum(s.v.d) * 100, 0) + '%'], ['ასაკი', f(s.v.d, 1) + ' დღე'], ['სინოდური თვე', P + ' დღე']]; },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, w, h);
      const cx = w * 0.3, cy = h / 2, r = Math.min(w * 0.22, h * 0.36);
      for (let i = 0; i < 6; i++) D.arrow(ctx, 6, 30 + i * (h - 60) / 5, 46, 30 + i * (h - 60) / 5, 'rgba(255,212,59,.7)', 2);
      D.text(ctx, '☀ მზის სინათლე', 8, 18, { color: '#ffd43b', size: 10 });
      ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      D.dot(ctx, cx, cy, 18, '#339af0'); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.arc(cx, cy, 18, -Math.PI / 2, Math.PI / 2); ctx.fill();
      D.text(ctx, 'დედამიწა', cx, cy + 34, { align: 'center', color: '#a5d8ff', size: 10 });
      const a = Math.PI + 2 * Math.PI * s.v.d / P; const mx = cx + r * Math.cos(a), my = cy - r * Math.sin(a);
      D.dot(ctx, mx, my, 11, '#e9ecef'); ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.arc(mx, my, 11, -Math.PI / 2, Math.PI / 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(mx, my); ctx.stroke();
      // ხედი დედამიწიდან
      const vx = w * 0.76, vy = h * 0.48, R = Math.min(w * 0.17, h * 0.3), k = Math.cos(2 * Math.PI * s.v.d / P);
      ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.arc(vx, vy, R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f1f3f5'; ctx.beginPath();
      const waxing = s.v.d < P / 2;
      ctx.arc(vx, vy, R, -Math.PI / 2, Math.PI / 2, !waxing);
      ctx.ellipse(vx, vy, R * Math.abs(k), R, 0, Math.PI / 2, -Math.PI / 2, waxing ? k > 0 : k < 0);
      ctx.fill();
      D.text(ctx, 'ხედი დედამიწიდან', vx, vy - R - 14, { align: 'center', color: '#adb5bd', size: 11 });
      D.text(ctx, phaseName(s.v.d), vx, vy + R + 26, { align: 'center', color: '#fff', size: 15, weight: 700 });
    },
    bridge: {
      vars: (s) => ({ day: s.v.d, illumination: illum(s.v.d) * 100, waxing: s.v.d < P / 2 ? 1 : 0 }),
      writable: [],
      example: '// LED ანთდება სავსე მთვარის დროს\nif (illumination > 95) {\n  led(true);\n  alarm("სავსე მთვარე!");\n} else {\n  led(false);\n}',
    },
    challenges: [
      { key: 'full', title: 'სავსე მთვარე', kind: 'state', params: [],
        text: () => 'გადაიყვანე მთვარე სავსე ფაზაში (განათებული ≥ 98%). სად არის ამ დროს მთვარე მზესთან და დედამიწასთან შედარებით?',
        check(s) { const i = illum(s.v.d) * 100, ok = i >= 98; return { passed: ok, message: ok ? 'სწორია! მთვარე დედამიწის მეორე მხარესაა მზისგან.' : `განათებულია ${f(i, 0)}%.` }; } },
      { key: 'last', title: 'ბოლო მეოთხედი', kind: 'state', params: [],
        text: () => 'იპოვე ბოლო (III) მეოთხედი: განათებული ~50% (45–55%) და მთვარე კლებადია.',
        check(s) { const i = illum(s.v.d) * 100, ok = i >= 45 && i <= 55 && s.v.d > P / 2; return { passed: ok, message: ok ? `სწორია! ${f(s.v.d, 1)} დღე.` : `${f(i, 0)}%, ${s.v.d > P / 2 ? 'კლებადი' : 'მზარდი'}.` }; } },
      { key: 'rule-full', title: 'კოდი: სავსე მთვარის სიგნალი', kind: 'rule', params: [],
        text: () => 'დაწერე წესი: LED ანთდეს, როცა illumination > 95, სხვა დროს ჩაქრეს.',
        vectors: () => [{ vars: { illumination: 99 }, expect: (o) => o.led === true, label: '99% → ჩართულია' }, { vars: { illumination: 60 }, expect: (o) => o.led !== true, label: '60% → ჩამქრალია' }] },
    ],
  });
})(window.VL);
