/* ============================================================
 * tech/circuit/model.js — სქემის ელექტრული მოდელი
 *
 * 1) ქსელების აგება (netlist): სადენები, breadboard-ის ზოლები,
 *    კომპონენტის ფეხები ხვრელებში → union-find
 * 2) DC ანალიზი კვანძური პოტენციალების მეთოდით (MNA, ნორტონის წყაროები)
 *    დიოდები/LED და ტრანზისტორი — უბან-უბან წრფივი, იტერაციით
 * 3) PWM — სხვადასხვა მდგომარეობის საშუალო (დროითი გასაშუალოება)
 * 4) უსაფრთხოება: LED-ის დაწვა, მოკლე ჩართვა, პინის გადატვირთვა,
 *    „ჰაერში“ დარჩენილი (floating) შესასვლელები
 * 5) hw ადაპტერი Arduino-ს სიმულატორისთვის (digitalRead/analogRead)
 * ============================================================ */
(function (VL) {
  'use strict';
  const CZ = VL.Circuit;
  const P = CZ.PARTS;
  const GMIN = 1e-9, OPEN = 1e-9;
  const PIN_R = 25;               // Arduino-ს გამომავალი პინის შიდა წინაღობა
  const LED_BURN = 0.06;          // A — LED-ის დაწვის ზღვარი
  const PIN_MAX = 0.04;           // A — Arduino-ს პინის მაქსიმალური დენი

  function solveLinear(A, b) {
    const n = b.length;
    for (let c = 0; c < n; c++) {
      let piv = c, mx = Math.abs(A[c][c]);
      for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > mx) { mx = Math.abs(A[r][c]); piv = r; }
      if (mx < 1e-18) continue;
      if (piv !== c) { const t = A[c]; A[c] = A[piv]; A[piv] = t; const tb = b[c]; b[c] = b[piv]; b[piv] = tb; }
      for (let r = c + 1; r < n; r++) {
        const f = A[r][c] / A[c][c]; if (!f) continue;
        for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
        b[r] -= f * b[c];
      }
    }
    const x = new Array(n).fill(0);
    for (let r = n - 1; r >= 0; r--) {
      let s = b[r]; for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k];
      x[r] = Math.abs(A[r][r]) < 1e-18 ? 0 : s / A[r][r];
    }
    return x;
  }

  class Circuit {
    constructor(design) {
      this.d = design;
      this.inputs = {};
      this.burned = {};
      this.res = {};
      this.V = [];
      this.warnings = new Map();
      this.sim = null;
      this.running = false;
      this.netDirty = true;
      this.dirty = true;
      this.solves = 0;
      const self = this;
      this.hw = {
        dirty() { self.dirty = true; },
        digitalRead(p, mode) { return self.digitalRead(p, mode); },
        analogRead(p) { return self.analogRead(p); },
        pulseIn(p) { return self.pulseIn(p); },
      };
      this.initInputs();
    }
    setDesign(d) { this.d = d; this.netDirty = true; this.dirty = true; this.initInputs(); }
    changed() { this.netDirty = true; this.dirty = true; }
    initInputs() {
      this.d.parts.forEach((p) => {
        const def = P[p.type]; if (!def) return;
        const inp = this.inputs[p.id] = this.inputs[p.id] || {};
        (def.controls || []).forEach((c) => { if (inp[c.key] === undefined) inp[c.key] = c.def; });
        if (def.interactive === 'press' && inp.pressed === undefined) inp.pressed = false;
      });
    }
    attach(sim) { this.sim = sim; if (sim) sim.hw = this.hw; this.dirty = true; }
    reset() { this.capV = {}; this.lastT = undefined; this.now = 0; this.burned = {}; this.burnMsgs = {}; this.res = {}; this.warnings.clear(); this.sticky = new Map(); this._floatWarn = new Map(); this.dirty = true; Object.values(this.inputs).forEach((i) => { if ('pressed' in i) i.pressed = false; }); }
    setInput(pid, key, val) { (this.inputs[pid] = this.inputs[pid] || {})[key] = val; this.dirty = true; }

    /* ---------- ქსელების აგება ---------- */
    buildNetlist() {
      const parent = new Map();
      const find = (k) => { if (!parent.has(k)) parent.set(k, k); let r = k; while (parent.get(r) !== r) r = parent.get(r); let c = k; while (parent.get(c) !== r) { const n = parent.get(c); parent.set(c, r); c = n; } return r; };
      const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
      const holeAt = new Map();
      this.termPos = new Map();
      this.d.parts.filter((p) => p.type === 'breadboard').forEach((bb) => {
        P.breadboard.holes(bb).forEach((h) => {
          const [rx, ry] = CZ.rotPt(h.x, h.y, bb.rot || 0); const x = bb.x + rx, y = bb.y + ry;
          const strip = CZ.bbStrip(bb.id, h.r, h.c);
          find(strip);
          holeAt.set(x + ',' + y, strip);
          this.termPos.set(`${bb.id}:${h.r}:${h.c}`, [x, y]);
        });
      });
      const canon = (key) => {
        const m = /^([^:.]+):(\d+):(\d+)$/.exec(key);
        return m ? CZ.bbStrip(m[1], +m[2], +m[3]) : key;
      };
      this.ard = null;
      this.d.parts.forEach((p) => {
        const def = P[p.type]; if (!def || p.type === 'breadboard') return;
        if (p.type === 'arduino') this.ard = p;
        def.pins.forEach((pin) => {
          const key = p.id + '.' + pin.id; find(key);
          const [x, y] = CZ.pinWorld(p, pin);
          this.termPos.set(key, [x, y]);
          const h = holeAt.get(x + ',' + y);
          if (h) union(key, h);
        });
      });
      if (this.ard) { union(this.ard.id + '.GND1', this.ard.id + '.GND2'); union(this.ard.id + '.GND1', this.ard.id + '.GND3'); }
      this.d.wires.forEach((w) => {
        if (!this.termPos.has(w.a) || !this.termPos.has(w.b)) return;
        union(canon(w.a), canon(w.b));
      });
      // გრუნტი: Arduino-ს GND ან ბატარეის „−“
      let gnd = null;
      if (this.ard) gnd = find(this.ard.id + '.GND1');
      else { const bat = this.d.parts.find((p) => p.type === 'battery'); if (bat) gnd = find(bat.id + '.N'); }
      const idx = new Map(); let n = 0;
      if (gnd) idx.set(gnd, n++);
      for (const k of parent.keys()) { const r = find(k); if (!idx.has(r)) idx.set(r, n++); }
      if (!gnd) n = Math.max(n, 1);
      this.nNets = n;
      this.netOfKey = (key) => idx.get(find(canon(key)));
      this.net = (pid, pin) => this.netOfKey(pid + '.' + pin);
      // ქსელში მყოფი Arduino-ს პინები და ელემენტების მიერთებულობა
      this.ardPinsOnNet = {};
      if (this.ard) P.arduino.pins.forEach((pin) => {
        const num = CZ.ardPinNumber(pin.id); if (num === null) return;
        const nn = this.net(this.ard.id, pin.id); (this.ardPinsOnNet[nn] = this.ardPinsOnNet[nn] || []).push(num);
      });
      // კომპონენტის ფეხის „მიერთებულობა“ (სადენი/ხვრელი)
      const count = new Map();
      for (const k of parent.keys()) { const r = find(k); count.set(r, (count.get(r) || 0) + 1); }
      this.isConnected = (pid, pin) => count.get(find(pid + '.' + pin)) > 1;
      this.netDirty = false;
    }

    /* ---------- ელემენტების შედგენა ---------- */
    stamp(pwmState) {
      const E = [], sim = this.running ? this.sim : null;
      const R = (a, b, r, owner, role) => E.push({ t: 'R', a, b, g: 1 / Math.max(r, 1e-4), owner, role });
      const V = (p, n, v, r, owner, role) => E.push({ t: 'V', a: p, b: n, v, g: 1 / r, owner, role });
      const D = (a, k, vf, rs, owner, role) => E.push({ t: 'D', a, k, vf, g: 1 / rs, owner, role, on: false });
      const SW = (a, b, want, r, owner, role, init = false) => E.push({ t: 'SW', a, b, g: 1 / (r || 0.05), want, owner, role, on: init });
      const hk = { R, V, D, SW, sim, circuit: this, dt: this.dt || 0 };
      this.d.parts.forEach((p) => {
        const N = (pin) => this.net(p.id, pin), inp = this.inputs[p.id] || {};
        switch (p.type) {
          case 'arduino': {
            const g = N('GND1');
            V(N('5V'), g, 5, 0.05, p.id, '5V'); V(N('3V3'), g, 3.3, 0.1, p.id, '3V3');
            if (!sim) break;
            P.arduino.pins.forEach((pin) => {
              const num = CZ.ardPinNumber(pin.id); if (num === null) return;
              const m = sim.modes[num];
              if (m === 1) {
                let hi = sim.pins[num] ? 1 : 0;
                if (pwmState && num in pwmState) hi = pwmState[num];
                V(N(pin.id), g, hi ? 5 : 0, PIN_R, p.id, 'pin' + num);
              } else if (m === 2) V(N(pin.id), g, 5, 35000, p.id, 'pu' + num);
            });
            break;
          }
          case 'resistor': R(N('p1'), N('p2'), +p.props.r, p.id, 'r'); break;
          case 'led': {
            if (this.burned[p.id]) break;
            const c = CZ.LED_COLORS[p.props.color] || CZ.LED_COLORS.red;
            D(N('A'), N('K'), c.vf, 10, p.id, 'd'); break;
          }
          case 'rgbled':
            if (this.burned[p.id]) break;
            D(N('R'), N('K'), 1.9, 10, p.id, 'r'); D(N('G'), N('K'), 2.9, 10, p.id, 'g'); D(N('B'), N('K'), 2.9, 10, p.id, 'b'); break;
          case 'button': R(N('p1'), N('p2'), inp.pressed ? 0.01 : 1 / OPEN, p.id, 'sw'); break;
          case 'switch': R(N('p1'), N('p2'), p.props.on ? 0.01 : 1 / OPEN, p.id, 'sw'); break;
          case 'pot': { const r = +p.props.r, pos = inp.pos ?? 0.5; R(N('A'), N('W'), r * pos + 1, p.id, 'aw'); R(N('W'), N('B'), r * (1 - pos) + 1, p.id, 'wb'); break; }
          case 'ldr': { const l = inp.light ?? 0.6; R(N('p1'), N('p2'), 1000 + 99000 * Math.pow(1 - l, 2.2), p.id, 'r'); break; }
          case 'tmp36': { R(N('VS'), N('GND'), 50000, p.id, 'q'); V(N('VO'), N('GND'), 0.5 + 0.01 * (inp.temp ?? 25), 100, p.id, 'out'); break; }
          case 'battery': V(N('P'), N('N'), +p.props.v, +p.props.v > 5 ? 1 : 0.3, p.id, 'bat'); break;
          case 'motor': R(N('p1'), N('p2'), 15, p.id, 'm'); break;
          case 'servo': R(N('V'), N('GND'), 120, p.id, 'load'); break;
          case 'buzzer': R(N('P'), N('N'), 400, p.id, 'bz'); break;
          case 'npn': D(N('B'), N('E'), 0.7, 20, p.id, 'be'); E.push({ t: 'Q', a: N('C'), b: N('E'), g: 1, v: 0.15, owner: p.id, role: 'ce', on: false, be: E[E.length - 1] }); break;
          case 'meter': R(N('P'), N('COM'), p.props.mode === 'A' ? 0.01 : 1e7, p.id, 'm'); break;
          default: { const d = P[p.type]; if (d && d.stamp) d.stamp(p, N, inp, hk); break; }
        }
      });
      return E;
    }

    /** ერთი DC ამოხსნა (იტერაციით დიოდების/ტრანზისტორის მდგომარეობისთვის) */
    dcSolve(E) {
      const n = this.nNets, m = n - 1;
      let Vn = new Array(n).fill(0), diag = new Array(n).fill(0);
      for (let it = 0; it < 40; it++) {
        const A = Array.from({ length: m }, () => new Array(m).fill(0)), b = new Array(m).fill(0);
        diag = new Array(n).fill(0);
        const G = (a, c, g) => {
          if (a === c) return;
          diag[a] += g; diag[c] += g;
          if (a > 0) A[a - 1][a - 1] += g; if (c > 0) A[c - 1][c - 1] += g;
          if (a > 0 && c > 0) { A[a - 1][c - 1] -= g; A[c - 1][a - 1] -= g; }
        };
        const I = (a, c, cur) => { if (a > 0) b[a - 1] += cur; if (c > 0) b[c - 1] -= cur; };
        for (let k = 1; k < n; k++) A[k - 1][k - 1] += GMIN;
        E.forEach((e) => {
          if (e.t === 'R') G(e.a, e.b, e.g);
          else if (e.t === 'V') { G(e.a, e.b, e.g); I(e.a, e.b, e.v * e.g); }
          else if (e.t === 'D') { if (e.on) { G(e.a, e.k, e.g); I(e.a, e.k, e.vf * e.g); } else G(e.a, e.k, OPEN); }
          else if (e.t === 'Q') { if (e.on) { G(e.a, e.b, e.g); I(e.a, e.b, e.v * e.g); } else G(e.a, e.b, OPEN); }
          else if (e.t === 'SW') G(e.a, e.b, e.on ? e.g : OPEN);
        });
        const x = m > 0 ? solveLinear(A, b) : [];
        Vn = [0, ...x];
        let changed = false;
        E.forEach((e) => {
          if (e.t === 'D') {
            const vd = Vn[e.a] - Vn[e.k];
            if (!e.on && vd > e.vf + 1e-6) { e.on = true; changed = true; }
            else if (e.on && (vd - e.vf) * e.g < -1e-9) { e.on = false; changed = true; }
          } else if (e.t === 'Q') {
            const be = e.be, ib = be.on ? (Vn[be.a] - Vn[be.k] - be.vf) * be.g : 0;
            const want = ib > 2e-5 && Vn[e.a] - Vn[e.b] > -0.01;
            if (want !== e.on) { e.on = want; changed = true; }
          } else if (e.t === 'SW') {
            const want = !!e.want(Vn);
            if (want !== e.on) { e.on = want; changed = true; }
          }
        });
        if (!changed) break;
      }
      E.forEach((e) => {
        const va = Vn[e.a], vb = Vn[e.t === 'D' ? e.k : e.b];
        if (e.t === 'R') e.i = (va - vb) * e.g;
        else if (e.t === 'V') e.i = (e.v - (va - vb)) * e.g;               // დენი, რომელიც „+“-დან გამოდის
        else if (e.t === 'D') e.i = e.on ? (va - vb - e.vf) * e.g : 0;
        else if (e.t === 'Q') e.i = e.on ? (va - vb - e.v) * e.g : 0;
        else if (e.t === 'SW') e.i = (va - vb) * (e.on ? e.g : OPEN);
      });
      return { V: Vn, diag };
    }

    /* ---------- სრული ამოხსნა (PWM გასაშუალოებით) ---------- */
    solve() {
      if (this.netDirty) this.buildNetlist();
      this.solves++;
      const now = this.now || 0; this.dt = this.lastT === undefined ? 0 : Math.max(0, Math.min(0.2, now - this.lastT)); this.lastT = now;
      this.capV = this.capV || {};
      const sim = this.running ? this.sim : null;
      const pwm = [];
      if (sim) for (let p = 0; p < 20; p++) if (sim.modes[p] === 1 && sim.pwm[p] > 0 && sim.pwm[p] < 255) pwm.push(p);
      const used = pwm.slice(0, 4);
      const combos = 1 << used.length;
      const acc = {}; const peak = {}; let Vavg = new Array(this.nNets).fill(0); let diag = null;
      for (let c = 0; c < combos; c++) {
        const st = {}; let w = 1;
        used.forEach((p, i) => { const on = (c >> i) & 1; st[p] = on; const duty = sim.pwm[p] / 255; w *= on ? duty : 1 - duty; });
        pwm.slice(4).forEach((p) => { st[p] = sim.pwm[p] >= 128 ? 1 : 0; });
        if (w === 0) continue;
        const E = this.stamp(st);
        const r = this.dcSolve(E);
        if (!diag) diag = r.diag;
        r.V.forEach((v, i) => { Vavg[i] += v * w; });
        E.forEach((e) => {
          const k = e.owner + '|' + e.role;
          acc[k] = (acc[k] || 0) + e.i * w;
          peak[k] = Math.max(peak[k] || 0, Math.abs(e.i));
        });
      }
      this.V = Vavg; this.diag = diag || [];
      this.computeResults(acc, peak);
      this.dirty = false;
    }

    computeResults(acc, peak) {
      const sim = this.running ? this.sim : null;
      const res = {}; const W = new Map();
      this.burnMsgs = this.burnMsgs || {};
      const I = (pid, role) => acc[pid + '|' + role] || 0, Pk = (pid, role) => peak[pid + '|' + role] || 0;
      const Vd = (pid, a, b) => this.V[this.net(pid, a)] - this.V[this.net(pid, b)];
      this.d.parts.forEach((p) => {
        const r = res[p.id] = {};
        const name = p.name || p.id;
        switch (p.type) {
          case 'led': {
            if (this.burned[p.id]) { r.burned = true; break; }
            r.I = I(p.id, 'd'); r.bright = Math.min(1, Math.max(0, r.I) / 0.015); r.V = Vd(p.id, 'A', 'K');
            if (Pk(p.id, 'd') > LED_BURN && this.running) {
              this.burned[p.id] = true; r.burned = true; r.bright = 0;
              this.burnMsgs[p.id] = `💥 ${name} დაიწვა: დენი ${(Pk(p.id, 'd') * 1000).toFixed(0)} mA (მაქს. ~20 mA). დაამატე რეზისტორი (მაგ. 220 Ω) მიმდევრობით.`;
              this.dirty = true;
            } else if (r.I > 0.025) W.set('hi' + p.id, `⚠️ ${name}: დენი ${(r.I * 1000).toFixed(0)} mA — LED-ისთვის ბევრია. გაზარდე რეზისტორის წინაღობა.`);
            if (r.V < -0.5 && Math.abs(Vd(p.id, 'A', 'K')) > 1.5 && this.running) W.set('rev' + p.id, `🔄 ${name} შებრუნებულია? ანოდი (+, მოხრილი ფეხი) უფრო მაღალ ძაბვაზე უნდა იყოს, ვიდრე კათოდი.`);
            break;
          }
          case 'rgbled': {
            if (this.burned[p.id]) { r.burned = true; r.rgb = [0, 0, 0]; break; }
            r.rgb = ['r', 'g', 'b'].map((c) => Math.min(1, Math.max(0, I(p.id, c)) / 0.015));
            if (['r', 'g', 'b'].some((c) => Pk(p.id, c) > LED_BURN) && this.running) { this.burned[p.id] = true; this.burnMsgs[p.id] = `💥 ${name} დაიწვა — ყოველ ფერს სჭირდება საკუთარი რეზისტორი.`; this.dirty = true; }
            break;
          }
          case 'resistor': {
            r.I = I(p.id, 'r'); r.V = Vd(p.id, 'p1', 'p2'); const pw = Math.abs(r.I * r.V);
            if (pw > 0.25) W.set('pw' + p.id, `🔥 ${name} ხურდება: ${pw.toFixed(2)} W (მაქს. 0.25 W).`);
            break;
          }
          case 'motor': r.I = I(p.id, 'm'); r.V = Vd(p.id, 'p1', 'p2'); r.speed = Math.max(-1.6, Math.min(1.6, r.V / 5)); break;
          case 'buzzer': {
            r.V = Vd(p.id, 'P', 'N'); r.on = this.running && r.V > 1.5;
            const nets = this.ardPinsOnNet[this.net(p.id, 'P')] || [];
            const tp = sim && nets.find((x) => sim.tones[x] > 0);
            r.freq = r.on ? (tp !== undefined ? sim.tones[tp] : 1000) : 0;
            break;
          }
          case 'servo': {
            r.V = Vd(p.id, 'V', 'GND'); r.powered = !this.running || r.V > 4;
            const nets = this.ardPinsOnNet[this.net(p.id, 'SIG')] || [];
            const sp = sim && nets.find((x) => sim.servoAngles[x] !== undefined);
            r.angle = sp !== undefined && r.powered ? sim.servoAngles[sp] : (p._lastAngle ?? 90);
            p._lastAngle = r.angle;
            if (this.running && !r.powered) W.set('srv' + p.id, `⚠️ ${name}: კვება არ აქვს — მიუერთე +5V (წითელი) და GND (ყავისფერი).`);
            if (this.running && sim && sim.vtime > 500 && sp === undefined && this.isConnected(p.id, 'SIG') && Object.keys(sim.servoAngles).length === 0) W.set('srva' + p.id, `ℹ️ ${name}: კოდში გამოიყენე Servo ობიექტი: myServo.attach(პინი); myServo.write(კუთხე);`);
            break;
          }
          case 'npn': r.on = Math.abs(I(p.id, 'ce')) > 1e-4; r.Ic = I(p.id, 'ce'); r.Ib = I(p.id, 'be'); if (r.Ib > 0.03) W.set('ib' + p.id, `⚠️ ${name}: ბაზის დენი ძალიან დიდია — ბაზაზე დაამატე 1 kΩ რეზისტორი.`); break;
          case 'meter': r.reading = p.props.mode === 'A' ? I(p.id, 'm') : Vd(p.id, 'P', 'COM'); break;
          case 'tmp36': r.Vout = Vd(p.id, 'VO', 'GND'); break;
          case 'pot': r.Vw = this.V[this.net(p.id, 'W')]; break;
          case 'arduino': {
            if (!this.running) break;
            const i5 = I(p.id, '5V'); r.I5 = i5;
            if (i5 > 0.8) W.set('short5', '⛔ მოკლე ჩართვა! 5V პირდაპირ GND-ს უერთდება (ან ძალიან დიდი დატვირთვაა). შეამოწმე სადენები.');
            for (let n = 0; n < 20; n++) {
              const ip = Math.abs(acc[p.id + '|pin' + n] || 0);
              if (ip > PIN_MAX) W.set('pinOver' + n, `⚠️ პინი ${CZ.pinName(n)}: დენი ${(ip * 1000).toFixed(0)} mA > 40 mA. ${ip > 0.09 ? 'შესაძლოა მოკლე ჩართვაა, ან ' : ''}დატვირთვა (ძრავა/LED რეზისტორის გარეშე) ტრანზისტორით ან რეზისტორით უნდა ჩართო.`);
            }
            break;
          }
          case 'battery': { r.I = I(p.id, 'bat'); if (r.I > 2 && this.running) W.set('shortb' + p.id, `⛔ ${name}: მოკლე ჩართვა! „+“ და „−“ პირდაპირ არის შეერთებული.`); break; }
          default: { const d = P[p.type]; if (d && d.result) d.result(p, r, { I, Pk, Vd, W, circuit: this, sim, name, V: (pin) => this.V[this.net(p.id, pin)] }); break; }
        }
      });
      Object.entries(this.burnMsgs).forEach(([pid, m]) => { if (this.burned[pid]) W.set('burn' + pid, m); });
      (this._floatWarn || new Map()).forEach((m, k) => W.set(k, m));
      this.warnings = W;
      this.sticky = this.sticky || new Map();
      if (this.running) W.forEach((m, k) => this.sticky.set(k, m));
      this.res = res;
    }

    ensure() { if (this.dirty || this.netDirty) this.solve(); }

    /* ---------- Arduino-ს შესასვლელები ---------- */
    ardNet(p) {
      if (this.netDirty) this.buildNetlist();
      if (!this.ard) return null;
      const id = p >= 14 ? 'A' + (p - 14) : 'D' + p;
      return this.net(this.ard.id, id);
    }
    digitalRead(p, mode) {
      this.ensure();
      const n = this.ardNet(p); if (n === null || n === undefined) return 0;
      const ownG = (mode === 2 ? 1 / 35000 : 0);
      if ((this.diag[n] || 0) - ownG < 1e-8 && mode !== 2 && n !== 0) {
        this._floatWarn = this._floatWarn || new Map();
        if (!this._floatWarn.has('float' + p)) {
          this._floatWarn.set('float' + p, `🌫️ პინი ${CZ.pinName(p)} „ჰაერშია“ (floating) — digitalRead შემთხვევით მნიშვნელობებს აბრუნებს. დაამატე pull-down რეზისტორი (10 kΩ → GND) ან გამოიყენე pinMode(${CZ.pinName(p)}, INPUT_PULLUP).`);
          this.warnings.set('float' + p, this._floatWarn.get('float' + p));
        }
        return Math.random() < 0.5 ? 1 : 0;
      }
      return this.V[n] > 2.5 ? 1 : 0;
    }
    analogRead(p) {
      this.ensure();
      const n = this.ardNet(p); if (n === null || n === undefined) return 0;
      if ((this.diag[n] || 0) < 1e-8 && n !== 0) return Math.floor(300 + Math.random() * 300);
      return Math.max(0, Math.min(1023, Math.round(this.V[n] / 5 * 1023)));
    }
    pulseIn(p) {
      this.ensure();
      const n = this.ardNet(p);
      const us = this.d.parts.find((q) => q.type === 'ultrasonic' && this.net(q.id, 'ECHO') === n);
      if (!us) { (this._floatWarn = this._floatWarn || new Map()).set('pulse' + p, `📡 pulseIn(${CZ.pinName(p)}) — ამ პინზე ულტრაბგერითი სენსორის ECHO ფეხი არ არის მიერთებული.`); return 0; }
      const pw = this.V[this.net(us.id, 'VCC')] - this.V[this.net(us.id, 'GND')];
      if (pw < 4) { (this._floatWarn = this._floatWarn || new Map()).set('uspow', '📡 ულტრაბგერით სენსორს კვება არ აქვს: VCC → 5V, GND → GND.'); return 0; }
      if (!(this.ardPinsOnNet[this.net(us.id, 'TRIG')] || []).length) { (this._floatWarn = this._floatWarn || new Map()).set('ustrig', '📡 სენსორის TRIG ფეხი Arduino-ს პინს უნდა უერთდებოდეს (digitalWrite HIGH 10 მკწმ-ით).'); return 0; }
      const d = (this.inputs[us.id] || {}).dist ?? 100;
      return Math.round(d * 58.3);
    }
    clearFloat() { this._floatWarn = new Map(); }

    /** ტექსტური ინფორმაცია მინიშნების ფანჯრისთვის */
    describe(pid) {
      const p = this.d.parts.find((x) => x.id === pid); if (!p) return '';
      const r = this.res[pid] || {}; const f = (v, u, k = 1) => (v === undefined || isNaN(v) ? '' : `${(v * k).toFixed(k === 1000 ? 1 : 2)} ${u}`);
      const parts = [p.name || p.id];
      if (r.V !== undefined) parts.push('U = ' + f(r.V, 'V'));
      if (r.I !== undefined) parts.push('I = ' + f(r.I, 'mA', 1000));
      if (r.bright !== undefined) parts.push(`სიკაშკაშე ${Math.round(r.bright * 100)}%`);
      if (r.burned) parts.push('💥 დამწვარი');
      if (r.Ic !== undefined) parts.push(`Ic = ${(r.Ic * 1000).toFixed(1)} mA, Ib = ${(r.Ib * 1000).toFixed(2)} mA`);
      if (r.Vout !== undefined) parts.push('Vout = ' + f(r.Vout, 'V'));
      if (r.Vw !== undefined) parts.push('სრიალა: ' + f(r.Vw, 'V'));
      if (r.reading !== undefined) parts.push('ჩვენება: ' + (p.props.mode === 'A' ? f(r.reading, 'mA', 1000) : f(r.reading, 'V')));
      return parts.join(' · ');
    }
  }
  CZ.Circuit = Circuit;

  /* ---------- სქემის ავტომატური ტესტირება (გამოწვევებისთვის) ---------- */
  CZ.runHeadless = function (design, testFn) {
    const c = new Circuit(JSON.parse(JSON.stringify(design)));
    c.buildNetlist();
    const checks = [];
    const check = (label, ok, hint) => { checks.push({ label, ok: !!ok, hint: ok ? '' : hint }); return !!ok; };
    let sim = null;
    const hasArd = design.parts.some((p) => p.type === 'arduino');
    if (hasArd) {
      sim = new VL.Tech.Sim();
      const comp = sim.compile(design.code || '');
      if (!comp.ok) { return { passed: false, score: 0, checks: [{ label: 'კოდის კომპილაცია', ok: false, hint: comp.issues.filter((i) => i.level === 'error').map((i) => i.msg).join(' ') }] }; }
      c.attach(sim);
      if (!sim.start()) return { passed: false, score: 0, checks: [{ label: 'პროგრამის გაშვება', ok: false, hint: sim.error }] };
    }
    c.running = true; c.dirty = true;
    const ctx = {
      c, sim,
      parts: (type) => c.d.parts.filter((p) => p.type === type),
      set: (pid, k, v) => c.setInput(pid, k, v),
      run(ms, sample) {
        if (!sim) { const end = (c.now || 0) + ms / 1000; do { c.now = Math.min(end, (c.now || 0) + 0.02); c.dirty = true; c.solve(); if (sample) sample(); } while (c.now < end - 1e-9); return; }
        const end = sim.vtime + ms; const stepMs = 20;
        while (sim.vtime < end) {
          sim.runUntil(Math.min(end, sim.vtime + stepMs), 400000);
          if (sim.error) throw new Error(sim.error);
          c.now = sim.vtime / 1000; c.dirty = true; c.solve();
          if (sample) sample();
        }
      },
      res: (pid) => (c.ensure(), c.res[pid] || {}),
      warnKeys: () => [...(c.sticky || c.warnings).keys()],
    };
    try { testFn(ctx, check); } catch (e) { checks.push({ label: 'შესრულება', ok: false, hint: VL.Tech.translateError(e) }); }
    const ok = checks.filter((x) => x.ok).length;
    return { passed: checks.length > 0 && ok === checks.length, score: checks.length ? Math.round(100 * ok / checks.length) : 0, checks, warnings: [...(c.sticky || c.warnings).values()] };
  };
})(window.VL);
