import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getUserProfileSnapshot,
  mergeUserProfileDraftIntoSnapshot,
  replaceUserProfileSnapshot,
} from '@/server/user/profile';
import { profileRequestBodySchema } from '@/server/user/profileSchema';
import { getPostHogClient } from '@/lib/posthog-server';

export const dynamic = 'force-dynamic';

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
    return toErrorResponse(error);
  }
}

async function parseProfileRequestBody(request: Request) {
  const body = await readJsonBody(request, 'PROFILE_PAYLOAD_INVALID', 'Profile payload is invalid.');
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
