// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import hujiFeed from '@/test/fixtures/hujiPsychology2027.json';
import routingOfficial from '../../../docs/admissions-verification/2026-10-21-calculator-routing.json';
import haifaOfficial from '../../../docs/admissions-verification/2026-09-28-haifa-official.json';
import bguOfficial from '../../../docs/admissions-verification/2026-10-25-bgu-psychology-live.json';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { getProgramVerificationArtifact } from '@/data/admissions/tauProgramVerification';
import { afekaCases } from '@/test/afekaAdmissions';
import { resetAdmissionsEvaluationRateLimitForTests } from '@/server/admissions/rateLimit';
import type { SourceFreshnessStateRow } from '@/db/types';
import type {
  AdmissionsBatchReport,
  AdmissionsEvaluationInput,
  AdmissionsEvaluationResult,
} from '@/types/admissionsEvaluation';
import { formatSekhemNumber } from '@/lib/sekhemResultPresentation';
import SekhemResults from './SekhemResults';

const context = vi.hoisted(() => ({
  institutionId: '',
  programId: '',
  freshness: [] as SourceFreshnessStateRow[],
}));

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: async () => ({
    data: getStaticCataloguePrograms()
      .filter((program) => program.id === context.programId)
      .map((program) => ({ ...program, linkedInstitutionIds: [context.institutionId] })),
  }),
  listCatalogueInstitutions: async () => ({
    data: getStaticCatalogueInstitutions().filter((row) => row.id === context.institutionId),
  }),
}));
// Only the persistence boundary is replaced: capability, policy, adapters and evaluator stay real.
vi.mock('@/db/client', () => ({
  getDb: () => ({ select: () => ({ from: () => ({ where: async () => context.freshness }) }) }),
}));

import { POST } from '@/app/api/admissions/evaluate/route';

type ProfileCase = {
  name: string;
  institutionId: string;
  programId: string;
  input: Omit<AdmissionsEvaluationInput, 'degreeId'>;
  responses?: (string | object)[];
  expected: Pick<AdmissionsEvaluationResult, 'kind' | 'decision'> & {
    score: number | undefined;
    threshold: number | undefined;
  };
};

const tauCapture = routingOfficial.tau[0];
const technionCapture = routingOfficial.technion[0];
const haifaCapture = haifaOfficial.records.find((record) => record.programId === 'cs')!;

// Golden values come from retained official responses and the existing evaluator regressions,
// never from a second formula or a mocked evaluator answer.
const profiles: ProfileCase[] = [
  {
    name: 'TAU official engineering score and cutoff',
    institutionId: 'tau',
    programId: 'tau_ee',
    input: {
      psychometric: 730,
      bagrut: 115,
      extraInputs: {
        psychometricEnglish: 110,
        bagrutSubjectRecord: {
          schemaVersion: 1,
          sector: 'jewish',
          subjects: [
            { subjectId: 'mathematics', units: 5, grade: 82 },
            { subjectId: 'physics', units: 4, grade: 80 },
          ],
        },
      },
    },
    responses: tauCapture.responses.map((response) => response.body),
    expected: { kind: 'exact', decision: 'accepted', score: 730, threshold: 710 },
  },
  {
    name: 'HUJI raw evaluation is serialized to two decimals',
    institutionId: 'huji',
    programId: 'huji_psychology',
    input: { psychometric: 660, bagrut: 90 },
    responses: [hujiFeed],
    expected: { kind: 'exact', decision: 'below', score: 19.71, threshold: 22.5 },
  },
  {
    name: 'BGU official combined score keeps its pending score assessment',
    institutionId: 'bgu',
    programId: 'bgu_psychology',
    input: { psychometric: 650, bagrut: 112, extraInputs: { bguBagrutAverage: 112 } },
    responses: [bguOfficial.rulePayload, bguOfficial.scoreResponseHtml],
    expected: { kind: 'exact', decision: 'pending', score: 734, threshold: 650 },
  },
  {
    name: 'Haifa official combined score and programme conditions',
    institutionId: 'haifa',
    programId: 'haifa_cs',
    input: {
      psychometric: 800,
      bagrut: 120,
      extraInputs: {
        haifaBagrutAverage: 120,
        haifaBagrutYear: 2026,
        haifaPsychometricYear: 2026,
        haifaPsychometricMonth: 4,
        haifaAdmissionQualification: 'full_bagrut',
        haifaHebrewQualification: 'hebrew_school',
        psychometricMath: 150,
        psychometricVerbal: 150,
        psychometricEnglish: 150,
        mathUnits: 5,
        mathGrade: 100,
      },
    },
    responses: [{ data: {} }, haifaCapture.high.response],
    expected: { kind: 'manual_gate', decision: 'eligible_to_apply', score: 806, threshold: 700 },
  },
  {
    name: 'Technion official score and winter civil-engineering cutoff',
    institutionId: 'technion',
    programId: 'technion_civil',
    input: {
      psychometric: 800,
      bagrut: 100,
      extraInputs: {
        bagrutSubjectRecord: technionCapture.fixture.input.bagrutSubjectRecord as NonNullable<
          AdmissionsEvaluationInput['extraInputs']
        >['bagrutSubjectRecord'],
      },
    },
    responses: [
      technionCapture.responses[0].body!,
      `<h2>סיכום אפשרויות הקבלה למסלולים בסמסטר חורף תשפ״ז</h2><table id="tablepress-485"><tbody>${technionCapture.responses[1].civilRows!.join('')}</tbody></table>`,
    ],
    // Main #318 fixes the Hebrew-row gate; retained official numerical values are unchanged.
    expected: { kind: 'exact', decision: 'accepted', score: 98.9, threshold: 87 },
  },
  {
    name: 'Reichman direct route retains estimate attribution',
    institutionId: 'reichman',
    programId: 'reichman_law',
    input: { psychometric: 700 },
    expected: { kind: 'estimated', decision: 'pending', score: 700, threshold: 700 },
  },
  {
    name: 'BIU failed floors give a verdict without a composite',
    institutionId: 'biu',
    programId: 'biu_law',
    input: { psychometric: 420, bagrut: 70 },
    expected: { kind: 'estimated', decision: 'below', score: undefined, threshold: undefined },
  },
  {
    name: 'Afeka published routes pass without inventing a score',
    institutionId: 'afeka',
    programId: 'afeka_cs',
    input: afekaCases('afeka_cs')[0].input,
    expected: { kind: 'exact', decision: 'accepted', score: undefined, threshold: undefined },
  },
  {
    name: 'HIT missing floor inputs collapse to the shared honest line',
    institutionId: 'hit',
    programId: 'cs',
    input: { psychometric: 700, bagrut: 100 },
    expected: { kind: 'needs_input', decision: 'unknown', score: undefined, threshold: undefined },
  },
];

