const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

export function withBoundedOfficialResponse(
  fetcher: typeof fetch,
  options: { timeoutMs: number; maxBytes?: number },
): typeof fetch {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_RESPONSE_BYTES;

  return async (input, init) => {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutError = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(new Error(`Official source request timed out after ${options.timeoutMs}ms`));
      }, options.timeoutMs);
    });
    try {
      const response = await Promise.race([
        fetcher(input, { ...init, signal: controller.signal }),
        timeoutError,
      ]);
      const contentLength = Number(response.headers.get('content-length'));
      if (Number.isFinite(contentLength) && contentLength > maxBytes) {
        controller.abort();
        throw new Error(`Official source response exceeded ${maxBytes} byte limit`);
      }
      const body = await Promise.race([
        readBoundedBody(response, maxBytes, controller),
        timeoutError,
      ]);
      return new Response(body as unknown as BodyInit, {
        headers: response.headers,
        status: response.status,
        statusText: response.statusText,
      });
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  };
}

async function readBoundedBody(
  response: Response,
  maxBytes: number,
  controller: AbortController,
): Promise<Uint8Array> {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        controller.abort();
        await reader.cancel();
        throw new Error(`Official source response exceeded ${maxBytes} byte limit`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
