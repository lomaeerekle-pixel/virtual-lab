/* ============================================================
 * tech/exercises.js — ტექნიკური ლაბის სავარჯიშოები, მაგალითები
 * და კოდის ფრაგმენტები. თითოეულ სავარჯიშოს აქვს ავტომატური ტესტი.
 * ============================================================ */
(function (VL) {
  'use strict';
  const T = VL.Tech;

  const EX = [
    {
      key: 'blink', title: 'LED-ის ციმციმი', level: 'დამწყები', icon: '💡',
      description: 'წითელი LED (პინი 13) უნდა ჩაირთოს და გამოირთოს მოცემული ინტერვალით.',
      params: [{ key: 'intervalMs', label: 'ინტერვალი (მწ)', value: 500, min: 100, max: 3000 }],
      text: (p) => `წითელი LED (პინი 13) ყოველ ${p.intervalMs} მილიწამში ჩართე და გამორთე.`,
      starter: `// LED-ის ციმციმი\nvoid setup() {\n  // TODO: პინი 13 გამოსავლად (OUTPUT) დააყენე\n\n}\n\nvoid loop() {\n  // TODO: ჩართე LED, დაელოდე, გამორთე, დაელოდე\n\n}\n`,
      solution: (p) => `void setup() {\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(${p.intervalMs});\n  digitalWrite(13, LOW);\n  delay(${p.intervalMs});\n}\n`,
      test(t, check, p) {
        const iv = Number(p.intervalMs) || 500;
        t.run(iv * 10);
        const ev = t.events(13);
        check('LED 13 ციმციმებს (მინ. 4 გადართვა)', ev.length >= 4,
          ev.length === 0 ? 'LED 13 საერთოდ არ ირთვება. setup()-ში: pinMode(13, OUTPUT); loop()-ში: digitalWrite(13, HIGH);' : 'LED ცოტაჯერ გადაირთო — loop()-ში უნდა იყოს როგორც ჩართვა (HIGH), ისე გამორთვა (LOW).');
        if (ev.length >= 3) {
          const gaps = []; for (let i = 1; i < ev.length; i++) gaps.push(ev[i].t - ev[i - 1].t);
          const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
          check(`ინტერვალი ≈ ${iv} მწ (შენი: ${Math.round(avg)} მწ)`, Math.abs(avg - iv) <= iv * 0.2, `ჩართვის და გამორთვის შემდეგ გამოიყენე delay(${iv});`);
        } else check(`ინტერვალი ≈ ${iv} მწ`, false, 'ინტერვალის გაზომვა ვერ მოხერხდა — LED არ ციმციმებს.');
      },
    },
    {
      key: 'button-led', title: 'ღილაკით მართვადი LED', level: 'დამწყები', icon: '🔘',
      description: 'ღილაკზე (პინი 2) დაჭერისას ყვითელი LED (პინი 12) ანთდება, აშვებისას — ქრება.',
      params: [],
      text: () => 'როცა ღილაკს (პინი 2) აჭერ, ყვითელი LED (პინი 12) უნდა ანთდეს; ხელის აშვებისას — ჩაქრეს.',
      starter: `void setup() {\n  pinMode(2, INPUT);     // ღილაკი\n  pinMode(12, OUTPUT);   // ყვითელი LED\n}\n\nvoid loop() {\n  int state = digitalRead(2);\n  // TODO: თუ state == HIGH, ჩართე LED, სხვა შემთხვევაში გამორთე\n\n}\n`,
      solution: () => `void setup() {\n  pinMode(2, INPUT);\n  pinMode(12, OUTPUT);\n}\n\nvoid loop() {\n  if (digitalRead(2) == HIGH) {\n    digitalWrite(12, HIGH);\n  } else {\n    digitalWrite(12, LOW);\n  }\n}\n`,
      test(t, check) {
        t.set('button', false); t.run(300);
        check('ღილაკი აშვებულია → LED 12 გამორთულია', t.led(12) === 0, 'როცა ღილაკს არ აჭერ, LED გამორთული უნდა იყოს. (INPUT_PULLUP-ის დროს დაჭერა = LOW!)');
        t.set('button', true); t.run(300);
        check('ღილაკი დაჭერილია → LED 12 ჩართულია', t.led(12) === 1, 'წაიკითხე digitalRead(2) და if-ით ჩართე: digitalWrite(12, HIGH);');
        t.set('button', false); t.run(300);
        check('ხელახლა აშვება → LED ქრება', t.led(12) === 0, 'დაამატე else ბლოკი: digitalWrite(12, LOW);');
      },
    },
    {
      key: 'pot-dimmer', title: 'პოტენციომეტრით სიკაშკაშე (PWM)', level: 'საშუალო', icon: '🎛',
      description: 'პოტენციომეტრის (A0) მნიშვნელობა 0–1023 გადაიყვანე მწვანე LED-ის (პინი ~11) სიკაშკაშედ 0–255.',
      params: [],
      text: () => 'პოტენციომეტრით (A0) მართე მწვანე LED-ის (პინი ~11) სიკაშკაშე: 0 → ჩამქრალი, 1023 → სრული სიკაშკაშე. გამოიყენე analogRead, map და analogWrite.',
      starter: `void setup() {\n  pinMode(11, OUTPUT);\n}\n\nvoid loop() {\n  int value = analogRead(A0);   // 0..1023\n  // TODO: გადაიყვანე 0..255 დიაპაზონში map()-ით და გამოიყენე analogWrite\n\n}\n`,
      solution: () => `void setup() {\n  pinMode(11, OUTPUT);\n}\n\nvoid loop() {\n  int value = analogRead(A0);\n  int brightness = map(value, 0, 1023, 0, 255);\n  analogWrite(11, brightness);\n  delay(10);\n}\n`,
      test(t, check) {
        t.set('pot', 0); t.run(200);
        check('A0 = 0 → LED ჩამქრალია (PWM ≤ 15)', t.pwm(11) <= 15, `PWM ახლა ${t.pwm(11)}. როცა პოტენციომეტრი 0-ზეა, analogWrite(11, 0) უნდა იყოს.`);
        t.set('pot', 1023); t.run(200);
        check('A0 = 1023 → სრული სიკაშკაშე (PWM ≥ 240)', t.pwm(11) >= 240, `PWM ახლა ${t.pwm(11)}. გამოიყენე map(value, 0, 1023, 0, 255).`);
        t.set('pot', 512); t.run(200);
        check('A0 = 512 → ნახევარი სიკაშკაშე (PWM 100–160)', t.pwm(11) >= 100 && t.pwm(11) <= 160, `PWM ახლა ${t.pwm(11)}. მნიშვნელობა პროპორციული უნდა იყოს.`);
      },
    },
    {
      key: 'night-light', title: 'ღამის განათება (სენსორი)', level: 'საშუალო', icon: '🌙',
      description: 'სინათლის სენსორის (A1) მნიშვნელობა ზღვარზე დაბლა თუ ჩამოვიდა, წითელი LED (13) უნდა ჩაირთოს.',
      params: [{ key: 'threshold', label: 'სინათლის ზღვარი (0–1023)', value: 300, min: 50, max: 950 }],
      text: (p) => `როცა სინათლის სენსორი (A1) აჩვენებს ${p.threshold}-ზე ნაკლებს (ბნელა), ჩართე წითელი LED (13); სხვა შემთხვევაში გამორთე.`,
      starter: `void setup() {\n  pinMode(13, OUTPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int light = analogRead(A1);\n  Serial.println(light);\n  // TODO: შეადარე light ზღვარს\n\n  delay(100);\n}\n`,
      solution: (p) => `const int THRESHOLD = ${p.threshold};\n\nvoid setup() {\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  int light = analogRead(A1);\n  if (light < THRESHOLD) {\n    digitalWrite(13, HIGH);\n  } else {\n    digitalWrite(13, LOW);\n  }\n  delay(100);\n}\n`,
      test(t, check, p) {
        const th = Number(p.threshold) || 300;
        t.set('light', Math.max(0, th - 200)); t.run(400);
        check('ძალიან ბნელა → LED ჩართულია', t.led(13) === 1, 'როცა light < ზღვარზე, digitalWrite(13, HIGH);');
        t.set('light', Math.min(1023, th + 300)); t.run(400);
        check('ნათელია → LED გამორთულია', t.led(13) === 0, 'როცა ნათელია, LED უნდა გამოირთოს (else ბლოკი).');
        t.set('light', Math.max(0, th - 30)); t.run(400);
        check(`ზღვართან ახლოს (${th - 30}) → ჩართულია`, t.led(13) === 1, `შეამოწმე ზღვრის მნიშვნელობა — უნდა იყოს ${th}.`);
        t.set('light', Math.min(1023, th + 30)); t.run(400);
        check(`ზღვართან ახლოს (${th + 30}) → გამორთულია`, t.led(13) === 0, `შეამოწმე ზღვრის მნიშვნელობა — უნდა იყოს ${th}.`);
      },
    },
    {
      key: 'servo-pot', title: 'სერვოს მართვა', level: 'საშუალო', icon: '🦾',
      description: 'პოტენციომეტრის (A0) მობრუნებით სერვო (პინი 9) უნდა შემობრუნდეს 0°–180°.',
      params: [],
      text: () => 'პოტენციომეტრის (A0) მიხედვით სერვოს (პინი 9) კუთხე შეცვალე 0°-დან 180°-მდე.',
      starter: `#include <Servo.h>\n\nServo myServo;\n\nvoid setup() {\n  myServo.attach(9);\n}\n\nvoid loop() {\n  int value = analogRead(A0);\n  // TODO: გადაიყვანე კუთხედ (0..180) და myServo.write(...)\n\n  delay(15);\n}\n`,
      solution: () => `#include <Servo.h>\n\nServo myServo;\n\nvoid setup() {\n  myServo.attach(9);\n}\n\nvoid loop() {\n  int value = analogRead(A0);\n  int angle = map(value, 0, 1023, 0, 180);\n  myServo.write(angle);\n  delay(15);\n}\n`,
      test(t, check) {
        t.set('pot', 0); t.run(300);
        check('A0 = 0 → კუთხე ≈ 0°', t.servo() <= 5, `კუთხე ახლა ${t.servo()}°. გამოიყენე map(value, 0, 1023, 0, 180).`);
        t.set('pot', 1023); t.run(300);
        check('A0 = 1023 → კუთხე ≈ 180°', t.servo() >= 175, `კუთხე ახლა ${t.servo()}°.`);
        t.set('pot', 512); t.run(300);
        check('A0 = 512 → კუთხე ≈ 90°', t.servo() >= 80 && t.servo() <= 100, `კუთხე ახლა ${t.servo()}°.`);
      },
    },
    {
      key: 'traffic', title: 'შუქნიშანი', level: 'საშუალო', icon: '🚦',
      description: 'LED-ებით შექმენი შუქნიშნის ციკლი: წითელი → მწვანე → ყვითელი → წითელი…',
      params: [],
      text: () => 'შექმენი შუქნიშანი: წითელი (13) → მწვანე (11) → ყვითელი (12) → თავიდან. ერთ მომენტში ერთი LED ანთია, თითო ფაზა მინიმუმ 0.5 წამი.',
      starter: `void setup() {\n  pinMode(13, OUTPUT); // წითელი\n  pinMode(12, OUTPUT); // ყვითელი\n  pinMode(11, OUTPUT); // მწვანე\n}\n\nvoid loop() {\n  // TODO: წითელი 3 წმ, მწვანე 3 წმ, ყვითელი 1 წმ\n\n}\n`,
      solution: () => `void setLights(int r, int y, int g) {\n  digitalWrite(13, r);\n  digitalWrite(12, y);\n  digitalWrite(11, g);\n}\n\nvoid setup() {\n  pinMode(13, OUTPUT);\n  pinMode(12, OUTPUT);\n  pinMode(11, OUTPUT);\n}\n\nvoid loop() {\n  setLights(HIGH, LOW, LOW);\n  delay(3000);\n  setLights(LOW, LOW, HIGH);\n  delay(3000);\n  setLights(LOW, HIGH, LOW);\n  delay(1000);\n}\n`,
      test(t, check) {
        const seq = []; const seen = new Set(); let last = ''; let lastStart = 0; let shortPhase = false;
        for (let k = 0; k < 400; k++) {
          t.run(50);
          const r = t.led(13), y = t.led(12), g = t.led(11);
          const on = r + y + g;
          const s = on === 1 ? (r ? 'R' : y ? 'Y' : 'G') : (on === 0 ? '-' : '+');
          if (on === 1) seen.add(s);
          if (s !== last) {
            if (last && 'RGY'.includes(last) && seq.length > 1 && t.now() - lastStart < 450) shortPhase = true;
            if (on === 1) seq.push(s);
            last = s; lastStart = t.now();
          }
        }
        const str = seq.filter((c, i) => c !== seq[i - 1]).join('');
        check('სამივე ფერი გამოიყენება ცალ-ცალკე', seen.size === 3, `ცალკე ანთებული ფერები: ${[...seen].join(', ') || 'არცერთი'}. ყოველ ფაზაში მხოლოდ ერთი LED უნდა ენთოს.`);
        check('სწორი თანმიმდევრობა: წითელი → მწვანე → ყვითელი → წითელი', /RGYR/.test(str), `მიღებული თანმიმდევრობა: ${str.slice(0, 12) || '—'} (R=წითელი, G=მწვანე, Y=ყვითელი).`);
        check('თითო ფაზა ≥ 0.5 წამი', !shortPhase && str.length > 2, 'ზოგი ფაზა ძალიან მოკლეა — გამოიყენე delay().');
      },
    },
    {
      key: 'serial-pot', title: 'სერიული მონიტორი', level: 'დამწყები', icon: '🖥',
      description: 'პოტენციომეტრის (A0) მნიშვნელობა გამოიტანე სერიულ მონიტორზე.',
      params: [],
      text: () => 'ყოველ ~200 მწ-ში სერიულ მონიტორზე დაბეჭდე პოტენციომეტრის (A0) მნიშვნელობა (Serial.println).',
      starter: `void setup() {\n  // TODO: გაუშვი სერიული კავშირი 9600 სიჩქარით\n}\n\nvoid loop() {\n  // TODO: წაიკითხე A0 და დაბეჭდე\n\n  delay(200);\n}\n`,
      solution: () => `void setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int value = analogRead(A0);\n  Serial.print("A0 = ");\n  Serial.println(value);\n  delay(200);\n}\n`,
      test(t, check) {
        t.set('pot', 300); t.run(1200);
        const a = t.serial();
        check('Serial.begin() გამოძახებულია', t.sim.serialBegun, 'setup()-ში დაწერე: Serial.begin(9600);');
        check('მონიტორზე ჩანს 300 (როცა A0 = 300)', /(^|\D)300(\D|$)/.test(a), 'დაბეჭდე analogRead(A0)-ის შედეგი: Serial.println(value);');
        t.set('pot', 815); t.run(1200);
        check('მნიშვნელობა ახლდება (815)', /(^|\D)815(\D|$)/.test(t.serial().slice(a.length)), 'დაბეჭდვა loop()-ში უნდა მოხდეს, რომ მუდმივად განახლდეს.');
      },
    },
  ];

  const EXAMPLES = [
    { key: 'ex-blink', title: 'ციმციმი (Blink)', code: EX[0].solution({ intervalMs: 500 }) },
    { key: 'ex-fade', title: 'LED-ის ნელი ანთება (Fade)', code: `int brightness = 0;\nint step = 5;\n\nvoid setup() {\n  pinMode(11, OUTPUT);\n}\n\nvoid loop() {\n  analogWrite(11, brightness);\n  brightness = brightness + step;\n  if (brightness <= 0 || brightness >= 255) {\n    step = -step;\n  }\n  delay(30);\n}\n` },
    { key: 'ex-sweep', title: 'სერვოს რხევა (Sweep)', code: `#include <Servo.h>\nServo myServo;\n\nvoid setup() {\n  myServo.attach(9);\n}\n\nvoid loop() {\n  for (int pos = 0; pos <= 180; pos++) {\n    myServo.write(pos);\n    delay(10);\n  }\n  for (int pos = 180; pos >= 0; pos--) {\n    myServo.write(pos);\n    delay(10);\n  }\n}\n` },
    { key: 'ex-alarm', title: 'სიგნალიზაცია (ღილაკი + ზუმერი)', code: `void setup() {\n  pinMode(2, INPUT_PULLUP);\n  pinMode(13, OUTPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  if (digitalRead(2) == LOW) {   // INPUT_PULLUP: დაჭერა = LOW\n    tone(8, 880);\n    digitalWrite(13, HIGH);\n    Serial.println("განგაში!");\n    delay(200);\n    noTone(8);\n    digitalWrite(13, LOW);\n    delay(200);\n  }\n}\n` },
    { key: 'ex-fan', title: 'ვენტილატორი (პოტ. → ძრავა)', code: `void setup() {\n  pinMode(6, OUTPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int speed = map(analogRead(A0), 0, 1023, 0, 255);\n  analogWrite(6, speed);\n  Serial.print("სიჩქარე: ");\n  Serial.println(speed);\n  delay(250);\n}\n` },
    { key: 'ex-millis', title: 'ციმციმი delay()-ის გარეშე (millis)', code: `unsigned long previous = 0;\nconst long interval = 400;\nint ledState = LOW;\n\nvoid setup() {\n  pinMode(12, OUTPUT);\n  pinMode(2, INPUT);\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  unsigned long now = millis();\n  if (now - previous >= interval) {\n    previous = now;\n    ledState = !ledState;\n    digitalWrite(12, ledState);\n  }\n  // ღილაკი პარალელურად მუშაობს!\n  digitalWrite(13, digitalRead(2));\n}\n` },
    { key: 'ex-traffic', title: 'შუქნიშანი', code: EX[5].solution({}) },
    { key: 'ex-night', title: 'ღამის განათება', code: EX[3].solution({ threshold: 300 }) },
  ];

  const SNIPPETS = [
    { title: 'pinMode — გამოსავალი', code: 'pinMode(13, OUTPUT);' },
    { title: 'pinMode — ღილაკი', code: 'pinMode(2, INPUT_PULLUP);' },
    { title: 'LED ჩართვა/გამორთვა', code: 'digitalWrite(13, HIGH);\ndelay(500);\ndigitalWrite(13, LOW);\ndelay(500);' },
    { title: 'if ღილაკი დაჭერილია', code: 'if (digitalRead(2) == HIGH) {\n  \n} else {\n  \n}' },
    { title: 'analogRead + map', code: 'int value = analogRead(A0);\nint out = map(value, 0, 1023, 0, 255);' },
    { title: 'PWM სიკაშკაშე', code: 'analogWrite(11, 128);' },
    { title: 'სერვო', code: 'myServo.write(90);' },
    { title: 'Serial.println', code: 'Serial.println(value);' },
    { title: 'for ციკლი', code: 'for (int i = 0; i < 10; i++) {\n  \n}' },
    { title: 'millis() ტაიმერი', code: 'if (millis() - previous >= 1000) {\n  previous = millis();\n  \n}' },
    { title: 'ზუმერი', code: 'tone(8, 440);\ndelay(200);\nnoTone(8);' },
  ];

  T.EXERCISES = EX;
  T.EXAMPLES = EXAMPLES;
  T.SNIPPETS = SNIPPETS;
  T.getExercise = (key) => EX.find((e) => e.key === key) || null;
  T.defaultParams = (ex) => Object.fromEntries((ex.params || []).map((p) => [p.key, p.value]));
  T.mergeParams = (ex, p) => ({ ...T.defaultParams(ex), ...(p || {}) });
  T.FREE_CODE = `// თავისუფალი რეჟიმი — სცადე ნებისმიერი კოდი!\n// ხელმისაწვდომია: LED 13/12/11, სერვო 9, ზუმერი 8, ძრავა 6,\n// ღილაკი 2, პოტენციომეტრი A0, სინათლის სენსორი A1.\n\nvoid setup() {\n  pinMode(13, OUTPUT);\n  Serial.begin(9600);\n  Serial.println("გამარჯობა, ლაბორატორია!");\n}\n\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(300);\n  digitalWrite(13, LOW);\n  delay(300);\n}\n`;
})(window.VL);
