import { addSavedProgram, removeSavedProgram } from '@/server/user/profile';
import { savedProgramRequestBodySchema } from '@/server/user/profileSchema';
import { getPostHogClient } from '@/lib/posthog-server';
import { requireAuthenticatedUserId } from '@/app/api/_lib/auth';
import { ApiRouteError, toErrorResponse } from '@/app/api/_lib/errors';

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
    return toErrorResponse(error, {
      code: 'SAVED_PROGRAMS_INTERNAL_ERROR',
      message: 'Unable to update saved programs.',
    });
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
    return toErrorResponse(error, {
      code: 'SAVED_PROGRAMS_INTERNAL_ERROR',
      message: 'Unable to update saved programs.',
    });
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
