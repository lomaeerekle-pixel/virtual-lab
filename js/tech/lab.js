/* ============================================================
 * tech/lab.js — ტექნიკური ლაბორატორიის გვერდი
 * (კოდის რედაქტორი, ვირტუალური სქემა, სერიული მონიტორი,
 *  მინიშნებები, სავარჯიშოები და დავალების გაგზავნა)
 * ============================================================ */
(function (VL) {
  'use strict';
  const U = VL.U, T = VL.Tech, api = VL.api;

  function renderChecks(res) {
    return `
      <div class="check-result ${res.passed ? 'ok' : 'bad'}">
        <div class="check-head">
          <strong>${res.passed ? '✅ ყველა შემოწმება გავიდა!' : '❌ ჯერ არ არის სრულად სწორი'}</strong>
          <span class="score-pill">${res.score}%</span>
        </div>
        <ul class="check-list">
          ${res.checks.map((c) => `<li class="${c.ok ? 'ok' : 'bad'}"><span>${c.ok ? '✔' : '✘'}</span><div>${U.esc(c.label)}${c.hint ? `<small>${U.esc(c.hint)}</small>` : ''}</div></li>`).join('')}
        </ul>
      </div>`;
  }
  T.renderChecks = renderChecks;

  T.renderPage = async function (view, params, user) {
    const settings = api.getSettingsSync();
    if (!settings.modules.tech && user.role !== 'admin') {
      view.innerHTML = `<div class="page">${U.empty('ტექნიკური ლაბორატორია დროებით გამორთულია ადმინისტრატორის მიერ.', '🔌')}</div>`;
      return;
    }

    /* ---- კონტექსტი: დავალება ან თავისუფალი პრაქტიკა ---- */
    let assignment = null, submission = null, canSubmit = false;
    if (params.assignmentId) {
      assignment = await api.getAssignment(params.assignmentId);
      if (String(assignment.exerciseKey).startsWith('circuit:')) { VL.router.go('circuit', { assignmentId: assignment.id }); return; }
      if (assignment.lab !== 'tech') throw new Error('ეს დავალება ტექნიკური ლაბისთვის არ არის');
      if (user.role === 'student') {
        const subs = await api.listSubmissions({ assignmentId: assignment.id, studentId: user.id });
        submission = subs[0] || null;
        canSubmit = assignment.state !== 'closed';
      }
    }
    let exKey = assignment ? assignment.exerciseKey : (params.exercise || '');
    let exercise = exKey ? T.getExercise(exKey) : null;
    let exParams = exercise ? T.mergeParams(exercise, assignment ? assignment.params : null) : {};
    const isStaff = user.role !== 'student';
    const draftKey = () => (assignment ? 'asg:' + assignment.id : 'tech:' + (exKey || 'free'));
    const initialCode = () => api.getDraftSync(user.id, draftKey()) || (exercise ? exercise.starter : T.FREE_CODE);

    view.innerHTML = `
      <div class="lab tech-lab">
        ${assignment ? `
          <div class="asg-banner">
            <div class="asg-banner-main">
              <span class="badge badge-tech">დავალება · ტექნიკური ლაბი</span>
              <h2>${U.esc(assignment.title)}</h2>
              <p>${U.esc(assignment.instructions)}</p>
              <div class="asg-meta">
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
              <h1><span class="lab-icon tech">⚡</span> ტექნიკური ლაბორატორია</h1>
              <p class="muted">Arduino და ელექტრონიკა — ვირტუალური დაფა, კოდი და სენსორები</p>
            </div>
            <a class="circ-promo" href="#circuit" data-nav="circuit">🔌 <b>სქემის კონსტრუქტორი</b> — ააწყე საკუთარი წრედი (Tinkercad-ის მსგავსად) →</a>
            <div class="lab-pickers">
              <label class="field-inline">სავარჯიშო
                <select id="ex-select">
                  <option value="">🧪 თავისუფალი რეჟიმი</option>
                  ${T.EXERCISES.map((e) => `<option value="${e.key}" ${e.key === exKey ? 'selected' : ''}>${e.icon} ${U.esc(e.title)} · ${e.level}</option>`).join('')}
                </select>
              </label>
              <label class="field-inline">მაგალითი
                <select id="example-select">
                  <option value="">— ჩატვირთე მაგალითი —</option>
                  ${T.EXAMPLES.map((e) => `<option value="${e.key}">${U.esc(e.title)}</option>`).join('')}
                </select>
              </label>
            </div>
          </div>`}

        <div class="mtabs" role="tablist">
          <button class="mtab active" data-tab="code">📝 კოდი</button>
          <button class="mtab" data-tab="board">🔌 სქემა</button>
          <button class="mtab" data-tab="monitor">📟 მონიტორი${exercise ? ' და დავალება' : ''}</button>
        </div>

        <div class="lab-grid tech-grid" data-active="code">
          <section class="pane pane-code card" data-pane="code">
            <div class="toolbar">
              <button class="btn btn-run" data-act="run" title="გაშვება">▶ გაშვება</button>
              <button class="btn btn-ghost" data-act="stop" title="გაჩერება და ნულოვანი მდგომარეობა">⏹ გაჩერება</button>
              <button class="btn btn-ghost" data-act="step" title="შემდეგ delay()-მდე ან loop()-ის ბოლომდე">⏭ ნაბიჯი</button>
              <label class="field-inline compact">სიჩქარე
                <select id="speed"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="5">5×</option></select>
              </label>
              <span class="spacer"></span>
              <label class="field-inline compact">ჩასმა
                <select id="snippet"><option value="">{ } ფრაგმენტი</option>${T.SNIPPETS.map((s, i) => `<option value="${i}">${U.esc(s.title)}</option>`).join('')}</select>
              </label>
            </div>
            <div class="editor">
              <pre class="gutter" aria-hidden="true"></pre>
              <textarea id="code" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="Arduino კოდი"></textarea>
            </div>
            <div class="editor-foot">
              <span class="muted small">C++/Arduino სინტაქსი · setup() ერთხელ, loop() განუწყვეტლივ · Tab = 2 გამოტოვება</span>
              <span class="spacer"></span>
              ${exercise ? '<button class="btn btn-ghost btn-sm" data-act="starter">↺ საწყისი კოდი</button>' : ''}
              ${exercise && isStaff ? '<button class="btn btn-ghost btn-sm" data-act="solution">🔑 ამოხსნა</button>' : ''}
            </div>
            <div id="issues" class="issues"></div>
          </section>

          <section class="pane pane-board card" data-pane="board">
            <div class="status-row">
              <span id="status" class="status status-idle">⏹ გაჩერებულია</span>
              <span class="muted small" id="clock">t = 0.0 წმ · loop × 0</span>
            </div>
            <div id="board" class="board-wrap"></div>
            <div class="inputs">
              <button class="btn btn-press" id="hw-button" aria-label="ღილაკი 2 — დააჭირე და გეჭიროს">🔘 ღილაკი (პინი 2) — დააჭირე</button>
              <label class="slider-field"><span>🎛 პოტენციომეტრი A0 <b id="pot-val">512</b></span><input type="range" id="pot" min="0" max="1023" value="512"></label>
              <label class="slider-field"><span>☀ სინათლის სენსორი A1 <b id="light-val">600</b></span><input type="range" id="light" min="0" max="1023" value="600"></label>
            </div>
          </section>

          <section class="pane pane-monitor" data-pane="monitor">
            ${exercise ? `
            <div class="card exercise-card">
              <div class="exercise-head">
                <h3>${exercise.icon} ${U.esc(exercise.title)}</h3>
                <span class="badge">${exercise.level}</span>
              </div>
              <p>${U.esc(exercise.text(exParams))}</p>
              <div class="btn-row">
                <button class="btn btn-primary" data-act="check">🧪 შემოწმება</button>
                ${assignment && user.role === 'student' ? `<button class="btn btn-success" data-act="submit" ${canSubmit ? '' : 'disabled'}>📨 გაგზავნა</button>` : ''}
              </div>
              ${assignment && assignment.state === 'closed' && user.role === 'student' ? '<p class="muted small">დავალება დახურულია — გაგზავნა შეუძლებელია.</p>' : ''}
              <div id="check-out"></div>
            </div>` : ''}
            <div class="card monitor-card">
              <div class="monitor-head"><h3>📟 სერიული მონიტორი</h3><button class="btn btn-ghost btn-sm" data-act="clear-serial">გასუფთავება</button></div>
              <pre id="serial" class="serial" aria-live="off"></pre>
            </div>
            <div class="card hints-card">
              <h3>💡 მინიშნებები</h3>
              <ul id="hints" class="hints"><li class="muted">გაუშვი კოდი — აქ გამოჩნდება შეცდომები და რჩევები.</li></ul>
            </div>
          </section>
        </div>
      </div>`;

    /* ---- ელემენტები ---- */
    const $ = (s) => view.querySelector(s);
    const ta = $('#code'), gutter = $('.gutter');
    const sim = new T.Sim();
    const board = T.Board($('#board'), sim);
    let running = false, compiled = false, lintIssues = [], speed = 1, target = 0, last = 0, raf = 0, serialOffset = 0, shownSerialLen = -1, hintTimer = 0;

    /* ---- რედაქტორი ---- */
    const updateGutter = () => {
      const n = ta.value.split('\n').length;
      let s = ''; for (let i = 1; i <= n; i++) s += i + '\n';
      gutter.textContent = s;
      gutter.scrollTop = ta.scrollTop;
    };
    const saveDraft = U.debounce(() => api.saveDraftSync(user.id, draftKey(), ta.value), 400);
    const setCode = (code) => { ta.value = code; updateGutter(); saveDraft(); compiled = false; };
    ta.addEventListener('input', () => { updateGutter(); saveDraft(); compiled = false; });
    ta.addEventListener('scroll', () => { gutter.scrollTop = ta.scrollTop; });
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = ta.selectionStart, en = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(en);
        ta.selectionStart = ta.selectionEnd = s + 2;
        ta.dispatchEvent(new Event('input'));
      } else if (e.key === 'Enter') {
        const s = ta.selectionStart;
        const lineStart = ta.value.lastIndexOf('\n', s - 1) + 1;
        const indent = (ta.value.slice(lineStart, s).match(/^\s*/) || [''])[0];
        const extra = /\{\s*$/.test(ta.value.slice(lineStart, s)) ? '  ' : '';
        e.preventDefault();
        ta.value = ta.value.slice(0, s) + '\n' + indent + extra + ta.value.slice(ta.selectionEnd);
        ta.selectionStart = ta.selectionEnd = s + 1 + indent.length + extra.length;
        ta.dispatchEvent(new Event('input'));
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { start(); }
    });
    setCode(initialCode());

    /* ---- მინიშნებები ---- */
    function renderIssues() {
      const box = $('#issues');
      if (!lintIssues.length) { box.innerHTML = ''; return; }
      box.innerHTML = lintIssues.map((i) => `<div class="issue issue-${i.level}">${i.level === 'error' ? '⛔' : '⚠️'} ${U.esc(i.msg)}</div>`).join('');
    }
    function renderHints() {
      const list = [];
      if (sim.error) list.push({ cls: 'error', text: '⛔ ' + sim.error });
      lintIssues.filter((i) => i.level === 'warn').forEach((i) => list.push({ cls: 'warn', text: '⚠️ ' + i.msg }));
      sim.warnings.forEach((m) => list.push({ cls: 'warn', text: '🔧 ' + m }));
      if (running) sim.behaviourHints().forEach((m) => list.push({ cls: 'info', text: '💡 ' + m }));
      const ul = $('#hints');
      ul.innerHTML = list.length ? list.map((h) => `<li class="hint-${h.cls}">${U.esc(h.text)}</li>`).join('')
        : `<li class="muted">${sim.phase === 'idle' ? 'გაუშვი კოდი — აქ გამოჩნდება შეცდომები და რჩევები.' : '👍 პრობლემები არ არის აღმოჩენილი.'}</li>`;
    }

    /* ---- სტატუსი ---- */
    function setStatus() {
      const st = $('#status');
      let cls = 'idle', txt = '⏹ გაჩერებულია';
      if (sim.phase === 'error') { cls = 'error'; txt = '⚠ შეცდომა'; }
      else if (running) { cls = 'run'; txt = '▶ მუშაობს'; }
      else if (sim.phase !== 'idle') { cls = 'pause'; txt = '⏸ პაუზა'; }
      st.className = 'status status-' + cls; st.textContent = txt;
      $('#clock').textContent = `t = ${(sim.vtime / 1000).toFixed(1)} წმ · loop × ${sim.loopCount}`;
      view.querySelector('[data-act="run"]').textContent = running ? '⏸ პაუზა' : (sim.phase === 'loop' || sim.phase === 'setup' ? '▶ გაგრძელება' : '▶ გაშვება');
    }
    function renderSerial() {
      const txt = sim.serial.slice(serialOffset);
      if (txt.length === shownSerialLen) return;
      shownSerialLen = txt.length;
      const el = $('#serial');
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
      el.textContent = txt.length > 6000 ? txt.slice(-6000) : txt;
      if (atBottom) el.scrollTop = el.scrollHeight;
    }

    /* ---- შესრულება ---- */
    function compileAndStart() {
      const res = sim.compile(ta.value);
      lintIssues = res.issues;
      renderIssues();
      if (!res.ok) { renderHints(); setStatus(); U.toast('კოდში შეცდომაა — იხილე ქვემოთ', 'error'); return false; }
      compiled = true;
      serialOffset = 0; shownSerialLen = -1;
      if (!sim.start()) { renderHints(); setStatus(); return false; }
      target = 0;
      return true;
    }
    function start() {
      if (running) { running = false; setStatus(); return; } // პაუზა
      const fresh = !compiled || sim.phase === 'idle' || sim.phase === 'error';
      if (fresh && !compileAndStart()) return;
      running = true; target = sim.vtime; last = performance.now();
      // მობილურზე ავტომატურად სქემის ჩანართზე გადასვლა
      if (window.matchMedia('(max-width: 899px)').matches) switchTab('board');
      setStatus();
    }
    function stop() {
      running = false; sim.resetState(); compiled = false; serialOffset = 0; shownSerialLen = -1;
      board.update(0); renderSerial(); renderHints(); setStatus();
    }
    function step() {
      running = false;
      if (!compiled || sim.phase === 'idle' || sim.phase === 'error') { if (!compileAndStart()) return; }
      const r = sim.stepLoop();
      target = sim.vtime;
      board.update(16); renderSerial(); renderHints(); setStatus();
      U.toast(r === 'delay' ? `ნაბიჯი: delay()-მდე · t = ${(sim.vtime / 1000).toFixed(2)} წმ` : r === 'loopEnd' ? `ნაბიჯი: ${sim.phase === 'loop' && sim.loopCount === 0 ? 'setup() დასრულდა' : 'loop() №' + sim.loopCount + ' დასრულდა'}` : 'ნაბიჯი შესრულდა', 'info', 1500);
    }
    function frame(ts) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(100, ts - (last || ts));
      last = ts;
      if (running) {
        target += dt * speed;
        if (target - sim.vtime > 250) target = sim.vtime + 250; // ჩამორჩენის შეზღუდვა
        sim.runUntil(target, 120000);
        if (sim.phase === 'error') { running = false; renderHints(); U.toast('შესრულების შეცდომა', 'error'); }
        sim._txBlink = sim.serial.length !== shownSerialLen + serialOffset;
        renderSerial();
        if (ts - hintTimer > 700) { hintTimer = ts; renderHints(); }
        setStatus();
      }
      board.update(running ? dt * speed : 0);
    }
    raf = requestAnimationFrame(frame);

    /* ---- შეყვანები ---- */
    const hwBtn = $('#hw-button');
    const press = (v) => { sim.inputs.button = v; if (v) sim._userPressed = true; hwBtn.classList.toggle('pressed', v); board.update(0); };
    hwBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); hwBtn.setPointerCapture && hwBtn.setPointerCapture(e.pointerId); press(true); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => hwBtn.addEventListener(ev, () => press(false)));
    hwBtn.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(true); } });
    hwBtn.addEventListener('keyup', () => press(false));
    $('#pot').addEventListener('input', (e) => { sim.inputs.pot = +e.target.value; sim._userPot = true; $('#pot-val').textContent = e.target.value; board.update(0); });
    $('#light').addEventListener('input', (e) => { sim.inputs.light = +e.target.value; sim._userLight = true; $('#light-val').textContent = e.target.value; board.update(0); });
    $('#speed').addEventListener('change', (e) => { speed = +e.target.value; });
    $('#snippet').addEventListener('change', (e) => {
      const sn = T.SNIPPETS[+e.target.value]; e.target.value = '';
      if (!sn) return;
      const s = ta.selectionStart;
      const lineStart = ta.value.lastIndexOf('\n', s - 1) + 1;
      const indent = (ta.value.slice(lineStart, s).match(/^\s*/) || [''])[0];
      const code = sn.code.split('\n').join('\n' + indent);
      ta.value = ta.value.slice(0, s) + code + ta.value.slice(ta.selectionEnd);
      ta.focus(); ta.selectionStart = ta.selectionEnd = s + code.length;
      ta.dispatchEvent(new Event('input'));
    });

    /* ---- ჩანართები (მობილური) ---- */
    const grid = $('.lab-grid');
    function switchTab(name) {
      grid.dataset.active = name;
      view.querySelectorAll('.mtab').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    }
    view.querySelectorAll('.mtab').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));

    /* ---- სავარჯიშოები / მაგალითები ---- */
    const exSel = $('#ex-select');
    if (exSel) exSel.addEventListener('change', () => { stop(); VL.router.go('tech', { exercise: exSel.value }); });
    const exampleSel = $('#example-select');
    if (exampleSel) exampleSel.addEventListener('change', async () => {
      const ex = T.EXAMPLES.find((e) => e.key === exampleSel.value); exampleSel.value = '';
      if (!ex) return;
      if (await U.confirm('მიმდინარე კოდი ჩანაცვლდება მაგალითით. გავაგრძელოთ?', { okLabel: 'ჩატვირთვა' })) { stop(); setCode(ex.code); }
    });

    async function runCheck() {
      const res = T.runTest(ta.value, exercise, exParams);
      $('#check-out').innerHTML = renderChecks(res);
      if (res.passed && !assignment) await api.saveProgress(user.id, 'tech:' + exercise.key, true);
      return res;
    }

    /* ---- ღილაკები ---- */
    U.on(view, 'click', '[data-act]', async (e, b) => {
      const act = b.dataset.act;
      if (act === 'run') start();
      else if (act === 'stop') stop();
      else if (act === 'step') step();
      else if (act === 'clear-serial') { serialOffset = sim.serial.length; shownSerialLen = -1; renderSerial(); }
      else if (act === 'back') history.length > 1 ? history.back() : VL.router.go('home');
      else if (act === 'starter') { if (await U.confirm('კოდი დაბრუნდება საწყის მდგომარეობაში. გავაგრძელოთ?', { okLabel: 'დაბრუნება' })) { stop(); setCode(exercise.starter); } }
      else if (act === 'solution') { if (await U.confirm('რედაქტორში ჩაიტვირთება ამოხსნა (ხილულია მხოლოდ მასწავლებლისთვის/ადმინისთვის).', { okLabel: 'ჩატვირთვა' })) { stop(); setCode(exercise.solution(exParams)); } }
      else if (act === 'check') { await runCheck(); }
      else if (act === 'submit') {
        const res = await runCheck();
        try {
          const s = await api.submit({
            assignmentId: assignment.id, studentId: user.id, passed: res.passed, score: res.score,
            message: res.passed ? 'ყველა შემოწმება გავიდა' : res.checks.filter((c) => !c.ok).map((c) => c.label).join('; '),
            payload: { code: ta.value, checks: res.checks.map((c) => ({ label: c.label, ok: c.ok })) },
          });
          U.toast(res.passed ? `გაიგზავნა ✅ (${s.score}%)` : `გაიგზავნა (${s.score}%) — შეგიძლია გააუმჯობესო და ხელახლა გააგზავნო`, res.passed ? 'success' : 'info', 4000);
          const meta = view.querySelector('.asg-meta');
          if (meta) { const old = meta.querySelector('.sub-info'); if (old) old.remove(); meta.insertAdjacentHTML('beforeend', `<span class="sub-info">📨 გაგზავნილია (${s.attempts}×) · ${s.score}%</span>`); }
        } catch (err) { U.toast(err.message, 'error'); }
      }
    });

    renderHints(); setStatus();
    return () => { cancelAnimationFrame(raf); running = false; };
  };
})(window.VL);
