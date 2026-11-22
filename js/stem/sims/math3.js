/* ============================================================
 * stem/sims/math3.js — მათემატიკა: გეომეტრიული ფიგურები და სხეულები
 * ============================================================ */
(function (VL) {
  'use strict';
  const S = VL.STEM, D = S.draw, f = S.fmt;
  const R = Math.PI / 180;
  const SH = { triangle: 'სამკუთხედი (a, b, γ)', rect: 'მართკუთხედი', circle: 'წრე', trap: 'ტრაპეცია', cube: 'კუბი', box: 'მართკუთხა პარალელეპიპედი', cyl: 'ცილინდრი', cone: 'კონუსი', sphere: 'სფერო' };
  const calc = (s) => {
    const { a, b, h, r, g } = s.v; const o = {};
    switch (s.v.shape) {
      case 'triangle': { const c = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(g * R)); o.c = c; o.S = 0.5 * a * b * Math.sin(g * R); o.P = a + b + c; o.right = Math.abs(g - 90) < 0.01; break; }
      case 'rect': o.S = a * b; o.P = 2 * (a + b); o.d = Math.hypot(a, b); break;
      case 'circle': o.S = Math.PI * r * r; o.P = 2 * Math.PI * r; break;
      case 'trap': { o.S = (a + b) / 2 * h; const side = Math.hypot(Math.abs(a - b) / 2, h); o.P = a + b + 2 * side; break; }
      case 'cube': o.V = a ** 3; o.A = 6 * a * a; o.d = a * Math.sqrt(3); break;
      case 'box': o.V = a * b * h; o.A = 2 * (a * b + a * h + b * h); o.d = Math.sqrt(a * a + b * b + h * h); break;
      case 'cyl': o.V = Math.PI * r * r * h; o.A = 2 * Math.PI * r * (r + h); break;
      case 'cone': { const l = Math.hypot(r, h); o.V = Math.PI * r * r * h / 3; o.A = Math.PI * r * (r + l); o.l = l; break; }
      case 'sphere': o.V = 4 / 3 * Math.PI * r ** 3; o.A = 4 * Math.PI * r * r; break;
      default: break;
    }
    return o;
  };
  S.register({
    key: 'geometry', subject: 'math', title: 'გეომეტრიული ფიგურები და სხეულები', icon: '🔺',
    summary: 'ფართობი, პერიმეტრი, მოცულობა და ზედაპირი — პითაგორა, სინუსები, კოსინუსები',
    animated: false,
    vars: [
      { key: 'shape', label: 'ფიგურა / სხეული', type: 'select', value: 'triangle', options: Object.entries(SH) },
      { key: 'a', label: 'a', min: 1, max: 10, step: 0.5, value: 3, unit: '' },
      { key: 'b', label: 'b', min: 1, max: 10, step: 0.5, value: 4, unit: '' },
      { key: 'g', label: 'კუთხე γ (სამკუთხედი)', min: 10, max: 170, step: 1, value: 90, unit: '°' },
      { key: 'h', label: 'სიმაღლე h', min: 1, max: 10, step: 0.5, value: 4, unit: '' },
      { key: 'r', label: 'რადიუსი r', min: 1, max: 6, step: 0.5, value: 3, unit: '' },
    ],
    presets: [{ label: 'ეგვიპტური სამკუთხედი 3-4-5', values: { shape: 'triangle', a: 3, b: 4, g: 90 } }, { label: 'ტოლგვერდა', values: { shape: 'triangle', a: 5, b: 5, g: 60 } }, { label: 'კუბი a = 3', values: { shape: 'cube', a: 3 } }, { label: 'სფერო r = 3', values: { shape: 'sphere', r: 3 } }],
    create: () => ({}), reset() { }, step() { },
    readouts(s) {
      const o = calc(s), out = [['ფიგურა', SH[s.v.shape]]];
      if (o.S !== undefined) out.push(['ფართობი S', f(o.S, 2)]);
      if (o.P !== undefined) out.push([s.v.shape === 'circle' ? 'წრეწირის სიგრძე C' : 'პერიმეტრი P', f(o.P, 2)]);
      if (o.c !== undefined) out.push(['მესამე გვერდი c', f(o.c, 3) + (o.right ? ' (პითაგორა: √(a²+b²))' : ' (კოსინუსების თეორემა)')]);
      if (o.V !== undefined) out.push(['მოცულობა V', f(o.V, 2)]);
      if (o.A !== undefined) out.push(['ზედაპირის ფართობი', f(o.A, 2)]);
      if (o.d !== undefined) out.push(['დიაგონალი d', f(o.d, 3)]);
      if (o.l !== undefined) out.push(['მსახველი l', f(o.l, 3)]);
      return out;
    },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#eef0f4'; for (let x = 0; x < w; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); } for (let y = 0; y < h; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      const o = calc(s), { a, b, r } = s.v, hh = s.v.h, sc = Math.min(w, h) / 13, cx = w / 2, cy = h / 2 + 20;
      ctx.lineWidth = 3; ctx.strokeStyle = '#5f3dc4'; ctx.fillStyle = 'rgba(112,72,232,.15)';
      const lbl = (t, x, y, c = '#212529') => D.text(ctx, t, x, y, { align: 'center', weight: 700, size: 13, color: c, bg: 'rgba(255,255,255,.85)' });
      const poly = (pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); ctx.stroke(); };
      const ox = 0.45, oy = 0.35; // ირიბი პროექცია
      switch (s.v.shape) {
        case 'triangle': {
          const A = [cx - a * sc / 2, cy + 3 * sc], B = [A[0] + a * sc, A[1]], C = [A[0] + b * sc * Math.cos(s.v.g * R), A[1] - b * sc * Math.sin(s.v.g * R)];
          poly([A, B, C]);
          lbl(`a = ${a}`, (A[0] + B[0]) / 2, A[1] + 20); lbl(`b = ${b}`, (A[0] + C[0]) / 2 - 22, (A[1] + C[1]) / 2); lbl(`c = ${f(o.c, 2)}`, (B[0] + C[0]) / 2 + 26, (B[1] + C[1]) / 2, '#c92a2a');
          ctx.strokeStyle = '#f08c00'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(A[0], A[1], 26, -s.v.g * R, 0); ctx.stroke(); lbl(`γ = ${s.v.g}°`, A[0] + 44, A[1] - 14, '#e67700');
          if (o.right) { ctx.strokeStyle = '#2f9e44'; ctx.strokeRect(A[0], A[1] - 14, 14, 14); }
          break;
        }
        case 'rect': poly([[cx - a * sc / 2, cy - b * sc / 2], [cx + a * sc / 2, cy - b * sc / 2], [cx + a * sc / 2, cy + b * sc / 2], [cx - a * sc / 2, cy + b * sc / 2]]); ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(cx - a * sc / 2, cy + b * sc / 2); ctx.lineTo(cx + a * sc / 2, cy - b * sc / 2); ctx.stroke(); ctx.setLineDash([]); lbl(`a = ${a}`, cx, cy + b * sc / 2 + 20); lbl(`b = ${b}`, cx + a * sc / 2 + 30, cy); break;
        case 'circle': ctx.beginPath(); ctx.arc(cx, cy, r * sc, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + r * sc, cy); ctx.stroke(); D.dot(ctx, cx, cy, 4, '#5f3dc4'); lbl(`r = ${r}`, cx + r * sc / 2, cy - 12); break;
        case 'trap': { const y1 = cy - hh * sc / 2, y2 = cy + hh * sc / 2; poly([[cx - b * sc / 2, y1], [cx + b * sc / 2, y1], [cx + a * sc / 2, y2], [cx - a * sc / 2, y2]]); ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(cx, y1); ctx.lineTo(cx, y2); ctx.stroke(); ctx.setLineDash([]); lbl(`a = ${a}`, cx, y2 + 20); lbl(`b = ${b}`, cx, y1 - 12); lbl(`h = ${hh}`, cx + 26, cy); break; }
        case 'cube': case 'box': {
          const A_ = a * sc, B_ = (s.v.shape === 'cube' ? a : b) * sc, H_ = (s.v.shape === 'cube' ? a : hh) * sc, dx = B_ * ox, dy = B_ * oy;
          const x0 = cx - (A_ + dx) / 2, y0 = cy + (H_ - dy) / 2;
          ctx.fillStyle = 'rgba(112,72,232,.1)';
          poly([[x0, y0], [x0 + A_, y0], [x0 + A_, y0 - H_], [x0, y0 - H_]]); poly([[x0 + A_, y0], [x0 + A_ + dx, y0 - dy], [x0 + A_ + dx, y0 - dy - H_], [x0 + A_, y0 - H_]]); poly([[x0, y0 - H_], [x0 + A_, y0 - H_], [x0 + A_ + dx, y0 - dy - H_], [x0 + dx, y0 - dy - H_]]);
          ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + dx, y0 - dy); ctx.lineTo(x0 + A_ + dx, y0 - dy); ctx.moveTo(x0 + dx, y0 - dy); ctx.lineTo(x0 + dx, y0 - dy - H_); ctx.stroke();
          ctx.strokeStyle = '#c92a2a'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + A_ + dx, y0 - dy - H_); ctx.stroke(); ctx.setLineDash([]);
          lbl(`a = ${a}`, x0 + A_ / 2, y0 + 20); if (s.v.shape === 'box') { lbl(`b = ${b}`, x0 + A_ + dx / 2 + 18, y0 - dy / 2 + 6); lbl(`h = ${hh}`, x0 - 24, y0 - H_ / 2); }
          break;
        }
        case 'cyl': case 'cone': {
          const rx = r * sc, ry = r * sc * 0.3, H_ = hh * sc, yb = cy + H_ / 2, yt = cy - H_ / 2;
          ctx.beginPath(); if (s.v.shape === 'cyl') { ctx.moveTo(cx - rx, yt); ctx.lineTo(cx - rx, yb); ctx.ellipse(cx, yb, rx, ry, 0, Math.PI, 0, true); ctx.lineTo(cx + rx, yt); ctx.ellipse(cx, yt, rx, ry, 0, 0, Math.PI, true); } else { ctx.moveTo(cx, yt); ctx.lineTo(cx - rx, yb); ctx.ellipse(cx, yb, rx, ry, 0, Math.PI, 0, true); ctx.closePath(); }
          ctx.fill(); ctx.stroke();
          if (s.v.shape === 'cyl') { ctx.beginPath(); ctx.ellipse(cx, yt, rx, ry, 0, 0, Math.PI * 2); ctx.stroke(); }
          ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.ellipse(cx, yb, rx, ry, 0, Math.PI, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, yb); ctx.lineTo(cx, yt); ctx.moveTo(cx, yb); ctx.lineTo(cx + rx, yb); ctx.stroke(); ctx.setLineDash([]);
          lbl(`r = ${r}`, cx + rx / 2, yb + 18); lbl(`h = ${hh}`, cx + 24, cy);
          break;
        }
        case 'sphere': { const g2 = ctx.createRadialGradient(cx - r * sc * 0.3, cy - r * sc * 0.3, 4, cx, cy, r * sc); g2.addColorStop(0, '#e5dbff'); g2.addColorStop(1, '#9775fa'); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx, cy, r * sc, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.ellipse(cx, cy, r * sc, r * sc * 0.3, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + r * sc, cy); ctx.stroke(); ctx.setLineDash([]); lbl(`r = ${r}`, cx + r * sc / 2, cy - 10); break; }
        default: break;
      }
      const main = o.V !== undefined ? `V = ${f(o.V, 2)}` : `S = ${f(o.S, 2)}`;
      D.text(ctx, main, 14, 26, { weight: 800, size: 18, color: '#5f3dc4' });
      D.text(ctx, SH[s.v.shape], 14, 46, { color: '#868e96' });
    },
    bridge: { vars: (s) => { const o = calc(s); return { area: o.S ?? o.A ?? 0, perimeter: o.P ?? 0, volume: o.V ?? 0, a: s.v.a, b: s.v.b, gamma: s.v.g }; }, writable: [],
      example: '// LED ანთდება, თუ სამკუთხედი მართკუთხაა (γ = 90°)\nif (gamma == 90) {\n  led(true);\n  log("c² = a² + b²");\n} else {\n  led(false);\n}' },
    challenges: [
      { key: 'pyth', title: 'მთელი რიცხვები პითაგორასთვის', kind: 'state', params: [],
        text: () => 'იპოვე მართკუთხა სამკუთხედი (γ = 90°), რომლის ყველა გვერდი მთელი რიცხვია, მაგრამ არა 3-4-5 (მაგ. 6-8-?).',
        check(s) { const o = calc(s); const ok = s.v.shape === 'triangle' && o.right && Number.isInteger(s.v.a) && Number.isInteger(s.v.b) && Math.abs(o.c - Math.round(o.c)) < 1e-9 && !((s.v.a === 3 && s.v.b === 4) || (s.v.a === 4 && s.v.b === 3)); return { passed: ok, message: ok ? `სწორია! ${s.v.a}² + ${s.v.b}² = ${Math.round(o.c)}²` : `c = ${f(o.c, 3)}${o.right ? '' : ' (γ ≠ 90°)'}.` }; } },
      { key: 'volume', title: 'მოცულობა 100', kind: 'state', params: [{ key: 'V', label: 'სამიზნე V', value: 100 }],
        text: (p) => `შეარჩიე ნებისმიერი სხეული და ზომები ისე, რომ მოცულობა იყოს ${p.V} (±3).`,
        check(s, p) { const o = calc(s); if (o.V === undefined) return { passed: false, message: 'აირჩიე სამგანზომილებიანი სხეული.' }; const ok = Math.abs(o.V - p.V) <= 3; return { passed: ok, message: ok ? `სწორია! ${SH[s.v.shape]}: V = ${f(o.V, 2)}` : `V = ${f(o.V, 2)}.` }; } },
      { key: 'maxarea', title: 'მაქსიმალური ფართობი', kind: 'state', params: [],
        text: () => 'სამკუთხედში a = 5, b = 5. რა კუთხე γ იძლევა უდიდეს ფართობს? დააყენე იგი.',
        check(s) { const ok = s.v.shape === 'triangle' && s.v.a === 5 && s.v.b === 5 && s.v.g === 90; return { passed: ok, message: ok ? 'სწორია! sin γ მაქსიმალურია 90°-ზე → S = 12.5.' : `S = ${f(calc(s).S ?? 0, 2)} — სცადე სხვა კუთხე (a = b = 5).` }; } },
      { key: 'rule-right', title: 'კოდი: მართი კუთხე', kind: 'rule', params: [],
        text: () => 'დაწერე წესი: LED ანთდეს, როცა gamma == 90.',
        vectors: () => [{ vars: { gamma: 90 }, expect: (o) => o.led === true, label: '90° → ჩართულია' }, { vars: { gamma: 60 }, expect: (o) => o.led !== true, label: '60° → ჩამქრალია' }] },
    ],
  });
})(window.VL);
