const storageKey = (orderId: string) => `order_access:${orderId}`;

export function saveOrderAccessToken(orderId: string, token: string) {
  if (typeof window === "undefined" || !orderId || !token) return;
  try {
    localStorage.setItem(storageKey(orderId), token);
    sessionStorage.setItem(storageKey(orderId), token);
  } catch {
    /* private mode / quota */
  }
}

export function readOrderAccessToken(orderId: string): string | null {
  if (typeof window === "undefined" || !orderId) return null;
  try {
    return (
      localStorage.getItem(storageKey(orderId)) ??
      sessionStorage.getItem(storageKey(orderId))
    );
  } catch {
    return null;
  }
}

export function reportHrefWithAccess(
  reportOrOrderId: string,
  orderId?: string | null
): string {
  const base = `/report/${reportOrOrderId}`;
  const token = orderId ? readOrderAccessToken(orderId) : null;
  return token ? `${base}?access=${encodeURIComponent(token)}` : base;
}
