// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { mountSilk, type SilkEnvironment } from './silkController';

function setup(worker = true) {
  const hero = document.createElement('section');
  hero.innerHTML = '<h1>title</h1><canvas></canvas><div class="hero-fallback"></div>';
  const canvas = hero.querySelector('canvas')!;
  let bounds = { width: 1280, height: 720, left: 0, top: 92 };
  hero.getBoundingClientRect = () => bounds as DOMRect;
  hero.querySelector('h1')!.getBoundingClientRect = () =>
    ({ left: 333, top: 186, right: 947, bottom: 359 }) as DOMRect;
  let idle: (() => void) | undefined;
  let resize: (() => void) | undefined;
  let intersect: ((visible: boolean) => void) | undefined;
  let hidden = false;
  const media = new EventTarget() as MediaQueryList;
  Object.defineProperty(media, 'matches', { value: false, configurable: true });
  const thread = {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    onmessage: null as ((event: MessageEvent) => void) | null,
    onerror: null as (() => void) | null,
  };
  const update = vi.fn();
  const destroy = vi.fn();
  const disconnectResize = vi.fn();
  const disconnectIntersection = vi.fn();
  let fontsReady: (() => void) | undefined;
  const fonts = new Promise<void>((resolve) => {
    fontsReady = resolve;
  });
  const env: SilkEnvironment = {
    defer: (callback) => {
      idle = callback;
      return vi.fn();
    },
    transfer: worker ? vi.fn(() => ({}) as OffscreenCanvas) : undefined,
    createWorker: vi.fn(() => thread as unknown as Worker),
    createRenderer: vi.fn((_canvas, report) => {
      report('ready');
      return { update, destroy };
    }),
    observeResize: (callback) => {
      resize = callback;
      return disconnectResize;
    },
    observeIntersection: (callback) => {
      intersect = callback;
      return disconnectIntersection;
    },
    document,
    media,
    fontsReady: fonts,
    hidden: () => hidden,
    dpr: () => 2,
  };
  const cleanup = mountSilk(hero, canvas, env);
  return {
    hero,
    env,
    thread,
    update,
    destroy,
    cleanup,
    disconnectResize,
    disconnectIntersection,
    start: () => idle!(),
    resize: () => resize!(),
    intersect: (value: boolean) => intersect!(value),
    setBounds: () => {
      bounds = { width: 390, height: 776, left: 0, top: 68 };
    },
    hide: () => {
      hidden = true;
      document.dispatchEvent(new Event('visibilitychange'));
    },
    fonts: async () => {
      fontsReady!();
      await fonts;
      await Promise.resolve();
    },
  };
}

describe('Hero controller', () => {
  it('defers all renderer work until idle and selects a transferred worker', () => {
    const h = setup();
    expect(h.env.createWorker).not.toHaveBeenCalled();
    expect(h.env.createRenderer).not.toHaveBeenCalled();
    h.start();
    expect(h.env.transfer).toHaveBeenCalledTimes(1);
    expect(h.env.createRenderer).not.toHaveBeenCalled();
    expect(h.hero.dataset.rendererThread).toBe('worker');
    expect(h.hero.dataset.renderer).not.toBe('webgl');
    h.thread.onmessage!({ data: 'ready' } as MessageEvent);
    expect(h.hero.dataset.renderer).toBe('webgl');
    h.thread.onmessage!({ data: 'lost' } as MessageEvent);
    expect(h.hero.dataset.renderer).toBe('fallback');
    h.thread.onmessage!({ data: 'failed' } as MessageEvent);
    expect(h.hero.dataset.renderer).toBe('fallback');
    h.cleanup();
    expect(h.thread.terminate).toHaveBeenCalledOnce();
  });
  it('uses the same renderer on the main thread when transfer is unavailable', () => {
    const h = setup(false);
    h.start();
    expect(h.env.createRenderer).toHaveBeenCalledOnce();
    expect(h.hero.dataset.rendererThread).toBe('main');
    expect(h.hero.dataset.renderer).toBe('webgl');
    h.hide();
    expect(h.update).toHaveBeenLastCalledWith(expect.objectContaining({ hidden: true }));
    h.intersect(false);
    expect(h.update).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }));
    h.cleanup();
    expect(h.destroy).toHaveBeenCalledOnce();
  });
  it('remeasures size and heading after resize and fonts, and forwards motion changes', async () => {
    const h = setup(false);
    h.start();
    expect(h.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ width: 1280, title: [333, 94, 947, 267], dpr: 2 }),
    );
    h.setBounds();
    h.resize();
    expect(h.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ width: 390, height: 776, title: [333, 118, 947, 291] }),
    );
    await h.fonts();
    expect(h.update).toHaveBeenCalledTimes(3);
    Object.defineProperty(h.env.media, 'matches', { value: true });
    h.env.media.dispatchEvent(new Event('change'));
    expect(h.update).toHaveBeenLastCalledWith(expect.objectContaining({ reduced: true }));
    h.cleanup();
  });
  it('releases observers/listeners and ignores font completion after unmount', async () => {
    const h = setup(false);
    h.start();
    h.cleanup();
    expect(h.disconnectResize).toHaveBeenCalledOnce();
    expect(h.disconnectIntersection).toHaveBeenCalledOnce();
    const count = h.update.mock.calls.length;
    h.hide();
    await h.fonts();
    expect(h.update).toHaveBeenCalledTimes(count);
  });
  it('cancels idle initialization if unmounted before it starts', () => {
    const h = setup();
    h.cleanup();
    h.start();
    expect(h.env.createWorker).not.toHaveBeenCalled();
  });
});
