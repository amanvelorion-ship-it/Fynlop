const CART_KEY = "fynlop-cart";
const CART_EVENT = "fynlop:cart-updated";

export function readCart(): string[] {
  try {
    const stored = window.localStorage.getItem(CART_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function writeCart(productIds: string[]) {
  window.localStorage.setItem(CART_KEY, JSON.stringify([...new Set(productIds)]));
  window.dispatchEvent(new Event(CART_EVENT));
}

export function addToCart(productId: string) {
  writeCart([...readCart(), productId]);
}

export function subscribeToCart(callback: () => void) {
  window.addEventListener(CART_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CART_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export const cartEventName = CART_EVENT;
