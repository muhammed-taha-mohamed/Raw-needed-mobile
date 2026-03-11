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

function buildNotificationHash(payload) {
  const data = payload || {};
  const type = String(data.type || '').toUpperCase();
  const relatedEntityType = String(data.relatedEntityType || '').toUpperCase();
  const relatedEntityId = String(data.relatedEntityId || '');
  const complaintId = String(data.complaintId || (relatedEntityType === 'COMPLAINT' ? relatedEntityId : ''));
  const lineId = String(data.lineId || '');
  const orderId = String(data.orderId || ((relatedEntityType === 'ORDER' || relatedEntityType === 'RFQ_ORDER') ? relatedEntityId : ''));
  const params = new URLSearchParams();
  params.set('navTs', String(Date.now()));

  if (complaintId || relatedEntityType === 'COMPLAINT') {
    if (complaintId) params.set('complaintId', complaintId);
    params.set('openChat', '1');
    return `/#/support?${params.toString()}`;
  }

  if (lineId) {
    if (orderId) params.set('orderId', orderId);
    params.set('lineId', lineId);
    params.set('openChat', '1');
    return `/#/orders?${params.toString()}`;
  }

  if (orderId || relatedEntityType === 'ORDER' || relatedEntityType === 'RFQ_ORDER') {
    if (orderId) params.set('orderId', orderId);
    if (type === 'GENERAL' && relatedEntityType === 'ORDER') {
      params.set('openChat', '1');
    }
    return `/#/orders?${params.toString()}`;
  }

  if (type.includes('ORDER') || type.includes('QUOTATION') || type.includes('RFQ')) {
    return `/#/orders?${params.toString()}`;
  }

  if (relatedEntityType === 'AD_SUBSCRIPTION') {
    if (relatedEntityId) params.set('adSubscriptionId', relatedEntityId);
    return `/#/ad-packages?${params.toString()}`;
  }

  if (relatedEntityType === 'ADD_SEARCHES_REQUEST') {
    if (relatedEntityId) params.set('addSearchesRequestId', relatedEntityId);
    return `/#/plans?${params.toString()}`;
  }

  if (relatedEntityType === 'SUBSCRIPTION' || relatedEntityType === 'USER_SUBSCRIPTION' || type.includes('SUBSCRIPTION')) {
    if (relatedEntityId) params.set('subscriptionId', relatedEntityId);
    return `/#/subscription?${params.toString()}`;
  }

  if (data.notificationId) params.set('notificationId', String(data.notificationId));
  return `/#/?${params.toString()}`;
}

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
    const payload = event.notification?.data || {};
    const targetUrl = buildNotificationHash(payload);
    const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (clientList && clientList.length > 0) {
      const client = clientList[0];
      try { await client.focus(); } catch {}
      try {
        client.postMessage({ type: 'RN_NOTIFICATION_CLICK', payload });
      } catch {}
      return;
    }
    try { await clients.openWindow(targetUrl); } catch {}
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
