/* ============================================================
 * codeutil.js — კოდის ტექსტური დამუშავების ინსტრუმენტები
 * (გამოიყენება ტექნიკური ლაბის ტრანსპაილერსა და STEM "კოდის ხიდში")
 * ============================================================ */
(function (VL) {
  'use strict';
  const C = {};

  /** კომენტარების წაშლა და სტრიქონების ჩანაცვლება __S0__ ტიპის ნიშნებით */
  C.mask = (src) => {
    const strs = [];
    let out = '';
    let i = 0;
    let unterminated = null;
    let line = 1;
    while (i < src.length) {
      const c = src[i], n = src[i + 1];
      if (c === '\n') line++;
      if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (c === '/' && n === '*') {
        i += 2;
        while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') { out += '\n'; line++; } i++; }
        i += 2; continue;
      }
      if (c === '"' || c === "'") {
        let j = i + 1;
        while (j < src.length && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') j++; j++; }
        if (src[j] !== c && unterminated === null) unterminated = line;
        strs.push(src.slice(i, j + 1));
        out += '__S' + (strs.length - 1) + '__';
        i = j + 1; continue;
      }
      out += c; i++;
    }
    return { code: out, strs, unterminated };
  };

  C.unmask = (code, strs) => code.replace(/__S(\d+)__/g, (m, k) => strs[+k]);

  const OPEN = '([{', CLOSE = ')]}';
  /** შესაბამისი დამხურავი ფრჩხილის პოზიცია */
  C.matchParen = (code, openIdx) => {
    let d = 0;
    for (let i = openIdx; i < code.length; i++) {
      const c = code[i];
      if (OPEN.includes(c)) d++;
      else if (CLOSE.includes(c)) { d--; if (d === 0) return i; }
    }
    return -1;
  };
  /** შესაბამისი გამხსნელი ფრჩხილი (უკუღმა) */
  C.matchBack = (code, closeIdx) => {
    let d = 0;
    for (let i = closeIdx; i >= 0; i--) {
      const c = code[i];
      if (CLOSE.includes(c)) d++;
      else if (OPEN.includes(c)) { d--; if (d === 0) return i; }
    }
    return -1;
  };

  /** მძიმით დაყოფა მხოლოდ ზედა დონეზე (ფრჩხილებს გარეთ) */
  C.splitTop = (s) => {
    const parts = []; let d = 0, cur = '';
    for (const c of s) {
      if (OPEN.includes(c)) d++;
      else if (CLOSE.includes(c)) d--;
      if (c === ',' && d === 0) { parts.push(cur); cur = ''; } else cur += c;
    }
    parts.push(cur);
    return parts;
  };

  /**
   * ყველა while / for / do ციკლის ტანში ჩასვამს stmt-ს (მაგ. "yield 0;" ან "__g();")
   * რათა უსასრულო ციკლმა ბრაუზერი არ გაჭედოს.
   */
  C.insertLoopStmt = (code, stmt) => {
    const re = /(?<![\w$.])(while|for|do)\b/g;
    const hits = []; let m;
    while ((m = re.exec(code))) hits.push({ i: m.index, kw: m[1] });
    for (let k = hits.length - 1; k >= 0; k--) {
      const { i, kw } = hits[k];
      if (kw === 'do') {
        let j = i + 2; while (/\s/.test(code[j] || '')) j++;
        if (code[j] === '{') code = code.slice(0, j + 1) + ' ' + stmt + ' ' + code.slice(j + 1);
        continue;
      }
      let open = i + kw.length; while (/\s/.test(code[open] || '')) open++;
      if (code[open] !== '(') continue;
      const close = C.matchParen(code, open);
      if (close < 0) continue;
      if (kw === 'while') { // do { } while(...) — გამოტოვება
        let b = i - 1; while (b >= 0 && /\s/.test(code[b])) b--;
        if (code[b] === '}') {
          const ob = C.matchBack(code, b);
          if (ob >= 0) {
            let p = ob - 1; while (p >= 0 && /\s/.test(code[p])) p--;
            if (code.slice(Math.max(0, p - 1), p + 1) === 'do' && !/[\w$]/.test(code[p - 2] || '')) continue;
          }
        }
      }
      let j = close + 1; while (j < code.length && /\s/.test(code[j])) j++;
      if (code[j] === '{') code = code.slice(0, j + 1) + ' ' + stmt + ' ' + code.slice(j + 1);
      else if (code[j] === ';') code = code.slice(0, j) + '{ ' + stmt + ' }' + code.slice(j + 1);
      else {
        let d = 0, e = j;
        for (; e < code.length; e++) {
          const c = code[e];
          if (OPEN.includes(c)) d++;
          else if (CLOSE.includes(c)) { d--; if (d === 0 && c === '}') break; }
          else if (c === ';' && d === 0) break;
        }
        code = code.slice(0, j) + '{ ' + stmt + ' ' + code.slice(j, e + 1) + ' }' + code.slice(e + 1);
      }
    }
    return code;
  };

  /**
   * name(ARGS) გამოძახებების ჩანაცვლება: pre + ARGS + post
   * (არ ეხება მეთოდებს obj.name( და function* name( დეკლარაციებს)
   */
  C.wrapCalls = (code, name, pre, post) => {
    const re = new RegExp('(?<![\\w$.])' + name + '\\s*\\(', 'g');
    const idx = []; let m;
    while ((m = re.exec(code))) {
      const before = code.slice(Math.max(0, m.index - 12), m.index);
      if (/function\*?\s*$/.test(before)) continue;
      idx.push(m.index);
    }
    for (let k = idx.length - 1; k >= 0; k--) {
      const s = idx[k];
      const open = code.indexOf('(', s);
      const close = C.matchParen(code, open);
      if (close < 0) continue;
      const args = code.slice(open + 1, close);
      code = code.slice(0, s) + pre + args + post + code.slice(close + 1);
    }
    return code;
  };

  VL.CodeUtil = C;
})(window.VL);
