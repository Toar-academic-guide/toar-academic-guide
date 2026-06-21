import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, value);
    },
  };
}

if (typeof window !== 'undefined') {
  let hasLocalStorage = false;

  try {
    hasLocalStorage = typeof window.localStorage !== 'undefined';
  } catch {
    hasLocalStorage = false;
  }

  if (!hasLocalStorage) {
    const storage = createMemoryStorage();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: storage,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage,
    });
  }
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
