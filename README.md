# ვირტუალური ლაბორატორია (Virtual School Lab)

**Live:** https://virtual-lab-hiyz.onrender.com · https://radiant-meringue-3ae1a6.netlify.app

A responsive web app in Georgian and English for school labs when physical equipment isn't available. It has three lab modules, a formula reference, plus a role system for **Admin**, **Teacher** and **Student** with classes and assignments:

- **🔌 Circuit Designer**: a Tinkercad-style editor. Drag components onto a canvas or breadboard, wire them, write Arduino code, and run a real electrical simulation.
- **⚡ Technical Lab**: a quick Arduino simulator on a fixed board, with auto-checked exercises.
- **🔬 STEM Lab**: 37 simulations across 7 subjects.
- **📐 Formula reference**: 218 formulas across 8 subjects, each with a built-in calculator and a link to the matching simulation.

Plain HTML, CSS and JavaScript. No build step, no dependencies, no paid APIs. Data is stored in `localStorage`.

## Running it

**Option 1:** open `index.html` directly in your browser by double-clicking it. File access works fine.

**Option 2 (recommended for development):** serve it with a local server:

```bash
cd virtual-lab
python3 -m http.server 8080
# then open http://localhost:8080
```

## Launching it online (free)

The app is a static site: no server or build step. Upload the folder to any static host and it works. It is also a **PWA**, so once it's on an `https://` address, phones and computers can install it as an app (home-screen icon, full screen, works offline).

| Host | How |
|---|---|
| **Netlify Drop** (easiest, ~1 min) | Go to `app.netlify.com/drop`, sign in, and drag the `virtual-lab` folder onto the page. You get a link like `https://name.netlify.app`. Rename it in Site settings. `netlify.toml` is already included. |
| **GitHub Pages** | Create a repository, upload the contents of this folder, then Settings → Pages → Source: **GitHub Actions**. The included `.github/workflows/pages.yml` publishes it to `https://<user>.github.io/<repo>/` on every push. |
| **Vercel** | `vercel.com/new` → import the GitHub repo (framework: "Other", no build command). `vercel.json` is included. |
| **Cloudflare Pages** | Workers & Pages → Create → Pages → upload the folder. |

When you release an update, change `VERSION` at the top of `sw.js` so installed apps fetch the new files.

### Installing as an app
- **Android / Chrome / Edge:** tap the **📲 აპის დაყენება** button, or browser menu → *Install app*.
- **iPhone / iPad:** in Safari, tap Share → *Add to Home Screen*.
- **Google Play (optional):** paste the site's address into `pwabuilder.com` to generate an Android package (signed .aab) you can upload to the Play Console ($25 one-time developer fee).

### ⚠️ Shared data needs a backend
Data is stored in each browser's `localStorage`. On a public site every device has its **own separate copy**: a class a teacher creates on their laptop won't appear on a student's phone. The labs, simulations and formulas work fully for everyone; for classes, assignments and submissions to be shared between devices, connect the data layer (`js/core/store.js`) to a backend such as Supabase or Firebase (see "Moving to a real backend" below).

## First sign-in

The app starts empty, with a single administrator account:

| Role | Email | Initial password |
|---|---|---|
| 🛡️ Admin (the only one) | `admin@lab.ge` | `Admin2026!` |

On first sign-in the administrator must set a new password (at least 8 characters). Teachers and students create their own accounts with **Register**; students join a class with the code their teacher shares.

To start over: Admin → 💾 Data → "Delete all data" (keeps only the administrator, with the initial password).

## Languages

The interface is available in **Georgian** (default) and **English**: use the **EN / ქარ** button in the top bar. The choice is remembered on the device. All pages, simulations, formulas, hints and starter code are translated.

How it works: the app is written in Georgian; `js/core/i18n.js` translates what is displayed (page text, tooltips, canvas labels and code put into editors) using the dictionary in `js/i18n/en.js`. Program logic is never touched, so both languages behave identically. To fix or add a translation, edit the matching entry in `js/i18n/en.js` (Georgian text → English).

## File structure

