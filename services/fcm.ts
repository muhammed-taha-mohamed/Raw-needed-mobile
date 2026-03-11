import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { api } from '../api';

const firebaseConfig = {
  apiKey: "AIzaSyDdKTtjJWrc9_buHukGn3GrlMQWvgMjiOo",
  authDomain: "raw-needed-1.firebaseapp.com",
  projectId: "raw-needed-1",
  storageBucket: "raw-needed-1.firebasestorage.app",
  messagingSenderId: "245715746864",
  appId: "1:245715746864:web:59dfe79c6a9d047e5aedf5",
  measurementId: "G-RDJKNKGZ4C"
};

const VAPID_PUBLIC_KEY = "BANTDLlTw-LMx5_Th7Ip_4joe4FrRCCih9bZHdNkLOmeFRlNOaml4CRbMNWClxB3STXzab6gHkOiDOAWW3BjV-w";

let swRegistered = false;

async function ensureServiceWorker() {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;
  if (swRegistered) return navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
  let reg: ServiceWorkerRegistration | null = null;
  try {
    reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { type: 'module' as any });
    try { console.debug('[FCM] service worker registered as module'); } catch { }
  } catch (e) {
    // Fallback classic (not expected for modern browsers)
    reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    try { console.debug('[FCM] service worker registered as classic'); } catch { }
  }
  try { console.debug('[FCM] service worker registered'); } catch { }
  swRegistered = true;
  return reg;
}

export function ensureApp() {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
    try { console.debug('[FCM] firebase app initialized'); } catch { }
  }
}

export async function getWebPushToken(): Promise<string | null> {
  try {
    if (typeof window === 'undefined') return null;
    if (!(await isSupported())) {
      try { console.debug('[FCM] messaging not supported'); } catch { }
      return null;
    }
    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();
    if (permission !== 'granted') {
      try { console.debug('[FCM] notification permission not granted:', permission); } catch { }
      return null;
    }
    ensureApp();
    const reg = await ensureServiceWorker();
    const messaging = getMessaging();
    const token = await getToken(messaging, {
      vapidKey: VAPID_PUBLIC_KEY,
      serviceWorkerRegistration: reg || undefined
    });
    try { console.debug('[FCM] getToken result:', token ? 'received token' : 'no token'); } catch { }
    return token || null;
  } catch {
    try { console.debug('[FCM] getWebPushToken error'); } catch { }
    return null;
  }
}

export function subscribeForegroundMessages(cb: (payload: any) => void): (() => void) | undefined {
  try {
    if (typeof window === 'undefined') return;
    ensureApp();
    const messaging = getMessaging();
    return onMessage(messaging, cb);
  } catch {
    try { console.debug('[FCM] subscribeForegroundMessages error'); } catch { }
    return;
  }
}

export async function saveWebTokenToBackend(token: string) {
  if (!token) return;
  try {
    await api.post('/api/v1/notifications/tokens', { webToken: token });
    try { console.debug('[FCM] saved web token to backend'); } catch { }
  } catch (e) {
    try { console.debug('[FCM] failed to save web token to backend', e); } catch { }
  }
}
