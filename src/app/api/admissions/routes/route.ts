import { headers } from 'next/headers';
import { z } from 'zod';

import { requireAuthenticatedUserId } from '@/app/api/_lib/auth';
import { ApiRouteError, toErrorResponse } from '@/app/api/_lib/errors';
import { runTauComputerScienceRouteSimulation } from '@/server/admissions/routes/tauRouteSimulation';
import { acquireAdmissionsRouteRequest } from '@/server/admissions/routes/rateLimit';
import { getAdmissionRouteCapability } from '@/server/admissions/routes/capabilityRegistry';
import { getUserProfileSnapshot } from '@/server/user/profile';

export const dynamic = 'force-dynamic';

const MAX_CONTENT_LENGTH_BYTES = 12_000;
const subjectRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    sector: z.enum(['jewish', 'arab', 'druze', 'circassian', 'bedouin', 'samaritan']),
    subjects: z
      .array(
        z.object({
          subjectId: z.string().regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/),
          units: z.number().int().min(1).max(5),
          grade: z.number().int().min(0).max(100),
        }),
      )
      .min(1)
      .max(64),
  })
  .strict();
const inputProfileSchema = z
  .object({
    psychometric: z.number().int().min(200).max(800),
    bagrutAverage: z.number().min(60).max(120),
    subjectRecord: subjectRecordSchema,
  })
  .strict();
const requestSchema = z.union([
  z
    .object({
      degreeId: z.literal('tau_cs'),
      source: z.literal('input'),
      profile: inputProfileSchema,
    })
    .strict(),
  z.object({ degreeId: z.literal('tau_cs'), source: z.literal('saved_profile') }).strict(),
]);

export async function POST(request: Request) {
  let release: (() => void) | undefined;
  try {
    assertContentLength(request);
    const parsed = requestSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      throw new ApiRouteError(400, 'ADMISSIONS_ROUTE_PAYLOAD_INVALID', 'Route request is invalid.');
    }
    const capability = getAdmissionRouteCapability(parsed.data.degreeId);
    if (capability.status !== 'enabled') {
      throw new ApiRouteError(
        422,
        'ADMISSIONS_ROUTE_UNSUPPORTED',
        'Verified route simulation is not available for this programme.',
      );
    }

    const profile =
      parsed.data.source === 'saved_profile' ? await loadSavedProfile() : parsed.data.profile;
    const clientKey = await resolveClientKey();
    release = acquireAdmissionsRouteRequest(clientKey);
    const result = await runTauComputerScienceRouteSimulation({ profile });

    if (result.status === 'authority_unavailable') {
      return Response.json(
        {
          error: {
            code: 'ADMISSIONS_ROUTE_AUTHORITY_UNAVAILABLE',
            message: 'Official verification is unavailable.',
          },
        },
        { status: 503 },
      );
    }

    return Response.json({ data: result });
  } catch (error) {
    if (error instanceof Error && error.message === 'ROUTE_RATE_LIMITED') {
      const retryAfter = typeof error.cause === 'number' ? error.cause : 60;
      return Response.json(
        { error: { code: 'ADMISSIONS_ROUTE_RATE_LIMITED', message: 'Too many route requests.' } },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      );
    }
    return toErrorResponse(error, {
      code: 'ADMISSIONS_ROUTE_INTERNAL_ERROR',
      message: 'Unable to simulate an admissions route right now.',
    });
  } finally {
    release?.();
  }
}

async function loadSavedProfile() {
  const userId = await requireAuthenticatedUserId();
  const profile = await getUserProfileSnapshot(userId);
  const psychometric = profile.academicScores?.psychometric?.overall;
  const bagrutAverage = profile.academicScores?.bagrut?.weightedAverage;
  const subjectRecord = profile.academicScores?.bagrut?.subjectRecord;
  if (psychometric === undefined || bagrutAverage === undefined || !subjectRecord) {
    throw new ApiRouteError(
      422,
      'ADMISSIONS_ROUTE_PROFILE_INCOMPLETE',
      'Saved academic profile is incomplete.',
    );
  }
  return { psychometric, bagrutAverage, subjectRecord };
}

async function resolveClientKey() {
  const requestHeaders = await headers();
  return (
    requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    requestHeaders.get('x-real-ip') ??
    'anonymous'
  );
}

function assertContentLength(request: Request) {
  const size = Number(request.headers.get('content-length'));
  if (Number.isFinite(size) && size > MAX_CONTENT_LENGTH_BYTES) {
    throw new ApiRouteError(
      413,
      'ADMISSIONS_ROUTE_PAYLOAD_TOO_LARGE',
      'Route request is too large.',
    );
  }
}

async function readJsonBody(request: Request) {
  try {
    return (await request.json()) as unknown;
  } catch {
    throw new ApiRouteError(400, 'ADMISSIONS_ROUTE_PAYLOAD_INVALID', 'Route request is invalid.');
  }
}
