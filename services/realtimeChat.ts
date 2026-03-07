import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  push,
  get,
  query,
  orderByChild,
  onChildAdded,
  onValue,
  off,
  DataSnapshot
} from 'firebase/database';
import type { OrderMessage } from '../types';
import { ensureApp } from './fcm';
import type { ComplaintMessage } from '../types';

const DB_URL = 'https://raw-needed-1-default-rtdb.firebaseio.com/';

function getDb() {
  // Ensure a single Firebase app instance
  if (!getApps().length) {
    // Reuse ensureApp from FCM (already holds project config)
    ensureApp();
  }
  const app = getApp();
  return getDatabase(app, DB_URL);
}

export async function fetchOrderMessages(lineId: string): Promise<OrderMessage[]> {
  try {
    const db = getDb();
    const messagesRef = query(ref(db, `orderLineChats/${lineId}`), orderByChild('createdAt'));
    const snap = await get(messagesRef);
    const list: OrderMessage[] = [];
    if (snap.exists()) {
      snap.forEach((child: DataSnapshot) => {
        const val = child.val() || {};
        list.push({
          id: child.key || '',
          orderId: lineId,
          userId: val.userId || '',
          userName: val.userName || '',
          userOrganizationName: val.userOrganizationName || '',
          message: val.message || '',
          image: val.image || null,
          createdAt: val.createdAt || new Date().toISOString()
        });
      });
    }
    // Ensure ascending by createdAt
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return list;
  } catch {
    return [];
  }
}

