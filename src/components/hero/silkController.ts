import {
  createSilkRenderer,
  type SilkRenderer,
  type SilkSnapshot,
  type SilkStatus,
} from './silkRenderer';

export type SilkEnvironment = {
  defer: (callback: () => void) => () => void;
  transfer?: (canvas: HTMLCanvasElement) => OffscreenCanvas;
  createWorker?: () => Worker;
  createRenderer: (canvas: HTMLCanvasElement, report: (status: SilkStatus) => void) => SilkRenderer;
  observeResize: (callback: () => void, hero: HTMLElement) => () => void;
  observeIntersection: (callback: (visible: boolean) => void, hero: HTMLElement) => () => void;
  document: Document;
  media: MediaQueryList;
  fontsReady: Promise<unknown>;
  hidden: () => boolean;
  dpr: () => number;
};

export function browserEnvironment(): SilkEnvironment {
  return {
    defer(callback) {
      if (window.requestIdleCallback) {
        const id = window.requestIdleCallback(callback);
        return () => window.cancelIdleCallback(id);
      }
      const id = window.setTimeout(callback, 1);
      return () => window.clearTimeout(id);
    },
    transfer:
      typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function' &&
      typeof Worker !== 'undefined'
        ? (canvas) => canvas.transferControlToOffscreen()
        : undefined,
    createWorker: () =>
      new Worker(new URL('./silkRenderer.worker.ts', import.meta.url), { type: 'module' }),
    createRenderer: (canvas, report) =>
      createSilkRenderer(canvas, {
        report,
        requestFrame: (callback) => requestAnimationFrame(callback),
        cancelFrame: (id) => cancelAnimationFrame(id),
      }),
    observeResize(callback, hero) {
      const observer = new ResizeObserver(callback);
      observer.observe(hero);
      return () => observer.disconnect();
    },
    observeIntersection(callback, hero) {
      const observer = new IntersectionObserver(([entry]) => callback(entry.isIntersecting));
      observer.observe(hero);
      return () => observer.disconnect();
    },
    document,
    media: matchMedia('(prefers-reduced-motion: reduce)'),
    fontsReady: document.fonts.ready,
    hidden: () => document.hidden,
    dpr: () => window.devicePixelRatio,
  };
}

export function mountSilk(hero: HTMLElement, canvas: HTMLCanvasElement, env: SilkEnvironment) {
  let disposed = false;
  let visible = true;
  let worker: Worker | undefined;
  let renderer: SilkRenderer | undefined;
  const report = (status: SilkStatus) => {
    if (!disposed) hero.dataset.renderer = status === 'ready' ? 'webgl' : 'fallback';
  };
  const measure = (): SilkSnapshot => {
    const bounds = hero.getBoundingClientRect();
    const heading = hero.querySelector('h1')!.getBoundingClientRect();
    return {
      width: bounds.width,
      height: bounds.height,
      dpr: env.dpr(),
      title: [
        heading.left - bounds.left,
        heading.top - bounds.top,
        heading.right - bounds.left,
        heading.bottom - bounds.top,
      ],
      hidden: env.hidden(),
      visible,
      reduced: env.media.matches,
    };
  };
  const sync = () => {
    if (disposed || (!worker && !renderer)) return;
    const snapshot = measure();
    if (worker) worker.postMessage({ type: 'update', snapshot });
    else renderer!.update(snapshot);
  };
  const cancelIdle = env.defer(() => {
    if (disposed) return;
    if (env.transfer && env.createWorker) {
      try {
        worker = env.createWorker();
        worker.onmessage = (event: MessageEvent<SilkStatus>) => report(event.data);
        worker.onerror = () => {
          report('failed');
          worker?.terminate();
          worker = undefined;
        };
        const offscreen = env.transfer(canvas);
        hero.dataset.rendererThread = 'worker';
        worker.postMessage({ type: 'init', canvas: offscreen, snapshot: measure() }, [offscreen]);
        return;
      } catch {
        worker?.terminate();
        worker = undefined;
        // A transferred canvas cannot acquire a main-thread context; keep the CSS fallback.
        if (hero.dataset.rendererThread === 'worker') {
          report('failed');
          return;
        }
      }
    }
    hero.dataset.rendererThread = 'main';
    renderer = env.createRenderer(canvas, report);
    sync();
  });
  const disconnectResize = env.observeResize(sync, hero);
  const disconnectIntersection = env.observeIntersection((value) => {
    visible = value;
    sync();
  }, hero);
  env.document.addEventListener('visibilitychange', sync);
  env.media.addEventListener('change', sync);
  void env.fontsReady.then(sync);
  return () => {
    disposed = true;
    cancelIdle();
    disconnectResize();
    disconnectIntersection();
    env.document.removeEventListener('visibilitychange', sync);
    env.media.removeEventListener('change', sync);
    worker?.terminate();
    renderer?.destroy();
    delete hero.dataset.renderer;
    delete hero.dataset.rendererThread;
  };
}
