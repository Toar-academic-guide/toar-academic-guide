import type { UserProfile } from '@/types';
import {
  getUserProfileSnapshot,
  mergeUserProfileDraftIntoSnapshot,
  replaceUserProfileSnapshot,
} from '@/server/user/profile';
import { getPostHogClient } from '@/lib/posthog-server';
import { requireAuthenticatedUserId } from '@/app/api/_lib/auth';
import { toErrorResponse } from '@/app/api/_lib/errors';

export const dynamic = 'force-dynamic';

interface ProfileRequestBody {
  profile: UserProfile;
  mode?: 'replace' | 'merge_local_draft';
}

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
    const body = (await request.json()) as ProfileRequestBody;
    const profile = body.profile;

    if (!profile || !profile.geographicPreference) {
      return Response.json(
        {
          error: {
            code: 'PROFILE_PAYLOAD_INVALID',
            message: 'Profile payload is missing required fields.',
          },
        },
        { status: 400 }
      );
    }

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
