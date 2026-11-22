/* ============================================================
 * catalog.js — ყველა სავარჯიშოს ერთიანი კატალოგი
 * (გამოიყენება დავალების შექმნისას და ნამუშევრების ჩვენებისას)
 * ============================================================ */
(function (VL) {
  'use strict';
  const T = VL.Tech, S = VL.STEM;
  VL.catalog = {
    /** აბრუნებს [{ lab, key, title, group, params, text(p) }] */
    list() {
      const tech = T.EXERCISES.map((e) => ({ lab: 'tech', key: e.key, title: `${e.icon} ${e.title}`, group: 'ტექნიკური ლაბი · Arduino', params: e.params || [], text: e.text, level: e.level }));
      const circ = (VL.Circuit ? VL.Circuit.CHALLENGES : []).map((c) => ({ lab: 'tech', key: 'circuit:' + c.key, title: `${c.icon} სქემა: ${c.title}`, group: 'ტექნიკური ლაბი · სქემის კონსტრუქტორი', params: [], text: () => c.text, level: c.level }));
      const stem = [];
      S.sims.forEach((sim) => sim.challenges.forEach((ch) => stem.push({
        lab: 'stem', key: sim.key + ':' + ch.key, title: `${sim.icon} ${sim.title} — ${ch.title}`,
        group: 'STEM · ' + S.subjects[sim.subject].title, params: ch.params || [], text: ch.text, kind: ch.kind,
      })));
      return tech.concat(circ, stem);
    },
    get(lab, key) { return this.list().find((x) => x.lab === lab && x.key === key) || null; },
    title(lab, key) { const x = this.get(lab, key); return x ? x.title : key; },
    describe(a) {
      const x = this.get(a.lab, a.exerciseKey);
      if (!x) return '';
      const p = Object.fromEntries(x.params.map((q) => [q.key, q.value]));
      Object.entries(a.params || {}).forEach(([k, v]) => { p[k] = v; });
      try { return x.text(p); } catch (e) { return ''; }
    },
  };
})(window.VL);
