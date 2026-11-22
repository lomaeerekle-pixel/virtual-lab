/* PWA: service worker registration + "install app" button. Safe to load anywhere (file://, sandboxed hosts). */
(function () {
  const VL = window.VL || (window.VL = {});
  const P = VL.PWA = { deferred: null };
  const isStandalone = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } };
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => {
      try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) {}
    });
  }

  function button() {
    let b = document.getElementById('pwa-install');
    if (b) return b;
    b = document.createElement('button');
    b.id = 'pwa-install'; b.type = 'button'; b.className = 'pwa-install';
    b.innerHTML = '📲 <span>აპის დაყენება</span>';
    b.title = 'დააყენე ვირტუალური ლაბორატორია როგორც აპლიკაცია';
    b.addEventListener('click', P.install);
    document.body.appendChild(b);
    return b;
  }
  function show() { if (!isStandalone()) button().hidden = false; }
  function hide() { const b = document.getElementById('pwa-install'); if (b) b.hidden = true; }

  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); P.deferred = e; show(); });
  window.addEventListener('appinstalled', () => { P.deferred = null; hide(); try { VL.U.toast('✅ აპი დაყენებულია!', 'success'); } catch (e) {} });

  P.install = async function () {
    if (P.deferred) {
      P.deferred.prompt();
      try { await P.deferred.userChoice; } catch (e) {}
      P.deferred = null; hide();
      return;
    }
    const msg = isIOS
      ? '<p>iPhone / iPad-ზე:</p><ol><li>Safari-ში დააჭირე <b>გაზიარება</b> ღილაკს (⬆️)</li><li>აირჩიე <b>„Add to Home Screen“</b> / „საწყის ეკრანზე დამატება“</li><li>დააჭირე <b>Add</b></li></ol>'
      : '<p>ბრაუზერის მენიუში (⋮) აირჩიე <b>„Install app“</b> ან <b>„Add to Home screen“</b>.</p><p class="muted">თუ ეს პუნქტი არ ჩანს, გახსენი საიტი Chrome-ში ან Edge-ში.</p>';
    if (VL.U && VL.U.modal) VL.U.modal({ title: '📲 აპის დაყენება', html: msg, actions: [{ label: 'გასაგებია', cls: 'btn-primary' }] });
    else alert('ბრაუზერის მენიუდან აირჩიე „Add to Home screen“.');
  };

  // iOS never fires beforeinstallprompt — offer instructions once per session there
  window.addEventListener('load', () => { if (isIOS && !isStandalone() && /^https?:$/.test(location.protocol)) show(); });
})();
