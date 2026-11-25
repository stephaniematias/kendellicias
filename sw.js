// Service worker: deixa o app abrir mesmo sem internet (depois da primeira visita).
// Os DADOS ficam no próprio aparelho (IndexedDB) — isto aqui só guarda os arquivos do app.
const CACHE = "kendellicias-v3";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!sameOrigin && !isFont) return;

  if (isFont) {
    // fontes: usa a guardada e atualiza em segundo plano
    e.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req).then((res) => { caches.open(CACHE).then((c) => c.put(req, res.clone())); return res; }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }
  // arquivos do app: tenta a internet primeiro (assim ela sempre recebe a versão nova) e cai no cache se estiver offline
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("index.html")))
  );
});
