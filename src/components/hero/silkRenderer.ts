import { fragment, vertex } from './silkShaders';

export type SilkStatus = 'ready' | 'failed' | 'lost';
export type SilkSnapshot = {
  width: number;
  height: number;
  dpr: number;
  title: [number, number, number, number];
  hidden: boolean;
  visible: boolean;
  reduced: boolean;
};
export type SilkRenderer = { update: (snapshot: SilkSnapshot) => void; destroy: () => void };
type SilkCanvas = HTMLCanvasElement | OffscreenCanvas;
type RendererOptions = {
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (id: number) => void;
  report: (status: SilkStatus) => void;
  createContext?: (canvas: SilkCanvas) => WebGLRenderingContext | null;
  log?: (prefix: string, error: unknown) => void;
};

export function createSilkRenderer(canvas: SilkCanvas, options: RendererOptions): SilkRenderer {
  let gl: WebGLRenderingContext | null = null;
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let shaders: WebGLShader[] = [];
  let phase: WebGLUniformLocation | null = null;
  let size: WebGLUniformLocation | null = null;
  let title: WebGLUniformLocation | null = null;
  let snapshot: SilkSnapshot | undefined;
  let frame = 0;
  let elapsed = 0;
  let previous: number | null = null;
  let lost = false;
  let destroyed = false;

  function stop() {
    if (frame) options.cancelFrame(frame);
    frame = 0;
    previous = null;
  }
  function release() {
    if (gl) {
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      shaders.forEach((shader) => gl!.deleteShader(shader));
    }
    buffer = null;
    program = null;
    shaders = [];
  }
  function initialize() {
    try {
      gl = options.createContext
        ? options.createContext(canvas)
        : (canvas.getContext('webgl', {
            alpha: false,
            antialias: false,
            depth: false,
            powerPreference: 'low-power',
          }) as WebGLRenderingContext | null);
      if (!gl) {
        options.report('failed');
        return;
      }
      program = gl.createProgram();
      if (!program) throw new Error('Could not create program');
      for (const [type, source] of [
        [gl.VERTEX_SHADER, vertex],
        [gl.FRAGMENT_SHADER, fragment],
      ] as const) {
        const shader = gl.createShader(type);
        if (!shader) throw new Error('Could not create shader');
        shaders.push(shader);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
          throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader compilation failed');
        gl.attachShader(program, shader);
      }
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(program) ?? 'Program linking failed');
      gl.useProgram(program);
      buffer = gl.createBuffer();
      if (!buffer) throw new Error('Could not create buffer');
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      );
      const position = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      phase = gl.getUniformLocation(program, 'phase');
      size = gl.getUniformLocation(program, 'size');
      title = gl.getUniformLocation(program, 'title');
    } catch (error) {
      (options.log ?? console.error)('Hero renderer:', error);
      release();
      options.report('failed');
    }
  }
  function drawable() {
    return !!(program && snapshot && !lost && !destroyed && !snapshot.hidden && snapshot.visible);
  }
  function draw() {
    if (!drawable() || !gl || !snapshot) return;
    gl.uniform1f(phase, snapshot.reduced ? 0.65 : (elapsed / 10000) * Math.PI * 2 + 0.65);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function tick(now: number) {
    frame = 0;
    if (!drawable() || snapshot?.reduced) return;
    if (previous !== null) elapsed += Math.min(now - previous, 100);
    previous = now;
    draw();
    frame = options.requestFrame(tick);
  }
  function sync(redraw: boolean) {
    stop();
    if (!drawable()) return;
    if (redraw) draw();
    if (!snapshot!.reduced) frame = options.requestFrame(tick);
  }
  function resize() {
    if (!gl || !program || !snapshot || lost) return;
    const scale = Math.min(snapshot.dpr, 1.5) * 0.65;
    canvas.width = Math.round(snapshot.width * scale);
    canvas.height = Math.round(snapshot.height * scale);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(size, snapshot.width, snapshot.height);
    gl.uniform4f(title, ...snapshot.title);
  }
  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    stop();
    options.report('lost');
  };
  const onRestored = () => {
    // React integration: rebuild resources in place; do not reload the student's page.
    release();
    lost = false;
    initialize();
    resize();
    sync(true);
    if (program) options.report('ready');
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  initialize();
  return {
    update(next) {
      if (destroyed) return;
      const geometryChanged =
        !snapshot ||
        next.width !== snapshot.width ||
        next.height !== snapshot.height ||
        next.dpr !== snapshot.dpr ||
        next.title.some((value, index) => value !== snapshot!.title[index]);
      const stateChanged =
        !snapshot ||
        next.hidden !== snapshot.hidden ||
        next.visible !== snapshot.visible ||
        next.reduced !== snapshot.reduced;
      const first = !snapshot;
      snapshot = next;
      if (geometryChanged) resize();
      if (geometryChanged || stateChanged) sync(true);
      if (first && program) options.report('ready');
    },
    destroy() {
      destroyed = true;
      stop();
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      release();
    },
  };
}
