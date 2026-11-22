/* ============================================================
 * pages/auth.js — შესვლა და რეგისტრაცია
 * ============================================================ */
(function (VL) {
  'use strict';
  const U = VL.U, api = VL.api;
  const P = VL.pages = VL.pages || {};

  const hero = `
    <div class="auth-hero">
      <div class="auth-logo">🔬</div>
      <h1>ვირტუალური ლაბორატორია</h1>
      <p>როცა ფიზიკური აღჭურვილობა არ არის — ექსპერიმენტები ბრაუზერში, კომპიუტერზე და ტელეფონზე.</p>
      <ul class="auth-features">
        <li><span>🔌</span><div><b>სქემების კონსტრუქტორი</b><small>წრედები დაფაზე, რეალური ელექტრული სიმულაცია და Arduino</small></div></li>
        <li><span>⚡</span><div><b>ტექნიკური ლაბი</b><small>Arduino-ს სიმულატორი: LED, ღილაკი, სენსორები, სერვო</small></div></li>
        <li><span>🔬</span><div><b>STEM ლაბი</b><small>37 ინტერაქტიული სიმულაცია 7 საგანში</small></div></li>
        <li><span>📐</span><div><b>ფორმულები</b><small>218 ფორმულა კალკულატორებით</small></div></li>
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
        </div>
      </div>`;
    const form = view.querySelector('#login-form');
    const doLogin = async (email, pw) => {
      try { const u = await api.login(email, pw); U.toast(`მოგესალმებით, ${u.name}!`, 'success'); VL.router.go('home'); }
      catch (e) { U.toast(e.message, 'error'); }
    };
    form.addEventListener('submit', (e) => { e.preventDefault(); const d = U.formData(form); doLogin(d.email, d.password); });
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
            <label class="field" id="code-field"><span>კლასის კოდი (არასავალდებულო)</span><input name="classCode" placeholder="მაგ.: K7P2QX" style="text-transform:uppercase"></label>
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

  /** პირველი შესვლისას საწყისი პაროლის სავალდებულო შეცვლა */
  P.setPassword = async (view, params, user) => {
    view.innerHTML = `
      <div class="auth auth-single">
        <div class="auth-card card">
          <h2>🔐 დააყენე ახალი პაროლი</h2>
          <p class="muted">უსაფრთხოებისთვის, პირველი შესვლისას საწყისი პაროლი უნდა შეცვალო.</p>
          <form id="setpw-form" class="form" novalidate>
            <label class="field"><span>მიმდინარე პაროლი</span><input name="old" type="password" autocomplete="current-password" required></label>
            <label class="field"><span>ახალი პაროლი (მინ. 8 სიმბოლო)</span><input name="nw" type="password" autocomplete="new-password" required minlength="8"></label>
            <label class="field"><span>გაიმეორე ახალი პაროლი</span><input name="nw2" type="password" autocomplete="new-password" required minlength="8"></label>
            <button class="btn btn-primary btn-block" type="submit">შენახვა და გაგრძელება</button>
          </form>
          <p class="center"><a href="#" id="setpw-logout">⎋ გასვლა</a></p>
        </div>
      </div>`;
    const form = view.querySelector('#setpw-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = U.formData(form);
      if (!d.nw || d.nw.length < 8) return U.toast('ახალი პაროლი უნდა იყოს მინიმუმ 8 სიმბოლო', 'error');
      if (d.nw !== d.nw2) return U.toast('პაროლები არ ემთხვევა', 'error');
      try { await api.changePassword(user.id, d.old, d.nw); U.toast('პაროლი შეიცვალა', 'success'); VL.router.go('home'); }
      catch (err) { U.toast(err.message, 'error'); }
    });
    view.querySelector('#setpw-logout').addEventListener('click', async (e) => { e.preventDefault(); await api.logout(); VL.router.go('login'); });
  };
})(window.VL);
