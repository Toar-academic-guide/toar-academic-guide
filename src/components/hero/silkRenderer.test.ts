// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createSilkRenderer, type SilkSnapshot } from './silkRenderer';

const initial: SilkSnapshot = {
  width: 1280,
  height: 720,
  dpr: 2,
  title: [333, 94, 947, 267],
  hidden: false,
  visible: true,
  reduced: false,
};
function harness({ reduced = false, unavailable = false, compile = true, link = true } = {}) {
  const canvas = document.createElement('canvas');
  const gl = new Proxy(
    {
      createShader: vi.fn(() => ({})),
      createProgram: vi.fn(() => ({})),
      createBuffer: vi.fn(() => ({})),
      getShaderParameter: vi.fn(() => compile),
      getProgramParameter: vi.fn(() => link),
      getUniformLocation: vi.fn((_: unknown, name: string) => name),
    } as Record<string, unknown>,
    {
      get(target, key: string) {
        return target[key] ?? (target[key] = vi.fn());
      },
    },
  );
  const frames = new Map<number, FrameRequestCallback>();
  let id = 0;
  const report = vi.fn();
  const log = vi.fn();
  const createContext = vi.fn(() =>
    unavailable ? null : (gl as unknown as WebGLRenderingContext),
  );
  const renderer = createSilkRenderer(canvas, {
    createContext,
    report,
    log,
    requestFrame: (callback) => {
      frames.set(++id, callback);
      return id;
    },
    cancelFrame: (frame) => {
      frames.delete(frame);
    },
  });
  renderer.update({ ...initial, reduced });
  const tick = (now: number) => {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(now));
  };
  return { renderer, canvas, gl, frames, report, log, tick, createContext };
}

describe('Silk renderer lifecycle', () => {
  it('draws one reduced-motion frame at phase .65 without an ongoing animation', () => {
    const h = harness({ reduced: true });
    expect(h.gl.drawArrays).toHaveBeenCalledTimes(1);
    expect(h.gl.uniform1f).toHaveBeenLastCalledWith('phase', 0.65);
    expect(h.frames.size).toBe(0);
    h.renderer.update({ ...initial, reduced: true });
    expect(h.gl.drawArrays).toHaveBeenCalledTimes(1);
    h.renderer.destroy();
  });
  it.each([{ unavailable: true }, { compile: false }, { link: false }])(
    'keeps fallback on initialization failure %j',
    (options) => {
      const h = harness(options);
      expect(h.report).not.toHaveBeenCalledWith('ready');
      expect(h.report).toHaveBeenCalledWith('failed');
      expect(h.frames.size).toBe(0);
      if (!options.unavailable)
        expect(h.log).toHaveBeenCalledWith('Hero renderer:', expect.anything());
      h.renderer.destroy();
    },
  );
  it('uses CSS geometry for uniforms and capped DPR for the drawing buffer', () => {
    const h = harness();
    expect([h.canvas.width, h.canvas.height]).toEqual([1248, 702]);
    expect(h.gl.uniform2f).toHaveBeenCalledWith('size', 1280, 720);
    expect(h.gl.uniform4f).toHaveBeenCalledWith('title', 333, 94, 947, 267);
    h.renderer.update({ ...initial, width: 390, height: 776, dpr: 1, title: [24, 74, 366, 234] });
    expect([h.canvas.width, h.canvas.height]).toEqual([254, 504]);
    expect(h.gl.uniform4f).toHaveBeenLastCalledWith('title', 24, 74, 366, 234);
    h.renderer.destroy();
  });
  it('pauses hidden/offscreen work, preserves elapsed time, resets previous and clamps long frames', () => {
    const h = harness();
    h.tick(0);
    h.tick(50);
    h.renderer.update({ ...initial, hidden: true });
    expect(h.frames.size).toBe(0);
    const calls = (h.gl.drawArrays as ReturnType<typeof vi.fn>).mock.calls.length;
    h.renderer.update({ ...initial, visible: false });
    expect(h.frames.size).toBe(0);
    expect(h.gl.drawArrays).toHaveBeenCalledTimes(calls);
    h.renderer.update(initial);
    h.tick(5000);
    expect(h.gl.uniform1f).toHaveBeenLastCalledWith('phase', (50 / 10000) * Math.PI * 2 + 0.65);
    h.tick(10000);
    expect(h.gl.uniform1f).toHaveBeenLastCalledWith('phase', (150 / 10000) * Math.PI * 2 + 0.65);
    h.renderer.update({ ...initial, reduced: true });
    expect(h.frames.size).toBe(0);
    expect(h.gl.uniform1f).toHaveBeenLastCalledWith('phase', 0.65);
    h.renderer.destroy();
  });
  it('falls back on context loss and reinitializes on restoration without reloading', () => {
    const h = harness();
    const event = new Event('webglcontextlost', { cancelable: true });
    h.canvas.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(h.report).toHaveBeenLastCalledWith('lost');
    expect(h.frames.size).toBe(0);
    h.canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(h.createContext).toHaveBeenCalledTimes(2);
    expect(h.report).toHaveBeenLastCalledWith('ready');
    h.renderer.destroy();
  });
  it('releases the frame, GL resources and context listeners on destruction', () => {
    const h = harness();
    h.renderer.destroy();
    expect(h.frames.size).toBe(0);
    expect(h.gl.deleteBuffer).toHaveBeenCalledTimes(1);
    expect(h.gl.deleteProgram).toHaveBeenCalledTimes(1);
    expect(h.gl.deleteShader).toHaveBeenCalledTimes(2);
    h.canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(h.createContext).toHaveBeenCalledTimes(1);
  });
});