```
virtual-lab/
├── index.html                 # entry point; loads scripts in order
├── manifest.webmanifest       # PWA manifest (name, icons, shortcuts)
├── sw.js                      # service worker: offline cache (bump VERSION on release)
├── icons/                     # app icons (192, 512, maskable, Apple touch, favicon)
├── netlify.toml, vercel.json  # host configs
├── .github/workflows/pages.yml# GitHub Pages auto-deploy
├── css/styles.css             # all styles (mobile first, ≥900px side-by-side)
└── js/
    ├── i18n/en.js             # English dictionary (Georgian source text → English)
    ├── core/
    │   ├── i18n.js            # language switch: translates DOM text, attributes, canvas labels, editor code
    │   ├── util.js            # DOM helpers, modals, toasts, formatting
    │   ├── codeutil.js        # code masking, bracket matching, loop guards
    │   ├── store.js           # ⭐ data layer (localStorage, async API, seed data, single-admin rule)
    │   └── router.js          # hash router (#home, #tech, #stem, #class …)
    ├── tech/circuit/          # 🔌 Circuit Designer (Tinkercad-style)
    │   ├── parts.js           # 16 basic components (Arduino, breadboard, LED, RGB, resistor, button, switch, pot, LDR, TMP36, battery, motor, servo, buzzer, NPN, multimeter)
    │   ├── parts-extra.js     # 11 more: capacitor, diode, 7-segment display, HC-SR04, PIR, bulb, relay, FSR, soil sensor, LCD 16×2 I2C, joystick
    │   ├── model.js           # netlist + nodal (MNA) solver, diodes/transistor, PWM averaging, safety checks
    │   ├── editor.js          # SVG canvas: drag, wires with bends, pan/zoom/pinch, undo, rotate
    │   ├── templates.js       # 10 starter projects + 5 auto-checked circuit challenges
    │   ├── templates-extra.js # 8 more projects (parking sensor, LCD, counter, RC, relay, PIR alarm, joystick, auto-watering) + 4 challenges
    │   └── page.js            # "My designs" dashboard + editor (components / properties / code / monitor / task)
    ├── tech/                  # ⚡ Technical Lab
    │   ├── engine.js          # Arduino C++ → JS-generator transpiler + microcontroller simulator
    │   ├── board.js           # SVG circuit (LEDs, buzzer, servo, motor, button, pot, light sensor)
    │   ├── exercises.js       # 7 exercises with auto-tests, examples, snippets
    │   └── lab.js             # lab page (editor, Run/Stop/Step, serial monitor, hints)
    ├── stem/                  # 🔬 STEM Lab
    │   ├── registry.js        # simulation registry + canvas drawing helpers
    │   ├── bridge.js          # "subject + code" bridge (rule compiler and tester)
    │   ├── sims/physics.js    # pendulum, projectile motion, Ohm's law, thin lens
    │   ├── sims/chemistry.js  # titration/pH, reaction rate, heating/phases/thermostat
    │   ├── sims/math.js       # quadratic function, linear function, coordinate plane
    │   ├── sims/physics2.js   # spring oscillator, waves and interference
    │   ├── sims/biology.js    # photosynthesis, predator–prey, Mendelian genetics, enzymes
    │   ├── sims/earth.js      # seasons and day length, climate and the greenhouse effect
    │   ├── sims/astronomy.js  # planetary orbits (Kepler), moon phases
    │   ├── sims/informatics.js# logic gates, binary numbers
    │   ├── sims/physics3.js   # refraction (Snell's law), Archimedes' principle, free fall with air resistance, Doppler effect
    │   ├── sims/chemistry2.js # gas laws (PV = nRT), atom builder
    │   ├── sims/math2.js      # probability and the law of large numbers, unit circle
    │   ├── sims/biology2.js   # epidemic (SIR) and vaccination
    │   ├── sims/informatics2.js# sorting algorithms
    │   ├── sims/physics4.js   # kinematics graphs (s–t, v–t), inclined plane with friction, collisions and momentum, series/parallel resistors
    │   ├── sims/math3.js      # geometry: shapes and solids (area, perimeter, volume, Pythagoras)
    │   └── lab.js             # STEM page (canvas, sliders, presets, bridge, challenges, "📐 formulas" button)
    ├── formulas/              # 📐 Formula reference
    │   ├── engine.js          # mini-TeX renderer, numeric solver (any variable), registry
    │   ├── data-physics.js    # 77 physics formulas (kinematics, dynamics, energy, oscillations, fluids, heat, electricity, optics, modern)
    │   ├── data-more.js       # chemistry 24, math 53, biology 19, earth 12, astronomy 10, informatics 13, electronics 10
    │   └── page.js            # formulas page (subjects, topics, search, calculators, simulation links)
    ├── catalog.js             # unified exercise catalog (for assignment creation)
    ├── pages/
    │   ├── auth.js            # login / registration
    │   ├── student.js         # student dashboard
    │   ├── teacher.js         # teacher dashboard, class, assignment, grading
    │   └── admin.js           # admin panel
    ├── app.js                 # routes, top/bottom navigation, startup
    └── pwa.js                 # service-worker registration + "install app" button
```