export function subscribeToOrderMessages(
  lineId: string,
  onNew: (msg: OrderMessage | OrderMessage[]) => void
): () => void {
  const db = getDb();
  const messagesRef = query(ref(db, `orderLineChats/${lineId}`), orderByChild('createdAt'));
  const seen = new Set<string>();
  const buffer: OrderMessage[] = [];
  let initialResolved = false;
  // Attach incremental listener immediately to avoid empty UI if get() fails
  const unsubscribeChild = onChildAdded(messagesRef, (child) => {
    const id = child.key || '';
    if (seen.has(id)) return;
    const val = child.val() || {};
    const msg: OrderMessage = {
      id,
      orderId: lineId,
      userId: val.userId || '',
      userName: val.userName || '',
      userOrganizationName: val.userOrganizationName || '',
      message: val.message || '',
      image: val.image || null,
      createdAt: val.createdAt || new Date().toISOString()
    };
    seen.add(id);
    if (!initialResolved) {
      buffer.push(msg);
    } else {
      (onNew as any)(msg);
      try { window.dispatchEvent(new CustomEvent('newChatMessage', { detail: { kind: 'order-line', lineId, message: msg } })); } catch { }
    }
  });
  // Initial snapshot; if empty or fails, fall back to buffered items
  get(messagesRef).then((snap) => {
    const list: OrderMessage[] = [];
    if (snap.exists()) {
      snap.forEach((child: DataSnapshot) => {
        const val = child.val() || {};
        const m: OrderMessage = {
          id: child.key || '',
          orderId: lineId,
          userId: val.userId || '',
          userName: val.userName || '',
          userOrganizationName: val.userOrganizationName || '',
          message: val.message || '',
          image: val.image || null,
          createdAt: val.createdAt || new Date().toISOString()
        };
        list.push(m);
        if (m.id) seen.add(m.id);
      });
    }
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    initialResolved = true;
    if (list.length > 0) {
      if (buffer.length > 0) {
        const byId: Record<string, OrderMessage> = {};
        for (const m of list) byId[m.id] = m;
        for (const m of buffer) byId[m.id] = m;
        const merged = Object.values(byId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        (onNew as any)(merged);
      } else {
        (onNew as any)(list);
      }
    } else if (buffer.length > 0) {
      buffer.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      (onNew as any)(buffer.slice());
    } else {
      (onNew as any)([]);
    }
  }).catch(() => {
    initialResolved = true;
    if (buffer.length > 0) {
      buffer.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      (onNew as any)(buffer.slice());
    } else {
      (onNew as any)([]);
    }
  });
  return () => {
    try {
      unsubscribeChild && unsubscribeChild();
    } finally {
      try { off(messagesRef); } catch { }
    }
  };
}

export async function sendOrderMessage(
  lineId: string,
  payload: {
    userId: string;
    userName: string;
    userOrganizationName?: string;
    message?: string;
    image?: string | null;
  },
  ctx?: { orderId?: string }
): Promise<void> {
  const db = getDb();
  const messagesRef = ref(db, `orderLineChats/${lineId}`);
  const createdAt = new Date().toISOString();
  await push(messagesRef, {
    userId: payload.userId,
    userName: payload.userName || '',
    userOrganizationName: payload.userOrganizationName || '',
    message: payload.message || '',
    image: payload.image || null,
    createdAt
  });
  try {
    const { api } = await import('../api');
    const oid = ctx?.orderId || lineId;
    await api.post(`/api/v1/chat/order/${encodeURIComponent(oid)}/push`, {
      message: payload.message || ''
    });
  } catch { }
}

export async function fetchComplaintMessages(complaintId: string): Promise<ComplaintMessage[]> {
  try {
    const db = getDb();
    const messagesRef = query(ref(db, `complaintChats/${complaintId}`), orderByChild('createdAt'));
    const snap = await get(messagesRef);
    const list: ComplaintMessage[] = [];
    if (snap.exists()) {
      snap.forEach((child: DataSnapshot) => {
        const val = child.val() || {};
        list.push({
          id: child.key || '',
          complaintId,
          userId: val.userId || '',
          userName: val.userName || '',
          message: val.message || '',
          image: val.image || null,
          createdAt: val.createdAt || new Date().toISOString(),
          admin: !!val.admin
        });
      });
    }
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return list;
  } catch {
    return [];
  }
}

export function subscribeToComplaintMessages(
  complaintId: string,
  onNew: (msg: ComplaintMessage | ComplaintMessage[]) => void
): () => void {
  const db = getDb();
  const messagesRef = query(ref(db, `complaintChats/${complaintId}`), orderByChild('createdAt'));
  const seen = new Set<string>();
  const buffer: ComplaintMessage[] = [];
  let initialResolved = false;
  const unsubscribeChild = onChildAdded(messagesRef, (child) => {
    const id = child.key || '';
    if (seen.has(id)) return;
    const val = child.val() || {};
    const msg: ComplaintMessage = {
      id,
      complaintId,
      userId: val.userId || '',
      userName: val.userName || '',
      message: val.message || '',
      image: val.image || null,
      createdAt: val.createdAt || new Date().toISOString(),
      admin: !!val.admin
    };
    seen.add(id);
    if (!initialResolved) {
      buffer.push(msg);
    } else {
      (onNew as any)(msg);
      try { window.dispatchEvent(new CustomEvent('newChatMessage', { detail: { kind: 'complaint', complaintId, message: msg } })); } catch { }
    }
  });
  get(messagesRef).then((snap) => {
    const list: ComplaintMessage[] = [];
    if (snap.exists()) {
      snap.forEach((child: DataSnapshot) => {
        const val = child.val() || {};
        const m: ComplaintMessage = {
          id: child.key || '',
          complaintId,
          userId: val.userId || '',
          userName: val.userName || '',
          message: val.message || '',
          image: val.image || null,
          createdAt: val.createdAt || new Date().toISOString(),
          admin: !!val.admin
        };
        list.push(m);
        if (m.id) seen.add(m.id);
      });
    }
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    initialResolved = true;
    if (list.length > 0) {
      if (buffer.length > 0) {
        const byId: Record<string, ComplaintMessage> = {};
        for (const m of list) byId[m.id] = m;
        for (const m of buffer) byId[m.id] = m;
        const merged = Object.values(byId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        (onNew as any)(merged);
      } else {
        (onNew as any)(list);
      }
    } else if (buffer.length > 0) {
      buffer.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      (onNew as any)(buffer.slice());
    } else {
      (onNew as any)([]);
    }
  }).catch(() => {
    initialResolved = true;
    if (buffer.length > 0) {
      buffer.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      (onNew as any)(buffer.slice());
    } else {
      (onNew as any)([]);
    }
  });
  return () => {
    try {
      unsubscribeChild && unsubscribeChild();
    } finally {
      try { off(messagesRef); } catch { }
    }
  };
}

export async function sendComplaintMessage(
  complaintId: string,
  payload: {
    userId: string;
    userName: string;
    admin: boolean;
    message?: string;
    image?: string | null;
  }
): Promise<void> {
  const db = getDb();
  const messagesRef = ref(db, `complaintChats/${complaintId}`);
  const createdAt = new Date().toISOString();
  await push(messagesRef, {
    userId: payload.userId,
    userName: payload.userName || '',
    admin: !!payload.admin,
    message: payload.message || '',
    image: payload.image || null,
    createdAt
  });
  try {
    const { api } = await import('../api');
    await api.post(`/api/v1/chat/complaint/${encodeURIComponent(complaintId)}/push`, {
      message: payload.message || ''
    });
  } catch { }
}
