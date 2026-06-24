export class ApiRouteError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

interface ErrorFallback {
  code: string;
  message: string;
}

export function toErrorResponse(error: unknown, fallback: ErrorFallback) {
  if (error instanceof ApiRouteError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: error.status },
    );
  }

  const message = error instanceof Error ? error.message : fallback.message;

  return Response.json(
    {
      error: {
        code: fallback.code,
        message,
      },
    },
    { status: 500 },
  );
}