## Main features

### 🔌 Circuit Designer (Tinkercad-style)
- **Dashboard:** "My designs" with thumbnails (create, rename, duplicate, delete), 18 starter projects, and 9 challenges.
- **27 components**, including an LCD 16×2 (I2C), an HC-SR04 ultrasonic sensor (`pulseIn`), a 7-segment display, a relay, a capacitor (charging and discharging over time, τ = RC), a diode, a PIR motion sensor, a bulb, a force sensor, a soil-moisture sensor and a joystick.
- **Canvas:** drag components from the palette (or tap to add). Click a pin, then another pin, to run a wire; click empty space to add a bend. 8 wire colors, rotate (R), delete (Del), undo (Ctrl+Z), zoom with the mouse wheel or a two-finger pinch.
- **Breadboard:** pins dropped into holes connect automatically. Columns a–e and f–j, plus the +/− power rails, are joined inside the board, as on a real one.
- **Electrical simulation:** real voltages and currents (Ohm's and Kirchhoff's laws). Diodes, LEDs and the transistor are modelled non-linearly, and PWM is averaged over time.
  - A multimeter measures volts and amps.
  - Hovering over a part shows its U and I.
- **Safety checks:**
  - 💥 an LED burns out if it has no resistor
  - ⛔ short circuit
  - ⚠️ more than 40 mA drawn from an Arduino pin (e.g. a motor wired directly to it)
  - 🌫️ "floating" input (a button without a pull-down resistor)
  - a resistor overheating
- **Arduino:** write code in the side panel; pins match whatever is wired to them. Servo, `tone` (with sound 🔊), the serial monitor, and `analogRead` from potentiometers, the light sensor (LDR) and the temperature sensor (TMP36) all work.
- **Challenges** (assignable to classes): LED with a battery, blink, button with a pull-down, brightness dimmer, motor through a transistor, parking sensor, the digit 7 on a 7-segment display, a bulb through a relay, "Hello" on the LCD. Each is checked automatically by running the student's circuit and code.
- **Arduino language support:** `LiquidCrystal_I2C`, `pulseIn`, 2-D arrays, and C-style integer division for `int` variables (`7 / 2 = 3`).

### ⚡ Technical Lab
- **Code:** C++/Arduino syntax with `setup()`/`loop()`, `pinMode`, `digitalWrite/Read`, `analogRead/Write`, `delay`, `millis`, `map`, `Servo`, `tone`, `Serial.print/println`, `#define`, arrays, and your own functions.
- **Virtual hardware:**

  | Component | Pin |
  |---|---|
  | LEDs | 13, 12, 11 (PWM) |
  | Servo | 9 |
  | Buzzer | 8 |
  | Motor | 6 (PWM) |
  | Button | 2 (INPUT / INPUT_PULLUP) |
  | Potentiometer | A0 |
  | Light sensor | A1 |

- **Controls:** ▶ Run / ⏸ Pause, ⏹ Stop and reset, ⏭ Step (runs to the next `delay()` or the end of `loop()`), speed 0.25×–5×.
- **Hints:** missing `;` or brackets, letter-case mistakes, `=` vs `==`, missing `pinMode`, a missing `Serial.begin`, non-PWM pins, unconnected pins, an LED blinking too fast to see, an unread button or sensor, and runtime errors explained in Georgian.
- **How it works:** code becomes generators, so `delay()` uses virtual time. An infinite loop can't freeze the browser, and the auto-tests are deterministic.