function prepareSourceState(programId: string, institutionId: string) {
  const artifact = getProgramVerificationArtifact(`${programId}__${institutionId}`);
  if (!artifact) return;
  const now = new Date();
  context.freshness = [
    {
      sourceId: artifact.contract.source.targetId,
      sourceClass: 'api_static_json',
      capability: 'decision_capable',
      status: 'fresh',
      proofLevel: 'exact_official',
      decisionProvenance: 'verified_derivation',
      reviewedSourceFingerprint: artifact.contract.sourceFingerprint,
      normalizedFingerprint: artifact.contract.sourceFingerprint,
      lastCheckedAt: now,
      lastSuccessfulCheckAt: now,
      lastExactCheckAt: now,
      lastChangedAt: null,
      latestFailureReason: null,
      blockedReason: null,
      rawFingerprint: null,
      normalizedDecisionPayload: {},
      latestReviewItemId: null,
      nextAction: null,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

async function evaluate(profile: ProfileCase) {
  context.institutionId = profile.institutionId;
  context.programId = profile.programId;
  prepareSourceState(profile.programId, profile.institutionId);
  const responses = [...(profile.responses ?? [])];
  const fetcher = vi.fn<typeof fetch>(async (url) => {
    if (String(url).includes('/api/enquiries')) throw new Error('Enquiries must stay mocked.');
    if (
      !/^https:\/\/(go\.tau\.ac\.il|go\.huji\.ac\.il|bgu4u(?:22)?\.bgu\.ac\.il|applicants\.haifa\.ac\.il|admissions\.technion\.ac\.il)/.test(
        String(url),
      )
    )
      throw new Error(`Unexpected transport: ${String(url)}`);
    const body = responses.shift();
    if (body === undefined) throw new Error(`No retained response for ${String(url)}`);
    return new Response(typeof body === 'string' ? body : JSON.stringify(body));
  });
  vi.stubGlobal('fetch', fetcher);
  const response = await POST(
    new Request('http://localhost/api/admissions/evaluate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ degreeIds: [profile.programId], ...profile.input }),
    }),
  );
  expect(response.status).toBe(200);
  const { data }: { data: AdmissionsBatchReport } = await response.json();
  expect(data.failedDegreeIds).toEqual([]);
  const report = data.reports[profile.programId];
  const result = report.results.find((row) => row.linkedInstitutionId === profile.institutionId)!;
  expect(result).toBeDefined();
  const offering = {
    programId: profile.programId,
    programName: report.program.name,
    institutionId: profile.institutionId,
    institutionName: result.institution.name,
  };
  render(<SekhemResults reports={[report]} offerings={[offering]} onEnquiry={vi.fn()} />);
  return { report, result, fetcher, remainingResponses: responses };
}

describe('real evaluator → batch POST → calculator result rows', () => {
  beforeEach(() => {
    resetAdmissionsEvaluationRateLimitForTests();
    context.freshness = [];
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each(profiles)('$name', async (profile) => {
    const { result, fetcher, remainingResponses } = await evaluate(profile);
    expect(result).toMatchObject({
      kind: profile.expected.kind,
      decision: profile.expected.decision,
    });
    expect(result.score).toBe(profile.expected.score);
    expect(result.threshold).toBe(profile.expected.threshold);
    if (profile.institutionId !== 'haifa') {
      expect(remainingResponses).toEqual([]);
      expect(fetcher).toHaveBeenCalledTimes(profile.responses?.length ?? 0);
    }
    const row = screen.queryByTestId(`result-${profile.programId}-${profile.institutionId}`);
    if (profile.institutionId === 'hit') {
      expect(row).toBeNull();
    } else {
      expect(row).not.toBeNull();
      expect(row!.getAttribute('data-decision')).toBe(result.decision);
      expect(row!.getAttribute('data-kind')).toBe(result.kind);
      expect(row!.getAttribute('data-capability')).toBe(result.capability);
      const numbers = row!.querySelectorAll('[data-result-number]');
      const returnedNumbers = [result.score, result.threshold].filter(
        (value) => typeof value === 'number',
      );
      expect(numbers).toHaveLength(returnedNumbers.length);
      for (const number of numbers) {
        const field = number.getAttribute('data-result-number') as 'score' | 'threshold';
        expect(number.textContent).toBe(formatSekhemNumber(result[field]!, profile.institutionId));
      }
      const expectedVerdict =
        profile.institutionId === 'biu'
          ? 'הציונים אינם עומדים בתנאי הקבלה שנבדקו.'
          : profile.institutionId === 'afeka'
            ? 'עומדים בתנאי הקבלה של התוכנית'
            : result.decision === 'accepted' || result.scoreAssessment === 'meets_threshold'
              ? 'הציונים עומדים בתנאי הקבלה'
              : 'הציונים מתחת לסף';
      expect(within(row!).getByText(expectedVerdict)).toBeTruthy();
      expect(row!.textContent).not.toMatch(/נתונים|מתואם|סכם|מצרף/);
      for (const gate of result.additionalConditions ?? [])
        if (gate.status !== 'confirmed') expect(row!.textContent).toContain(gate.label);
      expect(screen.getByRole('button', { name: 'קבלת מידע על התוכנית' })).toBeTruthy();
    }
    if (['biu', 'afeka', 'hit'].includes(profile.institutionId))
      expect(screen.getAllByText('בחלק מהמוסדות נבדקים תנאי קבלה בלי חישוב סכם.')).toHaveLength(1);
    if (profile.institutionId === 'afeka')
      expect(
        screen.getByRole('link', { name: 'יש גם אפיקי קבלה נוספים' }).getAttribute('href'),
      ).toBe('/institutions/afeka');
    if (profile.institutionId === 'reichman')
      expect(screen.getByText('אומדן, עד לאישור המוסד')).toBeTruthy();
    expect(screen.queryByText('נדרשת בדיקה מול המוסד')).toBeNull();
  });

  it.each(['psychology', 'huji_psychology'])(
    'keeps the actual P700/B90 %s Kidum result numberless',
    async (programId) => {
      const { result } = await evaluate({
        name: 'Kidum',
        institutionId: 'huji',
        programId,
        input: { psychometric: 700, bagrut: 90 },
        responses: [hujiFeed],
        expected: {
          kind: 'manual_gate',
          decision: 'unknown',
          score: undefined,
          threshold: undefined,
        },
      });
      expect(result).toMatchObject({ kind: 'manual_gate', decision: 'unknown' });
      expect(result.score).toBeUndefined();
      expect(result.threshold).toBeUndefined();
      expect(result.deltaNeeded).toBeUndefined();
      const row = screen.getByTestId(`result-${programId}-huji`);
      expect(row.querySelector('[data-result-number]')).toBeNull();
      expect(row.textContent).toContain(result.sourceLabel);
      expect(row.textContent).not.toMatch(/\d/);
      expect(row.textContent).not.toContain('סף קבלה');
      expect(row.textContent).not.toContain('נדרשת בדיקה מול המוסד');
    },
  );
});
