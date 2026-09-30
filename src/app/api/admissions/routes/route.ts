import { headers } from 'next/headers';
import { z } from 'zod';

import { requireAuthenticatedUserId } from '@/app/api/_lib/auth';
import { ApiRouteError, toErrorResponse } from '@/app/api/_lib/errors';
import { runTauComputerScienceRouteSimulation } from '@/server/admissions/routes/tauRouteSimulation';
import { runBguComputerScienceProfileRouteSimulation } from '@/server/admissions/routes/bguRouteSimulation';
import { acquireAdmissionsRouteRequest } from '@/server/admissions/routes/rateLimit';
import { getAdmissionRouteCapability } from '@/server/admissions/routes/capabilityRegistry';
import { getUserProfileSnapshot } from '@/server/user/profile';
import { bagrutSubjectRecordSchema } from '@/lib/bagrutSubjectRecordSchema';

export const dynamic = 'force-dynamic';

const MAX_CONTENT_LENGTH_BYTES = 12_000;
const tauInputProfileSchema = z
  .object({
    psychometric: z.number().int().min(200).max(800),
    tauBagrutAverage: z.number().min(60).max(120),
    tauApplicationRequirementsConfirmed: z.boolean().optional(),
    tauMathPlacementScore: z.number().min(0).max(1000).optional(),
    subjectRecord: bagrutSubjectRecordSchema,
  })
  .strict();
const bguInputProfileSchema = z
  .object({
    psychometric: z.number().int().min(200).max(800),
    bguBagrutAverage: z.number().min(50).max(120),
    quantitativeSubscore: z.number().int().min(50).max(150),
    verbalSubscore: z.number().int().min(50).max(150),
    englishSubscore: z.number().int().min(50).max(150),
    languageRequirementsConfirmed: z.literal(true),
    subjectRecord: bagrutSubjectRecordSchema,
  })
  .strict();
const requestSchema = z.union([
  z
    .object({
      degreeId: z.literal('tau_cs'),
      source: z.literal('input'),
      profile: tauInputProfileSchema,
    })
    .strict(),
  z.object({ degreeId: z.literal('tau_cs'), source: z.literal('saved_profile') }).strict(),
  z
    .object({
      degreeId: z.literal('bgu_cs'),
      source: z.literal('input'),
      profile: bguInputProfileSchema,
    })
    .strict(),
  z.object({ degreeId: z.literal('bgu_cs'), source: z.literal('saved_profile') }).strict(),
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

    const clientKey = await resolveClientKey();
    release = acquireAdmissionsRouteRequest(clientKey);
    const result =
      parsed.data.degreeId === 'tau_cs'
        ? await runTauComputerScienceRouteSimulation({
            profile:
              parsed.data.source === 'saved_profile'
                ? await loadSavedTauProfile()
                : parsed.data.profile,
          })
        : await runBguComputerScienceProfileRouteSimulation({
            profile:
              parsed.data.source === 'saved_profile'
                ? await loadSavedBguProfile()
                : parsed.data.profile,
          });

    return Response.json({
      data: {
        ...result,
        target: {
          degreeId: parsed.data.degreeId,
          pairId: capability.pairId,
          institutionId: parsed.data.degreeId === 'tau_cs' ? 'tau' : 'bgu',
          verificationMode: capability.verificationMode,
        },
        evidence: {
          evaluatorCapability: capability.evaluatorCapability,
          evaluatedCandidateCount: result.evaluatedCandidateCount,
          unavailableFinalistCount: result.unavailableFinalistCount,
        },
      },
    });
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

async function loadSavedAcademicScores() {
  const userId = await requireAuthenticatedUserId();
  const profile = await getUserProfileSnapshot(userId);
  return profile.academicScores;
}

async function loadSavedTauProfile() {
  const academicScores = await loadSavedAcademicScores();
  const psychometric = academicScores?.psychometric?.overall;
  const subjectRecord = academicScores?.bagrut?.subjectRecord;
  const tauBagrutAverage = academicScores?.admissions?.tauBagrutAverage;
  if (psychometric === undefined || !subjectRecord || tauBagrutAverage === undefined) {
    throw incompleteProfile();
  }
  return {
    psychometric,
    tauBagrutAverage,
    subjectRecord,
    tauApplicationRequirementsConfirmed:
      academicScores?.admissions?.tauApplicationRequirementsConfirmed,
    tauMathPlacementScore: academicScores?.admissions?.tauMathPlacementScore,
  };
}

async function loadSavedBguProfile() {
  const academicScores = await loadSavedAcademicScores();
  const psychometric = academicScores?.psychometric?.overall;
  const subjectRecord = academicScores?.bagrut?.subjectRecord;
  if (psychometric === undefined || !subjectRecord) {
    throw incompleteProfile();
  }

  const quantitativeSubscore = academicScores?.psychometric?.quantitative;
  const verbalSubscore = academicScores?.psychometric?.verbal;
  const englishSubscore = academicScores?.psychometric?.english;
  const bguBagrutAverage = academicScores?.admissions?.bguBagrutAverage;
  const languageRequirementsConfirmed =
    academicScores?.admissions?.bguLanguageRequirementsConfirmed;
  if (
    quantitativeSubscore === undefined ||
    verbalSubscore === undefined ||
    englishSubscore === undefined ||
    bguBagrutAverage === undefined ||
    languageRequirementsConfirmed !== true
  ) {
    throw incompleteProfile();
  }
  return {
    psychometric,
    bguBagrutAverage,
    quantitativeSubscore,
    verbalSubscore,
    englishSubscore,
    languageRequirementsConfirmed: true as const,
    subjectRecord,
  };
}

function incompleteProfile() {
  return new ApiRouteError(
    422,
    'ADMISSIONS_ROUTE_PROFILE_INCOMPLETE',
    'Saved academic profile is incomplete.',
  );
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
