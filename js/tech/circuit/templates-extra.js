/* ============================================================
 * tech/circuit/templates-extra.js — ახალი კომპონენტების პროექტები და გამოწვევები
 * ============================================================ */
(function (VL) {
  'use strict';
  const CZ = VL.Circuit;
  const A = (x = 0, y = 240) => ({ id: 'u1', type: 'arduino', x, y, rot: 0, props: {} });
  const p = (id, type, x, y, props = {}, rot = 0) => ({ id, type, x, y, rot, props: { ...(CZ.PARTS[type].props || {}), ...props } });
  const w = (a, b, color = '#2f9e44') => ({ a, b, color, pts: [] });
  const RED = '#e03131', BLK = '#343a40', GRN = '#2f9e44', BLU = '#1c7ed6', ORG = '#f76707', YEL = '#f59f00', PUR = '#7048e8', GRY = '#868e96';

  CZ.TEMPLATES.push(
    {
      key: 'parking', icon: '🚗', name: 'პარკირების სენსორი', desc: 'HC-SR04 ზომავს მანძილს, ზუმერი და LED აფრთხილებს დაბრკოლებაზე.',
      parts: [A(), p('US1', 'ultrasonic', 300, 140), p('BZ1', 'buzzer', 100, 140), p('D1', 'led', 180, 120, { color: 'red' }), p('R1', 'resistor', 180, 180, { r: 220 })],
      wires: [w('US1.VCC', 'u1.5V', RED), w('US1.GND', 'u1.GND2', BLK), w('US1.TRIG', 'u1.D9', ORG), w('US1.ECHO', 'u1.D10', BLU), w('BZ1.P', 'u1.D8', PUR), w('BZ1.N', 'u1.GND1', BLK), w('D1.A', 'R1.p1', GRN), w('R1.p2', 'u1.D7', GRN), w('D1.K', 'u1.GND1', BLK)],
      code: `const int TRIG = 9;\nconst int ECHO = 10;\n\nvoid setup() {\n  pinMode(TRIG, OUTPUT);\n  pinMode(ECHO, INPUT);\n  pinMode(7, OUTPUT);\n  pinMode(8, OUTPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  digitalWrite(TRIG, LOW);\n  delayMicroseconds(2);\n  digitalWrite(TRIG, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(TRIG, LOW);\n  long duration = pulseIn(ECHO, HIGH);\n  int cm = duration / 58;\n  Serial.print("მანძილი: ");\n  Serial.print(cm);\n  Serial.println(" cm");\n  if (cm < 30) {\n    digitalWrite(7, HIGH);\n    tone(8, 1000);\n    delay(cm * 5);\n    noTone(8);\n  } else {\n    digitalWrite(7, LOW);\n    noTone(8);\n  }\n  delay(100);\n}\n`,
    },
    {
      key: 'lcd', icon: '📟', name: 'LCD ეკრანი: მისალმება და მთვლელი', desc: 'I2C LCD 16×2: ტექსტი, წამების მთვლელი და პოტენციომეტრის მნიშვნელობა.',
      parts: [A(0, 260), p('LCD1', 'lcd', 120, 160), p('RV1', 'pot', 320, 160)],
      wires: [w('LCD1.GND', 'u1.GND1', BLK), w('LCD1.VCC', 'u1.5V', RED), w('LCD1.SDA', 'u1.A4', BLU), w('LCD1.SCL', 'u1.A5', YEL), w('RV1.A', 'u1.GND2', BLK), w('RV1.B', 'u1.5V', RED), w('RV1.W', 'u1.A0', ORG)],
      code: `#include <Wire.h>\n#include <LiquidCrystal_I2C.h>\n\nLiquidCrystal_I2C lcd(0x27, 16, 2);\n\nvoid setup() {\n  lcd.init();\n  lcd.backlight();\n  lcd.setCursor(0, 0);\n  lcd.print("Hello, Lab!");\n}\n\nvoid loop() {\n  int sec = millis() / 1000;\n  int pot = analogRead(A0);\n  lcd.setCursor(0, 1);\n  lcd.print("t=");\n  lcd.print(sec);\n  lcd.print("s A0=");\n  lcd.print(pot);\n  lcd.print("   ");\n  delay(200);\n}\n`,
    },
    {
      key: 'sevenseg', icon: '🔢', name: '7-სეგმენტიანი მთვლელი (0–9)', desc: 'პინები 2–8 მართავს სეგმენტებს a–g; მასივით ციფრების ჩვენება.',
      parts: [A(0, 280), p('DS1', 'sevenseg', 60, 160), p('R1', 'resistor', 240, 200, { r: 220 })],
      wires: ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((s, i) => w('DS1.' + s, 'u1.D' + (2 + i), [RED, ORG, YEL, GRN, BLU, PUR, GRY][i])).concat([w('DS1.COM', 'R1.p1', BLK), w('R1.p2', 'u1.GND1', BLK)]),
      code: `// a b c d e f g\nbyte digits[10][7] = {\n  {1,1,1,1,1,1,0}, {0,1,1,0,0,0,0}, {1,1,0,1,1,0,1}, {1,1,1,1,0,0,1}, {0,1,1,0,0,1,1},\n  {1,0,1,1,0,1,1}, {1,0,1,1,1,1,1}, {1,1,1,0,0,0,0}, {1,1,1,1,1,1,1}, {1,1,1,1,0,1,1}\n};\n\nvoid showDigit(int n) {\n  for (int s = 0; s < 7; s++) {\n    digitalWrite(2 + s, digits[n][s]);\n  }\n}\n\nvoid setup() {\n  for (int p = 2; p <= 8; p++) pinMode(p, OUTPUT);\n}\n\nvoid loop() {\n  for (int n = 0; n < 10; n++) {\n    showDigit(n);\n    delay(700);\n  }\n}\n`,
    },
    {
      key: 'rc', icon: '⏳', name: 'კონდენსატორი: დამუხტვა და განმუხტვა', desc: 'გადამრთველის გამორთვისას LED ნელა ქრება — კონდენსატორი განიმუხტება (τ = R·C). მულტიმეტრი ზომავს ძაბვას.',
      parts: [p('BAT1', 'battery', 0, 140, { v: 9 }), p('SW1', 'switch', 100, 140, { on: true }), p('R1', 'resistor', 180, 140, { r: 470 }), p('C1', 'capacitor', 300, 140, { c: 4700 }), p('R2', 'resistor', 380, 100, { r: 330 }), p('D1', 'led', 480, 140, { color: 'yellow' }), p('MM1', 'meter', 300, 360)],
      wires: [w('BAT1.P', 'SW1.p1', RED), w('SW1.p2', 'R1.p1', RED), w('R1.p2', 'C1.P', RED), w('C1.P', 'R2.p1', RED), w('R2.p2', 'D1.A', GRN), w('D1.K', 'BAT1.N', BLK), w('C1.N', 'BAT1.N', BLK), w('MM1.P', 'C1.P', RED), w('MM1.COM', 'C1.N', BLK)],
      code: '',
    },
    {
      key: 'relay', icon: '🔌', name: 'რელე + ნათურა (Arduino-დან)', desc: 'Arduino ტრანზისტორით მართავს რელეს, რელე — 9V ნათურას. დიოდი იცავს წრედს.',
      parts: [A(0, 300), p('Q1', 'npn', 80, 200), p('R1', 'resistor', 120, 120, { r: 1000 }), p('K1', 'relay', 220, 200), p('D1', 'diode', 200, 80), p('BAT1', 'battery', 400, 200, { v: 9 }), p('L1', 'bulb', 520, 200)],
      wires: [w('u1.D7', 'R1.p1', ORG), w('R1.p2', 'Q1.B', ORG), w('Q1.E', 'u1.GND1', BLK), w('Q1.C', 'K1.C2', BLU), w('K1.C1', 'u1.5V', RED), w('D1.K', 'K1.C1', RED), w('D1.A', 'K1.C2', BLU), w('BAT1.P', 'K1.COM', RED), w('K1.NO', 'L1.p1', YEL), w('L1.p2', 'BAT1.N', BLK)],
      code: `void setup() {\n  pinMode(7, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(7, HIGH);  // რელე ირთვება → ნათურა ანთია\n  delay(1500);\n  digitalWrite(7, LOW);\n  delay(1500);\n}\n`,
    },
    {
      key: 'pir', icon: '🚨', name: 'სიგნალიზაცია მოძრაობის სენსორით', desc: 'PIR სენსორი აღმოაჩენს მოძრაობას → LED და ზუმერი. დააჭირე სენსორს სიმულაციისას!',
      parts: [A(), p('PIR1', 'pir', 300, 140), p('D1', 'led', 120, 120, { color: 'red' }), p('R1', 'resistor', 160, 180, { r: 220 }), p('BZ1', 'buzzer', 40, 140)],
      wires: [w('PIR1.VCC', 'u1.5V', RED), w('PIR1.GND', 'u1.GND2', BLK), w('PIR1.OUT', 'u1.D2', BLU), w('D1.A', 'R1.p1', GRN), w('R1.p2', 'u1.D12', GRN), w('D1.K', 'u1.GND1', BLK), w('BZ1.P', 'u1.D8', PUR), w('BZ1.N', 'u1.GND1', BLK)],
      code: `void setup() {\n  pinMode(2, INPUT);\n  pinMode(12, OUTPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  if (digitalRead(2) == HIGH) {\n    Serial.println("მოძრაობა!");\n    digitalWrite(12, HIGH);\n    tone(8, 880);\n  } else {\n    digitalWrite(12, LOW);\n    noTone(8);\n  }\n  delay(50);\n}\n`,
    },
    {
      key: 'joystick', icon: '🕹️', name: 'ჯოისტიკი → სერვო', desc: 'X ღერძი მართავს სერვოს, ღილაკი — LED-ს (INPUT_PULLUP).',
      parts: [A(), p('JS1', 'joystick', 280, 160), p('SV1', 'servo', 120, 160), p('D1', 'led', 40, 80, { color: 'green' }), p('R1', 'resistor', 60, 40, { r: 220 })],
      wires: [w('JS1.GND', 'u1.GND2', BLK), w('JS1.V', 'u1.5V', RED), w('JS1.VRX', 'u1.A0', ORG), w('JS1.VRY', 'u1.A1', YEL), w('JS1.SW', 'u1.D2', BLU), w('SV1.GND', 'u1.GND1', BLK), w('SV1.V', 'u1.5V', RED), w('SV1.SIG', 'u1.D9', ORG), w('D1.A', 'R1.p1', GRN), w('R1.p2', 'u1.D13', GRN), w('D1.K', 'u1.GND1', BLK)],
      code: `#include <Servo.h>\nServo s;\n\nvoid setup() {\n  s.attach(9);\n  pinMode(2, INPUT_PULLUP);\n  pinMode(13, OUTPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int x = analogRead(A0);\n  int y = analogRead(A1);\n  s.write(map(x, 0, 1023, 0, 180));\n  digitalWrite(13, digitalRead(2) == LOW);\n  Serial.print("X=");\n  Serial.print(x);\n  Serial.print(" Y=");\n  Serial.println(y);\n  delay(50);\n}\n`,
    },
    {
      key: 'garden', icon: '🌱', name: 'ავტომატური მორწყვა', desc: 'ნიადაგის სენსორი → A0. მშრალ ნიადაგზე რელე რთავს ტუმბოს (ძრავას).',
      parts: [A(0, 300), p('SM1', 'soil', 440, 200), p('Q1', 'npn', 80, 200), p('R1', 'resistor', 120, 120, { r: 1000 }), p('K1', 'relay', 200, 200), p('D1', 'diode', 180, 80), p('BAT1', 'battery', 340, 200, { v: 9 }), p('M1', 'motor', 340, 60)],
      wires: [w('SM1.VCC', 'u1.5V', RED), w('SM1.GND', 'u1.GND2', BLK), w('SM1.SIG', 'u1.A0', YEL), w('u1.D7', 'R1.p1', ORG), w('R1.p2', 'Q1.B', ORG), w('Q1.E', 'u1.GND1', BLK), w('Q1.C', 'K1.C2', BLU), w('K1.C1', 'u1.5V', RED), w('D1.K', 'K1.C1', RED), w('D1.A', 'K1.C2', BLU), w('BAT1.P', 'K1.COM', RED), w('K1.NO', 'M1.p1', YEL), w('M1.p2', 'BAT1.N', BLK)],
      code: `void setup() {\n  pinMode(7, OUTPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int moisture = analogRead(A0);\n  Serial.print("ტენიანობა: ");\n  Serial.println(moisture);\n  if (moisture < 400) {\n    digitalWrite(7, HIGH);   // მშრალია → ტუმბო ჩართე\n  } else {\n    digitalWrite(7, LOW);\n  }\n  delay(300);\n}\n`,
    },
  );

  /* ---------- გამოწვევები ---------- */
  CZ.CHALLENGES.push(
    {
      key: 'parking', icon: '🚗', title: 'პარკირების სენსორი', level: 'რთული',
      text: 'ულტრაბგერითი სენსორით (HC-SR04) გაზომე მანძილი. თუ საგანი 20 სმ-ზე ახლოსაა, ზუმერი უნდა ჟღერდეს; 100 სმ-ზე — ჩუმად იყოს.',
      start: { parts: [A(), p('US1', 'ultrasonic', 300, 140), p('BZ1', 'buzzer', 120, 140)], wires: [], code: 'void setup() {\n\n}\n\nvoid loop() {\n  // digitalWrite(TRIG, HIGH); delayMicroseconds(10); digitalWrite(TRIG, LOW);\n  // long d = pulseIn(ECHO, HIGH) / 58;\n\n}\n' },
      test(t, check) {
        const U = t.parts('ultrasonic'), Bz = t.parts('buzzer');
        if (!check('სქემაში არის სენსორი, ზუმერი და Arduino', U.length && Bz.length && t.parts('arduino').length, 'დაამატე HC-SR04 და ზუმერი.')) return;
        const sound = (d) => { U.forEach((u) => t.set(u.id, 'dist', d)); let on = 0, n = 0; t.run(800, () => { n++; if (Bz.some((b) => (t.c.res[b.id] || {}).on)) on++; }); return on / Math.max(1, n); };
        const near = sound(10), far = sound(100);
        check(`10 სმ → ზუმერი ჟღერს (${Math.round(near * 100)}% დროის)`, near > 0.15, 'შეამოწმე TRIG/ECHO სადენები, pulseIn() და tone(…) პირობა.');
        check(`100 სმ → ზუმერი ჩუმადაა (${Math.round(far * 100)}%)`, far < 0.05, 'შორ მანძილზე ზუმერი უნდა გაჩუმდეს — noTone(…).');
      },
    },
    {
      key: 'seven', icon: '🔢', title: 'აჩვენე ციფრი 7', level: 'საშუალო',
      text: 'შეაერთე 7-სეგმენტიანი ინდიკატორი Arduino-სთან (COM → რეზისტორი → GND) და კოდით აჩვენე ციფრი 7 (ანთია მხოლოდ a, b, c).',
      start: { parts: [A(0, 280), p('DS1', 'sevenseg', 60, 160), p('R1', 'resistor', 240, 200, { r: 220 })], wires: [], code: 'void setup() {\n\n}\n\nvoid loop() {\n\n}\n' },
      test(t, check) {
        const S7 = t.parts('sevenseg');
        if (!check('სქემაში არის ინდიკატორი და Arduino', S7.length && t.parts('arduino').length, 'დაამატე 7-სეგმენტიანი ინდიკატორი.')) return;
        t.run(600); const r = t.res(S7[0].id);
        check('ინდიკატორი არ დაიწვა', !r.burned, 'COM ან სეგმენტები რეზისტორით უნდა იყოს შეერთებული.');
        check(`ნაჩვენებია 7 (ახლა: ${r.digit ?? '?'})`, r.digit === '7', 'ჩართე მხოლოდ a, b, c სეგმენტები (digitalWrite HIGH), დანარჩენი — LOW.');
      },
    },
    {
      key: 'relay', icon: '🔌', title: 'ნათურა რელეთი', level: 'რთული',
      text: 'Arduino-მ 9V ნათურა რელეს საშუალებით უნდა ჩართოს და გამორთოს (ციმციმი). პინი არ უნდა გადაიტვირთოს — რელეს კოჭა ტრანზისტორით მართე.',
      start: { parts: [A(0, 300), p('Q1', 'npn', 80, 200), p('R1', 'resistor', 120, 120, { r: 1000 }), p('K1', 'relay', 220, 200), p('D1', 'diode', 200, 80), p('BAT1', 'battery', 400, 200, { v: 9 }), p('L1', 'bulb', 520, 200)], wires: [], code: 'void setup() {\n  pinMode(7, OUTPUT);\n}\n\nvoid loop() {\n\n}\n' },
      test(t, check) {
        const L = t.parts('bulb');
        if (!check('სქემაში არის ნათურა, რელე და Arduino', L.length && t.parts('relay').length && t.parts('arduino').length, 'დაამატე საჭირო კომპონენტები.')) return;
        let on = false, off = false;
        t.run(4000, () => L.forEach((l) => { const b = (t.c.res[l.id] || {}).bright || 0; if (b > 0.4) on = true; if (b < 0.05) off = true; }));
        check('ნათურა ანთდება', on, 'რელეს COM → ბატარეა +, NO → ნათურა → ბატარეა −. კოჭა: 5V → C1, C2 → ტრანზისტორის კოლექტორი.');
        check('ნათურა ქრება (ციმციმებს)', on && off, 'კოდში რელე ჩართე და გამორთე delay()-ით.');
        check('Arduino-ს პინი არ არის გადატვირთული', !t.warnKeys().some((k) => k.startsWith('pinOver')), 'რელეს კოჭა (~70 mA) პინიდან პირდაპირ არ ჩართო — გამოიყენე NPN ტრანზისტორი.');
      },
    },
    {
      key: 'lcd', icon: '📟', title: 'გამარჯობა LCD-ზე', level: 'საშუალო',
      text: 'შეაერთე I2C LCD (SDA → A4, SCL → A5, VCC → 5V, GND) და პირველ სტრიქონზე გამოიტანე „Hello“.',
      start: { parts: [A(0, 260), p('LCD1', 'lcd', 120, 160)], wires: [], code: '#include <Wire.h>\n#include <LiquidCrystal_I2C.h>\n\nLiquidCrystal_I2C lcd(0x27, 16, 2);\n\nvoid setup() {\n\n}\n\nvoid loop() {\n\n}\n' },
      test(t, check) {
        const L = t.parts('lcd');
        if (!check('სქემაში არის LCD და Arduino', L.length && t.parts('arduino').length, 'დაამატე LCD ეკრანი.')) return;
        t.run(500); const r = t.res(L[0].id); const lcd = t.sim && t.sim.lcd;
        check('LCD-ს აქვს კვება', r.powered, 'VCC → 5V, GND → GND.');
        check('I2C ხაზები შეერთებულია', r.wired, 'SDA → A4, SCL → A5.');
        check('ეკრანი ჩართულია (init)', lcd && lcd.on, 'setup()-ში: lcd.init(); lcd.backlight();');
        check('პირველ სტრიქონზეა „Hello“', lcd && /hello/i.test(lcd.lines[0]), 'lcd.setCursor(0, 0); lcd.print("Hello");');
      },
    },
  );
})(window.VL);
