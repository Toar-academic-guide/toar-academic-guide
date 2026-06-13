import type { UserProfile } from '@/types';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getUserProfileSnapshot,
  mergeUserProfileDraftIntoSnapshot,
  replaceUserProfileSnapshot,
} from '@/server/user/profile';

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
    return toErrorResponse(error);
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

  const message = error instanceof Error ? error.message : 'Unable to load profile.';

  return Response.json(
    {
      error: {
        code: 'PROFILE_INTERNAL_ERROR',
        message,
      },
    },
    { status: 500 }
  );
}

