// sw.js – Service Worker

// 1️⃣ Кешируем основную страницу (чтобы сайт открывался офлайн)
const CACHE_NAME = 'air-quality-cache-v1';
const OFFLINE_URL = 'index.html';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.add(OFFLINE_URL))
  );
  self.skipWaiting(); // сразу активируем Service Worker
});

self.addEventListener('activate', event => {
  // Очистка старых кешей (если понадобится в дальнейшем)
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim(); // сразу обслуживаем открытые страницы
});

// 2️⃣ Обрабатываем запросы – отдаём из кеша, если ресурс уже есть
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    // Навигационный запрос (страница) – пытаемся из кеша, иначе сеть
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
  }
});

// 3️⃣ Обрабатываем push‑сообщения
self.addEventListener('push', event => {
  // Ожидаем, что payload будет JSON с полями title и body
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      // Если payload не JSON – просто используем как текст
      data = { title: 'Air Quality Alert', body: event.data.text() };
    }
  }

  const title = data.title || 'Air Quality Alert';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',   // при желании добавьте иконку в папку icons/
    badge: '/icons/badge-72.png', // небольшая иконка для Android
    vibrate: [200, 100, 200],
    data: {
      url: '/', // куда перейти, если пользователь кликнет по уведомлению
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 4️⃣ Обрабатываем клик по уведомлению (чтобы открыть приложение)
self.addEventListener('notificationclick', event => {
  event.notification.close(); // закрываем уведомление
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Если уже открыто окно нашего сайта – фокусируем его
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Иначе открываем новое окно
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});