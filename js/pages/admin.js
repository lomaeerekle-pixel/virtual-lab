/* ============================================================
 * pages/admin.js — ადმინისტრატორის პანელი (ერთადერთი ადმინი)
 * მომხმარებლები · კლასები · ლაბორატორიის მოდულები · მონაცემები
 * ============================================================ */
(function (VL) {
  'use strict';
  const U = VL.U, api = VL.api;
  const P = VL.pages = VL.pages || {};

  P.admin = async (view, params, user) => {
    const tab = params.tab || 'overview';
    const [stats, users, classes, asgs] = await Promise.all([api.stats(), api.listUsers(), api.listClasses(), api.listAssignments()]);
    const settings = api.getSettingsSync();
    const teachers = users.filter((u) => u.role === 'teacher');
    const q = (params.q || '').toLowerCase(), rf = params.role || '';
    const filtered = users.filter((u) => (!rf || u.role === rf) && (!q || u.name.toLowerCase().includes(q) || u.email.includes(q)));
    const tog = (name, on, label, desc) => `<label class="setting"><div><b>${label}</b>${desc ? `<small class="muted">${desc}</small>` : ''}</div><label class="switch"><input type="checkbox" data-setting="${name}" ${on ? 'checked' : ''}><span></span></label></label>`;

    view.innerHTML = `
      <div class="page">
        <div class="page-head">
          <div><h1>🛡️ ადმინისტრატორის პანელი</h1><p class="muted">${U.esc(settings.schoolName)} · სისტემის მართვა</p></div>
        </div>
        <div class="tabs">
          ${[['overview', '📊 მიმოხილვა'], ['users', '👥 მომხმარებლები'], ['classes', '🏫 კლასები'], ['labs', '🧪 ლაბორატორიები'], ['data', '💾 მონაცემები']].map(([k, l]) => `<button class="tab ${tab === k ? 'active' : ''}" data-tab="${k}">${l}</button>`).join('')}
        </div>
        <div class="tab-body">
        ${tab === 'overview' ? `
          <div class="stats">
            <div class="stat"><span>👥</span><b>${stats.users}</b><small>მომხმარებელი</small></div>
            <div class="stat"><span>👩‍🏫</span><b>${stats.teachers}</b><small>მასწავლებელი</small></div>
            <div class="stat"><span>🧑‍🎓</span><b>${stats.students}</b><small>მოსწავლე</small></div>
            <div class="stat"><span>🏫</span><b>${stats.classes}</b><small>კლასი</small></div>
            <div class="stat"><span>📝</span><b>${stats.assignments}</b><small>დავალება</small></div>
            <div class="stat"><span>📨</span><b>${stats.submissions}</b><small>ნამუშევარი (${stats.passed} ✔)</small></div>
          </div>
          <div class="grid-2">
            <section class="card">
              <h2>🧪 მოდულების სტატუსი</h2>
              <ul class="simple-list">
                <li><div><b>⚡ ტექნიკური ლაბი</b><small class="muted">${VL.Tech.EXERCISES.length} სავარჯიშო · ${asgs.filter((a) => a.lab === 'tech').length} დავალება</small></div><span class="pill ${settings.modules.tech ? 'pill-ok' : 'pill-warn'}">${settings.modules.tech ? 'ჩართულია' : 'გამორთულია'}</span></li>
                <li><div><b>🔬 STEM ლაბი</b><small class="muted">${VL.STEM.sims.length} სიმულაცია · ${VL.STEM.sims.reduce((n, s) => n + s.challenges.length, 0)} გამოწვევა · ${asgs.filter((a) => a.lab === 'stem').length} დავალება</small></div><span class="pill ${settings.modules.stem ? 'pill-ok' : 'pill-warn'}">${settings.modules.stem ? 'ჩართულია' : 'გამორთულია'}</span></li>
              </ul>
            </section>
            <section class="card">
              <h2>🆕 ბოლოს დარეგისტრირებული</h2>
              <ul class="simple-list">${users.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 6).map((u) => `<li><div><b>${U.esc(u.name)}</b><small class="muted">${U.esc(u.email)}</small></div><span class="role-badge role-${u.role}">${U.roleLabel(u.role)}</span></li>`).join('')}</ul>
            </section>
          </div>` : ''}

        ${tab === 'users' ? `
          <section class="card">
            <form id="filter" class="inline-form">
              <input name="q" placeholder="🔍 ძებნა სახელით ან ელ-ფოსტით" value="${U.esc(params.q || '')}">
              <select name="role"><option value="">ყველა როლი</option><option value="teacher" ${rf === 'teacher' ? 'selected' : ''}>მასწავლებლები</option><option value="student" ${rf === 'student' ? 'selected' : ''}>მოსწავლეები</option><option value="admin" ${rf === 'admin' ? 'selected' : ''}>ადმინი</option></select>
              <button class="btn btn-ghost" type="submit">ფილტრი</button>
            </form>
            <div class="table-wrap"><table class="table">
              <thead><tr><th>სახელი</th><th>ელ-ფოსტა</th><th>როლი</th><th>კლასები</th><th>სტატუსი</th><th class="right">მოქმედებები</th></tr></thead>
              <tbody>${filtered.map((u) => {
                const nCls = u.role === 'teacher' ? classes.filter((c) => c.teacherId === u.id).length : classes.filter((c) => c.studentIds.includes(u.id)).length;
                if (u.role === 'admin') return `<tr><td><b>${U.esc(u.name)}</b></td><td>${U.esc(u.email)}</td><td><span class="role-badge role-admin">ადმინისტრატორი</span></td><td>—</td><td><span class="pill pill-ok">აქტიური</span></td><td class="right muted small">🔒 ერთადერთი ადმინი</td></tr>`;
                return `<tr>
                  <td><b>${U.esc(u.name)}</b></td><td class="muted">${U.esc(u.email)}</td>
                  <td><select class="mini-select" data-role="${u.id}"><option value="teacher" ${u.role === 'teacher' ? 'selected' : ''}>მასწავლებელი</option><option value="student" ${u.role === 'student' ? 'selected' : ''}>მოსწავლე</option></select></td>
                  <td>${nCls}</td>
                  <td>${u.blocked ? '<span class="pill pill-warn">დაბლოკილი</span>' : '<span class="pill pill-ok">აქტიური</span>'}</td>
                  <td class="right nowrap">
                    <button class="btn btn-ghost btn-sm" data-block="${u.id}">${u.blocked ? 'განბლოკვა' : 'დაბლოკვა'}</button>
                    <button class="btn btn-ghost btn-sm" data-pw="${u.id}">🔑</button>
                    <button class="btn btn-ghost btn-sm danger-text" data-del="${u.id}">🗑</button>
                  </td></tr>`;
              }).join('')}</tbody>
            </table></div>
            <p class="muted small">ℹ️ სისტემაში მხოლოდ ერთი ადმინისტრატორია; როლის შეცვლით ან რეგისტრაციით მეორე ადმინის შექმნა შეუძლებელია.</p>
          </section>` : ''}

        ${tab === 'classes' ? `
          <section class="card">
            ${classes.length ? `<div class="table-wrap"><table class="table">
              <thead><tr><th>კლასი</th><th>მასწავლებელი</th><th>მოსწავლეები</th><th>დავალებები</th><th>კოდი</th><th class="right"></th></tr></thead>
              <tbody>${classes.map((c) => `<tr>
                <td><b>${U.esc(c.name)}</b><br><small class="muted">${U.esc(c.subject || '')}</small></td>
                <td><select class="mini-select" data-teacher="${c.id}">${teachers.map((t) => `<option value="${t.id}" ${t.id === c.teacherId ? 'selected' : ''}>${U.esc(t.name)}</option>`).join('')}</select></td>
                <td>${c.studentIds.length}</td><td>${asgs.filter((a) => a.classId === c.id).length}</td><td><span class="code-tag">${c.code}</span></td>
                <td class="right nowrap"><button class="btn btn-ghost btn-sm" data-open-class="${c.id}">გახსნა →</button><button class="btn btn-ghost btn-sm danger-text" data-del-class="${c.id}">🗑</button></td>
              </tr>`).join('')}</tbody></table></div>` : U.empty('კლასები არ არის.', '🏫')}
          </section>` : ''}

        ${tab === 'labs' ? `
          <div class="grid-2">
            <section class="card">
              <h2>🧪 ლაბორატორიის მოდულები</h2>
              ${tog('modules.tech', settings.modules.tech, '⚡ ტექნიკური ლაბორატორია', 'Arduino და ელექტრონიკის სიმულატორი')}
              ${tog('modules.circuit', settings.modules.circuit !== false, '🔌 სქემის კონსტრუქტორი', 'Tinkercad-ის მსგავსი წრედების რედაქტორი და სიმულაცია')}
              ${tog('modules.stem', settings.modules.stem, '🔬 STEM ლაბორატორია', 'საგნობრივი სიმულაციები და გამოწვევები')}
              ${tog('modules.formulas', settings.modules.formulas !== false, '📐 ფორმულების ცნობარი', 'ფორმულები, კალკულატორები და ბმულები სიმულაციებზე')}
              <h3>STEM საგნები</h3>
              ${Object.entries(VL.STEM.subjects).map(([k, s]) => tog('subjects.' + k, settings.subjects[k] !== false, `${s.icon} ${s.title}`, `${VL.STEM.sims.filter((x) => x.subject === k).length} სიმულაცია · ${s.desc}`)).join('')}
            </section>
            <section class="card">
              <h2>⚙️ რეგისტრაცია და სკოლა</h2>
              ${tog('allowTeacherRegistration', settings.allowTeacherRegistration, 'მასწავლებლის რეგისტრაცია', 'საჯარო ფორმით მასწავლებლის ანგარიშის შექმნა')}
              ${tog('allowStudentRegistration', settings.allowStudentRegistration, 'მოსწავლის რეგისტრაცია', 'საჯარო ფორმით მოსწავლის ანგარიშის შექმნა')}
              <form id="school-form" class="form">
                <label class="field"><span>სკოლის სახელი</span><input name="schoolName" value="${U.esc(settings.schoolName)}"></label>
                <button class="btn btn-primary btn-sm" type="submit">შენახვა</button>
              </form>
              <h3>📚 კატალოგი</h3>
              <ul class="simple-list compact">
                ${VL.Tech.EXERCISES.map((e) => `<li><span>${e.icon} ${U.esc(e.title)}</span><span class="pill">${e.level}</span></li>`).join('')}
                ${VL.STEM.sims.map((s) => `<li><span>${s.icon} ${U.esc(s.title)}</span><span class="pill">${s.challenges.length} გამოწვევა</span></li>`).join('')}
              </ul>
            </section>
          </div>` : ''}

        ${tab === 'data' ? `
          <section class="card">
            <h2>💾 მონაცემები</h2>
            <p>ყველა მონაცემი ინახება ბრაუზერის <code>localStorage</code>-ში (გასაღები: <code>${VL.CONFIG.storageKey}</code>). მონაცემთა ფენა (<code>js/core/store.js</code>) ასინქრონულია და მარტივად ჩანაცვლდება REST API-ით.</p>
            <div class="btn-row">
              <button class="btn btn-ghost" data-act="export">⧉ JSON ექსპორტი (კოპირება)</button>
              <button class="btn btn-danger" data-act="reset">↺ დემო მონაცემების აღდგენა</button>
            </div>
            <pre id="export-out" class="code-view" hidden></pre>
          </section>` : ''}
        </div>
      </div>`;

    const go = (patch) => VL.router.go('admin', { ...params, ...patch });
    U.on(view, 'click', '[data-tab]', (e, b) => go({ tab: b.dataset.tab }));
    const filter = view.querySelector('#filter');
    if (filter) filter.addEventListener('submit', (e) => { e.preventDefault(); const d = U.formData(filter); go({ q: d.q, role: d.role }); });
    const guard = async (fn, ok) => { try { await fn(); if (ok) U.toast(ok, 'success'); go({}); } catch (err) { U.toast(err.message, 'error'); go({}); } };
    view.addEventListener('change', async (e) => {
      const t = e.target;
      if (t.dataset.role) guard(() => api.updateUser(t.dataset.role, { role: t.value }), 'როლი შეიცვალა');
      if (t.dataset.teacher) guard(() => api.updateClass(t.dataset.teacher, { teacherId: t.value }), 'მასწავლებელი შეიცვალა');
      if (t.dataset.setting) {
        const [a, b] = t.dataset.setting.split('.');
        const patch = b ? { [a]: { [b]: t.checked } } : { [a]: t.checked };
        await api.updateSettings(patch); U.toast('პარამეტრი შენახულია', 'success');
      }
    });
    U.on(view, 'click', '[data-block]', (e, b) => { const u = users.find((x) => x.id === b.dataset.block); guard(() => api.updateUser(u.id, { blocked: !u.blocked }), u.blocked ? 'განბლოკილია' : 'დაბლოკილია'); });
    U.on(view, 'click', '[data-del]', async (e, b) => {
      const u = users.find((x) => x.id === b.dataset.del);
      if (await U.confirm(`წაიშალოს „${u.name}“? მისი ნამუშევრებიც წაიშლება.`, { danger: true, okLabel: 'წაშლა' })) guard(() => api.deleteUser(u.id), 'მომხმარებელი წაიშალა');
    });
    U.on(view, 'click', '[data-pw]', (e, b) => {
      const u = users.find((x) => x.id === b.dataset.pw);
      U.modal({
        title: `პაროლის შეცვლა — ${u.name}`, html: '<form class="form" id="pwf"><label class="field"><span>ახალი პაროლი (მინ. 6)</span><input name="pw" type="text" required minlength="6"></label></form>',
        actions: [{ label: 'გაუქმება', cls: 'btn-ghost' }, { label: 'შენახვა', cls: 'btn-primary', onClick: async (el) => { await api.resetPassword(u.id, el.querySelector('[name=pw]').value); U.toast('პაროლი შეიცვალა', 'success'); } }],
      });
    });
    U.on(view, 'click', '[data-open-class]', (e, b) => VL.router.go('class', { classId: b.dataset.openClass }));
    U.on(view, 'click', '[data-del-class]', async (e, b) => {
      const c = classes.find((x) => x.id === b.dataset.delClass);
      if (await U.confirm(`წაიშალოს კლასი „${c.name}“ დავალებებით?`, { danger: true, okLabel: 'წაშლა' })) guard(() => api.deleteClass(c.id), 'კლასი წაიშალა');
    });
    const sf = view.querySelector('#school-form');
    if (sf) sf.addEventListener('submit', async (e) => { e.preventDefault(); await api.updateSettings({ schoolName: U.formData(sf).schoolName }); U.toast('შენახულია', 'success'); go({}); });
    U.on(view, 'click', '[data-act]', async (e, b) => {
      if (b.dataset.act === 'export') { const d = await api.exportData(); const txt = JSON.stringify(d, null, 2); const pre = view.querySelector('#export-out'); pre.hidden = false; pre.textContent = txt; U.copy(txt); }
      if (b.dataset.act === 'reset') { if (await U.confirm('ყველა მონაცემი წაიშლება და დაბრუნდება საწყისი დემო მონაცემები. გავაგრძელოთ?', { danger: true, okLabel: 'აღდგენა' })) { await api.resetDemo(); U.toast('დემო მონაცემები აღდგენილია', 'success'); VL.router.go('login'); } }
    });
  };
})(window.VL);
