import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/database', () => {
  const fns = {
    getDatabase: vi.fn(() => ({} as any)),
    ref: vi.fn((_db: any, path: string) => ({ path })),
    query: vi.fn((ref: any) => ({ ref })),
    orderByChild: vi.fn((k: string) => k),
    get: vi.fn(),
    onChildAdded: vi.fn(),
    off: vi.fn(),
  };
  (globalThis as any).__FDB__ = fns;
  return fns;
});

import { subscribeToOrderMessages } from '../services/realtimeChat';

describe('realtimeChat subscribeToOrderMessages', () => {
  beforeEach(() => {
    const f = (globalThis as any).__FDB__;
    f.get.mockReset();
    f.onChildAdded.mockReset();
    f.off.mockReset();
    f.query.mockClear();
    f.ref.mockClear();
    f.orderByChild.mockClear();
    f.getDatabase.mockClear();
  });

  const makeSnap = (items: Array<{ key: string; val: any }>) => {
    return {
      exists: () => items.length > 0,
      forEach: (cb: any) => {
        items.forEach(({ key, val }) => {
          cb({ key, val: () => val } as any);
        });
      },
    } as any;
  };

  it('delivers initial array before incremental items', async () => {
    const f = (globalThis as any).__FDB__;
    f.get.mockResolvedValueOnce(
      makeSnap([
        { key: 'm1', val: { userId: 'u1', userName: 'A', createdAt: '2021-01-01T00:00:00Z' } },
      ])
    );

    let firstPayload: any = null;
    subscribeToOrderMessages('ORD1', (p: any) => {
      if (!firstPayload) firstPayload = p;
    });
    await Promise.resolve(); // flush microtask queue
    expect(Array.isArray(firstPayload)).toBe(true);
    expect(firstPayload.length).toBe(1);
  });

  it('skips duplicates from onChildAdded after initial snapshot', async () => {
    const f = (globalThis as any).__FDB__;
    f.get.mockResolvedValueOnce(
      makeSnap([
        { key: 'm1', val: { userId: 'u1', userName: 'A', createdAt: '2021-01-01T00:00:00Z' } },
      ])
    );

    const payloads: any[] = [];
    f.onChildAdded.mockImplementation((_ref: any, cb: any) => {
      // first emits duplicate m1, then new m2
      setTimeout(() => cb({ key: 'm1', val: () => ({ userId: 'u1', userName: 'A' }) } as any), 0);
      setTimeout(() => cb({ key: 'm2', val: () => ({ userId: 'u2', userName: 'B' }) } as any), 0);
      return Symbol('unsub') as any;
    });

    subscribeToOrderMessages('ORD2', (p: any) => payloads.push(p));
    await new Promise((r) => setTimeout(r, 10));
    // first item is array snapshot, second should be only m2 (object)
    expect(Array.isArray(payloads[0])).toBe(true);
    expect(payloads.length).toBe(2);
    expect(payloads[1]?.id).toBe('m2');
  });
});
