/* ============================================================
 * tech/circuit/parts-extra.js — დამატებითი კომპონენტები
 * კონდენსატორი · დიოდი · 7-სეგმენტიანი ინდიკატორი · ულტრაბგერითი სენსორი
 * მოძრაობის სენსორი (PIR) · ნათურა · რელე · ძალის სენსორი · ნიადაგის ტენიანობა
 * LCD 16×2 (I2C) · ჯოისტიკი
 * თითოეულს აქვს საკუთარი ელექტრული მოდელი: stamp() და result()
 * ============================================================ */
(function (VL) {
  'use strict';
  const CZ = VL.Circuit, P = CZ.PARTS;
  const esc = (s) => VL.U.esc(s);
  const leg = (x1, y1, x2, y2, c = '#adb5bd') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
  const lbl = (x, y, t, a = 'middle', size = 10, color = '#495057') => `<text x="${x}" y="${y}" text-anchor="${a}" font-size="${size}" fill="${color}" class="cz-lbl">${esc(t)}</text>`;
  const def = (type, o) => { P[type] = { type, ...o }; };
  const pinsRow = (ids) => ids.map(([id, label], i) => ({ id, x: i * 20, y: 0, label }));
  const ardOn = (c, pid, pin) => c.ardPinsOnNet[c.net(pid, pin)] || [];

  /* ---------- კონდენსატორი ---------- */
  def('capacitor', {
    name: 'კონდენსატორი', cat: 'basic', prefix: 'C',
    desc: 'აგროვებს მუხტს: იმუხტება და განიმუხტება დროში (τ = R·C). ელექტროლიტური — „−“ ზოლიანი ფეხი GND-სკენ!',
    pins: pinsRow([['P', '+ (გრძელი ფეხი)'], ['N', '− (ზოლი)']]),
    box: [-10, -60, 40, 66],
    props: { c: 1000 },
    propDefs: [{ key: 'c', label: 'ტევადობა', type: 'select', options: [[10, '10 µF'], [100, '100 µF'], [470, '470 µF'], [1000, '1000 µF'], [4700, '4700 µF']] }],
    render(p) {
      return `${leg(0, 0, 2, -14)}${leg(20, 0, 18, -14)}
        <rect x="-6" y="-56" width="32" height="44" rx="8" fill="#1c3d8c"/><rect x="14" y="-56" width="12" height="44" fill="#adb5bd" opacity=".55"/>
        ${lbl(20, -32, '−', 'middle', 13, '#212529')}<rect class="fill" x="-3" y="-15" width="26" height="0" fill="#74c0fc" opacity=".8"/>
        ${lbl(10, -60, p.props.c + 'µF', 'middle', 9)}`;
    },
    stamp(p, N, inp, h) {
      const C = p.props.c * 1e-6, vc = h.circuit.capV[p.id] || 0;
      h.V(N('P'), N('N'), vc, Math.max(h.dt, 1e-6) / C, p.id, 'cap');
    },
    result(p, r, k) {
      r.V = k.Vd(p.id, 'P', 'N'); r.I = k.I(p.id, 'cap');
      if (k.circuit.dt > 0) k.circuit.capV[p.id] = r.V;
      if (r.V < -1 && k.circuit.running) k.W.set('crev' + p.id, `⚠️ ${k.name}: კონდენსატორი შებრუნებულია — „+“ უფრო მაღალ ძაბვაზე უნდა იყოს.`);
    },
    update(g, p, r) { const lv = Math.max(0, Math.min(1, (r.V || 0) / 9)); const el = g.querySelector('.fill'); el.setAttribute('height', (40 * lv).toFixed(1)); el.setAttribute('y', (-15 - 40 * lv).toFixed(1)); },
  });

  /* ---------- დიოდი ---------- */
  def('diode', {
    name: 'დიოდი 1N4007', cat: 'basic', prefix: 'D',
    desc: 'დენს ატარებს მხოლოდ ერთი მიმართულებით (ანოდი → კათოდი, ზოლი). ძაბვის ვარდნა ≈ 0.7 V. იცავს რელესა და ძრავას წრედებს.',
    pins: [{ id: 'A', x: 0, y: 0, label: 'ანოდი (+)' }, { id: 'K', x: 60, y: 0, label: 'კათოდი (ზოლი)' }],
    box: [-6, -12, 72, 24],
    render() { return `${leg(0, 0, 16, 0)}${leg(44, 0, 60, 0)}<rect x="14" y="-7" width="32" height="14" rx="3" fill="#212529"/><rect x="38" y="-7" width="5" height="14" fill="#ced4da"/>`; },
    stamp(p, N, inp, h) { h.D(N('A'), N('K'), 0.7, 0.5, p.id, 'd'); },
    result(p, r, k) { r.I = k.I(p.id, 'd'); r.V = k.Vd(p.id, 'A', 'K'); },
  });

  /* ---------- 7-სეგმენტიანი ინდიკატორი ---------- */
  const SEG = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'];
  const SEGPATH = { a: [16, -96, 32, 7], b: [48, -90, 7, 32], c: [48, -52, 7, 32], d: [16, -18, 32, 7], e: [10, -52, 7, 32], f: [10, -90, 7, 32], g: [16, -57, 32, 7] };
  def('sevenseg', {
    name: '7-სეგმენტიანი ინდიკატორი', cat: 'basic', prefix: 'DS',
    desc: 'ციფრის ჩვენება 7 LED-სეგმენტით (a–g) და წერტილით (dp). საერთო კათოდი (COM) → GND რეზისტორით.',
    pins: pinsRow([...SEG.map((s) => [s, 'სეგმენტი ' + s]), ['COM', 'საერთო კათოდი (−)']]),
    box: [-8, -110, 176, 116],
    render() {
      return `${SEG.concat(['COM']).map((s, i) => leg(i * 20, 0, i * 20, -8) + lbl(i * 20, 14, s, 'middle', 8)).join('')}
        <rect x="-4" y="-108" width="168" height="100" rx="6" fill="#212529"/>
        <g transform="translate(46 0)">${Object.entries(SEGPATH).map(([k, [x, y, w, hh]]) => `<rect class="sg-${k}" x="${x}" y="${y}" width="${w}" height="${hh}" rx="3" fill="#ff3b3b" opacity=".12"/>`).join('')}
        <circle class="sg-dp" cx="64" cy="-16" r="4" fill="#ff3b3b" opacity=".12"/></g>`;
    },
    stamp(p, N, inp, h) { if (h.circuit.burned[p.id]) return; SEG.forEach((s) => h.D(N(s), N('COM'), 1.8, 10, p.id, s)); },
    result(p, r, k) {
      r.seg = {}; let peak = 0;
      SEG.forEach((s) => { r.seg[s] = Math.min(1, Math.max(0, k.I(p.id, s)) / 0.012); peak = Math.max(peak, k.Pk(p.id, s)); });
      const tot = SEG.reduce((a, s) => a + Math.max(0, k.I(p.id, s)), 0);
      if (peak > 0.06 && k.circuit.running) { k.circuit.burned[p.id] = true; k.circuit.burnMsgs[p.id] = `💥 ${k.name}: სეგმენტი დაიწვა — სეგმენტებს ან COM-ს სჭირდება რეზისტორი (220 Ω).`; }
      const mx = Math.max(...SEG.map((s) => r.seg[s])), thr = Math.max(0.03, mx * 0.4);
      r.I = tot; r.digit = mx < 0.03 ? null : Object.entries(DIGITS).find(([, segs]) => SEG.slice(0, 7).every((s) => (r.seg[s] > thr) === segs.includes(s)));
      r.digit = r.digit ? r.digit[0] : null;
      if (k.circuit.burned[p.id]) r.burned = true;
    },
    update(g, p, r) { const mx = Math.max(0.0001, ...SEG.map((s) => (r.seg || {})[s] || 0)); SEG.forEach((s) => { const el = g.querySelector('.sg-' + s); const v = ((r.seg || {})[s] || 0); if (el) el.setAttribute('opacity', r.burned ? '0.05' : (0.12 + 0.88 * Math.min(1, v * 2.5)).toFixed(2)); }); void mx; },
  });
  const DIGITS = CZ.SEG_DIGITS = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };

  /* ---------- ულტრაბგერითი სენსორი HC-SR04 ---------- */
  def('ultrasonic', {
    name: 'ულტრაბგერითი სენსორი HC-SR04', cat: 'sensors', prefix: 'US',
    desc: 'ზომავს მანძილს (2–400 სმ): TRIG-ზე 10 მკწმ HIGH, შემდეგ pulseIn(ECHO, HIGH) / 58 = სმ.',
    pins: pinsRow([['VCC', 'VCC (5V)'], ['TRIG', 'Trig'], ['ECHO', 'Echo'], ['GND', 'GND']]),
    box: [-30, -70, 120, 76],
    controls: [{ key: 'dist', label: 'მანძილი საგნამდე', min: 2, max: 400, step: 1, def: 100, fmt: (v) => v + ' სმ' }],
    render() {
      return `${['VCC', 'Trig', 'Echo', 'GND'].map((t, i) => leg(i * 20, 0, i * 20, -12) + lbl(i * 20, 14, t, 'middle', 7)).join('')}
        <rect x="-26" y="-60" width="112" height="48" rx="4" fill="#1971c2"/>
        <circle cx="4" cy="-36" r="17" fill="#ced4da" stroke="#868e96" stroke-width="3"/><circle cx="56" cy="-36" r="17" fill="#ced4da" stroke="#868e96" stroke-width="3"/>
        <circle cx="4" cy="-36" r="8" fill="#495057"/><circle cx="56" cy="-36" r="8" fill="#495057"/>
        <g class="wave" opacity="0" stroke="#74c0fc" stroke-width="2" fill="none"><path d="M18 -80 Q30 -88 42 -80"/><path d="M12 -92 Q30 -104 48 -92"/></g>
        <text class="dv" x="30" y="-64" text-anchor="middle" font-size="10" fill="#1864ab"></text>`;
    },
    stamp(p, N, inp, h) { h.R(N('VCC'), N('GND'), 500, p.id, 'q'); },
    result(p, r, k) { r.V = k.Vd(p.id, 'VCC', 'GND'); r.powered = r.V > 4; r.dist = (k.circuit.inputs[p.id] || {}).dist ?? 100; },
    update(g, p, r, ctx) { g.querySelector('.wave').setAttribute('opacity', ctx.running && r.powered ? String(0.4 + 0.6 * Math.abs(Math.sin(Date.now() / 150))) : '0'); g.querySelector('.dv').textContent = ctx.running ? `${ctx.inputs ? ctx.inputs.dist : 100} სმ` : ''; },
  });

  /* ---------- მოძრაობის სენსორი (PIR) ---------- */
  def('pir', {
    name: 'მოძრაობის სენსორი (PIR)', cat: 'sensors', prefix: 'PIR',
    desc: 'მოძრაობისას OUT ფეხზე ჩნდება HIGH (5V). სიმულაციისას დააჭირე სენსორს ან ჩართე „მოძრაობა“.',
    pins: pinsRow([['VCC', 'VCC (5V)'], ['OUT', 'OUT (სიგნალი)'], ['GND', 'GND']]),
    box: [-14, -64, 68, 70],
    interactive: 'press',
    render() {
      return `${['VCC', 'OUT', 'GND'].map((t, i) => leg(i * 20, 0, i * 20, -12) + lbl(i * 20, 14, t, 'middle', 7)).join('')}
        <rect x="-10" y="-30" width="60" height="18" rx="3" fill="#2b8a3e"/>
        <path d="M-2 -30 A22 26 0 0 1 42 -30 Z" fill="#f1f3f5" stroke="#ced4da"/>
        <path d="M6 -40 h28 M8 -48 h24" stroke="#dee2e6"/>
        <circle class="pled" cx="44" cy="-21" r="3" fill="#495057"/><text class="pm" x="20" y="-60" text-anchor="middle" font-size="12" opacity="0">🚶</text>`;
    },
    stamp(p, N, inp, h) {
      const m = !!inp.pressed;
      h.R(N('VCC'), N('GND'), 20000, p.id, 'q');
      h.SW(N('VCC'), N('OUT'), () => m, 100, p.id, 'hi', m);
      h.SW(N('OUT'), N('GND'), () => !m, 100, p.id, 'lo', !m);
    },
    result(p, r, k) { r.V = k.Vd(p.id, 'VCC', 'GND'); r.out = k.Vd(p.id, 'OUT', 'GND') > 2.5; },
    update(g, p, r, ctx) { const on = ctx.running && ctx.inputs && ctx.inputs.pressed; g.querySelector('.pled').setAttribute('fill', on ? '#ff6b6b' : '#495057'); g.querySelector('.pm').setAttribute('opacity', on ? '1' : '0'); },
  });

  /* ---------- ნათურა ---------- */
  def('bulb', {
    name: 'ნათურა', cat: 'actuators', prefix: 'L',
    desc: 'ვარვარების ნათურა (~40 Ω). ბევრ დენს მოიხმარს — Arduino-ს პინიდან პირდაპირ არ ჩართო (გამოიყენე რელე ან ტრანზისტორი).',
    pins: pinsRow([['p1', '1'], ['p2', '2']]),
    box: [-20, -74, 60, 80],
    render() {
      return `${leg(0, 0, 4, -18)}${leg(20, 0, 16, -18)}
        <circle class="glow" cx="10" cy="-44" r="34" fill="#ffd43b" opacity="0" filter="url(#cz-glow)"/>
        <circle class="glass" cx="10" cy="-44" r="20" fill="#fff9db" fill-opacity=".5" stroke="#adb5bd" stroke-width="2"/>
        <path d="M2 -40 l3 -8 l3 8 l3 -8 l3 8 l3 -8" fill="none" stroke="#868e96" stroke-width="1.5" class="fil"/>
        <rect x="0" y="-26" width="20" height="10" rx="2" fill="#868e96"/>`;
    },
    stamp(p, N, inp, h) { h.R(N('p1'), N('p2'), 40, p.id, 'r'); },
    result(p, r, k) { r.I = k.I(p.id, 'r'); r.V = k.Vd(p.id, 'p1', 'p2'); r.bright = Math.min(1, Math.abs(r.I * r.V) / 0.8); },
    update(g, p, r) { const b = r.bright || 0; g.querySelector('.glow').setAttribute('opacity', (b * 0.9).toFixed(2)); g.querySelector('.glass').setAttribute('fill-opacity', (0.5 + b * 0.5).toFixed(2)); g.querySelector('.fil').setAttribute('stroke', b > 0.05 ? '#f08c00' : '#868e96'); },
  });

  /* ---------- რელე ---------- */
  def('relay', {
    name: 'რელე (5V)', cat: 'actuators', prefix: 'K',
    desc: 'ელექტრომაგნიტური გასაღები: კოჭაზე (C1–C2) 5V → COM უერთდება NO-ს. მართე ტრანზისტორით და დაიცავი დიოდით.',
    pins: pinsRow([['C1', 'კოჭა +'], ['C2', 'კოჭა −'], ['COM', 'COM (საერთო)'], ['NO', 'NO (ნორმალურად ღია)'], ['NC', 'NC (ნორმალურად დაკეტილი)']]),
    box: [-10, -70, 100, 76],
    render() {
      return `${['C1', 'C2', 'COM', 'NO', 'NC'].map((t, i) => leg(i * 20, 0, i * 20, -10) + lbl(i * 20, 14, t, 'middle', 7)).join('')}
        <rect x="-6" y="-62" width="92" height="52" rx="4" fill="#1971c2"/>
        <rect x="2" y="-52" width="26" height="34" rx="3" fill="#e7f5ff"/>${[0, 1, 2, 3, 4].map((i) => `<line x1="4" y1="${-48 + i * 7}" x2="26" y2="${-48 + i * 7}" stroke="#c92a2a" stroke-width="2"/>`).join('')}
        <circle cx="44" cy="-30" r="3" fill="#fff"/><circle cx="72" cy="-46" r="3" fill="#fff"/><circle cx="72" cy="-18" r="3" fill="#fff"/>
        <line class="arm" x1="44" y1="-30" x2="72" y2="-18" stroke="#ffd43b" stroke-width="3" stroke-linecap="round"/>
        ${lbl(64, -50, 'NO', 'end', 7, '#e7f5ff')}${lbl(64, -10, 'NC', 'end', 7, '#e7f5ff')}`;
    },
    stamp(p, N, inp, h) {
      const c1 = N('C1'), c2 = N('C2');
      h.R(c1, c2, 70, p.id, 'coil');
      const on = (Vn) => Math.abs(Vn[c1] - Vn[c2]) > 3.5;
      h.SW(N('COM'), N('NO'), on, 0.05, p.id, 'no');
      h.SW(N('COM'), N('NC'), (Vn) => !on(Vn), 0.05, p.id, 'nc', true);
    },
    result(p, r, k) { r.V = k.Vd(p.id, 'C1', 'C2'); r.on = Math.abs(r.V) > 3.5; r.I = k.I(p.id, 'coil'); },
    update(g, p, r) { g.querySelector('.arm').setAttribute('y2', r.on ? '-46' : '-18'); },
  });

  /* ---------- ძალის სენსორი (FSR) ---------- */
  def('fsr', {
    name: 'ძალის სენსორი (FSR)', cat: 'sensors', prefix: 'FSR',
    desc: 'წინაღობა მცირდება დაწოლისას (~1 MΩ → 300 Ω). 10 kΩ რეზისტორთან ერთად ქმნის ძაბვის გამყოფს.',
    pins: pinsRow([['p1', '1'], ['p2', '2']]),
    box: [-16, -70, 52, 76],
    controls: [{ key: 'force', label: 'დაწოლის ძალა', min: 0, max: 1, step: 0.01, def: 0, fmt: (v) => Math.round(v * 100) + '%' }],
    render() { return `${leg(0, 0, 4, -20)}${leg(20, 0, 16, -20)}<rect x="2" y="-30" width="16" height="12" fill="#ced4da"/><circle class="pad" cx="10" cy="-46" r="20" fill="#495057" stroke="#212529" stroke-width="2"/><circle cx="10" cy="-46" r="12" fill="none" stroke="#868e96" stroke-dasharray="3 3"/>`; },
    stamp(p, N, inp, h) { const fr = inp.force ?? 0; h.R(N('p1'), N('p2'), 300 + 1e6 * Math.pow(1 - fr, 4), p.id, 'r'); },
    result(p, r, k) { r.V = k.Vd(p.id, 'p1', 'p2'); r.I = k.I(p.id, 'r'); },
    update(g, p, r, ctx) { const fr = ctx.inputs ? ctx.inputs.force : 0; g.querySelector('.pad').setAttribute('fill', fr > 0.05 ? `rgb(${80 + 150 * fr},70,70)` : '#495057'); },
  });

  /* ---------- ნიადაგის ტენიანობის სენსორი ---------- */
  def('soil', {
    name: 'ნიადაგის ტენიანობის სენსორი', cat: 'sensors', prefix: 'SM',
    desc: 'SIG ძაბვა იზრდება ტენიანობასთან ერთად (0–5V → analogRead 0–1023). ფეხები: VCC, GND, SIG.',
    pins: pinsRow([['VCC', 'VCC (5V)'], ['GND', 'GND'], ['SIG', 'SIG (ანალოგური)']]),
    box: [-10, -110, 60, 116],
    controls: [{ key: 'moist', label: 'ტენიანობა', min: 0, max: 1, step: 0.01, def: 0.3, fmt: (v) => Math.round(v * 100) + '%' }],
    render() {
      return `${['VCC', 'GND', 'SIG'].map((t, i) => leg(i * 20, 0, i * 20, -10) + lbl(i * 20, 14, t, 'middle', 7)).join('')}
        <rect x="-6" y="-34" width="52" height="24" rx="3" fill="#2f9e44"/><path d="M2 -34 V-104 L8 -110 L14 -104 V-34 Z M26 -34 V-104 L32 -110 L38 -104 V-34 Z" fill="#c9a227"/>
        <rect class="drops" x="-6" y="-104" width="52" height="0" fill="#74c0fc" opacity=".35"/>`;
    },
    stamp(p, N, inp, h) { const m = inp.moist ?? 0.3; h.R(N('VCC'), N('SIG'), 10000 * (1 - m) + 10, p.id, 'a'); h.R(N('SIG'), N('GND'), 10000 * m + 10, p.id, 'b'); },
    result(p, r, k) { r.Vout = k.Vd(p.id, 'SIG', 'GND'); },
    update(g, p, r, ctx) { const m = ctx.inputs ? ctx.inputs.moist : 0.3; const el = g.querySelector('.drops'); el.setAttribute('height', (70 * m).toFixed(1)); el.setAttribute('y', (-34 - 70 * m).toFixed(1)); },
  });

  /* ---------- LCD 16×2 (I2C) ---------- */
  def('lcd', {
    name: 'LCD ეკრანი 16×2 (I2C)', cat: 'actuators', prefix: 'LCD',
    desc: 'ტექსტური ეკრანი. GND, VCC → 5V, SDA → A4, SCL → A5. კოდი: LiquidCrystal_I2C lcd(0x27, 16, 2); lcd.init(); lcd.backlight(); lcd.print("Hi");',
    pins: pinsRow([['GND', 'GND'], ['VCC', 'VCC (5V)'], ['SDA', 'SDA → A4'], ['SCL', 'SCL → A5']]),
    box: [-80, -100, 220, 106],
    single: true,
    render() {
      return `${['GND', 'VCC', 'SDA', 'SCL'].map((t, i) => leg(i * 20, 0, i * 20, -14) + lbl(i * 20, 14, t, 'middle', 7)).join('')}
        <rect x="-76" y="-96" width="212" height="82" rx="5" fill="#2b8a3e"/>
        <rect class="scr" x="-66" y="-86" width="192" height="58" rx="3" fill="#5c7a29"/>
        <text class="l0" x="-60" y="-62" font-size="15" font-family="JetBrains Mono, monospace" fill="#102a07" xml:space="preserve"></text>
        <text class="l1" x="-60" y="-38" font-size="15" font-family="JetBrains Mono, monospace" fill="#102a07" xml:space="preserve"></text>`;
    },
    stamp(p, N, inp, h) { h.R(N('VCC'), N('GND'), 2000, p.id, 'q'); },
    result(p, r, k) {
      r.V = k.Vd(p.id, 'VCC', 'GND'); r.powered = r.V > 4;
      r.wired = ardOn(k.circuit, p.id, 'SDA').includes(18) && ardOn(k.circuit, p.id, 'SCL').includes(19);
      if (k.circuit.running && k.sim && k.sim.lcd) {
        if (!r.powered) k.W.set('lcdpw', `⚠️ ${k.name}: კვება არ აქვს — VCC → 5V, GND → GND.`);
        else if (!r.wired) k.W.set('lcdw', `⚠️ ${k.name}: SDA → A4, SCL → A5 (I2C ხაზები).`);
      }
    },
    update(g, p, r, ctx) {
      const L = ctx.sim && ctx.sim.lcd; const ok = ctx.running && r.powered && r.wired && L && L.on;
      g.querySelector('.scr').setAttribute('fill', ok && L.backlight ? '#a9e34b' : (ctx.running && r.powered ? '#82a83a' : '#5c7a29'));
      g.querySelector('.l0').textContent = ok ? L.lines[0].slice(0, 16) : '';
      g.querySelector('.l1').textContent = ok && L.lines[1] ? L.lines[1].slice(0, 16) : '';
    },
  });

  /* ---------- ჯოისტიკი ---------- */
  def('joystick', {
    name: 'ჯოისტიკი (2 ღერძი)', cat: 'sensors', prefix: 'JS',
    desc: 'ორი პოტენციომეტრი (VRx, VRy → ანალოგური პინები) და ღილაკი (SW → GND დაჭერისას; გამოიყენე INPUT_PULLUP).',
    pins: pinsRow([['GND', 'GND'], ['V', '+5V'], ['VRX', 'VRx'], ['VRY', 'VRy'], ['SW', 'SW (ღილაკი)']]),
    box: [-10, -96, 100, 102],
    interactive: 'press',
    controls: [{ key: 'x', label: 'X ღერძი', min: 0, max: 1, step: 0.01, def: 0.5, fmt: (v) => Math.round(v * 1023) }, { key: 'y', label: 'Y ღერძი', min: 0, max: 1, step: 0.01, def: 0.5, fmt: (v) => Math.round(v * 1023) }],
    render() {
      return `${['GND', '+5V', 'VRx', 'VRy', 'SW'].map((t, i) => leg(i * 20, 0, i * 20, -10) + lbl(i * 20, 14, t, 'middle', 7)).join('')}
        <rect x="-6" y="-90" width="92" height="80" rx="6" fill="#343a40"/><circle cx="40" cy="-50" r="30" fill="#495057"/>
        <circle class="stick" cx="40" cy="-50" r="16" fill="#212529" stroke="#868e96" stroke-width="2"/>`;
    },
    stamp(p, N, inp, h) {
      const x = inp.x ?? 0.5, y = inp.y ?? 0.5;
      h.R(N('V'), N('VRX'), 10000 * (1 - x) + 1, p.id, 'xa'); h.R(N('VRX'), N('GND'), 10000 * x + 1, p.id, 'xb');
      h.R(N('V'), N('VRY'), 10000 * (1 - y) + 1, p.id, 'ya'); h.R(N('VRY'), N('GND'), 10000 * y + 1, p.id, 'yb');
      h.R(N('SW'), N('GND'), inp.pressed ? 0.05 : 1e9, p.id, 'sw');
    },
    result(p, r, k) { r.Vx = k.Vd(p.id, 'VRX', 'GND'); r.Vy = k.Vd(p.id, 'VRY', 'GND'); },
    update(g, p, r, ctx) {
      const i = ctx.inputs || {}; const st = g.querySelector('.stick');
      st.setAttribute('cx', (40 + ((i.x ?? 0.5) - 0.5) * 30).toFixed(1)); st.setAttribute('cy', (-50 - ((i.y ?? 0.5) - 0.5) * 30).toFixed(1));
      st.setAttribute('fill', i.pressed ? '#c92a2a' : '#212529');
    },
  });
})(window.VL);
