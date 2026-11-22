/* ============================================================
 * tech/engine.js — Arduino (C++-ის მსგავსი) კოდის ტრანსპაილერი
 * და ვირტუალური მიკროკონტროლერის სიმულატორი.
 *
 * იდეა: setup()/loop() და მომხმარებლის ფუნქციები გარდაიქმნება
 * JavaScript-ის გენერატორებად (function*). delay() → yield,
 * ყოველ ციკლში ემატება "tick" yield. ამის წყალობით:
 *   - ვირტუალური დრო სრულად კონტროლდება (რეალურ დროში ან სწრაფად)
 *   - უსასრულო ციკლი ბრაუზერს ვერ გაჭედავს
 *   - ავტომატური ტესტები დეტერმინისტულად სრულდება
 * ============================================================ */
(function (VL) {
  'use strict';
  const C = VL.CodeUtil;
  const T = VL.Tech = VL.Tech || {};

  /* ---------- აპარატურის კონფიგურაცია ---------- */
  const COMPONENTS = {
    13: 'წითელი LED', 12: 'ყვითელი LED', 11: 'მწვანე LED (PWM)', 9: 'სერვო', 8: 'ზუმერი', 6: 'ძრავა (PWM)', 2: 'ღილაკი', 14: 'პოტენციომეტრი (A0)', 15: 'სინათლის სენსორი (A1)',
  };
  const PWM_PINS = [3, 5, 6, 9, 10, 11];
  const CONNECTED_TEXT = '13, 12, 11 (LED-ები), 9 (სერვო), 8 (ზუმერი), 6 (ძრავა), 2 (ღილაკი), A0 (პოტენციომეტრი), A1 (სინათლის სენსორი)';
  T.COMPONENTS = COMPONENTS;
  T.PWM_PINS = PWM_PINS;

  const API_NAMES = ['pinMode', 'digitalWrite', 'digitalRead', 'analogRead', 'analogWrite', 'delay', 'delayMicroseconds', 'millis', 'micros',
    'map', 'constrain', 'random', 'randomSeed', 'tone', 'noTone', 'Serial', 'Servo', 'abs', 'min', 'max', 'pow', 'sqrt', 'pulseIn', 'LiquidCrystal_I2C', 'Wire'];

  /* ---------- ტრანსპაილერი ---------- */
  const SCAL = '(?:unsigned\\s+|signed\\s+)?(?:long\\s+long|long|int|short|float|double|bool|boolean|byte|char|String|word|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t)';
  const FTYPE = '(?:(?:static|inline)\\s+)*(?:void|' + SCAL + ')';

  T.transpile = function (src) {
    const { code: masked, strs } = C.mask(src);
    let c = masked;
    // პრეპროცესორი
    c = c.replace(/^[ \t]*#[ \t]*include[^\n]*$/gm, '');
    c = c.replace(/^[ \t]*#[ \t]*define[ \t]+([A-Za-z_]\w*)[ \t]+([^\n]+)$/gm, 'const $1 = $2;');
    // ფუნქციის პროტოტიპები (void foo();)
    c = c.replace(new RegExp('^[ \\t]*' + FTYPE + '\\s+[A-Za-z_]\\w*\\s*\\([^()]*\\)\\s*;', 'gm'), '');
    // ფუნქციის განსაზღვრებები → გენერატორები
    const fnNames = [];
    c = c.replace(new RegExp('\\b' + FTYPE + '\\s+([A-Za-z_]\\w*)\\s*\\(([^()]*)\\)\\s*\\{', 'g'), (m, name, params) => {
      fnNames.push(name);
      const p = params.trim();
      const ps = (p === '' || p === 'void') ? '' : p.split(',').map((x) => {
        const mm = x.trim().replace(/\[\s*\d*\s*\]/g, '').replace(/[&*]/g, ' ').match(/([A-Za-z_]\w*)\s*$/);
        return mm ? mm[1] : '_';
      }).join(', ');
      return `function* ${name}(${ps}) {`;
    });
    // მთელი რიცხვის ტიპის ცვლადები (int/long/byte…) — მინიჭებისას წილადი ნაწილი იკვეთება, როგორც C++-ში
    const intNames = new Set();
    c.replace(/\b(?:unsigned\s+)?(?:long\s+long|int|long|short|byte|word|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t)\s+([A-Za-z_][^;{}]*);/g, (m, list) => { C.splitTop(list).forEach((part) => { const mm = /^\s*([A-Za-z_]\w*)\s*(=|$|\[)/.exec(part); if (mm) intNames.add(mm[1]); }); return m; });
    // ტიპის გარდაქმნა (cast)
    c = c.replace(/\(\s*(?:unsigned\s+)?(?:int|long|byte|short|char|word)\s*\)/g, '~~');
    c = c.replace(/\(\s*(?:float|double)\s*\)/g, '+');
    // Servo ობიექტები
    c = c.replace(/\bServo\s+([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*)\s*;/g, (m, names) => 'let ' + names.split(',').map((n) => n.trim() + ' = new Servo()').join(', ') + ';');
    // ობიექტები კონსტრუქტორით: LiquidCrystal_I2C lcd(0x27, 16, 2);
    c = c.replace(/\b(LiquidCrystal_I2C|LiquidCrystal)\s+([A-Za-z_]\w*)\s*\(([^()]*)\)\s*;/g, (m, cls, name, args) => `let ${name} = new LiquidCrystal_I2C(${args});`);
    // ცვლადების გამოცხადება
    c = c.replace(new RegExp('\\b(?:(?:static|volatile)\\s+)*(const\\s+)?(?:(?:static|volatile)\\s+)*' + SCAL + '\\s+(?=[A-Za-z_])', 'g'), (m, k) => (k ? 'const ' : 'let '));
    // მასივები
    { // მასივები (მრავალგანზომილებიანის ჩათვლით): int a[2][3] = {{…},{…}};
      const re = /([A-Za-z_]\w*)\s*(?:\[\s*\w*\s*\])+\s*=\s*\{/g; let mm; const hits = [];
      while ((mm = re.exec(c))) hits.push({ i: mm.index, name: mm[1], open: mm.index + mm[0].length - 1 });
      for (let k = hits.length - 1; k >= 0; k--) {
        const h = hits[k]; const close = C.matchParen(c, h.open); if (close < 0) continue;
        const body = c.slice(h.open, close + 1).replace(/\{/g, '[').replace(/\}/g, ']');
        c = c.slice(0, h.i) + h.name + ' = ' + body + c.slice(close + 1);
      }
    }
    c = c.replace(/([A-Za-z_]\w*)\s*\[\s*\w*\s*\]\s*=\s*(__S\d+__)/g, '$1 = $2');
    c = c.replace(/\blet\s+([A-Za-z_]\w*)\s*\[\s*(\w+)\s*\]\s*;/g, 'let $1 = new Array($2).fill(0);');
    // ინიციალიზაციის გარეშე → 0 (როგორც Arduino-ს გლობალურ ცვლადებში)
    c = c.replace(/\blet\s+([^;]+);/g, (m, list) => 'let ' + C.splitTop(list).map((part) => (part.includes('=') ? part : part.trim() + ' = 0')).join(', ') + ';');
    // int ცვლადებზე მინიჭება → __int(...)
    intNames.forEach((n) => {
      const re = new RegExp('(?<![\\w$.])' + n + '\\s*=(?!=)', 'g'); const idx = []; let mm;
      while ((mm = re.exec(c))) idx.push(mm.index + mm[0].length);
      for (let k = idx.length - 1; k >= 0; k--) {
        const st = idx[k]; let d = 0, e = st;
        for (; e < c.length; e++) { const ch = c[e]; if ('([{'.includes(ch)) d++; else if (')]}'.includes(ch)) { if (d === 0) break; d--; } else if ((ch === ';' || ch === ',') && d === 0) break; }
        const expr = c.slice(st, e);
        if (!expr.trim() || /^\s*\[/.test(expr) || /^\s*new\s/.test(expr)) continue;
        c = c.slice(0, st) + ' __int(' + expr + ')' + c.slice(e);
      }
    });
    // ციკლებში tick
    c = C.insertLoopStmt(c, 'yield 0;');
    // მომხმარებლის ფუნქციების გამოძახება → yield*
    fnNames.forEach((n) => { c = C.wrapCalls(c, n, '(yield* ' + n + '(', '))'); });
    // delay
    c = C.wrapCalls(c, 'delayMicroseconds', '(yield ["d", (', ') / 1000])');
    c = C.wrapCalls(c, 'delay', '(yield ["d", (', ')])');
    c = C.wrapCalls(c, 'pulseIn', '(yield ["p", ', '])');
    c = C.unmask(c, strs);
    return { js: c, fnNames };
  };

  /* ---------- სტატიკური შემოწმება (lint) ---------- */
  const KNOWN = ['pinMode', 'digitalWrite', 'digitalRead', 'analogRead', 'analogWrite', 'delay', 'millis', 'Serial', 'println', 'setup', 'loop', 'INPUT_PULLUP', 'constrain'];
  T.lint = function (src) {
    const issues = [];
    if (!/\bvoid\s+setup\s*\(/.test(src)) issues.push({ level: 'error', msg: 'კოდში არ არის ფუნქცია void setup() { } — ის ერთხელ სრულდება დაწყებისას.' });
    if (!/\bvoid\s+loop\s*\(/.test(src)) issues.push({ level: 'error', msg: 'კოდში არ არის ფუნქცია void loop() { } — ის განუწყვეტლივ მეორდება.' });
    const { code, unterminated } = C.mask(src);
    if (unterminated) issues.push({ level: 'error', line: unterminated, msg: `ხაზი ${unterminated}: ბრჭყალი (" ან ') არ არის დახურული.` });
    const lines = code.split('\n');
    const stack = [];
    const pairs = { ')': '(', ']': '[', '}': '{' };
    let braceErr = false;
    lines.forEach((ln, i) => {
      for (const ch of ln) {
        if ('([{'.includes(ch)) stack.push({ ch, line: i + 1 });
        else if (')]}'.includes(ch)) {
          const top = stack.pop();
          if (!braceErr && (!top || top.ch !== pairs[ch])) {
            braceErr = true;
            issues.push({ level: 'error', line: i + 1, msg: `ხაზი ${i + 1}: ზედმეტი ან შეუსაბამო ფრჩხილი „${ch}“.` });
          }
        }
      }
    });
    if (!braceErr && stack.length) {
      const top = stack[stack.length - 1];
      const closer = { '(': ')', '[': ']', '{': '}' }[top.ch];
      issues.push({ level: 'error', line: top.line, msg: `ხაზი ${top.line}: „${top.ch}“ არ არის დახურული — აკლია „${closer}“.` });
    }
    // წერტილ-მძიმის ევრისტიკა
    lines.forEach((raw, i) => {
      const t = raw.trim();
      if (!t || t.startsWith('#')) return;
      if (/[{};,(:\\]$/.test(t) || /(&&|\|\||[+\-*/=<>!%&|^?])$/.test(t)) return;
      if (/^(if|for|while|else|do|switch|case|default)\b/.test(t) || /^}/.test(t)) return;
      if (/^(void|int|float|bool|long|unsigned|byte|double|String|char)\b[^=]*\)\s*$/.test(t)) return; // ფუნქციის თავი
      const next = (lines.slice(i + 1).find((x) => x.trim()) || '').trim();
      if (next.startsWith('{') || /^[.+\-*/&|?:]/.test(next)) return;
      issues.push({ level: 'warn', line: i + 1, msg: `ხაზი ${i + 1}: სავარაუდოდ აკლია წერტილ-მძიმე „;“ ბოლოში.` });
    });
    lines.forEach((ln, i) => {
      if (/\bif\s*\(\s*[A-Za-z_][\w.\[\]]*\s*=\s*[^=]/.test(ln)) issues.push({ level: 'warn', line: i + 1, msg: `ხაზი ${i + 1}: if-ში „=“ მინიჭებაა. შედარებისთვის გამოიყენე „==“.` });
    });
    // დიდი/პატარა ასოების შეცდომები
    const words = new Set(code.match(/[A-Za-z_]\w*/g) || []);
    words.forEach((w) => {
      const k = KNOWN.find((n) => n.toLowerCase() === w.toLowerCase() && n !== w);
      if (k) issues.push({ level: 'error', msg: `„${w}“ — სწორად იწერება „${k}“ (დიდ და პატარა ასოებს მნიშვნელობა აქვს).` });
    });
    return issues;
  };

  /* ---------- შეცდომების თარგმნა ---------- */
  T.translateError = function (e) {
    const m = String((e && e.message) || e);
    let r;
    if ((r = m.match(/^(\w+) is not defined/))) return `„${r[1]}“ არ არის განსაზღვრული. შეამოწმე სახელი (დიდი/პატარა ასოები) ან გამოაცხადე ცვლადი, მაგ.: int ${r[1]} = 0;`;
    if ((r = m.match(/([\w.$]+) is not a function/))) return `„${r[1]}“ ფუნქცია არ არის — შეამოწმე სახელი და ფრჩხილები.`;
    if (/Assignment to constant/.test(m)) return 'const ცვლადის მნიშვნელობის შეცვლა შეუძლებელია — მოაშორე „const“.';
    if (/has already been declared/.test(m)) { r = m.match(/'(\w+)'/); return `ცვლადი „${r ? r[1] : ''}“ ორჯერ არის გამოცხადებული.`; }
    if (/yield/.test(m)) return 'delay() ან საკუთარი ფუნქციის გამოძახება ფუნქციის გარეთ (გლობალურად) არ შეიძლება — გადაიტანე setup()-ში ან loop()-ში.';
    if (/Maximum call stack/.test(m)) return 'უსასრულო რეკურსია: ფუნქცია თავის თავს უსასრულოდ იძახებს.';
    if (/Unexpected|missing|Invalid|unterminated/i.test(m)) return 'სინტაქსური შეცდომა: შეამოწმე ფრჩხილები ( ) { }, წერტილ-მძიმეები „;“ და ბრჭყალები. (' + m + ')';
    return 'შეცდომა: ' + m;
  };

  /* ============================================================
   * სიმულატორი
   * ============================================================ */
  const LOOP_OVERHEAD = 0.1; // მწ ერთ loop() გამეორებაზე
  const TICK = 0.01;         // მწ ციკლის ერთ ბიჯზე

  class Sim {
    constructor() {
      this.inputs = { button: false, pot: 512, light: 600 };
      this.factory = null;
      this.resetState();
    }
    resetState() {
      this.vtime = 0;
      this.pins = new Array(20).fill(0);
      this.pwm = new Array(20).fill(0);
      this.modes = {};
      this.servo = { attached: false, angle: 90, used: false };
      this.servoAngles = {};
      this.tones = {};
      this.tone = 0;
      this.serial = '';
      this.serialBegun = false;
      this.lcd = null;
      this._resume = undefined;
      this.events = [];
      this.warnings = new Map();
      this.reads = { button: 0, pot: 0, light: 0 };
      this.gen = null;
      this.prog = null;
      this.phase = 'idle';
      this.loopCount = 0;
      this.error = null;
      this.steps = 0;
    }
    compile(src) {
      const issues = T.lint(src);
      if (issues.some((i) => i.level === 'error')) return { ok: false, issues };
      try {
        const { js } = T.transpile(src);
        const body = '"use strict";\n{\n' + js + '\n;return { setup: (typeof setup === "function") ? setup : null, loop: (typeof loop === "function") ? loop : null };\n}';
        this.factory = new Function(...API_NAMES, 'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'LED_BUILTIN', 'DEC', 'HEX', 'BIN', 'F', 'PI', '__int', body);
        this.js = js;
        return { ok: true, issues };
      } catch (e) {
        issues.push({ level: 'error', msg: T.translateError(e) });
        return { ok: false, issues };
      }
    }
    start() {
      this.resetState();
      const api = this.makeApi();
      try {
        this.prog = this.factory(...API_NAMES.map((n) => api[n]), 1, 0, 0, 1, 2, 14, 15, 16, 17, 18, 19, 13, 10, 16, 2, (x) => x, Math.PI, (v) => (typeof v === 'number' ? Math.trunc(v) : v));
      } catch (e) { this.fail(e); return false; }
      if (!this.prog.setup || !this.prog.loop) { this.fail(new Error('setup() ან loop() ვერ მოიძებნა')); return false; }
      this.gen = this.prog.setup();
      this.phase = 'setup';
      return true;
    }
    fail(e) {
      this.error = T.translateError(e);
      this.phase = 'error';
      this.gen = null;
    }
    /** ერთი ბიჯი: აბრუნებს 'tick' | 'delay' | 'loopEnd' | 'error' | 'halt' */
    stepOnce() {
      if (!this.gen) return 'halt';
      let r;
      try { const rv = this._resume; this._resume = undefined; r = this.gen.next(rv); } catch (e) { this.fail(e); return 'error'; }
      this.steps++;
      if (r.done) {
        if (this.phase === 'setup') this.phase = 'loop';
        else { this.loopCount++; this.vtime += LOOP_OVERHEAD; }
        this.gen = this.prog.loop();
        return 'loopEnd';
      }
      const y = r.value;
      if (Array.isArray(y) && y[0] === 'p') {
        const us = this.hw && this.hw.pulseIn ? this.hw.pulseIn(Number(y[1]), y[2] === undefined ? 1 : y[2]) : 0;
        if (!this.hw) this.warn('pulse', 'pulseIn() საჭიროებს ულტრაბგერით სენსორს — გამოიყენე „სქემის კონსტრუქტორი“.');
        this._resume = us; this.vtime += Math.max(0.05, (us || 1000) / 1000); return 'tick';
      }
      if (Array.isArray(y)) { this.vtime += Math.max(0, Number(y[1]) || 0); return 'delay'; }
      this.vtime += TICK;
      return 'tick';
    }
    /** ვირტუალური დროის t-მდე შესრულება (budget — ბიჯების ლიმიტი) */
    runUntil(t, budget = 200000) {
      let n = 0;
      while (this.gen && this.vtime < t && n < budget) { this.stepOnce(); n++; }
      return this.vtime >= t;
    }
    /** "ნაბიჯი" ღილაკი: შესრულება შემდეგ delay()-მდე ან loop()-ის დასრულებამდე */
    stepLoop() {
      for (let n = 0; n < 200000; n++) {
        const r = this.stepOnce();
        if (r !== 'tick') return r;
      }
      return 'tick';
    }
    warn(key, msg) { if (!this.warnings.has(key)) this.warnings.set(key, msg); }
    makeApi() {
      const s = this;
      const pinName = (p) => (p >= 14 ? 'A' + (p - 14) : String(p));
      const np = (p) => { const n = Number(p); if (!Number.isFinite(n)) throw new Error('პინის ნომერი არასწორია: ' + p); return n; };
      const ncWarn = (p) => { if (!s.hw && !(p in COMPONENTS)) s.warn('nc' + p, `პინ ${pinName(p)}-ზე არაფერია მიერთებული. მიერთებული პინები: ${CONNECTED_TEXT}.`); };
      const record = (pin, v) => { s.events.push({ t: s.vtime, pin, v }); if (s.events.length > 6000) s.events.splice(0, 2000); };
      const out = (x, fmt) => {
        if (!s.serialBegun) s.warn('serial', 'Serial.print() გამოიძახე Serial.begin(9600)-ის გარეშე. დაამატე setup()-ში: Serial.begin(9600);');
        let str;
        if (typeof x === 'number') {
          if (Number.isInteger(x)) str = (fmt === 2 || fmt === 8 || fmt === 16) ? x.toString(fmt).toUpperCase() : String(x);
          else str = x.toFixed(typeof fmt === 'number' && fmt < 8 ? fmt : 2);
        } else if (typeof x === 'boolean') str = x ? '1' : '0';
        else str = String(x);
        s.serial += str;
        if (s.serial.length > 20000) s.serial = s.serial.slice(-15000);
      };
      const fmtVal = (x, fmt) => {
        if (typeof x === 'number') {
          if (Number.isInteger(x)) return (fmt === 2 || fmt === 8 || fmt === 16) ? x.toString(fmt).toUpperCase() : String(x);
          return x.toFixed(typeof fmt === 'number' && fmt < 8 ? fmt : 2);
        }
        if (typeof x === 'boolean') return x ? '1' : '0';
        return String(x);
      };
      class LiquidCrystal_I2C {
        constructor(addr, cols = 16, rows = 2) {
          if (typeof cols !== 'number' || cols > 40) cols = 16;
          if (typeof rows !== 'number' || rows > 4) rows = 2;
          this.L = s.lcd = { cols, rows, lines: Array.from({ length: rows }, () => ' '.repeat(cols)), cx: 0, cy: 0, backlight: false, on: false, cursor: false };
        }
        init() { this.L.on = true; } begin() { this.L.on = true; }
        backlight() { this.L.backlight = true; } noBacklight() { this.L.backlight = false; }
        display() { this.L.on = true; } noDisplay() { this.L.on = false; }
        clear() { this.L.lines = this.L.lines.map(() => ' '.repeat(this.L.cols)); this.L.cx = 0; this.L.cy = 0; }
        home() { this.L.cx = 0; this.L.cy = 0; }
        setCursor(c, r) { this.L.cx = Math.max(0, Math.floor(c)); this.L.cy = Math.max(0, Math.min(this.L.rows - 1, Math.floor(r))); }
        cursor() { } noCursor() { } blink() { } noBlink() { }
        print(x, fmt) {
          if (!this.L.on) s.warn('lcdinit', 'LCD: setup()-ში გამოიძახე lcd.init(); და lcd.backlight();');
          const str = fmtVal(x, fmt).replace(/[^\x20-\x7e]/g, '?');
          if (/[^\x20-\x7e]/.test(fmtVal(x, fmt))) s.warn('lcdascii', 'LCD მხოლოდ ლათინურ სიმბოლოებს აჩვენებს (ASCII) — ქართული ასოები „?“-ით გამოჩნდება.');
          for (const ch of str) {
            if (this.L.cx < this.L.cols) { const ln = this.L.lines[this.L.cy]; this.L.lines[this.L.cy] = ln.slice(0, this.L.cx) + ch + ln.slice(this.L.cx + 1); }
            this.L.cx++;
          }
        }
        println(x, f2) { this.print(x === undefined ? '' : x, f2); }
        write(x) { this.print(typeof x === 'number' ? String.fromCharCode(x) : x); }
      }
      class Servo {
        attach(p) {
          this.pin = np(p);
          if (s.hw) { s.servoAngles[this.pin] = s.servoAngles[this.pin] ?? 90; return; }
          if (this.pin !== 9) s.warn('srvpin', 'სერვო ფიზიკურად მიერთებულია პინ 9-ზე — გამოიყენე myServo.attach(9);');
          else s.servo.attached = true;
        }
        write(a) {
          if (this.pin === undefined) { s.warn('srvatt', 'servo.write() გამოიძახე attach()-მდე. setup()-ში დაწერე: myServo.attach(9);'); return; }
          const ang = Math.max(0, Math.min(180, Math.round(Number(a) || 0)));
          if (s.hw) { if (s.servoAngles[this.pin] !== ang) record('servo' + this.pin, ang); s.servoAngles[this.pin] = ang; s.servo.used = true; return; }
          if (this.pin !== 9) return;
          s.servo.used = true;
          if (ang !== s.servo.angle) record('servo', ang);
          s.servo.angle = ang;
        }
        read() { return s.hw ? (s.servoAngles[this.pin] ?? 90) : s.servo.angle; }
        detach() { s.servo.attached = false; }
        attached() { return s.servo.attached; }
      }
      return {
        pinMode(p, m) { p = np(p); if (s.modes[p] !== m && s.hw) s.hw.dirty(); s.modes[p] = m; ncWarn(p); },
        digitalWrite(p, v) {
          p = np(p); const val = v ? 1 : 0;
          if (s.modes[p] !== 1) s.warn('nm' + p, `digitalWrite(${pinName(p)}, …) გამოიძახე, მაგრამ setup()-ში არ არის pinMode(${pinName(p)}, OUTPUT); — რეალურ დაფაზე LED ძალიან მკრთალად აინთება.`);
          ncWarn(p);
          if (s.pins[p] !== val || s.pwm[p] !== (val ? 255 : 0)) { record(p, val); if (s.hw) s.hw.dirty(); }
          s.pins[p] = val; s.pwm[p] = val ? 255 : 0;
        },
        digitalRead(p) {
          p = np(p);
          if (s.hw) { s.reads.any = (s.reads.any || 0) + 1; return s.hw.digitalRead(p, s.modes[p]); }
          if (p === 2) {
            s.reads.button++;
            const m = s.modes[2];
            if (m === undefined) s.warn('rm2', 'digitalRead(2) — ღილაკის პინისთვის setup()-ში მიუთითე pinMode(2, INPUT); ან pinMode(2, INPUT_PULLUP);');
            if (m === 2) return s.inputs.button ? 0 : 1; // INPUT_PULLUP: დაჭერა = LOW
            return s.inputs.button ? 1 : 0;
          }
          if (p === 14 || p === 15) return (p === 14 ? s.inputs.pot : s.inputs.light) > 511 ? 1 : 0;
          ncWarn(p);
          return s.pins[p] || 0;
        },
        analogRead(p) {
          p = np(p); if (p < 6) p += 14;
          if (s.hw) { s.reads.any = (s.reads.any || 0) + 1; return s.hw.analogRead(p); }
          if (p === 14) { s.reads.pot++; return Math.round(s.inputs.pot); }
          if (p === 15) { s.reads.light++; return Math.round(s.inputs.light); }
          s.warn('ar' + p, `analogRead(${pinName(p)}) — ამ პინზე სენსორი არ არის. გამოიყენე A0 (პოტენციომეტრი) ან A1 (სინათლის სენსორი).`);
          return 0;
        },
        analogWrite(p, v) {
          p = np(p); v = Math.max(0, Math.min(255, Math.round(Number(v) || 0)));
          if (!PWM_PINS.includes(p)) { s.warn('pwm' + p, `analogWrite(${p}, …) — პინი ${p} PWM-ს არ უჭერს მხარს, ამიტომ მხოლოდ ჩაირთვება/გამოირთვება. PWM პინები: 3, 5, 6, 9, 10, 11.`); v = v >= 128 ? 255 : 0; }
          ncWarn(p);
          if (s.pwm[p] !== v) { record(p, v > 0 ? 1 : 0); if (s.hw) s.hw.dirty(); }
          s.pwm[p] = v; s.pins[p] = v > 0 ? 1 : 0;
        },
        delay() { /* ჩანაცვლებულია yield-ით */ },
        delayMicroseconds() { },
        millis() { return Math.floor(s.vtime); },
        micros() { return Math.floor(s.vtime * 1000); },
        map(x, a, b, c, d) { return Math.trunc((x - a) * (d - c) / (b - a) + c); },
        constrain(x, a, b) { return Math.min(b, Math.max(a, x)); },
        random(a, b) { if (b === undefined) { b = a; a = 0; } return Math.floor(a + Math.random() * (b - a)); },
        randomSeed() { },
        tone(p, f) { p = np(p); if (s.hw) { s.tones[p] = Number(f) || 0; if (!s.pins[p]) record(p, 1); s.pins[p] = 1; s.pwm[p] = 255; s.hw.dirty(); return; } if (p !== 8) { s.warn('tone', 'ზუმერი მიერთებულია პინ 8-ზე: tone(8, 440);'); return; } s.tone = Number(f) || 0; if (!s.pins[8]) record(8, 1); s.pins[8] = 1; },
        noTone(p) { if (s.hw) { p = np(p); s.tones[p] = 0; if (s.pins[p]) record(p, 0); s.pins[p] = 0; s.pwm[p] = 0; s.hw.dirty(); return; } if (s.pins[8]) record(8, 0); s.tone = 0; s.pins[8] = 0; void p; },
        Serial: {
          begin() { s.serialBegun = true; },
          print(x, f) { out(x, f); },
          println(x, f) { if (x !== undefined) out(x, f); else if (!s.serialBegun) out(''); s.serial += '\n'; },
          write(x) { out(typeof x === 'number' ? String.fromCharCode(x) : x); },
          available() { return 0; },
          read() { return -1; },
        },
        Servo,
        LiquidCrystal_I2C,
        Wire: { begin() { } },
        pulseIn() { return 0; },
        abs: Math.abs, min: Math.min, max: Math.max, pow: Math.pow, sqrt: Math.sqrt,
      };
    }
    /** მუშაობის დროს აღმოჩენილი ქცევითი მინიშნებები */
    behaviourHints() {
      const hints = [];
      const t = this.vtime;
      [13, 12, 11].forEach((p) => {
        const n = this.events.filter((e) => e.pin === p && e.t > t - 1000).length;
        if (n > 40) hints.push(`LED ${p} წამში ${n}-ჯერ გადაირთო — თვალით ციმციმი ვერ შეამჩნევ. დაამატე delay() ჩართვისა და გამორთვის შემდეგ.`);
      });
      if (t > 3000 && this.events.length === 0 && !this.serial) hints.push('3 წამის განმავლობაში კოდმა არცერთი გამოსავალი არ შეცვალა. შეამოწმე digitalWrite / analogWrite / Serial.println.');
      if (this._userPressed && this.reads.button === 0 && t > 500) hints.push('ღილაკს აჭერ, მაგრამ კოდი digitalRead(2)-ს არ კითხულობს.');
      if (this._userPot && this.reads.pot === 0 && t > 500) hints.push('პოტენციომეტრს ატრიალებ, მაგრამ კოდი analogRead(A0)-ს არ კითხულობს.');
      if (this._userLight && this.reads.light === 0 && t > 500) hints.push('სინათლის სენსორს ცვლი, მაგრამ კოდი analogRead(A1)-ს არ კითხულობს.');
      return hints;
    }
  }
  T.Sim = Sim;

  /* ---------- ავტომატური ტესტირება ---------- */
  class TestAbort extends Error { }
  T.runTest = function (code, exercise, params) {
    const sim = new Sim();
    const comp = sim.compile(code);
    if (!comp.ok) {
      const errs = comp.issues.filter((i) => i.level === 'error').map((i) => i.msg);
      return { passed: false, score: 0, checks: [{ label: 'კოდის კომპილაცია', ok: false, hint: errs.join(' ') }], warnings: [] };
    }
    if (!sim.start()) return { passed: false, score: 0, checks: [{ label: 'პროგრამის გაშვება', ok: false, hint: sim.error }], warnings: [] };
    const ctx = {
      sim,
      set(k, v) { sim.inputs[k] = v; },
      run(ms) {
        const ok = sim.runUntil(sim.vtime + ms, 2000000);
        if (sim.error) throw new TestAbort(sim.error);
        if (!ok) throw new TestAbort('კოდი ძალიან დიდხანს სრულდება ან ციკლი არ მთავრდება.');
      },
      led: (p) => sim.pins[p], pwm: (p) => sim.pwm[p], servo: () => sim.servo.angle,
      serial: () => sim.serial, events: (pin) => sim.events.filter((e) => e.pin === pin), now: () => sim.vtime,
    };
    const checks = [];
    const check = (label, cond, hint) => { checks.push({ label, ok: !!cond, hint: cond ? '' : hint }); return !!cond; };
    try { exercise.test(ctx, check, params || {}); }
    catch (e) { checks.push({ label: 'შესრულება', ok: false, hint: e instanceof TestAbort ? e.message : T.translateError(e) }); }
    const okN = checks.filter((c) => c.ok).length;
    return { passed: checks.length > 0 && okN === checks.length, score: checks.length ? Math.round(100 * okN / checks.length) : 0, checks, warnings: [...sim.warnings.values()] };
  };
})(window.VL);
