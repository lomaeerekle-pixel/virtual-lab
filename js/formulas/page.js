/* ============================================================
 * formulas/page.js — ფორმულების ცნობარი
 * საგნები → თემები → ფორმულები; ძებნა; კალკულატორი ნებისმიერი
 * უცნობისთვის; ბმული შესაბამის სიმულაციაზე.
 * ============================================================ */
(function (VL) {
  'use strict';
  const U = VL.U, FM = VL.Formulas, api = VL.api;

  const simLabel = (sim) => {
    if (!sim) return '';
    const [kind, key] = sim.split(':');
    if (kind === 'stem') { const s = VL.STEM.get(key); return s ? `${s.icon} ${s.title}` : ''; }
    if (kind === 'circuit') { const t = VL.Circuit.TEMPLATES.find((x) => x.key === key); return t ? `🔌 ${t.name}` : ''; }
    if (kind === 'tech') { const e = VL.Tech.getExercise(key); return e ? `⚡ ${e.title}` : ''; }
    return '';
  };
  FM.openSim = (sim, user) => {
    const [kind, key] = sim.split(':');
    if (kind === 'stem') VL.router.go('stem', { sim: key });
    else if (kind === 'tech') VL.router.go('tech', { exercise: key });
    else if (kind === 'circuit') {
      const t = VL.Circuit.TEMPLATES.find((x) => x.key === key);
      const d = api.saveDesignSync({ ownerId: user.id, name: t.name, parts: JSON.parse(JSON.stringify(t.parts)), wires: JSON.parse(JSON.stringify(t.wires)), code: t.code || '' });
      VL.router.go('circuit', { designId: d.id });
    }
  };

  /** ფორმულის ბარათი */
  FM.cardHtml = (fo, opts = {}) => {
    const subj = FM.subjects[fo.subj], topic = (FM.topics[fo.subj] || {})[fo.topic] || '';
    const sl = simLabel(fo.sim);
    return `
      <article class="fcard" data-fid="${fo.id}">
        <div class="fcard-head">
          <b>${U.esc(fo.name)}</b>
          ${opts.compact ? '' : `<span class="ftopic">${subj ? subj.icon : ''} ${U.esc(topic)}</span>`}
        </div>
        <div class="fformula">${FM.tex(fo.tex)}</div>
        ${fo.vars.length ? `<ul class="flegend">${fo.vars.map((v) => `<li>${FM.tex(v.sym)} — ${U.esc(v.label)}${v.unit ? `, <span class="muted">${U.esc(v.unit)}</span>` : ''}</li>`).join('')}</ul>` : ''}
        ${fo.note ? `<p class="fnote">ℹ️ ${U.esc(fo.note)}</p>` : ''}
        <div class="btn-row">
          ${fo.f ? '<button class="btn btn-ghost btn-sm" data-fcalc>🧮 გამოთვლა</button>' : ''}
          ${sl && !opts.noSim ? `<button class="btn btn-ghost btn-sm" data-fsim="${fo.sim}" title="${U.esc(sl)}">🔬 სიმულაცია</button>` : ''}
          ${sl && !opts.noSim ? `<span class="fsim-name muted small">${U.esc(sl)}</span>` : ''}
        </div>
        <div class="fcalc" hidden></div>
      </article>`;
  };

  function renderCalc(box, fo) {
    const allowed = fo.vars.filter((v) => !fo.only || fo.only.includes(v.k));
    const st = box._st || (box._st = { unknown: allowed[0].k, vals: Object.fromEntries(fo.vars.map((v) => [v.k, v.def])) });
    box.innerHTML = `
      <div class="fcalc-find"><span class="muted small">ვიპოვოთ:</span>${allowed.map((v) => `<label class="fpill ${st.unknown === v.k ? 'on' : ''}"><input type="radio" name="u-${fo.id}" value="${v.k}" ${st.unknown === v.k ? 'checked' : ''}>${FM.tex(v.sym)}</label>`).join('')}</div>
      <div class="fcalc-grid">
        ${fo.vars.map((v) => v.k === st.unknown ? '' : `<label class="fin"><span>${FM.tex(v.sym)} <small class="muted">${U.esc(v.label)}</small></span><span class="fin-row"><input type="number" step="any" data-v="${v.k}" value="${st.vals[v.k]}"><small>${U.esc(v.unit)}</small></span></label>`).join('')}
      </div>
      <div class="fresult" data-res></div>`;
    const compute = () => {
      const unk = fo.vars.find((v) => v.k === st.unknown);
      const bad = fo.vars.some((v) => v.k !== st.unknown && !Number.isFinite(st.vals[v.k]));
      const res = box.querySelector('[data-res]');
      if (bad) { res.innerHTML = '<span class="muted">შეავსე ყველა ველი</span>'; return; }
      const x = FM.solve(fo.f, st.vals, st.unknown, unk.def);
      res.innerHTML = Number.isFinite(x) ? `${FM.tex(unk.sym)} = <b>${FM.fmt(x)}</b> ${U.esc(unk.unit)}` : '<span class="danger-text">ამონახსნი ვერ მოიძებნა — შეამოწმე მნიშვნელობები</span>';
    };
    box.querySelectorAll('[data-v]').forEach((inp) => inp.addEventListener('input', () => { st.vals[inp.dataset.v] = inp.value === '' ? NaN : Number(inp.value); compute(); }));
    box.querySelectorAll(`input[name="u-${fo.id}"]`).forEach((r) => r.addEventListener('change', () => { st.unknown = r.value; renderCalc(box, fo); }));
    compute();
  }

  /** ბარათების ღილაკების მიბმა კონტეინერზე */
  FM.bind = (root, user, onNav) => {
    U.on(root, 'click', '[data-fcalc]', (e, b) => {
      const card = b.closest('[data-fid]'), fo = FM.list.find((x) => x.id === card.dataset.fid), box = card.querySelector('.fcalc');
      box.hidden = !box.hidden; b.classList.toggle('active', !box.hidden);
      if (!box.hidden && !box._st) renderCalc(box, fo);
    });
    U.on(root, 'click', '[data-fsim]', (e, b) => { if (onNav) onNav(); FM.openSim(b.dataset.fsim, user); });
  };

  FM.forSim = (simKey) => FM.list.filter((x) => x.sim === simKey);

  FM.renderPage = async function (view, params, user) {
    const subjects = Object.entries(FM.subjects);
    const subj = params.subject && FM.subjects[params.subject] ? params.subject : (params.q ? 'all' : subjects[0][0]);
    const q = (params.q || '').trim().toLowerCase();
    const topic = params.topic || 'all';
    let list = FM.list.filter((x) => subj === 'all' || x.subj === subj);
    if (topic !== 'all' && subj !== 'all') list = list.filter((x) => x.topic === topic);
    if (q) list = list.filter((x) => { const h = x.name + ' ' + x.tex + ' ' + x.vars.map((v) => v.label).join(' ') + ' ' + ((FM.topics[x.subj] || {})[x.topic] || ''); return (h + ' ' + VL.i18n.tr(h)).toLowerCase().includes(q); });
    const groups = {};
    list.forEach((x) => { const k = x.subj + '|' + x.topic; (groups[k] = groups[k] || []).push(x); });
    const withSim = FM.list.filter((x) => x.sim).length;

    view.innerHTML = `
      <div class="page fpage">
        <div class="page-head">
          <div>
            <h1>📐 ფორმულების ცნობარი</h1>
            <p class="muted">${FM.list.length} ფორმულა ${subjects.length} საგანში · ${FM.list.filter((x) => x.f).length} ინტერაქტიული კალკულატორი · ${withSim} დაკავშირებულია სიმულაციასთან</p>
          </div>
          <form id="fsearch" class="fsearch"><input name="q" placeholder="🔍 ძებნა: სიჩქარე, ფართობი, pH, ომი…" value="${U.esc(params.q || '')}" aria-label="ძებნა"></form>
        </div>
        <div class="subject-tabs">
          <button class="subject-tab ${subj === 'all' ? 'active' : ''}" data-fsubj="all">🗂 ყველა</button>
          ${subjects.map(([k, s]) => `<button class="subject-tab ${subj === k ? 'active' : ''}" data-fsubj="${k}">${s.icon} ${U.esc(s.title)} <span class="cnt">${FM.list.filter((x) => x.subj === k).length}</span></button>`).join('')}
        </div>
        ${subj !== 'all' ? `<div class="topic-chips"><button class="chip ${topic === 'all' ? 'on' : ''}" data-ftopic="all">ყველა თემა</button>${Object.entries(FM.topics[subj] || {}).map(([k, t]) => `<button class="chip ${topic === k ? 'on' : ''}" data-ftopic="${k}">${U.esc(t)}</button>`).join('')}</div>` : ''}
        ${list.length ? Object.entries(groups).map(([k, arr]) => { const [s, t] = k.split('|'); return `
          <section class="fgroup">
            <h2 class="section-title">${FM.subjects[s].icon} ${U.esc((FM.topics[s] || {})[t] || t)} <span class="muted small">(${arr.length})</span></h2>
            <div class="fgrid">${arr.map((fo) => FM.cardHtml(fo)).join('')}</div>
          </section>`; }).join('') : U.empty('ვერაფერი მოიძებნა. სცადე სხვა სიტყვა.', '🔍')}
      </div>`;

    FM.bind(view, user);
    U.on(view, 'click', '[data-fsubj]', (e, b) => VL.router.go('formulas', { subject: b.dataset.fsubj }));
    U.on(view, 'click', '[data-ftopic]', (e, b) => VL.router.go('formulas', { subject: subj, topic: b.dataset.ftopic }));
    const fs = view.querySelector('#fsearch');
    fs.addEventListener('submit', (e) => { e.preventDefault(); VL.router.go('formulas', { q: fs.q.value, subject: fs.q.value ? 'all' : subj }); });
    if (params.open) { const c = view.querySelector(`[data-fid="${params.open}"]`); if (c) { c.scrollIntoView({ block: 'center' }); c.classList.add('flash'); c.querySelector('[data-fcalc]') && c.querySelector('[data-fcalc]').click(); } }
  };

  /** ფორმულების მოდალი სიმულაციიდან */
  FM.showForSim = (simKey, user) => {
    const list = FM.forSim('stem:' + simKey);
    const close = U.modal({
      title: `📐 ფორმულები (${list.length})`, wide: true,
      html: `<div class="fgrid one">${list.map((fo) => FM.cardHtml(fo, { compact: true, noSim: true })).join('')}</div>`,
      onMount(el) { FM.bind(el, user); },
      actions: [{ label: 'ყველა ფორმულა →', cls: 'btn-ghost', onClick: () => { const s = list[0] ? list[0].subj : undefined; VL.router.go('formulas', { subject: s }); } }, { label: 'დახურვა', cls: 'btn-primary' }],
    });
    void close;
  };
})(window.VL);
