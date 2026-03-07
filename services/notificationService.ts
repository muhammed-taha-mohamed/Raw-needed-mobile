// Unified notification service for WebSocket, Push Notifications, and Sound

import { websocketService, NotificationMessage } from './websocket';

// Notification sound (using Web Audio API)
let audioContext: AudioContext | null = null;
let notificationSound: AudioBuffer | null = null;

// Initialize audio context
const initAudio = async () => {
  if (typeof window === 'undefined') return;

  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 0.5;
    const buffer = audioContext.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const f1 = 660;
      const f2 = 880;
      const env =
        t < 0.02 ? t / 0.02 :
          t < 0.18 ? 1 :
            t < 0.22 ? 1 - (t - 0.18) / 0.04 :
              t < 0.26 ? (t - 0.22) / 0.04 :
                Math.max(0, 1 - (t - 0.26) / 0.24);
      const wave = t < 0.22
        ? Math.sin(2 * Math.PI * f1 * t)
        : Math.sin(2 * Math.PI * f2 * (t - 0.12));
      data[i] = wave * env * 0.35;
    }
    notificationSound = buffer;
  } catch (err) {
    console.warn('Failed to initialize audio context:', err);
  }
};

// Play notification sound
export const playNotificationSound = () => {
  if (!audioContext || !notificationSound) {
    initAudio();
    return;
  }

  try {
    const source = audioContext.createBufferSource();
    source.buffer = notificationSound;
    source.connect(audioContext.destination);
    source.start(0);
  } catch (err) {
    console.warn('Failed to play notification sound:', err);
  }
};

// Request browser push notification permission
export const requestPushNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// Show browser push notification
const showPushNotification = (notification: NotificationMessage, lang: string) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  const title = (lang === 'ar' ? notification.titleAr : notification.titleEn) || notification.titleEn || notification.titleAr || (notification as any).title || 'Raw Needed';
  const body = (lang === 'ar' ? notification.messageAr : notification.messageEn) || notification.messageEn || notification.messageAr || (notification as any).message || '';

  const options: NotificationOptions = {
    body,
    icon: '/favicon.ico', // You can change this to your app icon
    badge: '/favicon.ico',
    tag: notification.id, // Prevent duplicate notifications
    requireInteraction: false,
    silent: false, // Allow sound from browser
  };

  try {
    const browserNotification = new Notification(title, options);

    browserNotification.onclick = () => {
      window.focus();
      browserNotification.close();
    };

    // Auto close after 5 seconds
    setTimeout(() => {
      browserNotification.close();
    }, 5000);
  } catch (err) {
    console.error('Failed to show push notification:', err);
  }
};

// Get current language (so push notification uses current lang even after user switches)
const getCurrentLang = (): string => {
  if (typeof window === 'undefined') return 'ar';
  return document.documentElement.lang || localStorage.getItem('lang') || 'ar';
};

// Initialize notification service
export const initNotificationService = (userId: string, token: string, _lang?: string) => {
  initAudio();
  websocketService.connect(userId, token);
  // Ask for push permission after a short delay (improves acceptance in some browsers)
  setTimeout(() => requestPushNotificationPermission(), 1500);

  const unsubscribe = websocketService.subscribe((notification: NotificationMessage) => {
    playNotificationSound();
    showPushNotification(notification, getCurrentLang());
    window.dispatchEvent(new CustomEvent('newNotification', { detail: notification }));
  });

  return unsubscribe;
};

// Disconnect notification service
export const disconnectNotificationService = () => {
  websocketService.disconnect();
};
