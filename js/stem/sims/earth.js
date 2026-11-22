/* ============================================================
 * stem/sims/earth.js — გეოგრაფია / დედამიწის მეცნიერებები
 * წელიწადის დროები და დღის ხანგრძლივობა · კლიმატი და სათბურის ეფექტი
 * ============================================================ */
(function (VL) {
  'use strict';
  const S = VL.STEM, D = S.draw, f = S.fmt;
  const R = Math.PI / 180;
  const MONTHS = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];
  const dateOf = (n) => { const d = new Date(2025, 0, 1); d.setDate(Math.round(n)); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };

  /* ============ 1. წელიწადის დროები ============ */
  const decl = (n, tilt) => -tilt * Math.cos(2 * Math.PI * (n + 10) / 365);
  const dayLen = (lat, n, tilt) => {
    const d = decl(n, tilt) * R, p = lat * R; const c = -Math.tan(p) * Math.tan(d);
    if (c >= 1) return 0; if (c <= -1) return 24; return 2 * Math.acos(c) / R / 15;
  };
  const elev = (lat, n, tilt) => 90 - Math.abs(lat - decl(n, tilt));
  S.register({
    key: 'seasons', subject: 'earth', title: 'წელიწადის დროები და დღის ხანგრძლივობა', icon: '🌞',
    summary: 'დედამიწის ღერძის დახრა, განედი, მზის სიმაღლე და პოლარული ღამე',
    animated: true, playLabel: '▶ წლის სვლა',
    vars: [
      { key: 'lat', label: 'განედი φ', min: -90, max: 90, step: 0.5, value: 41.7, unit: '°' },
      { key: 'day', label: 'წლის დღე', min: 1, max: 365, step: 1, value: 172, unit: '', live: true },
      { key: 'tilt', label: 'ღერძის დახრა', min: 0, max: 45, step: 0.5, value: 23.5, unit: '°' },
    ],
    presets: [{ label: '🇬🇪 თბილისი 41.7°', values: { lat: 41.7 } }, { label: 'ეკვატორი', values: { lat: 0 } }, { label: 'ჩრდ. პოლარული წრე 70°', values: { lat: 70 } }, { label: '21 ივნისი', values: { day: 172 } }, { label: '21 დეკემბერი', values: { day: 355 } }, { label: '20 მარტი', values: { day: 79 } }],
    create: () => ({}), reset(s) { s.t = 0; },
    step(s, dt) { s.t += dt; s.v.day = ((s.v.day - 1 + dt * 12) % 365) + 1; },
    readouts(s) {
      const L = dayLen(s.v.lat, s.v.day, s.v.tilt), e = elev(s.v.lat, s.v.day, s.v.tilt);
      return [['თარიღი', dateOf(s.v.day)], ['დღის ხანგრძლივობა', L === 0 ? '0 სთ (პოლარული ღამე)' : L === 24 ? '24 სთ (პოლარული დღე)' : `${Math.floor(L)} სთ ${Math.round((L % 1) * 60)} წთ`],
        ['მზის სიმაღლე შუადღისას', f(Math.max(0, e), 1) + '°'], ['მზის დახრილობა δ', f(decl(s.v.day, s.v.tilt), 1) + '°']];
    },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, w * 0.48, h);
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(w * 0.48, 0, w * 0.52, h);
      // ორბიტა
      const ox = w * 0.24, oy = h * 0.5, rx = w * 0.19, ry = h * 0.3;
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.ellipse(ox, oy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      const sg = ctx.createRadialGradient(ox, oy, 2, ox, oy, 30); sg.addColorStop(0, '#fff3bf'); sg.addColorStop(1, '#fab005'); D.dot(ctx, ox, oy, 20, sg);
      const ang = 2 * Math.PI * (s.v.day - 172) / 365;
      const ex = ox - rx * Math.cos(ang), ey = oy + ry * Math.sin(ang);
      D.dot(ctx, ex, ey, 14, '#339af0');
      // განათებული ნახევარი
      const toSun = Math.atan2(oy - ey, ox - ex);
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.arc(ex, ey, 14, toSun + Math.PI / 2, toSun + Math.PI * 1.5); ctx.fill();
      const ta = s.v.tilt * R;
      ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex + 22 * Math.sin(ta), ey - 22 * Math.cos(ta)); ctx.lineTo(ex - 22 * Math.sin(ta), ey + 22 * Math.cos(ta)); ctx.stroke();
      D.text(ctx, dateOf(s.v.day), ex, ey + 32, { align: 'center', color: '#fff', weight: 700 });
      [['ზაფხულის მზებუდობა', 172], ['ზამთრის მზებუდობა', 355], ['ბუნიობა', 79], ['ბუნიობა', 266]].forEach(([n, d]) => {
        const a = 2 * Math.PI * (d - 172) / 365; D.text(ctx, n, ox - (rx + 6) * Math.cos(a), oy + (ry + 14) * Math.sin(a), { align: 'center', color: 'rgba(255,255,255,.55)', size: 9 });
      });
      D.text(ctx, 'ხედი ზემოდან (ჩრდილოეთიდან)', 10, 18, { color: 'rgba(255,255,255,.6)', size: 10 });
      // გრაფიკი
      const gx = w * 0.5 + 6, gw = w - gx - 10;
      const m = D.plot(ctx, gx, 12, gw, h - 40, { xmin: 1, xmax: 365, ymin: 0, ymax: 24 }, { xLabel: 'დღე', yLabel: 'სთ', stepY: 4, stepX: 60 });
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#ced4da'; ctx.beginPath(); ctx.moveTo(gx, m.Y(12)); ctx.lineTo(gx + gw, m.Y(12)); ctx.stroke(); ctx.restore();
      D.fn(ctx, m, (n) => dayLen(-s.v.lat, n, s.v.tilt), 1, 365, 'rgba(112,72,232,.3)', 2, [5, 4]);
      D.fn(ctx, m, (n) => dayLen(s.v.lat, n, s.v.tilt), 1, 365, '#f59f00', 3);
      D.dot(ctx, m.X(s.v.day), m.Y(dayLen(s.v.lat, s.v.day, s.v.tilt)), 6, '#e8590c', '#fff');
      D.text(ctx, `φ = ${s.v.lat}° (— იგივე სამხრეთში)`, gx + 8, 30, { weight: 600, size: 11, bg: 'rgba(255,255,255,.85)' });
    },
    bridge: {
      vars: (s) => ({ dayLength: dayLen(s.v.lat, s.v.day, s.v.tilt), sunElevation: elev(s.v.lat, s.v.day, s.v.tilt), latitude: s.v.lat, day: s.v.day }),
      writable: [],
      example: '// LED ანთია წლის „ნათელ“ ნახევარში (დღე > 12 სთ)\nif (dayLength > 12) {\n  led(true);\n} else {\n  led(false);\n}\nif (dayLength == 0) alarm("პოლარული ღამე!");',
    },
    challenges: [
      { key: 'polar', title: 'პოლარული ღამე', kind: 'state', params: [],
        text: () => 'იპოვე ადგილი (განედი) და თარიღი, როცა მზე მთელი დღე საერთოდ არ ამოდის (დღის ხანგრძლივობა = 0) — ღერძის ნორმალური დახრით (23.5°).',
        check(s) { const L = dayLen(s.v.lat, s.v.day, s.v.tilt), ok = L === 0 && Math.abs(s.v.tilt - 23.5) < 0.6; return { passed: ok, message: ok ? `სწორია! φ = ${s.v.lat}°, ${dateOf(s.v.day)} — პოლარული ღამე.` : `ახლა დღე ${f(L, 1)} სთ-ია.` }; } },
      { key: 'notilt', title: 'დახრის გარეშე დედამიწა', kind: 'state', params: [],
        text: () => 'რა მოხდებოდა, დედამიწის ღერძი რომ არ იყოს დახრილი? დააყენე დახრა 0° და შეამოწმე დღის ხანგრძლივობა თბილისში (41.7°) 21 ივნისს.',
        check(s) { const L = dayLen(s.v.lat, s.v.day, s.v.tilt), ok = s.v.tilt === 0 && Math.abs(s.v.lat - 41.7) < 1; return { passed: ok, message: ok ? `სწორია! დღე ყოველთვის ${f(L, 1)} სთ-ია — წელიწადის დროები არ იქნებოდა.` : 'დახრა 0°, განედი 41.7°.' }; } },
      { key: 'rule-summer', title: 'კოდი: ზაფხულის ინდიკატორი', kind: 'rule', params: [],
        text: () => 'დაწერე წესი: LED ანთდეს, როცა dayLength > 12, და alarm("…"), როცა dayLength == 0 (პოლარული ღამე).',
        vectors: () => [{ vars: { dayLength: 15.2 }, expect: (o) => o.led === true && !o.alarm, label: '15.2 სთ → LED' }, { vars: { dayLength: 9 }, expect: (o) => o.led !== true && !o.alarm, label: '9 სთ → ჩამქრალია' }, { vars: { dayLength: 0 }, expect: (o) => o.led !== true && !!o.alarm, label: '0 სთ → alarm' }] },
    ],
  });

  /* ============ 2. კლიმატი და სათბურის ეფექტი ============ */
  const SIG = 5.67e-8;
  const eqT = (co2, alb, sol) => { const S0 = 1361 * sol / 100, eps = 0.77 + 0.0508 * Math.log2(co2 / 280); return Math.pow(S0 * (1 - alb) / (4 * SIG), 0.25) * Math.pow(1 / (1 - eps / 2), 0.25) - 273.15; };
  const BASE = eqT(280, 0.3, 100);
  S.register({
    key: 'climate', subject: 'earth', title: 'კლიმატი და სათბურის ეფექტი', icon: '🌡️',
    summary: 'CO₂, ალბედო და მზის გამოსხივება — დედამიწის ენერგეტიკული ბალანსი',
    animated: true, defaultSpeed: 2,
    vars: [
      { key: 'co2', label: 'CO₂ კონცენტრაცია', min: 180, max: 1200, step: 5, value: 280, unit: 'ppm', live: true },
      { key: 'alb', label: 'ალბედო (არეკვლა)', min: 0.1, max: 0.6, step: 0.005, value: 0.3, unit: '' },
      { key: 'sol', label: 'მზის გამოსხივება', min: 90, max: 110, step: 0.5, value: 100, unit: '%' },
    ],
    presets: [{ label: 'ყინულოვანი ხანა (180 ppm)', values: { co2: 180 } }, { label: 'ინდუსტრიამდე (280)', values: { co2: 280 } }, { label: 'დღეს (~420)', values: { co2: 420 } }, { label: 'გაორმაგება (560)', values: { co2: 560 } }],
    create: () => ({ hist: [] }),
    reset(s) { s.t = 0; s.T = eqT(s.v.co2, s.v.alb, s.v.sol); s.hist = [[0, s.T]]; s.year = 1850; },
    step(s, dt) {
      const yrs = dt * 10; s.t += dt; s.year += yrs;
      if (s.ctrl.emissions) s.v.co2 = Math.min(1200, s.v.co2 + 2.5 * yrs);
      const Te = eqT(s.v.co2, s.v.alb, s.v.sol);
      s.T += (Te - s.T) * (1 - Math.exp(-yrs / 15));
      if (s.year - s.hist[s.hist.length - 1][0] - 1850 > 2) { s.hist.push([s.year - 1850, s.T]); if (s.hist.length > 300) s.hist.shift(); }
    },
    readouts(s) {
      const Te = eqT(s.v.co2, s.v.alb, s.v.sol);
      return [['წონასწორული ტემპერატურა', f(Te, 1) + ' °C'], ['ახლანდელი ტემპერატურა', f(s.T, 1) + ' °C'], ['დათბობა (1850-თან)', (Te - BASE >= 0 ? '+' : '') + f(Te - BASE, 2) + ' °C'],
        ['წელი', String(Math.round(s.year))], ['ემისიები', s.ctrl.emissions ? '🏭 +2.5 ppm/წელი' : '🌳 შეჩერებულია']];
    },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, w * 0.45, h);
      const cx = w * 0.24, cy = h * 0.62, Rr = Math.min(w * 0.16, h * 0.3);
      const atm = Rr + 8 + (s.v.co2 - 180) / 1020 * 26;
      ctx.fillStyle = `rgba(255,${200 - (s.v.co2 - 180) / 6},120,0.18)`; ctx.beginPath(); ctx.arc(cx, cy, atm, 0, Math.PI * 2); ctx.fill();
      const ice = Math.max(0, Math.min(1, (s.v.alb - 0.25) / 0.3));
      ctx.fillStyle = '#1c7ed6'; ctx.beginPath(); ctx.arc(cx, cy, Rr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2f9e44'; ctx.beginPath(); ctx.ellipse(cx - Rr * 0.2, cy, Rr * 0.35, Rr * 0.5, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, Rr, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(cx - Rr, cy - Rr, Rr * 2, Rr * (0.18 + ice * 0.45)); ctx.fillRect(cx - Rr, cy + Rr * (0.86 - ice * 0.4), Rr * 2, Rr);
      ctx.restore();
      // სხივები
      for (let i = 0; i < 3; i++) { const x = cx - 50 + i * 40; D.arrow(ctx, x, 10, x + 10, cy - atm - 4, '#ffd43b', 2.5); }
      D.arrow(ctx, cx + 20, cy - atm, cx + 60, 16, 'rgba(255,255,255,.7)', 2);
      const trap = Math.min(1, (s.v.co2 - 150) / 900);
      for (let i = 0; i < 3; i++) { const x = cx - 30 + i * 30; D.arrow(ctx, x, cy - Rr, x - 5, cy - atm + 2, '#ff6b6b', 2); if (i < Math.round(trap * 3 + 0.3)) D.arrow(ctx, x - 5, cy - atm + 2, x - 12, cy - Rr - 2, 'rgba(255,107,107,.6)', 1.5); }
      D.text(ctx, `${f(s.T, 1)} °C`, cx, cy + 6, { align: 'center', color: '#fff', size: 18, weight: 700 });
      D.text(ctx, `CO₂ ${Math.round(s.v.co2)} ppm`, 10, h - 12, { color: '#ffc9c9', weight: 600 });
      D.text(ctx, '☀ მზე → ← ინფრაწითელი (სითბო)', 10, 16, { color: 'rgba(255,255,255,.6)', size: 10 });
      // გრაფიკი
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(w * 0.45, 0, w * 0.55, h);
      const gx = w * 0.45 + 10, gw = w - gx - 10;
      const span = Math.max(150, s.year - 1850);
      const m = D.plot(ctx, gx, 12, gw, h - 40, { xmin: 0, xmax: span, ymin: BASE - 6, ymax: BASE + 8 }, { xLabel: 'წლები 1850-დან', yLabel: '°C', stepY: 2 });
      ctx.fillStyle = 'rgba(255,107,107,.12)'; ctx.fillRect(gx, m.Y(BASE + 8), gw, m.Y(BASE + 1.5) - m.Y(BASE + 8));
      D.text(ctx, 'პარიზის ზღვარი +1.5 °C', gx + gw - 6, m.Y(BASE + 1.5) - 4, { align: 'right', color: '#c92a2a', size: 10 });
      ctx.strokeStyle = '#e03131'; ctx.lineWidth = 2.5; ctx.beginPath();
      s.hist.concat([[s.year - 1850, s.T]]).forEach(([t, T], i) => (i ? ctx.lineTo(m.X(t), m.Y(T)) : ctx.moveTo(m.X(t), m.Y(T)))); ctx.stroke();
    },
    bridge: {
      vars: (s) => ({ co2: s.v.co2, temperature: s.T, warming: s.T - BASE, year: s.year }),
      writable: [{ key: 'emissions', label: 'ემისიები (emissions)', value: false }],
      example: '// კლიმატის პოლიტიკა: დათბობა 1.5°C-ზე მეტი არ უნდა იყოს\nif (warming > 1.4) {\n  set("emissions", false);\n  alarm("ემისიები შეჩერდა! დათბობა " + warming.toFixed(2) + " °C");\n} else {\n  set("emissions", true);\n}',
    },
    challenges: [
      { key: 'double', title: 'CO₂-ის გაორმაგება', kind: 'state', params: [],
        text: () => 'გააორმაგე CO₂ ინდუსტრიამდელ დონესთან შედარებით (280 → 560 ppm, ±10) და გაიგე, რამდენით დათბება კლიმატი (ალბედო 0.3, მზე 100%).',
        check(s) { const Te = eqT(s.v.co2, s.v.alb, s.v.sol), ok = Math.abs(s.v.co2 - 560) <= 10 && Math.abs(s.v.alb - 0.3) < 0.006 && s.v.sol === 100; return { passed: ok, message: ok ? `სწორია! დათბობა ≈ +${f(Te - BASE, 1)} °C — ესაა „კლიმატის მგრძნობელობა“.` : `CO₂ = ${Math.round(s.v.co2)} ppm, ალბედო ${s.v.alb}.` }; } },
      { key: 'albedo', title: 'ალბედო vs CO₂', kind: 'state', params: [],
        text: () => 'CO₂ = 420 ppm-ზე შეარჩიე ალბედო ისე, რომ წონასწორული ტემპერატურა ინდუსტრიამდელს დაემთხვეს (±0.2 °C). რატომ არის მყინვარების დნობა სახიფათო?',
        check(s) { const Te = eqT(s.v.co2, s.v.alb, s.v.sol), ok = Math.abs(s.v.co2 - 420) <= 5 && Math.abs(Te - BASE) <= 0.2; return { passed: ok, message: ok ? `სწორია! ალბედო ${s.v.alb}: მეტი არეკვლა აგრილებს.` : `T = ${f(Te, 2)} °C (საჭიროა ${f(BASE, 2)}), CO₂ = ${Math.round(s.v.co2)}.` }; } },
      { key: 'rule-policy', title: 'კოდი: კლიმატის პოლიტიკა', kind: 'rule', params: [{ key: 'max', label: 'მაქს. დათბობა (°C)', value: 1.5 }],
        text: (p) => `დაწერე წესი: თუ warming > ${p.max} → set("emissions", false), სხვა შემთხვევაში set("emissions", true).`,
        vectors: (p) => [{ vars: { warming: p.max + 0.3 }, expect: (o) => o.sets.emissions === false, label: `warming = ${f(p.max + 0.3, 1)} → emissions = false` }, { vars: { warming: 0.4 }, expect: (o) => o.sets.emissions === true, label: 'warming = 0.4 → emissions = true' }] },
    ],
  });
})(window.VL);
