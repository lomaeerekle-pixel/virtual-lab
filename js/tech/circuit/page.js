/* ============================================================
 * tech/circuit/page.js — სქემის კონსტრუქტორის გვერდები
 *   • „ჩემი სქემები“ (Tinkercad-ის დაფის მსგავსი): სქემები, შაბლონები, გამოწვევები
 *   • რედაქტორი: ტილო + კომპონენტები / თვისებები / კოდი / მონიტორი / დავალება
 * ============================================================ */
(function (VL) {
  'use strict';
  const U = VL.U, api = VL.api, CZ = VL.Circuit, P = CZ.PARTS, T = VL.Tech;
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ============================================================
   * „ჩემი სქემები“
   * ============================================================ */
  async function dashboard(view, user) {
    const designs = await api.listDesigns(user.id);
    const progress = await api.getProgress(user.id);
    view.innerHTML = `
      <div class="page cz-dash">
        <div class="page-head">
          <div>
            <h1>🔌 სქემის კონსტრუქტორი</h1>
            <p class="muted">ააწყე წრედები ვირტუალურ დაფაზე: გადაიტანე კომპონენტები, გაავლე სადენები, დაწერე Arduino კოდი და გაუშვი სიმულაცია.</p>
          </div>
          <button class="btn btn-primary" data-act="new">＋ ახალი სქემა</button>
        </div>

        <h2 class="section-title">📁 ჩემი სქემები</h2>
        <div class="design-grid">
          <button class="design-card new" data-act="new"><span class="plus">＋</span><b>ახალი სქემა</b><small class="muted">ცარიელი ტილო</small></button>
          ${designs.map((d) => `
            <div class="design-card" data-open="${d.id}">
              <div class="thumb">${CZ.staticSvg(d)}</div>
              <div class="design-meta">
                <div><b>${U.esc(d.name)}</b><small class="muted">${d.parts.length} კომპონენტი · ${U.fmtDateTime(d.updatedAt)}</small></div>
                <div class="design-actions">
                  <button class="icon-btn" data-rename="${d.id}" title="სახელის შეცვლა">✎</button>
                  <button class="icon-btn" data-dup="${d.id}" title="ასლი">⧉</button>
                  <button class="icon-btn danger-text" data-del="${d.id}" title="წაშლა">🗑</button>
                </div>
              </div>
            </div>`).join('')}
        </div>

        <h2 class="section-title">🚀 სასტარტო პროექტები</h2>
        <div class="design-grid">
          ${CZ.TEMPLATES.map((t) => `
            <div class="design-card tpl" data-tpl="${t.key}">
              <div class="thumb">${CZ.staticSvg(t)}</div>
              <div class="design-meta"><div><b>${t.icon} ${U.esc(t.name)}</b><small class="muted">${U.esc(t.desc)}</small></div></div>
            </div>`).join('')}
        </div>

        <h2 class="section-title">🎯 სქემის გამოწვევები</h2>
        <div class="challenge-grid">
          ${CZ.CHALLENGES.map((c) => `
            <div class="card challenge-card">
              <div class="challenge-head"><b>${(progress['circuit:' + c.key] || {}).passed ? '✅ ' : ''}${c.icon} ${U.esc(c.title)}</b><span class="badge">${c.level}</span></div>
              <p class="small">${U.esc(c.text)}</p>
              <button class="btn btn-primary btn-sm" data-ch="${c.key}">დაწყება →</button>
            </div>`).join('')}
        </div>
      </div>`;

    const create = (name, src, extra = {}) => {
      const d = api.saveDesignSync({ ownerId: user.id, name, parts: clone(src.parts), wires: clone(src.wires), code: src.code || '', ...extra });
      VL.router.go('circuit', { designId: d.id });
    };
    U.on(view, 'click', '[data-act="new"]', () => create('ახალი სქემა ' + (designs.length + 1), { parts: [], wires: [], code: '' }));
    U.on(view, 'click', '[data-tpl]', (e, el) => { const t = CZ.TEMPLATES.find((x) => x.key === el.dataset.tpl); create(t.name, t); });
    U.on(view, 'click', '[data-ch]', (e, el) => {
      const c = CZ.getChallenge(el.dataset.ch);
      const ex = api.findDesignSync(user.id, 'ch:' + c.key);
      if (ex) return VL.router.go('circuit', { designId: ex.id });
      create('გამოწვევა: ' + c.title, c.start, { key: 'ch:' + c.key, challenge: c.key });
    });
    U.on(view, 'click', '[data-open]', (e, el) => { if (e.target.closest('button')) return; VL.router.go('circuit', { designId: el.dataset.open }); });
    U.on(view, 'click', '[data-dup]', (e, el) => { const d = api.getDesignSync(el.dataset.dup); delete d.id; delete d.key; d.name += ' (ასლი)'; api.saveDesignSync(d); VL.router.render(); });
    U.on(view, 'click', '[data-del]', async (e, el) => { if (await U.confirm('წაიშალოს სქემა?', { danger: true, okLabel: 'წაშლა' })) { await api.deleteDesign(el.dataset.del); VL.router.render(); } });
    U.on(view, 'click', '[data-rename]', (e, el) => {
      const d = api.getDesignSync(el.dataset.rename);
      U.modal({ title: 'სახელის შეცვლა', html: `<form class="form" id="rn"><label class="field"><span>სახელი</span><input name="n" value="${U.esc(d.name)}"></label></form>`,
        actions: [{ label: 'გაუქმება', cls: 'btn-ghost' }, { label: 'შენახვა', cls: 'btn-primary', onClick: (m) => { d.name = m.querySelector('[name=n]').value.trim() || d.name; api.saveDesignSync(d); VL.router.render(); } }] });
    });
  }

  /* ============================================================
   * რედაქტორი
   * ============================================================ */
  async function editor(view, params, user) {
    let assignment = null, submission = null, design, challenge = null, readOnly = false;
    if (params.assignmentId) {
      assignment = await api.getAssignment(params.assignmentId);
      challenge = CZ.getChallenge(assignment.exerciseKey.replace('circuit:', ''));
      if (!challenge) throw new Error('გამოწვევა ვერ მოიძებნა');
      if (user.role === 'student') {
        submission = (await api.listSubmissions({ assignmentId: assignment.id, studentId: user.id }))[0] || null;
        design = api.findDesignSync(user.id, 'asg:' + assignment.id) || api.saveDesignSync({ ownerId: user.id, key: 'asg:' + assignment.id, hidden: true, name: assignment.title, ...clone(challenge.start) });
      } else design = { id: null, name: assignment.title + ' (გადახედვა)', ...clone(challenge.start) };
    } else {
      design = api.getDesignSync(params.designId);
      if (!design) { VL.router.go('circuit', {}); return; }
      if (design.ownerId !== user.id && user.role === 'student') throw new Error('ეს სქემა სხვას ეკუთვნის');
      if (design.challenge) challenge = CZ.getChallenge(design.challenge);
    }
    design.parts = design.parts || []; design.wires = design.wires || []; design.code = design.code || '';
    const canSubmit = assignment && user.role === 'student' && assignment.state !== 'closed';

    view.innerHTML = `
      <div class="cz">
        <div class="cz-top">
          <button class="icon-btn" data-act="back" title="ჩემი სქემები">←</button>
          <input class="cz-name" value="${U.esc(design.name)}" aria-label="სქემის სახელი" ${assignment ? 'readonly' : ''}>
          <div class="cz-tools">
            <button class="tool" data-act="undo" title="გაუქმება (Ctrl+Z)">↶</button>
            <button class="tool" data-act="redo" title="აღდგენა (Ctrl+Y)">↷</button>
            <button class="tool" data-act="rotate" title="შემობრუნება (R)">⟳</button>
            <button class="tool" data-act="delete" title="წაშლა (Delete)">🗑</button>
            <span class="tool-sep"></span>
            <span class="wire-colors" title="სადენის ფერი">${CZ.WIRE_COLORS.map(([c, n], i) => `<button class="wc ${i === 0 ? 'active' : ''}" data-wc="${c}" style="background:${c}" title="${n}"></button>`).join('')}</span>
            <span class="tool-sep"></span>
            <button class="tool" data-act="zoomout" title="დაშორება">−</button>
            <button class="tool" data-act="zoomin" title="მიახლოება">＋</button>
            <button class="tool" data-act="fit" title="მთლიანი სქემა">⤢</button>
          </div>
          <span class="spacer"></span>
          <span class="cz-clock muted small" id="cz-clock"></span>
          <button class="tool" data-act="sound" id="cz-sound" title="ხმა">🔇</button>
          <button class="btn btn-run" data-act="sim" id="cz-run">▶ სიმულაციის დაწყება</button>
        </div>
        ${assignment || challenge ? `<div class="cz-banner"><span class="badge badge-tech">${assignment ? 'დავალება' : 'გამოწვევა'}</span> <b>${U.esc(assignment ? assignment.title : challenge.title)}</b>
          ${assignment ? `<span class="muted small">· ვადა: ${U.fmtDate(assignment.dueDate)}</span> <span class="state state-${assignment.state}">${{ active: 'აქტიური', overdue: 'ვადაგასული', closed: 'დახურული' }[assignment.state]}</span>` : ''}
          <span class="sub-info muted small">${submission ? `📨 გაგზავნილია (${submission.attempts}×) · ${submission.score}%` : ''}</span>
          <button class="btn btn-ghost btn-sm" data-tab-open="task">🎯 პირობა</button></div>` : ''}
        <div class="cz-main">
          <div class="cz-stage"><div class="cz-host" id="cz-host"></div>
            <div class="cz-empty" id="cz-empty" hidden>🧩 დაამატე კომპონენტები მარჯვენა პანელიდან — გადმოათრიე ან დააჭირე.<br><small>ფეხზე დაჭერით იწყება სადენი · გადაადგილება: ცარიელ ადგილზე გადათრევა · მასშტაბი: ბორბალი ან ორი თითი</small></div>
          </div>
          <aside class="cz-side">
            <div class="cz-tabs">
              <button class="cz-tab active" data-tab="parts">🧩 <span>კომპონენტები</span></button>
              <button class="cz-tab" data-tab="props">⚙️ <span>თვისებები</span></button>
              <button class="cz-tab" data-tab="code">💻 <span>კოდი</span></button>
              <button class="cz-tab" data-tab="monitor">📟 <span>მონიტორი</span></button>
              ${challenge ? '<button class="cz-tab" data-tab="task">🎯 <span>დავალება</span></button>' : ''}
            </div>
            <div class="cz-panel active" data-panel="parts">
              <input class="cz-search" placeholder="🔍 კომპონენტის ძებნა" aria-label="ძებნა">
              ${CZ.CATS.map(([cat, title]) => `<div class="pal-cat" data-cat="${cat}"><h4>${title}</h4><div class="pal-grid">
                ${Object.values(P).filter((d) => d.cat === cat).map((d) => `<button class="pal-item" data-type="${d.type}" title="${U.esc(d.desc)}"><span class="pal-ico">${CZ.staticSvg({ parts: [{ id: 'x', type: d.type, x: 0, y: 0, rot: 0, props: d.props || {} }], wires: [] }, 'pal-svg')}</span><span>${U.esc(d.name)}</span></button>`).join('')}
              </div></div>`).join('')}
              <p class="muted small">💡 გადმოათრიე კომპონენტი ტილოზე ან უბრალოდ დააჭირე. Breadboard-ის ხვრელებში ჩასმული ფეხები ავტომატურად უერთდება შესაბამის ზოლს.</p>
            </div>
            <div class="cz-panel" data-panel="props"><div id="cz-inspector"></div></div>
            <div class="cz-panel" data-panel="code">
              <div class="editor cz-code"><pre class="gutter" aria-hidden="true"></pre><textarea id="cz-code" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Arduino კოდი"></textarea></div>
              <div id="cz-issues" class="issues"></div>
              <p class="muted small">C++/Arduino. პინები შეესაბამება Arduino-ზე შეერთებულ სადენებს. ${design.parts.some((p) => p.type === 'arduino') ? '' : 'კოდისთვის საჭიროა Arduino Uno კომპონენტი.'}</p>
            </div>
            <div class="cz-panel" data-panel="monitor">
              <div class="monitor-head"><h3>📟 სერიული მონიტორი</h3><button class="btn btn-ghost btn-sm" data-act="clear-serial">გასუფთავება</button></div>
              <pre id="cz-serial" class="serial"></pre>
              <h3>💡 სქემის შემოწმება და მინიშნებები</h3>
              <ul id="cz-hints" class="hints"><li class="muted">გაუშვი სიმულაცია — აქ გამოჩნდება გაფრთხილებები (დამწვარი LED, მოკლე ჩართვა, „ჰაერში“ დარჩენილი პინი…).</li></ul>
            </div>
            ${challenge ? `<div class="cz-panel" data-panel="task">
              <h3>${challenge.icon} ${U.esc(challenge.title)}</h3>
              ${assignment && assignment.instructions ? `<p>${U.esc(assignment.instructions)}</p>` : ''}
              <p class="small">${U.esc(challenge.text)}</p>
              ${submission && submission.feedback ? `<div class="feedback-box">💬 მასწავლებელი: ${U.esc(submission.feedback)}</div>` : ''}
              <div class="btn-row"><button class="btn btn-primary" data-act="check">🧪 შემოწმება</button>
              ${canSubmit ? '<button class="btn btn-success" data-act="submit">📨 გაგზავნა</button>' : ''}</div>
              <div id="cz-check"></div>
            </div>` : ''}
          </aside>
        </div>
      </div>`;
    document.body.classList.add('cz-mode');
    const $ = (s) => view.querySelector(s);

    /* ---- მოდელი და ტილო ---- */
    const circuit = new CZ.Circuit(design);
    const save = U.debounce(() => { if (design.id) { const s = api.saveDesignSync(design); design.updatedAt = s.updatedAt; } }, 500);
    const ed = CZ.Editor($('#cz-host'), design, {
      circuit,
      onChange: () => { save(); refreshEmpty(); if (selKind() === 'part') renderInspector(); },
      onSelect: (sel, source) => { renderInspector(); if (sel && sel.kind === 'part' && source === 'user' && window.matchMedia('(min-width: 900px)').matches) switchTab('props'); },
    });
    const selKind = () => (ed && ed.selected() ? ed.selected().kind : null);
    const refreshEmpty = () => { $('#cz-empty').hidden = design.parts.length > 0; };
    refreshEmpty();

    /* ---- ჩანართები ---- */
    function switchTab(name) {
      view.querySelectorAll('.cz-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
      view.querySelectorAll('.cz-panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === name));
    }
    U.on(view, 'click', '[data-tab]', (e, b) => switchTab(b.dataset.tab));
    U.on(view, 'click', '[data-tab-open]', (e, b) => switchTab(b.dataset.tabOpen));

    /* ---- კომპონენტების პალიტრა (გადათრევა / დაჭერა) ---- */
    let ghost = null, palDrag = null;
    U.on(view, 'pointerdown', '.pal-item', (e, b) => {
      if (running) { U.toast('ჯერ შეაჩერე სიმულაცია', 'info'); return; }
      palDrag = { type: b.dataset.type, x: e.clientX, y: e.clientY, moved: false };
      e.preventDefault();
    });
    const palMove = (e) => {
      if (!palDrag) return;
      if (!palDrag.moved && Math.hypot(e.clientX - palDrag.x, e.clientY - palDrag.y) > 8) {
        palDrag.moved = true;
        ghost = document.createElement('div'); ghost.className = 'pal-ghost'; ghost.innerHTML = CZ.staticSvg({ parts: [{ id: 'g', type: palDrag.type, x: 0, y: 0, rot: 0, props: P[palDrag.type].props || {} }], wires: [] }, 'pal-svg');
        document.body.appendChild(ghost);
      }
      if (ghost) { ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px'; }
    };
    const palUp = (e) => {
      if (!palDrag) return;
      const pd = palDrag; palDrag = null;
      if (ghost) { ghost.remove(); ghost = null; }
      if (!pd.moved) { ed.addPartAtCenter(pd.type); if (!window.matchMedia('(min-width: 900px)').matches) U.toast(P[pd.type].name + ' დაემატა', 'success', 1200); return; }
      const stage = $('.cz-stage').getBoundingClientRect();
      if (e.clientX >= stage.left && e.clientX <= stage.right && e.clientY >= stage.top && e.clientY <= stage.bottom) {
        const [wx, wy] = ed.toWorld(e.clientX, e.clientY); const [bx, by, bw, bh] = P[pd.type].box;
        ed.addPart(pd.type, wx - bx - bw / 2, wy - by - bh / 2);
      }
    };
    window.addEventListener('pointermove', palMove);
    window.addEventListener('pointerup', palUp);
    $('.cz-search').addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      view.querySelectorAll('.pal-item').forEach((b) => { b.hidden = q && !(P[b.dataset.type].name.toLowerCase().includes(q) || b.dataset.type.includes(q)); });
    });

    /* ---- თვისებების პანელი ---- */
    function renderInspector() {
      const box = $('#cz-inspector'); const s = ed ? ed.selected() : null;
      if (!s) {
        box.innerHTML = `<h3>⚙️ თვისებები</h3><p class="muted small">მონიშნე კომპონენტი ან სადენი.</p>
          <ul class="tips">
            <li>🧩 კომპონენტის დამატება — „კომპონენტები“ ჩანართიდან</li>
            <li>🔗 სადენი — დააჭირე ფეხს (ან breadboard-ის ხვრელს), შემდეგ მეორეს</li>
            <li>📐 მოხრის წერტილი — სადენის გაყვანისას ცარიელ ადგილზე დაჭერა</li>
            <li>⟳ შემობრუნება — R, 🗑 წაშლა — Delete, ↶ გაუქმება — Ctrl+Z</li>
            <li>▶ სიმულაციისას დააჭირე ღილაკს/გადამრთველს სქემაზე</li>
          </ul>`;
        return;
      }
      if (s.kind === 'wire') {
        const w = design.wires.find((x) => x.id === s.id); if (!w) { box.innerHTML = ''; return; }
        box.innerHTML = `<h3>🔗 სადენი</h3><p class="small muted">${U.esc(w.a)} → ${U.esc(w.b)}</p>
          <div class="field"><span>ფერი</span><div class="wire-colors big">${CZ.WIRE_COLORS.map(([c, n]) => `<button class="wc ${w.color === c ? 'active' : ''}" data-wc="${c}" style="background:${c}" title="${n}"></button>`).join('')}</div></div>
          <div class="btn-row"><button class="btn btn-ghost btn-sm" data-act="clear-bends">მოხრების მოშორება</button><button class="btn btn-danger btn-sm" data-act="delete">🗑 წაშლა</button></div>`;
        return;
      }
      const part = design.parts.find((x) => x.id === s.id); if (!part) { box.innerHTML = ''; return; }
      const d = P[part.type], inp = circuit.inputs[part.id] || {};
      box.innerHTML = `
        <div class="insp-head"><span class="insp-ico">${CZ.staticSvg({ parts: [{ ...part, x: 0, y: 0, rot: 0 }], wires: [] }, 'pal-svg')}</span><div><h3>${U.esc(d.name)}</h3><p class="small muted">${U.esc(d.desc)}</p></div></div>
        <label class="field"><span>სახელი</span><input data-pname value="${U.esc(part.name || part.id)}"></label>
        ${(d.propDefs || []).map((pd) => `<label class="field"><span>${U.esc(pd.label)}</span><select data-prop="${pd.key}">${pd.options.map(([v, l]) => `<option value="${v}" ${String(part.props[pd.key]) === String(v) ? 'selected' : ''}>${U.esc(l)}</option>`).join('')}</select></label>`).join('')}
        ${d.interactive === 'toggle' ? `<label class="setting"><div><b>ჩართულია</b></div><label class="switch"><input type="checkbox" data-toggle ${part.props.on ? 'checked' : ''}><span></span></label></label>` : ''}
        ${d.interactive === 'press' ? '<button class="btn btn-press" data-press>🔘 დააჭირე და გეჭიროს</button>' : ''}
        ${(d.controls || []).map((c) => `<label class="slider-field"><span>${U.esc(c.label)} <b data-cval="${c.key}">${c.fmt(inp[c.key] ?? c.def)}</b></span><input type="range" data-ctrl="${c.key}" min="${c.min}" max="${c.max}" step="${c.step}" value="${inp[c.key] ?? c.def}"></label>`).join('')}
        <div class="insp-live" id="cz-live"></div>
        ${d.pins.length ? `<details class="pins"><summary>ფეხები (${d.pins.length})</summary><ul>${d.pins.map((pn) => `<li><code>${pn.id}</code> ${U.esc(pn.label)} ${circuit.netDirty ? '' : (circuit.isConnected && circuit.isConnected(part.id, pn.id) ? '✔' : '<span class="muted">— თავისუფალი</span>')}</li>`).join('')}</ul></details>` : ''}
        <div class="btn-row"><button class="btn btn-ghost btn-sm" data-act="rotate">⟳ შემობრუნება</button><button class="btn btn-danger btn-sm" data-act="delete">🗑 წაშლა</button></div>`;
      const pb = box.querySelector('[data-press]');
      if (pb) {
        const set = (v) => { circuit.setInput(part.id, 'pressed', v); pb.classList.toggle('pressed', v); ed.updateDynamic(); };
        pb.addEventListener('pointerdown', (e) => { e.preventDefault(); set(true); });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => pb.addEventListener(ev, () => set(false)));
      }
    }
    U.on(view, 'input', '[data-pname]', (e, el) => { const part = design.parts.find((x) => x.id === ed.selected().id); part.name = el.value; save(); ed.renderAll(); });
    U.on(view, 'change', '[data-prop]', (e, el) => {
      const part = design.parts.find((x) => x.id === ed.selected().id);
      const v = el.value; part.props[el.dataset.prop] = isNaN(Number(v)) ? v : Number(v);
      circuit.changed(); ed.renderAll(); save();
    });
    U.on(view, 'change', '[data-toggle]', (e, el) => { const part = design.parts.find((x) => x.id === ed.selected().id); part.props.on = el.checked; circuit.changed(); ed.renderAll(); save(); });
    U.on(view, 'input', '[data-ctrl]', (e, el) => {
      const part = design.parts.find((x) => x.id === ed.selected().id); const c = P[part.type].controls.find((x) => x.key === el.dataset.ctrl);
      circuit.setInput(part.id, c.key, Number(el.value)); view.querySelector(`[data-cval="${c.key}"]`).textContent = c.fmt(Number(el.value)); ed.updateDynamic();
    });
    renderInspector();

    /* ---- კოდი ---- */
    const ta = $('#cz-code'), gutter = view.querySelector('.cz-code .gutter');
    ta.value = design.code;
    const updGutter = () => { const n = ta.value.split('\n').length; let s = ''; for (let i = 1; i <= n; i++) s += i + '\n'; gutter.textContent = s; gutter.scrollTop = ta.scrollTop; };
    ta.addEventListener('input', () => { design.code = ta.value; updGutter(); save(); });
    ta.addEventListener('scroll', () => { gutter.scrollTop = ta.scrollTop; });
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s + 2; ta.dispatchEvent(new Event('input')); }
    });
    updGutter();

    /* ---- სიმულაცია ---- */
    let running = false, sim = null, raf = 0, last = 0, target = 0, hintT = 0, serialOff = 0, shownLen = -1;
    let audio = null, osc = null, gain = null, soundOn = false;
    const runBtn = $('#cz-run');
    function setRunUI() {
      runBtn.textContent = running ? '⏹ სიმულაციის შეჩერება' : '▶ სიმულაციის დაწყება';
      runBtn.classList.toggle('btn-danger', running); runBtn.classList.toggle('btn-run', !running);
      view.querySelector('.cz').classList.toggle('is-running', running);
    }
    function start() {
      ed.cancelWire();
      const hasArd = design.parts.some((p) => p.type === 'arduino');
      circuit.reset(); circuit.changed();
      sim = null;
      if (hasArd) {
        sim = new T.Sim();
        const comp = sim.compile(design.code || 'void setup(){}\nvoid loop(){}');
        $('#cz-issues').innerHTML = comp.issues.map((i) => `<div class="issue issue-${i.level}">${i.level === 'error' ? '⛔' : '⚠️'} ${U.esc(i.msg)}</div>`).join('');
        if (!comp.ok) { switchTab('code'); U.toast('კოდში შეცდომაა', 'error'); return; }
        circuit.attach(sim);
        if (!sim.start()) { U.toast(sim.error, 'error'); return; }
      } else circuit.attach(null);
      circuit.running = true; running = true; target = 0; last = performance.now(); serialOff = 0; shownLen = -1;
      circuit.solve();
      ed.setRunning(true); setRunUI(); renderHints();
    }
    function stop() {
      running = false; circuit.running = false; circuit.res = {};
      if (sim) sim.resetState();
      ed.setRunning(false); setRunUI(); setSound(0);
      $('#cz-clock').textContent = '';
    }
    function renderSerial() {
      const el = $('#cz-serial'); const txt = sim ? sim.serial.slice(serialOff) : '';
      if (txt.length === shownLen) return; shownLen = txt.length;
      const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
      el.textContent = txt.slice(-6000); if (bottom) el.scrollTop = el.scrollHeight;
    }
    function renderHints() {
      const items = [];
      if (sim && sim.error) items.push(['error', '⛔ ' + sim.error]);
      (circuit.sticky || circuit.warnings).forEach((m) => items.push([/⛔|💥/.test(m) ? 'error' : 'warn', m]));
      if (sim) sim.warnings.forEach((m) => { if (!/არაფერია მიერთებული/.test(m)) items.push(['warn', '🔧 ' + m]); });
      // სტრუქტურული შემოწმება: თავისუფალი ფეხები
      if (running) {
        const loose = [];
        design.parts.forEach((p) => {
          if (['arduino', 'breadboard'].includes(p.type)) return;
          const free = P[p.type].pins.filter((pn) => !circuit.isConnected(p.id, pn.id));
          if (free.length && free.length === P[p.type].pins.length) loose.push(p.name || p.id);
        });
        if (loose.length) items.push(['info', `🔌 შეუერთებელი კომპონენტები: ${loose.join(', ')}`]);
      }
      $('#cz-hints').innerHTML = items.length ? items.map(([c, t]) => `<li class="hint-${c}">${U.esc(t)}</li>`).join('') : `<li class="muted">${running ? '👍 პრობლემები არ არის აღმოჩენილი.' : 'გაუშვი სიმულაცია.'}</li>`;
      const tab = view.querySelector('.cz-tab[data-tab="monitor"]');
      if (tab) tab.classList.toggle('alert', items.some(([c]) => c === 'error'));
    }
    function setSound(freq) {
      if (!soundOn || !audio) return;
      if (freq > 0) { osc.frequency.setTargetAtTime(freq, audio.currentTime, 0.005); gain.gain.setTargetAtTime(0.06, audio.currentTime, 0.01); }
      else gain.gain.setTargetAtTime(0, audio.currentTime, 0.01);
    }
    function frame(ts) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(100, ts - (last || ts)); last = ts;
      if (!running) return;
      if (sim) {
        target += dt; if (target - sim.vtime > 250) target = sim.vtime + 250;
        const before = sim.serial.length;
        sim.runUntil(target, 120000);
        sim._tx = sim.serial.length !== before;
        if (sim.error) { renderHints(); U.toast('შესრულების შეცდომა', 'error'); stop(); return; }
        $('#cz-clock').textContent = `⏱ ${(sim.vtime / 1000).toFixed(1)} წმ`;
      }
      circuit.now = sim ? sim.vtime / 1000 : (circuit.now || 0) + dt / 1000;
      circuit.dirty = true; circuit.solve();
      ed.updateDynamic(); renderSerial();
      const bz = design.parts.find((p) => p.type === 'buzzer' && (circuit.res[p.id] || {}).on);
      setSound(bz ? circuit.res[bz.id].freq : 0);
      if (ts - hintT > 500) {
        hintT = ts; renderHints();
        const live = $('#cz-live'); const s = ed.selected();
        if (live && s && s.kind === 'part') live.textContent = '📈 ' + circuit.describe(s.id);
      }
    }
    raf = requestAnimationFrame(frame);

    /* ---- შემოწმება / გაგზავნა ---- */
    function runCheck() {
      const r = CZ.runHeadless(design, challenge.test);
      $('#cz-check').innerHTML = T.renderChecks(r) + (r.warnings && r.warnings.length ? `<ul class="hints" style="margin-top:8px">${r.warnings.map((w) => `<li class="hint-warn">${U.esc(w)}</li>`).join('')}</ul>` : '');
      if (r.passed && !assignment) api.saveProgress(user.id, 'circuit:' + challenge.key, true);
      return r;
    }

    /* ---- ღილაკები ---- */
    U.on(view, 'click', '[data-act]', async (e, b) => {
      const a = b.dataset.act;
      if (a === 'back') { if (assignment) history.length > 1 ? history.back() : VL.router.go('home'); else VL.router.go('circuit', {}); }
      else if (a === 'undo') ed.undo();
      else if (a === 'redo') ed.redo();
      else if (a === 'rotate') ed.rotateSelected();
      else if (a === 'delete') ed.deleteSelected();
      else if (a === 'zoomin') ed.zoomBy(1.2);
      else if (a === 'zoomout') ed.zoomBy(1 / 1.2);
      else if (a === 'fit') ed.fit();
      else if (a === 'sim') running ? stop() : start();
      else if (a === 'clear-serial') { serialOff = sim ? sim.serial.length : 0; shownLen = -1; renderSerial(); }
      else if (a === 'clear-bends') { const w = design.wires.find((x) => x.id === ed.selected().id); if (w) { w.pts = []; ed.renderAll(); save(); } }
      else if (a === 'sound') {
        soundOn = !soundOn; b.textContent = soundOn ? '🔊' : '🔇';
        try {
          if (soundOn && !audio) { audio = new (window.AudioContext || window.webkitAudioContext)(); osc = audio.createOscillator(); gain = audio.createGain(); osc.type = 'square'; gain.gain.value = 0; osc.connect(gain).connect(audio.destination); osc.start(); }
          if (!soundOn && gain) gain.gain.value = 0;
          if (audio && audio.state === 'suspended') audio.resume();
        } catch (err) { U.toast('ხმა მიუწვდომელია', 'error'); }
      }
      else if (a === 'check') runCheck();
      else if (a === 'submit') {
        const r = runCheck();
        try {
          const s = await api.submit({ assignmentId: assignment.id, studentId: user.id, passed: r.passed, score: r.score,
            message: r.passed ? 'სქემა და კოდი სწორად მუშაობს' : r.checks.filter((c) => !c.ok).map((c) => c.label).join('; '),
            payload: { code: design.code, design: { parts: design.parts, wires: design.wires }, checks: r.checks.map((c) => ({ label: c.label, ok: c.ok })) } });
          U.toast(r.passed ? `გაიგზავნა ✅ (${s.score}%)` : `გაიგზავნა (${s.score}%) — შეგიძლია გააუმჯობესო`, r.passed ? 'success' : 'info', 4000);
          const si = view.querySelector('.sub-info'); if (si) si.textContent = `📨 გაგზავნილია (${s.attempts}×) · ${s.score}%`;
        } catch (err) { U.toast(err.message, 'error'); }
      }
    });
    U.on(view, 'click', '[data-wc]', (e, b) => {
      view.querySelectorAll('.cz-top .wc').forEach((x) => x.classList.toggle('active', x.dataset.wc === b.dataset.wc));
      ed.setWireColor(b.dataset.wc); if (selKind() === 'wire') renderInspector();
    });
    $('.cz-name').addEventListener('input', (e) => { design.name = e.target.value || 'უსახელო სქემა'; save(); });

    return () => {
      cancelAnimationFrame(raf); ed.destroy(); document.body.classList.remove('cz-mode');
      window.removeEventListener('pointermove', palMove); window.removeEventListener('pointerup', palUp);
      if (audio) try { audio.close(); } catch (e) { /* */ }
      if (design.id && !readOnly) api.saveDesignSync(design);
    };
  }

  CZ.renderPage = async function (view, params, user) {
    const st = api.getSettingsSync();
    if (st.modules.circuit === false && user.role !== 'admin') { view.innerHTML = `<div class="page">${U.empty('სქემის კონსტრუქტორი დროებით გამორთულია.', '🔌')}</div>`; return; }
    if (params.designId || params.assignmentId) return editor(view, params, user);
    return dashboard(view, user);
  };
})(window.VL);
