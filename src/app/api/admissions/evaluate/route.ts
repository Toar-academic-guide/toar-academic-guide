import { headers } from 'next/headers';
import { z } from 'zod';

import { ApiRouteError, toErrorResponse } from '@/app/api/_lib/errors';
import { listCatalogueInstitutions, listCataloguePrograms } from '@/server/catalogue/queries';
import {
  evaluateAdmissionsForProgram,
  exactSourceIdsForEvaluation,
} from '@/server/admissions/evaluator';
import { loadFreshnessStatesBySourceIds } from '@/server/admissions/capabilityMatrix';
import { createEvaluationSourceContext } from '@/server/admissions/evaluationSources';
import {
  findAdmissionsEvaluationProgram,
  resolveAdmissionsEvaluationInstitutions,
} from '@/lib/admissionsEvaluationProgram';
import { serializeAdmissionsReport } from '@/lib/admissionsEvaluationSerialization';
import {
  admissionsEvaluationClientKey,
  assertAdmissionsEvaluationRateLimit,
} from '@/server/admissions/rateLimit';
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
  const startedAt = performance.now();
  const durations = { catalogue: 0, freshness: 0, sources: 0, compute: 0, total: 0 };
  // Catalogue/freshness are load wall times. Sources is the union of official
  // response wait intervals (including shared waits/queues), never a sum.
  // Compute is evaluation wall time minus sources, plus JSON serialization.
  // Total includes validation and all stages. No request values enter metrics.
  let completedResponse: Response | undefined;
  const respond = (build: () => Response) => {
    const serializationStart = performance.now();
    completedResponse = build();
    durations.compute += performance.now() - serializationStart;
    return completedResponse;
  };
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

    const catalogueStart = performance.now();
    const [programsResult, institutionsResult] = await Promise.all([
      listCataloguePrograms(),
      listCatalogueInstitutions(),
    ]).finally(() => {
      durations.catalogue = performance.now() - catalogueStart;
    });

    const isBatch = 'degreeIds' in parsed.data;
    const degreeIds = 'degreeIds' in parsed.data ? parsed.data.degreeIds : [parsed.data.degreeId];
    const targets = degreeIds.map((degreeId) =>
      findAdmissionsEvaluationProgram(programsResult.data, degreeId),
    );
    if (!isBatch && !targets[0]) {
      throw new ApiRouteError(
        404,
        'ADMISSIONS_PROGRAM_NOT_FOUND',
        'The requested programme was not found in the catalogue.',
      );
    }
    const sourceIds = [
      ...new Set(
        targets.flatMap((program, index) => {
          if (!program) return [];
          try {
            return exactSourceIdsForEvaluation(program, { ...parsed.data, degreeId: program.id });
          } catch (error) {
            if (!isBatch) throw error;
            targets[index] = undefined;
            return [];
          }
        }),
      ),
    ];
    const freshnessStart = performance.now();
    const freshnessLoad = await loadFreshnessStatesBySourceIds(sourceIds).finally(() => {
      durations.freshness = performance.now() - freshnessStart;
    });
    const sourceContext = createEvaluationSourceContext();
    const evaluationStart = performance.now();
    const evaluate = async (program: NonNullable<(typeof targets)[number]>) =>
      serializeAdmissionsReport(
        await evaluateAdmissionsForProgram({
          input: {
            ...('degreeIds' in parsed.data ? applicantInput(parsed.data) : parsed.data),
            degreeId: program.id,
          },
          program,
          institutions: resolveAdmissionsEvaluationInstitutions(program, institutionsResult.data),
          freshnessLoad,
          sourceContext,
        }),
      );
    let data;
    try {
      if (isBatch) {
        const reports = await Promise.all(
          targets.map(async (program) => {
            if (!program) return undefined;
            try {
              return await evaluate(program);
            } catch {
              return undefined;
            }
          }),
        );
        const batch: AdmissionsBatchReport = { reports: {}, failedDegreeIds: [] };
        for (const [index, degreeId] of degreeIds.entries()) {
          const report = reports[index];
          if (report) batch.reports[degreeId] = report;
          else batch.failedDegreeIds.push(degreeId);
        }
        data = batch;
      } else {
        data = await evaluate(targets[0]!);
      }
    } finally {
      durations.sources = sourceContext.sourcesDurationMs();
      durations.compute += Math.max(0, performance.now() - evaluationStart - durations.sources);
    }
    return respond(() => Response.json({ data }));
  } catch (error) {
    if (error instanceof Error && error.message === 'RATE_LIMITED') {
      return respond(() =>
        Response.json(
          {
            error: {
              code: 'ADMISSIONS_EVALUATION_RATE_LIMITED',
              message: 'Too many admissions evaluation requests. Please try again shortly.',
            },
          },
          { status: 429 },
        ),
      );
    }

    return respond(() =>
      toErrorResponse(error, {
        code: 'ADMISSIONS_EVALUATION_INTERNAL_ERROR',
        message: 'Unable to evaluate admissions right now.',
      }),
    );
  } finally {
    durations.total = performance.now() - startedAt;
    completedResponse?.headers.set(
      'Server-Timing',
      Object.entries(durations)
        .map(([name, duration]) => `${name};dur=${duration.toFixed(2)}`)
        .join(', '),
    );
  }
}

function applicantInput({ degreeIds: _degreeIds, ...applicant }: z.infer<typeof batchSchema>) {
  return applicant;
}

async function resolveClientKey() {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get('x-forwarded-for');
  const clientKey = forwardedFor
    ? forwardedFor.split(',')[0].trim()
    : (requestHeaders.get('x-real-ip') ?? 'anonymous');
  return admissionsEvaluationClientKey(clientKey, requestHeaders.get('x-myway-e2e-bucket'));
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
