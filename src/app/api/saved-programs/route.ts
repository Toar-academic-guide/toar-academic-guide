import { createSupabaseServerClient } from '@/lib/supabase/server';
import { addSavedProgram, removeSavedProgram } from '@/server/user/profile';
import { getPostHogClient } from '@/lib/posthog-server';

export const dynamic = 'force-dynamic';

interface SavedProgramBody {
  programId: string;
}

export async function POST(request: Request) {
  try {
    const userId = await requireAuthenticatedUserId();
    const { programId } = (await request.json()) as SavedProgramBody;

    if (!programId) {
      return Response.json(
        {
          error: {
            code: 'PROGRAM_ID_REQUIRED',
            message: 'programId is required.',
          },
        },
        { status: 400 }
      );
    }

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
    const { programId } = (await request.json()) as SavedProgramBody;

    if (!programId) {
      return Response.json(
        {
          error: {
            code: 'PROGRAM_ID_REQUIRED',
            message: 'programId is required.',
          },
        },
        { status: 400 }
      );
    }

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
