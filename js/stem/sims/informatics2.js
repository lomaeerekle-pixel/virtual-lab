/* ============================================================
 * stem/sims/informatics2.js — ინფორმატიკა: დახარისხების ალგორითმები
 * ============================================================ */
(function (VL) {
  'use strict';
  const S = VL.STEM, D = S.draw;

  const ALG = {
    bubble: { n: 'ბუშტისებრი (Bubble sort)', *run(a, st) { for (let i = 0; i < a.length - 1; i++) { for (let j = 0; j < a.length - 1 - i; j++) { st.cmp++; yield { c: [j, j + 1] }; if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; st.sw++; yield { s: [j, j + 1] }; } } st.sorted.add(a.length - 1 - i); } st.sorted.add(0); } },
    selection: { n: 'არჩევით (Selection sort)', *run(a, st) { for (let i = 0; i < a.length - 1; i++) { let m = i; for (let j = i + 1; j < a.length; j++) { st.cmp++; yield { c: [m, j] }; if (a[j] < a[m]) m = j; } if (m !== i) { [a[i], a[m]] = [a[m], a[i]]; st.sw++; yield { s: [i, m] }; } st.sorted.add(i); } st.sorted.add(a.length - 1); } },
    insertion: { n: 'ჩასმით (Insertion sort)', *run(a, st) { for (let i = 1; i < a.length; i++) { let j = i; while (j > 0) { st.cmp++; yield { c: [j - 1, j] }; if (a[j - 1] > a[j]) { [a[j - 1], a[j]] = [a[j], a[j - 1]]; st.sw++; yield { s: [j - 1, j] }; j--; } else break; } } for (let k = 0; k < a.length; k++) st.sorted.add(k); } },
  };
  const ORDER = { random: 'შემთხვევითი', reversed: 'უკუღმა', nearly: 'თითქმის დალაგებული' };
  function makeArr(n, order) {
    let a = Array.from({ length: n }, (_, i) => i + 1);
    if (order === 'reversed') a.reverse();
    else if (order === 'nearly') { for (let k = 0; k < Math.max(1, n / 10); k++) { const i = Math.floor(Math.random() * (n - 1)); [a[i], a[i + 1]] = [a[i + 1], a[i]]; } }
    else for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const stepOnce = (s) => { if (s.done) return; const r = s.gen.next(); if (r.done) { s.done = true; s.hl = null; } else s.hl = r.value; };

  S.register({
    key: 'sorting', subject: 'cs', title: 'დახარისხების ალგორითმები', icon: '📊',
    summary: 'Bubble, Selection, Insertion — შედარებები, გაცვლები და სირთულე O(n²)',
    animated: true, playLabel: '▶ დახარისხება',
    vars: [
      { key: 'alg', label: 'ალგორითმი', type: 'select', value: 'bubble', options: Object.entries(ALG).map(([k, a]) => [k, a.n]), reset: true },
      { key: 'n', label: 'ელემენტების რაოდენობა', min: 5, max: 40, step: 1, value: 15, unit: '', reset: true },
      { key: 'order', label: 'საწყისი რიგი', type: 'select', value: 'random', options: Object.entries(ORDER), reset: true },
      { key: 'sps', label: 'ნაბიჯი წამში', min: 1, max: 60, step: 1, value: 8, unit: '' },
    ],
    presets: [],
    actions: [{ label: '⏭ ერთი ნაბიჯი', run(s) { stepOnce(s); } }, { label: '🔀 ახალი მასივი', run(s) { S.get('sorting').reset(s); } }, { label: '⏩ ბოლომდე', run(s) { let k = 0; while (!s.done && k++ < 100000) stepOnce(s); } }],
    create: () => ({}),
    reset(s) { s.arr = makeArr(s.v.n, s.v.order); s.st = { cmp: 0, sw: 0, sorted: new Set() }; s.gen = ALG[s.v.alg].run(s.arr, s.st); s.done = false; s.hl = null; s.acc = 0; s.t = 0; },
    isDone: (s) => s.done,
    step(s, dt) { s.t += dt; s.acc += dt * s.v.sps; while (s.acc >= 1 && !s.done) { s.acc -= 1; stepOnce(s); } },
    readouts(s) { return [['შედარებები', String(s.st.cmp)], ['გაცვლები', String(s.st.sw)], ['მდგომარეობა', s.done ? '✅ დალაგებულია' : '⏳ მიმდინარეობს'], ['ყველაზე ცუდ შემთხვევაში', `≈ n²/2 = ${Math.round(s.v.n * (s.v.n - 1) / 2)} შედარება`]]; },
    draw(ctx, s, w, h) {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      const n = s.arr.length, bw = (w - 30) / n, mx = n, base = h - 30;
      s.arr.forEach((v, i) => {
        let c = '#adb5bd';
        if (s.done || s.st.sorted.has(i)) c = '#40c057';
        if (s.hl && s.hl.c && s.hl.c.includes(i)) c = '#fab005';
        if (s.hl && s.hl.s && s.hl.s.includes(i)) c = '#fa5252';
        const bh = (v / mx) * (h - 70);
        ctx.fillStyle = c; ctx.fillRect(15 + i * bw + 1, base - bh, Math.max(1, bw - 2), bh);
        if (n <= 20) D.text(ctx, String(v), 15 + i * bw + bw / 2, base + 14, { align: 'center', size: 10 });
      });
      D.text(ctx, ALG[s.v.alg].n, 15, 20, { weight: 700 });
      D.text(ctx, `შედარება ${s.st.cmp} · გაცვლა ${s.st.sw}`, w - 15, 20, { align: 'right', weight: 700, color: '#5f3dc4' });
      D.text(ctx, '■ შედარება  ■ გაცვლა  ■ საბოლოო ადგილზე', 15, 38, { size: 10, color: '#868e96' });
    },
    bridge: {
      vars: (s) => { const j = s.hl && (s.hl.c || s.hl.s); return { a: j ? s.arr[j[0]] : 0, b: j ? s.arr[j[1]] : 0, comparisons: s.st.cmp, swaps: s.st.sw }; },
      writable: [{ key: 'swap', label: 'გაცვლის გადაწყვეტილება (swap)', value: false }],
      example: '// ბუშტისებრი დახარისხების გული: მეზობლების შედარება\nif (a > b) {\n  set("swap", true);\n  log(a + " > " + b + " → ვცვლით");\n} else {\n  set("swap", false);\n}',
    },
    challenges: [
      { key: 'reverse', title: 'ყველაზე ცუდი შემთხვევა', kind: 'state', params: [],
        text: () => 'დაალაგე 10 ელემენტი, რომლებიც უკუღმაა (ბუშტისებრი). დაითვალე შედარებები — ემთხვევა n(n−1)/2 = 45-ს?',
        check(s) { const ok = s.done && s.v.n === 10 && s.v.order === 'reversed' && s.v.alg === 'bubble'; return { passed: ok, message: ok ? `სწორია! ${s.st.cmp} შედარება, ${s.st.sw} გაცვლა.` : 'აირჩიე ბუშტისებრი, 10 ელემენტი, უკუღმა — და დაალაგე ბოლომდე.' }; } },
      { key: 'fewest', title: 'ყველაზე ცოტა გაცვლა', kind: 'state', params: [],
        text: () => '20 შემთხვევით ელემენტზე იპოვე ალგორითმი, რომელიც ყველაზე ცოტა გაცვლას აკეთებს (≤ 19), და დაალაგე ბოლომდე.',
        check(s) { const ok = s.done && s.v.n === 20 && s.st.sw <= 19; return { passed: ok, message: ok ? `სწორია! ${ALG[s.v.alg].n}: ${s.st.sw} გაცვლა.` : (s.done ? `${s.st.sw} გაცვლა — სცადე სხვა ალგორითმი (n = 20).` : 'დაალაგე ბოლომდე.') }; } },
      { key: 'nearly', title: 'თითქმის დალაგებული მასივი', kind: 'state', params: [],
        text: () => '30 „თითქმის დალაგებულ“ ელემენტზე დაალაგე ჩასმით (Insertion) ≤ 40 შედარებით. რატომ არის ის აქ ასეთი სწრაფი?',
        check(s) { const ok = s.done && s.v.n === 30 && s.v.order === 'nearly' && s.v.alg === 'insertion' && s.st.cmp <= 40; return { passed: ok, message: ok ? `სწორია! მხოლოდ ${s.st.cmp} შედარება.` : 'ჩასმით, 30 ელემენტი, თითქმის დალაგებული — ბოლომდე.' }; } },
      { key: 'rule-swap', title: 'კოდი: გაცვლის წესი', kind: 'rule', params: [],
        text: () => 'დაწერე ბუშტისებრი დახარისხების მთავარი წესი: თუ a > b → set("swap", true), სხვა შემთხვევაში set("swap", false).',
        vectors: () => [[5, 3, true], [2, 9, false], [4, 4, false]].map(([a, b, e]) => ({ vars: { a, b }, expect: (o) => o.sets.swap === e, label: `a = ${a}, b = ${b} → swap = ${e}` })) },
    ],
  });
})(window.VL);
