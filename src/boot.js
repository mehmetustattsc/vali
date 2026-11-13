/* Modülden önce çalışır: service worker kaydı ve açılışta çökme olursa "Güncelle ve yeniden aç" düğmesi
   (eski sürüm önbellekte kalmışsa service worker'ı ve önbelleği temizleyip yeniden yükler). */
if ('serviceWorker' in navigator && location.protocol === 'https:') addEventListener('load', function () { navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(function () {}); });
window.__valiFix = function () {
  var d = function () { location.reload(); };
  try {
    Promise.all([
      navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then(function (r) { return Promise.all(r.map(function (x) { return x.unregister(); })); }) : 0,
      self.caches ? caches.keys().then(function (k) { return Promise.all(k.map(function (x) { return caches.delete(x); })); }) : 0,
    ]).then(d, d);
  } catch (e) { d(); }
};
addEventListener('error', function () {
  if (document.getElementById('vfix')) return;
  var b = document.createElement('div'); b.id = 'vfix';
  b.style.cssText = 'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:99;background:#2a2620;color:#f4efe2;padding:10px 14px;border-radius:12px;font:14px system-ui;box-shadow:0 4px 16px #0008';
  b.innerHTML = 'Bir hata oldu. <button onclick="__valiFix()" style="margin-left:8px;padding:6px 10px;border-radius:8px;background:#e8b85a;color:#2a2214;font-weight:700">Güncelle ve yeniden aç</button>';
  (document.body || document.documentElement).appendChild(b);
});
