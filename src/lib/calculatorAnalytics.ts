import posthog from 'posthog-js';
import type { AdmissionsEvaluationResult } from '@/types/admissionsEvaluation';

type Surface = 'sekhem_calculator' | 'journey_calculator';
type Source = 'evaluation' | 'simulation';
type Outcome = 'computed' | 'empty' | 'needs_input' | 'gated' | 'unavailable' | 'partial' | 'error';
type Option = { result?: AdmissionsEvaluationResult; failed?: boolean };

export function createCalculatorRun(source: Source) {
  return { source, completed: false, outcomes: new Set<Outcome>() };
}
export type CalculatorRun = ReturnType<typeof createCalculatorRun>;

function capture(event: string, properties: Record<string, string>) {
  try {
    posthog.capture(event, properties);
  } catch {
    // Instrumentation must not interrupt evaluation or form submission.
  }
}

function optionStatus({ result, failed }: Option): Outcome {
  if (failed || !result) return 'error';
  if (
    [
      'stale',
      'blocked',
      'missing',
      'authority_unavailable',
      'tracked_missing_rule',
      'unsupported',
    ].includes(result.capability) ||
    ['authority_unavailable', 'tracked_missing_rule', 'unsupported', 'degraded'].includes(
      result.kind,
    )
  )
    return 'unavailable';
  if (
    result.kind === 'needs_input' ||
    result.capability === 'needs_input' ||
    result.requiredInputs?.length
  )
    return 'needs_input';
  if (
    ['manual_gate', 'requirements_only'].includes(result.kind) ||
    ['manual_gate', 'requirements_only', 'score_only'].includes(result.capability) ||
    result.additionalConditions?.some((condition) => condition.status !== 'confirmed')
  )
    return 'gated';
  if (
    ['exact', 'estimated', 'open_admission'].includes(result.kind) &&
    ['accepted', 'below', 'eligible_to_apply'].includes(result.decision)
  )
    return 'computed';
  return 'gated';
}

function countBucket(count: number) {
  if (count === 0) return '0';
  if (count === 1) return '1';
  if (count <= 5) return '2_5';
  if (count <= 20) return '6_20';
  if (count <= 50) return '21_50';
  return '51_plus';
}

/** Call only after the current deliberate run's settled outcome is committed to the UI. */
export function captureCalculatorOutcome(
  run: CalculatorRun,
  surface: Surface,
  options: Option[],
  allowEmpty = false,
) {
  if (run.completed || (!options.length && !allowEmpty)) return;
  const statuses = options.map(optionStatus);
  const count = statuses.filter((status) => status === 'computed').length;
  const status: Outcome = !statuses.length
    ? 'empty'
    : count === statuses.length
      ? 'computed'
      : new Set(statuses).size > 1
        ? 'partial'
        : statuses[0];
  if (run.outcomes.has(status)) return;
  run.outcomes.add(status);
  const completed = status === 'computed' || status === 'empty';
  if (completed) run.completed = true;
  capture(completed ? 'calculator_completed' : 'calculator_outcome', {
    calculator_surface: surface,
    source: run.source,
    result_status: status,
    result_count: countBucket(count),
  });
}

export function captureEnquiryProgress(
  programId: string,
  institutionId: string,
  surface: string,
  progress: { step: 'contact_entered' | 'validated' } | { attempt_kind: 'initial' | 'retry' },
) {
  capture('step' in progress ? 'enquiry_form_step_completed' : 'enquiry_submit_attempted', {
    program_id: programId,
    institution_id: institutionId,
    surface,
    ...progress,
  });
}
