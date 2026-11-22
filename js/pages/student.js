/* ============================================================
 * pages/student.js — მოსწავლის პანელი
 * ============================================================ */
(function (VL) {
  'use strict';
  const U = VL.U, api = VL.api;
  const P = VL.pages = VL.pages || {};

  /** დავალების გახსნა შესაბამის ლაბში */
  P.openAssignment = (a) => VL.router.go(a.lab === 'stem' ? 'stem' : (String(a.exerciseKey).startsWith('circuit:') ? 'circuit' : 'tech'), { assignmentId: a.id });

  const STATE_LABEL = { active: 'აქტიური', overdue: 'ვადაგასული', closed: 'დახურული' };

  P.student = async (view, params, user) => {
    const [classes, asgs, subs, progress] = await Promise.all([
      api.listClasses({ studentId: user.id }), api.listAssignments({ studentId: user.id }),
      api.listSubmissions({ studentId: user.id }), api.getProgress(user.id),
    ]);
    const subBy = Object.fromEntries(subs.map((s) => [s.assignmentId, s]));
    const done = asgs.filter((a) => subBy[a.id] && subBy[a.id].passed).length;
    const avg = subs.length ? Math.round(subs.reduce((s, x) => s + (x.grade ?? x.score), 0) / subs.length) : 0;
    const todo = asgs.filter((a) => !(subBy[a.id] && subBy[a.id].passed) && a.state !== 'closed');
    const practiceDone = Object.values(progress).filter((p) => p.passed).length;
    const settings = api.getSettingsSync();

    const asgRow = (a) => {
      const s = subBy[a.id];
      const status = s ? (s.passed ? '<span class="pill pill-ok">✔ შესრულდა</span>' : '<span class="pill pill-warn">↻ გასაუმჯობესებელი</span>') : '<span class="pill">არ დაწყებულა</span>';
      return `<div class="asg-item">
        <div class="asg-item-main">
          <div class="asg-item-top"><span class="badge badge-${a.lab}">${U.labLabel(a.lab)}</span><span class="state state-${a.state}">${STATE_LABEL[a.state]}</span>${status}</div>
          <b>${U.esc(a.title)}</b>
          <small class="muted">${U.esc(a.className)} · ვადა: ${U.fmtDate(a.dueDate)}${s ? ` · ქულა: ${s.grade ?? s.score}% · მცდელობა: ${s.attempts}` : ''}</small>
          ${s && s.feedback ? `<small class="feedback-inline">💬 ${U.esc(s.feedback)}</small>` : ''}
        </div>
        <button class="btn ${s && s.passed ? 'btn-ghost' : 'btn-primary'} btn-sm" data-open="${a.id}" ${(a.lab === 'tech' && !settings.modules.tech) || (a.lab === 'stem' && !settings.modules.stem) ? 'disabled title="მოდული გამორთულია"' : ''}>${s ? 'გახსნა' : 'დაწყება'} →</button>
      </div>`;
    };

    view.innerHTML = `
      <div class="page">
        <div class="page-head">
          <div><h1>გამარჯობა, ${U.esc(user.name.split(' ')[0])}! 👋</h1><p class="muted">შენი კლასები, დავალებები და პრაქტიკა</p></div>
        </div>
        <div class="stats">
          <div class="stat"><span>📚</span><b>${classes.length}</b><small>კლასი</small></div>
          <div class="stat"><span>📝</span><b>${todo.length}</b><small>შესასრულებელი</small></div>
          <div class="stat"><span>✅</span><b>${done}/${asgs.length}</b><small>შესრულებული</small></div>
          <div class="stat"><span>⭐</span><b>${avg}%</b><small>საშუალო ქულა</small></div>
        </div>

        <div class="grid-2">
          <section class="card">
            <div class="card-head"><h2>📝 ჩემი დავალებები</h2></div>
            ${asgs.length ? `<div class="asg-list">${asgs.map(asgRow).join('')}</div>` : U.empty('დავალებები ჯერ არ გაქვს. შეუერთდი კლასს კოდით.')}
          </section>
          <div class="stack">
            <section class="card">
              <div class="card-head"><h2>🏫 ჩემი კლასები</h2></div>
              <form id="join-form" class="inline-form">
                <input name="code" placeholder="კლასის კოდი (მაგ. LAB9A1)" required style="text-transform:uppercase" aria-label="კლასის კოდი">
                <button class="btn btn-primary" type="submit">შეერთება</button>
              </form>
              ${classes.length ? `<ul class="simple-list">${classes.map((c) => `<li><div><b>${U.esc(c.name)}</b><small class="muted">👩‍🏫 ${U.esc(c.teacherName)}${c.subject ? ' · ' + U.esc(c.subject) : ''}</small></div><span class="pill">${asgs.filter((a) => a.classId === c.id).length} დავალება</span></li>`).join('')}</ul>` : U.empty('ჯერ არცერთ კლასში არ ხარ.', '🏫')}
            </section>
            <section class="card">
              <div class="card-head"><h2>🧪 თავისუფალი პრაქტიკა</h2><span class="pill">${practiceDone} შესრულებული</span></div>
              <div class="lab-links">
                ${settings.modules.formulas !== false ? '<a class="lab-link form" href="#formulas" data-nav="formulas"><span>📐</span><b>ფორმულების ცნობარი</b><small>კალკულატორები და სიმულაციები</small></a>' : ''}
                ${settings.modules.circuit !== false ? '<a class="lab-link circ" href="#circuit" data-nav="circuit"><span>🔌</span><b>სქემის კონსტრუქტორი</b><small>Tinkercad-ის მსგავსი წრედები</small></a>' : ''}
                ${settings.modules.tech ? '<a class="lab-link tech" href="#tech" data-nav="tech"><span>⚡</span><b>ტექნიკური ლაბი</b><small>Arduino სიმულატორი</small></a>' : ''}
                ${settings.modules.stem ? '<a class="lab-link stem" href="#stem" data-nav="stem"><span>🔬</span><b>STEM ლაბი</b><small>ფიზიკა · ქიმია · მათემატიკა</small></a>' : ''}
              </div>
            </section>
          </div>
        </div>
      </div>`;

    U.on(view, 'click', '[data-open]', (e, b) => P.openAssignment(asgs.find((a) => a.id === b.dataset.open)));
    view.querySelector('#join-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try { const c = await api.joinClassByCode(user.id, e.target.code.value); U.toast(`შეუერთდი კლასს: ${c.name}`, 'success'); VL.router.render(); }
      catch (err) { U.toast(err.message, 'error'); }
    });
  };
})(window.VL);
