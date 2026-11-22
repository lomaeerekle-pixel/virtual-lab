/* ============================================================
 * stem/registry.js — STEM სიმულაციების რეესტრი და ხატვის დამხმარეები
 *
 * სიმულაციის ინტერფეისი:
 * {
 *   key, subject: 'physics'|'chemistry'|'math', title, icon, summary,
 *   vars: [{key,label,min,max,step,value,unit,type?:'range'|'select'|'toggle',options?,reset?,live?}],
 *   presets: [{label, values}], actions?: [{label, run(state)}],
 *   animated: bool,               // აქვს თუ არა ▶/⏸
 *   create(): state, reset(state), step(state, dt), draw(ctx, state, w, h),
 *   readouts(state) => [[label, value]],
 *   onPointer?(state, x, y, w, h),
 *   bridge: { vars(state) => {...}, writable: [{key,label,value}], example, doc },
 *   challenges: [{ key, title, kind:'state'|'rule'|'sim', params:[...], text(p), check(state, p, ctx) | vectors(p) }]
 * }
 * ============================================================ */
(function (VL) {
  'use strict';
  const S = VL.STEM = {
    sims: [],
    subjects: {
      physics: { title: 'ფიზიკა', icon: '⚛️', desc: 'მოძრაობა, რხევა, წრედები, ოპტიკა' },
      chemistry: { title: 'ქიმია / საბუნებისმეტყველო', icon: '⚗️', desc: 'pH, რეაქციები, ტემპერატურა' },
      math: { title: 'მათემატიკა', icon: '📐', desc: 'ფუნქციები, გრაფიკები, კოორდინატები' },
      biology: { title: 'ბიოლოგია', icon: '🌿', desc: 'ფოტოსინთეზი, პოპულაციები, გენეტიკა, ფერმენტები' },
      earth: { title: 'გეოგრაფია / დედამიწა', icon: '🌍', desc: 'წელიწადის დროები, კლიმატი და სათბურის ეფექტი' },
      astro: { title: 'ასტრონომია', icon: '🪐', desc: 'პლანეტების ორბიტები, მთვარის ფაზები' },
      cs: { title: 'ინფორმატიკა', icon: '💾', desc: 'ლოგიკური ელემენტები, ორობითი რიცხვები' },
    },
    register(sim) { this.sims.push(sim); },
    get(key) { return this.sims.find((s) => s.key === key) || null; },
    /** "pendulum:period" → { sim, ch } */
    resolve(composite) {
      const [sk, ck] = String(composite || '').split(':');
      const sim = this.get(sk);
      const ch = sim ? (sim.challenges || []).find((c) => c.key === ck) : null;
      return { sim, ch };
    },
    defaults(sim) { return Object.fromEntries(sim.vars.map((v) => [v.key, v.value])); },
    paramsOf(ch, override) {
      const p = Object.fromEntries((ch.params || []).map((x) => [x.key, x.value]));
      Object.entries(override || {}).forEach(([k, v]) => {
        const def = (ch.params || []).find((x) => x.key === k);
        p[k] = def && def.type === 'text' ? String(v) : (v === '' || v === null || isNaN(Number(v)) ? p[k] : Number(v));
      });
      return p;
    },
    makeState(sim, values) {
      const s = sim.create ? sim.create() : {};
      s.v = { ...S.defaults(sim), ...(values || {}) };
      s.ctrl = Object.fromEntries(((sim.bridge && sim.bridge.writable) || []).map((w) => [w.key, w.value]));
      s.t = 0; s.led = null; s.alarm = null; s.logs = []; s.active = s.active || null;
      if (sim.reset) sim.reset(s);
      return s;
    },
  };

  /* ---------- ხატვის დამხმარეები ---------- */
  const D = S.draw = {};
  D.FONT = '"Noto Sans Georgian", system-ui, sans-serif';
  D.text = (ctx, str, x, y, o = {}) => {
    ctx.save();
    ctx.fillStyle = o.color || '#212529';
    ctx.font = `${o.weight || 500} ${o.size || 12}px ${o.mono ? '"JetBrains Mono", monospace' : D.FONT}`;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'alphabetic';
    if (o.bg) {
      const m = ctx.measureText(str); const pad = 4; const hgt = (o.size || 12) + 6;
      let bx = x - pad; if (ctx.textAlign === 'center') bx = x - m.width / 2 - pad; else if (ctx.textAlign === 'right') bx = x - m.width - pad;
      ctx.fillStyle = o.bg; D.rrect(ctx, bx, y - hgt + 4, m.width + pad * 2, hgt, 4); ctx.fill();
      ctx.fillStyle = o.color || '#212529';
    }
    ctx.fillText(str, x, y);
    ctx.restore();
  };
  D.rrect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };
  D.arrow = (ctx, x1, y1, x2, y2, color = '#212529', w = 2, head = 9) => {
    const a = Math.atan2(y2 - y1, x2 - x1);
    ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(a - 0.4), y2 - head * Math.sin(a - 0.4));
    ctx.lineTo(x2 - head * Math.cos(a + 0.4), y2 - head * Math.sin(a + 0.4));
    ctx.closePath(); ctx.fill(); ctx.restore();
  };
  /** კოორდინატთა სისტემა ბადით; აბრუნებს გარდაქმნის ფუნქციებს */
  D.plot = (ctx, x0, y0, w, h, r, o = {}) => {
    const X = (x) => x0 + (x - r.xmin) / (r.xmax - r.xmin) * w;
    const Y = (y) => y0 + h - (y - r.ymin) / (r.ymax - r.ymin) * h;
    const ix = (px) => r.xmin + (px - x0) / w * (r.xmax - r.xmin);
    const iy = (py) => r.ymin + (y0 + h - py) / h * (r.ymax - r.ymin);
    ctx.save();
    ctx.fillStyle = o.bg || '#fff'; ctx.fillRect(x0, y0, w, h);
    const sx = o.stepX || niceStep(r.xmax - r.xmin), sy = o.stepY || niceStep(r.ymax - r.ymin);
    ctx.strokeStyle = '#e9ecef'; ctx.lineWidth = 1;
    for (let x = Math.ceil(r.xmin / sx) * sx; x <= r.xmax + 1e-9; x += sx) { ctx.beginPath(); ctx.moveTo(X(x), y0); ctx.lineTo(X(x), y0 + h); ctx.stroke(); }
    for (let y = Math.ceil(r.ymin / sy) * sy; y <= r.ymax + 1e-9; y += sy) { ctx.beginPath(); ctx.moveTo(x0, Y(y)); ctx.lineTo(x0 + w, Y(y)); ctx.stroke(); }
    ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.5;
    const ax = r.ymin <= 0 && r.ymax >= 0 ? Y(0) : y0 + h;
    const ay = r.xmin <= 0 && r.xmax >= 0 ? X(0) : x0;
    ctx.beginPath(); ctx.moveTo(x0, ax); ctx.lineTo(x0 + w, ax); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ay, y0); ctx.lineTo(ay, y0 + h); ctx.stroke();
    ctx.fillStyle = '#868e96'; ctx.font = `10px ${D.FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let x = Math.ceil(r.xmin / sx) * sx; x <= r.xmax + 1e-9; x += sx) if (Math.abs(x) > 1e-9 || o.zeroLabel) ctx.fillText(fmt(x), X(x), Math.min(ax + 3, y0 + h - 12));
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let y = Math.ceil(r.ymin / sy) * sy; y <= r.ymax + 1e-9; y += sy) if (Math.abs(y) > 1e-9) ctx.fillText(fmt(y), Math.max(ay - 4, x0 + 22), Y(y));
    if (o.xLabel) { ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillStyle = '#495057'; ctx.fillText(o.xLabel, x0 + w - 4, ax - 4); }
    if (o.yLabel) { ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#495057'; ctx.fillText(o.yLabel, ay + 5, y0 + 4); }
    ctx.restore();
    return { X, Y, ix, iy };
  };
  function niceStep(range) {
    const raw = range / 8; const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / p; return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p;
  }
  function fmt(v) { return Math.abs(v) >= 100 || Number.isInteger(Math.round(v * 1000) / 1000) ? String(Math.round(v * 1000) / 1000) : v.toFixed(1); }
  D.fn = (ctx, m, f, xmin, xmax, color, width = 2.5, dash) => {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); let started = false;
    const N = 300;
    for (let i = 0; i <= N; i++) {
      const x = xmin + (xmax - xmin) * i / N; const y = f(x);
      if (!isFinite(y)) { started = false; continue; }
      const py = m.Y(y);
      if (py < -2000 || py > 4000) { started = false; continue; }
      if (!started) { ctx.moveTo(m.X(x), py); started = true; } else ctx.lineTo(m.X(x), py);
    }
    ctx.stroke(); ctx.restore();
  };
  D.dot = (ctx, x, y, r, fill, stroke) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  };
  S.fmt = (v, d = 2) => (Number.isFinite(v) ? Number(v).toFixed(d) : '—');
})(window.VL);
