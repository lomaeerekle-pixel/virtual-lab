/* ============================================================
 * stem/sims/physics.js — ფიზიკის სიმულაციები
 * ქანქარა · ჰორიზონტისადმი კუთხით ნასროლი სხეული · ომის კანონი · თხელი ლინზა
 * ============================================================ */
(function (VL) {
  'use strict';
  const S = VL.STEM, D = S.draw, f = S.fmt;
  const DEG = Math.PI / 180;

  /* ============ 1. ქანქარა ============ */
  const periodOf = (s) => 2 * Math.PI * Math.sqrt(s.v.L / s.v.g);
  S.register({
    key: 'pendulum', subject: 'physics', title: 'მათემატიკური ქანქარა', icon: '🕰️',
    summary: 'როგორ არის დამოკიდებული რხევის პერიოდი სიგრძესა და გრავიტაციაზე?',
    animated: true,
    vars: [
      { key: 'L', label: 'სიგრძე L', min: 0.2, max: 3, step: 0.01, value: 1, unit: 'მ' },
      { key: 'g', label: 'გრავიტაცია g', min: 1.6, max: 25, step: 0.01, value: 9.81, unit: 'მ/წ²' },
      { key: 'a0', label: 'საწყისი კუთხე θ₀', min: 5, max: 60, step: 1, value: 20, unit: '°', reset: true },
      { key: 'b', label: 'მილევა (ხახუნი)', min: 0, max: 0.5, step: 0.01, value: 0, unit: '' },
    ],
    presets: [
      { label: '🌍 დედამიწა', values: { g: 9.81 } }, { label: '🌙 მთვარე', values: { g: 1.62 } },
      { label: '🔴 მარსი', values: { g: 3.71 } }, { label: '🪐 იუპიტერი', values: { g: 24.79 } },
    ],
    create: () => ({ trail: [] }),
    reset(s) { s.theta = s.v.a0 * DEG; s.omega = 0; s.t = 0; s.lastCross = null; s.measured = null; s.trail = []; },
    step(s, dt) {
      const n = Math.max(1, Math.ceil(dt / 0.002)); const h = dt / n;
      for (let i = 0; i < n; i++) {
        const acc = -(s.v.g / s.v.L) * Math.sin(s.theta) - s.v.b * s.omega;
        s.omega += acc * h;
        const prev = s.theta; s.theta += s.omega * h; s.t += h;
        if (prev < 0 && s.theta >= 0) { if (s.lastCross !== null) s.measured = s.t - s.lastCross; s.lastCross = s.t; }
      }
    },
    readouts(s) {
      return [
        ['T = 2π√(L/g)', f(periodOf(s), 3) + ' წმ'],
        ['გაზომილი პერიოდი', s.measured ? f(s.measured, 3) + ' წმ' : 'იზომება…'],
        ['კუთხე θ', f(s.theta / DEG, 1) + '°'],
        ['წრფივი სიჩქარე', f(Math.abs(s.omega * s.v.L), 2) + ' მ/წ'],
        ['სიხშირე ν = 1/T', f(1 / periodOf(s), 3) + ' ჰც'],
      ];
    },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(0, 0, w, h);
      const px = w / 2, py = 30, scale = (h - 80) / 3.05, Lp = s.v.L * scale;
      ctx.fillStyle = '#adb5bd'; ctx.fillRect(px - 90, py - 12, 180, 12);
      ctx.strokeStyle = '#868e96'; for (let x = px - 90; x < px + 90; x += 10) { ctx.beginPath(); ctx.moveTo(x, py - 12); ctx.lineTo(x + 8, py - 20); ctx.stroke(); }
      const a0 = s.v.a0 * DEG;
      ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = '#ced4da'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(px, py, Lp, Math.PI / 2 - a0, Math.PI / 2 + a0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + Lp + 24); ctx.stroke(); ctx.restore();
      const bx = px + Lp * Math.sin(s.theta), by = py + Lp * Math.cos(s.theta);
      s.trail.push([bx, by]); if (s.trail.length > 60) s.trail.shift();
      ctx.save(); ctx.strokeStyle = 'rgba(66,99,235,0.25)'; ctx.lineWidth = 3; ctx.beginPath();
      s.trail.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = '#343a40'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by); ctx.stroke();
      const gr = ctx.createRadialGradient(bx - 5, by - 5, 2, bx, by, 18); gr.addColorStop(0, '#91a7ff'); gr.addColorStop(1, '#364fc7');
      D.dot(ctx, bx, by, 17, gr); D.dot(ctx, px, py, 4, '#343a40');
      const v = s.omega * s.v.L;
      if (Math.abs(v) > 0.02) D.arrow(ctx, bx, by, bx + Math.cos(s.theta) * v * 30, by - Math.sin(s.theta) * v * 30, '#e8590c', 2.5);
      D.text(ctx, `L = ${f(s.v.L, 2)} მ`, px + 12, py + Lp / 2, { color: '#495057', bg: 'rgba(255,255,255,.8)' });
      D.text(ctx, `θ = ${f(s.theta / DEG, 1)}°`, 14, 24, { size: 14, weight: 600 });
      D.text(ctx, `t = ${f(s.t, 1)} წმ`, 14, 44, { color: '#868e96' });
      D.text(ctx, `T = ${f(periodOf(s), 3)} წმ`, w - 14, 24, { size: 14, weight: 600, align: 'right', color: '#364fc7' });
    },
    bridge: {
      vars: (s) => ({ angle: +(s.theta / DEG).toFixed(3), velocity: s.omega * s.v.L, time: s.t, length: s.v.L, gravity: s.v.g, period: periodOf(s) }),
      writable: [],
      example: '// LED ანთდება, როცა ქანქარა ყველაზე დაბალ წერტილთანაა\nif (abs(angle) < 3) {\n  led(true);\n} else {\n  led(false);\n}',
    },
    challenges: [
      {
        key: 'period', title: 'სამიზნე პერიოდი', kind: 'state',
        params: [{ key: 'target', label: 'სამიზნე T (წმ)', value: 2 }, { key: 'tol', label: 'დასაშვები ცდომილება (წმ)', value: 0.05 }],
        text: (p) => `შეარჩიე სიგრძე L ისე, რომ რხევის პერიოდი იყოს ${p.target} წმ (±${p.tol}). რა სიგრძე მიიღე?`,
        check(s, p) {
          const T = periodOf(s), ok = Math.abs(T - p.target) <= p.tol;
          return { passed: ok, message: ok ? `შესანიშნავია! T = ${f(T, 3)} წმ (L = ${f(s.v.L, 2)} მ)` : `ახლა T = ${f(T, 3)} წმ — ${T > p.target ? 'შეამცირე' : 'გაზარდე'} სიგრძე L.` };
        },
      },
      {
        key: 'moon', title: 'ქანქარა მთვარეზე', kind: 'state',
        params: [{ key: 'target', label: 'სამიზნე T (წმ)', value: 3 }],
        text: (p) => `აირჩიე მთვარის გრავიტაცია (g = 1.62 მ/წ²) და შეარჩიე L ისე, რომ T = ${p.target} წმ იყოს (±0.05).`,
        check(s, p) {
          if (Math.abs(s.v.g - 1.62) > 0.02) return { passed: false, message: `g ახლა ${f(s.v.g)} — დააჭირე „🌙 მთვარე“ ღილაკს.` };
          const T = periodOf(s), ok = Math.abs(T - p.target) <= 0.05;
          return { passed: ok, message: ok ? `სწორია! მთვარეზე T = ${f(T, 3)} წმ, L = ${f(s.v.L, 2)} მ` : `T = ${f(T, 3)} წმ — ${T > p.target ? 'შეამცირე' : 'გაზარდე'} L.` };
        },
      },
      {
        key: 'rule-bottom', title: 'კოდი: დაბალი წერტილის დეტექტორი', kind: 'rule',
        params: [{ key: 'deg', label: 'ზღვარი (°)', value: 3 }],
        text: (p) => `დაწერე წესი: LED ანთდეს, როცა |angle| < ${p.deg}°, სხვა დროს ჩაქრეს.`,
        vectors: (p) => [
          { vars: { angle: 0 }, expect: (o) => o.led === true, label: 'angle = 0° → LED ჩართულია', hint: 'გამოიყენე abs(angle) < …' },
          { vars: { angle: p.deg - 1 }, expect: (o) => o.led === true, label: `angle = ${p.deg - 1}° → LED ჩართულია` },
          { vars: { angle: -(p.deg - 1) }, expect: (o) => o.led === true, label: `angle = −${p.deg - 1}° → LED ჩართულია`, hint: 'უარყოფითი კუთხეც გაითვალისწინე — abs()' },
          { vars: { angle: p.deg + 6 }, expect: (o) => o.led !== true, label: `angle = ${p.deg + 6}° → LED ჩამქრალია`, hint: 'დაამატე else { led(false); }' },
          { vars: { angle: -25 }, expect: (o) => o.led !== true, label: 'angle = −25° → LED ჩამქრალია' },
        ],
      },
    ],
  });

  /* ============ 2. კუთხით ნასროლი სხეული ============ */
  const proj = (s) => {
    const a = s.v.angle * DEG, vx = s.v.v0 * Math.cos(a), vy0 = s.v.v0 * Math.sin(a), g = s.v.g, h0 = s.v.h0;
    const tf = (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * h0)) / g;
    return { vx, vy0, g, h0, tf, R: vx * tf, H: h0 + vy0 * vy0 / (2 * g), tH: vy0 / g };
  };
  S.register({
    key: 'projectile', subject: 'physics', title: 'კუთხით ნასროლი სხეული', icon: '🎯',
    summary: 'ფრენის სიშორე, სიმაღლე და დრო — მოარტყი სამიზნეს!',
    animated: true, playLabel: '🚀 სროლა',
    vars: [
      { key: 'v0', label: 'საწყისი სიჩქარე v₀', min: 5, max: 40, step: 0.5, value: 18, unit: 'მ/წ', reset: true },
      { key: 'angle', label: 'კუთხე α', min: 5, max: 85, step: 1, value: 45, unit: '°', reset: true },
      { key: 'h0', label: 'საწყისი სიმაღლე h₀', min: 0, max: 20, step: 0.5, value: 0, unit: 'მ', reset: true },
      { key: 'g', label: 'გრავიტაცია g', min: 1.6, max: 25, step: 0.01, value: 9.81, unit: 'მ/წ²', reset: true },
    ],
    presets: [{ label: '45° (მაქს. სიშორე)', values: { angle: 45, h0: 0 } }, { label: 'ბორცვიდან', values: { h0: 15, angle: 30 } }, { label: '🌙 მთვარე', values: { g: 1.62 } }],
    create: () => ({ trail: [] }),
    reset(s) { s.t = 0; s.x = 0; s.y = s.v.h0; s.trail = [[0, s.v.h0]]; s.done = false; const p = proj(s); s.vx = p.vx; s.vy = p.vy0; },
    isDone: (s) => s.done,
    step(s, dt) {
      if (s.done) return;
      const p = proj(s);
      s.t = Math.min(s.t + dt, p.tf);
      s.x = p.vx * s.t; s.y = p.h0 + p.vy0 * s.t - 0.5 * p.g * s.t * s.t; s.vy = p.vy0 - p.g * s.t;
      if (s.t >= p.tf - 1e-9) { s.y = 0; s.done = true; }
      s.trail.push([s.x, s.y]);
    },
    readouts(s) {
      const p = proj(s);
      return [['სიშორე R', f(p.R, 2) + ' მ'], ['მაქს. სიმაღლე H', f(p.H, 2) + ' მ'], ['ფრენის დრო', f(p.tf, 2) + ' წმ'],
        ['x, y', `${f(s.x, 1)} მ, ${f(s.y, 1)} მ`], ['vₓ, v_y', `${f(p.vx, 1)}, ${f(s.vy, 1)} მ/წ`]];
    },
    draw(ctx, s, w, h) {
      const p = proj(s);
      const target = s.active && s.active.key === 'target' ? s.active.params.target : null;
      const xmax = Math.max(p.R, target ? target + 4 : 0, 10) * 1.1, ymax = Math.max(p.H, 4) * 1.25;
      const sc = Math.min((w - 70) / xmax, (h - 60) / ymax);
      const ox = 44, oy = h - 32, X = (x) => ox + x * sc, Y = (y) => oy - y * sc;
      const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#e7f5ff'); sky.addColorStop(1, '#f8f9fa');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#8ce99a'; ctx.fillRect(0, oy, w, h - oy);
      ctx.strokeStyle = '#2b8a3e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, oy); ctx.lineTo(w, oy); ctx.stroke();
      ctx.fillStyle = '#495057'; ctx.font = `10px ${D.FONT}`; ctx.textAlign = 'center';
      const step = xmax > 60 ? 10 : 5;
      for (let x = 0; x <= xmax; x += step) { ctx.fillRect(X(x) - 0.5, oy, 1, 5); ctx.fillText(x + ' მ', X(x), oy + 16); }
      if (s.v.h0 > 0) { ctx.fillStyle = '#ced4da'; ctx.fillRect(ox - 30, Y(s.v.h0), 30, s.v.h0 * sc); }
      ctx.save(); ctx.setLineDash([5, 6]); ctx.strokeStyle = 'rgba(28,126,214,.4)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i <= 80; i++) { const t = p.tf * i / 80; const x = p.vx * t, y = p.h0 + p.vy0 * t - 0.5 * p.g * t * t; i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)); }
      ctx.stroke(); ctx.restore();
      if (target) {
        ctx.fillStyle = '#e03131'; ctx.fillRect(X(target) - 1, oy - 40, 2, 40);
        ctx.beginPath(); ctx.moveTo(X(target), oy - 40); ctx.lineTo(X(target) + 18, oy - 33); ctx.lineTo(X(target), oy - 26); ctx.fill();
        ctx.fillStyle = 'rgba(224,49,49,.25)'; const tol = s.active.params.tol || 1; ctx.fillRect(X(target - tol), oy - 3, 2 * tol * sc, 6);
        D.text(ctx, `სამიზნე ${target} მ`, X(target), oy - 46, { align: 'center', color: '#c92a2a', weight: 600 });
      }
      ctx.strokeStyle = '#1c7ed6'; ctx.lineWidth = 3; ctx.beginPath();
      s.trail.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)))); ctx.stroke();
      ctx.save(); ctx.translate(X(0), Y(s.v.h0)); ctx.rotate(-s.v.angle * DEG);
      ctx.fillStyle = '#343a40'; D.rrect(ctx, -6, -7, 40, 14, 4); ctx.fill(); ctx.restore();
      D.dot(ctx, X(0), Y(s.v.h0), 9, '#495057');
      D.dot(ctx, X(s.x), Y(s.y), 8, '#f76707', '#d9480f');
      if (s.done) D.text(ctx, `R = ${f(p.R, 2)} მ`, X(p.R), oy - 12, { align: 'center', weight: 700, color: '#1864ab', bg: 'rgba(255,255,255,.85)' });
      ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = '#adb5bd';
      ctx.beginPath(); ctx.moveTo(X(p.vx * p.tH), Y(p.H)); ctx.lineTo(X(p.vx * p.tH), oy); ctx.stroke(); ctx.restore();
      D.text(ctx, `H = ${f(p.H, 1)} მ`, X(p.vx * p.tH) + 6, Y(p.H) - 6, { color: '#495057' });
      D.text(ctx, `v₀ = ${s.v.v0} მ/წ, α = ${s.v.angle}°`, 12, 22, { weight: 600, size: 13 });
    },
    bridge: {
      vars: (s) => { const p = proj(s); return { x: s.x, y: s.y, vx: p.vx, vy: s.vy, time: s.t, range: p.R, maxHeight: p.H }; },
      writable: [],
      example: '// LED ანთდება, როცა სხეული ეშვება (vy < 0)\nif (vy < 0) {\n  led(true);\n} else {\n  led(false);\n}\nif (y < 1 && time > 0.2) log("თითქმის დაეცა!");',
    },
    challenges: [
      {
        key: 'target', title: 'მოარტყი სამიზნეს', kind: 'state',
        params: [{ key: 'target', label: 'სამიზნის მანძილი (მ)', value: 30 }, { key: 'tol', label: 'დასაშვები ცდომილება (მ)', value: 1 }],
        text: (p) => `შეარჩიე v₀ და α ისე, რომ სხეული ${p.target} მ-ზე დაეცეს (±${p.tol} მ). სამიზნე ნაჩვენებია წითელი დროშით.`,
        check(s, p) { const R = proj(s).R, ok = Math.abs(R - p.target) <= p.tol; return { passed: ok, message: ok ? `🎯 მოარტყი! R = ${f(R, 2)} მ` : `R = ${f(R, 2)} მ — ${R > p.target ? 'ძალიან შორს' : 'ვერ მიაღწია'} (${f(Math.abs(R - p.target), 2)} მ).` }; },
      },
      {
        key: 'height', title: 'მაქსიმალური სიმაღლე', kind: 'state',
        params: [{ key: 'target', label: 'სამიზნე H (მ)', value: 10 }, { key: 'tol', label: 'ცდომილება (მ)', value: 0.3 }],
        text: (p) => `მიაღწიე მაქსიმალურ სიმაღლეს H = ${p.target} მ (±${p.tol}). მინიშნება: H = h₀ + (v₀·sinα)²/(2g).`,
        check(s, p) { const H = proj(s).H, ok = Math.abs(H - p.target) <= p.tol; return { passed: ok, message: ok ? `სწორია! H = ${f(H, 2)} მ` : `H = ${f(H, 2)} მ.` }; },
      },
      {
        key: 'rule-falling', title: 'კოდი: ვარდნის სენსორი', kind: 'rule', params: [],
        text: () => 'დაწერე წესი: LED ანთდეს მხოლოდ მაშინ, როცა სხეული ქვემოთ მოძრაობს (vy < 0).',
        vectors: () => [
          { vars: { vy: 8 }, expect: (o) => o.led !== true, label: 'vy = 8 (ადის) → LED ჩამქრალია' },
          { vars: { vy: 0.5 }, expect: (o) => o.led !== true, label: 'vy = 0.5 → LED ჩამქრალია' },
          { vars: { vy: -0.5 }, expect: (o) => o.led === true, label: 'vy = −0.5 (ეშვება) → LED ჩართულია' },
          { vars: { vy: -12 }, expect: (o) => o.led === true, label: 'vy = −12 → LED ჩართულია' },
        ],
      },
    ],
  });

  /* ============ 3. ომის კანონი ============ */
  const closed = (s) => !!s.v.sw && s.ctrl.switchOn !== false;
  const current = (s) => (closed(s) ? s.v.V / s.v.R : 0);
  S.register({
    key: 'ohm', subject: 'physics', title: 'ელექტრული წრედი — ომის კანონი', icon: '🔋',
    summary: 'I = U / R — ძაბვა, წინაღობა, დენი და სიმძლავრე',
    animated: true, autoplay: true,
    vars: [
      { key: 'V', label: 'ძაბვა U', min: 0, max: 24, step: 0.5, value: 9, unit: 'ვ' },
      { key: 'R', label: 'წინაღობა R', min: 1, max: 200, step: 1, value: 30, unit: 'Ω' },
      { key: 'sw', label: 'ჩამრთველი', type: 'toggle', value: 1 },
    ],
    presets: [{ label: 'AA ელემენტი (1.5 ვ)', values: { V: 1.5 } }, { label: 'კრონა (9 ვ)', values: { V: 9 } }, { label: 'მანქანის აკუმულატორი (12 ვ)', values: { V: 12 } }],
    create: () => ({ phase: 0 }),
    reset(s) { s.phase = 0; s.t = 0; },
    step(s, dt) { s.t += dt; s.phase = (s.phase + current(s) * dt * 0.18) % 1; },
    readouts(s) {
      const I = current(s);
      return [['დენი I = U/R', f(I, 3) + ' ა'], ['სიმძლავრე P = U·I', f(s.v.V * I, 2) + ' ვტ'], ['წრედი', closed(s) ? '🟢 ჩაკეტილია' : '⚪ გახსნილია'], ['ძაბვა / წინაღობა', `${s.v.V} ვ / ${s.v.R} Ω`]];
    },
    onPointer(s, x, y, w, h) {
      const L = w * 0.14, Rr = w * 0.86, B = h * 0.78;
      if (Math.abs(x - (L + Rr) / 2) < 50 && Math.abs(y - B) < 35) { s.v.sw = s.v.sw ? 0 : 1; s.ctrl.switchOn = true; return true; }
      return false;
    },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(0, 0, w, h);
      const L = w * 0.14, Rr = w * 0.86, Tp = h * 0.2, B = h * 0.78, I = current(s), P = s.v.V * I, on = closed(s);
      const mx = (L + Rr) / 2, my = (Tp + B) / 2;
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(L, my - 18); ctx.lineTo(L, Tp); ctx.lineTo(mx - 50, Tp);
      ctx.moveTo(mx + 50, Tp); ctx.lineTo(Rr, Tp); ctx.lineTo(Rr, my - 26);
      ctx.moveTo(Rr, my + 26); ctx.lineTo(Rr, B); ctx.lineTo(mx + 30, B);
      ctx.moveTo(mx - 30, B); ctx.lineTo(L, B); ctx.lineTo(L, my + 18);
      ctx.stroke();
      // ბატარეა
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(L - 22, my - 10); ctx.lineTo(L + 22, my - 10); ctx.stroke();
      ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(L - 12, my + 10); ctx.lineTo(L + 12, my + 10); ctx.stroke();
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L, my - 18); ctx.lineTo(L, my - 10); ctx.moveTo(L, my + 10); ctx.lineTo(L, my + 18); ctx.stroke();
      D.text(ctx, '+', L + 28, my - 6, { size: 16, weight: 700, color: '#e03131' });
      D.text(ctx, `${s.v.V} ვ`, L - 30, my + 5, { align: 'right', size: 14, weight: 700 });
      // რეზისტორი
      ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx - 50, Tp);
      for (let i = 0; i < 8; i++) ctx.lineTo(mx - 50 + (i + 0.5) * 12.5, Tp + (i % 2 ? 10 : -10));
      ctx.lineTo(mx + 50, Tp); ctx.stroke();
      D.text(ctx, `R = ${s.v.R} Ω`, mx, Tp - 18, { align: 'center', size: 14, weight: 700, color: '#d9480f' });
      // ნათურა
      const glow = Math.min(1, P / 6);
      if (glow > 0.01) { const gr = ctx.createRadialGradient(Rr, my, 4, Rr, my, 70); gr.addColorStop(0, `rgba(255,212,59,${0.9 * glow})`); gr.addColorStop(1, 'rgba(255,212,59,0)'); ctx.fillStyle = gr; ctx.fillRect(Rr - 80, my - 80, 160, 160); }
      D.dot(ctx, Rr, my, 24, `rgba(255,${230 - 40 * glow},${120 - 100 * glow},${0.25 + 0.75 * glow})`, '#495057');
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(Rr - 8, my + 8); ctx.lineTo(Rr - 4, my - 8); ctx.lineTo(Rr, my + 4); ctx.lineTo(Rr + 4, my - 8); ctx.lineTo(Rr + 8, my + 8); ctx.stroke();
      D.text(ctx, `${f(P, 2)} ვტ`, Rr + 32, my + 5, { size: 13, weight: 600 });
      if (P > 15) D.text(ctx, '🔥 გადახურება!', Rr, my - 40, { align: 'center', color: '#c92a2a', weight: 700 });
      // ჩამრთველი
      ctx.strokeStyle = on ? '#2f9e44' : '#c92a2a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(mx - 30, B);
      if (on) ctx.lineTo(mx + 30, B); else ctx.lineTo(mx + 24, B - 26); ctx.stroke();
      D.dot(ctx, mx - 30, B, 5, '#343a40'); D.dot(ctx, mx + 30, B, 5, '#343a40');
      D.text(ctx, on ? 'ჩართულია (დააჭირე)' : 'გამორთულია (დააჭირე)', mx, B + 24, { align: 'center', color: '#868e96', size: 11 });
      // ამპერმეტრი
      D.dot(ctx, mx, my, 34, '#fff', '#1c7ed6');
      D.text(ctx, 'A', mx, my - 10, { align: 'center', color: '#1c7ed6', weight: 700 });
      D.text(ctx, `${f(I, 3)}`, mx, my + 10, { align: 'center', size: 14, weight: 700, mono: true });
      // ელექტრონები
      if (on && I > 0) {
        const per = [[L, B], [L, Tp], [Rr, Tp], [Rr, B]]; const lens = []; let tot = 0;
        for (let i = 0; i < 4; i++) { const a = per[i], b = per[(i + 1) % 4]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); lens.push(l); tot += l; }
        const N = 28;
        for (let k = 0; k < N; k++) {
          let d = ((k / N + s.phase) % 1) * tot, i = 0;
          while (d > lens[i]) { d -= lens[i]; i++; }
          const a = per[i], b = per[(i + 1) % 4], u = d / lens[i];
          D.dot(ctx, a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, 3.5, '#4dabf7');
        }
      }
    },
    bridge: {
      vars: (s) => ({ voltage: s.v.V, resistance: s.v.R, current: current(s), power: s.v.V * current(s) }),
      writable: [{ key: 'switchOn', label: 'ავტომატური ამომრთველი (switchOn)', value: true }],
      example: '// ავტომატური დამცველი: დიდი დენის დროს წრედის გაწყვეტა\nif (current > 1) {\n  set("switchOn", false);\n  alarm("გადატვირთვა! დენი = " + current.toFixed(2) + " ა");\n}',
    },
    challenges: [
      {
        key: 'current', title: 'საჭირო დენი', kind: 'state',
        params: [{ key: 'target', label: 'სამიზნე დენი (ა)', value: 0.5 }, { key: 'tol', label: 'ცდომილება (ა)', value: 0.02 }],
        text: (p) => `ჩაკეტილ წრედში მიიღე დენი I = ${p.target} ა (±${p.tol}). მინიშნება: I = U / R.`,
        check(s, p) { if (!closed(s)) return { passed: false, message: 'ჩართე ჩამრთველი!' }; const I = current(s), ok = Math.abs(I - p.target) <= p.tol; return { passed: ok, message: ok ? `სწორია! I = ${f(I, 3)} ა (U = ${s.v.V} ვ, R = ${s.v.R} Ω)` : `I = ${f(I, 3)} ა.` }; },
      },
      {
        key: 'power', title: 'ნათურის სიმძლავრე', kind: 'state',
        params: [{ key: 'target', label: 'სამიზნე P (ვტ)', value: 2 }, { key: 'tol', label: 'ცდომილება (ვტ)', value: 0.1 }],
        text: (p) => `შეარჩიე U და R ისე, რომ სიმძლავრე იყოს P = ${p.target} ვტ (±${p.tol}). P = U² / R.`,
        check(s, p) { const P = s.v.V * current(s), ok = closed(s) && Math.abs(P - p.target) <= p.tol; return { passed: ok, message: ok ? `სწორია! P = ${f(P, 2)} ვტ` : `P = ${f(P, 2)} ვტ.` }; },
      },
      {
        key: 'rule-fuse', title: 'კოდი: ავტომატური დამცველი', kind: 'rule',
        params: [{ key: 'limit', label: 'დენის ზღვარი (ა)', value: 1 }],
        text: (p) => `დაწერე წესი: თუ current > ${p.limit} ა, გამორთე წრედი — set("switchOn", false) — და ჩართე განგაში alarm("…").`,
        vectors: (p) => [
          { vars: { current: p.limit * 0.5 }, expect: (o) => o.sets.switchOn !== false && !o.alarm, label: `I = ${p.limit * 0.5} ა → წრედი რჩება ჩართული` },
          { vars: { current: p.limit * 0.99 }, expect: (o) => o.sets.switchOn !== false, label: `I = ${f(p.limit * 0.99)} ა → ჩართული` },
          { vars: { current: p.limit * 1.5 }, expect: (o) => o.sets.switchOn === false, label: `I = ${p.limit * 1.5} ა → set("switchOn", false)`, hint: 'გამოიყენე set("switchOn", false);' },
          { vars: { current: p.limit * 3 }, expect: (o) => !!o.alarm, label: `I = ${p.limit * 3} ა → alarm()`, hint: 'დაამატე alarm("გადატვირთვა!");' },
        ],
      },
    ],
  });

  /* ============ 4. თხელი ლინზა ============ */
  const lens = (s) => {
    const { f: F, d } = s.v;
    if (Math.abs(d - F) < 0.05) return { di: Infinity, m: Infinity, type: 'გამოსახულება არ მიიღება (უსასრულობაში)' };
    const di = F * d / (d - F), m = -di / d;
    const type = di > 0 ? `ნამდვილი, შებრუნებული, ${Math.abs(m) > 1.001 ? 'გადიდებული' : Math.abs(m) < 0.999 ? 'შემცირებული' : 'ტოლი ზომის'}` : 'წარმოსახვითი, პირდაპირი, გადიდებული';
    return { di, m, type };
  };
  S.register({
    key: 'lens', subject: 'physics', title: 'ოპტიკა — შემკრები ლინზა', icon: '🔍',
    summary: '1/F = 1/d + 1/f — გამოსახულების აგება სხივებით',
    animated: false,
    vars: [
      { key: 'f', label: 'ფოკუსური მანძილი F', min: 4, max: 25, step: 0.5, value: 10, unit: 'სმ' },
      { key: 'd', label: 'საგნის მანძილი d', min: 2, max: 60, step: 0.5, value: 25, unit: 'სმ' },
      { key: 'ho', label: 'საგნის სიმაღლე', min: 1, max: 6, step: 0.5, value: 3, unit: 'სმ' },
    ],
    presets: [{ label: 'd > 2F (ფოტოაპარატი)', values: { f: 10, d: 30 } }, { label: 'd = 2F', values: { f: 10, d: 20 } }, { label: 'F < d < 2F (პროექტორი)', values: { f: 10, d: 15 } }, { label: 'd < F (ლუპა)', values: { f: 10, d: 6 } }],
    create: () => ({}),
    reset() { },
    step() { },
    readouts(s) {
      const L = lens(s);
      return [['გამოსახულების მანძილი f', isFinite(L.di) ? f(L.di, 2) + ' სმ' : '∞'], ['გადიდება Γ = −f/d', isFinite(L.m) ? f(L.m, 2) : '∞'],
        ['გამოსახულება', L.type], ['ოპტიკური ძალა D = 1/F', f(100 / s.v.f, 1) + ' დპტ']];
    },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      const ax = h * 0.55, lx = w * 0.42, sx = (w * 0.4) / 62, sy = Math.min(h * 0.4 / 8, 22);
      const L = lens(s), F = s.v.f;
      ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, ax); ctx.lineTo(w, ax); ctx.stroke();
      // ლინზა
      ctx.fillStyle = 'rgba(116,192,252,.35)'; ctx.strokeStyle = '#1c7ed6'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(lx, ax, 10, h * 0.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      [[-1, 'F'], [1, 'F′'], [-2, '2F'], [2, '2F′']].forEach(([k, lab]) => {
        const x = lx + k * F * sx; if (x < 0 || x > w) return;
        D.dot(ctx, x, ax, 3.5, '#e8590c'); D.text(ctx, lab, x, ax + 18, { align: 'center', color: '#d9480f', weight: 600 });
      });
      const xo = lx - s.v.d * sx, yo = ax - s.v.ho * sy;
      D.arrow(ctx, xo, ax, xo, yo, '#2f9e44', 3, 10);
      D.text(ctx, 'საგანი', xo, ax + 34, { align: 'center', color: '#2b8a3e' });
      if (!isFinite(L.di)) { D.text(ctx, 'საგანი ფოკუსშია — სხივები პარალელურია, გამოსახულება არ არის', w / 2, 24, { align: 'center', weight: 600, color: '#c92a2a' }); }
      const xi = lx + L.di * sx, yi = ax - L.m * s.v.ho * sy;
      const ext = (x1, y1, x2, y2, len = 3000) => { const a = Math.atan2(y2 - y1, x2 - x1); return [x2 + Math.cos(a) * len, y2 + Math.sin(a) * len]; };
      const ray = (pts, color, dashed) => { ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1.8; if (dashed) ctx.setLineDash([5, 5]); ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore(); };
      const fx2 = lx + F * sx, fx1 = lx - F * sx;
      // სხივი 1: პარალელური → F′-ზე გავლით
      const r1 = ext(lx, yo, fx2, ax);
      ray([[xo, yo], [lx, yo], r1], '#e03131');
      // სხივი 2: ცენტრზე გავლით
      const r2 = ext(xo, yo, lx, ax);
      ray([[xo, yo], [lx, ax], r2], '#7048e8');
      // სხივი 3: F-ზე გავლით → პარალელური
      if (Math.abs(fx1 - xo) > 1) {
        const y3 = yo + (ax - yo) * (lx - xo) / (fx1 - xo);
        if (Math.abs(y3 - ax) < h) ray([[xo, yo], [lx, y3], [w + 50, y3]], '#1c7ed6');
        if (isFinite(L.di) && L.di < 0) ray([[lx, y3], [xi, y3]], '#1c7ed6', true);
      }
      if (isFinite(L.di)) {
        if (L.di < 0) { ray([[lx, yo], [xi, yi]], '#e03131', true); ray([[lx, ax], [xi, yi]], '#7048e8', true); }
        if (xi > -50 && xi < w + 50) {
          ctx.save(); if (L.di < 0) ctx.globalAlpha = 0.6;
          D.arrow(ctx, xi, ax, xi, yi, '#f08c00', 3, 10); ctx.restore();
          D.text(ctx, L.di > 0 ? 'გამოსახულება' : 'წარმოსახვითი გამოსახულება', xi, (yi > ax ? yi + 18 : ax + 34), { align: 'center', color: '#e67700' });
        }
      }
      D.text(ctx, `d = ${s.v.d} სმ, F = ${F} სმ, f = ${isFinite(L.di) ? f(L.di, 1) : '∞'} სმ`, 12, 22, { weight: 600, size: 13 });
      D.text(ctx, L.type, 12, 42, { color: '#495057' });
    },
    bridge: {
      vars: (s) => { const L = lens(s); return { focal: s.v.f, objectDist: s.v.d, imageDist: isFinite(L.di) ? L.di : 99999, magnification: isFinite(L.m) ? L.m : 99999 }; },
      writable: [],
      example: '// LED ანთდება, როცა გამოსახულება ნამდვილია (ეკრანზე მიიღება)\nif (imageDist > 0) {\n  led(true);\n  log("ნამდვილი გამოსახულება: " + imageDist.toFixed(1) + " სმ");\n} else {\n  led(false);\n}',
    },
    challenges: [
      {
        key: 'same-size', title: 'ტოლი ზომის გამოსახულება', kind: 'state', params: [],
        text: () => 'მიიღე ნამდვილი გამოსახულება, რომელიც საგნის ტოლია (Γ = −1, ±0.05). სად უნდა იყოს საგანი?',
        check(s) { const L = lens(s), ok = isFinite(L.m) && Math.abs(L.m + 1) <= 0.05; return { passed: ok, message: ok ? `სწორია! d = ${s.v.d} სმ = 2F` : `Γ = ${isFinite(L.m) ? f(L.m) : '∞'}.` }; },
      },
      {
        key: 'magnify', title: 'გადიდებული გამოსახულება', kind: 'state',
        params: [{ key: 'target', label: 'სამიზნე გადიდება |Γ|', value: 2 }, { key: 'tol', label: 'ცდომილება', value: 0.1 }],
        text: (p) => `მიიღე ნამდვილი, ${p.target}-ჯერ გადიდებული გამოსახულება (Γ = −${p.target}, ±${p.tol}).`,
        check(s, p) { const L = lens(s), ok = isFinite(L.m) && L.di > 0 && Math.abs(-L.m - p.target) <= p.tol; return { passed: ok, message: ok ? `სწორია! Γ = ${f(L.m)}` : `Γ = ${isFinite(L.m) ? f(L.m) : '∞'} — ${L.di < 0 ? 'გამოსახულება წარმოსახვითია (d < F)' : 'შეცვალე d'}.` }; },
      },
      {
        key: 'rule-real', title: 'კოდი: ნამდვილი გამოსახულების ინდიკატორი', kind: 'rule', params: [],
        text: () => 'დაწერე წესი: LED ანთდეს, როცა გამოსახულება ნამდვილია (imageDist > 0) და ჩაქრეს, როცა წარმოსახვითია.',
        vectors: () => [
          { vars: { imageDist: 30 }, expect: (o) => o.led === true, label: 'imageDist = 30 → LED ჩართულია' },
          { vars: { imageDist: 12.5 }, expect: (o) => o.led === true, label: 'imageDist = 12.5 → LED ჩართულია' },
          { vars: { imageDist: -15 }, expect: (o) => o.led !== true, label: 'imageDist = −15 → LED ჩამქრალია' },
        ],
      },
    ],
  });
})(window.VL);
