/* ============================================================
 * stem/sims/physics3.js — ფიზიკა: სინათლის გარდატეხა · არქიმედეს კანონი
 * თავისუფალი ვარდნა ჰაერის წინაღობით · დოპლერის ეფექტი
 * ============================================================ */
(function (VL) {
  'use strict';
  const S = VL.STEM, D = S.draw, f = S.fmt;
  const R = Math.PI / 180;

  /* ============ 1. სინათლის გარდატეხა (სნელის კანონი) ============ */
  const MED = { air: ['ჰაერი', 1.0], water: ['წყალი', 1.33], glass: ['მინა', 1.5], diamond: ['ალმასი', 2.42], oil: ['ზეთი', 1.47] };
  const MOPT = Object.entries(MED).map(([k, [n, v]]) => [k, `${n} (n = ${v})`]);
  const refr = (s) => {
    const n1 = MED[s.v.m1][1], n2 = MED[s.v.m2][1], sin2 = n1 * Math.sin(s.v.a * R) / n2;
    const crit = n1 > n2 ? Math.asin(n2 / n1) / R : null;
    return { n1, n2, tir: sin2 > 1, b: sin2 > 1 ? null : Math.asin(sin2) / R, crit };
  };
  S.register({
    key: 'refraction', subject: 'physics', title: 'სინათლის გარდატეხა (სნელის კანონი)', icon: '🔦',
    summary: 'n₁·sin α = n₂·sin β — გარდატეხა, ასხლეტა და სრული შინაგანი არეკვლა',
    animated: false,
    vars: [
      { key: 'a', label: 'დაცემის კუთხე α', min: 0, max: 89, step: 0.5, value: 40, unit: '°' },
      { key: 'm1', label: 'პირველი გარემო (ზემოთ)', type: 'select', value: 'air', options: MOPT },
      { key: 'm2', label: 'მეორე გარემო (ქვემოთ)', type: 'select', value: 'water', options: MOPT },
    ],
    presets: [{ label: 'ჰაერი → წყალი', values: { m1: 'air', m2: 'water' } }, { label: 'მინა → ჰაერი', values: { m1: 'glass', m2: 'air' } }, { label: 'ოპტიკური ბოჭკო', values: { m1: 'glass', m2: 'air', a: 60 } }],
    create: () => ({}), reset() { }, step() { },
    readouts(s) {
      const r = refr(s);
      return [['გარდატეხის კუთხე β', r.tir ? '— (სრული არეკვლა)' : f(r.b, 1) + '°'], ['n₁ → n₂', `${r.n1} → ${r.n2}`], ['კრიტიკული კუთხე', r.crit ? f(r.crit, 1) + '°' : 'არ არსებობს (n₁ < n₂)'], ['სინათლის სიჩქარე მე-2 გარემოში', f(300000 / r.n2, 0) + ' კმ/წმ']];
    },
    draw(ctx, s, w, h) {
      const r = refr(s), cx = w / 2, cy = h / 2, L = Math.min(w, h) * 0.45;
      const col = (n) => `rgba(116,192,252,${(n - 1) / 1.6})`;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = col(r.n1); ctx.fillRect(0, 0, w, cy); ctx.fillStyle = col(r.n2); ctx.fillRect(0, cy, w, h - cy);
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
      ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = '#868e96'; ctx.beginPath(); ctx.moveTo(cx, cy - L); ctx.lineTo(cx, cy + L); ctx.stroke(); ctx.restore();
      const a = s.v.a * R, sx = cx - L * Math.sin(a), sy = cy - L * Math.cos(a);
      ctx.strokeStyle = '#e03131'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(cx, cy); ctx.stroke();
      D.arrow(ctx, sx, sy, (sx + cx) / 2, (sy + cy) / 2, '#e03131', 4, 12);
      const refl = r.tir ? 1 : Math.pow((r.n1 - r.n2) / (r.n1 + r.n2), 2) + Math.pow(Math.sin(a), 6) * 0.6;
      ctx.strokeStyle = `rgba(224,49,49,${Math.min(1, 0.15 + refl)})`; ctx.lineWidth = r.tir ? 4 : 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + L * Math.sin(a), cy - L * Math.cos(a)); ctx.stroke();
      if (!r.tir) { const b = r.b * R; ctx.strokeStyle = '#e03131'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + L * Math.sin(b), cy + L * Math.cos(b)); ctx.stroke(); D.arrow(ctx, cx, cy, cx + L * 0.5 * Math.sin(b), cy + L * 0.5 * Math.cos(b), '#e03131', 3.5, 12);
        ctx.strokeStyle = '#2f9e44'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 50, Math.PI / 2 - b, Math.PI / 2, false); ctx.stroke(); D.text(ctx, `β = ${f(r.b, 1)}°`, cx + 14, cy + 70, { color: '#2b8a3e', weight: 700 }); }
      ctx.strokeStyle = '#f08c00'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 50, -Math.PI / 2 - a, -Math.PI / 2, false); ctx.stroke();
      D.text(ctx, `α = ${s.v.a}°`, cx - 80, cy - 60, { color: '#e67700', weight: 700 });
      D.text(ctx, `${MED[s.v.m1][0]} (n = ${r.n1})`, 12, 22, { weight: 700 }); D.text(ctx, `${MED[s.v.m2][0]} (n = ${r.n2})`, 12, h - 12, { weight: 700 });
      if (r.tir) D.text(ctx, '✨ სრული შინაგანი არეკვლა!', w - 12, 22, { align: 'right', weight: 700, color: '#c92a2a', bg: 'rgba(255,255,255,.85)' });
    },
    bridge: {
      vars: (s) => { const r = refr(s); return { incidence: s.v.a, refraction: r.tir ? -1 : r.b, critical: r.crit || 90, n1: r.n1, n2: r.n2 }; },
      writable: [],
      example: '// LED ანთდება სრული შინაგანი არეკვლისას (refraction = −1)\nif (refraction < 0) {\n  led(true);\n  alarm("სინათლე ვეღარ გადის!");\n} else {\n  led(false);\n}',
    },
    challenges: [
      { key: 'beta', title: 'სამიზნე გარდატეხის კუთხე', kind: 'state', params: [{ key: 'target', label: 'β (°)', value: 30 }],
        text: (p) => `ჰაერიდან მინაში (n = 1.5) სინათლე ისე დაუშვი, რომ გარდატეხის კუთხე იყოს ${p.target}° (±0.5°). რა არის α?`,
        check(s, p) { const r = refr(s); if (s.v.m1 !== 'air' || s.v.m2 !== 'glass') return { passed: false, message: 'აირჩიე: ჰაერი → მინა.' }; const ok = !r.tir && Math.abs(r.b - p.target) <= 0.5; return { passed: ok, message: ok ? `სწორია! α = ${s.v.a}° → β = ${f(r.b, 1)}°` : `β = ${f(r.b, 1)}°.` }; } },
      { key: 'tir', title: 'ოპტიკური ბოჭკო', kind: 'state', params: [],
        text: () => 'მიიღე სრული შინაგანი არეკვლა: სინათლე მინიდან ჰაერზე ისე უნდა დაეცეს, რომ საერთოდ ვერ გამოვიდეს. ასე მუშაობს ინტერნეტის ოპტიკური კაბელი!',
        check(s) { const r = refr(s), ok = r.tir; return { passed: ok, message: ok ? `სწორია! α = ${s.v.a}° > კრიტიკული ${f(r.crit, 1)}°.` : (r.crit ? `გაზარდე α — კრიტიკული კუთხე ${f(r.crit, 1)}°.` : 'სრული არეკვლისთვის n₁ > n₂ უნდა იყოს.') }; } },
      { key: 'rule-tir', title: 'კოდი: არეკვლის სენსორი', kind: 'rule', params: [],
        text: () => 'დაწერე წესი: LED ანთდეს, როცა incidence > critical (სრული არეკვლა), სხვა დროს ჩაქრეს.',
        vectors: () => [{ vars: { incidence: 60, critical: 41.8 }, expect: (o) => o.led === true, label: '60° > 41.8° → ჩართულია' }, { vars: { incidence: 30, critical: 41.8 }, expect: (o) => o.led !== true, label: '30° → ჩამქრალია' }, { vars: { incidence: 50, critical: 90 }, expect: (o) => o.led !== true, label: 'კრიტიკული არ არის → ჩამქრალია' }] },
    ],
  });

  /* ============ 2. არქიმედეს კანონი ============ */
  const LIQ = { water: ['წყალი', 1000], sea: ['ზღვის წყალი', 1025], oil: ['ზეთი', 800], mercury: ['ვერცხლისწყალი', 13600], honey: ['თაფლი', 1420] };
  const OBJ = { wood: ['ხე', 600], ice: ['ყინული', 917], plastic: ['პლასტმასი', 950], brick: ['აგური', 1800], iron: ['რკინა', 7870], gold: ['ოქრო', 19300], custom: ['საკუთარი', 0] };
  const rhoObj = (s) => (s.v.obj === 'custom' ? s.v.rho : OBJ[s.v.obj][1]);
  const buoy = (s) => {
    const ro = rhoObj(s), rl = LIQ[s.v.liq][1], V = s.v.V / 1000; // მ³ (ლ → მ³)
    const sub = Math.min(1, ro / rl), m = ro * V, Fg = m * 9.81, Fa = rl * 9.81 * V * sub;
    return { ro, rl, sub, m, Fg, Fa, floats: ro < rl, FaFull: rl * 9.81 * V };
  };
  S.register({
    key: 'buoyancy', subject: 'physics', title: 'არქიმედეს კანონი (ცურვა და ჩაძირვა)', icon: '⚓',
    summary: 'F = ρ·g·V — რატომ ცურავს გემი და იძირება ქვა?',
    animated: true, autoplay: true,
    vars: [
      { key: 'obj', label: 'სხეული', type: 'select', value: 'wood', options: Object.entries(OBJ).map(([k, [n, r]]) => [k, r ? `${n} (${r} კგ/მ³)` : n]) },
      { key: 'rho', label: 'საკუთარი სიმკვრივე', min: 100, max: 20000, step: 10, value: 1200, unit: 'კგ/მ³' },
      { key: 'liq', label: 'სითხე', type: 'select', value: 'water', options: Object.entries(LIQ).map(([k, [n, r]]) => [k, `${n} (${r} კგ/მ³)`]) },
      { key: 'V', label: 'სხეულის მოცულობა', min: 0.5, max: 10, step: 0.1, value: 2, unit: 'ლ' },
    ],
    presets: [{ label: 'ყინული წყალში', values: { obj: 'ice', liq: 'water' } }, { label: 'რკინა ვერცხლისწყალში', values: { obj: 'iron', liq: 'mercury' } }, { label: 'ოქრო წყალში', values: { obj: 'gold', liq: 'water' } }],
    create: () => ({}), reset(s) { s.y = 0; s.vy = 0; s.t = 0; },
    step(s, dt) { const b = buoy(s); const target = b.floats ? b.sub : 1.6; s.t += dt; s.vy += ((target - s.y) * 8 - s.vy * 4) * dt; s.y += s.vy * dt; },
    readouts(s) {
      const b = buoy(s);
      return [['სიმძიმის ძალა mg', f(b.Fg, 2) + ' ნ'], ['ამომგდები ძალა (სრულად ჩაძირვისას)', f(b.FaFull, 2) + ' ნ'], ['მდგომარეობა', b.floats ? `🛶 ცურავს (${f(b.sub * 100, 0)}% ჩაძირული)` : (b.ro === b.rl ? '⚖ ტივტივებს' : '⬇ იძირება')], ['მასა', f(b.m, 2) + ' კგ'], ['ρ სხეული / ρ სითხე', `${b.ro} / ${b.rl}`]];
    },
    draw(ctx, s, w, h) {
      const b = buoy(s); ctx.fillStyle = '#f8f9fa'; ctx.fillRect(0, 0, w, h);
      const tx = w * 0.15, tw = w * 0.5, top = h * 0.15, surf = h * 0.35, bot = h - 20;
      const lc = { water: 'rgba(116,192,252,.55)', sea: 'rgba(77,171,247,.6)', oil: 'rgba(252,196,25,.45)', mercury: 'rgba(173,181,189,.8)', honey: 'rgba(240,140,0,.55)' }[s.v.liq];
      ctx.fillStyle = lc; ctx.fillRect(tx, surf, tw, bot - surf);
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx, top); ctx.lineTo(tx, bot); ctx.lineTo(tx + tw, bot); ctx.lineTo(tx + tw, top); ctx.stroke();
      const sz = 30 + Math.cbrt(s.v.V) * 22, cx = tx + tw / 2;
      const yTop = Math.min(bot - sz, surf - sz + s.y * sz);
      const oc = { wood: '#a0522d', ice: '#e7f5ff', plastic: '#ff8787', brick: '#c92a2a', iron: '#495057', gold: '#fcc419', custom: '#7048e8' }[s.v.obj];
      ctx.fillStyle = oc; D.rrect(ctx, cx - sz / 2, yTop, sz, sz, 4); ctx.fill(); ctx.strokeStyle = '#343a40'; ctx.lineWidth = 1.5; D.rrect(ctx, cx - sz / 2, yTop, sz, sz, 4); ctx.stroke();
      const sc = 40 / Math.max(b.Fg, b.FaFull, 1);
      D.arrow(ctx, cx - 10, yTop + sz / 2, cx - 10, yTop + sz / 2 + b.Fg * sc + 8, '#c92a2a', 3);
      D.arrow(ctx, cx + 10, yTop + sz / 2, cx + 10, yTop + sz / 2 - (b.floats ? b.Fg : b.FaFull) * sc - 8, '#1c7ed6', 3);
      D.text(ctx, 'mg', cx - 32, yTop + sz / 2 + b.Fg * sc, { color: '#c92a2a', weight: 700 }); D.text(ctx, 'Fₐ', cx + 18, yTop + sz / 2 - 20, { color: '#1c7ed6', weight: 700 });
      // სიმკვრივის სკალა
      const gx = w * 0.72, gw = w * 0.22, gy = 20, gh = h - 50, lg = (r) => gy + gh - Math.log10(r / 100) / Math.log10(250) * gh;
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(gx, gy, gw * 0.3, gh);
      D.text(ctx, 'სიმკვრივე, კგ/მ³', gx, gy - 6, { size: 10, weight: 600 });
      [100, 1000, 10000].forEach((r) => D.text(ctx, String(r), gx + gw * 0.34, lg(r) + 4, { size: 9, color: '#868e96' }));
      ctx.fillStyle = '#1c7ed6'; ctx.fillRect(gx - 4, lg(b.rl) - 2, gw * 0.3 + 8, 4); D.text(ctx, LIQ[s.v.liq][0], gx + gw * 0.34, lg(b.rl) - 6, { size: 10, color: '#1864ab', weight: 700 });
      ctx.fillStyle = oc; D.dot(ctx, gx + gw * 0.15, lg(b.ro), 6, oc, '#343a40'); D.text(ctx, b.ro + '', gx + gw * 0.34, lg(b.ro) + 14, { size: 10, weight: 700 });
    },
    bridge: {
      vars: (s) => { const b = buoy(s); return { density: b.ro, liquid: b.rl, weight: b.Fg, buoyant: b.FaFull, floats: b.floats ? 1 : 0 }; },
      writable: [],
      example: '// LED ანთდება, თუ სხეული ცურავს\nif (density < liquid) {\n  led(true);\n  log("ცურავს");\n} else {\n  led(false);\n  log("იძირება");\n}',
    },
    challenges: [
      { key: 'half', title: 'ნახევრად ჩაძირული', kind: 'state', params: [],
        text: () => 'შეარჩიე „საკუთარი“ სხეულის სიმკვრივე ისე, რომ წყალში ზუსტად ნახევრად ჩაიძიროს (50% ±2%).',
        check(s) { const b = buoy(s), ok = s.v.liq === 'water' && b.floats && Math.abs(b.sub - 0.5) <= 0.02; return { passed: ok, message: ok ? `სწორია! ρ = ${b.ro} კგ/მ³ = ρწყალი/2.` : `ჩაძირულია ${f(b.sub * 100, 0)}%${s.v.liq !== 'water' ? ' — აირჩიე წყალი' : ''}.` }; } },
      { key: 'iron', title: 'ცურავს რკინა?', kind: 'state', params: [],
        text: () => 'იპოვე სითხე, რომელშიც რკინა არ იძირება.',
        check(s) { const b = buoy(s), ok = s.v.obj === 'iron' && b.floats; return { passed: ok, message: ok ? `სწორია! ${LIQ[s.v.liq][0]}: ${b.rl} > 7870 კგ/მ³.` : 'აირჩიე რკინა და სხვადასხვა სითხე.' }; } },
      { key: 'rule-float', title: 'კოდი: ცურავს თუ იძირება', kind: 'rule', params: [],
        text: () => 'დაწერე წესი: LED ანთდეს, როცა density < liquid (სხეული ცურავს).',
        vectors: () => [{ vars: { density: 600, liquid: 1000 }, expect: (o) => o.led === true, label: 'ხე წყალში → ჩართულია' }, { vars: { density: 7870, liquid: 1000 }, expect: (o) => o.led !== true, label: 'რკინა წყალში → ჩამქრალია' }, { vars: { density: 7870, liquid: 13600 }, expect: (o) => o.led === true, label: 'რკინა ვერცხლისწყალში → ჩართულია' }] },
    ],
  });

  /* ============ 3. თავისუფალი ვარდნა და ჰაერის წინაღობა ============ */
  const vterm = (s) => (s.v.cd > 0 ? Math.sqrt(2 * s.v.m * 9.81 / (1.225 * s.v.cd * s.v.A)) : Infinity);
  S.register({
    key: 'freefall', subject: 'physics', title: 'თავისუფალი ვარდნა და ჰაერის წინაღობა', icon: '🪂',
    summary: 'g = 9.81 მ/წ², ზღვრული სიჩქარე, პარაშუტი — ვაკუუმში ყველა სხეული თანაბრად ვარდება',
    animated: true, playLabel: '▶ ჩამოგდება',
    vars: [
      { key: 'h0', label: 'სიმაღლე', min: 10, max: 2000, step: 10, value: 300, unit: 'მ', reset: true },
      { key: 'm', label: 'მასა', min: 0.05, max: 100, step: 0.05, value: 80, unit: 'კგ', reset: true },
      { key: 'A', label: 'განივკვეთის ფართობი', min: 0.01, max: 30, step: 0.01, value: 0.7, unit: 'მ²', reset: true },
      { key: 'cd', label: 'წინაღობის კოეფიციენტი (0 = ვაკუუმი)', min: 0, max: 1.5, step: 0.05, value: 1, unit: '', reset: true },
    ],
    presets: [{ label: '🪂 პარაშუტისტი (გაშლილი)', values: { m: 80, A: 25, cd: 1.3 } }, { label: '🧍 თავისუფალი ვარდნა', values: { m: 80, A: 0.7, cd: 1 } }, { label: '🪶 ბუმბული', values: { m: 0.05, A: 0.02, cd: 1.2 } }, { label: '🌑 ვაკუუმი (მთვარე)', values: { cd: 0 } }],
    create: () => ({ hist: [] }), reset(s) { s.y = s.v.h0; s.v_ = 0; s.t = 0; s.hist = [[0, 0]]; s.done = false; },
    isDone: (s) => s.done,
    step(s, dt) {
      if (s.done) return; const n = Math.max(1, Math.ceil(dt / 0.005)), h = dt / n;
      for (let i = 0; i < n; i++) { const Fd = 0.5 * 1.225 * s.v.cd * s.v.A * s.v_ * s.v_; s.v_ += (9.81 - Fd / s.v.m) * h; s.y -= s.v_ * h; s.t += h; if (s.y <= 0) { s.y = 0; s.done = true; break; } }
      if (s.t - s.hist[s.hist.length - 1][0] > 0.1 || s.done) s.hist.push([s.t, s.v_]);
    },
    readouts(s) { const vt = vterm(s); return [['სიჩქარე', f(s.v_, 1) + ' მ/წ (' + f(s.v_ * 3.6, 0) + ' კმ/სთ)'], ['ზღვრული სიჩქარე', isFinite(vt) ? f(vt, 1) + ' მ/წ' : '∞ (ვაკუუმი)'], ['სიმაღლე', f(s.y, 0) + ' მ'], ['დრო', f(s.t, 1) + ' წმ']]; },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#e7f5ff'; ctx.fillRect(0, 0, w * 0.3, h); ctx.fillStyle = '#8ce99a'; ctx.fillRect(0, h - 14, w * 0.3, 14);
      const py = 16 + (1 - s.y / s.v.h0) * (h - 46);
      ctx.font = `${s.v.A > 5 ? 34 : 26}px system-ui`; ctx.textAlign = 'center'; ctx.fillText(s.v.A > 5 ? '🪂' : s.v.m < 1 ? '🪶' : '🧍', w * 0.15, py + 10);
      D.text(ctx, `${f(s.y, 0)} მ`, w * 0.15, h - 20, { align: 'center', weight: 700 });
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(w * 0.3, 0, w * 0.7, h);
      const vt = vterm(s), vmax = Math.max(10, isFinite(vt) ? vt * 1.2 : Math.sqrt(2 * 9.81 * s.v.h0) * 1.1), tmax = Math.max(5, s.t * 1.1, isFinite(vt) ? 4 * vt / 9.81 : Math.sqrt(2 * s.v.h0 / 9.81));
      const m = D.plot(ctx, w * 0.3 + 10, 12, w * 0.7 - 20, h - 40, { xmin: 0, xmax: tmax, ymin: 0, ymax: vmax }, { xLabel: 't, წმ', yLabel: 'v, მ/წ' });
      D.fn(ctx, m, (t) => 9.81 * t, 0, tmax, 'rgba(134,142,150,.6)', 1.5, [5, 4]);
      if (isFinite(vt)) { ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#e03131'; ctx.beginPath(); ctx.moveTo(m.X(0), m.Y(vt)); ctx.lineTo(m.X(tmax), m.Y(vt)); ctx.stroke(); ctx.restore(); D.text(ctx, 'ზღვრული სიჩქარე', m.X(tmax) - 4, m.Y(vt) - 5, { align: 'right', color: '#c92a2a', size: 10 }); }
      ctx.strokeStyle = '#1c7ed6'; ctx.lineWidth = 3; ctx.beginPath(); s.hist.concat([[s.t, s.v_]]).forEach(([t, v], i) => (i ? ctx.lineTo(m.X(t), m.Y(v)) : ctx.moveTo(m.X(t), m.Y(v)))); ctx.stroke();
      D.text(ctx, '- - ვაკუუმში (v = g·t)', w * 0.3 + 20, 30, { color: '#868e96', size: 10, bg: 'rgba(255,255,255,.8)' });
    },
    bridge: {
      vars: (s) => ({ height: s.y, speed: s.v_, time: s.t, terminal: isFinite(vterm(s)) ? vterm(s) : 9999 }),
      writable: [],
      example: '// საფრთხის სიგნალი: პარაშუტის გაშლის სიმაღლე\nif (height < 150 && speed > 20) {\n  alarm("გაშალე პარაშუტი!");\n  led(true);\n} else {\n  led(false);\n}',
    },
    challenges: [
      { key: 'safe', title: 'უსაფრთხო დაშვება', kind: 'state', params: [{ key: 'v', label: 'მაქს. სიჩქარე (მ/წ)', value: 6 }],
        text: (p) => `80 კგ მასის პარაშუტისტისთვის შეარჩიე პარაშუტის ფართობი, რომ ზღვრული სიჩქარე ≤ ${p.v} მ/წ იყოს (cd = 1.3).`,
        check(s, p) { const vt = vterm(s), ok = s.v.m === 80 && Math.abs(s.v.cd - 1.3) < 0.01 && vt <= p.v; return { passed: ok, message: ok ? `სწორია! A = ${s.v.A} მ², vₜ = ${f(vt, 1)} მ/წ` : `vₜ = ${isFinite(vt) ? f(vt, 1) : '∞'} მ/წ (m = ${s.v.m}, cd = ${s.v.cd}).` }; } },
      { key: 'vacuum', title: 'გალილეის ექსპერიმენტი', kind: 'state', params: [],
        text: () => 'ვაკუუმში (cd = 0) ბუმბული და ჩაქუჩი ერთად ვარდება. დააყენე ვაკუუმი, 100 მ სიმაღლე და ჩამოაგდე — რამდენ წამში დაეცა? (ზუსტად √(2h/g) ≈ 4.5 წმ)',
        check(s) { const ok = s.v.cd === 0 && s.v.h0 === 100 && s.done; return { passed: ok, message: ok ? `სწორია! t = ${f(s.t, 2)} წმ — მასას მნიშვნელობა არ აქვს.` : (s.done ? 'დააყენე cd = 0 და h = 100 მ, შემდეგ ჩამოაგდე.' : 'დააჭირე „ჩამოგდება“ და დაელოდე დაცემას.') }; } },
      { key: 'rule-chute', title: 'კოდი: ავტომატური პარაშუტი', kind: 'rule', params: [{ key: 'h', label: 'გაშლის სიმაღლე (მ)', value: 150 }],
        text: (p) => `დაწერე წესი: თუ height < ${p.h} და speed > 20 → alarm("…") და LED ჩართე; სხვა დროს LED ჩამქრალია.`,
        vectors: (p) => [{ vars: { height: p.h - 50, speed: 45 }, expect: (o) => !!o.alarm && o.led === true, label: 'დაბლა და სწრაფად → alarm + LED' }, { vars: { height: p.h + 500, speed: 45 }, expect: (o) => !o.alarm && o.led !== true, label: 'მაღლა → ჯერ არა' }, { vars: { height: 50, speed: 5 }, expect: (o) => !o.alarm, label: 'ნელა (პარაშუტი გაშლილია) → არა' }] },
    ],
  });

  /* ============ 4. დოპლერის ეფექტი ============ */
  const C_SND = 343;
  S.register({
    key: 'doppler', subject: 'physics', title: 'დოპლერის ეფექტი (ხმა)', icon: '🚑',
    summary: 'მოახლოებისას ხმა მაღალია, დაშორებისას — დაბალი: f′ = f·c/(c ∓ v)',
    animated: true, autoplay: true,
    vars: [
      { key: 'f0', label: 'სირენის სიხშირე', min: 200, max: 2000, step: 10, value: 700, unit: 'ჰც' },
      { key: 'vs', label: 'წყაროს სიჩქარე', min: 0, max: 400, step: 1, value: 30, unit: 'მ/წ', reset: true },
    ],
    presets: [{ label: '🚑 სასწრაფო (30 მ/წ)', values: { vs: 30 } }, { label: '🏎 ფორმულა 1 (90 მ/წ)', values: { vs: 90 } }, { label: '✈ ბგერის სიჩქარე (343)', values: { vs: 343 } }],
    create: () => ({ waves: [] }), reset(s) { s.x = -0.45; s.t = 0; s.waves = []; s.emit = 0; },
    step(s, dt) {
      const sp = s.v.vs / C_SND * 0.25; s.t += dt; s.x += sp * dt; if (s.x > 0.55) { s.x = -0.45; s.waves = []; }
      s.emit += dt; if (s.emit > 0.12) { s.emit = 0; s.waves.push({ x: s.x, t: s.t }); if (s.waves.length > 30) s.waves.shift(); }
    },
    readouts(s) {
      const ap = s.v.vs < C_SND ? s.v.f0 * C_SND / (C_SND - s.v.vs) : Infinity, rc = s.v.f0 * C_SND / (C_SND + s.v.vs);
      return [['მოახლოებისას', isFinite(ap) ? f(ap, 0) + ' ჰც' : '∞ — ბგერითი ბარიერი!'], ['დაშორებისას', f(rc, 0) + ' ჰც'], ['მახის რიცხვი', f(s.v.vs / C_SND, 2)], ['ბგერის სიჩქარე', C_SND + ' მ/წ']];
    },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(0, 0, w, h);
      const cy = h * 0.45, X = (x) => w / 2 + x * w, rs = w * 0.25 * 1.0;
      s.waves.forEach((wv) => { const r = (s.t - wv.t) * rs; ctx.strokeStyle = `rgba(28,126,214,${Math.max(0, 1 - r / (w * 0.7))})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(wv.x), cy, r, 0, Math.PI * 2); ctx.stroke(); });
      ctx.font = '30px system-ui'; ctx.textAlign = 'center'; ctx.fillText('🚑', X(s.x), cy + 10);
      ctx.font = '24px system-ui'; ctx.fillText('🧍', w * 0.88, cy + 60); ctx.fillText('🧍', w * 0.12, cy + 60);
      const ap = s.v.vs < C_SND ? s.v.f0 * C_SND / (C_SND - s.v.vs) : Infinity, rc = s.v.f0 * C_SND / (C_SND + s.v.vs);
      D.text(ctx, isFinite(ap) ? `${f(ap, 0)} ჰც ↑` : 'ბუმ! 💥', w * 0.88, cy + 90, { align: 'center', weight: 700, color: '#c92a2a' });
      D.text(ctx, `${f(rc, 0)} ჰც ↓`, w * 0.12, cy + 90, { align: 'center', weight: 700, color: '#1864ab' });
      D.text(ctx, `წყარო: ${s.v.f0} ჰც, ${s.v.vs} მ/წ`, 12, 22, { weight: 700 });
    },
    bridge: {
      vars: (s) => ({ speed: s.v.vs, frequency: s.v.f0, approaching: s.v.vs < C_SND ? s.v.f0 * C_SND / (C_SND - s.v.vs) : 99999, receding: s.v.f0 * C_SND / (C_SND + s.v.vs), mach: s.v.vs / C_SND }),
      writable: [],
      example: '// ბგერითი ბარიერის გამაფრთხილებელი\nif (mach >= 1) {\n  alarm("ზებგერითი სიჩქარე!");\n  led(true);\n} else {\n  led(false);\n}',
    },
    challenges: [
      { key: 'shift', title: 'ხმის შეცვლა', kind: 'state', params: [{ key: 'target', label: 'მოახლოებისას (ჰც)', value: 800 }],
        text: (p) => `700 ჰც სირენის სიხშირით შეარჩიე სიჩქარე, რომ მოახლოებისას გაიგო ${p.target} ჰც (±5).`,
        check(s, p) { const ap = s.v.vs < C_SND ? s.v.f0 * C_SND / (C_SND - s.v.vs) : Infinity, ok = s.v.f0 === 700 && Math.abs(ap - p.target) <= 5; return { passed: ok, message: ok ? `სწორია! v = ${s.v.vs} მ/წ` : `მოახლოებისას: ${isFinite(ap) ? f(ap, 0) : '∞'} ჰც.` }; } },
      { key: 'rule-mach', title: 'კოდი: ზებგერითი სიჩქარე', kind: 'rule', params: [],
        text: () => 'დაწერე წესი: თუ mach ≥ 1 → alarm("…") და LED ჩართე, სხვა დროს LED ჩამქრალია.',
        vectors: () => [{ vars: { mach: 1.2 }, expect: (o) => !!o.alarm && o.led === true, label: 'mach 1.2 → alarm + LED' }, { vars: { mach: 1 }, expect: (o) => !!o.alarm, label: 'mach 1.0 → alarm (≥)' }, { vars: { mach: 0.3 }, expect: (o) => !o.alarm && o.led !== true, label: 'mach 0.3 → არაფერი' }] },
    ],
  });
})(window.VL);
