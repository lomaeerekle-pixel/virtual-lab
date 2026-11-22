/* ============================================================
 * pages/auth.js — შესვლა და რეგისტრაცია
 * ============================================================ */
(function (VL) {
  'use strict';
  const U = VL.U, api = VL.api;
  const P = VL.pages = VL.pages || {};

  const DEMO = [
    { role: 'admin', icon: '🛡️', label: 'ადმინისტრატორი', email: VL.CONFIG.admin.email, pw: VL.CONFIG.admin.password },
    { role: 'teacher', icon: '👩‍🏫', label: 'მასწავლებელი', email: 'teacher@lab.ge', pw: 'teacher123' },
    { role: 'student', icon: '🧑‍🎓', label: 'მოსწავლე', email: 'student@lab.ge', pw: 'student123' },
  ];

  const hero = `
    <div class="auth-hero">
      <div class="auth-logo">🔬</div>
      <h1>ვირტუალური ლაბორატორია</h1>
      <p>როცა ფიზიკური აღჭურვილობა არ არის — ექსპერიმენტები ბრაუზერში, კომპიუტერზე და ტელეფონზე.</p>
      <ul class="auth-features">
        <li><span>⚡</span><div><b>ტექნიკური ლაბი</b><small>Arduino-ს სიმულატორი: LED, ღილაკი, სენსორები, სერვო</small></div></li>
        <li><span>🔬</span><div><b>STEM ლაბი</b><small>ფიზიკა, ქიმია, მათემატიკა — ინტერაქტიული სიმულაციები</small></div></li>
        <li><span>🏫</span><div><b>კლასები და დავალებები</b><small>მასწავლებელი ავალებს, მოსწავლე ასრულებს და აგზავნის</small></div></li>
      </ul>
    </div>`;

  P.login = async (view) => {
    view.innerHTML = `
      <div class="auth">
        ${hero}
        <div class="auth-card card">
          <h2>შესვლა</h2>
          <form id="login-form" class="form" novalidate>
            <label class="field"><span>ელ-ფოსტა</span><input name="email" type="email" autocomplete="username" required placeholder="name@school.ge"></label>
            <label class="field"><span>პაროლი</span><input name="password" type="password" autocomplete="current-password" required placeholder="••••••"></label>
            <button class="btn btn-primary btn-block" type="submit">შესვლა</button>
          </form>
          <p class="center muted">არ გაქვს ანგარიში? <a href="#register">დარეგისტრირდი</a></p>
          <div class="demo-box">
            <p class="small muted">🧪 სწრაფი შესვლა სადემონსტრაციო ანგარიშებით:</p>
            <div class="demo-grid">
              ${DEMO.map((d, i) => `<button class="demo-btn" data-demo="${i}"><span>${d.icon}</span><b>${d.label}</b><small>${U.esc(d.email)}</small></button>`).join('')}
            </div>
          </div>
        </div>
      </div>`;
    const form = view.querySelector('#login-form');
    const doLogin = async (email, pw) => {
      try { const u = await api.login(email, pw); U.toast(`მოგესალმებით, ${u.name}!`, 'success'); VL.router.go('home'); }
      catch (e) { U.toast(e.message, 'error'); }
    };
    form.addEventListener('submit', (e) => { e.preventDefault(); const d = U.formData(form); doLogin(d.email, d.password); });
    U.on(view, 'click', '[data-demo]', (e, b) => { const d = DEMO[+b.dataset.demo]; form.email.value = d.email; form.password.value = d.pw; doLogin(d.email, d.pw); });
  };

  P.register = async (view) => {
    const st = api.getSettingsSync();
    view.innerHTML = `
      <div class="auth">
        ${hero}
        <div class="auth-card card">
          <h2>რეგისტრაცია</h2>
          <form id="reg-form" class="form" novalidate>
            <div class="role-pick">
              <label class="role-opt ${st.allowStudentRegistration ? '' : 'disabled'}"><input type="radio" name="role" value="student" ${st.allowStudentRegistration ? 'checked' : 'disabled'}><span>🧑‍🎓</span><b>მოსწავლე</b></label>
              <label class="role-opt ${st.allowTeacherRegistration ? '' : 'disabled'}"><input type="radio" name="role" value="teacher" ${!st.allowStudentRegistration && st.allowTeacherRegistration ? 'checked' : ''} ${st.allowTeacherRegistration ? '' : 'disabled'}><span>👩‍🏫</span><b>მასწავლებელი</b></label>
            </div>
            <label class="field"><span>სახელი და გვარი</span><input name="name" required placeholder="მაგ.: ნიკა გელაშვილი" autocomplete="name"></label>
            <label class="field"><span>ელ-ფოსტა</span><input name="email" type="email" required placeholder="name@school.ge" autocomplete="email"></label>
            <label class="field"><span>პაროლი (მინ. 6 სიმბოლო)</span><input name="password" type="password" required minlength="6" autocomplete="new-password"></label>
            <label class="field" id="code-field"><span>კლასის კოდი (არასავალდებულო)</span><input name="classCode" placeholder="მაგ.: LAB9A1" style="text-transform:uppercase"></label>
            <button class="btn btn-primary btn-block" type="submit">ანგარიშის შექმნა</button>
          </form>
          <p class="small muted">ℹ️ ადმინისტრატორის ანგარიში სისტემაში მხოლოდ ერთია და რეგისტრაციით ვერ შეიქმნება.</p>
          <p class="center muted">უკვე გაქვს ანგარიში? <a href="#login">შესვლა</a></p>
        </div>
      </div>`;
    const form = view.querySelector('#reg-form');
    const sync = () => { view.querySelector('#code-field').style.display = (form.role.value === 'student') ? '' : 'none'; };
    form.addEventListener('change', sync); sync();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = U.formData(form);
      try {
        const u = await api.register(d);
        U.toast(`ანგარიში შეიქმნა. მოგესალმებით, ${u.name}!`, 'success');
        VL.router.go('home');
      } catch (err) { U.toast(err.message, 'error'); }
    });
  };
})(window.VL);
