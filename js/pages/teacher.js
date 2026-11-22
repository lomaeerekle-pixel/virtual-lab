/* ============================================================
 * pages/teacher.js — მასწავლებლის პანელი, კლასის გვერდი,
 * დავალების გვერდი და ნამუშევრების შეფასება
 * (კლასისა და დავალების გვერდებს ადმინიც ხედავს)
 * ============================================================ */
(function (VL) {
  'use strict';
  const U = VL.U, api = VL.api;
  const P = VL.pages = VL.pages || {};
  const STATE_LABEL = { active: 'აქტიური', overdue: 'ვადაგასული', closed: 'დახურული' };

  /* ---------- კლასის შექმნა / რედაქტირება ---------- */
  P.classForm = (user, existing, onDone) => {
    U.modal({
      title: existing ? 'კლასის რედაქტირება' : 'ახალი კლასი',
      html: `<form class="form" id="cf">
        <label class="field"><span>კლასის სახელი</span><input name="name" required value="${U.esc(existing ? existing.name : '')}" placeholder="მაგ.: VIII-ა — ფიზიკა"></label>
        <label class="field"><span>საგანი</span><input name="subject" value="${U.esc(existing ? existing.subject : '')}" placeholder="მაგ.: ფიზიკა / ტექნოლოგიები"></label>
      </form>`,
      actions: [
        { label: 'გაუქმება', cls: 'btn-ghost' },
        { label: existing ? 'შენახვა' : 'შექმნა', cls: 'btn-primary', onClick: async (el) => {
          const d = U.formData(el.querySelector('#cf'));
          const c = existing ? await api.updateClass(existing.id, d) : await api.createClass({ ...d, teacherId: user.id });
          U.toast(existing ? 'შენახულია' : `კლასი შეიქმნა · კოდი: ${c.code}`, 'success');
          onDone && onDone(c);
        } },
      ],
    });
  };

  /* ---------- დავალების შექმნა / რედაქტირება ---------- */
  P.assignmentForm = ({ user, classes, classId, existing, onDone }) => {
    const cat = VL.catalog.list();
    const groups = [...new Set(cat.map((c) => c.group))];
    const ex = existing || {};
    const curKey = existing ? existing.lab + '|' + existing.exerciseKey : '';
    U.modal({
      title: existing ? 'დავალების რედაქტირება' : 'ახალი დავალება', wide: true,
      html: `<form class="form" id="af">
        <div class="form-row">
          <label class="field"><span>კლასი</span><select name="classId" ${existing ? 'disabled' : ''} required>${classes.map((c) => `<option value="${c.id}" ${(ex.classId || classId) === c.id ? 'selected' : ''}>${U.esc(c.name)}</option>`).join('')}</select></label>
          <label class="field"><span>ვადა</span><input type="date" name="dueDate" value="${ex.dueDate || ''}" min="${existing ? '' : U.todayISO()}"></label>
        </div>
        <label class="field"><span>ლაბორატორია და სავარჯიშო</span>
          <select name="exercise" required ${existing ? 'disabled' : ''}>
            <option value="">— აირჩიე სავარჯიშო —</option>
            ${groups.map((g) => `<optgroup label="${U.esc(g)}">${cat.filter((c) => c.group === g).map((c) => `<option value="${c.lab}|${c.key}" ${curKey === c.lab + '|' + c.key ? 'selected' : ''}>${U.esc(c.title)}${c.kind && c.kind !== 'state' ? ' 💻' : ''}</option>`).join('')}</optgroup>`).join('')}
          </select>
        </label>
        <div id="ex-preview" class="ex-preview"></div>
        <div id="param-fields" class="form-row wrap"></div>
        <label class="field"><span>სათაური</span><input name="title" required value="${U.esc(ex.title || '')}"></label>
        <label class="field"><span>ინსტრუქცია მოსწავლეებისთვის</span><textarea name="instructions" rows="4">${U.esc(ex.instructions || '')}</textarea></label>
      </form>`,
      onMount(el) {
        const form = el.querySelector('#af');
        let titleDirty = !!existing, instrDirty = !!existing;
        form.title.addEventListener('input', () => { titleDirty = true; });
        form.instructions.addEventListener('input', () => { instrDirty = true; });
        const getItem = () => { const [lab, key] = (form.exercise.value || '|').split('|'); return VL.catalog.get(lab, key); };
        const readParams = (item) => {
          const p = {};
          item.params.forEach((q) => { const v = form.querySelector(`[name="p_${q.key}"]`).value; p[q.key] = q.type === 'text' ? v : Number(v); });
          return p;
        };
        const preview = () => {
          const item = getItem();
          if (!item) { el.querySelector('#ex-preview').innerHTML = ''; return; }
          const p = readParams(item);
          el.querySelector('#ex-preview').innerHTML = `<span class="badge badge-${item.lab}">${U.labLabel(item.lab)}</span> ${U.esc(item.text(p))}`;
          if (!titleDirty) form.title.value = item.title.replace(/^\S+\s/, '');
          if (!instrDirty) form.instructions.value = item.text(p);
        };
        const renderParams = () => {
          const item = getItem(); const box = el.querySelector('#param-fields');
          if (!item) { box.innerHTML = ''; return; }
          box.innerHTML = item.params.map((q) => {
            const val = existing && existing.params && existing.params[q.key] !== undefined ? existing.params[q.key] : q.value;
            return `<label class="field"><span>🎯 ${U.esc(q.label)}</span><input name="p_${q.key}" ${q.type === 'text' ? '' : 'type="number" step="any"'} value="${U.esc(val)}"></label>`;
          }).join('') || '<p class="muted small">ამ სავარჯიშოს დამატებითი პარამეტრები არ აქვს.</p>';
          preview();
        };
        form.exercise.addEventListener('change', () => { titleDirty = !!existing && titleDirty; renderParams(); });
        el.querySelector('#param-fields').addEventListener('input', preview);
        renderParams();
        el._readParams = () => { const item = getItem(); return item ? { item, params: readParams(item) } : null; };
      },
      actions: [
        { label: 'გაუქმება', cls: 'btn-ghost' },
        { label: existing ? 'შენახვა' : 'დავალების მიცემა', cls: 'btn-primary', onClick: async (el) => {
          const form = el.querySelector('#af'); const d = U.formData(form); const r = el._readParams();
          if (!r) throw new Error('აირჩიე სავარჯიშო');
          let a;
          if (existing) a = await api.updateAssignment(existing.id, { title: d.title, instructions: d.instructions, dueDate: d.dueDate || null, params: r.params });
          else a = await api.createAssignment({ classId: form.classId.value, teacherId: user.role === 'teacher' ? user.id : undefined, lab: r.item.lab, exerciseKey: r.item.key, params: r.params, title: d.title, instructions: d.instructions, dueDate: d.dueDate || null });
          U.toast(existing ? 'დავალება განახლდა' : 'დავალება გაიცა ✅', 'success');
          onDone && onDone(a);
        } },
      ],
    });
  };

  /* ---------- ნამუშევრის ნახვა / შეფასება ---------- */
  P.submissionModal = (sub, asg, onDone) => {
    const pl = sub.payload || {};
    const values = pl.values ? Object.entries(pl.values).map(([k, v]) => `<span class="pill">${U.esc(k)} = ${U.esc(typeof v === 'number' ? +v.toFixed(3) : v)}</span>`).join(' ') : '';
    U.modal({
      title: `${sub.studentName} — ${asg.title}`, wide: true,
      html: `
        <div class="sub-summary">
          <span class="pill ${sub.passed ? 'pill-ok' : 'pill-warn'}">${sub.passed ? '✔ ჩაითვალა' : '✘ არ ჩაითვალა'}</span>
          <span class="pill">ავტო-ქულა: ${sub.score}%</span><span class="pill">მცდელობა: ${sub.attempts}</span>
          <span class="pill">${U.fmtDateTime(sub.submittedAt)}</span>${sub.late ? '<span class="pill pill-warn">⏰ დაგვიანებით</span>' : ''}
        </div>
        ${sub.message ? `<p><b>შედეგი:</b> ${U.esc(sub.message)}</p>` : ''}
        ${pl.checks ? `<ul class="check-list">${pl.checks.map((c) => `<li class="${c.ok ? 'ok' : 'bad'}"><span>${c.ok ? '✔' : '✘'}</span><div>${U.esc(c.label)}</div></li>`).join('')}</ul>` : ''}
        ${values ? `<h4>პარამეტრები</h4><div class="pill-wrap">${values}</div>` : ''}
        ${pl.placed && pl.placed.length ? `<h4>დასმული წერტილები</h4><p>${pl.placed.map(([x, y]) => `(${x}; ${y})`).join(', ')}</p>` : ''}
        ${pl.design ? `<h4>სქემა</h4><div class="sub-design">${VL.Circuit.staticSvg(pl.design, 'cz-thumb big')}</div>` : ''}
        ${pl.code ? `<h4>კოდი</h4><pre class="code-view">${U.esc(pl.code)}</pre>` : ''}
        ${pl.rule ? `<h4>კოდის ხიდის წესი</h4><pre class="code-view">${U.esc(pl.rule)}</pre>` : ''}
        <form class="form" id="rf">
          <div class="form-row">
            <label class="field"><span>ქულა (0–100, ცარიელი = ავტომატური)</span><input name="grade" type="number" min="0" max="100" value="${sub.grade ?? ''}"></label>
          </div>
          <label class="field"><span>კომენტარი მოსწავლისთვის</span><textarea name="feedback" rows="3">${U.esc(sub.feedback || '')}</textarea></label>
        </form>`,
      actions: [
        { label: 'დახურვა', cls: 'btn-ghost' },
        { label: 'შეფასების შენახვა', cls: 'btn-primary', onClick: async (el) => {
          const d = U.formData(el.querySelector('#rf'));
          await api.reviewSubmission(sub.id, { feedback: d.feedback, grade: d.grade });
          U.toast('შეფასება შენახულია', 'success'); onDone && onDone();
        } },
      ],
    });
  };

  /* ---------- მასწავლებლის მთავარი ---------- */
  P.teacher = async (view, params, user) => {
    const [classes, asgs, subs] = await Promise.all([api.listClasses({ teacherId: user.id }), api.listAssignments({ teacherId: user.id }), api.listSubmissions({ teacherId: user.id })]);
    const students = new Set(classes.flatMap((c) => c.studentIds));
    view.innerHTML = `
      <div class="page">
        <div class="page-head">
          <div><h1>მასწავლებლის პანელი</h1><p class="muted">${U.esc(user.name)} · კლასები, დავალებები, ნამუშევრები</p></div>
          <div class="btn-row">
            <button class="btn btn-ghost" data-act="new-class">＋ ახალი კლასი</button>
            <button class="btn btn-primary" data-act="new-asg" ${classes.length ? '' : 'disabled title="ჯერ შექმენი კლასი"'}>＋ ახალი დავალება</button>
          </div>
        </div>
        <div class="stats">
          <div class="stat"><span>🏫</span><b>${classes.length}</b><small>კლასი</small></div>
          <div class="stat"><span>🧑‍🎓</span><b>${students.size}</b><small>მოსწავლე</small></div>
          <div class="stat"><span>📝</span><b>${asgs.length}</b><small>დავალება</small></div>
          <div class="stat"><span>📨</span><b>${subs.length}</b><small>ნამუშევარი</small></div>
        </div>
        <section>
          <h2 class="section-title">🏫 ჩემი კლასები</h2>
          ${classes.length ? `<div class="class-grid">${classes.map((c) => {
            const ca = asgs.filter((a) => a.classId === c.id);
            return `<button class="class-card" data-class="${c.id}">
              <b>${U.esc(c.name)}</b><small class="muted">${U.esc(c.subject || '')}</small>
              <div class="class-meta"><span>🧑‍🎓 ${c.studentIds.length}</span><span>📝 ${ca.length}</span><span class="code-tag">🔑 ${c.code}</span></div>
            </button>`;
          }).join('')}</div>` : U.empty('ჯერ კლასი არ გაქვს — შექმენი პირველი!', '🏫')}
        </section>
        <div class="grid-2">
          <section class="card">
            <div class="card-head"><h2>📝 დავალებები</h2></div>
            ${asgs.length ? `<div class="asg-list">${asgs.map((a) => {
              const n = subs.filter((s) => s.assignmentId === a.id).length, cls = classes.find((c) => c.id === a.classId);
              return `<div class="asg-item"><div class="asg-item-main">
                <div class="asg-item-top"><span class="badge badge-${a.lab}">${U.labLabel(a.lab)}</span><span class="state state-${a.state}">${STATE_LABEL[a.state]}</span></div>
                <b>${U.esc(a.title)}</b><small class="muted">${U.esc(a.className)} · ვადა: ${U.fmtDate(a.dueDate)} · 📨 ${n}/${cls ? cls.studentIds.length : 0}</small>
              </div><button class="btn btn-ghost btn-sm" data-asg="${a.id}">დეტალები →</button></div>`;
            }).join('')}</div>` : U.empty('დავალებები ჯერ არ არის.')}
          </section>
          <section class="card">
            <div class="card-head"><h2>📨 ბოლო ნამუშევრები</h2></div>
            ${subs.length ? `<ul class="simple-list">${subs.slice(0, 8).map((s) => `<li class="clickable" data-sub="${s.id}"><div><b>${U.esc(s.studentName)}</b><small class="muted">${U.esc(s.assignmentTitle)} · ${U.fmtDateTime(s.submittedAt)}</small></div><span class="pill ${s.passed ? 'pill-ok' : 'pill-warn'}">${s.grade ?? s.score}%</span></li>`).join('')}</ul>` : U.empty('ნამუშევრები ჯერ არ შემოსულა.', '📭')}
          </section>
        </div>
      </div>`;
    U.on(view, 'click', '[data-act]', (e, b) => {
      if (b.dataset.act === 'new-class') P.classForm(user, null, (c) => VL.router.go('class', { classId: c.id }));
      if (b.dataset.act === 'new-asg') P.assignmentForm({ user, classes, onDone: () => VL.router.render() });
    });
    U.on(view, 'click', '[data-class]', (e, b) => VL.router.go('class', { classId: b.dataset.class }));
    U.on(view, 'click', '[data-asg]', (e, b) => VL.router.go('assignment', { assignmentId: b.dataset.asg }));
    U.on(view, 'click', '[data-sub]', async (e, b) => {
      const s = subs.find((x) => x.id === b.dataset.sub); const a = asgs.find((x) => x.id === s.assignmentId);
      P.submissionModal(s, a, () => VL.router.render());
    });
  };

  /* ---------- კლასის გვერდი ---------- */
  P.classPage = async (view, params, user) => {
    if (!params.classId) { VL.router.go('home'); return; }
    const c = await api.getClass(params.classId);
    if (user.role === 'teacher' && c.teacherId !== user.id) throw new Error('ეს კლასი სხვა მასწავლებელს ეკუთვნის');
    const [asgs, allStudents] = await Promise.all([api.listAssignments({ classId: c.id }), api.listUsers({ role: 'student' })]);
    const subsArr = await Promise.all(asgs.map((a) => api.listSubmissions({ assignmentId: a.id })));
    const subs = subsArr.flat();
    const enrolled = allStudents.filter((s) => c.studentIds.includes(s.id));
    const others = allStudents.filter((s) => !c.studentIds.includes(s.id));
    const tab = params.tab || 'students';
    const subOf = (aid, sid) => subs.find((s) => s.assignmentId === aid && s.studentId === sid);

    view.innerHTML = `
      <div class="page">
        <div class="page-head">
          <div>
            <a href="#home" class="back-link">← ${user.role === 'admin' ? 'ადმინ პანელი' : 'ჩემი კლასები'}</a>
            <h1>${U.esc(c.name)}</h1>
            <p class="muted">${U.esc(c.subject || '')} · 👩‍🏫 ${U.esc(c.teacherName)} · 🧑‍🎓 ${enrolled.length} მოსწავლე</p>
          </div>
          <div class="btn-row">
            <span class="code-big" title="მოსწავლეები ამ კოდით შეუერთდებიან">🔑 <b>${c.code}</b><button class="icon-btn" data-act="copy" aria-label="კოდის კოპირება">⧉</button></span>
            <button class="btn btn-ghost btn-sm" data-act="edit">✎ რედაქტირება</button>
            <button class="btn btn-ghost btn-sm" data-act="regen">↻ ახალი კოდი</button>
            <button class="btn btn-danger btn-sm" data-act="delete">🗑 წაშლა</button>
          </div>
        </div>
        <div class="tabs">
          ${[['students', '🧑‍🎓 მოსწავლეები'], ['assignments', '📝 დავალებები'], ['progress', '📊 პროგრესი']].map(([k, l]) => `<button class="tab ${tab === k ? 'active' : ''}" data-tab="${k}">${l}</button>`).join('')}
        </div>

        <div class="tab-body">
        ${tab === 'students' ? `
          <section class="card">
            <form id="add-form" class="inline-form">
              <select name="student" aria-label="მოსწავლის არჩევა"><option value="">— აირჩიე რეგისტრირებული მოსწავლე —</option>${others.map((s) => `<option value="${s.id}">${U.esc(s.name)} (${U.esc(s.email)})</option>`).join('')}</select>
              <span class="muted small">ან</span>
              <input name="email" type="email" placeholder="მოსწავლის ელ-ფოსტა" aria-label="ელ-ფოსტა">
              <button class="btn btn-primary" type="submit">＋ დამატება</button>
            </form>
            <p class="muted small">მოსწავლეებს შეუძლიათ თავად შეუერთდნენ კოდით <b>${c.code}</b> (რეგისტრაციისას ან პანელიდან).</p>
            ${enrolled.length ? `<div class="table-wrap"><table class="table">
              <thead><tr><th>მოსწავლე</th><th>ელ-ფოსტა</th><th>შესრულებული</th><th>საშ. ქულა</th><th></th></tr></thead>
              <tbody>${enrolled.map((s) => {
                const ss = subs.filter((x) => x.studentId === s.id);
                const avg = ss.length ? Math.round(ss.reduce((a, x) => a + (x.grade ?? x.score), 0) / ss.length) : null;
                return `<tr><td><b>${U.esc(s.name)}</b></td><td class="muted">${U.esc(s.email)}</td><td>${ss.filter((x) => x.passed).length}/${asgs.length}</td><td>${avg === null ? '—' : avg + '%'}</td>
                  <td class="right"><button class="btn btn-ghost btn-sm" data-remove="${s.id}">წაშლა</button></td></tr>`;
              }).join('')}</tbody></table></div>` : U.empty('კლასში ჯერ მოსწავლე არ არის.', '🧑‍🎓')}
          </section>` : ''}

        ${tab === 'assignments' ? `
          <section class="card">
            <div class="card-head"><h2>დავალებები</h2><button class="btn btn-primary btn-sm" data-act="new-asg">＋ ახალი დავალება</button></div>
            ${asgs.length ? `<div class="asg-list">${asgs.map((a) => {
              const n = subs.filter((s) => s.assignmentId === a.id), ok = n.filter((s) => s.passed).length;
              return `<div class="asg-item"><div class="asg-item-main">
                <div class="asg-item-top"><span class="badge badge-${a.lab}">${U.labLabel(a.lab)}</span><span class="state state-${a.state}">${STATE_LABEL[a.state]}</span></div>
                <b>${U.esc(a.title)}</b>
                <small class="muted">${U.esc(VL.catalog.title(a.lab, a.exerciseKey))} · ვადა: ${U.fmtDate(a.dueDate)}</small>
                <div class="progress"><div style="width:${enrolled.length ? Math.round(100 * ok / enrolled.length) : 0}%"></div></div>
                <small class="muted">ჩაბარებული ${ok}/${enrolled.length} · გაგზავნილი ${n.length}</small>
              </div><button class="btn btn-ghost btn-sm" data-asg="${a.id}">ნამუშევრები →</button></div>`;
            }).join('')}</div>` : U.empty('ამ კლასს დავალებები ჯერ არ აქვს.')}
          </section>` : ''}

        ${tab === 'progress' ? `
          <section class="card">
            <div class="card-head"><h2>პროგრესის მატრიცა</h2><span class="muted small">✔ ჩაბარდა · ↻ გაგზავნილია, არ ჩაითვალა · — არ გაუგზავნია</span></div>
            ${asgs.length && enrolled.length ? `<div class="table-wrap"><table class="table matrix">
              <thead><tr><th>მოსწავლე</th>${asgs.map((a) => `<th title="${U.esc(a.title)}"><span class="badge badge-${a.lab}">${a.lab === 'tech' ? '⚡' : '🔬'}</span> ${U.esc(a.title.length > 22 ? a.title.slice(0, 21) + '…' : a.title)}</th>`).join('')}<th>სულ</th></tr></thead>
              <tbody>${enrolled.map((s) => {
                let okN = 0;
                return `<tr><td><b>${U.esc(s.name)}</b></td>${asgs.map((a) => {
                  const x = subOf(a.id, s.id); if (x && x.passed) okN++;
                  return `<td class="cell ${x ? (x.passed ? 'ok' : 'warn') : ''}" ${x ? `data-sub="${x.id}" data-a="${a.id}"` : ''}>${x ? (x.passed ? '✔' : '↻') + ` ${x.grade ?? x.score}%` : '—'}</td>`;
                }).join('')}<td><b>${okN}/${asgs.length}</b></td></tr>`;
              }).join('')}</tbody></table></div>` : U.empty('მატრიცისთვის საჭიროა მოსწავლეები და დავალებები.', '📊')}
          </section>` : ''}
        </div>
      </div>`;

    const rerender = (t) => VL.router.go('class', { classId: c.id, tab: t || tab });
    U.on(view, 'click', '[data-tab]', (e, b) => rerender(b.dataset.tab));
    U.on(view, 'click', '[data-asg]', (e, b) => VL.router.go('assignment', { assignmentId: b.dataset.asg }));
    U.on(view, 'click', '[data-sub]', (e, b) => {
      const s = subs.find((x) => x.id === b.dataset.sub); const a = asgs.find((x) => x.id === b.dataset.a);
      P.submissionModal(s, a, () => rerender());
    });
    U.on(view, 'click', '[data-remove]', async (e, b) => {
      if (!(await U.confirm('მოსწავლე კლასიდან წაიშალოს? (მისი ანგარიში დარჩება)', { danger: true, okLabel: 'წაშლა' }))) return;
      await api.removeStudentFromClass(c.id, b.dataset.remove); U.toast('მოსწავლე წაიშალა კლასიდან', 'success'); rerender();
    });
    const addForm = view.querySelector('#add-form');
    if (addForm) addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = U.formData(addForm);
      try { const s = await api.addStudentToClass(c.id, d.student || d.email); U.toast(`${s.name} დაემატა კლასს`, 'success'); rerender(); }
      catch (err) { U.toast(err.message || 'აირჩიე მოსწავლე', 'error'); }
    });
    U.on(view, 'click', '[data-act]', async (e, b) => {
      const act = b.dataset.act;
      if (act === 'copy') U.copy(c.code);
      else if (act === 'edit') P.classForm(user, c, () => rerender());
      else if (act === 'regen') { if (await U.confirm('შეიქმნას ახალი კოდი? ძველი კოდი აღარ იმუშავებს.', { okLabel: 'განახლება' })) { await api.updateClass(c.id, { regenerateCode: true }); rerender(); } }
      else if (act === 'delete') { if (await U.confirm(`წაიშალოს კლასი „${c.name}“ ყველა დავალებითა და ნამუშევრით?`, { danger: true, okLabel: 'წაშლა' })) { await api.deleteClass(c.id); U.toast('კლასი წაიშალა', 'success'); VL.router.go('home'); } }
      else if (act === 'new-asg') P.assignmentForm({ user, classes: [c], classId: c.id, onDone: () => rerender('assignments') });
    });
  };

  /* ---------- დავალების გვერდი ---------- */
  P.assignmentPage = async (view, params, user) => {
    if (!params.assignmentId) { VL.router.go('home'); return; }
    const a = await api.getAssignment(params.assignmentId);
    if (user.role === 'teacher' && a.teacherId !== user.id) throw new Error('ეს დავალება სხვა მასწავლებელს ეკუთვნის');
    const c = await api.getClass(a.classId);
    const [subs, students] = await Promise.all([api.listSubmissions({ assignmentId: a.id }), api.listUsers({ role: 'student' })]);
    const enrolled = students.filter((s) => c.studentIds.includes(s.id));
    const item = VL.catalog.get(a.lab, a.exerciseKey);
    const ok = subs.filter((s) => s.passed).length;
    view.innerHTML = `
      <div class="page">
        <div class="page-head">
          <div>
            <a href="#class" class="back-link" data-back>← ${U.esc(c.name)}</a>
            <h1>${U.esc(a.title)}</h1>
            <div class="asg-item-top"><span class="badge badge-${a.lab}">${U.labLabel(a.lab)}</span><span class="state state-${a.state}">${STATE_LABEL[a.state]}</span><span class="muted small">📅 ვადა: ${U.fmtDate(a.dueDate)}</span></div>
          </div>
          <div class="btn-row">
            <button class="btn btn-ghost btn-sm" data-act="preview">👁 ლაბში ნახვა</button>
            <button class="btn btn-ghost btn-sm" data-act="edit">✎ რედაქტირება</button>
            <button class="btn btn-ghost btn-sm" data-act="toggle">${a.status === 'closed' ? '🔓 ხელახლა გახსნა' : '🔒 დახურვა'}</button>
            <button class="btn btn-danger btn-sm" data-act="delete">🗑</button>
          </div>
        </div>
        <div class="grid-2 wide-left">
          <section class="card">
            <div class="card-head"><h2>📨 ნამუშევრები</h2><span class="pill">${ok}/${enrolled.length} ჩაბარდა</span></div>
            ${enrolled.length ? `<div class="table-wrap"><table class="table">
              <thead><tr><th>მოსწავლე</th><th>სტატუსი</th><th>ქულა</th><th>მცდელობა</th><th>გაგზავნის დრო</th><th></th></tr></thead>
              <tbody>${enrolled.map((s) => {
                const x = subs.find((y) => y.studentId === s.id);
                return `<tr><td><b>${U.esc(s.name)}</b></td>
                  <td>${x ? (x.passed ? '<span class="pill pill-ok">✔ ჩაბარდა</span>' : '<span class="pill pill-warn">↻ არ ჩაითვალა</span>') + (x.late ? ' <span class="pill pill-warn">⏰</span>' : '') : '<span class="pill">არ გაუგზავნია</span>'}</td>
                  <td>${x ? `${x.grade ?? x.score}%${x.grade != null ? ' <small class="muted">(ხელით)</small>' : ''}` : '—'}</td><td>${x ? x.attempts : '—'}</td><td class="muted small">${x ? U.fmtDateTime(x.submittedAt) : '—'}</td>
                  <td class="right">${x ? `<button class="btn btn-ghost btn-sm" data-sub="${x.id}">ნახვა / შეფასება</button>` : ''}</td></tr>`;
              }).join('')}</tbody></table></div>` : U.empty('კლასში მოსწავლეები არ არიან.')}
          </section>
          <section class="card">
            <h2>📋 პირობა</h2>
            <p>${U.esc(a.instructions || '—')}</p>
            <h4>სავარჯიშო</h4>
            <p><b>${U.esc(item ? item.title : a.exerciseKey)}</b></p>
            <p class="muted">${U.esc(VL.catalog.describe(a))}</p>
            ${Object.keys(a.params || {}).length ? `<h4>სამიზნე პარამეტრები</h4><div class="pill-wrap">${Object.entries(a.params).map(([k, v]) => { const q = item && item.params.find((x) => x.key === k); return `<span class="pill">${U.esc(q ? q.label : k)}: <b>${U.esc(v)}</b></span>`; }).join('')}</div>` : ''}
          </section>
        </div>
      </div>`;
    const rerender = () => VL.router.go('assignment', { assignmentId: a.id });
    view.querySelector('[data-back]').addEventListener('click', (e) => { e.preventDefault(); VL.router.go('class', { classId: c.id, tab: 'assignments' }); });
    U.on(view, 'click', '[data-sub]', (e, b) => P.submissionModal(subs.find((x) => x.id === b.dataset.sub), a, rerender));
    U.on(view, 'click', '[data-act]', async (e, b) => {
      const act = b.dataset.act;
      if (act === 'preview') P.openAssignment(a);
      else if (act === 'edit') P.assignmentForm({ user, classes: [c], existing: a, onDone: rerender });
      else if (act === 'toggle') { await api.updateAssignment(a.id, { status: a.status === 'closed' ? 'active' : 'closed' }); U.toast(a.status === 'closed' ? 'დავალება გაიხსნა' : 'დავალება დაიხურა', 'success'); rerender(); }
      else if (act === 'delete') { if (await U.confirm('წაიშალოს დავალება და მისი ყველა ნამუშევარი?', { danger: true, okLabel: 'წაშლა' })) { await api.deleteAssignment(a.id); U.toast('დავალება წაიშალა', 'success'); VL.router.go('class', { classId: c.id, tab: 'assignments' }); } }
    });
  };
})(window.VL);
