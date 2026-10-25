import { canonicalProgramId } from '@/lib/seo/programAliases';
import { headers } from 'next/headers';
import { z } from 'zod';

import { ApiRouteError, toErrorResponse } from '@/app/api/_lib/errors';
import { listCatalogueInstitutions, listCataloguePrograms } from '@/server/catalogue/queries';
import { evaluateAdmissionsForProgram } from '@/server/admissions/evaluator';
import { BATCH_B_PROGRAMS } from '@/server/admissions/batchBManualPathEvaluation';
import { assertAdmissionsEvaluationRateLimit } from '@/server/admissions/rateLimit';
import type { AdmissionsBatchReport } from '@/types/admissionsEvaluation';
import {
  admissionsEvaluationSchema,
  validateOverallBagrutAverage,
} from '@/lib/admissionsEvaluationSchema';

export const dynamic = 'force-dynamic';

const MAX_CONTENT_LENGTH_BYTES = 16_384;

const batchSchema = admissionsEvaluationSchema.omit({ degreeId: true }).extend({
  degreeIds: z
    .array(z.string().min(1))
    .min(1)
    .max(50)
    .refine((ids) => new Set(ids).size === ids.length),
});
const requestSchema = z
  .union([admissionsEvaluationSchema, batchSchema])
  .superRefine(validateOverallBagrutAverage);

export async function POST(request: Request) {
  try {
    assertContentLength(request);
    assertAdmissionsEvaluationRateLimit(await resolveClientKey());

    const body = await readJsonBody(request);
    const parsed = requestSchema.safeParse(body);
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

    if ('degreeIds' in parsed.data) {
      const { degreeIds, ...applicant } = parsed.data;
      const batch: AdmissionsBatchReport = { reports: {}, failedDegreeIds: [] };
      // One user action loads the catalogue once; at most four evaluators run together.
      for (let index = 0; index < degreeIds.length; index += 4) {
        await Promise.all(
          degreeIds.slice(index, index + 4).map(async (degreeId) => {
            const resolvedDegreeId = resolveEvaluationDegreeId(degreeId);
            const program = programsResult.data.find((entry) => entry.id === resolvedDegreeId);
            if (!program) {
              batch.failedDegreeIds.push(degreeId);
              return;
            }
            try {
              batch.reports[degreeId] = await evaluateAdmissionsForProgram({
                input: { ...applicant, degreeId: resolvedDegreeId },
                program,
                institutions: institutionsResult.data,
              });
            } catch {
              batch.failedDegreeIds.push(degreeId);
            }
          }),
        );
      }
      return Response.json({ data: batch });
    }
    const degreeId = resolveEvaluationDegreeId(parsed.data.degreeId);
    const program = programsResult.data.find((entry) => entry.id === degreeId);
    if (!program) {
      throw new ApiRouteError(
        404,
        'ADMISSIONS_PROGRAM_NOT_FOUND',
        'The requested programme was not found in the catalogue.',
      );
    }

    const report = await evaluateAdmissionsForProgram({
      input: { ...parsed.data, degreeId },
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

function resolveEvaluationDegreeId(degreeId: string): string {
  // Existing manual-gate programmes have evaluator-owned IDs; preserve those routes.
  return BATCH_B_PROGRAMS[degreeId] ? degreeId : canonicalProgramId(degreeId);
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
