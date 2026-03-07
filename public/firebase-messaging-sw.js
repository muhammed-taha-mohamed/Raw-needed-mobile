/* eslint-disable no-undef */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getMessaging, onBackgroundMessage } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-sw.js';

const firebaseConfig = {
  apiKey: "AIzaSyDdKTtjJWrc9_buHukGn3GrlMQWvgMjiOo",
  authDomain: "raw-needed-1.firebaseapp.com",
  projectId: "raw-needed-1",
  storageBucket: "raw-needed-1.firebasestorage.app",
  messagingSenderId: "245715746864",
  appId: "1:245715746864:web:59dfe79c6a9d047e5aedf5",
  measurementId: "G-RDJKNKGZ4C"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  try { console.debug('[SW] onBackgroundMessage payload', payload); } catch {}
  const n = payload?.notification || {};
  const d = payload?.data || {};
  const title = n.title || d.title || 'Raw Needed';
  const body = n.body || d.body || '';
  const options = {
    body,
    icon: '/logo.png',
    badge: '/logo.png',
    data: d
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch {}
  const n = payload?.notification || {};
  const d = payload?.data || {};
  const title = n.title || d.title || 'Raw Needed';
  const body = n.body || d.body || '';
  const options = {
    body,
    icon: '/logo.png',
    badge: '/logo.png',
    data: d
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Keep page state stable: focus existing client, don't open new tabs or reload
self.addEventListener('notificationclick', (event) => {
  event.notification?.close?.();
  event.waitUntil((async () => {
    const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (clientList && clientList.length > 0) {
      try { await clientList[0].focus(); } catch {}
    }
  })());
});

// Explicitly no-op on notification close to avoid any default navigation
self.addEventListener('notificationclose', (event) => {
  // no-op
});

// Defensive: handle raw 'push' events the same way without navigation
self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const n = data?.notification || {};
    const d = data?.data || {};
    const title = n.title || d.title || 'Raw Needed';
    const body = n.body || d.body || '';
    const options = {
      body,
      icon: '/logo.png',
      badge: '/logo.png',
      data: d
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    // Fallback: no-op
  }
});
