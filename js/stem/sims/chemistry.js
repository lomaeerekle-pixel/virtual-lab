/* ============================================================
 * stem/sims/chemistry.js — ქიმია / საბუნებისმეტყველო
 * ტიტრაცია და pH · რეაქციის სიჩქარე და ტემპერატურა · წყლის გათბობა (ფაზური გადასვლები + თერმოსტატი)
 * ============================================================ */
(function (VL) {
  'use strict';
  const S = VL.STEM, D = S.draw, f = S.fmt;

  /* ============ 1. ტიტრაცია / pH ============ */
  function phOf(Ca, Va, Cb, Vb) {
    const V = (Va + Vb) / 1000;
    const d = (Ca * Va - Cb * Vb) / 1000 / V;
    const H = (d + Math.sqrt(d * d + 4e-14)) / 2;
    return Math.max(0, Math.min(14, -Math.log10(H)));
  }
  const ph = (s) => phOf(s.v.Ca, s.v.Va, s.v.Cb, s.v.Vb);
  const veq = (s) => s.v.Ca * s.v.Va / s.v.Cb;
  function indicatorColor(pH, ind) {
    if (ind === 'phenol') {
      if (pH < 8.2) return 'rgba(233,241,247,0.9)';
      const k = Math.min(1, (pH - 8.2) / 1.8); return `rgba(${230 - 20 * k},${120 - 90 * k},${200 - 20 * k},${0.35 + 0.55 * k})`;
    }
    if (ind === 'methyl') {
      if (pH < 3.1) return 'rgba(224,49,49,0.85)';
      if (pH > 4.4) return 'rgba(252,196,25,0.85)';
      return 'rgba(247,103,7,0.85)';
    }
    const hue = pH <= 7 ? pH / 7 * 120 : 120 + (pH - 7) / 7 * 160;
    return `hsla(${hue},75%,50%,0.8)`;
  }
  const IND_NAMES = { universal: 'უნივერსალური', phenol: 'ფენოლფტალეინი', methyl: 'მეთილნარინჯი' };

  S.register({
    key: 'ph', subject: 'chemistry', title: 'ნეიტრალიზაცია და pH (ტიტრაცია)', icon: '🧪',
    summary: 'HCl + NaOH → NaCl + H₂O — ტიტრაციის მრუდი და ინდიკატორები',
    animated: true, playLabel: '💧 სარქვლის გახსნა',
    vars: [
      { key: 'Ca', label: 'მჟავას (HCl) კონცენტრაცია', min: 0.05, max: 0.5, step: 0.01, value: 0.1, unit: 'მოლ/ლ' },
      { key: 'Va', label: 'მჟავას მოცულობა', min: 10, max: 100, step: 1, value: 50, unit: 'მლ' },
      { key: 'Cb', label: 'ტუტის (NaOH) კონცენტრაცია', min: 0.05, max: 0.5, step: 0.01, value: 0.1, unit: 'მოლ/ლ' },
      { key: 'Vb', label: 'დამატებული ტუტე', min: 0, max: 150, step: 0.1, value: 0, unit: 'მლ', live: true },
      { key: 'rate', label: 'წვეთების სიჩქარე', min: 0.2, max: 5, step: 0.1, value: 1.5, unit: 'მლ/წ' },
      { key: 'ind', label: 'ინდიკატორი', type: 'select', value: 'universal', options: [['universal', 'უნივერსალური'], ['phenol', 'ფენოლფტალეინი'], ['methyl', 'მეთილნარინჯი']] },
    ],
    presets: [{ label: 'სუფთა მჟავა', values: { Vb: 0 } }, { label: 'ეკვივალენტობის წერტილი', values: { Ca: 0.1, Va: 50, Cb: 0.1, Vb: 50 } }, { label: 'ტუტის ჭარბი', values: { Vb: 80 } }],
    create: () => ({ drops: [] }),
    reset(s) { s.t = 0; s.drops = []; },
    step(s, dt) {
      s.t += dt;
      if (s.ctrl.valve !== false && s.v.Vb < 150) {
        s.v.Vb = Math.min(150, +(s.v.Vb + s.v.rate * dt).toFixed(3));
        if (Math.random() < dt * 6) s.drops.push({ y: 0 });
      }
      s.drops.forEach((d) => { d.y += dt * 2.5; });
      s.drops = s.drops.filter((d) => d.y < 1);
    },
    readouts(s) {
      const p = ph(s);
      return [['pH', f(p, 2)], ['ხსნარი', p < 6.8 ? 'მჟავე' : p > 7.2 ? 'ტუტე' : 'ნეიტრალური'], ['ეკვივალენტობის წერტილი', f(veq(s), 1) + ' მლ'],
        ['დამატებული NaOH', f(s.v.Vb, 1) + ' მლ'], ['ინდიკატორი', IND_NAMES[s.v.ind]]];
    },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(0, 0, w, h);
      const p = ph(s), half = w * 0.42;
      // ბიურეტი
      const bx = half * 0.6, btop = 14, bh = h * 0.42, level = 1 - s.v.Vb / 150;
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(bx - 9, btop, 18, bh);
      ctx.fillStyle = 'rgba(165,216,255,.9)'; ctx.fillRect(bx - 9, btop + bh * (1 - level), 18, bh * level);
      ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.5; ctx.strokeRect(bx - 9, btop, 18, bh);
      for (let i = 0; i <= 10; i++) { ctx.beginPath(); ctx.moveTo(bx + 9, btop + bh * i / 10); ctx.lineTo(bx + 15, btop + bh * i / 10); ctx.stroke(); }
      ctx.fillStyle = s.ctrl.valve !== false ? '#2f9e44' : '#c92a2a'; ctx.fillRect(bx - 14, btop + bh, 28, 8);
      ctx.fillStyle = '#adb5bd'; ctx.fillRect(bx - 3, btop + bh + 8, 6, 16);
      D.text(ctx, 'NaOH', bx + 20, btop + 44, { weight: 600, size: 11 });
      // წვეთები
      const by = h * 0.58, bw = half * 0.7, bhh = h * 0.36;
      s.drops.forEach((d) => D.dot(ctx, bx, btop + bh + 26 + d.y * (by - btop - bh - 26), 3, '#74c0fc'));
      // ჭიქა
      const vol = s.v.Va + s.v.Vb, fill = Math.min(0.92, 0.25 + vol / 250 * 0.7);
      ctx.fillStyle = indicatorColor(p, s.v.ind);
      ctx.fillRect(bx - bw / 2 + 3, by + bhh * (1 - fill), bw - 6, bhh * fill - 3);
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 2.5; ctx.beginPath();
      ctx.moveTo(bx - bw / 2 - 6, by); ctx.lineTo(bx - bw / 2, by); ctx.lineTo(bx - bw / 2, by + bhh); ctx.lineTo(bx + bw / 2, by + bhh); ctx.lineTo(bx + bw / 2, by); ctx.stroke();
      D.text(ctx, `HCl ${s.v.Va} მლ`, bx, by + bhh + 16, { align: 'center', size: 11, color: '#495057' });
      // pH-მეტრი
      D.text(ctx, `pH ${f(p, 2)}`, 10, 28, { align: 'left', size: 20, weight: 700, mono: true, color: p < 6.8 ? '#e03131' : p > 7.2 ? '#7048e8' : '#2f9e44' });
      // ტიტრაციის მრუდი
      const gx = half + 30, gw = w - gx - 14, gy = 16, gh = h - 46;
      const xmax = Math.max(100, Math.ceil(veq(s) * 2 / 10) * 10);
      const m = D.plot(ctx, gx, gy, gw, gh, { xmin: 0, xmax: Math.min(150, xmax), ymin: 0, ymax: 14 }, { stepY: 2, xLabel: 'V(NaOH), მლ', yLabel: 'pH' });
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#ced4da'; ctx.beginPath(); ctx.moveTo(gx, m.Y(7)); ctx.lineTo(gx + gw, m.Y(7)); ctx.stroke();
      if (veq(s) <= Math.min(150, xmax)) { ctx.strokeStyle = '#ffa8a8'; ctx.beginPath(); ctx.moveTo(m.X(veq(s)), gy); ctx.lineTo(m.X(veq(s)), gy + gh); ctx.stroke(); }
      ctx.restore();
      D.fn(ctx, m, (x) => phOf(s.v.Ca, s.v.Va, s.v.Cb, x), 0, Math.min(150, xmax), '#1c7ed6', 2.5);
      if (s.v.Vb <= Math.min(150, xmax)) D.dot(ctx, m.X(s.v.Vb), m.Y(p), 6, '#f76707', '#fff');
    },
    bridge: {
      vars: (s) => ({ pH: ph(s), baseVolume: s.v.Vb, equivalence: veq(s), time: s.t }),
      writable: [{ key: 'valve', label: 'ბიურეტის სარქველი (valve)', value: true }],
      example: '// ავტომატური ტიტრაცია: ნეიტრალიზაციისას სარქვლის დაკეტვა\nif (pH >= 7) {\n  set("valve", false);\n  alarm("ნეიტრალიზაცია მიღწეულია! V = " + baseVolume.toFixed(1) + " მლ");\n}',
    },
    challenges: [
      {
        key: 'neutral', title: 'ნეიტრალიზაცია', kind: 'state',
        params: [{ key: 'target', label: 'სამიზნე pH', value: 7 }, { key: 'tol', label: 'ცდომილება', value: 0.3 }],
        text: (p) => `დაამატე NaOH ისე, რომ ხსნარის pH იყოს ${p.target} (±${p.tol}). რამდენი მლ დასჭირდა?`,
        check(s, p) { const v = ph(s), ok = Math.abs(v - p.target) <= p.tol; return { passed: ok, message: ok ? `შესანიშნავია! pH = ${f(v)} (V = ${f(s.v.Vb, 1)} მლ)` : `pH = ${f(v)} — ${v < p.target ? 'დაამატე ტუტე' : 'ტუტე ჭარბია, შეამცირე V'}.` }; },
      },
      {
        key: 'phenol', title: 'ფენოლფტალეინის ფერი', kind: 'state', params: [],
        text: () => 'აირჩიე ინდიკატორი „ფენოლფტალეინი“ და მიაღწიე ღია ვარდისფერს (pH 8.2–10).',
        check(s) { const v = ph(s); if (s.v.ind !== 'phenol') return { passed: false, message: 'აირჩიე ინდიკატორი: ფენოლფტალეინი.' }; const ok = v >= 8.2 && v <= 10; return { passed: ok, message: ok ? `ვარდისფერია! pH = ${f(v)}` : `pH = ${f(v)} — ${v < 8.2 ? 'ჯერ უფეროა' : 'ძალიან ტუტეა'}.` }; },
      },
      {
        key: 'rule-stop', title: 'კოდი: ავტომატური ტიტრატორი', kind: 'rule',
        params: [{ key: 'target', label: 'გაჩერების pH', value: 7 }],
        text: (p) => `დაწერე წესი: როცა pH ≥ ${p.target}, დაკეტე სარქველი — set("valve", false). მანამდე სარქველი ღია უნდა დარჩეს.`,
        vectors: (p) => [
          { vars: { pH: 2.5 }, expect: (o) => o.sets.valve !== false, label: 'pH = 2.5 → სარქველი ღიაა' },
          { vars: { pH: p.target - 0.2 }, expect: (o) => o.sets.valve !== false, label: `pH = ${f(p.target - 0.2, 1)} → ღიაა` },
          { vars: { pH: p.target + 0.1 }, expect: (o) => o.sets.valve === false, label: `pH = ${f(p.target + 0.1, 1)} → set("valve", false)`, hint: 'if (pH >= …) { set("valve", false); }' },
          { vars: { pH: 11 }, expect: (o) => o.sets.valve === false, label: 'pH = 11 → დაკეტილია' },
        ],
      },
    ],
  });

  /* ============ 2. რეაქციის სიჩქარე ============ */
  const R_GAS = 8.314;
  const relRate = (T, Ea, cat) => { const e = (cat ? Ea * 0.6 : Ea) * 1000; return Math.exp(-e / (R_GAS * (T + 273.15)) + 50000 / (R_GAS * 298.15)); };
  const rr = (s) => relRate(s.v.T, s.v.Ea, s.v.cat);
  S.register({
    key: 'reaction', subject: 'chemistry', title: 'რეაქციის სიჩქარე და ტემპერატურა', icon: '🔥',
    summary: 'არენიუსის განტოლება: როგორ მოქმედებს ტემპერატურა, აქტივაციის ენერგია და კატალიზატორი',
    animated: true, autoplay: true,
    vars: [
      { key: 'T', label: 'ტემპერატურა', min: 0, max: 100, step: 1, value: 25, unit: '°C' },
      { key: 'N', label: 'კონცენტრაცია (ნაწილაკები)', min: 10, max: 70, step: 1, value: 36, unit: '', reset: true },
      { key: 'Ea', label: 'აქტივაციის ენერგია Eₐ', min: 20, max: 80, step: 1, value: 50, unit: 'კჯ/მოლ' },
      { key: 'cat', label: 'კატალიზატორი (Eₐ −40%)', type: 'toggle', value: 0 },
    ],
    presets: [{ label: '❄ ცივი (5°C)', values: { T: 5 } }, { label: '🌡 ოთახის (25°C)', values: { T: 25 } }, { label: '🔥 ცხელი (90°C)', values: { T: 90 } }],
    create: () => ({ parts: [] }),
    reset(s) {
      s.t = 0; s.A = 1; s.parts = [];
      for (let i = 0; i < s.v.N; i++) { const a = Math.random() * Math.PI * 2; s.parts.push({ x: Math.random(), y: Math.random(), dx: Math.cos(a), dy: Math.sin(a), p: 0, flash: 0 }); }
    },
    step(s, dt) {
      s.t += dt;
      const k = 0.05 * rr(s);
      s.A = s.A * Math.exp(-k * dt);
      const sp = 0.25 * Math.sqrt((s.v.T + 273.15) / 298.15);
      s.parts.forEach((q) => {
        q.x += q.dx * sp * dt; q.y += q.dy * sp * dt;
        if (q.x < 0) { q.x = -q.x; q.dx *= -1; } if (q.x > 1) { q.x = 2 - q.x; q.dx *= -1; }
        if (q.y < 0) { q.y = -q.y; q.dy *= -1; } if (q.y > 1) { q.y = 2 - q.y; q.dy *= -1; }
        q.flash = Math.max(0, q.flash - dt * 2);
      });
      const want = Math.round((1 - s.A) * s.parts.length);
      let have = s.parts.filter((q) => q.p).length;
      while (have < want) { const r = s.parts.filter((q) => !q.p); if (!r.length) break; const q = r[Math.floor(Math.random() * r.length)]; q.p = 1; q.flash = 1; have++; }
    },
    readouts(s) {
      const r = rr(s), k = 0.05 * r;
      return [['ფარდობითი სიჩქარე', f(r, 2) + '×'], ['ნახევარდაშლის დრო t½', f(Math.LN2 / k, 1) + ' წმ'], ['პროდუქტი', f((1 - s.A) * 100, 1) + '%'],
        ['ეფექტური Eₐ', f(s.v.cat ? s.v.Ea * 0.6 : s.v.Ea, 0) + ' კჯ/მოლ'], ['დრო', f(s.t, 1) + ' წმ']];
    },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(0, 0, w, h);
      const bx = 16, by = 16, bw = w * 0.66, bh = h - 60;
      ctx.fillStyle = `rgba(255,${235 - s.v.T * 1.2},${220 - s.v.T * 1.8},0.6)`; D.rrect(ctx, bx, by, bw, bh, 10); ctx.fill();
      ctx.strokeStyle = '#868e96'; ctx.lineWidth = 2; D.rrect(ctx, bx, by, bw, bh, 10); ctx.stroke();
      s.parts.forEach((q) => {
        const x = bx + 8 + q.x * (bw - 16), y = by + 8 + q.y * (bh - 16);
        if (q.flash > 0) D.dot(ctx, x, y, 8 + 10 * q.flash, `rgba(255,212,59,${q.flash * 0.7})`);
        D.dot(ctx, x, y, 6, q.p ? '#f76707' : '#4c6ef5');
      });
      // შემადგენლობის ზოლი
      const pr = 1 - s.A;
      ctx.fillStyle = '#4c6ef5'; ctx.fillRect(bx, h - 34, bw * s.A, 14);
      ctx.fillStyle = '#f76707'; ctx.fillRect(bx + bw * s.A, h - 34, bw * pr, 14);
      D.text(ctx, `● რეაგენტი ${f(s.A * 100, 0)}%`, bx, h - 6, { color: '#364fc7', size: 11 });
      D.text(ctx, `● პროდუქტი ${f(pr * 100, 0)}%`, bx + bw, h - 6, { color: '#d9480f', size: 11, align: 'right' });
      // თერმომეტრი
      const tx = w * 0.8, ty = 24, th = h - 90;
      ctx.fillStyle = '#fff'; D.rrect(ctx, tx - 8, ty, 16, th, 8); ctx.fill(); ctx.strokeStyle = '#495057'; ctx.stroke();
      const lvl = s.v.T / 100;
      ctx.fillStyle = '#e03131'; ctx.fillRect(tx - 4, ty + th * (1 - lvl), 8, th * lvl);
      D.dot(ctx, tx, ty + th + 10, 13, '#e03131');
      D.text(ctx, `${s.v.T}°C`, tx + 18, ty + th * (1 - lvl) + 4, { weight: 700 });
      D.text(ctx, `სიჩქარე ${f(rr(s), 1)}×`, tx, h - 8, { align: 'center', weight: 700, color: '#c92a2a' });
      if (s.v.cat) D.text(ctx, '⚗ კატალიზატორი', bx + 10, by + 22, { weight: 600, color: '#2b8a3e', bg: 'rgba(255,255,255,.8)' });
    },
    bridge: {
      vars: (s) => ({ temperature: s.v.T, rate: rr(s), product: (1 - s.A) * 100, reactant: s.A * 100, time: s.t }),
      writable: [],
      example: '// შეტყობინება, როცა რეაქცია თითქმის დასრულდა\nif (product > 90) {\n  alarm("რეაქცია 90%-ით დასრულდა!");\n  led(true);\n}\nif (rate > 10) log("ძალიან სწრაფი რეაქცია");',
    },
    challenges: [
      {
        key: 'rate', title: 'დააჩქარე რეაქცია', kind: 'state',
        params: [{ key: 'min', label: 'მინიმალური სიჩქარე (×)', value: 10 }],
        text: (p) => `კატალიზატორის გარეშე მიაღწიე ფარდობით სიჩქარეს ≥ ${p.min}×. რომელი პარამეტრი უნდა შეცვალო?`,
        check(s, p) { if (s.v.cat) return { passed: false, message: 'გამორთე კატალიზატორი — ეს ამოცანა მის გარეშეა.' }; const r = rr(s), ok = r >= p.min; return { passed: ok, message: ok ? `სწორია! სიჩქარე ${f(r, 1)}× (T = ${s.v.T}°C)` : `სიჩქარე ${f(r, 2)}× — გაზარდე ტემპერატურა ან შეამცირე Eₐ.` }; },
      },
      {
        key: 'catalyst', title: 'ცივი, მაგრამ სწრაფი', kind: 'state',
        params: [{ key: 'maxT', label: 'მაქს. ტემპერატურა (°C)', value: 30 }, { key: 'min', label: 'მინ. სიჩქარე (×)', value: 20 }],
        text: (p) => `T ≤ ${p.maxT}°C-ზე და Eₐ = 50 კჯ/მოლ-ზე მიაღწიე სიჩქარეს ≥ ${p.min}×.`,
        check(s, p) {
          if (s.v.T > p.maxT) return { passed: false, message: `ტემპერატურა ${s.v.T}°C > ${p.maxT}°C.` };
          if (s.v.Ea !== 50) return { passed: false, message: 'Eₐ დააბრუნე 50 კჯ/მოლ-ზე.' };
          const r = rr(s), ok = r >= p.min; return { passed: ok, message: ok ? `შესანიშნავია! ${f(r, 1)}× — კატალიზატორი ამცირებს Eₐ-ს.` : `სიჩქარე ${f(r, 2)}× — რა შეიძლება დაამატო?` };
        },
      },
      {
        key: 'rule-done', title: 'კოდი: რეაქციის დასრულების სიგნალი', kind: 'rule',
        params: [{ key: 'level', label: 'პროდუქტის ზღვარი (%)', value: 90 }],
        text: (p) => `დაწერე წესი: როცა product ≥ ${p.level}, ჩართე LED და alarm("…"). მანამდე LED ჩამქრალია.`,
        vectors: (p) => [
          { vars: { product: 20 }, expect: (o) => o.led !== true && !o.alarm, label: 'product = 20% → სიჩუმე' },
          { vars: { product: p.level - 1 }, expect: (o) => o.led !== true, label: `product = ${p.level - 1}% → LED ჩამქრალია` },
          { vars: { product: p.level }, expect: (o) => o.led === true, label: `product = ${p.level}% → LED ჩართულია`, hint: 'გამოიყენე >= და არა >' },
          { vars: { product: 99 }, expect: (o) => !!o.alarm, label: 'product = 99% → alarm()' },
        ],
      },
    ],
  });

  /* ============ 3. წყლის გათბობა და თერმოსტატი ============ */
  const CI = 2100, CW = 4186, CS = 2010, LF = 334000, LV = 2.26e6;
  const H1 = LF, H2 = LF + CW * 100, H3 = H2 + LV;
  const tempOf = (H) => (H < 0 ? H / CI : H < H1 ? 0 : H < H2 ? (H - LF) / CW : H < H3 ? 100 : 100 + (H - H3) / CS);
  const phaseOf = (H) => (H < 0 ? 0 : H < H1 ? 1 : H < H2 ? 2 : H < H3 ? 3 : 4);
  const enthalpyOf = (T) => (T < 0 ? CI * T : LF + CW * T);
  const PHASES = ['❄ ყინული', '🧊 დნობა (0°C)', '💧 წყალი', '♨ დუღილი (100°C)', '☁ ორთქლი'];
  const LOSS = 8; // ვტ/K სითბოს დანაკარგი გარემოში (20°C)
  function heatStep(s, dt) {
    const T = tempOf(s.H);
    const q = (s.ctrl.heater !== false ? s.v.P : 0) - LOSS * (T - 20);
    s.H = Math.min(enthalpyOf(0) + H3 + CS * 60, s.H + q * dt / s.v.m);
    s.t += dt;
  }
  S.register({
    key: 'heating', subject: 'chemistry', title: 'წყლის გათბობა, ფაზები და თერმოსტატი', icon: '♨️',
    summary: 'ყინული → წყალი → ორთქლი: ლატენტური სითბო და ტემპერატურის ზღვრები კოდით',
    animated: true, defaultSpeed: 10,
    vars: [
      { key: 'P', label: 'გამათბობლის სიმძლავრე', min: 200, max: 3000, step: 50, value: 1500, unit: 'ვტ' },
      { key: 'm', label: 'მასა', min: 0.1, max: 2, step: 0.05, value: 0.5, unit: 'კგ' },
      { key: 'T0', label: 'საწყისი ტემპერატურა', min: -30, max: 40, step: 1, value: -10, unit: '°C', reset: true },
    ],
    presets: [{ label: 'ყინული −20°C', values: { T0: -20 } }, { label: 'ონკანის წყალი 15°C', values: { T0: 15 } }, { label: 'ჩაიდანი (2 კვტ)', values: { P: 2000, m: 1, T0: 15 } }],
    create: () => ({ hist: [] }),
    reset(s) { s.H = enthalpyOf(s.v.T0); s.t = 0; s.hist = [[0, s.v.T0]]; s.boiled = false; },
    step(s, dt) {
      const n = Math.max(1, Math.ceil(dt / 0.5)); for (let i = 0; i < n; i++) heatStep(s, dt / n);
      if (phaseOf(s.H) >= 3) s.boiled = true;
      const last = s.hist[s.hist.length - 1];
      if (s.t - last[0] > 1) { s.hist.push([s.t, tempOf(s.H)]); if (s.hist.length > 1500) s.hist.splice(0, 300); }
    },
    readouts(s) {
      const T = tempOf(s.H), ph = phaseOf(s.H);
      const frac = ph === 1 ? ` (${f(s.H / LF * 100, 0)}% დნება)` : ph === 3 ? ` (${f((s.H - H2) / LV * 100, 0)}% აორთქლდა)` : '';
      return [['ტემპერატურა', f(T, 1) + ' °C'], ['მდგომარეობა', PHASES[ph] + frac], ['გამათბობელი', s.ctrl.heater !== false ? '🔥 ჩართულია' : '⭘ გამორთულია'], ['დრო', f(s.t, 0) + ' წმ']];
    },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(0, 0, w, h);
      const T = tempOf(s.H), ph = phaseOf(s.H), on = s.ctrl.heater !== false;
      const cx = w * 0.2, bw = Math.min(150, w * 0.26), top = h * 0.25, bh = h * 0.5;
      // გამათბობელი
      ctx.fillStyle = on ? '#ff6b6b' : '#adb5bd'; D.rrect(ctx, cx - bw / 2 - 10, top + bh + 8, bw + 20, 14, 5); ctx.fill();
      if (on) { ctx.strokeStyle = '#fa5252'; ctx.lineWidth = 2; for (let i = 0; i < 5; i++) { const x = cx - bw / 2 + 10 + i * (bw - 20) / 4; ctx.beginPath(); ctx.moveTo(x, top + bh + 30); ctx.quadraticCurveTo(x + 6, top + bh + 38, x, top + bh + 46); ctx.stroke(); } }
      // შიგთავსი
      const melt = ph === 0 ? 0 : ph === 1 ? s.H / LF : 1, vap = ph < 3 ? 0 : ph === 3 ? (s.H - H2) / LV : 1;
      const lvl = bh * 0.75 * (1 - vap);
      ctx.fillStyle = 'rgba(116,192,252,.6)'; ctx.fillRect(cx - bw / 2 + 2, top + bh - lvl, bw - 4, lvl);
      const cubes = Math.round(6 * (1 - melt));
      for (let i = 0; i < cubes; i++) { ctx.fillStyle = 'rgba(231,245,255,.95)'; ctx.strokeStyle = '#a5d8ff'; const x = cx - bw / 2 + 12 + (i % 3) * (bw - 30) / 3, y = top + bh - lvl + 8 + Math.floor(i / 3) * 26; D.rrect(ctx, x, y, 22, 22, 4); ctx.fill(); ctx.stroke(); }
      if (ph >= 3 || T > 90) for (let i = 0; i < 8; i++) { const x = cx - bw / 2 + 10 + ((i * 37 + s.t * 40) % (bw - 20)); const y = top + bh - ((i * 23 + s.t * 60) % Math.max(10, lvl)); D.dot(ctx, x, y, 3, 'rgba(255,255,255,.8)'); }
      if (ph >= 3) for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(206,212,218,.6)'; ctx.beginPath(); ctx.arc(cx - 20 + i * 20, top - 16 - ((s.t * 10 + i * 13) % 30), 12, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx - bw / 2, top); ctx.lineTo(cx - bw / 2, top + bh); ctx.lineTo(cx + bw / 2, top + bh); ctx.lineTo(cx + bw / 2, top); ctx.stroke();
      D.text(ctx, `${f(T, 1)} °C`, cx, top - 34, { align: 'center', size: 20, weight: 700, mono: true, color: T >= 100 ? '#c92a2a' : T <= 0 ? '#1971c2' : '#212529' });
      D.text(ctx, PHASES[ph], cx, h - 8, { align: 'center', weight: 600 });
      // გრაფიკი
      const gx = w * 0.42, gw = w - gx - 14, gy = 14, gh = h - 44;
      const tmax = Math.max(120, Math.ceil(s.t / 60) * 60);
      const ymin = Math.min(-30, Math.floor(s.v.T0 / 10) * 10), ymax = 130;
      const mm = D.plot(ctx, gx, gy, gw, gh, { xmin: 0, xmax: tmax, ymin, ymax }, { stepY: 20, xLabel: 't, წმ', yLabel: 'T, °C' });
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#ffc9c9'; [0, 100].forEach((y) => { ctx.beginPath(); ctx.moveTo(gx, mm.Y(y)); ctx.lineTo(gx + gw, mm.Y(y)); ctx.stroke(); }); ctx.restore();
      if (s.active && s.active.key === 'thermostat') { const p = s.active.params; ctx.fillStyle = 'rgba(64,192,87,.15)'; ctx.fillRect(gx, mm.Y(p.target + p.tol), gw, mm.Y(p.target - p.tol) - mm.Y(p.target + p.tol)); }
      ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 2.5; ctx.beginPath();
      s.hist.concat([[s.t, T]]).forEach(([t, y], i) => (i ? ctx.lineTo(mm.X(t), mm.Y(y)) : ctx.moveTo(mm.X(t), mm.Y(y)))); ctx.stroke();
    },
    bridge: {
      vars: (s) => ({ temperature: tempOf(s.H), time: s.t, phase: phaseOf(s.H), power: s.v.P }),
      writable: [{ key: 'heater', label: 'გამათბობელი (heater)', value: true }],
      example: '// თერმოსტატის საწყისი იდეა — დაასრულე თავად!\n// phase: 0 ყინული, 1 დნობა, 2 წყალი, 3 დუღილი, 4 ორთქლი\nif (temperature > 40) {\n  set("heater", false);\n}\nif (phase == 3) alarm("წყალი დუღს!");',
    },
    challenges: [
      {
        key: 'boil', title: 'ადუღე წყალი', kind: 'state', params: [],
        text: () => 'გაუშვი სიმულაცია და მიიყვანე წყალი დუღილამდე. დააკვირდი გრაფიკის „თაროებს“ 0°C-ზე და 100°C-ზე — რატომ არ იცვლება ტემპერატურა?',
        check(s) { const ok = !!s.boiled; return { passed: ok, message: ok ? `წყალი ადუღდა! t = ${f(s.t, 0)} წმ` : `T = ${f(tempOf(s.H), 1)} °C — ჯერ არ დუღს. გაუშვი ▶ და შეგიძლია გაზარდო სიმძლავრე.` }; },
      },
      {
        key: 'thermostat', title: 'კოდი: თერმოსტატი', kind: 'sim',
        params: [{ key: 'target', label: 'სამიზნე ტემპერატურა (°C)', value: 60 }, { key: 'tol', label: 'დასაშვები გადახრა (°C)', value: 3 }],
        text: (p) => `დაწერე წესი, რომელიც set("heater", true/false)-ით შეინარჩუნებს წყლის ტემპერატურას ${p.target} ± ${p.tol} °C. შემოწმებისას 20°C წყალი 20 წუთის განმავლობაში თბება შენი წესით; ბოლო 5 წუთში ტემპერატურა დიაპაზონში უნდა იყოს.`,
        check(s, p, ctx) {
          const sim = S.get('heating');
          const names = Object.keys(sim.bridge.vars(s));
          const comp = VL.STEM.Bridge.compile(ctx.ruleCode, names);
          if (!comp.ok) return { passed: false, message: comp.error };
          if (comp.empty) return { passed: false, message: 'წესი ცარიელია — ჩაწერე კოდი „კოდის ხიდში“.' };
          const st = S.makeState(sim, { ...s.v, T0: 20 });
          let lo = Infinity, hi = -Infinity;
          try {
            for (let t = 0; t < 1200; t += 0.5) {
              const out = comp.run(sim.bridge.vars(st));
              if ('heater' in out.sets) st.ctrl.heater = !!out.sets.heater;
              heatStep(st, 0.5);
              if (st.t >= 900) { const T = tempOf(st.H); lo = Math.min(lo, T); hi = Math.max(hi, T); }
            }
          } catch (e) { return { passed: false, message: VL.STEM.Bridge.translate(e) }; }
          const ok = lo >= p.target - p.tol && hi <= p.target + p.tol;
          return {
            passed: ok,
            message: ok ? `თერმოსტატი მუშაობს! ბოლო 5 წუთში T: ${f(lo, 1)}–${f(hi, 1)} °C` : `ბოლო 5 წუთში T იყო ${f(lo, 1)}–${f(hi, 1)} °C, საჭიროა ${p.target - p.tol}–${p.target + p.tol} °C. ${hi > p.target + p.tol ? 'გამორთე გამათბობელი ადრე.' : 'ჩართე გამათბობელი, როცა ცივდება.'}`,
          };
        },
      },
      {
        key: 'rule-boil', title: 'კოდი: დუღილის სიგნალიზაცია', kind: 'rule', params: [],
        text: () => 'დაწერე წესი: როცა temperature ≥ 100, alarm("…") და გამათბობლის გამორთვა — set("heater", false).',
        vectors: () => [
          { vars: { temperature: 50 }, expect: (o) => !o.alarm && o.sets.heater !== false, label: '50 °C → არაფერი' },
          { vars: { temperature: 99.5 }, expect: (o) => !o.alarm, label: '99.5 °C → ჯერ არა' },
          { vars: { temperature: 100 }, expect: (o) => !!o.alarm && o.sets.heater === false, label: '100 °C → alarm + heater=false' },
        ],
      },
    ],
  });
})(window.VL);
