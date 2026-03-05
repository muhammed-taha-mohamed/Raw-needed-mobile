import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fcm from '../services/fcm';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    post: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApps: () => [],
}));

vi.mock('firebase/messaging', async () => {
  return {
    isSupported: vi.fn().mockResolvedValue(true),
    getMessaging: vi.fn(),
    getToken: vi.fn().mockResolvedValue('test-token'),
    onMessage: vi.fn(),
  };
});

describe('fcm web token saving', () => {
  beforeEach(() => {
    (api.post as any).mockClear();
    Object.defineProperty(global, 'Notification', {
      value: {
        permission: 'granted',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      },
      writable: true,
    });
    Object.defineProperty(global, 'navigator', {
      value: {
        serviceWorker: {
          register: vi.fn().mockResolvedValue({}),
          getRegistration: vi.fn().mockResolvedValue({}),
        },
      },
      writable: true,
    });
    Object.defineProperty(global, 'window', { value: {}, writable: true } as any);
  });

  it('saves web token when supported and permission granted', async () => {
    const token = await fcm.getWebPushToken();
    expect(token).toBe('test-token');
    await fcm.saveWebTokenToBackend(token!);
    expect(api.post).toHaveBeenCalledWith('/api/v1/notifications/tokens', { webToken: 'test-token' });
  });

  it('does not save when token is null', async () => {
    const getToken = (await import('firebase/messaging')).getToken as any;
    getToken.mockResolvedValueOnce(null);
    const token = await fcm.getWebPushToken();
    expect(token).toBeNull();
    await fcm.saveWebTokenToBackend(token as any);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('does not request save when permission denied', async () => {
    Object.defineProperty(global, 'Notification', {
      value: {
        permission: 'denied',
        requestPermission: vi.fn().mockResolvedValue('denied'),
      },
      writable: true,
    });
    const token = await fcm.getWebPushToken();
    expect(token).toBeNull();
    expect(api.post).not.toHaveBeenCalled();
  });
});

