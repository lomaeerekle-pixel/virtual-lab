/* ============================================================
 * store.js — მონაცემთა ფენა (localStorage) + დემო მონაცემები
 *
 * ყველა ფუნქცია VL.api-ში აბრუნებს Promise-ს, ასე რომ მომავალში
 * რეალურ backend-ზე (REST/fetch) გადასვლა მხოლოდ ამ ფაილის
 * შეცვლას მოითხოვს — UI კოდი უცვლელი რჩება.
 * ============================================================ */
(function (VL) {
  'use strict';

  /* ---------- კონფიგურაცია ---------- */
  const CONFIG = VL.CONFIG = {
    // ერთადერთი ადმინისტრატორის ანგარიში (შეცვალეთ საჭიროებისამებრ).
    // საჯარო რეგისტრაცია ადმინს ვერ შექმნის.
    admin: { email: 'admin@lab.ge', password: 'Admin2026!', name: 'სისტემის ადმინისტრატორი' },
    storageKey: 'vlab.db.v3',
    sessionKey: 'vlab.session.v3',
  };

  /* ---------- უსაფრთხო localStorage ---------- */
  const mem = {};
  const LS = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return mem[k] ?? null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } },
  };

  /* ---------- პაროლის ჰეში (მხოლოდ დემოსთვის!) ----------
   * რეალურ სერვერზე გამოიყენეთ bcrypt/argon2. */
  function hash(pw) {
    const str = 'vlab-salt::' + pw;
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 'cy$' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  }

  const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const now = () => new Date().toISOString();
  const dayOffset = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const clone = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
  const fail = (msg) => { throw new Error(msg); };
  const normEmail = (e) => String(e || '').trim().toLowerCase();
  const genCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)]; return s; };

  /* ---------- დემო მონაცემები ---------- */
  function seed() {
    const t = now();
    const users = [
      { id: 'u_admin', role: 'admin', name: CONFIG.admin.name, email: CONFIG.admin.email, passwordHash: hash(CONFIG.admin.password), createdAt: t, blocked: false },
      { id: 'u_t1', role: 'teacher', name: 'ნინო ბერიძე', email: 'teacher@lab.ge', passwordHash: hash('teacher123'), createdAt: t, blocked: false },
      { id: 'u_t2', role: 'teacher', name: 'დავით ლომიძე', email: 'davit@lab.ge', passwordHash: hash('teacher123'), createdAt: t, blocked: false },
      { id: 'u_s1', role: 'student', name: 'გიორგი მელაძე', email: 'student@lab.ge', passwordHash: hash('student123'), createdAt: t, blocked: false },
      { id: 'u_s2', role: 'student', name: 'მარიამ კაპანაძე', email: 'mariam@lab.ge', passwordHash: hash('student123'), createdAt: t, blocked: false },
      { id: 'u_s3', role: 'student', name: 'ლუკა ჯაფარიძე', email: 'luka@lab.ge', passwordHash: hash('student123'), createdAt: t, blocked: false },
      { id: 'u_s4', role: 'student', name: 'ანა წიკლაური', email: 'ana@lab.ge', passwordHash: hash('student123'), createdAt: t, blocked: false },
    ];
    const classes = [
      { id: 'c_1', name: 'IX-ა — ფიზიკა და ტექნოლოგიები', subject: 'ფიზიკა / ტექნოლოგიები', teacherId: 'u_t1', code: 'LAB9A1', studentIds: ['u_s1', 'u_s2', 'u_s3'], createdAt: t },
      { id: 'c_2', name: 'X-ბ — STEM კლუბი', subject: 'STEM', teacherId: 'u_t1', code: 'STEM10', studentIds: ['u_s2', 'u_s4'], createdAt: t },
      { id: 'c_3', name: 'XI-გ — ქიმია', subject: 'ქიმია', teacherId: 'u_t2', code: 'CHEM11', studentIds: ['u_s3'], createdAt: t },
    ];
    const assignments = [
      { id: 'a_1', classId: 'c_1', teacherId: 'u_t1', lab: 'tech', exerciseKey: 'blink', params: { intervalMs: 500 },
        title: 'LED-ის ციმციმი (500 მწ)', instructions: 'დაწერე პროგრამა, რომელიც წითელ LED-ს (პინი 13) ყოველ 500 მილიწამში ჩართავს და გამორთავს. გამოიყენე pinMode, digitalWrite და delay.',
        dueDate: dayOffset(7), status: 'active', createdAt: t },
      { id: 'a_2', classId: 'c_1', teacherId: 'u_t1', lab: 'stem', exerciseKey: 'pendulum:period', params: { target: 1.5, tol: 0.05 },
        title: 'ქანქარის პერიოდი 1.5 წმ', instructions: 'შეცვალე ქანქარის სიგრძე ისე, რომ რხევის პერიოდი 1.5 წამი გახდეს. ჩაიწერე, რა სიგრძე მიიღე და რატომ.',
        dueDate: dayOffset(5), status: 'active', createdAt: t },
      { id: 'a_3', classId: 'c_1', teacherId: 'u_t1', lab: 'tech', exerciseKey: 'button-led', params: {},
        title: 'ღილაკით მართვადი LED', instructions: 'როცა ღილაკს (პინი 2) აჭერ, ყვითელი LED (პინი 12) უნდა ანთდეს, ხელის აშვებისას — ჩაქრეს.',
        dueDate: dayOffset(10), status: 'active', createdAt: t },
      { id: 'a_4', classId: 'c_2', teacherId: 'u_t1', lab: 'stem', exerciseKey: 'ph:neutral', params: { target: 7, tol: 0.3 },
        title: 'ნეიტრალიზაცია (pH 7)', instructions: 'დაამატე ტუტე (NaOH) მჟავას ისე, რომ ხსნარის pH 7-ს მიუახლოვდეს (±0.3).',
        dueDate: dayOffset(-1), status: 'active', createdAt: t },
      { id: 'a_5', classId: 'c_2', teacherId: 'u_t1', lab: 'stem', exerciseKey: 'heating:thermostat', params: { target: 60, tol: 3 },
        title: 'თერმოსტატი კოდით', instructions: 'კოდის ხიდში დაწერე წესი, რომელიც გამათბობელს მართავს და წყლის ტემპერატურას 60 °C-ის ახლოს (±3) ინარჩუნებს.',
        dueDate: dayOffset(14), status: 'active', createdAt: t },
    ];
    const blinkCode = `void setup() {\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(500);\n  digitalWrite(13, LOW);\n  delay(500);\n}\n`;
    const submissions = [
      { id: 's_1', assignmentId: 'a_1', studentId: 'u_s1', passed: true, score: 100, message: 'ყველა შემოწმება გავიდა',
        payload: { code: blinkCode, checks: [{ label: 'LED 13 ციმციმებს', ok: true }, { label: 'ინტერვალი ≈ 500 მწ', ok: true }] },
        attempts: 2, submittedAt: t, late: false, feedback: 'ძალიან კარგი! სცადე millis()-ით იგივე.', grade: null },
      { id: 's_2', assignmentId: 'a_2', studentId: 'u_s2', passed: false, score: 0, message: 'T = 1.738 წმ — შეამცირე სიგრძე',
        payload: { values: { L: 0.75, g: 9.81, a0: 20, b: 0 }, rule: '' }, attempts: 1, submittedAt: t, late: false, feedback: '', grade: null },
      { id: 's_3', assignmentId: 'a_2', studentId: 'u_s3', passed: true, score: 100, message: 'T = 1.504 წმ',
        payload: { values: { L: 0.56, g: 9.81, a0: 20, b: 0 }, rule: '' }, attempts: 3, submittedAt: t, late: false, feedback: '', grade: null },
    ];
    return {
      version: 3,
      users, classes, assignments, submissions,
      progress: { u_s1: { 'tech:blink': { passed: true, at: t } } },
      drafts: {},
      settings: {
        modules: { tech: true, stem: true },
        subjects: { physics: true, chemistry: true, math: true },
        allowTeacherRegistration: true,
        allowStudentRegistration: true,
        schoolName: 'საჯარო სკოლა №1',
      },
    };
  }

  /** სადემონსტრაციო სქემები (Tinkercad-ის მსგავსი „ჩემი სქემები“) */
  function seedDesigns() {
    const T = (VL.Circuit && VL.Circuit.TEMPLATES) || [];
    const mk = (owner, key, name) => { const t = T.find((x) => x.key === key); if (!t) return null; const n = now(); return { id: uid('dz'), ownerId: owner, name, parts: clone(t.parts), wires: clone(t.wires), code: t.code, createdAt: n, updatedAt: n }; };
    return [mk('u_s1', 'blink', 'ჩემი პირველი ციმციმი'), mk('u_s1', 'button', 'ღილაკი დაფაზე'), mk('u_t1', 'motor', 'გაკვეთილი: ძრავა და ტრანზისტორი')].filter(Boolean);
  }

  /* ---------- ჩატვირთვა / შენახვა ---------- */
  let db = null;
  function load() {
    try { db = JSON.parse(LS.get(CONFIG.storageKey) || 'null'); } catch (e) { db = null; }
    if (!db || db.version !== 3 || !Array.isArray(db.users)) db = seed();
    if (!Array.isArray(db.designs)) db.designs = seedDesigns();
    ensureSingleAdmin();
    save();
  }
  function save() { LS.set(CONFIG.storageKey, JSON.stringify(db)); }

  /** სისტემაში ყოველთვის ზუსტად ერთი ადმინი */
  function ensureSingleAdmin() {
    const admins = db.users.filter((u) => u.role === 'admin');
    if (admins.length === 0) {
      db.users.unshift({ id: 'u_admin', role: 'admin', name: CONFIG.admin.name, email: CONFIG.admin.email, passwordHash: hash(CONFIG.admin.password), createdAt: now(), blocked: false });
    } else if (admins.length > 1) {
      admins.slice(1).forEach((u) => { u.role = 'teacher'; });
    }
  }

  const pub = (u) => { if (!u) return null; const { passwordHash, ...rest } = u; return clone(rest); };
  const userById = (id) => db.users.find((u) => u.id === id);
  const classById = (id) => db.classes.find((c) => c.id === id);
  const asgById = (id) => db.assignments.find((a) => a.id === id);

  function validateUserFields({ name, email, password }, requirePassword = true) {
    if (!name || name.trim().length < 2) fail('სახელი უნდა შეიცავდეს მინიმუმ 2 სიმბოლოს');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail(email))) fail('ელ-ფოსტის ფორმატი არასწორია');
    if (requirePassword && (!password || password.length < 6)) fail('პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო');
  }

  /** დავალების სტატუსი: active | overdue | closed */
  function asgState(a) {
    if (a.status === 'closed') return 'closed';
    if (a.dueDate && a.dueDate < new Date().toISOString().slice(0, 10)) return 'overdue';
    return 'active';
  }

  load();

  /* ============================================================
   * API
   * ============================================================ */
  const api = {
    asgState,

    /* ---- სესია / ავტორიზაცია ---- */
    sessionUserSync() {
      const s = LS.get(CONFIG.sessionKey);
      if (!s) return null;
      const u = userById(s);
      if (!u || u.blocked) return null;
      return pub(u);
    },
    async login(email, password) {
      const u = db.users.find((x) => x.email === normEmail(email));
      if (!u || u.passwordHash !== hash(password)) fail('ელ-ფოსტა ან პაროლი არასწორია');
      if (u.blocked) fail('ანგარიში დაბლოკილია. დაუკავშირდით ადმინისტრატორს.');
      u.lastLoginAt = now(); save();
      LS.set(CONFIG.sessionKey, u.id);
      return pub(u);
    },
    async logout() { LS.del(CONFIG.sessionKey); },
    async register({ name, email, password, role, classCode }) {
      validateUserFields({ name, email, password });
      if (role === 'admin') fail('ადმინისტრატორის ანგარიშის შექმნა რეგისტრაციით შეუძლებელია');
      if (!['teacher', 'student'].includes(role)) fail('აირჩიეთ როლი: მასწავლებელი ან მოსწავლე');
      if (role === 'teacher' && !db.settings.allowTeacherRegistration) fail('მასწავლებლის რეგისტრაცია დროებით გამორთულია');
      if (role === 'student' && !db.settings.allowStudentRegistration) fail('მოსწავლის რეგისტრაცია დროებით გამორთულია');
      if (db.users.some((u) => u.email === normEmail(email))) fail('ამ ელ-ფოსტით ანგარიში უკვე არსებობს');
      let cls = null;
      if (role === 'student' && classCode) {
        cls = db.classes.find((c) => c.code === String(classCode).trim().toUpperCase());
        if (!cls) fail('კლასის კოდი ვერ მოიძებნა');
      }
      const u = { id: uid('u'), role, name: name.trim(), email: normEmail(email), passwordHash: hash(password), createdAt: now(), blocked: false };
      db.users.push(u);
      if (cls) cls.studentIds.push(u.id);
      save();
      LS.set(CONFIG.sessionKey, u.id);
      return pub(u);
    },
    async changePassword(userId, oldPw, newPw) {
      const u = userById(userId); if (!u) fail('მომხმარებელი ვერ მოიძებნა');
      if (u.passwordHash !== hash(oldPw)) fail('მიმდინარე პაროლი არასწორია');
      if (!newPw || newPw.length < 6) fail('ახალი პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო');
      u.passwordHash = hash(newPw); save();
    },

    /* ---- მომხმარებლები ---- */
    async listUsers(filter = {}) {
      return db.users.filter((u) => !filter.role || u.role === filter.role).map(pub);
    },
    async getUser(id) { return pub(userById(id)); },
    async updateUser(id, patch) {
      const u = userById(id); if (!u) fail('მომხმარებელი ვერ მოიძებნა');
      if (patch.role !== undefined) {
        if (patch.role === 'admin') fail('მეორე ადმინისტრატორის შექმნა შეუძლებელია');
        if (u.role === 'admin') fail('ადმინისტრატორის როლის შეცვლა შეუძლებელია');
        if (!['teacher', 'student'].includes(patch.role)) fail('არასწორი როლი');
        u.role = patch.role;
      }
      if (patch.blocked !== undefined) { if (u.role === 'admin') fail('ადმინისტრატორის დაბლოკვა შეუძლებელია'); u.blocked = !!patch.blocked; }
      if (patch.name !== undefined) { if (patch.name.trim().length < 2) fail('სახელი ძალიან მოკლეა'); u.name = patch.name.trim(); }
      if (patch.email !== undefined) {
        const e = normEmail(patch.email);
        if (db.users.some((x) => x.email === e && x.id !== id)) fail('ეს ელ-ფოსტა დაკავებულია');
        u.email = e;
      }
      save(); return pub(u);
    },
    async resetPassword(id, newPw) {
      const u = userById(id); if (!u) fail('მომხმარებელი ვერ მოიძებნა');
      if (!newPw || newPw.length < 6) fail('პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო');
      u.passwordHash = hash(newPw); save();
    },
    async deleteUser(id) {
      const u = userById(id); if (!u) fail('მომხმარებელი ვერ მოიძებნა');
      if (u.role === 'admin') fail('ადმინისტრატორის წაშლა შეუძლებელია');
      if (u.role === 'teacher' && db.classes.some((c) => c.teacherId === id)) fail('მასწავლებელს აქვს კლასები — ჯერ წაშალეთ ან გადაეცით კლასები');
      db.users = db.users.filter((x) => x.id !== id);
      db.classes.forEach((c) => { c.studentIds = c.studentIds.filter((s) => s !== id); });
      db.submissions = db.submissions.filter((s) => s.studentId !== id);
      db.designs = db.designs.filter((d) => d.ownerId !== id);
      delete db.progress[id];
      save();
    },

    /* ---- კლასები ---- */
    async listClasses(filter = {}) {
      let list = db.classes;
      if (filter.teacherId) list = list.filter((c) => c.teacherId === filter.teacherId);
      if (filter.studentId) list = list.filter((c) => c.studentIds.includes(filter.studentId));
      return clone(list.map((c) => ({ ...c, teacherName: (userById(c.teacherId) || {}).name || '—' })));
    },
    async getClass(id) {
      const c = classById(id); if (!c) fail('კლასი ვერ მოიძებნა');
      return clone({ ...c, teacherName: (userById(c.teacherId) || {}).name || '—' });
    },
    async createClass({ name, subject, teacherId }) {
      if (!name || name.trim().length < 2) fail('მიუთითეთ კლასის სახელი');
      const t = userById(teacherId); if (!t || t.role !== 'teacher') fail('კლასის შექმნა მხოლოდ მასწავლებელს შეუძლია');
      let code; do { code = genCode(); } while (db.classes.some((c) => c.code === code));
      const c = { id: uid('c'), name: name.trim(), subject: (subject || '').trim(), teacherId, code, studentIds: [], createdAt: now() };
      db.classes.push(c); save(); return clone(c);
    },
    async updateClass(id, patch) {
      const c = classById(id); if (!c) fail('კლასი ვერ მოიძებნა');
      if (patch.name !== undefined) { if (patch.name.trim().length < 2) fail('სახელი ძალიან მოკლეა'); c.name = patch.name.trim(); }
      if (patch.subject !== undefined) c.subject = patch.subject.trim();
      if (patch.teacherId !== undefined) { const t = userById(patch.teacherId); if (!t || t.role !== 'teacher') fail('არასწორი მასწავლებელი'); c.teacherId = t.id; }
      if (patch.regenerateCode) { let code; do { code = genCode(); } while (db.classes.some((x) => x.code === code)); c.code = code; }
      save(); return clone(c);
    },
    async deleteClass(id) {
      const ids = db.assignments.filter((a) => a.classId === id).map((a) => a.id);
      db.submissions = db.submissions.filter((s) => !ids.includes(s.assignmentId));
      db.assignments = db.assignments.filter((a) => a.classId !== id);
      db.classes = db.classes.filter((c) => c.id !== id);
      save();
    },
    async addStudentToClass(classId, studentIdOrEmail) {
      const c = classById(classId); if (!c) fail('კლასი ვერ მოიძებნა');
      const s = userById(studentIdOrEmail) || db.users.find((u) => u.email === normEmail(studentIdOrEmail));
      if (!s) fail('მოსწავლე ვერ მოიძებნა');
      if (s.role !== 'student') fail('ეს ანგარიში მოსწავლის არ არის');
      if (c.studentIds.includes(s.id)) fail('მოსწავლე უკვე ამ კლასშია');
      c.studentIds.push(s.id); save(); return pub(s);
    },
    async removeStudentFromClass(classId, studentId) {
      const c = classById(classId); if (!c) fail('კლასი ვერ მოიძებნა');
      c.studentIds = c.studentIds.filter((x) => x !== studentId); save();
    },
    async joinClassByCode(studentId, code) {
      const c = db.classes.find((x) => x.code === String(code || '').trim().toUpperCase());
      if (!c) fail('ასეთი კოდით კლასი ვერ მოიძებნა');
      if (c.studentIds.includes(studentId)) fail('უკვე ამ კლასის წევრი ხარ');
      c.studentIds.push(studentId); save(); return clone(c);
    },

    /* ---- დავალებები ---- */
    async listAssignments(filter = {}) {
      let list = db.assignments;
      if (filter.classId) list = list.filter((a) => a.classId === filter.classId);
      if (filter.teacherId) list = list.filter((a) => a.teacherId === filter.teacherId);
      if (filter.studentId) {
        const cids = db.classes.filter((c) => c.studentIds.includes(filter.studentId)).map((c) => c.id);
        list = list.filter((a) => cids.includes(a.classId));
      }
      return clone(list.map((a) => ({ ...a, state: asgState(a), className: (classById(a.classId) || {}).name || '—' })))
        .sort((x, y) => (x.dueDate || '').localeCompare(y.dueDate || ''));
    },
    async getAssignment(id) {
      const a = asgById(id); if (!a) fail('დავალება ვერ მოიძებნა');
      return clone({ ...a, state: asgState(a), className: (classById(a.classId) || {}).name || '—' });
    },
    async createAssignment(data) {
      const c = classById(data.classId); if (!c) fail('აირჩიეთ კლასი');
      if (!data.title || data.title.trim().length < 3) fail('მიუთითეთ დავალების სათაური');
      if (!['tech', 'stem'].includes(data.lab)) fail('აირჩიეთ ლაბორატორია');
      if (!data.exerciseKey) fail('აირჩიეთ სავარჯიშო');
      const a = {
        id: uid('a'), classId: c.id, teacherId: data.teacherId || c.teacherId, lab: data.lab, exerciseKey: data.exerciseKey,
        params: data.params || {}, title: data.title.trim(), instructions: (data.instructions || '').trim(),
        dueDate: data.dueDate || null, status: 'active', createdAt: now(),
      };
      db.assignments.push(a); save(); return clone(a);
    },
    async updateAssignment(id, patch) {
      const a = asgById(id); if (!a) fail('დავალება ვერ მოიძებნა');
      ['title', 'instructions', 'dueDate', 'status', 'params'].forEach((k) => { if (patch[k] !== undefined) a[k] = patch[k]; });
      save(); return clone(a);
    },
    async deleteAssignment(id) {
      db.assignments = db.assignments.filter((a) => a.id !== id);
      db.submissions = db.submissions.filter((s) => s.assignmentId !== id);
      save();
    },

    /* ---- ნამუშევრები (submissions) ---- */
    async listSubmissions(filter = {}) {
      let list = db.submissions;
      if (filter.assignmentId) list = list.filter((s) => s.assignmentId === filter.assignmentId);
      if (filter.studentId) list = list.filter((s) => s.studentId === filter.studentId);
      if (filter.teacherId) {
        const aids = db.assignments.filter((a) => a.teacherId === filter.teacherId).map((a) => a.id);
        list = list.filter((s) => aids.includes(s.assignmentId));
      }
      return clone(list.map((s) => ({ ...s, studentName: (userById(s.studentId) || {}).name || '—', assignmentTitle: (asgById(s.assignmentId) || {}).title || '—' })))
        .sort((x, y) => (y.submittedAt || '').localeCompare(x.submittedAt || ''));
    },
    async submit({ assignmentId, studentId, passed, score, message, payload }) {
      const a = asgById(assignmentId); if (!a) fail('დავალება ვერ მოიძებნა');
      const c = classById(a.classId);
      if (!c || !c.studentIds.includes(studentId)) fail('ამ დავალების გაგზავნის უფლება არ გაქვს');
      if (a.status === 'closed') fail('დავალება დახურულია — გაგზავნა შეუძლებელია');
      const late = asgState(a) === 'overdue';
      let s = db.submissions.find((x) => x.assignmentId === assignmentId && x.studentId === studentId);
      if (!s) { s = { id: uid('s'), assignmentId, studentId, attempts: 0, feedback: '', grade: null }; db.submissions.push(s); }
      Object.assign(s, { passed: !!passed, score: Math.round(score || 0), message: message || '', payload: payload || {}, submittedAt: now(), late });
      s.attempts = (s.attempts || 0) + 1;
      save(); return clone(s);
    },
    async reviewSubmission(id, { feedback, grade }) {
      const s = db.submissions.find((x) => x.id === id); if (!s) fail('ნამუშევარი ვერ მოიძებნა');
      if (feedback !== undefined) s.feedback = feedback;
      if (grade !== undefined) s.grade = grade === '' || grade === null ? null : Math.max(0, Math.min(100, Number(grade)));
      save(); return clone(s);
    },

    /* ---- თავისუფალი პრაქტიკის პროგრესი და დრაფტები ---- */
    async saveProgress(userId, key, passed) {
      db.progress[userId] = db.progress[userId] || {};
      const prev = db.progress[userId][key];
      if (!prev || !prev.passed) db.progress[userId][key] = { passed: !!passed, at: now() };
      save();
    },
    async getProgress(userId) { return clone(db.progress[userId] || {}); },
    saveDraftSync(userId, key, data) {
      db.drafts[userId] = db.drafts[userId] || {};
      db.drafts[userId][key] = data; save();
    },
    getDraftSync(userId, key) { return clone(((db.drafts[userId] || {})[key])); },

    /* ---- სქემები (სქემის კონსტრუქტორი) ---- */
    async listDesigns(ownerId) {
      return clone(db.designs.filter((d) => d.ownerId === ownerId && !d.hidden).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')));
    },
    getDesignSync(id) { return clone(db.designs.find((d) => d.id === id)); },
    findDesignSync(ownerId, key) { return clone(db.designs.find((d) => d.ownerId === ownerId && d.key === key)); },
    saveDesignSync(design) {
      const i = db.designs.findIndex((d) => d.id === design.id);
      const d = { ...clone(design), updatedAt: now() };
      if (!d.id) d.id = uid('dz');
      if (!d.createdAt) d.createdAt = d.updatedAt;
      if (i >= 0) db.designs[i] = d; else db.designs.push(d);
      save(); return clone(d);
    },
    async deleteDesign(id) { db.designs = db.designs.filter((d) => d.id !== id); save(); },

    /* ---- პარამეტრები ---- */
    getSettingsSync() { return clone(db.settings); },
    async updateSettings(patch) {
      db.settings = { ...db.settings, ...patch,
        modules: { ...db.settings.modules, ...(patch.modules || {}) },
        subjects: { ...db.settings.subjects, ...(patch.subjects || {}) } };
      save(); return clone(db.settings);
    },

    /* ---- ადმინისტრირება ---- */
    async stats() {
      return {
        users: db.users.length,
        teachers: db.users.filter((u) => u.role === 'teacher').length,
        students: db.users.filter((u) => u.role === 'student').length,
        classes: db.classes.length,
        assignments: db.assignments.length,
        submissions: db.submissions.length,
        passed: db.submissions.filter((s) => s.passed).length,
      };
    },
    async exportData() { const d = clone(db); d.users.forEach((u) => { u.passwordHash = '***'; }); return d; },
    async resetDemo() { db = seed(); db.designs = seedDesigns(); save(); LS.del(CONFIG.sessionKey); },
  };

  VL.api = api;
})(window.VL);
