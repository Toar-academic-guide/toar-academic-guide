import {
  getUserProfileSnapshot,
  mergeUserProfileDraftIntoSnapshot,
  replaceUserProfileSnapshot,
} from '@/server/user/profile';
import { profileRequestBodySchema } from '@/server/user/profileSchema';
import { getPostHogClient } from '@/lib/posthog-server';
import { requireAuthenticatedUserId } from '@/app/api/_lib/auth';
import { ApiRouteError, toErrorResponse } from '@/app/api/_lib/errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await requireAuthenticatedUserId();
    const data = await getUserProfileSnapshot(userId);
    return Response.json({ data });
  } catch (error) {
    return toErrorResponse(error, {
      code: 'PROFILE_INTERNAL_ERROR',
      message: 'Unable to load profile.',
    });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await requireAuthenticatedUserId();
    const body = await parseProfileRequestBody(request);
    const profile = body.profile;

    const data =
      body.mode === 'merge_local_draft'
        ? await mergeUserProfileDraftIntoSnapshot(userId, profile)
        : await replaceUserProfileSnapshot(userId, profile);

    getPostHogClient().capture({
      distinctId: userId,
      event: 'server_profile_updated',
      properties: { mode: body.mode ?? 'replace' },
    });

    return Response.json({ data });
  } catch (error) {
    return toErrorResponse(error, {
      code: 'PROFILE_INTERNAL_ERROR',
      message: 'Unable to load profile.',
    });
  }
}

async function parseProfileRequestBody(request: Request) {
  const body = await readJsonBody(
    request,
    'PROFILE_PAYLOAD_INVALID',
    'Profile payload is invalid.',
  );
  const parsed = profileRequestBodySchema.safeParse(body);

  if (!parsed.success) {
    throw new ApiRouteError(400, 'PROFILE_PAYLOAD_INVALID', 'Profile payload is invalid.');
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
