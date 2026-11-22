/* ============================================================
 * stem/sims/math.js — მათემატიკა
 * კვადრატული ფუნქცია · წრფივი ფუნქცია · კოორდინატთა სიბრტყე
 * ============================================================ */
(function (VL) {
  'use strict';
  const S = VL.STEM, D = S.draw, f = S.fmt;
  const R10 = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };
  const sq = (w, h) => { const size = Math.min(w - 20, h - 20); return { x0: (w - size) / 2, y0: (h - size) / 2, size }; };
  const sgn = (v) => (v < 0 ? '− ' + f(-v, 2).replace(/\.?0+$/, '') : '+ ' + f(v, 2).replace(/\.?0+$/, ''));

  /* ============ 1. კვადრატული ფუნქცია ============ */
  const quad = (s) => {
    const { a, b, c } = s.v;
    if (Math.abs(a) < 1e-9) return { linear: true, roots: Math.abs(b) > 1e-9 ? [-c / b] : [], D: NaN };
    const h = -b / (2 * a), k = a * h * h + b * h + c, Dd = b * b - 4 * a * c;
    const roots = Dd < 0 ? [] : Dd === 0 ? [h] : [(-b - Math.sqrt(Dd)) / (2 * a), (-b + Math.sqrt(Dd)) / (2 * a)].sort((x, y) => x - y);
    return { h, k, D: Dd, roots };
  };
  S.register({
    key: 'quadratic', subject: 'math', title: 'კვადრატული ფუნქცია (პარაბოლა)', icon: '📈',
    summary: 'y = ax² + bx + c — წვერო, ფესვები, დისკრიმინანტი',
    animated: true, playLabel: '▶ წერტილის მოძრაობა',
    vars: [
      { key: 'a', label: 'a', min: -5, max: 5, step: 0.1, value: 1, unit: '' },
      { key: 'b', label: 'b', min: -10, max: 10, step: 0.5, value: 0, unit: '' },
      { key: 'c', label: 'c', min: -10, max: 10, step: 0.5, value: 0, unit: '' },
    ],
    presets: [{ label: 'y = x²', values: { a: 1, b: 0, c: 0 } }, { label: 'y = −x² + 4', values: { a: -1, b: 0, c: 4 } }, { label: 'ორი ფესვი', values: { a: 0.5, b: -1, c: -4 } }, { label: 'ფესვები არ აქვს', values: { a: 1, b: 2, c: 5 } }],
    create: () => ({ x: -10 }),
    reset(s) { s.x = -10; s.t = 0; },
    step(s, dt) { s.t += dt; s.x += dt * 3; if (s.x > 10) s.x = -10; },
    readouts(s) {
      const q = quad(s);
      return [['ფორმულა', `y = ${f(s.v.a, 1)}x² ${sgn(s.v.b)}x ${sgn(s.v.c)}`], ['წვერო (h; k)', q.linear ? '—' : `(${f(q.h)}; ${f(q.k)})`],
        ['დისკრიმინანტი D = b² − 4ac', q.linear ? '—' : f(q.D)], ['ფესვები', q.roots.length ? q.roots.map((r) => f(r)).join(' ; ') : 'არ აქვს'], ['შტოები', s.v.a > 0 ? 'ზემოთ ↑' : s.v.a < 0 ? 'ქვემოთ ↓' : 'წრფე']];
    },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(0, 0, w, h);
      const { x0, y0, size } = sq(w, h);
      const m = D.plot(ctx, x0, y0, size, size, R10, { stepX: 2, stepY: 2, xLabel: 'x', yLabel: 'y' });
      const q = quad(s), F = (x) => s.v.a * x * x + s.v.b * x + s.v.c;
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, size, size); ctx.clip();
      if (s.active && s.active.key === 'vertex') D.dot(ctx, m.X(s.active.params.vx), m.Y(s.active.params.vy), 9, null, '#e03131');
      if (s.active && s.active.key === 'roots') [s.active.params.r1, s.active.params.r2].forEach((r) => D.dot(ctx, m.X(r), m.Y(0), 9, null, '#e03131'));
      if (!q.linear) { ctx.setLineDash([5, 5]); ctx.strokeStyle = '#b197fc'; ctx.beginPath(); ctx.moveTo(m.X(q.h), y0); ctx.lineTo(m.X(q.h), y0 + size); ctx.stroke(); ctx.setLineDash([]); }
      D.fn(ctx, m, F, -10, 10, '#7048e8', 3);
      if (!q.linear) D.dot(ctx, m.X(q.h), m.Y(q.k), 6, '#e8590c', '#fff');
      q.roots.forEach((r) => D.dot(ctx, m.X(r), m.Y(0), 5, '#2f9e44', '#fff'));
      const y = F(s.x);
      if (y > -10 && y < 10) { D.dot(ctx, m.X(s.x), m.Y(y), 7, y >= 0 ? '#1c7ed6' : '#f03e3e', '#fff'); D.text(ctx, `(${f(s.x, 1)}; ${f(y, 1)})`, m.X(s.x) + 10, m.Y(y) - 8, { bg: 'rgba(255,255,255,.85)', size: 11 }); }
      ctx.restore();
      D.text(ctx, `y = ${f(s.v.a, 1)}x² ${sgn(s.v.b)}x ${sgn(s.v.c)}`, x0 + 8, y0 + 20, { weight: 700, size: 14, color: '#5f3dc4', bg: 'rgba(255,255,255,.85)' });
    },
    bridge: {
      vars: (s) => { const q = quad(s); return { x: s.x, y: s.v.a * s.x * s.x + s.v.b * s.x + s.v.c, a: s.v.a, b: s.v.b, c: s.v.c, vertexX: q.h ?? 0, vertexY: q.k ?? 0, discriminant: q.D || 0 }; },
      writable: [],
      example: '// LED ანთდება, როცა მოძრავი წერტილი x ღერძის ზემოთაა\nif (y > 0) {\n  led(true);\n} else {\n  led(false);\n}\nif (discriminant < 0) log("ფესვები არ აქვს");',
    },
    challenges: [
      {
        key: 'vertex', title: 'პარაბოლის წვერო', kind: 'state',
        params: [{ key: 'vx', label: 'წვეროს x', value: 2 }, { key: 'vy', label: 'წვეროს y', value: -1 }],
        text: (p) => `შეარჩიე a, b, c ისე, რომ პარაბოლის წვერო იყოს (${p.vx}; ${p.vy}). მინიშნება: h = −b / 2a.`,
        check(s, p) { const q = quad(s); if (q.linear) return { passed: false, message: 'a ≠ 0 უნდა იყოს.' }; const ok = Math.abs(q.h - p.vx) <= 0.05 && Math.abs(q.k - p.vy) <= 0.05; return { passed: ok, message: ok ? `სწორია! წვერო (${f(q.h)}; ${f(q.k)})` : `წვერო ახლა (${f(q.h)}; ${f(q.k)}).` }; },
      },
      {
        key: 'roots', title: 'მოცემული ფესვები', kind: 'state',
        params: [{ key: 'r1', label: 'ფესვი x₁', value: -1 }, { key: 'r2', label: 'ფესვი x₂', value: 3 }],
        text: (p) => `შეარჩიე კოეფიციენტები ისე, რომ ფუნქციის ფესვები იყოს x₁ = ${p.r1} და x₂ = ${p.r2} (ნიშნულია წითელი წრეებით).`,
        check(s, p) {
          const q = quad(s), want = [p.r1, p.r2].sort((x, y) => x - y);
          const ok = q.roots.length === 2 && Math.abs(q.roots[0] - want[0]) <= 0.05 && Math.abs(q.roots[1] - want[1]) <= 0.05;
          return { passed: ok, message: ok ? 'სწორია! ფესვები ემთხვევა.' : `ფესვები ახლა: ${q.roots.length ? q.roots.map((r) => f(r)).join(', ') : 'არ აქვს'}.` };
        },
      },
      {
        key: 'rule-sign', title: 'კოდი: ფუნქციის ნიშანი', kind: 'rule', params: [],
        text: () => 'დაწერე წესი: LED ანთდეს, როცა y > 0; ჩაქრეს, როცა y ≤ 0. alarm("ფესვი!") — როცა y ზუსტად 0-ია.',
        vectors: () => [
          { vars: { y: 3 }, expect: (o) => o.led === true, label: 'y = 3 → LED ჩართულია' },
          { vars: { y: -2 }, expect: (o) => o.led !== true, label: 'y = −2 → LED ჩამქრალია' },
          { vars: { y: 0 }, expect: (o) => o.led !== true && !!o.alarm, label: 'y = 0 → LED ჩამქრალია + alarm', hint: 'if (y == 0) alarm("ფესვი!");' },
        ],
      },
    ],
  });

  /* ============ 2. წრფივი ფუნქცია ============ */
  S.register({
    key: 'linear', subject: 'math', title: 'წრფივი ფუნქცია y = kx + b', icon: '📏',
    summary: 'დახრილობა, გადაკვეთა ღერძებთან, ორ წერტილზე გამავალი წრფე',
    animated: false,
    vars: [
      { key: 'k', label: 'დახრილობა k', min: -5, max: 5, step: 0.25, value: 1, unit: '' },
      { key: 'b', label: 'თავისუფალი წევრი b', min: -10, max: 10, step: 0.5, value: 0, unit: '' },
    ],
    presets: [{ label: 'y = x', values: { k: 1, b: 0 } }, { label: 'y = −2x + 3', values: { k: -2, b: 3 } }, { label: 'ჰორიზონტალური', values: { k: 0, b: 4 } }],
    create: () => ({}), reset() { }, step() { },
    readouts(s) {
      const { k, b } = s.v;
      return [['ფორმულა', `y = ${f(k, 2)}x ${sgn(b)}`], ['ფუნქცია', k > 0 ? 'ზრდადი ↗' : k < 0 ? 'კლებადი ↘' : 'მუდმივი →'], ['Oy-ს გადაკვეთა', `(0; ${f(b)})`], ['Ox-ს გადაკვეთა', k !== 0 ? `(${f(-b / k)}; 0)` : (b === 0 ? 'მთელი ღერძი' : 'არ კვეთს')], ['დახრის კუთხე', f(Math.atan(k) * 180 / Math.PI, 1) + '°']];
    },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(0, 0, w, h);
      const { x0, y0, size } = sq(w, h);
      const m = D.plot(ctx, x0, y0, size, size, R10, { stepX: 2, stepY: 2, xLabel: 'x', yLabel: 'y' });
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, size, size); ctx.clip();
      const a = s.active;
      if (a && a.key === 'through') { const p = a.params; [[p.x1, p.y1], [p.x2, p.y2]].forEach(([x, y]) => { D.dot(ctx, m.X(x), m.Y(y), 9, null, '#e03131'); D.text(ctx, `(${x}; ${y})`, m.X(x) + 10, m.Y(y) - 10, { color: '#c92a2a', weight: 600 }); }); }
      if (a && a.key === 'parallel') D.fn(ctx, m, (x) => a.params.k0 * x + a.params.b0, -10, 10, '#adb5bd', 2, [6, 6]);
      D.fn(ctx, m, (x) => s.v.k * x + s.v.b, -10, 10, '#1c7ed6', 3);
      D.dot(ctx, m.X(0), m.Y(s.v.b), 5, '#e8590c', '#fff');
      if (s.v.k !== 0) D.dot(ctx, m.X(-s.v.b / s.v.k), m.Y(0), 5, '#2f9e44', '#fff');
      // დახრილობის სამკუთხედი
      ctx.strokeStyle = '#f08c00'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(m.X(0), m.Y(s.v.b)); ctx.lineTo(m.X(1), m.Y(s.v.b)); ctx.lineTo(m.X(1), m.Y(s.v.k + s.v.b)); ctx.stroke(); ctx.setLineDash([]);
      D.text(ctx, `Δy = ${f(s.v.k, 2)}`, m.X(1) + 5, m.Y(s.v.b + s.v.k / 2), { color: '#e67700', size: 11 });
      ctx.restore();
      D.text(ctx, `y = ${f(s.v.k, 2)}x ${sgn(s.v.b)}`, x0 + 8, y0 + 20, { weight: 700, size: 14, color: '#1864ab', bg: 'rgba(255,255,255,.85)' });
    },
    bridge: {
      vars: (s) => ({ k: s.v.k, b: s.v.b, xIntercept: s.v.k !== 0 ? -s.v.b / s.v.k : 0 }),
      writable: [],
      example: '// LED ანთდება, თუ ფუნქცია ზრდადია\nif (k > 0) {\n  led(true);\n  log("ზრდადი");\n} else {\n  led(false);\n}',
    },
    challenges: [
      {
        key: 'through', title: 'წრფე ორ წერტილზე', kind: 'state',
        params: [{ key: 'x1', label: 'x₁', value: 1 }, { key: 'y1', label: 'y₁', value: 1 }, { key: 'x2', label: 'x₂', value: 3 }, { key: 'y2', label: 'y₂', value: 5 }],
        text: (p) => `შეარჩიე k და b ისე, რომ წრფე გაიაროს (${p.x1}; ${p.y1}) და (${p.x2}; ${p.y2}) წერტილებზე. k = (y₂ − y₁)/(x₂ − x₁).`,
        check(s, p) {
          const e1 = Math.abs(s.v.k * p.x1 + s.v.b - p.y1), e2 = Math.abs(s.v.k * p.x2 + s.v.b - p.y2), ok = e1 <= 0.05 && e2 <= 0.05;
          return { passed: ok, message: ok ? `სწორია! y = ${s.v.k}x ${sgn(s.v.b)}` : `წრფე ${e1 <= 0.05 ? 'გადის პირველზე, მაგრამ არა მეორეზე' : e2 <= 0.05 ? 'გადის მეორეზე, მაგრამ არა პირველზე' : 'არცერთ წერტილზე არ გადის'}.` };
        },
      },
      {
        key: 'parallel', title: 'პარალელური წრფე', kind: 'state',
        params: [{ key: 'k0', label: 'მოცემული წრფის k', value: 2 }, { key: 'b0', label: 'მოცემული წრფის b', value: 1 }, { key: 'py', label: 'Oy-ს კვეთის წერტილი', value: -3 }],
        text: (p) => `ააგე y = ${p.k0}x ${sgn(p.b0)} წრფის (ნაცრისფერი) პარალელური წრფე, რომელიც Oy ღერძს კვეთს (0; ${p.py}) წერტილში.`,
        check(s, p) { const ok = Math.abs(s.v.k - p.k0) < 1e-6 && Math.abs(s.v.b - p.py) < 1e-6; return { passed: ok, message: ok ? 'სწორია! პარალელურ წრფეებს ერთნაირი k აქვთ.' : `${Math.abs(s.v.k - p.k0) < 1e-6 ? 'k სწორია, შეცვალე b' : 'პარალელურ წრფეებს ერთნაირი დახრილობა (k) აქვთ'}.` }; },
      },
      {
        key: 'rule-mono', title: 'კოდი: ზრდადობის დეტექტორი', kind: 'rule', params: [],
        text: () => 'დაწერე წესი: k > 0 → LED ჩართულია; k < 0 → ჩამქრალია; k == 0 → alarm("მუდმივი ფუნქცია").',
        vectors: () => [
          { vars: { k: 2 }, expect: (o) => o.led === true, label: 'k = 2 → LED ჩართულია' },
          { vars: { k: -1.5 }, expect: (o) => o.led !== true && !o.alarm, label: 'k = −1.5 → ჩამქრალია' },
          { vars: { k: 0 }, expect: (o) => !!o.alarm && o.led !== true, label: 'k = 0 → alarm()' },
        ],
      },
    ],
  });

  /* ============ 3. კოორდინატთა სიბრტყე ============ */
  const parsePts = (str) => String(str || '').split(';').map((t) => t.split(',').map(Number)).filter((a) => a.length === 2 && a.every(Number.isFinite));
  const quadrant = (x, y) => (x > 0 && y > 0 ? 'I' : x < 0 && y > 0 ? 'II' : x < 0 && y < 0 ? 'III' : x > 0 && y < 0 ? 'IV' : 'ღერძზე');
  S.register({
    key: 'coords', subject: 'math', title: 'კოორდინატთა სიბრტყე', icon: '📍',
    summary: 'წერტილების დასმა, მეოთხედები, მანძილი სათავემდე — შეეხე ბადეს!',
    animated: false,
    vars: [
      { key: 'px', label: 'კურსორის x', min: -10, max: 10, step: 1, value: 0, unit: '' },
      { key: 'py', label: 'კურსორის y', min: -10, max: 10, step: 1, value: 0, unit: '' },
    ],
    presets: [],
    actions: [
      { label: '📍 წერტილის დასმა', run(s) { if (!s.placed.some(([x, y]) => x === s.v.px && y === s.v.py)) s.placed.push([s.v.px, s.v.py]); } },
      { label: '↺ ბოლოს წაშლა', run(s) { s.placed.pop(); } },
      { label: '🗑 გასუფთავება', run(s) { s.placed = []; } },
    ],
    create: () => ({ placed: [] }), reset() { }, step() { },
    onPointer(s, x, y, w, h) {
      const { x0, y0, size } = sq(w, h);
      if (x < x0 || x > x0 + size || y < y0 || y > y0 + size) return false;
      const wx = Math.round(-10 + (x - x0) / size * 20), wy = Math.round(10 - (y - y0) / size * 20);
      s.v.px = wx; s.v.py = wy;
      const i = s.placed.findIndex(([a, b]) => a === wx && b === wy);
      if (i >= 0) s.placed.splice(i, 1); else s.placed.push([wx, wy]);
      return true;
    },
    readouts(s) {
      return [['კურსორი', `(${s.v.px}; ${s.v.py})`], ['მეოთხედი', quadrant(s.v.px, s.v.py)], ['მანძილი სათავემდე', f(Math.hypot(s.v.px, s.v.py), 2)], ['დასმული წერტილები', String(s.placed.length)]];
    },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(0, 0, w, h);
      const { x0, y0, size } = sq(w, h);
      const m = D.plot(ctx, x0, y0, size, size, R10, { stepX: 1, stepY: 1 });
      [['I', 5, 5], ['II', -5, 5], ['III', -5, -5], ['IV', 5, -5]].forEach(([t, x, y]) => D.text(ctx, t, m.X(x), m.Y(y), { align: 'center', size: 26, weight: 700, color: 'rgba(112,72,232,.12)' }));
      const tg = s.active && s.active.key === 'points' ? parsePts(s.active.params.pts) : [];
      tg.forEach(([x, y]) => { const hit = s.placed.some(([a, b]) => a === x && b === y); D.dot(ctx, m.X(x), m.Y(y), 10, hit ? 'rgba(64,192,87,.25)' : null, hit ? '#2f9e44' : '#e03131'); });
      if (s.active && s.active.key === 'distance') { ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#ffa8a8'; ctx.beginPath(); ctx.arc(m.X(0), m.Y(0), (m.X(s.active.params.r) - m.X(0)), 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      s.placed.forEach(([x, y]) => { D.dot(ctx, m.X(x), m.Y(y), 5, '#7048e8'); D.text(ctx, `(${x}; ${y})`, m.X(x) + 7, m.Y(y) - 7, { size: 10, color: '#5f3dc4' }); });
      ctx.save(); ctx.strokeStyle = 'rgba(232,89,12,.6)'; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(m.X(s.v.px), m.Y(0)); ctx.lineTo(m.X(s.v.px), m.Y(s.v.py)); ctx.lineTo(m.X(0), m.Y(s.v.py)); ctx.stroke(); ctx.restore();
      D.dot(ctx, m.X(s.v.px), m.Y(s.v.py), 7, null, '#e8590c');
      D.text(ctx, `(${s.v.px}; ${s.v.py})`, m.X(s.v.px) + 10, m.Y(s.v.py) + 16, { weight: 700, color: '#d9480f', bg: 'rgba(255,255,255,.85)' });
    },
    bridge: {
      vars: (s) => ({ x: s.v.px, y: s.v.py, distance: Math.hypot(s.v.px, s.v.py), count: s.placed.length }),
      writable: [],
      example: '// LED ანთდება, როცა კურსორი I მეოთხედშია\nif (x > 0 && y > 0) {\n  led(true);\n} else {\n  led(false);\n}\nlog("მანძილი: " + distance.toFixed(2));',
    },
    challenges: [
      {
        key: 'points', title: 'დასვი წერტილები', kind: 'state',
        params: [{ key: 'pts', label: 'წერტილები (x,y; x,y …)', value: '3,4; -2,5; -6,-3; 4,-7', type: 'text' }],
        text: (p) => `დასვი წერტილები: ${parsePts(p.pts).map(([x, y]) => `(${x}; ${y})`).join(', ')}. შეეხე ბადეს ან გამოიყენე სლაიდერები და „წერტილის დასმა“.`,
        check(s, p) {
          const tg = parsePts(p.pts); const hit = tg.filter(([x, y]) => s.placed.some(([a, b]) => a === x && b === y)).length;
          const extra = s.placed.length - hit;
          const ok = hit === tg.length && extra === 0;
          return { passed: ok, score: Math.round(100 * hit / Math.max(1, tg.length)), message: ok ? 'ყველა წერტილი სწორად დაისვა!' : `სწორად დასმულია ${hit}/${tg.length}${extra > 0 ? `, ზედმეტი: ${extra}` : ''}.` };
        },
      },
      {
        key: 'distance', title: 'მანძილი სათავემდე', kind: 'state',
        params: [{ key: 'r', label: 'მანძილი', value: 5 }],
        text: (p) => `მოათავსე კურსორი წერტილში, რომელიც ღერძებზე არ მდებარეობს და სათავიდან ზუსტად ${p.r} ერთეულითაა დაშორებული (პითაგორას თეორემა).`,
        check(s, p) { const d = Math.hypot(s.v.px, s.v.py), ok = Math.abs(d - p.r) < 1e-6 && s.v.px !== 0 && s.v.py !== 0; return { passed: ok, message: ok ? `სწორია! √(${s.v.px}² + ${s.v.py}²) = ${p.r}` : `მანძილი ახლა ${f(d)}${s.v.px === 0 || s.v.py === 0 ? ' (წერტილი ღერძზეა)' : ''}.` }; },
      },
      {
        key: 'rule-quadrant', title: 'კოდი: მეოთხედის დეტექტორი', kind: 'rule', params: [],
        text: () => 'დაწერე წესი: LED ანთდეს მხოლოდ მაშინ, როცა წერტილი I მეოთხედშია (x > 0 და y > 0). გამოიყენე &&.',
        vectors: () => [
          { vars: { x: 3, y: 4 }, expect: (o) => o.led === true, label: '(3; 4) → ჩართულია' },
          { vars: { x: -3, y: 4 }, expect: (o) => o.led !== true, label: '(−3; 4) → ჩამქრალია' },
          { vars: { x: 3, y: -4 }, expect: (o) => o.led !== true, label: '(3; −4) → ჩამქრალია' },
          { vars: { x: 0, y: 5 }, expect: (o) => o.led !== true, label: '(0; 5) → ჩამქრალია (ღერძზე)' },
        ],
      },
    ],
  });
})(window.VL);
