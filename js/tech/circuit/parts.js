/* ============================================================
 * tech/circuit/parts.js — სქემის კონსტრუქტორის კომპონენტები
 *
 * თითოეულ კომპონენტს აქვს:
 *   pins   — გამომყვანები ლოკალურ კოორდინატებში (ბადე 20px)
 *   box    — მონიშვნის/ხატულის საზღვრები [x, y, w, h]
 *   props  — რედაქტირებადი თვისებები (წინაღობა, ფერი, ძაბვა …)
 *   controls — სიმულაციის დროს მართვადი პარამეტრები (სლაიდერები)
 *   render(p) → SVG სტრიქონი, update(g, p, r, ctx) → დინამიკური ვიზუალი
 * ელექტრული მოდელი აღწერილია model.js-ში.
 * ============================================================ */
(function (VL) {
  'use strict';
  const CZ = VL.Circuit = VL.Circuit || {};
  const GRID = CZ.GRID = 20;
  const esc = (s) => VL.U.esc(s);

  const LED_COLORS = CZ.LED_COLORS = {
    red: { c: '#ff3b3b', vf: 1.8, n: 'წითელი' }, yellow: { c: '#ffd43b', vf: 2.0, n: 'ყვითელი' }, green: { c: '#40c057', vf: 2.1, n: 'მწვანე' },
    blue: { c: '#339af0', vf: 3.0, n: 'ლურჯი' }, white: { c: '#e9ecef', vf: 3.0, n: 'თეთრი' },
  };
  const BAND = ['#000', '#8b4513', '#e03131', '#f76707', '#fcc419', '#2f9e44', '#1c7ed6', '#7048e8', '#868e96', '#fff'];
  const fmtOhm = (r) => (r >= 1e6 ? +(r / 1e6).toFixed(2) + ' MΩ' : r >= 1000 ? +(r / 1000).toFixed(2) + ' kΩ' : r + ' Ω');
  CZ.fmtOhm = fmtOhm;
  function bands(r) {
    const e = Math.max(0, Math.floor(Math.log10(r)) - 1);
    const d1 = Math.floor(r / Math.pow(10, e + 1)) % 10, d2 = Math.floor(r / Math.pow(10, e)) % 10;
    return [BAND[d1], BAND[d2], BAND[Math.min(9, e)]];
  }
  const leg = (x1, y1, x2, y2, c = '#adb5bd') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
  const lbl = (x, y, t, a = 'middle', size = 11, color = '#495057') => `<text x="${x}" y="${y}" text-anchor="${a}" font-size="${size}" fill="${color}" class="cz-lbl">${esc(t)}</text>`;

  /* ---------- Arduino-ს პინები ---------- */
  const ARD_TOP = [['GND1', 80, 'GND'], ['D13', 100, '13'], ['D12', 120, '12'], ['D11', 140, '~11'], ['D10', 160, '~10'], ['D9', 180, '~9'], ['D8', 200, '8'],
    ['D7', 240, '7'], ['D6', 260, '~6'], ['D5', 280, '~5'], ['D4', 300, '4'], ['D3', 320, '~3'], ['D2', 340, '2'], ['D1', 360, 'TX 1'], ['D0', 380, 'RX 0']];
  const ARD_BOT = [['3V3', 120, '3.3V'], ['5V', 140, '5V'], ['GND2', 160, 'GND'], ['GND3', 180, 'GND'], ['A0', 240, 'A0'], ['A1', 260, 'A1'], ['A2', 280, 'A2'], ['A3', 300, 'A3'], ['A4', 320, 'A4'], ['A5', 340, 'A5']];
  CZ.ardPinNumber = (id) => (/^D\d+$/.test(id) ? +id.slice(1) : /^A\d$/.test(id) ? 14 + +id.slice(1) : null);
  CZ.pinName = (n) => (n >= 14 ? 'A' + (n - 14) : String(n));

  /* ---------- Breadboard ---------- */
  const BB_COLS = 30;
  const BB_ROWS = [
    { y: 0, kind: 'rail', rail: 'tn', name: '−' }, { y: 20, kind: 'rail', rail: 'tp', name: '+' },
    { y: 60, kind: 'T', name: 'a' }, { y: 80, kind: 'T', name: 'b' }, { y: 100, kind: 'T', name: 'c' }, { y: 120, kind: 'T', name: 'd' }, { y: 140, kind: 'T', name: 'e' },
    { y: 180, kind: 'B', name: 'f' }, { y: 200, kind: 'B', name: 'g' }, { y: 220, kind: 'B', name: 'h' }, { y: 240, kind: 'B', name: 'i' }, { y: 260, kind: 'B', name: 'j' },
    { y: 300, kind: 'rail', rail: 'bp', name: '+' }, { y: 320, kind: 'rail', rail: 'bn', name: '−' },
  ];
  CZ.BB = { COLS: BB_COLS, ROWS: BB_ROWS };
  /** ხვრელის „ზოლის“ (ელექტრულად გაერთიანებული ჯგუფის) გასაღები */
  CZ.bbStrip = (bbId, r, c) => {
    const row = BB_ROWS[r];
    return row.kind === 'rail' ? `${bbId}:R:${row.rail}` : `${bbId}:${row.kind}:${c}`;
  };

  const P = {};
  CZ.PARTS = P;
  const def = (type, o) => { P[type] = { type, ...o }; };

  def('arduino', {
    name: 'Arduino Uno R3', cat: 'controllers', prefix: 'U', single: true,
    desc: 'მიკროკონტროლერი: 14 ციფრული (~ PWM) და 6 ანალოგური პინი, 5V/3.3V კვება.',
    pins: [...ARD_TOP.map(([id, x, l]) => ({ id, x, y: 0, label: l })), ...ARD_BOT.map(([id, x, l]) => ({ id, x, y: 240, label: l }))],
    box: [-20, -20, 440, 280],
    render() {
      return `
        <rect x="-4" y="-20" width="424" height="280" rx="12" fill="#00878f" stroke="#006b72" stroke-width="2"/>
        <rect x="-22" y="20" width="40" height="56" rx="4" fill="#ced4da" stroke="#868e96"/>
        <rect x="-16" y="180" width="34" height="44" rx="6" fill="#212529"/>
        <rect x="70" y="-11" width="140" height="22" rx="3" fill="#1d1d1f"/><rect x="230" y="-11" width="160" height="22" rx="3" fill="#1d1d1f"/>
        <rect x="110" y="229" width="90" height="22" rx="3" fill="#1d1d1f"/><rect x="230" y="229" width="120" height="22" rx="3" fill="#1d1d1f"/>
        ${ARD_TOP.map(([, x, l]) => lbl(x, 26, l, 'middle', 8, '#e3fafc')).join('')}
        ${ARD_BOT.map(([, x, l]) => lbl(x, 222, l, 'middle', 8, '#e3fafc')).join('')}
        <rect x="200" y="110" width="150" height="46" rx="4" fill="#212529"/>
        ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((i) => `<rect x="${204 + i * 10.5}" y="104" width="4" height="6" fill="#adb5bd"/><rect x="${204 + i * 10.5}" y="156" width="4" height="6" fill="#adb5bd"/>`).join('')}
        ${lbl(275, 138, 'ATMEGA328P', 'middle', 9, '#adb5bd')}
        <text x="60" y="120" font-size="26" font-weight="800" fill="#fff" font-family="JetBrains Mono, monospace">UNO</text>
        <text x="60" y="140" font-size="11" fill="#c5f6fa" font-family="JetBrains Mono, monospace">ARDUINO</text>
        <circle class="ard-l" cx="108" cy="46" r="4" fill="#5c3c00"/>${lbl(122, 50, 'L', 'start', 9, '#e3fafc')}
        <circle cx="108" cy="64" r="4" fill="#5c3c00" class="ard-tx"/>${lbl(122, 68, 'TX', 'start', 9, '#e3fafc')}
        <circle cx="370" cy="190" r="4" fill="#5c3c00" class="ard-on"/>${lbl(380, 194, 'ON', 'start', 9, '#e3fafc')}`;
    },
    update(g, p, r, ctx) {
      const sim = ctx.sim;
      g.querySelector('.ard-on').setAttribute('fill', ctx.running ? '#51cf66' : '#5c3c00');
      g.querySelector('.ard-l').setAttribute('fill', ctx.running && sim && sim.pwm[13] > 0 ? '#ffd43b' : '#5c3c00');
      g.querySelector('.ard-tx').setAttribute('fill', ctx.running && sim && sim._tx ? '#ffd43b' : '#5c3c00');
    },
  });

  def('breadboard', {
    name: 'დაფა (Breadboard)', cat: 'controllers', prefix: 'BB',
    desc: 'სადამაკავშირებლო დაფა: ზედა/ქვედა ნახევრის სვეტები (a–e, f–j) და კვების ზოლები (+/−) შიგნით შეერთებულია.',
    pins: [],
    box: [-24, -24, 628, 368],
    render() {
      let s = `<rect x="-24" y="-24" width="628" height="368" rx="8" fill="#f1f3f5" stroke="#ced4da"/>
        <rect x="-24" y="155" width="628" height="10" fill="#dee2e6"/>
        <line x1="-10" y1="-12" x2="590" y2="-12" stroke="#4dabf7" stroke-width="2"/><line x1="-10" y1="32" x2="590" y2="32" stroke="#ff6b6b" stroke-width="2"/>
        <line x1="-10" y1="288" x2="590" y2="288" stroke="#ff6b6b" stroke-width="2"/><line x1="-10" y1="332" x2="590" y2="332" stroke="#4dabf7" stroke-width="2"/>`;
      BB_ROWS.forEach((row) => {
        if (row.kind !== 'rail') s += lbl(-14, row.y + 4, row.name, 'middle', 9, '#868e96');
        else s += lbl(-14, row.y + 4, row.name, 'middle', 11, row.name === '+' ? '#e03131' : '#1c7ed6');
        for (let c = 0; c < BB_COLS; c++) {
          if (row.kind === 'rail' && c % 6 === 5) continue;
          s += `<rect x="${c * 20 - 4}" y="${row.y - 4}" width="8" height="8" rx="1.5" fill="#495057" opacity=".55"/>`;
        }
      });
      for (let c = 0; c < BB_COLS; c += 5) { s += lbl(c * 20, 50, String(c + 1), 'middle', 8, '#adb5bd'); s += lbl(c * 20, 276, String(c + 1), 'middle', 8, '#adb5bd'); }
      return s;
    },
    holes(bb) {
      const out = [];
      BB_ROWS.forEach((row, r) => { for (let c = 0; c < BB_COLS; c++) { if (row.kind === 'rail' && c % 6 === 5) continue; out.push({ r, c, x: c * 20, y: row.y }); } });
      return out;
    },
  });

  def('resistor', {
    name: 'რეზისტორი', cat: 'basic', prefix: 'R',
    desc: 'ზღუდავს დენს: I = U / R. LED-თან ერთად ჩვეულებრივ 220 Ω.',
    pins: [{ id: 'p1', x: 0, y: 0, label: '1' }, { id: 'p2', x: 60, y: 0, label: '2' }],
    box: [-6, -12, 72, 24],
    props: { r: 220 },
    propDefs: [{ key: 'r', label: 'წინაღობა', type: 'select', options: [[10, '10 Ω'], [100, '100 Ω'], [220, '220 Ω'], [330, '330 Ω'], [470, '470 Ω'], [1000, '1 kΩ'], [2200, '2.2 kΩ'], [4700, '4.7 kΩ'], [10000, '10 kΩ'], [47000, '47 kΩ'], [100000, '100 kΩ'], [1000000, '1 MΩ']] }],
    render(p) {
      const b = bands(p.props.r);
      return `${leg(0, 0, 14, 0)}${leg(46, 0, 60, 0)}
        <rect x="12" y="-8" width="36" height="16" rx="7" fill="#e7cfa2" stroke="#b08850"/>
        <rect x="18" y="-8" width="4" height="16" fill="${b[0]}"/><rect x="25" y="-8" width="4" height="16" fill="${b[1]}"/><rect x="32" y="-8" width="4" height="16" fill="${b[2]}"/><rect x="41" y="-8" width="3" height="16" fill="#c9a227"/>
        ${lbl(30, -13, fmtOhm(p.props.r), 'middle', 9)}`;
    },
  });

  def('led', {
    name: 'LED', cat: 'basic', prefix: 'D',
    desc: 'შუქდიოდი: დენი მხოლოდ ანოდიდან (+, გრძელი ფეხი) კათოდისკენ (−). საჭიროებს დენის შემზღუდველ რეზისტორს!',
    pins: [{ id: 'K', x: 0, y: 0, label: 'კათოდი (−)' }, { id: 'A', x: 20, y: 0, label: 'ანოდი (+)' }],
    box: [-8, -50, 36, 56],
    props: { color: 'red' },
    propDefs: [{ key: 'color', label: 'ფერი', type: 'select', options: Object.entries(LED_COLORS).map(([k, v]) => [k, v.n]) }],
    render(p) {
      const c = LED_COLORS[p.props.color] || LED_COLORS.red;
      return `${leg(0, 0, 3, -16)}${leg(20, 0, 20, -10)}${leg(20, -10, 17, -16)}
        <circle class="glow" cx="10" cy="-32" r="22" fill="${c.c}" opacity="0" filter="url(#cz-glow)"/>
        <rect x="-3" y="-20" width="26" height="5" rx="1" fill="${c.c}" opacity=".7"/>
        <path class="body" d="M-1 -18 V-32 A11 11 0 0 1 21 -32 V-18 Z" fill="${c.c}" fill-opacity=".35" stroke="${c.c}" stroke-width="2"/>
        <text class="burn" x="10" y="-28" text-anchor="middle" font-size="14" opacity="0">💥</text>`;
    },
    update(g, p, r) {
      g.querySelector('.glow').setAttribute('opacity', ((r.bright || 0) * 0.9).toFixed(2));
      g.querySelector('.body').setAttribute('fill-opacity', r.burned ? '0.1' : (0.35 + (r.bright || 0) * 0.65).toFixed(2));
      g.querySelector('.burn').setAttribute('opacity', r.burned ? '1' : '0');
    },
  });

  def('rgbled', {
    name: 'RGB LED', cat: 'basic', prefix: 'D',
    desc: 'სამი LED ერთ კორპუსში (საერთო კათოდი). R, G, B ფეხებით ფერების შერევა.',
    pins: [{ id: 'R', x: 0, y: 0, label: 'წითელი (R)' }, { id: 'K', x: 20, y: 0, label: 'საერთო კათოდი (−)' }, { id: 'G', x: 40, y: 0, label: 'მწვანე (G)' }, { id: 'B', x: 60, y: 0, label: 'ლურჯი (B)' }],
    box: [-8, -58, 76, 64],
    render() {
      return `${leg(0, 0, 18, -18)}${leg(20, 0, 26, -18)}${leg(40, 0, 34, -18)}${leg(60, 0, 42, -18)}
        <circle class="glow" cx="30" cy="-36" r="24" fill="#fff" opacity="0" filter="url(#cz-glow)"/>
        <path class="body" d="M17 -18 V-36 A13 13 0 0 1 43 -36 V-18 Z" fill="#f1f3f5" stroke="#adb5bd" stroke-width="2"/>
        ${lbl(0, 14, 'R', 'middle', 8)}${lbl(40, 14, 'G', 'middle', 8)}${lbl(60, 14, 'B', 'middle', 8)}`;
    },
    update(g, p, r) {
      const ch = r.rgb || [0, 0, 0];
      const col = `rgb(${Math.round(255 * ch[0])},${Math.round(255 * ch[1])},${Math.round(255 * ch[2])})`;
      const mx = Math.max(...ch);
      g.querySelector('.glow').setAttribute('fill', col);
      g.querySelector('.glow').setAttribute('opacity', (mx * 0.9).toFixed(2));
      g.querySelector('.body').setAttribute('fill', mx > 0.02 ? col : '#f1f3f5');
    },
  });

  def('button', {
    name: 'ღილაკი', cat: 'basic', prefix: 'S',
    desc: 'დაჭერისას წრედს კეტავს. სიმულაციისას დააჭირე კომპონენტს. Arduino-სთან საჭიროა pull-down რეზისტორი ან INPUT_PULLUP.',
    pins: [{ id: 'p1', x: 0, y: 0, label: '1' }, { id: 'p2', x: 40, y: 0, label: '2' }],
    box: [-4, -44, 48, 48],
    interactive: 'press',
    render() {
      return `${leg(0, 0, 4, -8)}${leg(40, 0, 36, -8)}
        <rect x="2" y="-40" width="36" height="34" rx="4" fill="#343a40"/>
        <circle class="cap" cx="20" cy="-23" r="11" fill="#f03e3e" stroke="#c92a2a" stroke-width="2"/>`;
    },
    update(g, p, r, ctx) {
      const on = ctx.inputs && ctx.inputs.pressed;
      g.querySelector('.cap').setAttribute('r', on ? '9' : '11');
      g.querySelector('.cap').setAttribute('fill', on ? '#a61e4d' : '#f03e3e');
    },
  });

  def('switch', {
    name: 'გადამრთველი', cat: 'basic', prefix: 'SW',
    desc: 'ჩართვა/გამორთვა. სიმულაციისას დააჭირე კომპონენტს ან გამოიყენე „თვისებები“.',
    pins: [{ id: 'p1', x: 0, y: 0, label: '1' }, { id: 'p2', x: 40, y: 0, label: '2' }],
    box: [-6, -32, 52, 36],
    interactive: 'toggle',
    props: { on: false },
    render(p) {
      return `${leg(0, 0, 4, -10)}${leg(40, 0, 36, -10)}
        <rect x="-2" y="-28" width="44" height="18" rx="4" fill="#495057"/>
        <rect class="lever" x="${p.props.on ? 22 : 4}" y="-26" width="14" height="14" rx="3" fill="#f8f9fa"/>
        <text class="sw-t" x="20" y="-31" text-anchor="middle" font-size="8" fill="#868e96">${p.props.on ? 'ON' : 'OFF'}</text>`;
    },
    update(g, p) {
      g.querySelector('.lever').setAttribute('x', p.props.on ? 22 : 4);
      g.querySelector('.sw-t').textContent = p.props.on ? 'ON' : 'OFF';
    },
  });

  def('pot', {
    name: 'პოტენციომეტრი', cat: 'basic', prefix: 'RV',
    desc: 'ცვლადი რეზისტორი (10 kΩ). კიდეები → 5V და GND, შუა (სრიალა) → ანალოგურ პინს.',
    pins: [{ id: 'A', x: 0, y: 0, label: 'კიდე 1' }, { id: 'W', x: 20, y: 0, label: 'სრიალა (შუა)' }, { id: 'B', x: 40, y: 0, label: 'კიდე 2' }],
    box: [-6, -60, 52, 66],
    props: { r: 10000 },
    propDefs: [{ key: 'r', label: 'წინაღობა', type: 'select', options: [[1000, '1 kΩ'], [10000, '10 kΩ'], [100000, '100 kΩ']] }],
    controls: [{ key: 'pos', label: 'მობრუნება', min: 0, max: 1, step: 0.01, def: 0.5, fmt: (v) => Math.round(v * 100) + '%' }],
    render() {
      return `${leg(0, 0, 4, -12)}${leg(20, 0, 20, -12)}${leg(40, 0, 36, -12)}
        <circle cx="20" cy="-34" r="22" fill="#1c7ed6" stroke="#1864ab" stroke-width="2"/>
        <g class="knob"><circle cx="20" cy="-34" r="13" fill="#e7f5ff"/><rect x="18" y="-47" width="4" height="12" rx="2" fill="#1864ab"/></g>`;
    },
    update(g, p, r, ctx) {
      const pos = ctx.inputs ? ctx.inputs.pos : 0.5;
      g.querySelector('.knob').setAttribute('transform', `rotate(${(-135 + pos * 270).toFixed(1)} 20 -34)`);
    },
  });

  def('ldr', {
    name: 'ფოტორეზისტორი (LDR)', cat: 'sensors', prefix: 'LDR',
    desc: 'წინაღობა მცირდება სინათლეზე (~1 kΩ) და იზრდება სიბნელეში (~100 kΩ). 10 kΩ რეზისტორთან ერთად ქმნის ძაბვის გამყოფს.',
    pins: [{ id: 'p1', x: 0, y: 0, label: '1' }, { id: 'p2', x: 20, y: 0, label: '2' }],
    box: [-8, -46, 36, 52],
    controls: [{ key: 'light', label: 'სინათლე', min: 0, max: 1, step: 0.01, def: 0.6, fmt: (v) => Math.round(v * 100) + '%' }],
    render() {
      return `${leg(0, 0, 4, -14)}${leg(20, 0, 16, -14)}
        <circle cx="10" cy="-28" r="15" fill="#fff4e6" stroke="#e8590c" stroke-width="2"/>
        <path d="M1 -32 h4 v8 h4 v-8 h4 v8 h4 v-8" fill="none" stroke="#d9480f" stroke-width="2"/>
        <circle class="sun" cx="30" cy="-44" r="6" fill="#fcc419"/>`;
    },
    update(g, p, r, ctx) { g.querySelector('.sun').setAttribute('opacity', (0.1 + 0.9 * (ctx.inputs ? ctx.inputs.light : 0.6)).toFixed(2)); },
  });

  def('tmp36', {
    name: 'ტემპერატურის სენსორი TMP36', cat: 'sensors', prefix: 'T',
    desc: 'გამოსავალი ძაბვა: U = 0.5 V + 0.01 V × T(°C). ფეხები: +Vs, Vout, GND.',
    pins: [{ id: 'VS', x: 0, y: 0, label: '+Vs (5V)' }, { id: 'VO', x: 20, y: 0, label: 'Vout' }, { id: 'GND', x: 40, y: 0, label: 'GND' }],
    box: [-6, -44, 52, 50],
    controls: [{ key: 'temp', label: 'ტემპერატურა', min: -40, max: 125, step: 1, def: 25, fmt: (v) => v + ' °C' }],
    render() {
      return `${leg(0, 0, 8, -12)}${leg(20, 0, 20, -12)}${leg(40, 0, 32, -12)}
        <path d="M2 -12 V-30 A18 14 0 0 1 38 -30 V-12 Z" fill="#212529"/>
        ${lbl(20, -22, 'TMP', 'middle', 8, '#ced4da')}<text class="tv" x="20" y="-46" text-anchor="middle" font-size="9" fill="#e8590c"></text>`;
    },
    update(g, p, r, ctx) { g.querySelector('.tv').textContent = ctx.running ? `${ctx.inputs ? ctx.inputs.temp : 25}°C` : ''; },
  });

  def('battery', {
    name: 'ბატარეა', cat: 'basic', prefix: 'BAT',
    desc: 'დენის წყარო. + და − პოლუსები.',
    pins: [{ id: 'P', x: 0, y: 0, label: '+' }, { id: 'N', x: 40, y: 0, label: '−' }],
    box: [-10, -96, 60, 102],
    props: { v: 9 },
    propDefs: [{ key: 'v', label: 'ძაბვა', type: 'select', options: [[1.5, '1.5 V (AA)'], [3, '3 V (2×AA)'], [4.5, '4.5 V'], [9, '9 V']] }],
    render(p) {
      return `<path d="M0 0 V-14" stroke="#e03131" stroke-width="3"/><path d="M40 0 V-14" stroke="#212529" stroke-width="3"/>
        <rect x="-6" y="-84" width="52" height="70" rx="5" fill="#343a40"/><rect x="-6" y="-84" width="52" height="22" rx="5" fill="#f59f00"/>
        <rect x="4" y="-92" width="10" height="8" fill="#adb5bd"/><rect x="26" y="-92" width="10" height="8" fill="#adb5bd"/>
        ${lbl(20, -40, p.props.v + ' V', 'middle', 13, '#fff')}${lbl(8, -66, '+', 'middle', 12, '#212529')}${lbl(32, -66, '−', 'middle', 12, '#212529')}`;
    },
  });

  def('motor', {
    name: 'DC ძრავა', cat: 'actuators', prefix: 'M',
    desc: 'ბრუნავს ძაბვის პროპორციულად. დიდ დენს მოიხმარს — Arduino-ს პინიდან პირდაპირ არ ჩართო, გამოიყენე ტრანზისტორი!',
    pins: [{ id: 'p1', x: 0, y: 0, label: '+' }, { id: 'p2', x: 40, y: 0, label: '−' }],
    box: [-14, -82, 68, 88],
    render() {
      return `${leg(0, 0, 8, -16)}${leg(40, 0, 32, -16)}
        <circle cx="20" cy="-46" r="32" fill="#adb5bd" stroke="#495057" stroke-width="2"/>
        <g class="rotor">${[0, 120, 240].map((a) => `<ellipse cx="20" cy="-62" rx="6" ry="15" fill="#4dabf7" transform="rotate(${a} 20 -46)"/>`).join('')}</g>
        <circle cx="20" cy="-46" r="5" fill="#212529"/>`;
    },
    update(g, p, r) {
      p._ang = ((p._ang || 0) + (r.speed || 0) * 25) % 360;
      g.querySelector('.rotor').setAttribute('transform', `rotate(${p._ang.toFixed(1)} 20 -46)`);
    },
  });

  def('servo', {
    name: 'სერვო მოტორი', cat: 'actuators', prefix: 'SV',
    desc: 'კუთხე 0°–180°. ფეხები: GND (ყავისფერი), +5V (წითელი), სიგნალი (ნარინჯისფერი) → Arduino-ს პინი. კოდში: Servo.attach(პინი).',
    pins: [{ id: 'GND', x: 0, y: 0, label: 'GND' }, { id: 'V', x: 20, y: 0, label: '+5V' }, { id: 'SIG', x: 40, y: 0, label: 'სიგნალი' }],
    box: [-36, -112, 112, 118],
    render() {
      return `<path d="M0 0 V-22 M20 0 V-22 M40 0 V-22" stroke-width="3" stroke-linecap="round" stroke="#8b4513"/><path d="M20 0 V-22" stroke="#e03131" stroke-width="3"/><path d="M40 0 V-22" stroke="#f76707" stroke-width="3"/>
        <rect x="-30" y="-76" width="100" height="54" rx="6" fill="#4263eb"/><rect x="-36" y="-56" width="112" height="12" rx="3" fill="#364fc7"/>
        <circle cx="0" cy="-49" r="13" fill="#dbe4ff"/>
        <g class="arm"><rect x="-4" y="-92" width="8" height="44" rx="4" fill="#fff" stroke="#adb5bd"/></g><circle cx="0" cy="-49" r="5" fill="#adb5bd"/>
        <text class="ang" x="44" y="-36" text-anchor="middle" font-size="10" fill="#fff">90°</text>`;
    },
    update(g, p, r) {
      const a = r.angle ?? 90;
      g.querySelector('.arm').setAttribute('transform', `rotate(${90 - a} 0 -49)`);
      g.querySelector('.ang').textContent = r.powered === false ? '⚠ კვება' : `${a}°`;
    },
  });

  def('buzzer', {
    name: 'პიეზო ზუმერი', cat: 'actuators', prefix: 'BZ',
    desc: 'ხმის წყარო. tone(პინი, სიხშირე) აჟღერებს მოცემულ ნოტს.',
    pins: [{ id: 'P', x: 0, y: 0, label: '+' }, { id: 'N', x: 20, y: 0, label: '−' }],
    box: [-14, -54, 48, 60],
    render() {
      return `${leg(0, 0, 4, -12)}${leg(20, 0, 16, -12)}
        <circle cx="10" cy="-30" r="19" fill="#212529"/><circle cx="10" cy="-30" r="5" fill="#495057"/>
        <g class="waves" opacity="0" stroke="#7048e8" stroke-width="2" fill="none"><path d="M33 -40 Q39 -30 33 -20"/><path d="M39 -46 Q48 -30 39 -14"/></g>${lbl(-6, -42, '+', 'middle', 10, '#e03131')}`;
    },
    update(g, p, r) { g.querySelector('.waves').setAttribute('opacity', r.on ? '1' : '0'); },
  });

  def('npn', {
    name: 'NPN ტრანზისტორი', cat: 'basic', prefix: 'Q',
    desc: 'ელექტრონული გასაღები: ბაზაზე (B) მცირე დენი ხსნის დიდ დენს კოლექტორიდან (C) ემიტერისკენ (E). ბაზაზე რეზისტორი (1 kΩ)!',
    pins: [{ id: 'E', x: 0, y: 0, label: 'ემიტერი (E)' }, { id: 'B', x: 20, y: 0, label: 'ბაზა (B)' }, { id: 'C', x: 40, y: 0, label: 'კოლექტორი (C)' }],
    box: [-6, -44, 52, 50],
    render() {
      return `${leg(0, 0, 8, -12)}${leg(20, 0, 20, -12)}${leg(40, 0, 32, -12)}
        <path d="M2 -12 V-30 A18 14 0 0 1 38 -30 V-12 Z" fill="#343a40"/>${lbl(20, -22, 'NPN', 'middle', 8, '#ced4da')}
        ${lbl(0, 14, 'E', 'middle', 8)}${lbl(20, 14, 'B', 'middle', 8)}${lbl(40, 14, 'C', 'middle', 8)}
        <circle class="q-on" cx="34" cy="-36" r="3" fill="#495057"/>`;
    },
    update(g, p, r) { g.querySelector('.q-on').setAttribute('fill', r.on ? '#51cf66' : '#495057'); },
  });

  def('meter', {
    name: 'მულტიმეტრი', cat: 'tools', prefix: 'MM',
    desc: 'ზომავს ძაბვას (V, პარალელურად) ან დენს (A, მიმდევრობით). წითელი ზონდი +, შავი COM.',
    pins: [{ id: 'COM', x: 0, y: 0, label: 'COM (−)' }, { id: 'P', x: 40, y: 0, label: '+ (V/A)' }],
    box: [-36, -138, 112, 144],
    props: { mode: 'V' },
    propDefs: [{ key: 'mode', label: 'რეჟიმი', type: 'select', options: [['V', 'ძაბვა (V)'], ['A', 'დენი (A)']] }],
    render(p) {
      return `<path d="M0 0 V-22" stroke="#212529" stroke-width="3"/><path d="M40 0 V-22" stroke="#e03131" stroke-width="3"/>
        <rect x="-30" y="-132" width="100" height="112" rx="10" fill="#fcc419" stroke="#e67700" stroke-width="2"/>
        <rect x="-20" y="-122" width="80" height="34" rx="4" fill="#d3f9d8" stroke="#2b8a3e"/>
        <text class="disp" x="56" y="-99" text-anchor="end" font-size="15" font-family="JetBrains Mono, monospace" font-weight="700" fill="#212529">----</text>
        <circle cx="20" cy="-58" r="16" fill="#343a40"/>${lbl(20, -54, p.props.mode, 'middle', 12, '#fff')}
        <circle cx="0" cy="-30" r="5" fill="#212529"/><circle cx="40" cy="-30" r="5" fill="#e03131"/>`;
    },
    update(g, p, r, ctx) {
      const d = g.querySelector('.disp');
      if (!ctx.running || r.reading === undefined) { d.textContent = '----'; return; }
      const v = r.reading;
      if (p.props.mode === 'A') d.textContent = Math.abs(v) < 1 ? (v * 1000).toFixed(1) + 'mA' : v.toFixed(2) + 'A';
      else d.textContent = v.toFixed(2) + 'V';
    },
  });

  CZ.CATS = [
    ['basic', '🧩 საბაზისო'], ['sensors', '🌡️ სენსორები'], ['actuators', '⚙️ აქტუატორები'], ['controllers', '🎛️ კონტროლერები'], ['tools', '🔧 ინსტრუმენტები'],
  ];

  /* ---------- გეომეტრია ---------- */
  CZ.rotPt = (x, y, rot) => {
    switch (((rot % 360) + 360) % 360) {
      case 90: return [-y, x];
      case 180: return [-x, -y];
      case 270: return [y, -x];
      default: return [x, y];
    }
  };
  CZ.pinWorld = (part, pin) => { const [x, y] = CZ.rotPt(pin.x, pin.y, part.rot || 0); return [part.x + x, part.y + y]; };
  CZ.partBox = (part) => {
    const d = P[part.type]; const [bx, by, bw, bh] = d.box;
    const pts = [[bx, by], [bx + bw, by], [bx, by + bh], [bx + bw, by + bh]].map(([x, y]) => CZ.rotPt(x, y, part.rot || 0));
    const xs = pts.map((q) => q[0] + part.x), ys = pts.map((q) => q[1] + part.y);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
  };
})(window.VL);
