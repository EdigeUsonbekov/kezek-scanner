const CACHE_NAME = 'kezek-v6-pwa-github';
const ASSETS = [
  './',
  './scanner.html',
  './manifest.json',
  './index.html'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS).catch(()=>{}))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Никогда не кешируем API (serveo)
  if (url.pathname.includes('/api/') || url.hostname.includes('serveo') || url.href.includes('/api')) {
    return e.respondWith(fetch(e.request).catch(()=> new Response(JSON.stringify({detail:'offline'}), {status:503, headers:{'Content-Type':'application/json'}})));
  }
  // Для остальных - network first
  e.respondWith(
    fetch(e.request).then(r=>{
      // Клонируем только GET и 200
      if(e.request.method === 'GET' && r.ok){
        const clone = r.clone();
        caches.open(CACHE_NAME).then(c=>c.put(e.request, clone)).catch(()=>{});
      }
      return r;
    }).catch(()=> caches.match(e.request).then(m=> m || caches.match('./scanner.html').then(m2=> m2 || caches.match('./'))))
  );
});

self.addEventListener('push', (event) => {
  let data = {title: 'kezek', body: 'Ваша очередь!', tag: 'queue-call'};
  try {
    if (event.data) data = {...data, ...event.data.json()};
  } catch {}
  const options = {
    body: data.body,
    icon: "data:image/svg+xml,[STRIPPED]",
    badge: "data:image/svg+xml,[STRIPPED]",
    tag: data.tag || 'kezek-notify',
    renotify: true,
    requireInteraction: true,
    vibrate: [500, 200, 500, 200, 1000, 200, 500],
    silent: false,
    data: data
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({type: 'window'}).then(list => {
      for (let c of list) {
        if (c.url.includes('scanner') && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow('./scanner.html');
    })
  );
});
