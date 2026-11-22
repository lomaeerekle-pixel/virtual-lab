/* ============================================================
 * tech/circuit/editor.js — სქემის კონსტრუქტორის ტილო (Tinkercad-ის მსგავსი)
 * კომპონენტების განთავსება/გადატანა, სადენები (მოხრის წერტილებით),
 * მონიშვნა, შემობრუნება, წაშლა, გაუქმება/აღდგენა, მასშტაბი და გადაადგილება
 * (თითებით „pinch“-ის ჩათვლით), სიმულაციისას ღილაკების დაჭერა.
 * ============================================================ */
(function (VL) {
  'use strict';
  const CZ = VL.Circuit, P = CZ.PARTS, GRID = CZ.GRID;
  const snap = (v, g = GRID) => Math.round(v / g) * g;
  const esc = (s) => VL.U.esc(s);

  CZ.WIRE_COLORS = [['#2f9e44', 'მწვანე'], ['#e03131', 'წითელი'], ['#343a40', 'შავი'], ['#1c7ed6', 'ლურჯი'], ['#f59f00', 'ყვითელი'], ['#f76707', 'ნარინჯისფერი'], ['#7048e8', 'იისფერი'], ['#868e96', 'ნაცრისფერი']];

  /** სადენის წერტილები: მოხრის წერტილების გარეშე — „L“ ფორმის მარშრუტი */
  CZ.wirePoints = (a, b, pts) => {
    if (pts && pts.length) return [a, ...pts, b];
    if (a[0] === b[0] || a[1] === b[1]) return [a, b];
    const my = Math.round((a[1] + b[1]) / 2 / 10) * 10;
    return [a, [a[0], my], [b[0], my], b];
  };
  const pathD = (pts) => pts.map((q, i) => (i ? 'L' : 'M') + q[0] + ' ' + q[1]).join(' ');

  /** ტერმინალის (ფეხის ან ხვრელის) მსოფლიო კოორდინატები */
  CZ.termWorld = (design, key) => {
    const m = /^([^:.]+):(\d+):(\d+)$/.exec(key);
    if (m) {
      const bb = design.parts.find((p) => p.id === m[1]); if (!bb) return null;
      const row = CZ.BB.ROWS[+m[2]]; if (!row) return null;
      const [x, y] = CZ.rotPt(+m[3] * 20, row.y, bb.rot || 0); return [bb.x + x, bb.y + y];
    }
    const [pid, pin] = key.split('.');
    const part = design.parts.find((p) => p.id === pid); if (!part) return null;
    const pd = (P[part.type].pins || []).find((x) => x.id === pin); if (!pd) return null;
    return CZ.pinWorld(part, pd);
  };

  CZ.bounds = (design) => {
    if (!design.parts.length) return [0, 0, 400, 300];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    design.parts.forEach((p) => { const [x, y, w, h] = CZ.partBox(p); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + w); y1 = Math.max(y1, y + h); });
    return [x0, y0, x1 - x0, y1 - y0];
  };

  const partG = (p) => `<g class="cz-part" data-part="${p.id}" transform="translate(${p.x} ${p.y}) rotate(${p.rot || 0})">${P[p.type].render(p)}</g>`;
  const wireSvg = (design, w, sel) => {
    const a = CZ.termWorld(design, w.a), b = CZ.termWorld(design, w.b); if (!a || !b) return '';
    const d = pathD(CZ.wirePoints(a, b, w.pts));
    return `<g class="cz-wire ${sel ? 'sel' : ''}" data-wire="${w.id}">
      <path d="${d}" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="${w.color || '#2f9e44'}" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="transparent" stroke-width="14" class="wire-hit"/>
      <circle cx="${a[0]}" cy="${a[1]}" r="3.5" fill="${w.color}"/><circle cx="${b[0]}" cy="${b[1]}" r="3.5" fill="${w.color}"/></g>`;
  };

  /** სტატიკური SVG (მინიატურები, მასწავლებლის ნახვა) */
  CZ.staticSvg = (design, cls = 'cz-thumb') => {
    const [x, y, w, h] = CZ.bounds(design); const pad = 30;
    const parts = design.parts.slice().sort((a, b) => (a.type === 'breadboard' ? -1 : 0) - (b.type === 'breadboard' ? -1 : 0));
    return `<svg class="${cls}" viewBox="${x - pad} ${y - pad} ${w + pad * 2} ${h + pad * 2}" preserveAspectRatio="xMidYMid meet">
      ${parts.map(partG).join('')}${design.wires.map((wi) => wireSvg(design, wi)).join('')}</svg>`;
  };

  CZ.Editor = function (host, design, opts = {}) {
    host.innerHTML = `
      <svg class="cz-svg" tabindex="0" aria-label="სქემის ტილო">
        <defs>
          <pattern id="cz-grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1.1" fill="#c9cfd9"/></pattern>
          <filter id="cz-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="6"/></filter>
        </defs>
        <rect class="cz-bg" x="0" y="0" width="100%" height="100%" fill="url(#cz-grid)"/>
        <g class="cz-world"><g class="L-bb"></g><g class="L-parts"></g><g class="L-wires"></g><g class="L-sel" pointer-events="none"></g><g class="L-terms"></g><g class="L-draft" pointer-events="none"></g></g>
      </svg>
      <div class="cz-tip" hidden></div>
      <div class="cz-hint" hidden></div>`;
    const svg = host.querySelector('svg'), world = svg.querySelector('.cz-world'), pattern = svg.querySelector('#cz-grid');
    const L = { bb: svg.querySelector('.L-bb'), parts: svg.querySelector('.L-parts'), wires: svg.querySelector('.L-wires'), sel: svg.querySelector('.L-sel'), terms: svg.querySelector('.L-terms'), draft: svg.querySelector('.L-draft') };
    const tip = host.querySelector('.cz-tip'), hint = host.querySelector('.cz-hint');
    const circuit = opts.circuit;
    const view = { tx: 40, ty: 40, s: 1 };
    let sel = null, mode = 'idle', draft = null, drag = null, panLast = null, pressing = null, wireColor = CZ.WIRE_COLORS[0][0];
    let running = false, readOnly = !!opts.readOnly, rafPending = false;
    const pointers = new Map(); let pinch = null;
    const hist = [], fut = [];
    const partEls = {};

    const applyView = () => {
      world.setAttribute('transform', `translate(${view.tx} ${view.ty}) scale(${view.s})`);
      pattern.setAttribute('patternTransform', `translate(${view.tx} ${view.ty}) scale(${view.s})`);
    };
    const toWorld = (cx, cy) => { const r = svg.getBoundingClientRect(); return [(cx - r.left - view.tx) / view.s, (cy - r.top - view.ty) / view.s]; };
    const snapshot = () => JSON.stringify({ parts: design.parts, wires: design.wires });
    const pushHist = () => { hist.push(snapshot()); if (hist.length > 60) hist.shift(); fut.length = 0; };
    const changed = () => { circuit && circuit.changed(); opts.onChange && opts.onChange(); };
    const showHint = (t) => { hint.hidden = !t; hint.textContent = t || ''; };

    /* ---------- რენდერი ---------- */
    function renderTerms() {
      let s = '';
      design.parts.forEach((p) => {
        if (p.type === 'breadboard') {
          P.breadboard.holes(p).forEach((h) => {
            const [x, y] = CZ.rotPt(h.x, h.y, p.rot || 0);
            s += `<rect class="hole-hit" data-term="${p.id}:${h.r}:${h.c}" x="${p.x + x - 6}" y="${p.y + y - 6}" width="12" height="12" rx="2"/>`;
          });
          return;
        }
        P[p.type].pins.forEach((pin) => {
          const [x, y] = CZ.pinWorld(p, pin);
          s += `<g class="term" data-term="${p.id}.${pin.id}" transform="translate(${x} ${y})"><circle r="9" class="term-hit"/><rect x="-3.5" y="-3.5" width="7" height="7" rx="1.5"/><title>${esc((p.name || p.id) + ': ' + pin.label)}</title></g>`;
        });
      });
      L.terms.innerHTML = s;
    }
    function renderWires() { L.wires.innerHTML = design.wires.map((w) => wireSvg(design, w, sel && sel.kind === 'wire' && sel.id === w.id)).join(''); }
    function renderSel() {
      if (sel && sel.kind === 'part') {
        const p = design.parts.find((x) => x.id === sel.id);
        if (p) { const [x, y, w, h] = CZ.partBox(p); L.sel.innerHTML = `<rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" rx="8" fill="rgba(59,91,219,.06)" stroke="#3b5bdb" stroke-width="${1.5 / view.s}" stroke-dasharray="6 4"/><text x="${x - 4}" y="${y - 12}" font-size="12" fill="#3b5bdb" font-weight="700">${esc(p.name || p.id)}</text>`; return; }
      }
      L.sel.innerHTML = '';
    }
    function renderAll() {
      L.bb.innerHTML = design.parts.filter((p) => p.type === 'breadboard').map(partG).join('');
      L.parts.innerHTML = design.parts.filter((p) => p.type !== 'breadboard').map(partG).join('');
      Object.keys(partEls).forEach((k) => delete partEls[k]);
      svg.querySelectorAll('[data-part]').forEach((g) => { partEls[g.dataset.part] = g; });
      renderWires(); renderSel(); renderTerms(); renderDraft();
      updateDynamic();
    }
    const scheduleRender = () => { if (rafPending) return; rafPending = true; requestAnimationFrame(() => { rafPending = false; renderAll(); }); };
    function renderDraft(cursor) {
      if (!draft) { L.draft.innerHTML = ''; return; }
      const a = CZ.termWorld(design, draft.a); if (!a) return;
      const pts = [a, ...draft.pts, ...(cursor ? [cursor] : [])];
      L.draft.innerHTML = `<path d="${pathD(pts)}" fill="none" stroke="${wireColor}" stroke-width="4" stroke-dasharray="8 5" stroke-linecap="round"/>${draft.pts.map((q) => `<circle cx="${q[0]}" cy="${q[1]}" r="4" fill="${wireColor}"/>`).join('')}`;
    }
    function updateDynamic() {
      const res = (circuit && running) ? circuit.res : {};
      design.parts.forEach((p) => {
        const d = P[p.type]; if (!d.update) return;
        const g = partEls[p.id]; if (!g) return;
        try { d.update(g, p, res[p.id] || {}, { sim: circuit && circuit.sim, running, inputs: circuit ? circuit.inputs[p.id] : null }); } catch (e) { /* ignore */ }
      });
    }

    /* ---------- მოქმედებები ---------- */
    function nextId(prefix) { let i = 1; while (design.parts.some((p) => p.id === prefix + i)) i++; return prefix + i; }
    function addPart(type, wx, wy) {
      const d = P[type];
      if (d.single && design.parts.some((p) => p.type === type)) { VL.U.toast(`${d.name} სქემაში მხოლოდ ერთი შეიძლება იყოს`, 'error'); return null; }
      pushHist();
      const id = nextId(d.prefix);
      const part = { id, name: id, type, x: snap(wx), y: snap(wy), rot: 0, props: JSON.parse(JSON.stringify(d.props || {})) };
      design.parts.push(part);
      if (circuit) circuit.initInputs();
      select('part', id); renderAll(); changed();
      return part;
    }
    function addPartAtCenter(type) {
      const r = svg.getBoundingClientRect();
      const [wx, wy] = toWorld(r.left + r.width / 2, r.top + r.height / 2);
      const d = P[type]; const [bx, by, bw, bh] = d.box;
      // ვეძებთ თავისუფალ ადგილს, რომ კომპონენტები ერთმანეთს არ გადაეფაროს
      const boxes = design.parts.filter((q) => q.type !== 'breadboard').map((q) => CZ.partBox(q));
      const hit = (x, y) => boxes.some(([X, Y, W, H]) => x + bx < X + W + 10 && x + bx + bw + 10 > X && y + by < Y + H + 10 && y + by + bh + 10 > Y);
      let px = snap(wx - bx - bw / 2), py = snap(wy - by - bh / 2);
      for (let i = 0; i < 60 && hit(px, py); i++) { const ring = Math.floor(i / 8) + 1, k = i % 8; px = snap(wx - bx - bw / 2 + [1, -1, 0, 0, 1, -1, 1, -1][k] * ring * (bw + 20)); py = snap(wy - by - bh / 2 + [0, 0, 1, -1, 1, 1, -1, -1][k] * ring * (bh + 20)); }
      return addPart(type, px, py);
    }
    function deleteSelected() {
      if (!sel || readOnly) return;
      pushHist();
      if (sel.kind === 'part') {
        const id = sel.id;
        design.parts = design.parts.filter((p) => p.id !== id);
        design.wires = design.wires.filter((w) => !(w.a.startsWith(id + '.') || w.a.startsWith(id + ':') || w.b.startsWith(id + '.') || w.b.startsWith(id + ':')));
      } else design.wires = design.wires.filter((w) => w.id !== sel.id);
      sel = null; opts.onSelect && opts.onSelect(null); renderAll(); changed();
    }
    function rotateSelected() {
      if (!sel || sel.kind !== 'part' || readOnly) return;
      const p = design.parts.find((x) => x.id === sel.id); if (!p) return;
      pushHist(); p.rot = ((p.rot || 0) + 90) % 360; renderAll(); changed();
    }
    function select(kind, id, source) {
      sel = kind ? { kind, id } : null;
      renderSel(); renderWires();
      opts.onSelect && opts.onSelect(sel, source);
    }
    function restore(json) { const o = JSON.parse(json); design.parts = o.parts; design.wires = o.wires; sel = null; opts.onSelect && opts.onSelect(null); renderAll(); changed(); }
    function undo() { if (!hist.length) return; fut.push(snapshot()); restore(hist.pop()); }
    function redo() { if (!fut.length) return; hist.push(snapshot()); restore(fut.pop()); }
    function finishWire(termKey) {
      if (!draft) return;
      if (termKey !== draft.a && !design.wires.some((w) => (w.a === draft.a && w.b === termKey) || (w.b === draft.a && w.a === termKey))) {
        pushHist();
        let i = 1; while (design.wires.some((w) => w.id === 'w' + i)) i++;
        design.wires.push({ id: 'w' + i, a: draft.a, b: termKey, pts: draft.pts, color: wireColor });
        changed();
      }
      draft = null; mode = 'idle'; showHint(''); renderAll();
    }
    function cancelWire() { draft = null; mode = 'idle'; showHint(''); renderDraft(); }
    function fit() {
      const r = svg.getBoundingClientRect(); if (!r.width) return;
      const [x, y, w, h] = CZ.bounds(design); const pad = 40;
      view.s = Math.max(0.25, Math.min(1.6, Math.min((r.width - pad * 2) / Math.max(w, 100), (r.height - pad * 2) / Math.max(h, 100))));
      view.tx = (r.width - w * view.s) / 2 - x * view.s; view.ty = (r.height - h * view.s) / 2 - y * view.s;
      applyView(); renderSel();
    }
    function zoomBy(f, cx, cy) {
      const r = svg.getBoundingClientRect();
      if (cx === undefined) { cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
      const [wx, wy] = toWorld(cx, cy);
      view.s = Math.max(0.2, Math.min(3, view.s * f));
      view.tx = cx - r.left - wx * view.s; view.ty = cy - r.top - wy * view.s;
      applyView();
    }

    /* ---------- მაჩვენებლის მოვლენები ---------- */
    function onDown(e) {
      svg.focus({ preventScroll: true });
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (pointers.size === 2) {
        const [p1, p2] = [...pointers.values()];
        pinch = { d: Math.hypot(p1[0] - p2[0], p1[1] - p2[1]), cx: (p1[0] + p2[0]) / 2, cy: (p1[1] + p2[1]) / 2 };
        if (drag) drag = null; mode = draft ? 'wire' : 'pinch'; return;
      }
      try { svg.setPointerCapture(e.pointerId); } catch (err) { /* */ }
      const t = e.target;
      const term = t.closest('[data-term]'), partEl = t.closest('[data-part]'), wireEl = t.closest('[data-wire]');
      const [wx, wy] = toWorld(e.clientX, e.clientY);
      if (mode === 'wire' && draft) {
        if (term) finishWire(term.dataset.term);
        else { draft.pts.push([snap(wx, 10), snap(wy, 10)]); renderDraft([wx, wy]); }
        return;
      }
      if (term && !readOnly && !(running && partEl && P[design.parts.find((p) => p.id === partEl.dataset.part).type].interactive)) {
        draft = { a: term.dataset.term, pts: [] }; mode = 'wire';
        showHint('დააჭირე სხვა ფეხს ან ხვრელს სადენის დასასრულებლად · ცარიელ ადგილზე დაჭერა — მოხრის წერტილი · Esc — გაუქმება');
        renderDraft([wx, wy]); return;
      }
      if (partEl) {
        const pid = partEl.dataset.part, part = design.parts.find((p) => p.id === pid), d = P[part.type];
        select('part', pid, 'user');
        if (running && d.interactive === 'press') { pressing = pid; circuit.setInput(pid, 'pressed', true); updateDynamic(); return; }
        if (running && d.interactive === 'toggle') { part.props.on = !part.props.on; circuit.changed(); updateDynamic(); opts.onChange && opts.onChange(); return; }
        if (!readOnly) { drag = { pid, ox: wx - part.x, oy: wy - part.y, moved: false }; mode = 'drag'; }
        return;
      }
      if (wireEl) select('wire', wireEl.dataset.wire);
      else select(null);
      mode = 'pan'; panLast = [e.clientX, e.clientY];
    }
    function onMove(e) {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (pinch && pointers.size === 2) {
        const [p1, p2] = [...pointers.values()];
        const d = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]), cx = (p1[0] + p2[0]) / 2, cy = (p1[1] + p2[1]) / 2;
        zoomBy(d / pinch.d, cx, cy); view.tx += cx - pinch.cx; view.ty += cy - pinch.cy; applyView();
        pinch = { d, cx, cy }; return;
      }
      const [wx, wy] = toWorld(e.clientX, e.clientY);
      if (mode === 'drag' && drag) {
        const part = design.parts.find((p) => p.id === drag.pid); if (!part) return;
        const nx = snap(wx - drag.ox), ny = snap(wy - drag.oy);
        if (nx !== part.x || ny !== part.y) { if (!drag.moved) { pushHist(); drag.moved = true; } part.x = nx; part.y = ny; if (circuit) circuit.changed(); scheduleRender(); }
      } else if (mode === 'pan' && panLast) {
        view.tx += e.clientX - panLast[0]; view.ty += e.clientY - panLast[1]; panLast = [e.clientX, e.clientY]; applyView();
      } else if (mode === 'wire' && draft) renderDraft([wx, wy]);
      // მინიშნება სიმულაციისას
      if (running && circuit && e.pointerType !== 'touch') {
        const pe = e.target.closest && e.target.closest('[data-part]');
        if (pe) { const r = host.getBoundingClientRect(); tip.hidden = false; tip.textContent = circuit.describe(pe.dataset.part); tip.style.left = (e.clientX - r.left + 14) + 'px'; tip.style.top = (e.clientY - r.top + 14) + 'px'; }
        else tip.hidden = true;
      }
    }
    function onUp(e) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pressing) { circuit.setInput(pressing, 'pressed', false); pressing = null; updateDynamic(); }
      if (mode === 'drag' && drag && drag.moved) { renderAll(); opts.onChange && opts.onChange(); }
      drag = null; panLast = null;
      if (mode !== 'wire') mode = 'idle';
    }
    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', onUp);
    svg.addEventListener('pointercancel', onUp);
    svg.addEventListener('pointerleave', () => { tip.hidden = true; });
    svg.addEventListener('dblclick', () => { if (draft) cancelWire(); });
    svg.addEventListener('contextmenu', (e) => { if (draft) { e.preventDefault(); cancelWire(); } });
    svg.addEventListener('wheel', (e) => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY); }, { passive: false });
    const onKey = (e) => {
      if (/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) return;
      if (!host.isConnected) return;
      if (e.key === 'Escape') { if (draft) cancelWire(); else select(null); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && sel) { e.preventDefault(); deleteSelected(); }
      else if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) rotateSelected();
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    };
    document.addEventListener('keydown', onKey);
    const ro = new ResizeObserver(() => applyView()); ro.observe(host);

    applyView(); renderAll();
    requestAnimationFrame(fit);

    return {
      svg, design: () => design,
      setDesign(d) { design = d; sel = null; renderAll(); },
      renderAll, updateDynamic, addPart, addPartAtCenter, toWorld, deleteSelected, rotateSelected, undo, redo, fit, zoomBy, select,
      selected: () => sel,
      setWireColor(c) { wireColor = c; if (sel && sel.kind === 'wire') { const w = design.wires.find((x) => x.id === sel.id); if (w) { pushHist(); w.color = c; renderWires(); opts.onChange && opts.onChange(); } } },
      setRunning(r) { running = r; tip.hidden = true; updateDynamic(); },
      cancelWire,
      destroy() { document.removeEventListener('keydown', onKey); ro.disconnect(); },
    };
  };
})(window.VL);
