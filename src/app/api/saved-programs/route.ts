import { createSupabaseServerClient } from '@/lib/supabase/server';
import { addSavedProgram, removeSavedProgram } from '@/server/user/profile';
import { savedProgramRequestBodySchema } from '@/server/user/profileSchema';
import { getPostHogClient } from '@/lib/posthog-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const userId = await requireAuthenticatedUserId();
    const { programId } = await parseSavedProgramRequestBody(request);

    const data = await addSavedProgram(userId, programId);
    getPostHogClient().capture({
      distinctId: userId,
      event: 'server_program_saved',
      properties: { program_id: programId },
    });
    return Response.json({ data });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await requireAuthenticatedUserId();
    const { programId } = await parseSavedProgramRequestBody(request);

    const data = await removeSavedProgram(userId, programId);
    getPostHogClient().capture({
      distinctId: userId,
      event: 'server_program_removed',
      properties: { program_id: programId },
    });
    return Response.json({ data });
  } catch (error) {
    return toErrorResponse(error);
  }
}

async function parseSavedProgramRequestBody(request: Request) {
  const body = await readJsonBody(
    request,
    'SAVED_PROGRAM_PAYLOAD_INVALID',
    'Saved program payload is invalid.'
  );
  const parsed = savedProgramRequestBodySchema.safeParse(body);

  if (!parsed.success) {
    throw new ApiRouteError(
      400,
      'SAVED_PROGRAM_PAYLOAD_INVALID',
      'Saved program payload is invalid.'
    );
  }

  return parsed.data;
}

async function readJsonBody(request: Request, code: string, message: string) {
  try {
    return (await request.json()) as unknown;
  } catch {
    throw new ApiRouteError(400, code, message);
  }
}

async function requireAuthenticatedUserId() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new ApiRouteError(503, 'SUPABASE_AUTH_UNAVAILABLE', 'Supabase auth is not configured.');
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new ApiRouteError(401, 'AUTH_REQUIRED', 'Authentication is required.');
  }

  return user.id;
}

class ApiRouteError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

function toErrorResponse(error: unknown) {
  if (error instanceof ApiRouteError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: error.status }
    );
  }

  const message = error instanceof Error ? error.message : 'Unable to update saved programs.';

  return Response.json(
    {
      error: {
        code: 'SAVED_PROGRAMS_INTERNAL_ERROR',
        message,
      },
    },
    { status: 500 }
  );
}
