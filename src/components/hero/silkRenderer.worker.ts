import { createSilkRenderer, type SilkRenderer, type SilkSnapshot } from './silkRenderer';

type SilkMessage =
  | { type: 'init'; canvas: OffscreenCanvas; snapshot: SilkSnapshot }
  | { type: 'update'; snapshot: SilkSnapshot };
let renderer: SilkRenderer | undefined;
self.onmessage = (event: MessageEvent<SilkMessage>) => {
  const message = event.data;
  if (message.type === 'init') {
    renderer?.destroy();
    renderer = createSilkRenderer(message.canvas, {
      requestFrame: (callback) => requestAnimationFrame(callback),
      cancelFrame: (id) => cancelAnimationFrame(id),
      report: (status) => self.postMessage(status),
    });
  }
  renderer?.update(message.snapshot);
};
