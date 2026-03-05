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
  const title = (payload?.notification && payload.notification.title) || 'Raw Needed';
  const body = (payload?.notification && payload.notification.body) || '';
  const options = {
    body,
    icon: '/logo.png',
    badge: '/logo.png',
    data: payload?.data || {}
  };
  self.registration.showNotification(title, options);
});

