/* ============================================================
 * stem/sims/physics4.js — ფიზიკა: მოძრაობის გრაფიკები · დახრილი სიბრტყე
 * იმპულსი და დაჯახებები · რეზისტორების შეერთება
 * ============================================================ */
(function (VL) {
  'use strict';
  const S = VL.STEM, D = S.draw, f = S.fmt;
  const R = Math.PI / 180;

  /* ============ 1. მოძრაობის გრაფიკები ============ */
  S.register({
    key: 'kinematics', subject: 'physics', title: 'მოძრაობის გრაფიკები (s–t, v–t)', icon: '🚗',
    summary: 'თანაბარი და თანაბარაჩქარებული მოძრაობა: x = x₀ + v₀t + at²/2',
    animated: true, playLabel: '▶ მოძრაობა',
    vars: [
      { key: 'x0', label: 'საწყისი კოორდინატი x₀', min: -50, max: 50, step: 1, value: 0, unit: 'მ', reset: true },
      { key: 'v0', label: 'საწყისი სიჩქარე v₀', min: -20, max: 20, step: 0.5, value: 2, unit: 'მ/წ', reset: true },
      { key: 'a', label: 'აჩქარება a', min: -5, max: 5, step: 0.1, value: 1, unit: 'მ/წ²', reset: true },
    ],
    presets: [{ label: 'თანაბარი (a = 0)', values: { a: 0, v0: 5 } }, { label: 'გაქანება ადგილიდან', values: { v0: 0, a: 2 } }, { label: 'დამუხრუჭება', values: { v0: 15, a: -3 } }],
    create: () => ({}), reset(s) { s.t = 0; s.done = false; }, isDone: (s) => s.done,
    step(s, dt) { s.t += dt; if (s.t >= 10) { s.t = 10; s.done = true; } },
    readouts(s) {
      const t = s.t, x = s.v.x0 + s.v.v0 * t + s.v.a * t * t / 2, v = s.v.v0 + s.v.a * t;
      return [['დრო t', f(t, 2) + ' წმ'], ['კოორდინატი x', f(x, 2) + ' მ'], ['სიჩქარე v', f(v, 2) + ' მ/წ'], ['გავლილი გზა', f(Math.abs(x - s.v.x0), 1) + ' მ (გადაადგილება)'], ['მოძრაობა', s.v.a === 0 ? 'თანაბარი' : (v * s.v.a > 0 ? 'აჩქარებული' : 'შენელებული')]];
    },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(0, 0, w, h);
      const x = (t) => s.v.x0 + s.v.v0 * t + s.v.a * t * t / 2, v = (t) => s.v.v0 + s.v.a * t;
      // გზა
      const xr = 150, ry = 34, X = (xx) => 20 + (xx + xr) / (2 * xr) * (w - 40);
      ctx.fillStyle = '#495057'; ctx.fillRect(10, ry, w - 20, 16);
      for (let k = -xr; k <= xr; k += 25) { ctx.fillStyle = '#fff'; ctx.fillRect(X(k) - 6, ry + 7, 12, 2); D.text(ctx, String(k), X(k), ry + 30, { align: 'center', size: 9, color: '#868e96' }); }
      ctx.font = '22px system-ui'; ctx.textAlign = 'center'; ctx.save(); ctx.translate(X(Math.max(-xr, Math.min(xr, x(s.t)))), ry + 6); if (v(s.t) < 0) ctx.scale(-1, 1); ctx.fillText('🚗', 0, 0); ctx.restore();
      const gy = 70, gh = (h - gy - 20) / 2 - 8, gw = w - 20;
      const xs = []; for (let t = 0; t <= 10; t += 0.5) xs.push(x(t));
      const m1 = D.plot(ctx, 10, gy, gw, gh, { xmin: 0, xmax: 10, ymin: Math.min(-5, ...xs) * 1.1, ymax: Math.max(5, ...xs) * 1.1 }, { xLabel: 't, წმ', yLabel: 'x, მ', stepX: 1 });
      D.fn(ctx, m1, x, 0, 10, 'rgba(28,126,214,.25)', 2); D.fn(ctx, m1, x, 0, s.t, '#1c7ed6', 3); D.dot(ctx, m1.X(s.t), m1.Y(x(s.t)), 5, '#1c7ed6');
      const vs = [v(0), v(10)];
      const m2 = D.plot(ctx, 10, gy + gh + 16, gw, gh, { xmin: 0, xmax: 10, ymin: Math.min(-5, ...vs) * 1.15, ymax: Math.max(5, ...vs) * 1.15 }, { xLabel: 't, წმ', yLabel: 'v, მ/წ', stepX: 1 });
      ctx.fillStyle = 'rgba(232,89,12,.15)'; ctx.beginPath(); ctx.moveTo(m2.X(0), m2.Y(0)); for (let t = 0; t <= s.t + 1e-9; t += 0.05) ctx.lineTo(m2.X(t), m2.Y(v(t))); ctx.lineTo(m2.X(s.t), m2.Y(0)); ctx.closePath(); ctx.fill();
      D.fn(ctx, m2, v, 0, 10, '#e8590c', 3); D.dot(ctx, m2.X(s.t), m2.Y(v(s.t)), 5, '#e8590c');
      D.text(ctx, 'ფართობი v–t გრაფიკის ქვეშ = გადაადგილება', gw - 4, gy + gh + 34, { align: 'right', size: 10, color: '#d9480f' });
    },
    bridge: {
      vars: (s) => ({ time: s.t, x: s.v.x0 + s.v.v0 * s.t + s.v.a * s.t * s.t / 2, v: s.v.v0 + s.v.a * s.t, a: s.v.a }),
      writable: [],
      example: '// LED ანთდება, როცა მანქანა ჩერდება და უკან იწყებს მოძრაობას\nif (v <= 0) {\n  led(true);\n  log("გაჩერება! t = " + time.toFixed(1));\n} else {\n  led(false);\n}',
    },
    challenges: [
      { key: 'stop', title: 'გაჩერება 5 წამში', kind: 'state', params: [{ key: 't', label: 'გაჩერების დრო (წმ)', value: 5 }],
        text: (p) => `v₀ = 10 მ/წ-ზე შეარჩიე აჩქარება ისე, რომ მანქანა ზუსტად ${p.t} წამში გაჩერდეს. რა არის დამუხრუჭების მანძილი?`,
        check(s, p) { const ok = s.v.v0 === 10 && Math.abs(s.v.v0 + s.v.a * p.t) < 0.06; return { passed: ok, message: ok ? `სწორია! a = ${s.v.a} მ/წ², მანძილი = ${f(10 * p.t / 2, 1)} მ` : `v(${p.t}) = ${f(s.v.v0 + s.v.a * p.t, 2)} მ/წ (v₀ = ${s.v.v0}).` }; } },
      { key: 'meet', title: '100 მეტრი 10 წამში', kind: 'state', params: [],
        text: () => 'ადგილიდან (x₀ = 0, v₀ = 0) შეარჩიე აჩქარება, რომ მანქანამ 10 წამში 100 მ გაიაროს. x = at²/2.',
        check(s) { const x = s.v.x0 + s.v.v0 * 10 + s.v.a * 50, ok = s.v.x0 === 0 && s.v.v0 === 0 && Math.abs(x - 100) < 0.6; return { passed: ok, message: ok ? 'სწორია! a = 2 მ/წ².' : `10 წამში x = ${f(x, 1)} მ.` }; } },
      { key: 'rule-stop', title: 'კოდი: გაჩერების დეტექტორი', kind: 'rule', params: [],
        text: () => 'დაწერე წესი: LED ანთდეს, როცა v ≤ 0, სხვა დროს ჩაქრეს.',
        vectors: () => [{ vars: { v: 3 }, expect: (o) => o.led !== true, label: 'v = 3 → ჩამქრალია' }, { vars: { v: 0 }, expect: (o) => o.led === true, label: 'v = 0 → ჩართულია' }, { vars: { v: -2 }, expect: (o) => o.led === true, label: 'v = −2 → ჩართულია' }] },
    ],
  });

  /* ============ 2. დახრილი სიბრტყე ============ */
  const inc = (s) => {
    const g = 9.81, a = s.v.ang * R, m = s.v.m, P = m * g, N = P * Math.cos(a), Fp = P * Math.sin(a), Fmax = s.v.mu * N;
    const net = Fp + s.v.F - (Math.abs(Fp + s.v.F) > Fmax ? Math.sign(Fp + s.v.F) * Fmax : (Fp + s.v.F));
    return { P, N, Fp, Fmax, acc: net / m, slides: Math.abs(Fp + s.v.F) > Fmax };
  };
  S.register({
    key: 'incline', subject: 'physics', title: 'დახრილი სიბრტყე და ხახუნი', icon: '🛷',
    summary: 'ნიუტონის კანონები: სიმძიმე, საყრდენის რეაქცია, ხახუნი და აჩქარება',
    animated: true, playLabel: '▶ გაშვება',
    vars: [
      { key: 'ang', label: 'დახრის კუთხე α', min: 0, max: 60, step: 0.5, value: 30, unit: '°', reset: true },
      { key: 'm', label: 'მასა m', min: 0.5, max: 20, step: 0.5, value: 5, unit: 'კგ', reset: true },
      { key: 'mu', label: 'ხახუნის კოეფიციენტი μ', min: 0, max: 1, step: 0.01, value: 0.3, unit: '', reset: true },
      { key: 'F', label: 'დამატებითი ძალა (ქვემოთ +)', min: -100, max: 100, step: 1, value: 0, unit: 'ნ', reset: true },
    ],
    presets: [{ label: 'ყინული (μ = 0.03)', values: { mu: 0.03 } }, { label: 'ხე ხეზე (μ = 0.4)', values: { mu: 0.4 } }, { label: 'რეზინა ასფალტზე (μ = 0.8)', values: { mu: 0.8 } }],
    create: () => ({}), reset(s) { s.d = 0; s.vel = 0; s.t = 0; s.done = false; }, isDone: (s) => s.done,
    step(s, dt) { const r = inc(s); s.t += dt; s.vel += r.acc * dt; s.d += s.vel * dt; if (Math.abs(s.d) > 5 || s.t > 15) s.done = true; },
    readouts(s) { const r = inc(s); return [['სიმძიმის ძალა mg', f(r.P, 1) + ' ნ'], ['საყრდენის რეაქცია N = mg·cosα', f(r.N, 1) + ' ნ'], ['გორების მდგენელი mg·sinα', f(r.Fp, 1) + ' ნ'], ['მაქს. ხახუნი μN', f(r.Fmax, 1) + ' ნ'], ['აჩქარება', f(r.acc, 2) + ' მ/წ²'], ['მდგომარეობა', r.slides ? 'სრიალებს' : 'უძრავია']]; },
    draw(ctx, s, w, h) {
      const r = inc(s); ctx.fillStyle = '#f8f9fa'; ctx.fillRect(0, 0, w, h);
      const a = s.v.ang * R, L = Math.min(w * 0.75, (h - 50) / Math.max(0.2, Math.sin(a)) * 0.9), x0 = w * 0.1, y0 = h - 30;
      const tx = x0 + L * Math.cos(a), ty = y0 - L * Math.sin(a);
      ctx.fillStyle = '#ced4da'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + L * Math.cos(a), y0); ctx.lineTo(tx, ty); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.stroke();
      D.text(ctx, `α = ${s.v.ang}°`, x0 + 40, y0 - 8, { weight: 700, color: '#e67700' });
      const pos = 0.75 - s.d / 5 * 0.6, cx = x0 + L * pos * Math.cos(a), cy = y0 - L * pos * Math.sin(a);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-a); ctx.fillStyle = '#7048e8'; D.rrect(ctx, -24, -36, 48, 36, 5); ctx.fill(); ctx.restore();
      const bx = cx - 18 * Math.sin(a), by = cy - 18 * Math.cos(a), k = 50 / Math.max(r.P, 1);
      D.arrow(ctx, bx, by, bx, by + r.P * k, '#c92a2a', 3); D.text(ctx, 'mg', bx + 6, by + r.P * k, { color: '#c92a2a', weight: 700 });
      D.arrow(ctx, bx, by, bx + r.N * k * Math.sin(a), by - r.N * k * Math.cos(a), '#1c7ed6', 3); D.text(ctx, 'N', bx + r.N * k * Math.sin(a) + 4, by - r.N * k * Math.cos(a), { color: '#1864ab', weight: 700 });
      const fr = r.slides ? r.Fmax : Math.abs(r.Fp + s.v.F), dir = (r.Fp + s.v.F) >= 0 ? 1 : -1;
      if (fr > 0.01) { D.arrow(ctx, bx, by, bx + dir * fr * k * Math.cos(a), by - dir * fr * k * Math.sin(a), '#2f9e44', 3); D.text(ctx, 'F_ხ', bx + dir * fr * k * Math.cos(a) + 4, by - dir * fr * k * Math.sin(a) - 4, { color: '#2b8a3e', weight: 700 }); }
      D.text(ctx, r.slides ? `a = ${f(r.acc, 2)} მ/წ²` : 'წონასწორობა (უძრავი ხახუნი)', w - 12, 24, { align: 'right', weight: 700, size: 14 });
    },
    bridge: { vars: (s) => { const r = inc(s); return { angle: s.v.ang, acceleration: r.acc, friction: r.Fmax, gravityAlong: r.Fp, mu: s.v.mu }; }, writable: [],
      example: '// LED ანთდება, როცა სხეული სრიალებს\nif (gravityAlong > friction) {\n  led(true);\n} else {\n  led(false);\n}' },
    challenges: [
      { key: 'critical', title: 'კრიტიკული კუთხე', kind: 'state', params: [{ key: 'mu', label: 'μ', value: 0.5 }],
        text: (p) => `μ = ${p.mu}-ზე იპოვე უდიდესი კუთხე, როცა სხეული ჯერ კიდევ უძრავია (tg α = μ, ±0.5°).`,
        check(s, p) { const ac = Math.atan(p.mu) / R, ok = Math.abs(s.v.mu - p.mu) < 0.005 && s.v.F === 0 && Math.abs(s.v.ang - ac) <= 0.5; return { passed: ok, message: ok ? `სწორია! α ≈ ${f(ac, 1)}° (tg α = μ).` : `კრიტიკული კუთხე ≈ ${f(ac, 1)}°, შენ: ${s.v.ang}° (μ = ${s.v.mu}).` }; } },
      { key: 'push', title: 'შეაჩერე ძალით', kind: 'state', params: [],
        text: () => 'ყინულზე (μ = 0.03), 30° კუთხით, 5 კგ სხეული სრიალებს. შეარჩიე ძალა (უარყოფითი = ზემოთ), რომ სხეული უძრავი დარჩეს.',
        check(s) { const r = inc(s), ok = Math.abs(s.v.mu - 0.03) < 0.005 && s.v.ang === 30 && s.v.m === 5 && !r.slides; return { passed: ok, message: ok ? `სწორია! F = ${s.v.F} ნ ზემოთ აკავებს.` : `${r.slides ? 'ჯერ სრიალებს' : 'დააყენე პირობები'}: μ = 0.03, α = 30°, m = 5.` }; } },
      { key: 'rule-slide', title: 'კოდი: სრიალის სენსორი', kind: 'rule', params: [],
        text: () => 'დაწერე წესი: LED ანთდეს, როცა gravityAlong > friction.',
        vectors: () => [{ vars: { gravityAlong: 25, friction: 12 }, expect: (o) => o.led === true, label: '25 > 12 → ჩართულია' }, { vars: { gravityAlong: 10, friction: 15 }, expect: (o) => o.led !== true, label: '10 < 15 → ჩამქრალია' }] },
    ],
  });

  /* ============ 3. იმპულსი და დაჯახებები ============ */
  S.register({
    key: 'collisions', subject: 'physics', title: 'იმპულსი და დაჯახებები', icon: '🎱',
    summary: 'p = mv, იმპულსის მუდმივობა: დრეკადი და არადრეკადი დაჯახება',
    animated: true, playLabel: '▶ დაჯახება',
    vars: [
      { key: 'm1', label: 'მასა m₁', min: 0.5, max: 10, step: 0.5, value: 2, unit: 'კგ', reset: true },
      { key: 'v1', label: 'სიჩქარე v₁', min: -10, max: 10, step: 0.5, value: 4, unit: 'მ/წ', reset: true },
      { key: 'm2', label: 'მასა m₂', min: 0.5, max: 10, step: 0.5, value: 1, unit: 'კგ', reset: true },
      { key: 'v2', label: 'სიჩქარე v₂', min: -10, max: 10, step: 0.5, value: 0, unit: 'მ/წ', reset: true },
      { key: 'e', label: 'დრეკადობა (1 = დრეკადი, 0 = მიწებება)', min: 0, max: 1, step: 0.05, value: 1, unit: '', reset: true },
    ],
    presets: [{ label: 'დრეკადი', values: { e: 1 } }, { label: 'არადრეკადი (მიწებება)', values: { e: 0 } }, { label: 'ტოლი მასები', values: { m1: 2, m2: 2, v2: 0, e: 1 } }],
    create: () => ({}),
    reset(s) { s.x1 = -3; s.x2 = 1; s.u1 = s.v.v1; s.u2 = s.v.v2; s.hit = false; s.t = 0; s.done = false; },
    isDone: (s) => s.done,
    step(s, dt) {
      s.t += dt; s.x1 += s.u1 * dt * 0.5; s.x2 += s.u2 * dt * 0.5;
      const r1 = 0.3 + s.v.m1 * 0.04, r2 = 0.3 + s.v.m2 * 0.04;
      if (!s.hit && s.x2 - s.x1 <= r1 + r2 && s.u1 > s.u2) {
        const { m1, m2, e } = s.v, u1 = s.u1, u2 = s.u2, P = m1 * u1 + m2 * u2;
        s.u1 = (P + m2 * e * (u2 - u1)) / (m1 + m2); s.u2 = (P + m1 * e * (u1 - u2)) / (m1 + m2); s.hit = true;
      }
      if (s.t > 12 || Math.abs(s.x1) > 8 || Math.abs(s.x2) > 8) s.done = true;
    },
    readouts(s) {
      const p = s.v.m1 * s.u1 + s.v.m2 * s.u2, E = 0.5 * s.v.m1 * s.u1 ** 2 + 0.5 * s.v.m2 * s.u2 ** 2, E0 = 0.5 * s.v.m1 * s.v.v1 ** 2 + 0.5 * s.v.m2 * s.v.v2 ** 2;
      return [['სრული იმპულსი p', f(p, 2) + ' კგ·მ/წ'], ['კინეტიკური ენერგია', `${f(E, 2)} ჯ (თავიდან ${f(E0, 2)})`], ['სიჩქარეები', `${f(s.u1, 2)} / ${f(s.u2, 2)} მ/წ`], ['დაჯახება', s.hit ? '✓ მოხდა' : 'ჯერ არა']];
    },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(0, 0, w, h);
      const cy = h * 0.45, X = (x) => w / 2 + x * w / 14, k = w / 14;
      ctx.fillStyle = '#dee2e6'; ctx.fillRect(0, cy + 40, w, 6);
      const r1 = (0.3 + s.v.m1 * 0.04) * k, r2 = (0.3 + s.v.m2 * 0.04) * k;
      D.dot(ctx, X(s.x1), cy + 40 - r1, r1, '#4263eb', '#364fc7'); D.dot(ctx, X(s.x2), cy + 40 - r2, r2, '#e8590c', '#d9480f');
      D.text(ctx, `${s.v.m1} კგ`, X(s.x1), cy + 44 - r1, { align: 'center', color: '#fff', weight: 700, size: 11 }); D.text(ctx, `${s.v.m2} კგ`, X(s.x2), cy + 44 - r2, { align: 'center', color: '#fff', weight: 700, size: 11 });
      if (Math.abs(s.u1) > 0.05) D.arrow(ctx, X(s.x1), cy - r1 * 2 + 30, X(s.x1) + s.u1 * 10, cy - r1 * 2 + 30, '#364fc7', 2.5);
      if (Math.abs(s.u2) > 0.05) D.arrow(ctx, X(s.x2), cy - r2 * 2 + 30, X(s.x2) + s.u2 * 10, cy - r2 * 2 + 30, '#d9480f', 2.5);
      // იმპულსის სვეტები
      const p1 = s.v.m1 * s.u1, p2 = s.v.m2 * s.u2, bx = 20, by = h - 26, sc = 3;
      ctx.fillStyle = '#4263eb'; ctx.fillRect(w / 2, by - 30, p1 * sc, 10); ctx.fillStyle = '#e8590c'; ctx.fillRect(w / 2 + p1 * sc, by - 18, p2 * sc, 10);
      ctx.fillStyle = '#212529'; ctx.fillRect(w / 2, by - 6, (p1 + p2) * sc, 6);
      D.text(ctx, `p₁ + p₂ = ${f(p1 + p2, 1)} კგ·მ/წ (მუდმივია!)`, bx, by + 14, { weight: 700, size: 11 });
    },
    bridge: { vars: (s) => ({ p: s.v.m1 * s.u1 + s.v.m2 * s.u2, v1: s.u1, v2: s.u2, energy: 0.5 * s.v.m1 * s.u1 ** 2 + 0.5 * s.v.m2 * s.u2 ** 2 }), writable: [],
      example: '// LED ანთდება, როცა მეორე ბურთი მოძრაობას იწყებს\nif (v2 > 0.1) {\n  led(true);\n  log("v₂ = " + v2.toFixed(2));\n} else {\n  led(false);\n}' },
    challenges: [
      { key: 'newton', title: 'ნიუტონის ქანქარა', kind: 'state', params: [],
        text: () => 'შეარჩიე პარამეტრები ისე, რომ დრეკადი დაჯახების შემდეგ პირველი ბურთი სრულად გაჩერდეს, მეორე კი მისი სიჩქარით წავიდეს (v₂ თავიდან 0). გაუშვი!',
        check(s) { const ok = s.v.e === 1 && s.v.m1 === s.v.m2 && s.v.v2 === 0 && s.v.v1 > 0 && s.hit && Math.abs(s.u1) < 0.01; return { passed: ok, message: ok ? 'სწორია! ტოლი მასების დრეკადი დაჯახებისას სიჩქარეები იცვლება.' : 'საჭიროა: e = 1, m₁ = m₂, v₂ = 0, და დაჯახება (▶).' }; } },
      { key: 'stick', title: 'მიწებება', kind: 'state', params: [],
        text: () => 'არადრეკად დაჯახებაში (e = 0) m₁ = 3 კგ, v₁ = 4 მ/წ ეჯახება უძრავ m₂ = 1 კგ-ს. გაუშვი და შეამოწმე u = (m₁v₁)/(m₁+m₂) = 3 მ/წ.',
        check(s) { const ok = s.v.e === 0 && s.v.m1 === 3 && s.v.v1 === 4 && s.v.m2 === 1 && s.v.v2 === 0 && s.hit; return { passed: ok, message: ok ? `სწორია! საერთო სიჩქარე ${f(s.u1, 2)} მ/წ. ენერგიის ნაწილი სითბოდ იქცა.` : 'დააყენე პირობები და გაუშვი დაჯახება.' }; } },
      { key: 'rule-move', title: 'კოდი: მოძრაობის სენსორი', kind: 'rule', params: [],
        text: () => 'დაწერე წესი: LED ანთდეს, როცა v2 > 0.1.',
        vectors: () => [{ vars: { v2: 2 }, expect: (o) => o.led === true, label: 'v₂ = 2 → ჩართულია' }, { vars: { v2: 0 }, expect: (o) => o.led !== true, label: 'v₂ = 0 → ჩამქრალია' }] },
    ],
  });

  /* ============ 4. რეზისტორების შეერთება ============ */
  const rTot = (s) => { const r = [s.v.r1, s.v.r2, s.v.r3]; return s.v.mode === 'series' ? r[0] + r[1] + r[2] : s.v.mode === 'parallel' ? 1 / (1 / r[0] + 1 / r[1] + 1 / r[2]) : r[0] + 1 / (1 / r[1] + 1 / r[2]); };
  S.register({
    key: 'resistors', subject: 'physics', title: 'რეზისტორების მიმდევრობითი და პარალელური შეერთება', icon: '🧮',
    summary: 'R = R₁ + R₂ + R₃ და 1/R = 1/R₁ + 1/R₂ + 1/R₃ — დენები და ძაბვები',
    animated: true, autoplay: true,
    vars: [
      { key: 'mode', label: 'შეერთება', type: 'select', value: 'series', options: [['series', 'მიმდევრობითი'], ['parallel', 'პარალელური'], ['mixed', 'შერეული: R₁ + (R₂ ∥ R₃)']] },
      { key: 'U', label: 'ძაბვა U', min: 1, max: 24, step: 0.5, value: 12, unit: 'ვ' },
      { key: 'r1', label: 'R₁', min: 1, max: 100, step: 1, value: 10, unit: 'Ω' },
      { key: 'r2', label: 'R₂', min: 1, max: 100, step: 1, value: 20, unit: 'Ω' },
      { key: 'r3', label: 'R₃', min: 1, max: 100, step: 1, value: 30, unit: 'Ω' },
    ],
    presets: [{ label: 'ტოლი რეზისტორები', values: { r1: 30, r2: 30, r3: 30 } }],
    create: () => ({ ph: 0 }), reset(s) { s.t = 0; s.ph = 0; }, step(s, dt) { s.t += dt; s.ph = (s.ph + dt * s.v.U / rTot(s) * 0.4) % 1; },
    readouts(s) {
      const R = rTot(s), I = s.v.U / R; const r = [s.v.r1, s.v.r2, s.v.r3];
      let Is, Us;
      if (s.v.mode === 'series') { Is = [I, I, I]; Us = r.map((x) => I * x); }
      else if (s.v.mode === 'parallel') { Us = [s.v.U, s.v.U, s.v.U]; Is = r.map((x) => s.v.U / x); }
      else { const U1 = I * r[0], U23 = s.v.U - U1; Us = [U1, U23, U23]; Is = [I, U23 / r[1], U23 / r[2]]; }
      return [['საერთო წინაღობა', f(R, 2) + ' Ω'], ['საერთო დენი', f(I, 3) + ' ა'], ['I₁ / I₂ / I₃', Is.map((x) => f(x, 3)).join(' / ') + ' ა'], ['U₁ / U₂ / U₃', Us.map((x) => f(x, 2)).join(' / ') + ' ვ'], ['სიმძლავრე', f(s.v.U * I, 2) + ' ვტ']];
    },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(0, 0, w, h);
      const rz = (x, y, lab, vert) => { ctx.save(); ctx.translate(x, y); if (vert) ctx.rotate(Math.PI / 2); ctx.fillStyle = '#e7cfa2'; D.rrect(ctx, -30, -10, 60, 20, 8); ctx.fill(); ctx.strokeStyle = '#b08850'; ctx.stroke(); ctx.restore(); D.text(ctx, lab, x + (vert ? 22 : 0), y + (vert ? 4 : -16), { align: vert ? 'left' : 'center', weight: 700, size: 12 }); };
      const L = w * 0.12, Rr = w * 0.88, T = h * 0.25, B = h * 0.8;
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(L, B); ctx.lineTo(L, T); ctx.lineTo(Rr, T); ctx.lineTo(Rr, B); ctx.lineTo(L, B); ctx.stroke();
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(L - 14, (T + B) / 2 - 14, 28, 28);
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(L - 16, (T + B) / 2 - 6); ctx.lineTo(L + 16, (T + B) / 2 - 6); ctx.stroke(); ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(L - 9, (T + B) / 2 + 8); ctx.lineTo(L + 9, (T + B) / 2 + 8); ctx.stroke();
      D.text(ctx, `${s.v.U} ვ`, L - 22, (T + B) / 2 + 4, { align: 'right', weight: 700 });
      const r = [s.v.r1, s.v.r2, s.v.r3];
      if (s.v.mode === 'series') [0, 1, 2].forEach((i) => { const x = L + (Rr - L) * (i + 1) / 4; ctx.fillStyle = '#f8f9fa'; ctx.fillRect(x - 32, T - 12, 64, 24); rz(x, T, `R${i + 1}=${r[i]}Ω`); });
      else {
        const xs = s.v.mode === 'parallel' ? [0.35, 0.55, 0.75] : [null, 0.55, 0.75];
        const top = T + 20, bot = B - 20;
        if (s.v.mode === 'mixed') { ctx.fillStyle = '#f8f9fa'; ctx.fillRect(L + (Rr - L) * 0.2 - 32, T - 12, 64, 24); rz(L + (Rr - L) * 0.2, T, `R1=${r[0]}Ω`); }
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 3;
        xs.forEach((fx, i) => { if (fx === null) return; const x = L + (Rr - L) * fx; ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, B); ctx.stroke(); ctx.fillStyle = '#f8f9fa'; ctx.fillRect(x - 12, (top + bot) / 2 - 32, 24, 64); rz(x, (top + bot) / 2, `R${i + 1}=${r[i]}Ω`, true); });
        if (s.v.mode === 'parallel') { ctx.fillStyle = '#f8f9fa'; ctx.fillRect(L + (Rr - L) * 0.35 + 2, B - 2, (Rr - L) * 0.4 - 4, 4); ctx.fillRect(L + (Rr - L) * 0.35 + 2, T - 2, (Rr - L) * 0.4 - 4, 4); ctx.fillStyle = '#495057'; ctx.fillRect(L + (Rr - L) * 0.35, B - 1.5, (Rr - L) * 0.4, 3); ctx.fillRect(L + (Rr - L) * 0.35, T - 1.5, (Rr - L) * 0.4, 3); }
      }
      const I = s.v.U / rTot(s);
      D.text(ctx, `R = ${f(rTot(s), 2)} Ω   I = ${f(I, 3)} ა`, w / 2, h - 10, { align: 'center', weight: 700, size: 14, color: '#1864ab' });
      for (let k = 0; k < 16; k++) { const u = ((k / 16 + s.ph) % 1); const per = 2 * ((Rr - L) + (B - T)); let d = u * per, x, y; if (d < B - T) { x = L; y = B - d; } else if ((d -= B - T) < Rr - L) { x = L + d; y = T; } else if ((d -= Rr - L) < B - T) { x = Rr; y = T + d; } else { d -= B - T; x = Rr - d; y = B; } D.dot(ctx, x, y, 3, '#4dabf7'); }
    },
    bridge: { vars: (s) => ({ resistance: rTot(s), current: s.v.U / rTot(s), voltage: s.v.U }), writable: [],
      example: '// დამცველი: დენი 1 ა-ზე მეტი\nif (current > 1) {\n  alarm("გადატვირთვა: " + current.toFixed(2) + " ა");\n  led(true);\n} else {\n  led(false);\n}' },
    challenges: [
      { key: 'target', title: 'საჭირო წინაღობა', kind: 'state', params: [{ key: 'R', label: 'სამიზნე R (Ω)', value: 25 }],
        text: (p) => `შეარჩიე შეერთება და რეზისტორები ისე, რომ საერთო წინაღობა იყოს ${p.R} Ω (±0.5).`,
        check(s, p) { const R = rTot(s), ok = Math.abs(R - p.R) <= 0.5; return { passed: ok, message: ok ? `სწორია! R = ${f(R, 2)} Ω` : `R = ${f(R, 2)} Ω.` }; } },
      { key: 'parallel', title: 'პარალელური — უმცირესზე ნაკლები', kind: 'state', params: [],
        text: () => 'პარალელურ შეერთებაში R₁ = R₂ = R₃ = 30 Ω. რა არის საერთო წინაღობა? დააყენე და შეამოწმე (უნდა იყოს 10 Ω).',
        check(s) { const ok = s.v.mode === 'parallel' && s.v.r1 === 30 && s.v.r2 === 30 && s.v.r3 === 30; return { passed: ok, message: ok ? 'სწორია! R = 30/3 = 10 Ω — პარალელური წინაღობა ყოველთვის უმცირესზე ნაკლებია.' : 'აირჩიე პარალელური და ტოლი 30 Ω.' }; } },
      { key: 'rule-fuse', title: 'კოდი: დამცველი', kind: 'rule', params: [],
        text: () => 'დაწერე წესი: current > 1 → alarm("…") და LED ჩართე.',
        vectors: () => [{ vars: { current: 1.5 }, expect: (o) => !!o.alarm && o.led === true, label: '1.5 ა → alarm' }, { vars: { current: 0.4 }, expect: (o) => !o.alarm && o.led !== true, label: '0.4 ა → ნორმა' }] },
    ],
  });
})(window.VL);
