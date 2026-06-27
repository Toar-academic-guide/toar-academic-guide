import type {
  AdmissionsEvaluationInput,
  AdmissionsEvaluationReport,
} from '@/types/admissionsEvaluation';

export class AdmissionsEvaluationApiError extends Error {
  code: string;

  constructor(message: string, code = 'ADMISSIONS_EVALUATION_REQUEST_FAILED') {
    super(message);
    this.name = 'AdmissionsEvaluationApiError';
    this.code = code;
  }
}

export async function fetchAdmissionsEvaluation(
  input: AdmissionsEvaluationInput,
): Promise<AdmissionsEvaluationReport> {
  const response = await fetch('/api/admissions/evaluate', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as {
    data?: AdmissionsEvaluationReport;
    error?: { code?: string; message?: string };
  };

  if (!response.ok || !payload.data) {
    throw new AdmissionsEvaluationApiError(
      payload.error?.message ?? 'Unable to evaluate admissions right now.',
      payload.error?.code,
    );
  }

  return payload.data;
}
