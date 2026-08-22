import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getGuestCart } from '../lib/cart';

const CART_KEY = 'rpmfest_guest_cart';

function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    }
  };
}

describe('getGuestCart storage robustness', () => {
  let originalWindow: unknown;

  beforeEach(() => {
    originalWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = { localStorage: createLocalStorageMock() };
  });

  afterEach(() => {
    (globalThis as { window?: unknown }).window = originalWindow;
  });

  it('returns [] when localStorage contains valid JSON that is not an array', () => {
    const win = (globalThis as unknown as { window: { localStorage: ReturnType<typeof createLocalStorageMock> } }).window;
    win.localStorage.setItem(CART_KEY, JSON.stringify({ not: 'an array' }));
    expect(getGuestCart()).toEqual([]);
  });

  it('returns [] when localStorage contains malformed JSON', () => {
    const win = (globalThis as unknown as { window: { localStorage: ReturnType<typeof createLocalStorageMock> } }).window;
    win.localStorage.setItem(CART_KEY, '{not valid json');
    expect(getGuestCart()).toEqual([]);
  });
});
