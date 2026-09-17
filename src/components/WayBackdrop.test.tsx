// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from '@testing-library/react';
import { motionValue, type MotionValue } from 'framer-motion';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WayBackdrop from './WayBackdrop';

const mocks = vi.hoisted(() => ({ useScroll: vi.fn() }));

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    useScroll: mocks.useScroll,
    useSpring: (value: MotionValue<number>) => value,
  };
});

let reduced: boolean;
let listeners: Set<() => void>;
let scroll: MotionValue<number>;

beforeEach(() => {
  reduced = false;
  listeners = new Set();
  scroll = motionValue(0);
  mocks.useScroll.mockReset().mockReturnValue({ scrollY: scroll });
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      get matches() {
        return reduced;
      },
      addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
    })),
  );
});

afterEach(() => {
  cleanup();
  scroll.destroy();
  vi.unstubAllGlobals();
});

describe('WayBackdrop', () => {
  it('renders six decorative full-aspect-ratio images without scroll hooks in reduced mode', () => {
    reduced = true;
    const { container } = render(<WayBackdrop />);
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
    expect(container.firstElementChild?.getAttribute('data-way-motion')).toBe('reduced');
    expect(container.querySelectorAll('[data-way-object]')).toHaveLength(6);
    expect(mocks.useScroll).not.toHaveBeenCalled();

    for (const image of container.querySelectorAll('img')) {
      expect(image.alt).toBe('');
      expect(image.draggable).toBe(false);
      const sculpture = image.getAttribute('src') === '/rescale-sculpture.webp';
      expect(image.width).toBe(sculpture ? 400 : 220);
      expect(image.height).toBe(sculpture ? 408 : 230);
    }
    expect(container.querySelectorAll('button, a, [tabindex]')).toHaveLength(0);
  });

  it('responds to preference changes and removes the preference listener on unmount', () => {
    const { container, unmount } = render(<WayBackdrop />);
    expect(container.firstElementChild?.getAttribute('data-way-motion')).toBe('scroll');
    expect(listeners.size).toBe(1);

    act(() => {
      reduced = true;
      listeners.forEach((listener) => listener());
    });
    expect(container.firstElementChild?.getAttribute('data-way-motion')).toBe('reduced');
    expect(container.querySelector('[data-way-object]')?.getAttribute('style')).toBeNull();

    act(() => {
      reduced = false;
      listeners.forEach((listener) => listener());
    });
    expect(container.firstElementChild?.getAttribute('data-way-motion')).toBe('scroll');
    unmount();
    expect(listeners.size).toBe(0);
  });

  it('changes transform variables on scroll and restores them when scrolling back', async () => {
    const { container } = render(<WayBackdrop />);
    const sculpture = container.querySelector<HTMLElement>('[data-way-object="sculpture"]')!;
    const initial = sculpture.style.getPropertyValue('--drift-y');

    act(() => scroll.set(900));
    await waitFor(() => expect(sculpture.style.getPropertyValue('--drift-y')).not.toBe(initial));
    expect(Math.abs(parseFloat(sculpture.style.getPropertyValue('--drift-y')))).toBeLessThanOrEqual(
      22,
    );

    act(() => scroll.set(0));
    await waitFor(() => expect(sculpture.style.getPropertyValue('--drift-y')).toBe(initial));
  });

  it('falls back to static artwork when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { container } = render(<WayBackdrop />);
    expect(container.firstElementChild?.getAttribute('data-way-motion')).toBe('reduced');
    expect(mocks.useScroll).not.toHaveBeenCalled();
  });
});
