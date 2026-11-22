/* ============================================================
 * tech/circuit/templates.js — სასტარტო პროექტები და სქემის გამოწვევები
 * ============================================================ */
(function (VL) {
  'use strict';
  const CZ = VL.Circuit;
  const A = (x = 0, y = 240) => ({ id: 'u1', type: 'arduino', x, y, rot: 0, props: {} });
  const p = (id, type, x, y, props = {}, rot = 0) => ({ id, type, x, y, rot, props: { ...(CZ.PARTS[type].props || {}), ...props } });
  const w = (a, b, color = '#2f9e44', pts) => ({ a, b, color, pts: pts || [] });
  const RED = '#e03131', BLK = '#343a40', GRN = '#2f9e44', BLU = '#1c7ed6', ORG = '#f76707', YEL = '#f59f00', PUR = '#7048e8';

  CZ.TEMPLATES = [
    {
      key: 'blink', icon: '💡', name: 'LED-ის ციმციმი', desc: 'Arduino + რეზისტორი + LED. კლასიკური პირველი პროექტი.',
      parts: [A(), p('D1', 'led', 40, 120, { color: 'red' }), p('R1', 'resistor', 100, 120, { r: 220 })],
      wires: [w('D1.A', 'R1.p1', GRN), w('R1.p2', 'u1.D13', ORG), w('D1.K', 'u1.GND1', BLK)],
      code: `// LED-ის ციმციმი პინ 13-ზე\nvoid setup() {\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(500);\n  digitalWrite(13, LOW);\n  delay(500);\n}\n`,
    },
    {
      key: 'battery-led', icon: '🔋', name: 'ბატარეა, გადამრთველი და LED', desc: 'უმარტივესი ელექტრული წრედი Arduino-ს გარეშე. ჩართე გადამრთველი!',
      parts: [p('BAT1', 'battery', 0, 120, { v: 9 }), p('SW1', 'switch', 100, 120), p('R1', 'resistor', 180, 120, { r: 470 }), p('D1', 'led', 280, 120, { color: 'green' })],
      wires: [w('BAT1.P', 'SW1.p1', RED), w('SW1.p2', 'R1.p1', RED), w('R1.p2', 'D1.A', RED), w('D1.K', 'BAT1.N', BLK)],
      code: '',
    },
    {
      key: 'button', icon: '🔘', name: 'ღილაკი + LED (breadboard)', desc: 'ღილაკი pull-down რეზისტორით და LED — ყველაფერი დაფაზე.',
      parts: [p('BB1', 'breadboard', 0, 0), A(40, 420), p('S1', 'button', 100, 140), p('R2', 'resistor', 140, 100, { r: 10000 }), p('D1', 'led', 300, 140, { color: 'yellow' }), p('R1', 'resistor', 320, 120, { r: 220 })],
      wires: [w('BB1:1:0', 'u1.5V', RED), w('BB1:0:1', 'u1.GND1', BLK), w('BB1:2:5', 'BB1:1:4', RED), w('BB1:2:10', 'BB1:0:10', BLK), w('BB1:2:15', 'BB1:0:15', BLK), w('BB1:2:19', 'u1.D12', ORG), w('BB1:2:7', 'u1.D2', BLU)],
      code: `// ღილაკი (პინი 2) მართავს LED-ს (პინი 12)\nvoid setup() {\n  pinMode(2, INPUT);\n  pinMode(12, OUTPUT);\n}\n\nvoid loop() {\n  int state = digitalRead(2);\n  digitalWrite(12, state);\n}\n`,
    },
    {
      key: 'pot-dimmer', icon: '🎛️', name: 'პოტენციომეტრი → სიკაშკაშე', desc: 'analogRead + map + analogWrite (PWM).',
      parts: [A(), p('RV1', 'pot', 60, 120), p('R1', 'resistor', 180, 120, { r: 220 }), p('D1', 'led', 280, 120, { color: 'blue' })],
      wires: [w('RV1.A', 'u1.GND1', BLK), w('RV1.B', 'u1.5V', RED), w('RV1.W', 'u1.A0', YEL), w('u1.D9', 'R1.p1', ORG), w('R1.p2', 'D1.A', GRN), w('D1.K', 'u1.GND1', BLK)],
      code: `void setup() {\n  pinMode(9, OUTPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int value = analogRead(A0);            // 0..1023\n  int brightness = map(value, 0, 1023, 0, 255);\n  analogWrite(9, brightness);            // PWM\n  Serial.println(value);\n  delay(50);\n}\n`,
    },
    {
      key: 'servo', icon: '🦾', name: 'სერვო პოტენციომეტრით', desc: 'Servo ბიბლიოთეკა: კუთხე 0°–180°.',
      parts: [A(), p('SV1', 'servo', 140, 160), p('RV1', 'pot', 300, 160)],
      wires: [w('SV1.GND', 'u1.GND1', BLK), w('SV1.V', 'u1.5V', RED), w('SV1.SIG', 'u1.D9', ORG), w('RV1.A', 'u1.GND2', BLK), w('RV1.B', 'u1.5V', RED), w('RV1.W', 'u1.A0', YEL)],
      code: `#include <Servo.h>\nServo myServo;\n\nvoid setup() {\n  myServo.attach(9);\n}\n\nvoid loop() {\n  int angle = map(analogRead(A0), 0, 1023, 0, 180);\n  myServo.write(angle);\n  delay(15);\n}\n`,
    },
    {
      key: 'thermo', icon: '🌡️', name: 'ციფრული თერმომეტრი (TMP36)', desc: 'ძაბვის გადაყვანა ტემპერატურად და სერიულ მონიტორზე გამოტანა.',
      parts: [A(), p('T1', 'tmp36', 120, 160), p('R1', 'resistor', 240, 120, { r: 220 }), p('D1', 'led', 340, 120, { color: 'red' })],
      wires: [w('T1.VS', 'u1.5V', RED), w('T1.VO', 'u1.A0', YEL), w('T1.GND', 'u1.GND1', BLK), w('u1.D7', 'R1.p1', ORG), w('R1.p2', 'D1.A', GRN), w('D1.K', 'u1.GND1', BLK)],
      code: `void setup() {\n  Serial.begin(9600);\n  pinMode(7, OUTPUT);\n}\n\nvoid loop() {\n  int raw = analogRead(A0);\n  float voltage = raw * 5.0 / 1023.0;\n  float tempC = (voltage - 0.5) * 100.0;\n  Serial.print("ტემპერატურა: ");\n  Serial.print(tempC);\n  Serial.println(" C");\n  // 30°C-ზე მეტი — წითელი LED (გაფრთხილება)\n  digitalWrite(7, tempC > 30);\n  delay(500);\n}\n`,
    },
    {
      key: 'motor', icon: '⚙️', name: 'ძრავა ტრანზისტორით', desc: 'NPN ტრანზისტორი როგორც გასაღები — Arduino-ს პინი მხოლოდ ბაზას მართავს.',
      parts: [A(), p('Q1', 'npn', 100, 160), p('R1', 'resistor', 160, 80, { r: 1000 }), p('M1', 'motor', 260, 160)],
      wires: [w('u1.D3', 'R1.p1', ORG), w('R1.p2', 'Q1.B', ORG), w('Q1.E', 'u1.GND1', BLK), w('Q1.C', 'M1.p2', BLU), w('M1.p1', 'u1.5V', RED)],
      code: `// ძრავის სიჩქარე PWM-ით\nvoid setup() {\n  pinMode(3, OUTPUT);\n}\n\nvoid loop() {\n  for (int s = 0; s <= 255; s += 5) {\n    analogWrite(3, s);\n    delay(40);\n  }\n  delay(1000);\n  analogWrite(3, 0);\n  delay(1000);\n}\n`,
    },
    {
      key: 'rgb', icon: '🌈', name: 'RGB LED ფერები', desc: 'სამი PWM არხით ნებისმიერი ფერის მიღება.',
      parts: [A(), p('R1', 'resistor', 40, 40, { r: 220 }), p('R2', 'resistor', 40, 80, { r: 220 }), p('R3', 'resistor', 40, 120, { r: 220 }), p('D1', 'rgbled', 200, 160)],
      wires: [w('u1.D11', 'R1.p1', RED), w('u1.D10', 'R2.p1', GRN), w('u1.D9', 'R3.p1', BLU), w('R1.p2', 'D1.R', RED), w('R2.p2', 'D1.G', GRN), w('R3.p2', 'D1.B', BLU), w('D1.K', 'u1.GND1', BLK)],
      code: `void setColor(int r, int g, int b) {\n  analogWrite(11, r);\n  analogWrite(10, g);\n  analogWrite(9, b);\n}\n\nvoid setup() {\n  pinMode(11, OUTPUT);\n  pinMode(10, OUTPUT);\n  pinMode(9, OUTPUT);\n}\n\nvoid loop() {\n  setColor(255, 0, 0);   delay(700);  // წითელი\n  setColor(0, 255, 0);   delay(700);  // მწვანე\n  setColor(0, 0, 255);   delay(700);  // ლურჯი\n  setColor(255, 200, 0); delay(700);  // ყვითელი\n  setColor(180, 0, 255); delay(700);  // იისფერი\n}\n`,
    },
    {
      key: 'night', icon: '🌙', name: 'ღამის განათება (LDR)', desc: 'ფოტორეზისტორი + 10 kΩ ძაბვის გამყოფი → A0. ბნელში LED ირთვება.',
      parts: [A(), p('LDR1', 'ldr', 60, 140), p('R2', 'resistor', 120, 140, { r: 10000 }), p('D1', 'led', 260, 140, { color: 'white' }), p('R1', 'resistor', 300, 100, { r: 220 })],
      wires: [w('LDR1.p1', 'u1.5V', RED), w('LDR1.p2', 'u1.A0', YEL), w('LDR1.p2', 'R2.p1', YEL), w('R2.p2', 'u1.GND1', BLK), w('u1.D13', 'R1.p2', ORG), w('R1.p1', 'D1.A', GRN), w('D1.K', 'u1.GND1', BLK)],
      code: `void setup() {\n  pinMode(13, OUTPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int light = analogRead(A0);\n  Serial.println(light);\n  if (light < 500) {\n    digitalWrite(13, HIGH);   // ბნელა\n  } else {\n    digitalWrite(13, LOW);\n  }\n  delay(100);\n}\n`,
    },
    {
      key: 'melody', icon: '🎵', name: 'მელოდია ზუმერით', desc: 'tone() და ნოტების სიხშირეები. ჩართე ხმა 🔊!',
      parts: [A(), p('BZ1', 'buzzer', 160, 160)],
      wires: [w('BZ1.P', 'u1.D8', PUR), w('BZ1.N', 'u1.GND1', BLK)],
      code: `int notes[] = {262, 294, 330, 349, 392, 440, 494, 523};\n\nvoid setup() {\n  pinMode(8, OUTPUT);\n}\n\nvoid loop() {\n  for (int i = 0; i < 8; i++) {\n    tone(8, notes[i]);\n    delay(250);\n  }\n  noTone(8);\n  delay(1000);\n}\n`,
    },
  ];

  /* ---------- სქემის გამოწვევები (ავტომატური შემოწმებით) ---------- */
  const leds = (t) => t.parts('led').concat(t.parts('rgbled'));
  CZ.CHALLENGES = [
    {
      key: 'led-battery', icon: '🔋', title: 'აანთე LED ბატარეით', level: 'დამწყები',
      text: 'შეაერთე ბატარეა, რეზისტორი და LED ისე, რომ LED ანთოს და არ დაიწვას. მინიშნება: დენი უნდა გავიდეს ანოდიდან (+) კათოდისკენ (−).',
      start: { parts: [p('BAT1', 'battery', 0, 120, { v: 9 }), p('R1', 'resistor', 120, 60, { r: 10 }), p('D1', 'led', 260, 120, { color: 'red' })], wires: [], code: '' },
      test(t, check) {
        const L = t.parts('led');
        if (!check('სქემაში არის LED', L.length > 0, 'დაამატე LED კომპონენტების პანელიდან.')) return;
        t.run(0);
        const r = t.res(L[0].id);
        check('LED ანთია', r.bright > 0.3 && !r.burned, r.burned ? 'LED დაიწვა — გაზარდე რეზისტორის წინაღობა (მაგ. 470 Ω).' : 'წრედი დაკეტილი არ არის ან LED შებრუნებულია (ანოდი → +).');
        check('LED-ის დენი უსაფრთხოა (≤ 25 mA)', !r.burned && (r.I || 0) <= 0.025, `დენი ${(Math.max(0, r.I || 0) * 1000).toFixed(0)} mA — აირჩიე უფრო დიდი რეზისტორი (I = (9 − 1.8) / R).`);
      },
    },
    {
      key: 'blink', icon: '💡', title: 'ააწყე და დააპროგრამე ციმციმი', level: 'დამწყები',
      text: 'შეაერთე LED რეზისტორით Arduino-ს ნებისმიერ ციფრულ პინთან და დაწერე კოდი, რომელიც მას აციმციმებს (მინ. 4 გადართვა 4 წამში). LED არ უნდა დაიწვას.',
      start: { parts: [A(), p('D1', 'led', 60, 100, { color: 'green' }), p('R1', 'resistor', 140, 100, { r: 220 })], wires: [], code: '// აქ დაწერე კოდი\nvoid setup() {\n\n}\n\nvoid loop() {\n\n}\n' },
      test(t, check) {
        const L = leds(t);
        if (!check('სქემაში არის Arduino და LED', t.parts('arduino').length && L.length, 'საჭიროა Arduino და LED.')) return;
        let tog = 0; const last = {};
        t.run(4000, () => L.forEach((l) => { const r = t.c.res[l.id] || {}; const b = (r.bright || Math.max(...(r.rgb || [0]))) > 0.3; if (last[l.id] !== undefined && b !== last[l.id]) tog++; last[l.id] = b; }));
        check(`LED ციმციმებს (${tog} გადართვა)`, tog >= 4, 'შეამოწმე სადენები (პინი → რეზისტორი → LED ანოდი, კათოდი → GND) და კოდი (pinMode, digitalWrite, delay).');
        check('LED არ დაიწვა', !L.some((l) => t.c.burned[l.id]), 'LED-ს მიმდევრობით სჭირდება რეზისტორი (220 Ω).');
      },
    },
    {
      key: 'button', icon: '🔘', title: 'ღილაკი სტაბილური წაკითხვით', level: 'საშუალო',
      text: 'ღილაკზე დაჭერისას LED უნდა ანთოს, აშვებისას — ჩაქრეს. შესასვლელი არ უნდა იყოს „ჰაერში“: გამოიყენე pull-down რეზისტორი (10 kΩ) ან INPUT_PULLUP.',
      start: { parts: [p('BB1', 'breadboard', 0, 0), A(40, 420), p('S1', 'button', 80, 140), p('R2', 'resistor', 220, 100, { r: 10000 }), p('D1', 'led', 360, 140, { color: 'yellow' }), p('R1', 'resistor', 440, 100, { r: 220 })], wires: [], code: 'void setup() {\n  pinMode(2, INPUT);\n  pinMode(12, OUTPUT);\n}\n\nvoid loop() {\n\n}\n' },
      test(t, check) {
        const B = t.parts('button'), L = leds(t);
        if (!check('სქემაში არის ღილაკი, LED და Arduino', B.length && L.length && t.parts('arduino').length, 'დაამატე საჭირო კომპონენტები.')) return;
        const lit = () => L.some((l) => (t.c.res[l.id] || {}).bright > 0.3);
        const states = [];
        for (const press of [false, true, false, true, false]) { B.forEach((b) => t.set(b.id, 'pressed', press)); t.run(150); states.push(lit() === press); }
        check('აშვებული → LED ჩამქრალია', states[0] && states[2] && states[4], 'როცა ღილაკი აშვებულია, LED ანთია — შეამოწმე ლოგიკა (INPUT_PULLUP-ისას დაჭერა = LOW).');
        check('დაჭერილი → LED ანთია', states[1] && states[3], 'ღილაკი უნდა უკავშირდებოდეს Arduino-ს პინს და 5V-ს (ან GND-ს INPUT_PULLUP-ისას).');
        check('შესასვლელი არ არის „ჰაერში“', !t.warnKeys().some((k) => k.startsWith('float')), 'დაამატე 10 kΩ pull-down რეზისტორი პინიდან GND-მდე, ან გამოიყენე INPUT_PULLUP.');
      },
    },
    {
      key: 'dimmer', icon: '🎛️', title: 'სიკაშკაშის რეგულატორი', level: 'საშუალო',
      text: 'პოტენციომეტრი მიუერთე ანალოგურ შესასვლელს, LED — PWM პინს (~). პოტენციომეტრის მობრუნებით LED-ის სიკაშკაშე უნდა იცვლებოდეს (0% → ჩამქრალი, 100% → კაშკაშა).',
      start: { parts: [A(), p('RV1', 'pot', 60, 120), p('R1', 'resistor', 180, 120, { r: 220 }), p('D1', 'led', 300, 120, { color: 'blue' })], wires: [], code: 'void setup() {\n\n}\n\nvoid loop() {\n  int value = analogRead(A0);\n\n}\n' },
      test(t, check) {
        const Pt = t.parts('pot'), L = t.parts('led');
        if (!check('სქემაში არის პოტენციომეტრი, LED და Arduino', Pt.length && L.length && t.parts('arduino').length, 'დაამატე საჭირო კომპონენტები.')) return;
        const br = (pos) => { Pt.forEach((x) => t.set(x.id, 'pos', pos)); t.run(200); return (t.c.res[L[0].id] || {}).bright || 0; };
        const lo = br(0), mid = br(0.5), hi = br(1);
        const a = Math.min(lo, hi), b = Math.max(lo, hi);
        check(`ერთ ბოლოში LED თითქმის ჩამქრალია (${Math.round(a * 100)}%)`, a < 0.12, 'შეამოწმე analogRead → map(…, 0, 255) → analogWrite PWM პინზე.');
        check(`მეორე ბოლოში LED კაშკაშაა (${Math.round(b * 100)}%)`, b > 0.4, 'LED PWM პინს (3, 5, 6, 9, 10, 11) უნდა უკავშირდებოდეს რეზისტორით.');
        check(`შუაში — საშუალო (${Math.round(mid * 100)}%)`, mid > a + 0.08 && mid < b - 0.08, 'სიკაშკაშე თანდათან უნდა იცვლებოდეს — გამოიყენე analogWrite და არა digitalWrite.');
      },
    },
    {
      key: 'motor', icon: '⚙️', title: 'ძრავა ტრანზისტორით', level: 'რთული',
      text: 'ჩართე DC ძრავა ისე, რომ Arduino-ს პინი არ გადაიტვირთოს: გამოიყენე NPN ტრანზისტორი (ბაზაზე 1 kΩ). კოდმა ძრავა უნდა აამუშაოს.',
      start: { parts: [A(), p('Q1', 'npn', 100, 160), p('R1', 'resistor', 160, 80, { r: 1000 }), p('M1', 'motor', 280, 160)], wires: [], code: 'void setup() {\n  pinMode(3, OUTPUT);\n}\n\nvoid loop() {\n\n}\n' },
      test(t, check) {
        const M = t.parts('motor');
        if (!check('სქემაში არის ძრავა და Arduino', M.length && t.parts('arduino').length, 'დაამატე DC ძრავა.')) return;
        let mx = 0;
        t.run(2500, () => M.forEach((m) => { mx = Math.max(mx, Math.abs((t.c.res[m.id] || {}).speed || 0)); }));
        check(`ძრავა ბრუნავს (${Math.round(mx * 100)}%)`, mx > 0.4, 'ძრავა: +5V → ძრავა → კოლექტორი (C); ემიტერი (E) → GND; პინი → 1 kΩ → ბაზა (B). კოდში ჩართე პინი.');
        check('Arduino-ს პინი არ არის გადატვირთული', !t.warnKeys().some((k) => k.startsWith('pinOver')), 'პინიდან 40 mA-ზე მეტი იხარჯება — ძრავა პირდაპირ კი არა, ტრანზისტორით ჩართე.');
        check('გამოყენებულია ტრანზისტორი', t.parts('npn').length > 0 && t.parts('npn').some((q) => (t.c.res[q.id] || {}).Ib !== undefined), 'დაამატე NPN ტრანზისტორი.');
      },
    },
  ];
  CZ.getChallenge = (key) => CZ.CHALLENGES.find((c) => c.key === key) || null;
})(window.VL);
