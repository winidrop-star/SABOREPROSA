// Service worker: deixa o app funcionando offline e cuida das notificações.
const VERSAO = 'wwfit-v1';
const ARQUIVOS = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/mensagens.js', 'js/app.js', 'js/store.js', 'js/ui.js', 'js/dados.js', 'js/lembretes.js',
  'js/telas/hoje.js', 'js/telas/comida.js', 'js/telas/treino.js', 'js/telas/evolucao.js',
  'js/telas/casal.js', 'js/telas/mais.js', 'js/telas/onboarding.js', 'js/telas/comuns.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'
];

importScripts('js/mensagens.js');

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => Promise.allSettled(ARQUIVOS.map((a) => c.add(a)))));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))));
  self.clients.claim();
});

// rede primeiro (pega atualizações), cache se estiver offline
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && new URL(req.url).origin === location.origin) {
          const copia = res.clone();
          caches.open(VERSAO).then((c) => c.put(req, copia));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
  );
});

// Android: roda ~1x por dia com o app fechado e mostra a palavra do dia
self.addEventListener('periodicsync', (e) => {
  if (e.tag !== 'ww-manha') return;
  const m = self.WW_MENSAGENS.mensagemDoDia();
  e.waitUntil(self.registration.showNotification('🌅 Bom dia! Palavra do dia', {
    body: `"${m.versiculo}" — ${m.referencia}\n✨ ${m.motivacao}`,
    tag: 'manha', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png'
  }));
});

// preparado para o envio pelo servidor (Web Push), próxima etapa
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'W+W Fit', {
    body: d.body || '', tag: d.tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url: d.url || './' }
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const c of lista) if ('focus' in c) return c.focus();
      return self.clients.openWindow(url);
    })
  );
});
