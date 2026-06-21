import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

if (typeof window !== 'undefined' && !window.localStorage) {
  let store: Record<string, string> = {};

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      clear() {
        store = {};
      },
      getItem(key: string) {
        return store[key] ?? null;
      },
      key(index: number) {
        return Object.keys(store)[index] ?? null;
      },
      get length() {
        return Object.keys(store).length;
      },
      removeItem(key: string) {
        delete store[key];
      },
      setItem(key: string, value: string) {
        store[key] = value;
      },
    },
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
