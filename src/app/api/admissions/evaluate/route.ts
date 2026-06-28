import { headers } from 'next/headers';
import { z } from 'zod';

import { ApiRouteError, toErrorResponse } from '@/app/api/_lib/errors';
import { listCatalogueInstitutions, listCataloguePrograms } from '@/server/catalogue/queries';
import { evaluateAdmissionsForProgram } from '@/server/admissions/evaluator';
import { assertAdmissionsEvaluationRateLimit } from '@/server/admissions/rateLimit';

export const dynamic = 'force-dynamic';

const MAX_CONTENT_LENGTH_BYTES = 2048;

const admissionsEvaluationSchema = z.object({
  degreeId: z.string().min(1),
  psychometric: z.number().int().min(200).max(800),
  bagrut: z.number().min(60).max(120),
  extraInputs: z
    .object({
      psychometricMath: z.number().int().min(50).max(150).optional(),
      psychometricVerbal: z.number().int().min(50).max(150).optional(),
      psychometricEnglish: z.number().int().min(50).max(150).optional(),
      mathUnits: z.number().int().min(3).max(5).optional(),
      mathGrade: z.number().int().min(50).max(100).optional(),
      englishUnits: z.number().int().min(3).max(5).optional(),
      englishGrade: z.number().int().min(50).max(100).optional(),
      physicsUnits: z.number().int().min(3).max(5).optional(),
      physicsGrade: z.number().int().min(50).max(100).optional(),
      csUnits: z.number().int().min(3).max(5).optional(),
      csGrade: z.number().int().min(50).max(100).optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    assertContentLength(request);
    assertAdmissionsEvaluationRateLimit(await resolveClientKey());

    const body = await readJsonBody(request);
    const parsed = admissionsEvaluationSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiRouteError(
        400,
        'ADMISSIONS_EVALUATION_PAYLOAD_INVALID',
        'Admissions evaluation payload is invalid.',
      );
    }

    const [programsResult, institutionsResult] = await Promise.all([
      listCataloguePrograms(),
      listCatalogueInstitutions(),
    ]);

    const program = programsResult.data.find((entry) => entry.id === parsed.data.degreeId);
    if (!program) {
      throw new ApiRouteError(
        404,
        'ADMISSIONS_PROGRAM_NOT_FOUND',
        'The requested programme was not found in the catalogue.',
      );
    }

    const report = await evaluateAdmissionsForProgram({
      input: parsed.data,
      program,
      institutions: institutionsResult.data,
    });

    return Response.json({ data: report });
  } catch (error) {
    if (error instanceof Error && error.message === 'RATE_LIMITED') {
      return Response.json(
        {
          error: {
            code: 'ADMISSIONS_EVALUATION_RATE_LIMITED',
            message: 'Too many admissions evaluation requests. Please try again shortly.',
          },
        },
        { status: 429 },
      );
    }

    return toErrorResponse(error, {
      code: 'ADMISSIONS_EVALUATION_INTERNAL_ERROR',
      message: 'Unable to evaluate admissions right now.',
    });
  }
}

async function resolveClientKey() {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return requestHeaders.get('x-real-ip') ?? 'anonymous';
}

function assertContentLength(request: Request) {
  const value = request.headers.get('content-length');
  if (!value) {
    return;
  }

  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > MAX_CONTENT_LENGTH_BYTES) {
    throw new ApiRouteError(
      413,
      'ADMISSIONS_EVALUATION_PAYLOAD_TOO_LARGE',
      'Admissions evaluation payload is too large.',
    );
  }
}

async function readJsonBody(request: Request) {
  try {
    return (await request.json()) as unknown;
  } catch {
    throw new ApiRouteError(
      400,
      'ADMISSIONS_EVALUATION_PAYLOAD_INVALID',
      'Admissions evaluation payload is invalid.',
    );
  }
}
