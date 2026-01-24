// Service Worker for Push Notifications
// This runs in the background even when the app is closed

self.addEventListener('install', (event) => {
  console.log('[SW Push] Installing service worker for push notifications');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW Push] Service worker activated');
  event.waitUntil(self.clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW Push] Push notification received');
  
  let data = {
    title: '🔔 Nuova notifica',
    body: 'Hai una nuova notifica',
    icon: '/pwa-192x192.png',
    tag: 'notification',
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    console.log('[SW Push] Could not parse push data:', e);
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.tag || 'default',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Apri' },
      { action: 'close', title: 'Chiudi' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW Push] Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open or focus the app
  const urlToOpen = '/admin';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open
      for (const client of clientList) {
        if (client.url.includes('/admin') && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW Push] Notification closed');
});
