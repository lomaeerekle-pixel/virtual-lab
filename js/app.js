/* ============================================================
 * app.js — აპლიკაციის გაშვება: მარშრუტები, ზედა/ქვედა ნავიგაცია
 * ============================================================ */
(function (VL) {
  'use strict';
  const U = VL.U, api = VL.api, P = VL.pages, R = VL.router;

  const NAV = {
    admin: [['home', '🛡️', 'პანელი'], ['circuit', '🔌', 'სქემები'], ['tech', '⚡', 'ტექნიკური ლაბი'], ['stem', '🔬', 'STEM ლაბი'], ['formulas', '📐', 'ფორმულები']],
    teacher: [['home', '🏫', 'კლასები'], ['circuit', '🔌', 'სქემები'], ['tech', '⚡', 'ტექნიკური ლაბი'], ['stem', '🔬', 'STEM ლაბი'], ['formulas', '📐', 'ფორმულები']],
    student: [['home', '🏠', 'მთავარი'], ['circuit', '🔌', 'სქემები'], ['tech', '⚡', 'ტექნიკური ლაბი'], ['stem', '🔬', 'STEM ლაბი'], ['formulas', '📐', 'ფორმულები']],
  };
  const activeFor = (route) => (['class', 'assignment', 'admin'].includes(route) ? 'home' : route);

  VL.app = {
    renderChrome(user, route) {
      const top = document.getElementById('topbar'), bottom = document.getElementById('bottombar');
      document.body.classList.toggle('logged-out', !user);
      if (!user) { top.innerHTML = `<a class="brand" href="#login"><span class="brand-logo">🔬</span><span>ვირტუალური ლაბორატორია</span></a>`; bottom.innerHTML = ''; return; }
      const st = api.getSettingsSync();
      const items = NAV[user.role].filter(([k]) => (['tech', 'stem', 'circuit', 'formulas'].includes(k) ? st.modules[k] !== false || user.role === 'admin' : true));
      const act = activeFor(route);
      top.innerHTML = `
        <a class="brand" href="#home"><span class="brand-logo">🔬</span><span class="brand-text">ვირტუალური ლაბორატორია</span></a>
        <nav class="topnav">${items.map(([k, i, l]) => `<a href="#${k}" class="${act === k ? 'active' : ''} ${k}">${i} ${l}</a>`).join('')}</nav>
        <button class="user-chip" id="user-chip" aria-label="ანგარიში">
          <span class="avatar">${U.esc(user.name.trim()[0] || '?')}</span>
          <span class="user-txt"><b>${U.esc(user.name)}</b><small class="role-${user.role}">${U.roleLabel(user.role)}</small></span>
        </button>`;
      bottom.innerHTML = items.map(([k, i, l]) => `<a href="#${k}" class="${act === k ? 'active' : ''}"><span>${i}</span><small>${l.replace(' ლაბი', '').replace('ტექნიკური', 'ტექნ.').replace('ფორმულები', 'ფორმ.')}</small></a>`).join('')
        + '<button id="user-chip-m"><span>👤</span><small>ანგარიში</small></button>';
      const openMenu = () => U.modal({
        title: 'ანგარიში',
        html: `<div class="account-box"><span class="avatar big">${U.esc(user.name.trim()[0])}</span><div><b>${U.esc(user.name)}</b><br><span class="muted">${U.esc(user.email)}</span><br><span class="role-badge role-${user.role}">${U.roleLabel(user.role)}</span></div></div>
          <form class="form" id="cpw"><h4>პაროლის შეცვლა</h4>
            <label class="field"><span>მიმდინარე პაროლი</span><input type="password" name="old" autocomplete="current-password"></label>
            <label class="field"><span>ახალი პაროლი</span><input type="password" name="nw" autocomplete="new-password"></label>
            <button class="btn btn-ghost btn-sm" type="submit">შეცვლა</button></form>`,
        onMount(el) {
          el.querySelector('#cpw').addEventListener('submit', async (e) => {
            e.preventDefault(); const d = U.formData(e.target);
            try { await api.changePassword(user.id, d.old, d.nw); U.toast('პაროლი შეიცვალა', 'success'); e.target.reset(); } catch (err) { U.toast(err.message, 'error'); }
          });
        },
        actions: [{ label: 'დახურვა', cls: 'btn-ghost' }, { label: '⎋ გასვლა', cls: 'btn-danger', onClick: async () => { await api.logout(); U.toast('გამოხვედი სისტემიდან'); R.go('login'); } }],
      });
      document.getElementById('user-chip').onclick = openMenu;
      document.getElementById('user-chip-m').onclick = openMenu;
    },
  };

  /* ---------- მარშრუტები ---------- */
  R.add('login', { public: true, render: (v) => { if (api.sessionUserSync()) return R.go('home'); return P.login(v); } });
  R.add('register', { public: true, render: (v) => { if (api.sessionUserSync()) return R.go('home'); return P.register(v); } });
  R.add('home', { render: (v, p, u) => (u.role === 'admin' ? P.admin(v, {}, u) : u.role === 'teacher' ? P.teacher(v, p, u) : P.student(v, p, u)) });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-nav]');
    if (!a) return;
    e.preventDefault(); R.go(a.dataset.nav, {});
  });

  // ნავიგაციის ბმულები ყოველთვის „სუფთა“ გვერდს ხსნის (დავალების კონტექსტის გარეშე)
  ['topbar', 'bottombar'].forEach((id) => document.getElementById(id).addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    R.go(a.getAttribute('href').slice(1), {});
  }));
  R.add('admin', { roles: ['admin'], render: (v, p, u) => P.admin(v, p, u) });
  R.add('tech', { render: (v, p, u) => VL.Tech.renderPage(v, p, u) });
  R.add('stem', { render: (v, p, u) => VL.STEM.renderPage(v, p, u) });
  R.add('circuit', { render: (v, p, u) => VL.Circuit.renderPage(v, p, u) });
  R.add('formulas', { render: (v, p, u) => VL.Formulas.renderPage(v, p, u) });
  R.add('class', { roles: ['teacher', 'admin'], render: (v, p, u) => P.classPage(v, p, u) });
  R.add('assignment', { roles: ['teacher', 'admin'], render: (v, p, u) => P.assignmentPage(v, p, u) });

  document.addEventListener('DOMContentLoaded', () => R.start());
})(window.VL);
