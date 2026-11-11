import { beforeEach, expect, it, vi } from 'vitest';
import type { AdmissionsEvaluationResult } from '@/types/admissionsEvaluation';
import {
  captureCalculatorOutcome,
  captureEnquiryProgress,
  createCalculatorRun,
} from './calculatorAnalytics';

const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock('posthog-js', () => ({ default: { capture } }));
const result = (
  overrides: Partial<AdmissionsEvaluationResult> = {},
): AdmissionsEvaluationResult => ({
  institution: { id: 'tau', name: 'Private Name', region: 'center' },
  linkedInstitutionId: 'tau',
  capability: 'exact',
  kind: 'exact',
  decision: 'accepted',
  confidence: 'high',
  sourceLabel: 'private source',
  explanation: 'private explanation',
  nextAction: 'private action',
  score: 706,
  threshold: 700,
  officialUrls: ['https://private.example/?score=706'],
  ...overrides,
});
beforeEach(() => {
  capture.mockReset();
});

it.each([
  [{ kind: 'needs_input' }, 'needs_input'],
  [{ requiredInputs: ['psychometric_overall'] }, 'needs_input'],
  [{ kind: 'manual_gate', decision: 'eligible_to_apply' }, 'gated'],
  [{ kind: 'requirements_only' }, 'gated'],
  [{ decision: 'pending' }, 'gated'],
  [{ capability: 'score_only' }, 'gated'],
  [{ decision: 'unknown' }, 'gated'],
  [
    {
      additionalConditions: [
        { id: 'admissions_committee', label: 'private', status: 'unconfirmed' },
      ],
    },
    'gated',
  ],
  [{ capability: 'stale' }, 'unavailable'],
  [{ capability: 'blocked' }, 'unavailable'],
  [{ kind: 'authority_unavailable' }, 'unavailable'],
  [{ kind: 'unsupported' }, 'unavailable'],
  [{ kind: 'tracked_missing_rule' }, 'unavailable'],
  [{ kind: 'degraded' }, 'unavailable'],
] as const)('never completes a non-computed option %j', (overrides, status) => {
  const run = createCalculatorRun('evaluation');
  captureCalculatorOutcome(run, 'sekhem_calculator', [
    { result: result(overrides as Partial<AdmissionsEvaluationResult>) },
  ]);
  expect(capture.mock.calls).toEqual([
    [
      'calculator_outcome',
      {
        calculator_surface: 'sekhem_calculator',
        source: 'evaluation',
        result_status: status,
        result_count: '0',
      },
    ],
  ]);
});

it.each(['accepted', 'below', 'eligible_to_apply'] as const)(
  'completion means resolved options, including %s, not admission success',
  (decision) => {
    const run = createCalculatorRun('evaluation');
    captureCalculatorOutcome(run, 'journey_calculator', [{ result: result({ decision }) }]);
    captureCalculatorOutcome(run, 'journey_calculator', [{ result: result({ decision }) }]);
    expect(capture.mock.calls).toEqual([
      [
        'calculator_completed',
        {
          calculator_surface: 'journey_calculator',
          source: 'evaluation',
          result_status: 'computed',
          result_count: '1',
        },
      ],
    ]);
  },
);

it('distinguishes errors and partial outcomes, deduplicates retries, then completes the same run once', () => {
  const run = createCalculatorRun('simulation');
  captureCalculatorOutcome(run, 'journey_calculator', [{ failed: true }]);
  captureCalculatorOutcome(run, 'journey_calculator', [{ failed: true }]);
  captureCalculatorOutcome(run, 'journey_calculator', [{ result: result() }, {}]);
  captureCalculatorOutcome(run, 'journey_calculator', [
    { result: result() },
    { result: result({ kind: 'needs_input' }) },
  ]);
  captureCalculatorOutcome(run, 'journey_calculator', [{ result: result() }, { result: result() }]);
  captureCalculatorOutcome(run, 'journey_calculator', [{ result: result() }, { result: result() }]);
  expect(
    capture.mock.calls.map(([name, props]) => [name, props.result_status, props.result_count]),
  ).toEqual([
    ['calculator_outcome', 'error', '0'],
    ['calculator_outcome', 'partial', '1'],
    ['calculator_completed', 'computed', '2_5'],
  ]);
  expect(JSON.stringify(capture.mock.calls)).not.toMatch(
    /private|706|700|score|threshold|explanation|http/i,
  );
});

it.each([
  [0, '0'],
  [1, '1'],
  [2, '2_5'],
  [5, '2_5'],
  [6, '6_20'],
  [20, '6_20'],
  [21, '21_50'],
  [50, '21_50'],
  [51, '51_plus'],
] as const)('buckets %s resolved options', (count, bucket) => {
  captureCalculatorOutcome(
    createCalculatorRun('evaluation'),
    'journey_calculator',
    Array.from({ length: count }, () => ({ result: result() })),
    true,
  );
  expect(capture.mock.calls[0][1]).toMatchObject({
    result_count: bucket,
    result_status: count ? 'computed' : 'empty',
  });
});

it('does not treat an unapproved empty outcome as completion or throw tracking errors into the product', () => {
  const run = createCalculatorRun('evaluation');
  captureCalculatorOutcome(run, 'sekhem_calculator', []);
  expect(capture).not.toHaveBeenCalled();
  capture.mockImplementation(() => {
    throw new Error('private analytics exception');
  });
  expect(() =>
    captureCalculatorOutcome(run, 'sekhem_calculator', [{ result: result() }]),
  ).not.toThrow();
  expect(() => captureEnquiryProgress('cs', 'tau', 'journey', { step: 'validated' })).not.toThrow();
});
