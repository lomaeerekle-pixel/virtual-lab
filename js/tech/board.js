/* ============================================================
 * tech/board.js — ვირტუალური სქემის SVG ვიზუალიზაცია
 * (Arduino დაფა, LED-ები, ზუმერი, სერვო, ძრავა, ღილაკი,
 *  პოტენციომეტრი, სინათლის სენსორი)
 * ============================================================ */
(function (VL) {
  'use strict';
  const T = VL.Tech;

  const HEADER = [
    { pin: 13, label: '13', y: 132, color: '#e03131' },
    { pin: 12, label: '12', y: 152, color: '#f08c00' },
    { pin: 11, label: '~11', y: 172, color: '#2f9e44' },
    { pin: 9, label: '~9', y: 192, color: '#7048e8' },
    { pin: 8, label: '8', y: 212, color: '#495057' },
    { pin: 6, label: '~6', y: 232, color: '#1c7ed6' },
    { pin: 2, label: '2', y: 252, color: '#c2255c' },
    { pin: 14, label: 'A0', y: 272, color: '#0c8599' },
    { pin: 15, label: 'A1', y: 292, color: '#e8590c' },
  ];

  function wire(fromY, lane, tx, ty, color) {
    const x0 = 214, xl = 236 + lane * 7;
    return `<path d="M${x0} ${fromY} H${xl} V${ty} H${tx}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" opacity="0.85"/>`;
  }

  function led(id, x, y, color, label) {
    return `
      <g id="${id}" transform="translate(${x} ${y})">
        <circle class="led-glow" r="30" fill="${color}" opacity="0" filter="url(#glow)"/>
        <line x1="-5" y1="14" x2="-5" y2="34" stroke="#868e96" stroke-width="2"/>
        <line x1="5" y1="14" x2="5" y2="40" stroke="#868e96" stroke-width="2"/>
        <path class="led-body" d="M-13 14 V-2 A13 13 0 0 1 13 -2 V14 Z" fill="${color}" fill-opacity="0.28" stroke="${color}" stroke-width="2"/>
        <rect x="-15" y="12" width="30" height="4" rx="1" fill="${color}" opacity="0.6"/>
        <text y="58" text-anchor="middle" class="svg-label">${label}</text>
      </g>`;
  }

  T.Board = function (container, sim, opts = {}) {
    container.innerHTML = `
    <svg class="board-svg" viewBox="0 0 640 420" role="img" aria-label="ვირტუალური სქემა">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>
        <pattern id="bb" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="1.4" fill="#ced4da"/></pattern>
      </defs>
      <rect x="250" y="8" width="384" height="404" rx="14" fill="#f8f9fa" stroke="#dee2e6"/>
      <rect x="250" y="8" width="384" height="404" rx="14" fill="url(#bb)" opacity="0.7"/>

      <!-- wires -->
      ${wire(132, 0, 300, 98, '#e03131')}
      ${wire(152, 1, 365, 98, '#f08c00')}
      ${wire(172, 2, 430, 98, '#2f9e44')}
      ${wire(212, 4, 540, 70, '#495057')}
      ${wire(192, 3, 300, 210, '#7048e8')}
      ${wire(232, 5, 470, 210, '#1c7ed6')}
      ${wire(252, 6, 300, 330, '#c2255c')}
      ${wire(272, 7, 420, 330, '#0c8599')}
      ${wire(292, 8, 545, 330, '#e8590c')}

      <!-- Arduino board -->
      <g>
        <rect x="14" y="96" width="204" height="226" rx="12" fill="#0b7285" stroke="#095c6b" stroke-width="2"/>
        <rect x="0" y="120" width="30" height="38" rx="3" fill="#adb5bd" stroke="#868e96"/>
        <rect x="2" y="250" width="26" height="34" rx="4" fill="#343a40"/>
        <rect x="70" y="170" width="80" height="70" rx="4" fill="#212529"/>
        <text x="110" y="200" text-anchor="middle" fill="#ced4da" font-size="10" font-family="JetBrains Mono, monospace">ATmega</text>
        <text x="110" y="214" text-anchor="middle" fill="#ced4da" font-size="10" font-family="JetBrains Mono, monospace">328P</text>
        <text x="96" y="122" text-anchor="middle" fill="#fff" font-size="15" font-weight="700" font-family="JetBrains Mono, monospace">ARDUINO UNO</text>
        <text x="96" y="140" text-anchor="middle" fill="#c5f6fa" font-size="11">ვირტუალური დაფა</text>
        <circle id="pwr-led" cx="44" cy="300" r="4" fill="#40c057"/>
        <text x="54" y="304" fill="#c5f6fa" font-size="9">ON</text>
        <circle id="tx-led" cx="84" cy="300" r="4" fill="#495057"/>
        <text x="94" y="304" fill="#c5f6fa" font-size="9">TX</text>
        ${HEADER.map((h) => `
          <rect class="hdr" data-pin="${h.pin}" x="198" y="${h.y - 6}" width="16" height="12" rx="2" fill="#212529"/>
          <text x="192" y="${h.y + 4}" text-anchor="end" fill="#fff" font-size="10" font-family="JetBrains Mono, monospace">${h.label}</text>`).join('')}
      </g>

      <!-- LEDs -->
      ${led('led13', 300, 60, '#fa5252', 'LED 13')}
      ${led('led12', 365, 60, '#fab005', 'LED 12')}
      ${led('led11', 430, 60, '#40c057', 'LED ~11')}

      <!-- Buzzer -->
      <g id="buzzer" transform="translate(540 50)">
        <circle r="22" fill="#212529"/><circle r="7" fill="#495057"/>
        <g class="waves" opacity="0" stroke="#7048e8" stroke-width="2.5" fill="none">
          <path d="M28 -12 Q36 0 28 12"/><path d="M36 -18 Q48 0 36 18"/>
        </g>
        <text y="44" text-anchor="middle" class="svg-label">ზუმერი 8</text>
      </g>

      <!-- Servo -->
      <g id="servo" transform="translate(330 205)">
        <rect x="-44" y="-20" width="88" height="40" rx="5" fill="#5f3dc4"/>
        <rect x="-52" y="-6" width="104" height="12" rx="3" fill="#7048e8"/>
        <circle cx="-18" r="13" fill="#e5dbff"/>
        <g class="servo-arm" transform="translate(-18 0) rotate(0)">
          <rect x="-4" y="-46" width="8" height="46" rx="4" fill="#f8f9fa" stroke="#adb5bd"/>
          <circle r="6" fill="#adb5bd"/>
        </g>
        <text y="42" text-anchor="middle" class="svg-label servo-label">სერვო ~9 · 90°</text>
      </g>

      <!-- Motor -->
      <g id="motor" transform="translate(500 205)">
        <circle r="34" fill="#e7f5ff" stroke="#1c7ed6" stroke-width="2"/>
        <g class="fan">
          ${[0, 120, 240].map((a) => `<ellipse rx="8" ry="25" cy="-16" fill="#4dabf7" transform="rotate(${a})"/>`).join('')}
        </g>
        <circle r="6" fill="#1c7ed6"/>
        <text y="54" text-anchor="middle" class="svg-label motor-label">ძრავა ~6 · 0%</text>
      </g>

      <!-- Button -->
      <g id="btn" class="pressable" transform="translate(300 345)" tabindex="0" role="button" aria-label="ღილაკი პინ 2">
        <rect x="-30" y="-30" width="60" height="60" rx="8" fill="#343a40"/>
        <circle class="btn-cap" r="20" fill="#f03e3e" stroke="#c92a2a" stroke-width="3"/>
        <text y="48" text-anchor="middle" class="svg-label">ღილაკი 2</text>
      </g>

      <!-- Potentiometer -->
      <g id="pot" transform="translate(420 345)">
        <rect x="-30" y="-30" width="60" height="60" rx="30" fill="#e3fafc" stroke="#0c8599" stroke-width="2"/>
        <g class="pot-knob" transform="rotate(0)">
          <circle r="20" fill="#0c8599"/><rect x="-2.5" y="-20" width="5" height="14" rx="2" fill="#fff"/>
        </g>
        <text y="48" text-anchor="middle" class="svg-label pot-label">A0 · 512</text>
      </g>

      <!-- Light sensor -->
      <g id="ldr" transform="translate(545 345)">
        <g class="sun" transform="translate(42 -32)">
          <circle r="9" fill="#fcc419"/>
          ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line x1="0" y1="-12" x2="0" y2="-17" stroke="#fcc419" stroke-width="2" transform="rotate(${a})"/>`).join('')}
        </g>
        <circle r="24" fill="#fff4e6" stroke="#e8590c" stroke-width="2"/>
        <path d="M-14 -6 h6 v12 h6 v-12 h6 v12 h6 v-12" fill="none" stroke="#d9480f" stroke-width="2.5"/>
        <text y="48" text-anchor="middle" class="svg-label ldr-label">A1 · 600</text>
      </g>
    </svg>`;

    const svg = container.querySelector('svg');
    const q = (s) => svg.querySelector(s);
    const leds = { 13: q('#led13'), 12: q('#led12'), 11: q('#led11') };
    const btn = q('#btn');
    let fanAngle = 0;

    const press = (v) => { sim.inputs.button = v; if (v) sim._userPressed = true; opts.onInput && opts.onInput('button', v); update(0); };
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); btn.setPointerCapture && btn.setPointerCapture(e.pointerId); press(true); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => btn.addEventListener(ev, () => press(false)));
    btn.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(true); } });
    btn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') press(false); });

    function update(dtMs) {
      [13, 12, 11].forEach((p) => {
        const lv = sim.pwm[p] / 255;
        const g = leds[p];
        g.querySelector('.led-glow').setAttribute('opacity', (lv * 0.85).toFixed(2));
        g.querySelector('.led-body').setAttribute('fill-opacity', (0.28 + lv * 0.72).toFixed(2));
      });
      q('#buzzer .waves').setAttribute('opacity', sim.pins[8] ? '1' : '0');
      q('#servo .servo-arm').setAttribute('transform', `translate(-18 0) rotate(${90 - sim.servo.angle})`);
      q('#servo .servo-label').textContent = `სერვო ~9 · ${sim.servo.angle}°`;
      const sp = sim.pwm[6] / 255;
      fanAngle = (fanAngle + sp * 1.4 * (dtMs || 0)) % 360;
      q('#motor .fan').setAttribute('transform', `rotate(${fanAngle.toFixed(1)})`);
      q('#motor .motor-label').textContent = `ძრავა ~6 · ${Math.round(sp * 100)}%`;
      q('#btn .btn-cap').setAttribute('fill', sim.inputs.button ? '#a61e4d' : '#f03e3e');
      q('#btn .btn-cap').setAttribute('r', sim.inputs.button ? '17' : '20');
      q('#pot .pot-knob').setAttribute('transform', `rotate(${(-135 + sim.inputs.pot / 1023 * 270).toFixed(1)})`);
      q('#pot .pot-label').textContent = `A0 · ${Math.round(sim.inputs.pot)}`;
      q('#ldr .sun').setAttribute('opacity', (0.15 + sim.inputs.light / 1023 * 0.85).toFixed(2));
      q('#ldr .ldr-label').textContent = `A1 · ${Math.round(sim.inputs.light)}`;
      svg.querySelectorAll('.hdr').forEach((r) => {
        const p = +r.dataset.pin;
        const on = p === 9 ? sim.servo.used : (p === 2 ? sim.inputs.button : (p >= 14 ? false : sim.pins[p]));
        r.setAttribute('fill', on ? '#ffd43b' : '#212529');
      });
      q('#tx-led').setAttribute('fill', sim._txBlink ? '#fcc419' : '#495057');
    }
    update(0);
    return { update, svg };
  };
})(window.VL);
