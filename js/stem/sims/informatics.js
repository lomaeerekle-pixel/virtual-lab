/* ============================================================
 * stem/sims/informatics.js — ინფორმატიკა
 * ლოგიკური ელემენტები · ორობითი რიცხვები
 * ============================================================ */
(function (VL) {
  'use strict';
  const S = VL.STEM, D = S.draw;

  /* ============ 1. ლოგიკური ელემენტები ============ */
  const CIRC = {
    AND: { n: 'AND (და)', ins: 2, fn: (a, b) => a & b, expr: 'A ∧ B' },
    OR: { n: 'OR (ან)', ins: 2, fn: (a, b) => a | b, expr: 'A ∨ B' },
    NOT: { n: 'NOT (არა)', ins: 1, fn: (a) => 1 - a, expr: '¬A' },
    NAND: { n: 'NAND', ins: 2, fn: (a, b) => 1 - (a & b), expr: '¬(A ∧ B)' },
    NOR: { n: 'NOR', ins: 2, fn: (a, b) => 1 - (a | b), expr: '¬(A ∨ B)' },
    XOR: { n: 'XOR (გამომრიცხავი ან)', ins: 2, fn: (a, b) => a ^ b, expr: 'A ⊕ B' },
    COMBO: { n: '(A AND B) OR C', ins: 3, fn: (a, b, c) => (a & b) | c, expr: '(A ∧ B) ∨ C' },
    HALF: { n: 'ნახევარშემკრები (Σ = A⊕B)', ins: 2, fn: (a, b) => a ^ b, carry: (a, b) => a & b, expr: 'Σ = A ⊕ B, C = A ∧ B' },
  };
  const outOf = (s) => CIRC[s.v.g].fn(s.v.A, s.v.B, s.v.C);
  function gateShape(ctx, type, x, y, wd, ht, on) {
    ctx.save(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#343a40'; ctx.fillStyle = on ? '#d3f9d8' : '#fff';
    ctx.beginPath();
    const base = type.replace('N', '').replace('XO', 'XO');
    if (type === 'NOT') { ctx.moveTo(x, y); ctx.lineTo(x + wd - 10, y + ht / 2); ctx.lineTo(x, y + ht); ctx.closePath(); }
    else if (type === 'AND' || type === 'NAND') { ctx.moveTo(x, y); ctx.lineTo(x + wd / 2, y); ctx.arc(x + wd / 2, y + ht / 2, ht / 2, -Math.PI / 2, Math.PI / 2); ctx.lineTo(x, y + ht); ctx.closePath(); }
    else { ctx.moveTo(x, y); ctx.quadraticCurveTo(x + wd * 0.75, y, x + wd, y + ht / 2); ctx.quadraticCurveTo(x + wd * 0.75, y + ht, x, y + ht); ctx.quadraticCurveTo(x + wd * 0.3, y + ht / 2, x, y); }
    ctx.fill(); ctx.stroke();
    if (type === 'XOR') { ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.quadraticCurveTo(x + wd * 0.3 - 8, y + ht / 2, x - 8, y + ht); ctx.stroke(); }
    if (['NOT', 'NAND', 'NOR'].includes(type)) { ctx.beginPath(); ctx.arc(x + wd + (type === 'NOT' ? -4 : 6), y + ht / 2, 6, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke(); }
    ctx.restore(); void base;
    D.text(ctx, type, x + wd * 0.38, y + ht / 2 + 4, { align: 'center', weight: 700, size: 11 });
  }
  const wireC = (v) => (v ? '#2f9e44' : '#adb5bd');
  function line(ctx, pts, v) { ctx.save(); ctx.strokeStyle = wireC(v); ctx.lineWidth = 3.5; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore(); }
  function inputBox(ctx, x, y, label, v) {
    ctx.fillStyle = v ? '#2f9e44' : '#495057'; D.rrect(ctx, x - 22, y - 16, 44, 32, 8); ctx.fill();
    D.text(ctx, `${label}=${v}`, x, y + 5, { align: 'center', color: '#fff', weight: 700, size: 13 });
  }
  S.register({
    key: 'logic', subject: 'cs', title: 'ლოგიკური ელემენტები', icon: '🔣',
    summary: 'AND, OR, NOT, XOR… ჭეშმარიტობის ცხრილი — კომპიუტერის „აგური“. შეეხე შესასვლელებს!',
    animated: false,
    vars: [
      { key: 'g', label: 'სქემა', type: 'select', value: 'AND', options: Object.entries(CIRC).map(([k, c]) => [k, c.n]) },
      { key: 'A', label: 'შესასვლელი A', type: 'toggle', value: 0 },
      { key: 'B', label: 'შესასვლელი B', type: 'toggle', value: 0 },
      { key: 'C', label: 'შესასვლელი C', type: 'toggle', value: 0 },
    ],
    presets: [],
    create: () => ({}), reset() { }, step() { },
    onPointer(s, x, y, w, h) {
      const ins = CIRC[s.v.g].ins, ys = [h * 0.28, h * 0.5, h * 0.72].slice(0, 3);
      const keys = ['A', 'B', 'C'];
      for (let i = 0; i < 3; i++) {
        const yy = ins === 1 ? h * 0.5 : ins === 2 ? [h * 0.32, h * 0.62][i] : ys[i];
        if (i < ins && Math.abs(x - 40) < 28 && Math.abs(y - yy) < 22) { s.v[keys[i]] = s.v[keys[i]] ? 0 : 1; return true; }
      }
      return false;
    },
    readouts(s) {
      const c = CIRC[s.v.g];
      return [['ფორმულა', c.expr], ['გამოსავალი', String(outOf(s))].concat([]), ...(c.carry ? [['გადატანა (Carry)', String(c.carry(s.v.A, s.v.B))]] : []), ['შესასვლელები', c.ins === 1 ? `A=${s.v.A}` : c.ins === 2 ? `A=${s.v.A}, B=${s.v.B}` : `A=${s.v.A}, B=${s.v.B}, C=${s.v.C}`]];
    },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      const c = CIRC[s.v.g], A = s.v.A, B = s.v.B, C = s.v.C, out = outOf(s);
      const gx = w * 0.18, gw = Math.min(110, w * 0.16), gh = 70;
      const yA = c.ins === 1 ? h * 0.5 : c.ins === 2 ? h * 0.32 : h * 0.28, yB = c.ins === 2 ? h * 0.62 : h * 0.5, yC = h * 0.72;
      if (s.v.g === 'COMBO') {
        const y1 = (yA + yB) / 2 - gh / 2;
        line(ctx, [[62, yA], [gx, yA], [gx, y1 + 18]], A); line(ctx, [[62, yB], [gx, yB], [gx, y1 + gh - 18]], B);
        gateShape(ctx, 'AND', gx, y1, gw, gh, A & B);
        const g2x = gx + gw + 60, y2 = (y1 + gh / 2 + yC) / 2 - gh / 2;
        line(ctx, [[gx + gw, y1 + gh / 2], [g2x - 20, y1 + gh / 2], [g2x - 20, y2 + 18], [g2x + 4, y2 + 18]], A & B);
        line(ctx, [[62, yC], [g2x - 20, yC], [g2x - 20, y2 + gh - 18], [g2x + 4, y2 + gh - 18]], C);
        gateShape(ctx, 'OR', g2x, y2, gw, gh, out);
        line(ctx, [[g2x + gw, y2 + gh / 2], [w * 0.62, y2 + gh / 2]], out);
        D.dot(ctx, w * 0.62, y2 + gh / 2, 16, out ? '#ff6b6b' : '#dee2e6', '#495057');
      } else {
        const gy = c.ins === 1 ? yA - gh / 2 : (yA + yB) / 2 - gh / 2;
        line(ctx, [[62, yA], [gx + 4, yA]], A); if (c.ins > 1) line(ctx, [[62, yB], [gx + 4, yB]], B);
        const type = s.v.g === 'HALF' ? 'XOR' : s.v.g;
        gateShape(ctx, type, gx, gy, gw, gh, out);
        const ox = gx + gw + (['NAND', 'NOR'].includes(type) ? 12 : 0);
        line(ctx, [[ox, gy + gh / 2], [w * 0.56, gy + gh / 2]], out);
        D.dot(ctx, w * 0.56, gy + gh / 2, 16, out ? '#ff6b6b' : '#dee2e6', '#495057');
        D.text(ctx, s.v.g === 'HALF' ? 'Σ' : 'Q', w * 0.56, gy + gh / 2 - 22, { align: 'center', weight: 700 });
        if (c.carry) {
          const cy2 = gy + gh + 40, cv = c.carry(A, B);
          line(ctx, [[gx - 16, yA], [gx - 16, cy2 + 18], [gx + 4, cy2 + 18]], A); line(ctx, [[gx - 30, yB], [gx - 30, cy2 + gh - 18], [gx + 4, cy2 + gh - 18]], B);
          gateShape(ctx, 'AND', gx, cy2, gw, gh, cv); line(ctx, [[gx + gw, cy2 + gh / 2], [w * 0.56, cy2 + gh / 2]], cv);
          D.dot(ctx, w * 0.56, cy2 + gh / 2, 16, cv ? '#ffd43b' : '#dee2e6', '#495057'); D.text(ctx, 'C', w * 0.56, cy2 + gh / 2 - 22, { align: 'center', weight: 700 });
        }
      }
      inputBox(ctx, 40, yA, 'A', A); if (c.ins > 1) inputBox(ctx, 40, yB, 'B', B); if (c.ins > 2) inputBox(ctx, 40, yC, 'C', C);
      // ჭეშმარიტობის ცხრილი
      const tx = w * 0.66, cols = c.ins + 1 + (c.carry ? 1 : 0), cw = Math.min(42, (w - tx - 10) / cols), rh = Math.min(26, (h - 40) / (Math.pow(2, c.ins) + 1));
      const heads = ['A', 'B', 'C'].slice(0, c.ins).concat([s.v.g === 'HALF' ? 'Σ' : 'Q']).concat(c.carry ? ['C'] : []);
      heads.forEach((t, i) => D.text(ctx, t, tx + i * cw + cw / 2, 26, { align: 'center', weight: 700 }));
      for (let r = 0; r < Math.pow(2, c.ins); r++) {
        const bits = []; for (let i = c.ins - 1; i >= 0; i--) bits.push((r >> i) & 1);
        const cur = bits.every((b, i) => b === [A, B, C][i]);
        const vals = bits.concat([c.fn(...bits)]).concat(c.carry ? [c.carry(...bits)] : []);
        const y = 34 + r * rh;
        if (cur) { ctx.fillStyle = '#fff3bf'; ctx.fillRect(tx, y, cw * cols, rh); }
        ctx.strokeStyle = '#dee2e6'; ctx.strokeRect(tx, y, cw * cols, rh);
        vals.forEach((v, i) => D.text(ctx, String(v), tx + i * cw + cw / 2, y + rh / 2 + 5, { align: 'center', mono: true, weight: i >= c.ins ? 700 : 500, color: i >= c.ins ? (v ? '#2b8a3e' : '#c92a2a') : '#212529' }));
      }
      D.text(ctx, '👆 შეეხე A / B / C-ს', 10, h - 10, { color: '#868e96', size: 11 });
    },
    bridge: {
      vars: (s) => ({ A: s.v.A, B: s.v.B, C: s.v.C, out: outOf(s) }),
      writable: [],
      example: '// XOR მხოლოდ && , || და ! ოპერატორებით\nif ((A || B) && !(A && B)) {\n  led(true);\n} else {\n  led(false);\n}',
    },
    challenges: [
      { key: 'nand', title: 'NAND = 0', kind: 'state', params: [],
        text: () => 'აირჩიე NAND ელემენტი და დააყენე შესასვლელები ისე, რომ გამოსავალი იყოს 0. რამდენი ასეთი კომბინაციაა?',
        check(s) { const ok = s.v.g === 'NAND' && outOf(s) === 0; return { passed: ok, message: ok ? 'სწორია! NAND = 0 მხოლოდ მაშინ, როცა A = B = 1.' : (s.v.g !== 'NAND' ? 'აირჩიე NAND.' : `გამოსავალი = ${outOf(s)}.`) }; } },
      { key: 'carry', title: 'ორობითი შეკრება: 1 + 1', kind: 'state', params: [],
        text: () => 'ნახევარშემკრებით გამოთვალე 1 + 1. რა არის Σ (ჯამი) და C (გადატანა)? რატომ არის 1 + 1 = 10₂?',
        check(s) { const ok = s.v.g === 'HALF' && s.v.A === 1 && s.v.B === 1; return { passed: ok, message: ok ? 'სწორია! Σ = 0, C = 1 → 10₂ = 2.' : 'აირჩიე „ნახევარშემკრები“ და A = B = 1.' }; } },
      { key: 'rule-xor', title: 'კოდი: XOR საკუთარი ხელით', kind: 'rule', params: [],
        text: () => 'დაწერე წესი, რომელიც LED-ს ანთებს მხოლოდ მაშინ, როცა A და B განსხვავდება (XOR). გამოიყენე &&, || და !.',
        vectors: () => [[0, 0, false], [0, 1, true], [1, 0, true], [1, 1, false]].map(([a, b, e]) => ({ vars: { A: a, B: b }, expect: (o) => (o.led === true) === e, label: `A=${a}, B=${b} → ${e ? '1 (ჩართული)' : '0 (ჩამქრალი)'}` })) },
      { key: 'rule-majority', title: 'კოდი: უმრავლესობის ხმა', kind: 'rule', params: [],
        text: () => 'სამი მოსამართლე (A, B, C) ხმას აძლევს. დაწერე წესი: LED ანთდეს, თუ მინიმუმ ორი ხმა არის 1.',
        vectors: () => [0, 1, 2, 3, 4, 5, 6, 7].map((n) => { const a = (n >> 2) & 1, b = (n >> 1) & 1, c = n & 1, e = a + b + c >= 2; return { vars: { A: a, B: b, C: c }, expect: (o) => (o.led === true) === e, label: `${a}${b}${c} → ${e ? '1' : '0'}` }; }) },
    ],
  });

  /* ============ 2. ორობითი რიცხვები ============ */
  const signed = (v) => (v > 127 ? v - 256 : v);
  S.register({
    key: 'binary', subject: 'cs', title: 'ორობითი რიცხვები (ბიტები და ბაიტი)', icon: '🔢',
    summary: '8 ბიტი = 1 ბაიტი: ათობითი, ორობითი, თექვსმეტობითი და ASCII. შეეხე ბიტებს!',
    animated: false,
    vars: [
      { key: 'val', label: 'მნიშვნელობა', min: 0, max: 255, step: 1, value: 42, unit: '' },
      { key: 'signed', label: 'ნიშნიანი რიცხვი (two’s complement)', type: 'toggle', value: 0 },
    ],
    presets: [{ label: '0', values: { val: 0 } }, { label: '255', values: { val: 255 } }, { label: "'A' = 65", values: { val: 65 } }, { label: '128', values: { val: 128 } }],
    actions: [{ label: '« ძვრა მარცხნივ (×2)', run(s) { s.v.val = (s.v.val << 1) & 255; } }, { label: 'ძვრა მარჯვნივ (÷2) »', run(s) { s.v.val = s.v.val >> 1; } }, { label: '+1', run(s) { s.v.val = (s.v.val + 1) & 255; } }, { label: 'NOT (ინვერსია)', run(s) { s.v.val = (~s.v.val) & 255; } }],
    create: () => ({}), reset() { }, step() { },
    onPointer(s, x, y, w, h) {
      const bw = Math.min(70, (w - 40) / 8), x0 = (w - bw * 8) / 2, y0 = h * 0.18;
      if (y < y0 || y > y0 + bw * 1.1) return false;
      const i = Math.floor((x - x0) / bw); if (i < 0 || i > 7) return false;
      s.v.val ^= (1 << (7 - i)); return true;
    },
    readouts(s) {
      const v = s.v.val;
      return [['ათობითი', s.v.signed ? String(signed(v)) : String(v)], ['ორობითი', v.toString(2).padStart(8, '0').replace(/(\d{4})/, '$1 ')], ['თექვსმეტობითი', '0x' + v.toString(16).toUpperCase().padStart(2, '0')],
        ['ASCII სიმბოლო', v >= 32 && v < 127 ? `'${String.fromCharCode(v)}'` : '—'], ['ჩართული ბიტები', String(v.toString(2).split('').filter((c) => c === '1').length)]];
    },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      const v = s.v.val, bw = Math.min(70, (w - 40) / 8), x0 = (w - bw * 8) / 2, y0 = h * 0.18;
      for (let i = 0; i < 8; i++) {
        const bit = (v >> (7 - i)) & 1, x = x0 + i * bw;
        const place = s.v.signed && i === 0 ? -128 : 1 << (7 - i);
        D.text(ctx, String(place), x + bw / 2, y0 - 10, { align: 'center', size: 12, color: s.v.signed && i === 0 ? '#c92a2a' : '#868e96', weight: 600 });
        ctx.fillStyle = bit ? '#ffd43b' : '#e9ecef'; D.rrect(ctx, x + 4, y0, bw - 8, bw * 1.1, 10); ctx.fill();
        ctx.strokeStyle = bit ? '#f08c00' : '#ced4da'; ctx.lineWidth = 2; D.rrect(ctx, x + 4, y0, bw - 8, bw * 1.1, 10); ctx.stroke();
        if (bit) { const g = ctx.createRadialGradient(x + bw / 2, y0 + bw * 0.4, 2, x + bw / 2, y0 + bw * 0.4, bw * 0.5); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,212,59,0)'); ctx.fillStyle = g; ctx.fillRect(x, y0, bw, bw); }
        D.text(ctx, String(bit), x + bw / 2, y0 + bw * 0.75, { align: 'center', size: Math.min(32, bw * 0.5), weight: 700, mono: true, color: bit ? '#5c3c00' : '#adb5bd' });
      }
      const sum = []; for (let i = 0; i < 8; i++) if ((v >> (7 - i)) & 1) sum.push(s.v.signed && i === 0 ? '(−128)' : String(1 << (7 - i)));
      const dec = s.v.signed ? signed(v) : v;
      D.text(ctx, `${sum.length ? sum.join(' + ') : '0'} = ${dec}`, w / 2, y0 + bw * 1.1 + 40, { align: 'center', size: 16, weight: 700, mono: true });
      D.text(ctx, `0b${v.toString(2).padStart(8, '0')}  ·  0x${v.toString(16).toUpperCase().padStart(2, '0')}${v >= 32 && v < 127 ? `  ·  '${String.fromCharCode(v)}'` : ''}`, w / 2, y0 + bw * 1.1 + 70, { align: 'center', size: 14, mono: true, color: '#5f3dc4' });
      D.text(ctx, '👆 შეეხე ბიტს მის შესაცვლელად', w / 2, h - 12, { align: 'center', color: '#868e96', size: 11 });
    },
    bridge: {
      vars: (s) => ({ value: s.v.val, bit0: s.v.val & 1, bit7: (s.v.val >> 7) & 1 }),
      writable: [],
      example: '// ლუწი თუ კენტი? — უმცროსი ბიტი (bit0) გვეუბნება!\nif (value % 2 == 0) {\n  led(true);\n  log(value + " ლუწია");\n} else {\n  led(false);\n  log(value + " კენტია");\n}',
    },
    challenges: [
      { key: 'target', title: 'ააწყე რიცხვი ბიტებით', kind: 'state', params: [{ key: 'n', label: 'რიცხვი (0–255)', value: 100 }],
        text: (p) => `ჩართე ზუსტად ის ბიტები, რომლებიც ქმნის რიცხვს ${p.n}-ს (უნიშნო). შეეხე ბიტებს ტილოზე.`,
        check(s, p) { const ok = s.v.val === p.n && !s.v.signed; return { passed: ok, message: ok ? `სწორია! ${p.n} = ${p.n.toString(2).padStart(8, '0')}₂` : `ახლა: ${s.v.val} = ${s.v.val.toString(2).padStart(8, '0')}₂.` }; } },
      { key: 'hex', title: 'თექვსმეტობითი კოდი', kind: 'state', params: [{ key: 'h', label: 'HEX (მაგ. A5)', value: 'C3', type: 'text' }],
        text: (p) => `დააყენე მნიშვნელობა 0x${String(p.h).toUpperCase()}. მინიშნება: თითო თექვსმეტობითი ციფრი = 4 ბიტი.`,
        check(s, p) { const t = parseInt(String(p.h), 16), ok = s.v.val === t; return { passed: ok, message: ok ? `სწორია! 0x${String(p.h).toUpperCase()} = ${t} = ${t.toString(2).padStart(8, '0')}₂` : `ახლა 0x${s.v.val.toString(16).toUpperCase()}.` }; } },
      { key: 'negative', title: 'უარყოფითი რიცხვი', kind: 'state', params: [{ key: 'n', label: 'რიცხვი', value: -5 }],
        text: (p) => `ჩართე „ნიშნიანი რიცხვი“ და ბიტებით მიიღე ${p.n}. მინიშნება: ინვერსია (NOT) და +1.`,
        check(s, p) { const ok = !!s.v.signed && signed(s.v.val) === p.n; return { passed: ok, message: ok ? `სწორია! ${p.n} = ${s.v.val.toString(2).padStart(8, '0')}₂ (two’s complement)` : (s.v.signed ? `ახლა ${signed(s.v.val)}.` : 'ჩართე ნიშნიანი რეჟიმი.') }; } },
      { key: 'rule-even', title: 'კოდი: ლუწი რიცხვი', kind: 'rule', params: [],
        text: () => 'დაწერე წესი: LED ანთდეს, როცა value ლუწია, და ჩაქრეს, როცა კენტია. (მინიშნება: % ოპერატორი ან bit0)',
        vectors: () => [[4, true], [7, false], [0, true], [255, false], [128, true]].map(([v, e]) => ({ vars: { value: v, bit0: v & 1 }, expect: (o) => (o.led === true) === e, label: `${v} → ${e ? 'ჩართულია' : 'ჩამქრალია'}` })) },
    ],
  });
})(window.VL);
