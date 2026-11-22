/* ============================================================
 * router.js — მარტივი hash-როუტერი (#home, #tech, #stem ...)
 * დამატებითი პარამეტრები (მაგ. assignmentId) ინახება sessionStorage-ში,
 * რათა გვერდის განახლებისას არ დაიკარგოს.
 * ============================================================ */
(function (VL) {
  'use strict';
  const routes = {};
  let cleanup = null;
  let current = null;
  const PKEY = 'vlab.routeParams';

  const readParams = () => { try { return JSON.parse(sessionStorage.getItem(PKEY) || '{}'); } catch (e) { return {}; } };
  const writeParams = (o) => { try { sessionStorage.setItem(PKEY, JSON.stringify(o)); } catch (e) { /* ignore */ } };

  const R = {
    /** routes: name → { render(el, params) => cleanupFn?, roles?: [] } */
    add(name, def) { routes[name] = def; },
    current() { return current; },
    params() { return (readParams()[current] || {}); },
    go(name, params) {
      const all = readParams();
      all[name] = params || {};
      writeParams(all);
      if (location.hash === '#' + name) R.render();
      else location.hash = name;
    },
    async render() {
      const name = (location.hash || '').replace(/^#/, '') || 'home';
      const user = VL.api.sessionUserSync();
      let def = routes[name];
      let target = name;
      if (!def) { target = 'home'; def = routes.home; }
      if (!user && !def.public) { target = 'login'; def = routes.login; }
      if (user && def.roles && !def.roles.includes(user.role)) { target = 'home'; def = routes.home; }
      if (user && user.mustChangePassword && routes.setpw) { target = 'setpw'; def = routes.setpw; }
      if (target === 'setpw' && !(user && user.mustChangePassword)) { target = user ? 'home' : 'login'; def = routes[target]; }
      if (typeof cleanup === 'function') { try { cleanup(); } catch (e) { console.error(e); } }
      cleanup = null;
      current = target;
      if (location.hash.replace(/^#/, '') !== target && target !== 'home' && target !== 'setpw') history.replaceState(null, '', '#' + target);
      // ახალი კონტეინერი ყოველ გვერდზე — წინა გვერდის მოვლენების დამმუშავებლები არ რჩება
      const old = document.getElementById('view');
      const view = old.cloneNode(false);
      old.replaceWith(view);
      view.className = 'view view-' + target;
      VL.app && VL.app.renderChrome(user, target);
      try {
        cleanup = await def.render(view, (readParams()[target] || {}), user);
      } catch (e) {
        console.error(e);
        view.innerHTML = `<div class="page"><div class="card error-card"><h2>შეცდომა</h2><p>${VL.U.esc(e.message)}</p><button class="btn btn-primary" onclick="location.hash='home'">მთავარზე დაბრუნება</button></div></div>`;
      }
      window.scrollTo(0, 0);
    },
    start() {
      window.addEventListener('hashchange', R.render);
      R.render();
    },
  };
  VL.router = R;
})(window.VL);
