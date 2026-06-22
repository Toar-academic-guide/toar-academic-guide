import { addSavedProgram, removeSavedProgram } from '@/server/user/profile';
import { getPostHogClient } from '@/lib/posthog-server';
import { requireAuthenticatedUserId } from '@/app/api/_lib/auth';
import { toErrorResponse } from '@/app/api/_lib/errors';

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
    return toErrorResponse(error, {
      code: 'SAVED_PROGRAMS_INTERNAL_ERROR',
      message: 'Unable to update saved programs.',
    });
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
    return toErrorResponse(error, {
      code: 'SAVED_PROGRAMS_INTERNAL_ERROR',
      message: 'Unable to update saved programs.',
    });
  }
}
