export interface NotificationNavigationPayload {
  notificationId?: string;
  type?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  metadata?: string;
  path?: string;
  route?: string;
  url?: string;
  screen?: string;
  kind?: string;
  orderId?: string;
  lineId?: string;
  complaintId?: string;
  [key: string]: any;
}

export interface NotificationNavigationTarget {
  path: string;
  query: Record<string, string>;
}

const normalizeValue = (value: unknown): string => String(value ?? '').trim();

const tryParseMetadata = (metadata: unknown): Record<string, any> | null => {
  if (!metadata || typeof metadata !== 'string') return null;
  try {
    const parsed = JSON.parse(metadata);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const getCurrentUserRole = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return '';
    const user = JSON.parse(raw);
    return String(user?.userInfo?.role || user?.role || '').toUpperCase();
  } catch {
    return '';
  }
};

const getDashboardPathForRole = (): string => {
  const role = getCurrentUserRole();
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return '/';
  if (role.includes('SUPPLIER')) return '/';
  if (role.includes('CUSTOMER')) return '/';
  return '/';
};

const appendNavigationTimestamp = (query: Record<string, string>) => ({
  ...query,
  navTs: String(Date.now())
});

export function resolveNotificationTarget(
  payload: NotificationNavigationPayload | null | undefined
): NotificationNavigationTarget | null {
  if (!payload) return null;

  const metadata = tryParseMetadata(payload.metadata);
  const routeHint =
    normalizeValue(payload.path) ||
    normalizeValue(payload.route) ||
    normalizeValue(payload.url) ||
    normalizeValue(payload.screen) ||
    normalizeValue(metadata?.path) ||
    normalizeValue(metadata?.route) ||
    normalizeValue(metadata?.url) ||
    normalizeValue(metadata?.screen);

  if (routeHint) {
    return {
      path: routeHint.startsWith('#') ? routeHint.slice(1) : routeHint,
      query: appendNavigationTimestamp({})
    };
  }

  const kind = normalizeValue(payload.kind).toLowerCase();
  const type = normalizeValue(payload.type).toUpperCase();
  const relatedEntityType = normalizeValue(payload.relatedEntityType).toUpperCase();
  const relatedEntityId = normalizeValue(payload.relatedEntityId);
  const complaintId = normalizeValue(payload.complaintId) || (relatedEntityType === 'COMPLAINT' ? relatedEntityId : '');
  const lineId = normalizeValue(payload.lineId);
  const orderId =
    normalizeValue(payload.orderId) ||
    (relatedEntityType === 'ORDER' || relatedEntityType === 'RFQ_ORDER' ? relatedEntityId : '');

  if (kind === 'complaint' || complaintId || relatedEntityType === 'COMPLAINT') {
    return {
      path: '/support',
      query: appendNavigationTimestamp({
        complaintId,
        openChat: '1'
      })
    };
  }

  if (kind === 'order-line' || lineId) {
    return {
      path: '/orders',
      query: appendNavigationTimestamp({
        ...(orderId ? { orderId } : {}),
        lineId,
        openChat: '1'
      })
    };
  }

  if (kind === 'order' || orderId || relatedEntityType === 'ORDER' || relatedEntityType === 'RFQ_ORDER') {
    return {
      path: '/orders',
      query: appendNavigationTimestamp({
        ...(orderId ? { orderId } : {}),
        ...(type === 'GENERAL' && relatedEntityType === 'ORDER' ? { openChat: '1' } : {})
      })
    };
  }

  if (type.includes('ORDER') || type.includes('QUOTATION') || type.includes('RFQ')) {
    return {
      path: '/orders',
      query: appendNavigationTimestamp({})
    };
  }

  if (relatedEntityType === 'AD_SUBSCRIPTION') {
    return {
      path: '/ad-packages',
      query: appendNavigationTimestamp({
        ...(relatedEntityId ? { adSubscriptionId: relatedEntityId } : {})
      })
    };
  }

  if (relatedEntityType === 'ADD_SEARCHES_REQUEST') {
    return {
      path: '/plans',
      query: appendNavigationTimestamp({
        ...(relatedEntityId ? { addSearchesRequestId: relatedEntityId } : {})
      })
    };
  }

  if (relatedEntityType === 'SUBSCRIPTION' || relatedEntityType === 'USER_SUBSCRIPTION' || type.includes('SUBSCRIPTION')) {
    const role = getCurrentUserRole();
    const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
    return {
      path: isAdmin ? '/plans' : '/subscription',
      query: appendNavigationTimestamp({
        ...(relatedEntityId ? { subscriptionId: relatedEntityId } : {})
      })
    };
  }

  if (type === 'GENERAL') {
    return {
      path: getDashboardPathForRole(),
      query: appendNavigationTimestamp({
        ...(payload.notificationId ? { notificationId: normalizeValue(payload.notificationId) } : {})
      })
    };
  }

  return {
    path: getDashboardPathForRole(),
    query: appendNavigationTimestamp({
      ...(payload.notificationId ? { notificationId: normalizeValue(payload.notificationId) } : {})
    })
  };
}

export function buildNotificationHash(
  payload: NotificationNavigationPayload | null | undefined
): string | null {
  const target = resolveNotificationTarget(payload);
  if (!target) return null;

  const params = new URLSearchParams();
  Object.entries(target.query).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const search = params.toString();
  return `#${target.path}${search ? `?${search}` : ''}`;
}

export function navigateToNotificationTarget(
  payload: NotificationNavigationPayload | null | undefined
): boolean {
  if (typeof window === 'undefined') return false;

  const hash = buildNotificationHash(payload);
  if (!hash) return false;

  if (window.location.hash === hash || window.location.hash === hash.slice(1)) {
    window.dispatchEvent(new CustomEvent('notificationDeepLink', { detail: payload }));
    return true;
  }

  window.location.hash = hash;
  return true;
}