### 🔬 STEM Lab

| Subject | Simulations |
|---|---|
| Physics | pendulum, projectile motion (hit the target), Ohm's law circuit, converging lens with ray diagram |
| Chemistry | titration and pH (3 indicators), reaction rate (Arrhenius, catalyst), heating water with phase changes |
| Math | parabola, linear function, coordinate plane (tap to place points) |
| Physics (extra) | spring oscillator (Hooke's law), waves and interference |
| Biology | photosynthesis and limiting factors, predator–prey (Lotka–Volterra), Mendelian genetics (Punnett square), enzyme activity |
| Geography / Earth | seasons and day length, climate and the greenhouse effect |
| Astronomy | planetary orbits (Kepler's laws), moon phases |
| Informatics | logic gates and truth tables, binary numbers (8-bit, hex, ASCII, two's complement), sorting algorithms (bubble, selection, insertion) |
| Physics (more) | light refraction and total internal reflection, Archimedes' principle, free fall and terminal velocity, Doppler effect |
| Chemistry (more) | gas laws (Boyle, Charles), atom builder (isotopes, ions, electron shells) |
| Math (more) | probability and the law of large numbers, unit circle (sin/cos) |
| Biology (more) | epidemic SIR model, herd immunity, "flattening the curve" with code |
| Physics (new) | motion graphs (s–t, v–t), inclined plane with friction, collisions (elastic/inelastic), series and parallel resistors |
| Math (new) | geometric shapes and solids (area, perimeter, volume, Pythagoras) |

- **Code bridge:** students write rules over live simulation variables, e.g. `if (temperature > 60) set("heater", false);`. Rules can drive a virtual LED, `alarm()`, `log()`, and controllable parameters (heater, burette valve, circuit breaker).
- **115 challenges** of three kinds:
  - 🎚 parameters: reach a target value
  - 💻 code: the rule is checked against test vectors
  - 🧠 code + simulation: e.g. the thermostat runs for 20 simulated minutes

  Each one works as standalone practice or as a teacher assignment with the teacher's own target values.

### 📐 Formula reference
- **218 formulas** in 8 subjects (physics, chemistry, math, biology, earth, astronomy, informatics, electronics), grouped by topic, with search (e.g. "ფართობი", "pH", "ომი").
- Each card shows the formula rendered properly (fractions, roots, powers, indices), a legend of symbols and units, and a short note.
- **🧮 Calculator** (203 formulas): pick which variable is unknown, enter the others, and it solves numerically for any variable, not only the one on the left.
- **🔬 Simulation link** (165 formulas): opens the matching STEM simulation, Technical Lab exercise, or circuit template.
- In the STEM Lab, every simulation has a "📐 Formulas (n)" button that shows the formulas it uses.

### 🏫 Roles
- **Admin:** exactly one. Registration can't create an admin and neither can a role change (enforced in `store.js`). Manages users (role, block, password, delete), classes (reassign teacher, delete), lab modules and subjects, registration toggles, JSON export, and data reset.
- **Teacher:** creates classes (with a join code) and enrolls students by list or email. Creates assignments from any Technical Lab or STEM exercise, with target parameters, instructions and a due date. Sees the progress matrix, reviews submissions (code, values, rule), and adds a grade and feedback. Can close or reopen assignments.
- **Student:** registers (optionally with a class code) and joins a class by code. Completes assignments in the lab, runs 🧪 Check, and 📨 submits; resubmission is allowed until the assignment is closed. Sees teacher feedback and can practise freely.

## Moving to a real backend
Every function in `js/core/store.js` (`VL.api.*`) returns a Promise. To connect a server, replace their bodies with `fetch()` calls; the UI code stays the same. Before going to production:
- hash passwords on the server (bcrypt or argon2; the client-side hash here is not secure enough for production)
- use a session token or JWT
- enforce permissions on the server

## Adding things
- **New Arduino exercise:** add an object with `starter`, `solution` and `test(t, check, params)` to the `EX` array in `js/tech/exercises.js`.
- **New STEM simulation:** call `VL.STEM.register({...})` in the relevant `sims/*.js` file. The interface is described at the top of `registry.js`. It appears in the lab and in the assignment catalog automatically.
