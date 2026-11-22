/* ============================================================
 * stem/lab.js — STEM ლაბორატორიის გვერდი
 * (საგნები → სიმულაციები; canvas ანიმაცია, სლაიდერები, პრესეტები,
 *  „კოდის ხიდი“, მინი-გამოწვევები და დავალების გაგზავნა)
 * ============================================================ */
(function (VL) {
  'use strict';
  const U = VL.U, S = VL.STEM, B = S.Bridge, api = VL.api;
  const KIND = { state: ['🎚 პარამეტრები', 'kind-state'], rule: ['💻 კოდი', 'kind-rule'], sim: ['🧠 კოდი + სიმულაცია', 'kind-sim'] };

  /** გამოწვევის შეფასება → { passed, score, checks, message } */
  S.evaluate = function (sim, ch, p, state, ruleCode) {
    if (ch.kind === 'rule') {
      const names = Object.keys(sim.bridge.vars(state));
      const r = B.test(ruleCode, names, ch.vectors(p), sim.bridge.vars(state));
      return { ...r, message: r.passed ? 'წესი ყველა სატესტო შემთხვევაში სწორად მუშაობს' : r.checks.filter((c) => !c.ok).map((c) => c.label).join('; ') };
    }
    let r;
    try { r = ch.check(state, p, { ruleCode }); } catch (e) { r = { passed: false, message: e.message }; }
    return { passed: !!r.passed, score: r.score ?? (r.passed ? 100 : 0), message: r.message, checks: r.checks || [{ label: r.message, ok: !!r.passed, hint: '' }] };
  };

  S.renderPage = async function (view, params, user) {
    const settings = api.getSettingsSync();
    if (!settings.modules.stem && user.role !== 'admin') {
      view.innerHTML = `<div class="page">${U.empty('STEM ლაბორატორია დროებით გამორთულია ადმინისტრატორის მიერ.', '🔌')}</div>`;
      return;
    }

    /* ---- კონტექსტი ---- */
    let assignment = null, submission = null, sim, focusCh = null, asgParams = null;
    if (params.assignmentId) {
      assignment = await api.getAssignment(params.assignmentId);
      if (assignment.lab !== 'stem') throw new Error('ეს დავალება STEM ლაბისთვის არ არის');
      const r = S.resolve(assignment.exerciseKey);
      if (!r.sim) throw new Error('სიმულაცია ვერ მოიძებნა: ' + assignment.exerciseKey);
      sim = r.sim; focusCh = r.ch; asgParams = assignment.params;
      if (user.role === 'student') submission = (await api.listSubmissions({ assignmentId: assignment.id, studentId: user.id }))[0] || null;
    } else {
      const enabledSubjects = Object.keys(S.subjects).filter((k) => settings.subjects[k] !== false || user.role === 'admin');
      sim = S.get(params.sim);
      if (!sim || !enabledSubjects.includes(sim.subject)) {
        const subj = enabledSubjects.includes(params.subject) ? params.subject : enabledSubjects[0];
        sim = S.sims.find((x) => x.subject === subj);
      }
      if (!sim) { view.innerHTML = `<div class="page">${U.empty('ყველა საგანი გამორთულია.', '🔌')}</div>`; return; }
      if (params.challenge) focusCh = sim.challenges.find((c) => c.key === params.challenge) || null;
    }
    const progress = await api.getProgress(user.id);
    const canSubmit = assignment && user.role === 'student' && assignment.state !== 'closed';
    const challenges = assignment ? [focusCh] : sim.challenges;
    const pOf = (ch) => S.paramsOf(ch, assignment ? asgParams : null);
    const ruleKey = assignment ? 'asg-rule:' + assignment.id : 'stem-rule:' + sim.key;
    const savedRule = api.getDraftSync(user.id, ruleKey);
    const state = S.makeState(sim);
    if (focusCh) state.active = { key: focusCh.key, params: pOf(focusCh) };
    const subjects = Object.entries(S.subjects).filter(([k]) => settings.subjects[k] !== false || user.role === 'admin');

    view.innerHTML = `
      <div class="lab stem-lab">
        ${assignment ? `
          <div class="asg-banner stem">
            <div class="asg-banner-main">
              <span class="badge badge-stem">დავალება · STEM ლაბი · ${U.esc(S.subjects[sim.subject].title)}</span>
              <h2>${U.esc(assignment.title)}</h2>
              <p>${U.esc(assignment.instructions)}</p>
              <div class="asg-meta">
                <span>${sim.icon} ${U.esc(sim.title)}</span>
                <span>📅 ვადა: ${U.fmtDate(assignment.dueDate)}</span>
                <span class="state state-${assignment.state}">${{ active: 'აქტიური', overdue: 'ვადაგასული', closed: 'დახურული' }[assignment.state]}</span>
                ${submission ? `<span class="sub-info">📨 გაგზავნილია (${submission.attempts}×) · ${submission.score}%</span>` : ''}
              </div>
              ${submission && submission.feedback ? `<div class="feedback-box">💬 მასწავლებლის კომენტარი: ${U.esc(submission.feedback)}</div>` : ''}
            </div>
            <button class="btn btn-ghost btn-sm" data-act="back">← უკან</button>
          </div>` : `
          <div class="lab-title">
            <div>
              <h1><span class="lab-icon stem">🔬</span> STEM ლაბორატორია</h1>
              <p class="muted">საგნობრივი სიმულაციები, ექსპერიმენტები და „საგანი + კოდი“ ხიდი</p>
            </div>
          </div>
          <div class="subject-tabs" role="tablist">
            ${subjects.map(([k, s]) => `<button class="subject-tab ${k === sim.subject ? 'active' : ''}" data-subject="${k}"><span>${s.icon}</span> ${U.esc(s.title)}</button>`).join('')}
          </div>
          <div class="sim-strip">
            ${S.sims.filter((x) => x.subject === sim.subject).map((x) => {
              const done = x.challenges.filter((c) => (progress['stem:' + x.key + ':' + c.key] || {}).passed).length;
              return `<button class="sim-card ${x.key === sim.key ? 'active' : ''}" data-sim="${x.key}">
                <span class="sim-icon">${x.icon}</span>
                <span class="sim-txt"><b>${U.esc(x.title)}</b><small>${U.esc(x.summary)}</small></span>
                <span class="sim-prog" title="შესრულებული გამოწვევები">${done}/${x.challenges.length}</span>
              </button>`;
            }).join('')}
          </div>`}

        <div class="mtabs" role="tablist">
          <button class="mtab active" data-tab="sim">🔬 სიმულაცია</button>
          <button class="mtab" data-tab="code">💻 კოდის ხიდი</button>
          <button class="mtab" data-tab="tasks">🎯 ${assignment ? 'დავალება' : 'გამოწვევები'}</button>
        </div>

        <div class="lab-grid stem-grid" data-active="sim">
          <section class="pane pane-sim" data-pane="sim">
            <div class="card sim-card-main">
              <div class="sim-head">
                <h3>${sim.icon} ${U.esc(sim.title)}</h3>
                <div class="sim-ctrls">
                  ${sim.animated ? `<button class="btn btn-run btn-sm" data-act="play">${U.esc(sim.playLabel || '▶ გაშვება')}</button>
                  <select id="sim-speed" aria-label="სიჩქარე">${[0.25, 0.5, 1, 2, 5, 10, 20].map((v) => `<option value="${v}" ${v === (sim.defaultSpeed || 1) ? 'selected' : ''}>${v}×</option>`).join('')}</select>` : ''}
                  <button class="btn btn-ghost btn-sm" data-act="reset">↺ თავიდან</button>
                  ${VL.Formulas && VL.Formulas.forSim('stem:' + sim.key).length ? `<button class="btn btn-ghost btn-sm" data-act="formulas" title="ამ თემის ფორმულები">📐 ფორმულები (${VL.Formulas.forSim('stem:' + sim.key).length})</button>` : ''}
                </div>
              </div>
              <div class="canvas-wrap">
                <canvas id="sim-canvas"></canvas>
                <div class="canvas-overlay">
                  <span class="vled" id="vled" title="ვირტუალური LED (კოდის ხიდი)"></span>
                  <span class="alarm-pill" id="alarm" hidden></span>
                </div>
              </div>
              <div class="readouts" id="readouts"></div>
            </div>
            <div class="card controls-card">
              <h3>🎚 პარამეტრები</h3>
              <div class="controls" id="controls"></div>
              ${sim.presets && sim.presets.length ? `<div class="presets"><span class="muted small">პრესეტები:</span>${sim.presets.map((p, i) => `<button class="chip" data-preset="${i}">${U.esc(p.label)}</button>`).join('')}</div>` : ''}
              ${sim.actions ? `<div class="presets">${sim.actions.map((a, i) => `<button class="btn btn-sm ${i === 0 ? 'btn-primary' : 'btn-ghost'}" data-action="${i}">${U.esc(a.label)}</button>`).join('')}</div>` : ''}
            </div>
          </section>

          <section class="pane pane-code" data-pane="code">
            <div class="card bridge-card">
              <div class="bridge-head">
                <h3>💻 საგანი + კოდი</h3>
                <label class="switch"><input type="checkbox" id="rule-on"><span></span> წესი ცოცხლად</label>
              </div>
              <p class="muted small">ჩაწერე წესი, რომელიც ყოველ კადრზე სრულდება სიმულაციის ცვლადებზე. სინტაქსი: <code>if (...) { ... } else { ... }</code>, <code>&&</code>, <code>||</code>.</p>
              <div class="var-chips"><span class="muted small">ცვლადები:</span>${Object.keys(sim.bridge.vars(state)).map((n) => `<code class="var-chip" data-ins="${n}">${n} = <b data-var="${n}">…</b></code>`).join('')}</div>
              <div class="var-chips"><span class="muted small">ბრძანებები:</span>
                <code class="var-chip" data-ins="led(true);">led(true/false)</code>
                <code class="var-chip" data-ins='alarm("…");'>alarm("ტექსტი")</code>
                <code class="var-chip" data-ins='log("…");'>log("ტექსტი")</code>
                ${sim.bridge.writable.map((w) => `<code class="var-chip" data-ins='set("${w.key}", false);' title="${U.esc(w.label)}">set("${w.key}", …)</code>`).join('')}
                <code class="var-chip" data-ins="abs()">abs, min, max, round, sqrt</code>
              </div>
              <textarea id="rule" class="rule-editor" spellcheck="false" autocapitalize="off" placeholder="// მაგალითი:\nif (...) {\n  led(true);\n}"></textarea>
              <div class="btn-row">
                <button class="btn btn-ghost btn-sm" data-act="example">📄 მაგალითი</button>
                <button class="btn btn-ghost btn-sm" data-act="clear-rule">🗑 გასუფთავება</button>
                <span class="spacer"></span>
                <span class="muted small" id="rule-status">წესი გამორთულია</span>
              </div>
              <div id="rule-error" class="issue issue-error" hidden></div>
              <div class="bridge-out">
                <div><span class="vled small" id="vled2"></span> LED</div>
                ${sim.bridge.writable.map((w) => `<div>⚙ ${U.esc(w.label)}: <b data-ctrl="${w.key}">—</b></div>`).join('')}
              </div>
              <ul class="log" id="log"></ul>
            </div>
          </section>

          <section class="pane pane-tasks" data-pane="tasks">
            <div class="card tasks-card">
              <h3>🎯 ${assignment ? 'დავალების პირობა' : 'გამოწვევები'}</h3>
              ${challenges.map((ch) => {
                const p = pOf(ch); const [kl, kc] = KIND[ch.kind];
                const done = !assignment && (progress['stem:' + sim.key + ':' + ch.key] || {}).passed;
                return `<div class="challenge ${focusCh && focusCh.key === ch.key ? 'focus' : ''}" data-ch="${ch.key}">
                  <div class="challenge-head"><b>${done ? '✅ ' : ''}${U.esc(ch.title)}</b><span class="kind ${kc}">${kl}</span></div>
                  <p>${U.esc(ch.text(p))}</p>
                  ${ch.kind === 'state' ? '<div class="live-status" data-live></div>' : ''}
                  <div class="btn-row">
                    <button class="btn btn-primary btn-sm" data-check="${ch.key}">🧪 შემოწმება</button>
                    ${canSubmit ? `<button class="btn btn-success btn-sm" data-submit="${ch.key}">📨 გაგზავნა</button>` : ''}
                  </div>
                  ${assignment && user.role === 'student' && assignment.state === 'closed' ? '<p class="muted small">დავალება დახურულია.</p>' : ''}
                  <div class="ch-out"></div>
                </div>`;
              }).join('')}
            </div>
          </section>
        </div>
      </div>`;

    /* ---- ელემენტები ---- */
    const $ = (s) => view.querySelector(s);
    const canvas = $('#sim-canvas'), ctx = canvas.getContext('2d');
    const ruleTa = $('#rule');
    ruleTa.value = savedRule != null ? savedRule : '';
    let playing = !!sim.autoplay, speed = sim.defaultSpeed || 1, ruleOn = false, compiled = null, raf = 0, last = 0, roTimer = 0, liveTimer = 0, alarmUntil = 0, lastLog = '';
    let W = 600, H = 375;

    /* ---- კონტროლები ---- */
    const ctl = $('#controls');
    ctl.innerHTML = sim.vars.map((v) => {
      if (v.type === 'select') return `<label class="ctl"><span>${U.esc(v.label)}</span><select data-var="${v.key}">${v.options.map(([k, l]) => `<option value="${k}">${U.esc(l)}</option>`).join('')}</select></label>`;
      if (v.type === 'toggle') return `<label class="ctl ctl-toggle"><span>${U.esc(v.label)}</span><label class="switch"><input type="checkbox" data-var="${v.key}"><span></span></label></label>`;
      return `<label class="ctl"><span>${U.esc(v.label)} <b class="ctl-val" data-val="${v.key}"></b></span><input type="range" data-var="${v.key}" min="${v.min}" max="${v.max}" step="${v.step}"></label>`;
    }).join('');
    function syncControls() {
      sim.vars.forEach((v) => {
        const el = ctl.querySelector(`[data-var="${v.key}"]`);
        const val = state.v[v.key];
        if (v.type === 'toggle') el.checked = !!val;
        else if (document.activeElement !== el || v.live) el.value = val;
        const lab = ctl.querySelector(`[data-val="${v.key}"]`);
        if (lab) lab.textContent = `${+Number(val).toFixed(3)} ${v.unit || ''}`;
      });
    }
    ctl.addEventListener('input', (e) => {
      const el = e.target.closest('[data-var]'); if (!el) return;
      const v = sim.vars.find((x) => x.key === el.dataset.var);
      state.v[v.key] = v.type === 'toggle' ? (el.checked ? 1 : 0) : v.type === 'select' ? el.value : Number(el.value);
      if (v.key === 'sw') state.ctrl.switchOn = true;
      if (v.reset) sim.reset(state);
      syncControls(); updateReadouts();
    });
    syncControls();

    /* ---- canvas ---- */
    function resize() {
      const r = canvas.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(280, r.width); H = Math.max(200, r.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
    canvas.addEventListener('pointerdown', (e) => {
      if (!sim.onPointer) return;
      const r = canvas.getBoundingClientRect();
      if (sim.onPointer(state, e.clientX - r.left, e.clientY - r.top, W, H)) { syncControls(); updateReadouts(); }
    });

    function updateReadouts() {
      $('#readouts').innerHTML = sim.readouts(state).map(([k, v]) => `<div class="ro"><span>${U.esc(k)}</span><b>${U.esc(v)}</b></div>`).join('');
      const vars = sim.bridge.vars(state);
      view.querySelectorAll('[data-var]').forEach((el) => {
        if (el.tagName !== 'B') return;
        const v = vars[el.dataset.var]; el.textContent = typeof v === 'number' ? +v.toFixed(2) : String(v);
      });
      view.querySelectorAll('[data-ctrl]').forEach((el) => { el.textContent = state.ctrl[el.dataset.ctrl] === false ? 'false (გამორთ.)' : 'true (ჩართ.)'; });
    }
    function setLed(on) {
      ['#vled', '#vled2'].forEach((s) => { const el = $(s); el.classList.toggle('on', on === true); el.classList.toggle('off', on === false); });
    }

    /* ---- კოდის ხიდი ---- */
    const names = Object.keys(sim.bridge.vars(state));
    const saveRule = U.debounce(() => api.saveDraftSync(user.id, ruleKey, ruleTa.value), 400);
    function compileRule() {
      compiled = B.compile(ruleTa.value, names);
      const err = $('#rule-error');
      if (!compiled.ok) { err.hidden = false; err.textContent = '⛔ ' + compiled.error; }
      else err.hidden = true;
      return compiled.ok;
    }
    function setRuleOn(on) {
      ruleOn = on && compileRule();
      $('#rule-on').checked = ruleOn;
      $('#rule-status').textContent = ruleOn ? '🟢 წესი მუშაობს' : 'წესი გამორთულია';
      if (!ruleOn) { setLed(null); }
    }
    ruleTa.addEventListener('input', () => { saveRule(); if (ruleOn) { if (!compileRule()) setRuleOn(false); } });
    ruleTa.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') { e.preventDefault(); const s = ruleTa.selectionStart; ruleTa.value = ruleTa.value.slice(0, s) + '  ' + ruleTa.value.slice(ruleTa.selectionEnd); ruleTa.selectionStart = ruleTa.selectionEnd = s + 2; ruleTa.dispatchEvent(new Event('input')); }
    });
    $('#rule-on').addEventListener('change', (e) => setRuleOn(e.target.checked));
    U.on(view, 'click', '[data-ins]', (e, el) => {
      const t = el.dataset.ins, s = ruleTa.selectionStart;
      ruleTa.value = ruleTa.value.slice(0, s) + t + ruleTa.value.slice(ruleTa.selectionEnd);
      ruleTa.focus(); ruleTa.selectionStart = ruleTa.selectionEnd = s + t.length; ruleTa.dispatchEvent(new Event('input'));
    });
    function runRule() {
      if (!ruleOn || !compiled || !compiled.ok || compiled.empty) return;
      let out;
      try { out = compiled.run(sim.bridge.vars(state)); }
      catch (e) { setRuleOn(false); const err = $('#rule-error'); err.hidden = false; err.textContent = '⛔ ' + B.translate(e); return; }
      if (out.led !== null) setLed(out.led);
      Object.entries(out.sets).forEach(([k, v]) => { if (k in state.ctrl) state.ctrl[k] = !!v; });
      if (out.alarm) { const a = $('#alarm'); a.hidden = false; a.textContent = '🚨 ' + out.alarm; alarmUntil = performance.now() + 2500; }
      out.logs.forEach((m) => {
        if (m === lastLog) return; lastLog = m;
        const li = document.createElement('li'); li.textContent = `[${state.t.toFixed(1)} წმ] ${m}`;
        const ul = $('#log'); ul.prepend(li); while (ul.children.length > 40) ul.lastChild.remove();
      });
    }

    /* ---- მთავარი ციკლი ---- */
    function frame(ts) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (ts - (last || ts)) / 1000); last = ts;
      if (playing && sim.animated) {
        sim.step(state, dt * speed);
        if (sim.isDone && sim.isDone(state)) { playing = false; updatePlay(); }
        if (sim.vars.some((v) => v.live)) syncControls();
      }
      runRule();
      sim.draw(ctx, state, W, H);
      if (alarmUntil && ts > alarmUntil) { $('#alarm').hidden = true; alarmUntil = 0; }
      if (ts - roTimer > 120) { roTimer = ts; updateReadouts(); }
      if (ts - liveTimer > 400) { liveTimer = ts; updateLive(); }
    }
    function updatePlay() {
      const b = view.querySelector('[data-act="play"]');
      if (b) b.textContent = playing ? '⏸ პაუზა' : (sim.playLabel || '▶ გაშვება');
    }
    function updateLive() {
      challenges.forEach((ch) => {
        if (ch.kind !== 'state') return;
        const el = view.querySelector(`[data-ch="${ch.key}"] [data-live]`); if (!el) return;
        const r = S.evaluate(sim, ch, pOf(ch), state, ruleTa.value);
        el.className = 'live-status ' + (r.passed ? 'ok' : '');
        el.textContent = (r.passed ? '✅ ' : '⏳ ') + r.message;
      });
    }
    raf = requestAnimationFrame(frame);
    updatePlay(); updateReadouts();

    /* ---- ჩანართები ---- */
    const grid = $('.lab-grid');
    view.querySelectorAll('.mtab').forEach((b) => b.addEventListener('click', () => {
      grid.dataset.active = b.dataset.tab;
      view.querySelectorAll('.mtab').forEach((x) => x.classList.toggle('active', x === b));
    }));

    /* ---- მოვლენები ---- */
    U.on(view, 'click', '[data-subject]', (e, b) => VL.router.go('stem', { subject: b.dataset.subject }));
    U.on(view, 'click', '[data-sim]', (e, b) => VL.router.go('stem', { sim: b.dataset.sim }));
    U.on(view, 'click', '[data-preset]', (e, b) => {
      const p = sim.presets[+b.dataset.preset];
      Object.assign(state.v, p.values);
      if (Object.keys(p.values).some((k) => (sim.vars.find((v) => v.key === k) || {}).reset)) sim.reset(state);
      syncControls(); updateReadouts();
    });
    U.on(view, 'click', '[data-action]', (e, b) => { sim.actions[+b.dataset.action].run(state); syncControls(); updateReadouts(); });
    U.on(view, 'click', '[data-act]', async (e, b) => {
      const act = b.dataset.act;
      if (act === 'play') { if (!playing && sim.isDone && sim.isDone(state)) sim.reset(state); playing = !playing; updatePlay(); }
      else if (act === 'reset') {
        const keepActive = state.active, keepPlaced = state.placed;
        Object.assign(state, S.makeState(sim, state.v)); state.active = keepActive;
        if (keepPlaced && sim.key !== 'coords') state.placed = keepPlaced;
        playing = !!sim.autoplay; updatePlay(); setLed(null); syncControls(); updateReadouts();
      }
      else if (act === 'formulas') VL.Formulas.showForSim(sim.key, user);
      else if (act === 'example') { ruleTa.value = sim.bridge.example; ruleTa.dispatchEvent(new Event('input')); setRuleOn(true); }
      else if (act === 'clear-rule') { ruleTa.value = ''; ruleTa.dispatchEvent(new Event('input')); setRuleOn(false); $('#log').innerHTML = ''; }
      else if (act === 'back') history.length > 1 ? history.back() : VL.router.go('home');
    });
    async function doCheck(key) {
      const ch = challenges.find((c) => c.key === key); const p = pOf(ch);
      state.active = { key: ch.key, params: p };
      view.querySelectorAll('.challenge').forEach((el) => el.classList.toggle('focus', el.dataset.ch === key));
      const r = S.evaluate(sim, ch, p, state, ruleTa.value);
      view.querySelector(`[data-ch="${key}"] .ch-out`).innerHTML = VL.Tech.renderChecks(r);
      if (r.passed && !assignment) {
        await api.saveProgress(user.id, 'stem:' + sim.key + ':' + ch.key, true);
        const head = view.querySelector(`[data-ch="${key}"] .challenge-head b`);
        if (head && !head.textContent.startsWith('✅')) head.textContent = '✅ ' + head.textContent;
      }
      return { r, ch };
    }
    U.on(view, 'click', '[data-check]', (e, b) => doCheck(b.dataset.check));
    U.on(view, 'click', '[data-submit]', async (e, b) => {
      const { r } = await doCheck(b.dataset.submit);
      try {
        const s = await api.submit({
          assignmentId: assignment.id, studentId: user.id, passed: r.passed, score: r.score, message: r.message,
          payload: { values: { ...state.v }, placed: state.placed, rule: ruleTa.value, checks: r.checks.map((c) => ({ label: c.label, ok: c.ok })) },
        });
        U.toast(r.passed ? `გაიგზავნა ✅ (${s.score}%)` : `გაიგზავნა (${s.score}%) — შეგიძლია ხელახლა სცადო`, r.passed ? 'success' : 'info', 4000);
        const meta = view.querySelector('.asg-meta');
        if (meta) { const old = meta.querySelector('.sub-info'); if (old) old.remove(); meta.insertAdjacentHTML('beforeend', `<span class="sub-info">📨 გაგზავნილია (${s.attempts}×) · ${s.score}%</span>`); }
      } catch (err) { U.toast(err.message, 'error'); }
    });
    const spSel = $('#sim-speed'); if (spSel) spSel.addEventListener('change', () => { speed = +spSel.value; });

    if (assignment && focusCh && focusCh.kind !== 'state' && window.matchMedia('(max-width: 899px)').matches) { /* მობილურზე სიმულაცია რჩება პირველი */ }
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  };
})(window.VL);
