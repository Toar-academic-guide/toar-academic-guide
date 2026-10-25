import psychologyWalkthroughOfficial from '../../../docs/admissions-verification/2026-10-25-bgu-psychology-live.json';
import { BGU_COMPUTER_SCIENCE_RULE_CAPTURE } from '@/data/admissions/bguComputerScienceVerification';
import { AFEKA_EVALUATOR_IDS, afekaCases } from '@/test/afekaAdmissions';
import medicineOfficial from '../../../docs/admissions-verification/2026-09-28-huji-medicine-official.json';
import routingOfficial from '../../../docs/admissions-verification/2026-10-21-calculator-routing.json';
import { HUJI_MEDICINE_ELIGIBLE_INPUTS } from '@/data/admissions/hujiMedicineVerification';
import psychologyOfficial from '../../../docs/admissions-verification/2026-09-27-bgu-psychology-official.json';
import haifaOfficial from '../../../docs/admissions-verification/2026-09-28-haifa-official.json';
import haifaTrackCaptures from '../../../docs/admissions-verification/2026-09-28-haifa-information-systems-tracks.json';
import {
  getHaifaInformationSystemsTrackArtifact,
  HAIFA_INFORMATION_SYSTEMS_TRACK_ARTIFACTS,
} from '@/data/admissions/haifaInformationSystemsVerification';
import socialScienceOfficial from '../../../docs/admissions-verification/2026-09-27-bgu-social-sciences-official.json';
import { describe, expect, it, vi } from 'vitest';
import { architectureInputs, architectureSourceResponse } from '@/test/technionArchitecture';
import { readFileSync } from 'node:fs';
import engineeringRules from '../../../docs/admissions-verification/2026-09-27-bgu-engineering-rules.json';
import { BGU_ENGINEERING_METADATA_BY_PAIR_ID } from '@/data/admissions/bguEngineeringVerification';
import type { AdmissionsExtraInputs } from '@/types/admissionsEvaluation';
import type { AdmissionFact } from '@/data/degrees/types';
import { getMondayAdmissionEvidenceByCatalogueInstitutionId } from '@/data/admissions/mondayEvidence';
import { resultLabel } from '@/lib/studyJourney';
import { DANON_PROGRAM_URLS } from '@/data/admissions/danon';
import catalogueRepair from '@/data/admissions/catalogueContentRepair.json';
import haifaPolicies from '@/data/admissions/haifaProgrammePolicies.json';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';

import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';
import type { AdmissionsEvaluationReport } from '@/types/admissionsEvaluation';
import type { SourceFreshnessStateRow } from '@/db/types';
import { getProgramVerificationArtifact } from '@/data/admissions/tauProgramVerification';
import { exactSourceIdsForProgram } from './capabilityMatrix';
import { evaluateAdmissionsForProgram as evaluateAdmissionsForProgramInternal } from './evaluator';

vi.mock('server-only', () => ({}));

describe.each(AFEKA_EVALUATOR_IDS)('%s published routes', (degreeId) => {
  it.each(afekaCases(degreeId))('$name', async ({ input, decision, missing }) => {
    const program = getStaticCataloguePrograms().find((row) => row.id === degreeId)!;
    const fetcher = vi.fn<typeof fetch>();
    const report = await evaluateAdmissionsForProgram({
      input: { degreeId, ...input },
      program,
      institutions: getStaticCatalogueInstitutions(),
      fetcher,
    });
    const result = report.results.find((row) => row.linkedInstitutionId === 'afeka')!;
    expect(result.decision).toBe(decision);
    expect(result.requiredInputs).toEqual(missing);
    expect(result.kind).toBe(decision === 'unknown' ? 'needs_input' : 'exact');
    expect(result.score).toBeUndefined();
    expect(result.threshold).toBeUndefined();
    expect(result.officialUrls?.[0]).toContain(
      'https://www.afeka.ac.il/candidate/candidate-information-bsc/',
    );
    expect(result.explanation).not.toMatch(/550|ממוצע בגרות 80|מתואם|סכם|מצרף|[a-zA-Z]/);
    expect(fetcher).not.toHaveBeenCalled();
    if (decision === 'accepted') {
      expect(resultLabel(result).group).toBe('match');
      expect(result.explanation).toContain('זכאות לתעודת בגרות מלאה');
      expect(result.explanation).toContain('סיווג אנגלית');
      expect(result.explanation).toContain('70');
    }
  });
});

it.each([
  { bagrut: 70, psychometric: 400 },
  { bagrut: 120, psychometric: 800 },
  ...[679, 680, 681].map((psychometric) => ({ bagrut: 85, psychometric })),
  {},
])('withholds Haifa psychology eligibility for ordinary inputs %j', async (scores) => {
  const program = getStaticCataloguePrograms().find((row) => row.id === 'haifa_psychology')!;
  const fetcher = vi.fn<typeof fetch>();
  const report = await evaluateAdmissionsForProgram({
    input: { degreeId: program.id, ...scores },
    program,
    institutions: getStaticCatalogueInstitutions(),
    fetcher,
  });
  const result = report.results.find((row) => row.linkedInstitutionId === 'haifa')!;
  expect(result).toMatchObject({ capability: 'authority_unavailable', decision: 'unknown' });
  expect(result.score).toBeUndefined();
  expect(result.requiredInputs).toBeUndefined();
  expect(result.explanation).not.toMatch(/[a-zA-Z]|פסיכומטרי 680|בגרות 85/);
  expect(fetcher).not.toHaveBeenCalled();
  expect(haifaPolicies.records.find((row) => row.programme === 'psychology')).toMatchObject({
    score: { acceptance: 650, publishedWaitingMinimum: 630 },
    activationState: 'withheld',
  });
});

vi.mock('@/db/client', () => ({
  getDb: vi.fn(() => ({
    select: () => ({
      from: () => ({
        where: async () => [],
      }),
    }),
  })),
}));

function expectBguExact(
  report: AdmissionsEvaluationReport,
  decision: 'accepted' | 'below' | 'eligible_to_apply',
): void {
  expect(report.results).toContainEqual(
    expect.objectContaining({
      linkedInstitutionId: 'bgu',
      capability: 'exact',
      decision,
    }),
  );
}

function expectTechnionSubjectRecord(report: AdmissionsEvaluationReport): void {
  expect(report.results).toContainEqual(
    expect.objectContaining({
      linkedInstitutionId: 'technion',
      kind: 'needs_input',
      capability: 'needs_input',
      requiredInputs: ['bagrut_subject_record'],
    }),
  );
}

function bguMockFetcher(threshold: number, score: number): typeof fetch {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            {
              psycho_sekem: threshold,
              psycho_value: threshold,
              comments: `סכם כמותי ${threshold}`,
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        `<script>parent.main.document.mainForm.on_final_sekem.value = ${score};</script>`,
        {
          status: 200,
          headers: { 'content-type': 'text/html' },
        },
      ),
    );
}

function qualifiedFreshnessStates(
  program: CatalogueProgram,
  extraInputs?: AdmissionsExtraInputs,
): Map<string, SourceFreshnessStateRow> {
  const checkedAt = new Date();
  const exactSourceIds = new Set(exactSourceIdsForProgram(program, extraInputs));

  return new Map(
    program.linkedInstitutionIds.flatMap((institutionId) => {
      const artifact =
        (program.id === 'haifa_infosystems'
          ? getHaifaInformationSystemsTrackArtifact(extraInputs?.haifaInformationSystemsTrack)
          : undefined) ?? getProgramVerificationArtifact(`${program.id}__${institutionId}`);
      const sourceId = artifact?.contract.source.targetId;
      if (!artifact || !sourceId || !exactSourceIds.has(sourceId)) {
        return [];
      }

      return [
        [
          sourceId,
          {
            sourceId,
            sourceClass: 'api_static_json',
            capability: 'decision_capable',
            status: 'fresh',
            proofLevel: 'exact_official',
            decisionProvenance: 'verified_derivation',
            reviewedSourceFingerprint: artifact.contract.sourceFingerprint,
            lastCheckedAt: checkedAt,
            lastSuccessfulCheckAt: checkedAt,
            lastExactCheckAt: checkedAt,
            lastChangedAt: null,
            latestFailureReason: null,
            blockedReason: null,
            rawFingerprint: null,
            normalizedFingerprint: artifact.contract.sourceFingerprint,
            normalizedDecisionPayload: {},
            latestReviewItemId: null,
            nextAction: null,
            createdAt: checkedAt,
            updatedAt: checkedAt,
          } satisfies SourceFreshnessStateRow,
        ],
      ];
    }),
  );
}

function evaluateAdmissionsForProgram(
  args: Parameters<typeof evaluateAdmissionsForProgramInternal>[0],
) {
  return evaluateAdmissionsForProgramInternal({
    ...args,
    freshnessStatesBySourceId:
      args.freshnessStatesBySourceId ??
      qualifiedFreshnessStates(args.program, args.input.extraInputs),
  });
}

const institutions: CatalogueInstitution[] = [
  {
    id: 'tau',
    name: 'אוניברסיטת תל אביב',
    region: 'center',
    domain: 'tau.ac.il',
    universityId: 'tau',
    calculatorConfig: {
      formulaType: 'weighted_scaled',
      scaleDescription: 'סקאלה 200-800',
      sekhemWeight: { psy: 0.6, bag: 0.4 },
    },
  },
  {
    id: 'haifa',
    name: 'אוניברסיטת חיפה',
    region: 'north',
    domain: 'haifa.ac.il',
    universityId: 'haifa',
    calculatorConfig: {
      formulaType: 'weighted_scaled',
      scaleDescription: 'סקאלה 200-800',
      sekhemWeight: { psy: 0.75, bag: 0.25 },
    },
  },
  {
    id: 'technion',
    name: 'הטכניון – מכון טכנולוגי לישראל',
    region: 'north',
    domain: 'technion.ac.il',
    universityId: 'technion',
    calculatorConfig: {
      formulaType: 'technion_linear',
      scaleDescription: 'סקאלה 0-100',
    },
  },
  {
    id: 'bgu',
    name: 'אוניברסיטת בן-גוריון בנגב',
    region: 'south',
    domain: 'bgu.ac.il',
    universityId: 'bgu',
    calculatorConfig: {
      formulaType: 'weighted_scaled',
      scaleDescription: 'סקאלה מוסדית',
      sekhemWeight: { psy: 0.45, bag: 0.55 },
    },
  },
  {
    id: 'afeka',
    name: 'מכללת אפקה',
    region: 'center',
    domain: 'afeka.ac.il',
    universityId: 'afeka',
    calculatorConfig: {
      formulaType: 'weighted_scaled',
      scaleDescription: 'ציון התאמה אפקה',
      sekhemWeight: { psy: 0.5, bag: 0.5 },
    },
  },
  {
    id: 'ariel',
    name: 'אוניברסיטת אריאל',
    region: 'center',
    domain: 'ariel.ac.il',
    universityId: 'ariel',
    calculatorConfig: {
      formulaType: 'weighted_scaled',
      scaleDescription: 'סקאלה 200-800',
      sekhemWeight: { psy: 0.5, bag: 0.5 },
    },
  },
  {
    id: 'hit',
    name: 'המכון הטכנולוגי חולון',
    region: 'center',
    domain: 'hit.ac.il',
    universityId: 'hit',
    calculatorConfig: {
      formulaType: 'minimum_floors',
      scaleDescription: 'תנאי סף',
      minPsychometric: 550,
      minBagrut: 85,
    },
  },
  {
    id: 'colman',
    name: 'מכללת ניהול – לימודים אקדמיים',
    region: 'center',
    domain: 'colman.ac.il',
    universityId: 'colman',
  },
];

const tauDataScience: CatalogueProgram = {
  id: 'tau_datascience',
  name: 'מדעי הנתונים',
  institution: 'אוניברסיטת תל אביב',
  institutionId: 'tau',
  type: 'academic',
  category: 'מדעי המחשב',
  profileScore: { AN: 5, TE: 5, CR: 2, SO: 1, LE: 1, OR: 3, DI: 5, ER: 4 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { tau: 700 },
  linkedInstitutionIds: ['tau'],
};

const tauNursing: CatalogueProgram = {
  id: 'nursing',
  name: 'סיעוד',
  institution: 'אוניברסיטת תל אביב',
  institutionId: 'tau',
  type: 'academic',
  category: 'בריאות',
  profileScore: { AN: 3, TE: 2, CR: 1, SO: 5, LE: 1, OR: 3, DI: 1, ER: 3 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { tau: 530 },
  linkedInstitutionIds: ['tau'],
};

const tauPsychology: CatalogueProgram = {
  id: 'tau_psychology',
  name: 'פסיכולוגיה',
  institution: 'אוניברסיטת תל אביב',
  institutionId: 'tau',
  type: 'academic',
  category: 'מדעי החברה',
  profileScore: { AN: 3, TE: 1, CR: 3, SO: 5, LE: 4, OR: 3, DI: 1, ER: 4 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { tau: 660 },
  linkedInstitutionIds: ['tau'],
};

const haifaCs: CatalogueProgram = {
  id: 'haifa_cs',
  name: 'מדעי המחשב',
  institution: 'אוניברסיטת חיפה',
  institutionId: 'haifa',
  type: 'academic',
  category: 'מדעי המחשב',
  profileScore: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 1, OR: 3, DI: 5, ER: 4 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { haifa: 705 },
  linkedInstitutionIds: ['haifa'],
};

const technionCs: CatalogueProgram = {
  id: 'technion_cs',
  name: 'מדעי המחשב',
  institution: 'הטכניון – מכון טכנולוגי לישראל',
  institutionId: 'technion',
  type: 'academic',
  category: 'מדעי המחשב',
  profileScore: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 1, OR: 3, DI: 5, ER: 4 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { technion: 91 },
  linkedInstitutionIds: ['technion'],
};

const technionDataScience: CatalogueProgram = {
  id: 'technion_datascience',
  name: 'הנדסת נתונים ומידע',
  institution: 'הטכניון – מכון טכנולוגי לישראל',
  institutionId: 'technion',
  type: 'academic',
  category: 'מדעי המחשב',
  profileScore: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 1, OR: 3, DI: 5, ER: 4 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { technion: 91 },
  linkedInstitutionIds: ['technion'],
};

const technionMedicine: CatalogueProgram = {
  id: 'technion_medicine',
  name: 'רפואה',
  institution: 'הטכניון – מכון טכנולוגי לישראל',
  institutionId: 'technion',
  type: 'academic',
  category: 'רפואה',
  profileScore: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 1, OR: 3, DI: 5, ER: 4 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { technion: null },
  linkedInstitutionIds: ['technion'],
};

const bguCs: CatalogueProgram = {
  id: 'bgu_cs',
  name: 'מדעי המחשב',
  institution: 'אוניברסיטת בן-גוריון בנגב',
  institutionId: 'bgu',
  type: 'academic',
  category: 'מדעי המחשב',
  profileScore: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 1, OR: 3, DI: 5, ER: 4 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { bgu: 720 },
  minimumPsychometric: { bgu: 600 },
  linkedInstitutionIds: ['bgu'],
};

const tauCs: CatalogueProgram = {
  ...bguCs,
  id: 'tau_cs',
  institutionId: 'tau',
  linkedInstitutionIds: ['tau'],
  thresholds: { tau: 705 },
  minimumPsychometric: { tau: 660 },
};

const csInputs = {
  psychometricMath: 150,
  psychometricVerbal: 150,
  psychometricEnglish: 150,
  bguBagrutAverage: 120,
  bguLanguageRequirementsConfirmed: true,
  tauBagrutAverage: 115,
  tauApplicationRequirementsConfirmed: true,
  bagrutSubjectRecord: {
    schemaVersion: 1 as const,
    sector: 'jewish' as const,
    subjects: [{ subjectId: 'mathematics', units: 5, grade: 85 }],
  },
};

const bguEe: CatalogueProgram = {
  id: 'bgu_ee',
  name: 'הנדסת חשמל',
  institution: 'אוניברסיטת בן-גוריון בנגב',
  institutionId: 'bgu',
  type: 'academic',
  category: 'הנדסה',
  profileScore: { AN: 4, TE: 4, CR: 0, SO: 0, LE: 1, OR: 2, DI: 3, ER: 2 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { bgu: 547 },
  minimumPsychometric: { bgu: 600 },
  linkedInstitutionIds: ['bgu'],
};

const bguBiology: CatalogueProgram = {
  id: 'bgu_biology',
  name: 'ביולוגיה',
  institution: 'אוניברסיטת בן-גוריון בנגב',
  institutionId: 'bgu',
  type: 'academic',
  category: 'מדעי החיים',
  profileScore: { AN: 5, TE: 3, CR: 1, SO: 2, LE: 1, OR: 3, DI: 0, ER: 4 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { bgu: 585 },
  minimumPsychometric: { bgu: 585 },
  minimumBagrut: { bgu: 106 },
  linkedInstitutionIds: ['bgu'],
};

const bguNursing: CatalogueProgram = {
  id: 'bgu_nursing',
  name: 'סיעוד',
  institution: 'אוניברסיטת בן-גוריון בנגב',
  institutionId: 'bgu',
  type: 'academic',
  category: 'מדעי הבריאות',
  profileScore: { AN: 3, TE: 3, CR: 1, SO: 5, LE: 2, OR: 2, DI: 0, ER: 2 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: {},
  linkedInstitutionIds: ['bgu'],
};

const bguMedicine: CatalogueProgram = {
  id: 'bgu_medicine',
  name: 'רפואה',
  institution: 'אוניברסיטת בן-גוריון בנגב',
  institutionId: 'bgu',
  type: 'academic',
  category: 'רפואה',
  profileScore: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 1, OR: 3, DI: 5, ER: 4 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { bgu: null },
  minimumPsychometric: { bgu: 680 },
  linkedInstitutionIds: ['bgu'],
};

const afekaEngineering: CatalogueProgram = {
  id: 'afeka_engineering',
  name: 'הנדסת תוכנה',
  institution: 'מכללת אפקה',
  institutionId: 'afeka',
  type: 'academic',
  category: 'הנדסה וטכנולוגיה',
  profileScore: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 1, OR: 3, DI: 5, ER: 4 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { afeka: 250 },
  linkedInstitutionIds: ['afeka'],
};

const arielCs: CatalogueProgram = {
  id: 'ariel_cs',
  name: 'מדעי המחשב',
  institution: 'אוניברסיטת אריאל',
  institutionId: 'ariel',
  type: 'academic',
  category: 'מדעי המחשב',
  profileScore: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 1, OR: 3, DI: 5, ER: 4 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { ariel: 600 },
  linkedInstitutionIds: ['ariel'],
};

const hitEngineering: CatalogueProgram = {
  id: 'hit_cs',
  name: 'מדעי המחשב',
  institution: 'המכון הטכנולוגי חולון',
  institutionId: 'hit',
  type: 'academic',
  category: 'הנדסה וטכנולוגיה',
  profileScore: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 1, OR: 3, DI: 5, ER: 4 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { hit: 550 },
  linkedInstitutionIds: ['hit'],
};

describe('evaluateAdmissionsForProgram', () => {
  it.each(
    catalogueRepair.requirements.filter(
      (row) => row.coverage === 'incomplete_published_requirements',
    ),
  )(
    'does not infer eligibility for $programId from missing official requirements or legacy claims',
    async (row) => {
      const institutionId = row.institutionId as CatalogueInstitution['id'];
      const institution: CatalogueInstitution = getStaticCatalogueInstitutions().find(
        (item) => item.id === row.institutionId,
      ) ?? {
        id: institutionId,
        name: 'מכללת תילתן המכללה לרפואה משלימה',
        region: 'center',
        domain: 'tiltan-college.co.il',
      };
      const template = getStaticCataloguePrograms().find(
        (item) => item.id === 'mon_12341122982_graphic_design',
      )!;
      const program: CatalogueProgram = {
        ...template,
        id: row.programId,
        institutionId,
        linkedInstitutionIds: [row.institutionId],
        institutionDetails: template.institutionDetails!.map((detail) => ({
          ...detail,
          institutionName: institution.name,
          specificAdmissionNotes: row.notes,
        })),
      };
      const before = structuredClone(program);
      const fetcher = vi.fn<typeof fetch>();
      for (const scores of [
        {},
        { bagrut: 110, psychometric: 700 },
        { bagrut: 60, psychometric: 200 },
      ]) {
        const report = await evaluateAdmissionsForProgram({
          input: { degreeId: row.programId, ...scores },
          program,
          institutions: [institution],
          fetcher,
        });
        expect(report.results).toHaveLength(1);
        const nowUnsupported = [
          'mon_12341155561_business',
          'mon_12341122982_graphic_design',
          'mon_12341063909_graphic_design',
          'mon_12341203461_graphic_design',
          'reidman_medicine',
          'mon_12341143672_business',
          'mon_12341098628_business',
        ].includes(row.programId);
        expect(report.results[0]).toMatchObject({
          capability: nowUnsupported ? 'unsupported' : 'requirements_only',
          kind: nowUnsupported ? 'unsupported' : 'requirements_only',
          decision: 'unknown',
          confidence: 'low',
        });
        if (nowUnsupported) {
          expect(report.results[0].explanation).toContain('אין כאן חישוב קבלה');
          expect(report.results[0].nextAction).toContain('תנאי ההרשמה');
        } else {
          expect(report.results[0]).toMatchObject({
            degradationReason: 'incomplete_published_requirements',
            officialUrls: ['programUrl' in row ? row.programUrl : row.sourceUrl],
          });
          expect(report.results[0].explanation).not.toMatch(/ראיון|בגרות|פסיכומטרי|אין סף/);
        }
        expect(report.results[0].requiredInputs).toBeUndefined();
        expect(report.results[0].scoreAssessment).toBeUndefined();
        expect(report.results[0].score).toBeUndefined();
        expect(report.results[0].threshold).toBeUndefined();
      }
      expect(fetcher).not.toHaveBeenCalled();
      expect(program).toEqual(before);
    },
  );

  it.each(
    routingOfficial.tau.flatMap((capture) => {
      const id = capture.pair.split('__')[0];
      const aliases: Record<string, string[]> = {
        ee: ['ee', 'tau_ee'],
        me: ['me', 'tau_me'],
        occupational_therapy: ['occupational_therapy', 'tau_occupational_therapy'],
      };
      return (aliases[id] ?? [id]).map((degreeId) => ({ degreeId, capture }));
    }),
  )(
    'replays $degreeId through the evaluator against the captured official response',
    async ({ degreeId, capture }) => {
      const program = {
        ...getStaticCataloguePrograms().find((p) => p.id === degreeId)!,
        linkedInstitutionIds: ['tau'],
      };
      const fetcher = vi.fn<typeof fetch>();
      for (const response of capture.responses)
        fetcher.mockResolvedValueOnce(new Response(response.body, { status: response.status }));
      const report = await evaluateAdmissionsForProgram({
        input: {
          degreeId,
          psychometric: capture.fixture.input.psychometric,
          bagrut: capture.fixture.input.bagrut,
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
        program,
        institutions: getStaticCatalogueInstitutions(),
        fetcher,
      });
      expect(report.results[0]).toMatchObject({
        kind: 'exact',
        decision: capture.fixture.expected.verdict,
        score: capture.fixture.expected.score,
      });
      expect(fetcher).toHaveBeenCalledTimes(2);
    },
  );
  it.each([
    'ee',
    'tau_ee',
    'me',
    'tau_me',
    'occupational_therapy',
    'tau_occupational_therapy',
    'tau_industrial',
    'communication',
  ])(
    'routes %s to its existing calculator and asks for missing applicant inputs',
    async (degreeId) => {
      const program = {
        ...getStaticCataloguePrograms().find((p) => p.id === degreeId)!,
        linkedInstitutionIds: ['tau'],
      };
      const fetcher = vi.fn<typeof fetch>();
      const report = await evaluateAdmissionsForProgram({
        input: { degreeId, psychometric: 700, bagrut: 110 },
        program,
        institutions: getStaticCatalogueInstitutions(),
        fetcher,
      });
      expect(report.results[0]).toMatchObject({ kind: 'needs_input', decision: 'unknown' });
      expect(report.results[0].requiredInputs).toContain('psychometric_english');
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it.each(Object.entries(DANON_PROGRAM_URLS))(
    'does not invent an academic score or entrance exam for Danon programme %s',
    async (id, officialUrl) => {
      const template = getStaticCataloguePrograms().find((program) => program.id === 'danon_chef')!;
      const program = { ...template, id };
      const fetcher = vi.fn<typeof fetch>();
      for (const scores of [{}, { bagrut: 110.5, psychometric: 700 }]) {
        const report = await evaluateAdmissionsForProgram({
          program,
          institutions: getStaticCatalogueInstitutions(),
          input: { degreeId: id, ...scores },
          fetcher,
        });
        expect(report.results).toHaveLength(1);
        expect(report.results[0]).toMatchObject({
          capability: 'requirements_only',
          decision: 'unknown',
          officialUrls: [officialUrl],
        });
        expect(report.results[0].requiredInputs).toBeUndefined();
        expect(report.results[0].score).toBeUndefined();
        expect(JSON.stringify(report.results)).not.toMatch(/ראיון|מבחן התאמה|בגרות|פסיכומטרי/);
      }
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it('explains the unresolved ordinary Haifa Information Systems mapping without a numeric replay', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const result = await evaluateAdmissionsForProgram({
      program: { ...haifaCs, id: 'haifa_infosystems' },
      institutions,
      input: {
        degreeId: 'haifa_infosystems',
        psychometric: 800,
        bagrut: 120,
        extraInputs: { haifaInformationSystemsTrack: 'single_major' },
      },
      fetcher,
    });
    expect(result.results[0]).toMatchObject({
      capability: 'blocked',
      decision: 'unknown',
      sourceLabel: 'מיפוי המסלול טרם אומת',
    });
    expect(result.results[0].score).toBeUndefined();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(Object.entries(HAIFA_INFORMATION_SYSTEMS_TRACK_ARTIFACTS))(
    'evaluates both official captures using the selected Haifa track %s',
    async (_track, artifact) => {
      const program = {
        ...haifaCs,
        id: 'haifa_infosystems',
        name: 'מערכות מידע',
        thresholds: { haifa: 680 },
      };
      const captured = haifaTrackCaptures.records.find(
        (record) => record.officialProgramId === artifact.contract.officialProgramId,
      )!;
      for (const [index, band] of (['high', 'low'] as const).entries()) {
        const fixture = artifact.fixtures[index];
        const { psychometric, bagrut, ...extraInputs } = fixture.input;
        const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url) => {
          const params = new URL(String(url)).searchParams;
          if (params.get('operation') !== 'checkConnection')
            expect(params.get('program')).toBe(artifact.contract.officialProgramId);
          return new Response(
            JSON.stringify(
              params.get('operation') === 'checkConnection'
                ? { data: {} }
                : captured[band].response,
            ),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        });
        const result = await evaluateAdmissionsForProgram({
          program,
          institutions,
          input: {
            degreeId: program.id,
            psychometric: Number(psychometric),
            bagrut: Number(bagrut),
            extraInputs: extraInputs as AdmissionsExtraInputs,
          },
          fetcher,
          now: new Date('2026-09-28T20:00:00Z'),
        });
        expect(result.results[0]).toMatchObject({
          capability: 'exact',
          score: fixture.expected.score,
          threshold: 680,
          decision: band === 'high' ? 'eligible_to_apply' : 'below',
        });
      }
    },
  );
  const management: CatalogueProgram = {
    ...hitEngineering,
    id: 'business',
    linkedInstitutionIds: ['tau'],
    institutionId: 'tau',
    thresholds: { tau: 610 },
  };
  const managementInputs = {
    tauBagrutAverage: 115,
    mathUnits: 5,
    mathGrade: 70,
    englishUnits: 5,
    englishGrade: 100,
    tauManagementRequirementsConfirmed: true,
    tauManagementAcademicRouteConfirmed: false,
    tauManagementQualifyingMoocCount: 0 as const,
    tauManagementNoPsychometricMoocsConfirmed: false,
  };
  const managementFetcher = (score: number) =>
    vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { getLastScore: { body: { hatama_nihul: String(score) } } },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              getProgramByIdAndLang: {
                nid: '8267',
                title: 'ניהול',
                field_plain_id_programs: ['122111050000'],
                receipt_threshol: [610],
                rejection_thresh: [609],
              },
            },
          }),
        ),
      );

  it.each([
    [605, 639, 'eligible_to_apply'],
    [604, 638, 'below'],
  ] as const)(
    'uses Management PMA gates for P=%s, independently of Digital Sciences',
    async (psychometric, score, decision) => {
      const fetcher = managementFetcher(score);
      const report = await evaluateAdmissionsForProgram({
        input: { degreeId: 'business', psychometric, bagrut: 100, extraInputs: managementInputs },
        program: management,
        institutions,
        fetcher,
      });
      expect(report.results[0]).toMatchObject({ kind: 'exact', decision, score });
      const request = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
      expect(JSON.stringify(request)).toContain('115');
      expect(report.results[0].officialUrls).toContain(
        'https://go.tau.ac.il/he/management/ba/management?v=requirements',
      );
    },
  );

  it('accepts the published Management route without a psychometric score or dummy official replay', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'business',
        bagrut: 100,
        extraInputs: {
          ...managementInputs,
          tauManagementNoPsychometricMoocsConfirmed: true,
        },
      },
      program: management,
      institutions,
      fetcher,
    });
    expect(report.results[0]).toMatchObject({ kind: 'exact', decision: 'eligible_to_apply' });
    expect(report.results[0].scoreLabel).toBe('ממוצע בגרות רשמי');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('withholds a Management verdict when its official calculator fails', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'business',
        psychometric: 605,
        bagrut: 100,
        extraInputs: managementInputs,
      },
      program: management,
      institutions,
      fetcher: vi.fn<typeof fetch>().mockRejectedValue(new Error('Official source unavailable')),
    });
    expect(report.results[0]).toMatchObject({
      kind: 'degraded',
      decision: 'unknown',
    });
    expect(report.results[0].explanation).toContain('610');
    expect(report.results[0].explanation).toContain('נתוני הבסיס אומתו');
    expect(report.results[0].officialUrls?.[0]).toMatch(/^https:\/\//);
    expect(report.results[0].score).toBeUndefined();
  });

  it.each([undefined, false] as const)(
    'calculates Management with a separate registration confirmation (%s)',
    async (confirmed) => {
      const report = await evaluateAdmissionsForProgram({
        program: management,
        institutions,
        input: {
          degreeId: 'business',
          psychometric: 605,
          bagrut: 100,
          extraInputs: { ...managementInputs, tauManagementRequirementsConfirmed: confirmed },
        },
        fetcher: managementFetcher(639),
      });
      expect(report.results[0]).toMatchObject({
        kind: 'exact',
        score: 639,
        scoreAssessment: 'meets_threshold',
        decision: confirmed === false ? 'below' : 'pending',
      });
      expect(report.results[0].additionalConditions).toContainEqual(
        expect.objectContaining({
          id: 'tau_management_requirements',
          status: confirmed === false ? 'unmet' : 'unconfirmed',
        }),
      );
    },
  );

  it('runs a live calculation with older verified rules and keeps score copy student-facing', async () => {
    const states = qualifiedFreshnessStates(management, managementInputs);
    for (const state of states.values()) state.lastExactCheckAt = new Date('2026-09-27T12:00:00Z');
    const fetcher = managementFetcher(639);
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'business',
        psychometric: 605,
        bagrut: 100,
        extraInputs: managementInputs,
      },
      program: management,
      institutions,
      freshnessStatesBySourceId: states,
      fetcher,
      now: new Date('2026-10-06T15:57:40Z'),
    });
    expect(report.results[0]).toMatchObject({
      kind: 'exact',
      decision: 'eligible_to_apply',
      score: 639,
    });
    expect(report.results[0].scoreAssessment).toBe('meets_threshold');
    expect(report.results[0].explanation).not.toContain('נתוני הבסיס');
    expect(fetcher).toHaveBeenCalled();
  });

  it('preserves unavailable Management source authority when the applicant has no psychometric score', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: { degreeId: 'business', bagrut: 100, extraInputs: managementInputs },
      program: management,
      institutions,
      freshnessStatesBySourceId: new Map(),
    });
    expect(report.results[0]).toMatchObject({ kind: 'authority_unavailable', decision: 'unknown' });
  });

  it('still requires Management inputs that determine the numeric route', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const report = await evaluateAdmissionsForProgram({
      input: { degreeId: 'business', psychometric: 680, bagrut: 100 },
      program: management,
      institutions,
      fetcher,
    });
    expect(report.results[0]).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['math_units', 'math_grade', 'psychometric_math'],
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  const architecture: CatalogueProgram = {
    ...hitEngineering,
    id: 'architecture',
    name: 'ארכיטקטורה',
    institutionId: 'technion',
    linkedInstitutionIds: ['technion'],
    thresholds: { technion: 85 },
  };

  it.each([
    [115, 730, 110, 97.5, 'eligible_to_apply'],
    [101.9, 650, 80, 82.6, 'below'],
  ] as const)(
    'evaluates Architecture using its own average and exam for D=%s',
    async (average, psychometric, exam, score, decision) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockImplementation(async (url) => new Response(architectureSourceResponse(String(url))));
      const report = await evaluateAdmissionsForProgram({
        program: architecture,
        institutions,
        fetcher,
        input: {
          degreeId: 'architecture',
          psychometric,
          bagrut: 100,
          extraInputs: {
            ...architectureInputs,
            technionArchitectureBagrutAverage: average,
            technionArchitectureExamScore: exam,
          },
        },
      });
      expect(report.results[0]).toMatchObject({
        capability: 'exact',
        decision,
        score,
        threshold: 85,
      });
      if (decision === 'eligible_to_apply') {
        expect(report.results[0].explanation).toContain('מקום פנוי');
        expect(report.results[0].explanation).toContain('בהחלטה הסופית');
      }
    },
  );

  it.each([undefined, false] as const)(
    'calculates Architecture scores while keeping the official pass result separate (%s)',
    async (passed) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockImplementation(async (url) => new Response(architectureSourceResponse(String(url))));
      const report = await evaluateAdmissionsForProgram({
        program: architecture,
        institutions,
        fetcher,
        input: {
          degreeId: 'architecture',
          psychometric: 730,
          bagrut: 115,
          extraInputs: { ...architectureInputs, technionArchitectureExamPassed: passed },
        },
      });
      expect(report.results[0]).toMatchObject({
        kind: 'exact',
        scoreAssessment: 'meets_threshold',
        decision: passed === undefined ? 'pending' : 'below',
        additionalConditions: expect.arrayContaining([
          expect.objectContaining({
            id: 'technion_architecture_exam_passed',
            status: passed === undefined ? 'unconfirmed' : 'unmet',
          }),
        ]),
      });
      expect(fetcher).toHaveBeenCalled();
    },
  );

  it.each([['colmgmt_cs', 'colman', 'needs_input']] as const)(
    'asks for official route inputs for %s without calling an unrelated score source',
    async (programId, institutionId, capability) => {
      const fetcher = vi.fn<typeof fetch>();
      const program: CatalogueProgram = {
        id: programId,
        name: programId,
        institution: institutionId,
        institutionId,
        type: 'academic',
        category: 'test',
        profileScore: { AN: 0, TE: 0, CR: 0, SO: 0, LE: 0, OR: 0, DI: 0, ER: 0 },
        admissionType: 'requirements',
        admissionRequirements: [],
        linkedInstitutionIds: [institutionId],
      };

      const report = await evaluateAdmissionsForProgram({
        input: { degreeId: programId, psychometric: 700, bagrut: 110 },
        program,
        institutions,
        fetcher,
      });

      expect(report.results).toContainEqual(
        expect.objectContaining({
          linkedInstitutionId: institutionId,
          capability,
          kind: capability,
        }),
      );
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it('does not mutate canonical program definitions during evaluation', async () => {
    const originalTauProgram = structuredClone(tauDataScience);
    const originalHaifaProgram = structuredClone(haifaCs);
    const offlineFetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'));

    await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'tau_datascience',
        psychometric: 700,
        bagrut: 110,
      },
      program: tauDataScience,
      institutions,
      fetcher: offlineFetcher,
    });

    await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'haifa_cs',
        psychometric: 680,
        bagrut: 105,
      },
      program: haifaCs,
      institutions,
      fetcher: offlineFetcher,
    });

    expect(tauDataScience).toEqual(originalTauProgram);
    expect(haifaCs).toEqual(originalHaifaProgram);
  });

  it('shows saved requirements and a usable calculator link when weekly authority is missing', async () => {
    const fetcher = vi.fn<typeof fetch>();

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'bgu_cs',
        psychometric: 760,
        bagrut: 115,
      },
      program: bguCs,
      institutions: institutions.map((institution) =>
        institution.id === 'bgu'
          ? {
              ...institution,
              calculatorUrl: 'https://bgu4u.bgu.ac.il/orion/calc/calc_sec.html',
            }
          : institution,
      ),
      fetcher,
      freshnessStatesBySourceId: new Map(),
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'bgu',
        capability: 'authority_unavailable',
        kind: 'authority_unavailable',
        decision: 'unknown',
        officialUrls: ['https://bgu4u.bgu.ac.il/orion/calc/calc_sec.html'],
      }),
    );
  });

  it('requests Haifa psychometric subscores after pair proof is verified', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'haifa_cs',
        psychometric: 680,
        bagrut: 105,
      },
      program: haifaCs,
      institutions,
    });

    // Ruling: /workspace/codex-tasks/r1-pr278-rulings-2026-10-25.md row 1. Official source: none named in rulings; see PR #278 table. Approved by Jorje 2026-10-25 (r1-pr278-rulings-2026-10-25.md)
    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'haifa',
        kind: 'needs_input',
        capability: 'needs_input',
        decision: 'unknown',
        estimated: true,
        requiredInputs: ['psychometric_math', 'psychometric_verbal', 'psychometric_english'],
      }),
    );
  });

  it.each([
    { year: 2015, bagrut: 115, score: 702, decision: 'eligible_to_apply' },
    { year: 2020, bagrut: undefined, score: 699, decision: 'pending' },
  ])(
    'uses the Haifa average and actual year $year, preserving $decision',
    async ({ year, bagrut, score, decision }) => {
      const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url) => {
        if (!String(url).includes('calculateChances'))
          return new Response(JSON.stringify({ return: { type: 'S' } }));
        const params = new URL(String(url)).searchParams;
        const captured = haifaOfficial.yearBoundaryCases.find(
          (record) => record.request.bag_year === params.get('bag_year'),
        );
        return new Response(JSON.stringify(captured?.response));
      });
      const report = await evaluateAdmissionsForProgram({
        input: {
          degreeId: 'haifa_cs',
          psychometric: 693,
          bagrut,
          extraInputs: {
            psychometricMath: 140,
            psychometricVerbal: 130,
            psychometricEnglish: 130,
            haifaBagrutAverage: 102,
            haifaBagrutYear: year,
            haifaPsychometricYear: 2026,
            haifaAdmissionQualification: 'full_bagrut',
            haifaHebrewQualification: 'hebrew_school',
            mathUnits: 5,
            mathGrade: 75,
          },
        },
        program: haifaCs,
        institutions,
        fetcher,
      });
      const params = new URL(String(fetcher.mock.calls[1][0])).searchParams;
      expect(params.get('bag_avg')).toBe('102');
      expect(params.get('bag_year')).toBe(String(year));
      expect(params.get('psy_year')).toBe('2026');
      expect(Object.fromEntries(params)).toEqual(
        haifaOfficial.yearBoundaryCases.find((record) => record.request.bag_year === String(year))
          ?.request,
      );
      expect(report.results[0]).toMatchObject({ score, decision });
    },
  );

  it('requests missing Haifa years without contacting the official service', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'haifa_cs',
        psychometric: 693,
        extraInputs: {
          haifaBagrutAverage: 102,
          psychometricMath: 140,
          psychometricVerbal: 130,
          psychometricEnglish: 130,
        },
      },
      program: haifaCs,
      institutions,
      fetcher,
    });
    expect(fetcher).not.toHaveBeenCalled();
    // Ruling: /workspace/codex-tasks/r1-pr278-rulings-2026-10-25.md row 2. Official source: none named in rulings; see PR #278 table. Approved by Jorje 2026-10-25 (r1-pr278-rulings-2026-10-25.md)
    expect(report.results[0]).toMatchObject({
      kind: 'needs_input',
      estimated: true,
      requiredInputs: [
        'haifa_admission_qualification',
        'math_units',
        'math_grade',
        'haifa_hebrew_qualification',
      ],
    });
  });

  it('asks for a Technion subject record before pair-level score and verdict replay', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'technion_cs',
        psychometric: 760,
        bagrut: 115,
      },
      program: technionCs,
      institutions,
    });

    expectTechnionSubjectRecord(report);
  });

  it('asks for a Technion data-science subject record before calculator replay', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'technion_datascience',
        psychometric: 760,
        bagrut: 115,
      },
      program: technionDataScience,
      institutions,
    });

    expectTechnionSubjectRecord(report);
  });

  it('asks for a Technion medicine subject record before the invitation flow', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'technion_medicine',
        psychometric: 760,
        bagrut: 115,
      },
      program: technionMedicine,
      institutions,
    });

    expectTechnionSubjectRecord(report);
  });

  it('does not issue a Technion medicine verdict without the subject record', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'technion_medicine',
        psychometric: 700,
        bagrut: 100,
      },
      program: technionMedicine,
      institutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'technion',
        kind: 'needs_input',
        capability: 'needs_input',
        decision: 'unknown',
        requiredInputs: ['bagrut_subject_record'],
      }),
    );
  });

  it('requests official BGU CS inputs instead of replaying a generic average and total', async () => {
    const fetcher = bguMockFetcher(720, 875);
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'bgu_cs',
        psychometric: 760,
        bagrut: 115,
      },
      program: bguCs,
      institutions,
      fetcher,
    });

    expect(report.results[0]).toMatchObject({ kind: 'needs_input', decision: 'unknown' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(['datascience', 'bgu_datascience'])(
    'requests quantitative-route inputs for BGU Data Science (%s)',
    async (programId) => {
      const fetcher = bguMockFetcher(720, 831);
      const report = await evaluateAdmissionsForProgram({
        input: { degreeId: programId, psychometric: 730, bagrut: 120 },
        program: { ...bguCs, id: programId, name: 'Data Science' },
        institutions,
        fetcher,
      });
      expect(report.results[0]).toMatchObject({ kind: 'needs_input', decision: 'unknown' });
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it.each(['datascience', 'bgu_datascience'])(
    'rejects quantitative 124 for BGU Data Science despite a high general score (%s)',
    async (programId) => {
      const fetcher = bguMockFetcher(720, 831);
      const report = await evaluateAdmissionsForProgram({
        input: {
          degreeId: programId,
          psychometric: 730,
          bagrut: 120,
          extraInputs: { ...csInputs, psychometricMath: 124 },
        },
        program: { ...bguCs, id: programId, name: 'Data Science' },
        institutions,
        fetcher,
      });
      expect(report.results[0]).toMatchObject({ kind: 'exact', decision: 'below' });
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it.each([
    { psychometric: 599, extraInputs: csInputs },
    { psychometric: 800, extraInputs: { ...csInputs, psychometricMath: 124 } },
    {
      psychometric: 800,
      extraInputs: {
        ...csInputs,
        bagrutSubjectRecord: {
          ...csInputs.bagrutSubjectRecord,
          subjects: [{ subjectId: 'mathematics', units: 5, grade: 79 }],
        },
      },
    },
  ])(
    'checks BGU CS minimum gates before a high score can qualify ($psychometric)',
    async (testInput) => {
      const fetcher = vi.fn<typeof fetch>();
      const report = await evaluateAdmissionsForProgram({
        input: { degreeId: 'bgu_cs', bagrut: 120, ...testInput },
        program: bguCs,
        institutions,
        fetcher,
      });
      expect(report.results[0]).toMatchObject({ kind: 'exact', decision: 'below' });
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it.each([{ psychometric: 659, extraInputs: csInputs }])(
    'checks TAU CS standard-route gates before score replay ($psychometric)',
    async (testInput) => {
      const fetcher = vi.fn<typeof fetch>();
      const report = await evaluateAdmissionsForProgram({
        input: { degreeId: 'tau_cs', bagrut: 115, ...testInput },
        program: tauCs,
        institutions,
        fetcher,
      });
      expect(report.results[0], report.results[0].explanation).toMatchObject({
        kind: 'exact',
        decision: 'below',
      });
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it('asks for the TAU placement result when a lower mathematics grade needs it', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'tau_cs',
        psychometric: 730,
        bagrut: 115,
        extraInputs: {
          ...csInputs,
          bagrutSubjectRecord: {
            ...csInputs.bagrutSubjectRecord,
            subjects: [{ subjectId: 'mathematics', units: 5, grade: 70 }],
          },
        },
      },
      program: tauCs,
      institutions,
      fetcher,
    });
    expect(report.results[0]).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['tau_math_placement_score'],
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not accept Electrical Engineering below psychometric 600 or without required inputs', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'bgu_ee',
        psychometric: 590,
        bagrut: 120,
      },
      program: bguEe,
      institutions,
      fetcher,
    });

    expect(report.results[0]).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['bgu_engineering_details'],
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    ['eligible', 595, 'eligible_to_apply'],
    ['below', 412, 'below'],
  ] as const)('replays the independent engineering %s example', async (label, score, decision) => {
    const fixture = BGU_ENGINEERING_METADATA_BY_PAIR_ID.bgu_ee__bgu.fixtures.find((item) =>
      item.id.includes(`:${label}:`),
    )!;
    const { psychometric, bagrut, ...extraInputs } = fixture.input;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(engineeringRules[0].payload)))
      .mockResolvedValueOnce(
        new Response(
          readFileSync(
            'docs/admissions-verification/2026-09-27-bgu-engineering-calculator.html',
            'utf8',
          ),
        ),
      )
      .mockResolvedValueOnce(
        new Response(readFileSync('docs/admissions-verification/2026-09-27-bgu-2027-guide.pdf')),
      )
      .mockResolvedValueOnce(
        new Response(
          `<script>parent.main.document.getElementById("on_c_val").innerHTML = ${score};</script>`,
        ),
      );
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'bgu_ee',
        psychometric,
        bagrut,
        extraInputs: extraInputs as AdmissionsExtraInputs,
      },
      program: bguEe,
      institutions,
      fetcher,
    });
    expectBguExact(report, decision);
    expect(report.results[0]).toMatchObject({ score, threshold: 547, scoreLabel: 'סכם הנדסה' });
    if (decision === 'eligible_to_apply')
      expect(report.results[0].explanation).toContain('רשימת המתנה');
  });

  it('enforces Electrical minimum 600 even when all subject scores are high', async () => {
    const {
      psychometric: _,
      bagrut,
      ...extraInputs
    } = BGU_ENGINEERING_METADATA_BY_PAIR_ID.bgu_ee__bgu.fixtures[0].input;
    const fetcher = vi.fn<typeof fetch>();
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'bgu_ee',
        psychometric: 599,
        bagrut,
        extraInputs: extraInputs as AdmissionsExtraInputs,
      },
      program: bguEe,
      institutions,
      fetcher,
    });
    expectBguExact(report, 'below');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    ['bagrut', 109, 109, 'ממוצע בגרות רשמי'],
    ['preparatory', 91.25, 91, 'ממוצע מכינה'],
  ] as const)(
    'evaluates the Industrial %s direct route without a calculator POST or a psychometric score',
    async (basis, score, threshold, scoreLabel) => {
      const program = { ...bguEe, id: 'bgu_industrial', name: 'הנדסת תעשייה וניהול' };
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response(JSON.stringify(engineeringRules[2].payload)))
        .mockResolvedValueOnce(
          new Response(
            readFileSync(
              'docs/admissions-verification/2026-09-27-bgu-engineering-calculator.html',
              'utf8',
            ),
          ),
        )
        .mockResolvedValueOnce(
          new Response(readFileSync('docs/admissions-verification/2026-09-27-bgu-2027-guide.pdf')),
        );
      const {
        psychometric: omitted,
        bagrut,
        ...extra
      } = BGU_ENGINEERING_METADATA_BY_PAIR_ID.bgu_industrial__bgu.fixtures[0].input;
      void omitted;
      const extraInputs = {
        ...extra,
        bguBagrutAverage: basis === 'bagrut' ? score : 100,
        bguEngineering: {
          detailsConfirmed: true,
          route: 'direct',
          ...(basis === 'preparatory'
            ? {
                preparatoryInstitution: 'bgu',
                preparatoryCompletionYear: 2026,
                industrialPreparatoryAverage: score,
              }
            : {}),
        },
      } as AdmissionsExtraInputs;
      const report = await evaluateAdmissionsForProgram({
        input: { degreeId: program.id, bagrut, extraInputs },
        program,
        institutions,
        fetcher,
      });
      expectBguExact(report, 'eligible_to_apply');
      expect(report.results[0]).toMatchObject({ score, threshold, scoreLabel });
      expect(report.results[0].explanation).not.toContain('ראיון');
      expect(fetcher).toHaveBeenCalledTimes(3);
    },
  );

  it('requires the official Biology route details before returning a verdict', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'bgu_biology',
        psychometric: 700,
        bagrut: 100,
      },
      program: bguBiology,
      institutions,
      fetcher: bguMockFetcher(585, 875),
    });

    // Ruling: /workspace/codex-tasks/r1-pr278-rulings-2026-10-25.md row 3. Official source: none named in rulings; see PR #278 table. Approved by Jorje 2026-10-25 (r1-pr278-rulings-2026-10-25.md)
    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'bgu',
        capability: 'needs_input',
        decision: 'unknown',
        estimated: true,
        requiredInputs: [
          'psychometric_math',
          'bagrut_subject_record',
          'psychometric_verbal',
          'psychometric_english',
        ],
      }),
    );
  });

  it('returns an exact BGU nursing invitation verdict', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'bgu_nursing',
        psychometric: 530,
        bagrut: 95,
      },
      program: bguNursing,
      institutions,
      fetcher: bguMockFetcher(520, 875),
    });

    expectBguExact(report, 'eligible_to_apply');
  });

  it('does not estimate an explicitly excluded Ariel formula pair', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'ariel_cs',
        psychometric: 680,
        bagrut: 110,
      },
      program: arielCs,
      institutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'ariel',
        capability: 'unsupported',
        kind: 'unsupported',
        decision: 'unknown',
        sourceLabel: 'אין חישוב למסלול זה',
      }),
    );
  });

  it('returns a below BGU nursing invitation verdict', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'bgu_nursing',
        psychometric: 510,
        bagrut: 110,
      },
      program: bguNursing,
      institutions,
      fetcher: bguMockFetcher(520, 451),
    });

    expectBguExact(report, 'below');
  });

  it('returns an exact BGU medicine invitation verdict', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'bgu_medicine',
        psychometric: 760,
        bagrut: 115,
      },
      program: bguMedicine,
      institutions,
      fetcher: bguMockFetcher(735, 875),
    });

    expectBguExact(report, 'eligible_to_apply');
  });

  it('returns a below BGU medicine invitation verdict', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'bgu_medicine',
        psychometric: 650,
        bagrut: 110,
      },
      program: bguMedicine,
      institutions,
      fetcher: bguMockFetcher(735, 451),
    });

    expectBguExact(report, 'below');
  });

  it('calculates Reichman published routes instead of treating them as requirements only', async () => {
    const reichmanCs: CatalogueProgram = {
      id: 'reichman_cs',
      name: 'מדעי המחשב',
      institution: 'אוניברסיטת רייכמן',
      institutionId: 'reichman',
      type: 'academic',
      category: 'מדעי המחשב',
      profileScore: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 1, OR: 3, DI: 5, ER: 4 },
      admissionType: 'sekhem',
      admissionRequirements: [],
      thresholds: { reichman: 0 },
      linkedInstitutionIds: ['reichman'],
    };

    const reichmanInstitution: CatalogueInstitution = {
      id: 'reichman',
      name: 'אוניברסיטת רייכמן',
      region: 'center',
      domain: 'runi.ac.il',
      universityId: 'reichman',
      calculatorConfig: {
        formulaType: 'weighted_scaled',
        scaleDescription: 'סקאלה מקומית',
        sekhemWeight: { psy: 0.6, bag: 0.4 },
      },
    };

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'reichman_cs',
        psychometric: 600,
        bagrut: 95,
      },
      program: reichmanCs,
      institutions: [...institutions, reichmanInstitution],
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'reichman',
        kind: 'estimated',
        capability: 'estimated',
        decision: 'below',
        confidence: 'medium',
      }),
    );
  });

  it('keeps Colman automatic-route results as a manual admissions path', async () => {
    const colmanCs: CatalogueProgram = {
      id: 'colmgmt_cs',
      name: 'מדעי המחשב',
      institution: 'מכללת ניהול – לימודים אקדמיים',
      institutionId: 'colman',
      type: 'academic',
      category: 'מדעי המחשב',
      profileScore: { AN: 5, TE: 2, CR: 1, SO: 0, LE: 1, OR: 3, DI: 5, ER: 2 },
      admissionType: 'requirements',
      admissionRequirements: [
        'מסלול בגרות: ממוצע בגרות משוקלל 85+',
        'מתמטיקה: 5 יח"ל 70+ או 4 יח"ל 80+',
      ],
      linkedInstitutionIds: ['colman'],
    };

    const colmanInstitution: CatalogueInstitution = {
      id: 'colman',
      name: 'מכללת ניהול – לימודים אקדמיים',
      region: 'center',
      domain: 'colman.ac.il',
      universityId: 'colman',
    };

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'colmgmt_cs',
        psychometric: 580,
        bagrut: 92,
        extraInputs: {
          mathUnits: 5,
          mathGrade: 75,
          colmanBagrutAverage: 85,
          colmanBagrutCertificateConfirmed: true,
        },
      },
      program: colmanCs,
      institutions: [...institutions, colmanInstitution],
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'colman',
        capability: 'manual_gate',
        kind: 'manual_gate',
        decision: 'pending',
        score: 85,
      }),
    );
  });

  it('keeps free-text-only Ono law neutral until its numeric requirements are checked', async () => {
    const onoLaw: CatalogueProgram = {
      id: 'ono_law',
      name: 'משפטים',
      institution: 'המכללה האקדמית אונו',
      institutionId: 'ono',
      type: 'academic',
      category: 'משפטים',
      profileScore: { AN: 2, TE: 0, CR: 1, SO: 3, LE: 5, OR: 2, DI: 0, ER: 5 },
      admissionType: 'requirements',
      admissionRequirements: [
        'קבלה ישירה: ממוצע בגרות 95+ או פסיכומטרי 600 + בגרות מלאה',
        'קבלה משוקללת: ראיון קבלה עם ממוצע בגרות 80-94 או פסיכומטרי 550 + בגרות מלאה',
      ],
      linkedInstitutionIds: ['ono'],
    };

    const onoInstitution: CatalogueInstitution = {
      id: 'ono',
      name: 'המכללה האקדמית אונו',
      region: 'center',
      domain: 'ono.ac.il',
      universityId: 'ono',
    };

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'ono_law',
        psychometric: 420,
        bagrut: 70,
      },
      program: onoLaw,
      institutions: [...institutions, onoInstitution],
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'ono',
        kind: 'requirements_only',
        capability: 'requirements_only',
        decision: 'unknown',
        confidence: 'low',
        nextAction: expect.stringContaining('באתר המוסד'),
        explanation: expect.stringContaining('ממוצע בגרות 95+'),
      }),
    );
  });

  it('returns needs-input for Afeka when subject gates are missing', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'afeka_engineering',
        psychometric: 700,
        bagrut: 110,
      },
      program: afekaEngineering,
      institutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'afeka',
        kind: 'needs_input',
        capability: 'needs_input',
        requiredInputs: ['math_units', 'math_grade', 'english_units', 'english_grade'],
      }),
    );
  });

  it('returns an Afeka estimate when required subject gates are present', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'afeka_engineering',
        psychometric: 700,
        bagrut: 110,
        extraInputs: {
          mathUnits: 5,
          mathGrade: 90,
          englishUnits: 5,
          englishGrade: 90,
        },
      },
      program: afekaEngineering,
      institutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'afeka',
        kind: 'estimated',
        capability: 'estimated',
        decision: 'accepted',
      }),
    );
  });

  it('returns needs-input for technical HIT programs when math gates are missing', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'hit_cs',
        psychometric: 700,
        bagrut: 110,
      },
      program: hitEngineering,
      institutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'hit',
        kind: 'needs_input',
        capability: 'needs_input',
        requiredInputs: ['math_units', 'math_grade'],
      }),
    );
  });

  it('does not call the TAU adapter while required exact inputs are missing', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              getLastScore: {
                body: JSON.stringify({
                  hatama_handasa: 712,
                }),
              },
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              getPrograms: {
                total: 1,
                results: [
                  {
                    field_plain_id_programs: ['056011050000'],
                    field_this_year_receipt_threshol: 700,
                    field_this_year_rejection_thresh: 670,
                  },
                ],
              },
            },
          }),
          { status: 200 },
        ),
      );

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'tau_datascience',
        psychometric: 700,
        bagrut: 110,
      },
      program: tauDataScience,
      institutions,
      fetcher,
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'tau',
        capability: 'needs_input',
        decision: 'unknown',
        requiredInputs: ['psychometric_english', 'bagrut_subject_record'],
      }),
    );
  });

  it('returns the reviewed TAU score and verdict with current proof and complete inputs', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              getLastScore: {
                body: JSON.stringify({ hatama_handasa: 664 }),
              },
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              getPrograms: {
                results: [
                  {
                    title: 'תואר ראשון במדעים דיגיטליים להיי-טק',
                    field_plain_id_programs: ['056011050000'],
                    field_this_year_receipt_threshol: 652,
                    field_this_year_rejection_thresh: 632,
                  },
                ],
              },
            },
          }),
          { status: 200 },
        ),
      );

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'tau_datascience',
        psychometric: 680,
        bagrut: 105,
        extraInputs: {
          psychometricEnglish: 110,
          bagrutSubjectRecord: {
            schemaVersion: 1,
            sector: 'jewish',
            subjects: [
              { subjectId: 'mathematics', units: 5, grade: 80 },
              { subjectId: 'physics', units: 5, grade: 70 },
              { subjectId: 'history', units: 2, grade: 90 },
              { subjectId: 'bible', units: 2, grade: 88 },
            ],
          },
        },
      },
      program: tauDataScience,
      institutions,
      fetcher,
      freshnessStatesBySourceId: qualifiedFreshnessStates(tauDataScience),
      now: new Date('2026-07-25T21:00:00Z'),
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({
      variables: { scoresData: { reali10: 1 } },
    });
    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'tau',
        kind: 'exact',
        capability: 'exact',
        decision: 'accepted',
        score: 664,
        threshold: 652,
      }),
    );
  });

  it('returns an exact below verdict for a failed TAU minimum gate without a live call', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'tau_datascience',
        psychometric: 619,
        bagrut: 105,
        extraInputs: {
          psychometricEnglish: 110,
          bagrutSubjectRecord: {
            schemaVersion: 1,
            sector: 'jewish',
            subjects: [{ subjectId: 'mathematics', units: 5, grade: 80 }],
          },
        },
      },
      program: tauDataScience,
      institutions,
      fetcher,
      freshnessStatesBySourceId: qualifiedFreshnessStates(tauDataScience),
      now: new Date('2026-07-25T21:00:00Z'),
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'tau',
        kind: 'exact',
        capability: 'exact',
        decision: 'below',
        explanation: expect.stringContaining('פסיכומטרי כללי 620'),
      }),
    );
  });

  it('returns TAU Nursing eligibility for manual assessment, never final acceptance', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { getLastScore: { body: JSON.stringify({ hatama: 546 }) } },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              getPrograms: {
                results: [
                  {
                    title: 'לימודי תואר ראשון בחוג למדעי האחיוּת (Nursing)',
                    field_plain_id_programs: ['016211010000', '016211010208'],
                    field_this_year_receipt_threshol: 530,
                    field_this_year_rejection_thresh: 520,
                  },
                ],
              },
            },
          }),
          { status: 200 },
        ),
      );

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'nursing',
        psychometric: 520,
        bagrut: 100,
        extraInputs: { psychometricEnglish: 110 },
      },
      program: tauNursing,
      institutions,
      fetcher,
      now: new Date('2026-07-25T21:00:00Z'),
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'tau',
        capability: 'exact',
        kind: 'manual_gate',
        decision: 'eligible_to_apply',
        score: 546,
        threshold: 530,
        explanation: expect.stringContaining('אינה קבלה סופית'),
      }),
    );
  });

  it.each([
    { psychometric: 680, bagrut: 110 },
    { psychometric: 760, bagrut: 118 },
  ])('preserves the TAU Psychology exact verdict for $psychometric/$bagrut', async (profile) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { getLastScore: { body: { hatama: 679 } } },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              getProgramByIdAndLang: {
                nid: '8275',
                title: 'תואר ראשון בלימודי פסיכולוגיה',
                field_plain_id_programs: ['107111050000', '107111030000'],
                receipt_threshol: [660],
                rejection_thresh: [659],
              },
            },
          }),
          { status: 200 },
        ),
      );

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'tau_psychology',
        ...profile,
        extraInputs: { psychometricEnglish: 110 },
      },
      program: tauPsychology,
      institutions,
      fetcher,
      now: new Date('2026-07-25T21:00:00Z'),
    });

    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toMatchObject({
      variables: { nid: 8275, langcode: 'he' },
    });
    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'tau',
        capability: 'exact',
        kind: 'exact',
        decision: 'accepted',
        score: 679,
        threshold: 660,
      }),
    );
  });

  it('correctly returns open_admission for Open University and other open institutions', async () => {
    const openProgram: CatalogueProgram = {
      id: 'open_cs',
      name: 'מדעי המחשב',
      institution: 'האוניברסיטה הפתוחה',
      institutionId: 'open_university',
      type: 'academic',
      category: 'מדעי המחשב',
      profileScore: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 1, OR: 3, DI: 5, ER: 4 },
      admissionType: 'requirements',
      admissionRequirements: [],
      linkedInstitutionIds: ['open_university'],
    };

    const openInstitutions: CatalogueInstitution[] = [
      {
        id: 'open_university',
        name: 'האוניברסיטה הפתוחה',
        region: 'center',
        domain: 'openu.ac.il',
        universityId: 'open_university',
      },
    ];

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'open_cs',
        psychometric: 500,
        bagrut: 80,
      },
      program: openProgram,
      institutions: openInstitutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'open_university',
        kind: 'open_admission',
        capability: 'open_admission',
        decision: 'accepted',
        confidence: 'high',
      }),
    );
  });

  it('keeps design programs neutral when only manual gates are known', async () => {
    const designProgram: CatalogueProgram = {
      id: 'bezalel_design',
      name: 'עיצוב גרפי',
      institution: 'בצלאל',
      institutionId: 'bezalel',
      type: 'academic',
      category: 'עיצוב',
      profileScore: { AN: 1, TE: 1, CR: 5, SO: 2, LE: 1, OR: 2, DI: 5, ER: 3 },
      admissionType: 'requirements',
      admissionRequirements: ['תיק עבודות', 'ראיון'],
      linkedInstitutionIds: ['bezalel'],
      institutionDetails: [
        {
          institutionName: 'בצלאל',
          durationYears: 4,
          estimatedStudentsPerYear: 'כ-100',
          quantitativeMinRequirement: null,
          englishMinRequirement: null,
          specificAdmissionNotes: ['תיק עבודות יצירתי', 'מבחן מעשי'],
          officialCalculatorUrl: '',
        },
      ],
    };

    const designInstitutions: CatalogueInstitution[] = [
      {
        id: 'bezalel',
        name: 'בצלאל',
        region: 'center',
        domain: 'bezalel.ac.il',
        universityId: 'bezalel',
      },
    ];

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'bezalel_design',
        psychometric: 450,
        bagrut: 90,
      },
      program: designProgram,
      institutions: designInstitutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'bezalel',
        kind: 'requirements_only',
        capability: 'requirements_only',
        decision: 'unknown',
        sourceLabel: 'תנאי קבלה',
        explanation: expect.stringContaining('תיק עבודות יצירתי'),
      }),
    );
  });

  it('does not spend live-call budget on a TAU pair with missing exact inputs', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              getLastScore: {
                body: JSON.stringify({
                  hatama_handasa: 712,
                }),
              },
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              getPrograms: {
                total: 1,
                results: [
                  {
                    field_plain_id_programs: ['056011050000'],
                    field_this_year_receipt_threshol: 700,
                    field_this_year_rejection_thresh: 670,
                  },
                ],
              },
            },
          }),
          { status: 200 },
        ),
      );

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'tau_datascience',
        psychometric: 700,
        bagrut: 110,
      },
      program: {
        ...tauDataScience,
        linkedInstitutionIds: ['technion', 'tau'],
      },
      institutions: institutions,
      fetcher,
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'tau',
        capability: 'needs_input',
        decision: 'unknown',
        requiredInputs: ['psychometric_english', 'bagrut_subject_record'],
      }),
    );
  });

  it('includes dynamic admissions criteria (interview, portfolio, no bagrut, no psychometric) from Monday evidence in evaluator Hebrew explanation', async () => {
    const mondayProgram: CatalogueProgram = {
      id: 'mon_12341185928_cs',
      name: 'מדעי המחשב',
      institution: 'אורנים המכללה האקדמית לחינוך',
      institutionId: 'mon_12341185928' as any,
      type: 'academic',
      category: 'מדעי המחשב',
      profileScore: { AN: 3, TE: 3, CR: 3, SO: 3, LE: 3, OR: 3, DI: 3, ER: 3 },
      admissionType: 'requirements',
      admissionRequirements: [],
      linkedInstitutionIds: ['mon_12341185928' as any],
    };

    const mondayInstitutions: CatalogueInstitution[] = [
      {
        id: 'mon_12341185928' as any,
        name: 'אורנים המכללה האקדמית לחינוך',
        region: 'north',
        domain: 'oranim.ac.il',
      },
    ];

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'mon_12341185928_cs',
        psychometric: 500,
        bagrut: 80,
      },
      program: mondayProgram,
      institutions: mondayInstitutions,
    });

    const result = report.results.find((r) => r.linkedInstitutionId === 'mon_12341185928')!;
    expect(result.capability).toBe('manual_gate');
    expect(result.explanation).toContain('ראיון קבלה חובה');
    expect(result.explanation).toContain('אין צורך בפסיכומטרי');
  });

  it('asks for structured subject inputs before returning an accepted score-based result', async () => {
    const scoreProgram: CatalogueProgram = {
      id: 'structured_score_program',
      name: 'הנדסת נתונים',
      institution: 'אוניברסיטת בן-גוריון בנגב',
      institutionId: 'bgu',
      type: 'academic',
      category: 'הנדסה',
      profileScore: { AN: 5, TE: 4, CR: 1, SO: 1, LE: 1, OR: 3, DI: 5, ER: 3 },
      admissionType: 'sekhem',
      admissionRequirements: [],
      thresholds: { bgu: 600 },
      linkedInstitutionIds: ['bgu'],
      institutionDetails: [
        {
          institutionName: 'אוניברסיטת בן-גוריון בנגב',
          durationYears: 4,
          estimatedStudentsPerYear: 'לא ידוע',
          quantitativeMinRequirement: null,
          englishMinRequirement: null,
          specificAdmissionNotes: [],
          officialCalculatorUrl: '',
          admissionFacts: [
            {
              id: 'structured_score_program:bgu:math-units',
              kind: 'numeric_gate',
              field: 'math_units',
              comparison: 'gte',
              valueNumber: 5,
              valueText: null,
              unit: 'units',
              description: 'מתמטיקה ברמת 5 יח"ל',
              confidence: 'high',
              isRequired: true,
            },
          ],
        },
      ],
    };

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'structured_score_program',
        psychometric: 760,
        bagrut: 115,
      },
      program: scoreProgram,
      institutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'bgu',
        capability: 'needs_input',
        kind: 'needs_input',
        requiredInputs: ['math_units'],
      }),
    );
  });

  it.each([115, 118])(
    'keeps an accepted estimated score with bagrut %s eligible when an interview remains',
    async (bagrut) => {
      const scoreProgram: CatalogueProgram = {
        id: 'structured_score_manual_program',
        name: 'פסיכולוגיה יישומית',
        institution: 'אוניברסיטת בן-גוריון בנגב',
        institutionId: 'bgu',
        type: 'academic',
        category: 'פסיכולוגיה',
        profileScore: { AN: 4, TE: 2, CR: 1, SO: 5, LE: 2, OR: 2, DI: 1, ER: 4 },
        admissionType: 'sekhem',
        admissionRequirements: [],
        thresholds: { bgu: 600 },
        linkedInstitutionIds: ['bgu'],
        institutionDetails: [
          {
            institutionName: 'אוניברסיטת בן-גוריון בנגב',
            durationYears: 3,
            estimatedStudentsPerYear: 'לא ידוע',
            quantitativeMinRequirement: null,
            englishMinRequirement: null,
            specificAdmissionNotes: [],
            officialCalculatorUrl: '',
            admissionFacts: [
              {
                id: 'structured_score_manual_program:bgu:interview',
                kind: 'manual_gate',
                field: 'interview',
                comparison: 'present',
                valueNumber: null,
                valueText: 'ראיון קבלה',
                unit: 'text',
                description: 'ראיון קבלה מחייב',
                confidence: 'high',
                isRequired: true,
              },
            ],
          },
        ],
      };

      const report = await evaluateAdmissionsForProgram({
        input: {
          degreeId: 'structured_score_manual_program',
          psychometric: 760,
          bagrut,
        },
        program: scoreProgram,
        institutions,
      });

      expect(report.results).toContainEqual(
        expect.objectContaining({
          linkedInstitutionId: 'bgu',
          capability: 'manual_gate',
          kind: 'manual_gate',
          decision: 'eligible_to_apply',
          score: expect.any(Number),
          threshold: 600,
          explanation: expect.stringContaining('ראיון קבלה מחייב'),
        }),
      );
    },
  );

  it('returns below when structured numeric admission facts are not met before a manual gate stage', async () => {
    const structuredProgram: CatalogueProgram = {
      id: 'structured_psych_program',
      name: 'פסיכולוגיה יישומית',
      institution: 'Structured College',
      institutionId: 'structured_college' as any,
      type: 'academic',
      category: 'פסיכולוגיה',
      profileScore: { AN: 3, TE: 2, CR: 2, SO: 5, LE: 3, OR: 2, DI: 1, ER: 4 },
      admissionType: 'requirements',
      admissionRequirements: [],
      linkedInstitutionIds: ['structured_college' as any],
      institutionDetails: [
        {
          institutionName: 'Structured College',
          durationYears: 3,
          estimatedStudentsPerYear: 'לא ידוע',
          quantitativeMinRequirement: null,
          englishMinRequirement: null,
          specificAdmissionNotes: [],
          officialCalculatorUrl: '',
          admissionFacts: [
            {
              id: 'structured_psych_program:structured_college:fact:psychometric',
              kind: 'numeric_gate',
              field: 'psychometric',
              comparison: 'gte',
              valueNumber: 620,
              valueText: null,
              unit: 'points',
              description: 'פסיכומטרי 620 ומעלה',
              confidence: 'high',
              isRequired: true,
            },
            {
              id: 'structured_psych_program:structured_college:fact:interview',
              kind: 'manual_gate',
              field: 'interview',
              comparison: 'present',
              valueNumber: null,
              valueText: 'ראיון קבלה',
              unit: 'text',
              description: 'ראיון קבלה אישי',
              confidence: 'high',
              isRequired: true,
            },
          ],
        },
      ],
    };

    const structuredInstitutions: CatalogueInstitution[] = [
      {
        id: 'structured_college' as any,
        name: 'Structured College',
        region: 'center',
        domain: 'structured.example',
      },
    ];

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'structured_psych_program',
        psychometric: 580,
        bagrut: 100,
      },
      program: structuredProgram,
      institutions: structuredInstitutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'structured_college',
        capability: 'manual_gate',
        kind: 'manual_gate',
        decision: 'below',
        threshold: 620,
        score: 580,
      }),
    );
  });

  it('returns eligible_to_apply when structured numeric facts are met and only the manual gate remains', async () => {
    const structuredProgram: CatalogueProgram = {
      id: 'structured_design_program',
      name: 'עיצוב מוצר',
      institution: 'Structured Design School',
      institutionId: 'structured_design' as any,
      type: 'academic',
      category: 'עיצוב',
      profileScore: { AN: 2, TE: 2, CR: 5, SO: 2, LE: 2, OR: 2, DI: 4, ER: 3 },
      admissionType: 'requirements',
      admissionRequirements: [],
      linkedInstitutionIds: ['structured_design' as any],
      institutionDetails: [
        {
          institutionName: 'Structured Design School',
          durationYears: 4,
          estimatedStudentsPerYear: 'לא ידוע',
          quantitativeMinRequirement: null,
          englishMinRequirement: null,
          specificAdmissionNotes: [],
          officialCalculatorUrl: '',
          admissionFacts: [
            {
              id: 'structured_design_program:structured_design:fact:bagrut',
              kind: 'numeric_gate',
              field: 'bagrut_average',
              comparison: 'gte',
              valueNumber: 85,
              valueText: null,
              unit: 'average',
              description: 'ממוצע בגרות 85 ומעלה',
              confidence: 'high',
              isRequired: true,
            },
            {
              id: 'structured_design_program:structured_design:fact:portfolio',
              kind: 'manual_gate',
              field: 'portfolio',
              comparison: 'present',
              valueNumber: null,
              valueText: 'תיק עבודות',
              unit: 'text',
              description: 'הגשת תיק עבודות',
              confidence: 'high',
              isRequired: true,
            },
          ],
        },
      ],
    };

    const structuredInstitutions: CatalogueInstitution[] = [
      {
        id: 'structured_design' as any,
        name: 'Structured Design School',
        region: 'center',
        domain: 'structured-design.example',
      },
    ];

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'structured_design_program',
        psychometric: 500,
        bagrut: 92,
      },
      program: structuredProgram,
      institutions: structuredInstitutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'structured_design',
        capability: 'manual_gate',
        kind: 'manual_gate',
        decision: 'eligible_to_apply',
        sourceLabel: 'נדרש מיון נוסף',
      }),
    );
  });

  it('treats grouped structured numeric facts as alternative official routes instead of requiring every route at once', async () => {
    const structuredProgram: CatalogueProgram = {
      id: 'structured_grouped_route_program',
      name: 'הנדסת תוכנה',
      institution: 'Structured Engineering College',
      institutionId: 'structured_grouped' as any,
      type: 'academic',
      category: 'הנדסה',
      profileScore: { AN: 4, TE: 4, CR: 2, SO: 2, LE: 2, OR: 2, DI: 4, ER: 3 },
      admissionType: 'requirements',
      admissionRequirements: [],
      linkedInstitutionIds: ['structured_grouped' as any],
      institutionDetails: [
        {
          institutionName: 'Structured Engineering College',
          durationYears: 4,
          estimatedStudentsPerYear: 'לא ידוע',
          quantitativeMinRequirement: null,
          englishMinRequirement: null,
          specificAdmissionNotes: [],
          officialCalculatorUrl: '',
          admissionFacts: [
            {
              id: 'structured_grouped_route_program:structured_grouped:fact:group:math_route%2F5_units:structured-0',
              kind: 'numeric_gate',
              field: 'math_units',
              comparison: 'gte',
              valueNumber: 5,
              valueText: null,
              unit: 'units',
              description: 'מתמטיקה ברמת 5 יח"ל',
              confidence: 'high',
              isRequired: true,
            },
            {
              id: 'structured_grouped_route_program:structured_grouped:fact:group:math_route%2F5_units:structured-1',
              kind: 'numeric_gate',
              field: 'math_grade',
              comparison: 'gte',
              valueNumber: 70,
              valueText: null,
              unit: 'points',
              description: 'ציון 70 ומעלה במתמטיקה 5 יח"ל',
              confidence: 'high',
              isRequired: true,
            },
            {
              id: 'structured_grouped_route_program:structured_grouped:fact:group:math_route%2F4_units:structured-2',
              kind: 'numeric_gate',
              field: 'math_units',
              comparison: 'gte',
              valueNumber: 4,
              valueText: null,
              unit: 'units',
              description: 'מתמטיקה ברמת 4 יח"ל',
              confidence: 'high',
              isRequired: true,
            },
            {
              id: 'structured_grouped_route_program:structured_grouped:fact:group:math_route%2F4_units:structured-3',
              kind: 'numeric_gate',
              field: 'math_grade',
              comparison: 'gte',
              valueNumber: 85,
              valueText: null,
              unit: 'points',
              description: 'ציון 85 ומעלה במתמטיקה 4 יח"ל',
              confidence: 'high',
              isRequired: true,
            },
            {
              id: 'structured_grouped_route_program:structured_grouped:fact:physics_units',
              kind: 'numeric_gate',
              field: 'physics_units',
              comparison: 'gte',
              valueNumber: 5,
              valueText: null,
              unit: 'units',
              description: 'פיזיקה ברמת 5 יח"ל',
              confidence: 'high',
              isRequired: true,
            },
            {
              id: 'structured_grouped_route_program:structured_grouped:fact:physics_grade',
              kind: 'numeric_gate',
              field: 'physics_grade',
              comparison: 'gte',
              valueNumber: 70,
              valueText: null,
              unit: 'points',
              description: 'ציון 70 ומעלה בפיזיקה 5 יח"ל',
              confidence: 'high',
              isRequired: true,
            },
            {
              id: 'structured_grouped_route_program:structured_grouped:fact:psychometric',
              kind: 'numeric_gate',
              field: 'psychometric',
              comparison: 'gte',
              valueNumber: 580,
              valueText: null,
              unit: 'points',
              description: 'פסיכומטרי 580 ומעלה',
              confidence: 'high',
              isRequired: true,
            },
            {
              id: 'structured_grouped_route_program:structured_grouped:fact:committee',
              kind: 'manual_gate',
              field: 'committee',
              comparison: 'present',
              valueNumber: null,
              valueText: 'ועדת קבלה',
              unit: 'text',
              description: 'בדיקת התאמה סופית מול המוסד',
              confidence: 'high',
              isRequired: true,
            },
          ],
        },
      ],
    };

    const structuredInstitutions: CatalogueInstitution[] = [
      {
        id: 'structured_grouped' as any,
        name: 'Structured Engineering College',
        region: 'south',
        domain: 'structured-grouped.example',
      },
    ];

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'structured_grouped_route_program',
        psychometric: 610,
        bagrut: 110,
        extraInputs: {
          mathUnits: 4,
          mathGrade: 88,
          physicsUnits: 5,
          physicsGrade: 75,
        },
      },
      program: structuredProgram,
      institutions: structuredInstitutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'structured_grouped',
        capability: 'manual_gate',
        kind: 'manual_gate',
        decision: 'eligible_to_apply',
        sourceLabel: 'נדרש מיון נוסף',
      }),
    );
  });

  it('returns below with the gap when the direct numeric gate is missed despite an alternative path', async () => {
    const structuredProgram: CatalogueProgram = {
      id: 'structured_alt_route_program',
      name: 'משפטים',
      institution: 'Structured Alt College',
      institutionId: 'structured_alt' as any,
      type: 'academic',
      category: 'משפטים',
      profileScore: { AN: 2, TE: 2, CR: 4, SO: 3, LE: 4, OR: 3, DI: 2, ER: 3 },
      admissionType: 'requirements',
      admissionRequirements: [],
      linkedInstitutionIds: ['structured_alt' as any],
      institutionDetails: [
        {
          institutionName: 'Structured Alt College',
          durationYears: 3,
          estimatedStudentsPerYear: 'לא ידוע',
          quantitativeMinRequirement: null,
          englishMinRequirement: null,
          specificAdmissionNotes: [],
          officialCalculatorUrl: '',
          admissionFacts: [
            {
              id: 'structured_alt_route_program:structured_alt:fact:bagrut',
              kind: 'numeric_gate',
              field: 'bagrut_average',
              comparison: 'gte',
              valueNumber: 85,
              valueText: null,
              unit: 'average',
              description: 'ממוצע בגרות 85 ומעלה לקבלה ישירה',
              confidence: 'high',
              isRequired: true,
            },
          ],
          admissionAlternativePaths: [
            {
              id: 'structured_alt_route_program:structured_alt:path:prep',
              kind: 'prep_program',
              title: 'מכינה קדם-אקדמית',
              description: 'אפשר להתקבל גם דרך מכינה קדם-אקדמית מאושרת.',
              priority: 1,
            },
          ],
        },
      ],
    };

    const structuredInstitutions: CatalogueInstitution[] = [
      {
        id: 'structured_alt' as any,
        name: 'Structured Alt College',
        region: 'center',
        domain: 'structured-alt.example',
      },
    ];

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'structured_alt_route_program',
        psychometric: 550,
        bagrut: 78,
      },
      program: structuredProgram,
      institutions: structuredInstitutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'structured_alt',
        capability: 'manual_gate',
        kind: 'manual_gate',
        decision: 'below',
        sourceLabel: 'קיימים אפיקים חלופיים',
        threshold: 85,
        score: 78,
        deltaNeeded: { psychometric: 0, bagrut: 7 },
        explanation: expect.stringContaining('מכינה קדם-אקדמית'),
      }),
    );
  });

  it('does not describe alternative routes as mandatory remaining steps when the direct structured gate is already met', async () => {
    const structuredProgram: CatalogueProgram = {
      id: 'structured_direct_route_program',
      name: 'מנהל עסקים',
      institution: 'Structured Direct College',
      institutionId: 'structured_direct' as any,
      type: 'academic',
      category: 'מנהל עסקים',
      profileScore: { AN: 2, TE: 2, CR: 3, SO: 3, LE: 4, OR: 3, DI: 2, ER: 3 },
      admissionType: 'requirements',
      admissionRequirements: [],
      linkedInstitutionIds: ['structured_direct' as any],
      institutionDetails: [
        {
          institutionName: 'Structured Direct College',
          durationYears: 3,
          estimatedStudentsPerYear: 'לא ידוע',
          quantitativeMinRequirement: null,
          englishMinRequirement: null,
          specificAdmissionNotes: [],
          officialCalculatorUrl: '',
          admissionFacts: [
            {
              id: 'structured_direct_route_program:structured_direct:fact:bagrut',
              kind: 'numeric_gate',
              field: 'bagrut_average',
              comparison: 'gte',
              valueNumber: 80,
              valueText: null,
              unit: 'average',
              description: 'ממוצע בגרות 80 ומעלה לקבלה ישירה',
              confidence: 'high',
              isRequired: true,
            },
          ],
          admissionAlternativePaths: [
            {
              id: 'structured_direct_route_program:structured_direct:path:psychometric',
              kind: 'manual_check',
              title: 'מסלול חלופי עם פסיכומטרי',
              description: 'אפשר להתקבל גם במסלול חלופי המבוסס על פסיכומטרי.',
              priority: 1,
            },
          ],
        },
      ],
    };

    const structuredInstitutions: CatalogueInstitution[] = [
      {
        id: 'structured_direct' as any,
        name: 'Structured Direct College',
        region: 'center',
        domain: 'structured-direct.example',
      },
    ];

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'structured_direct_route_program',
        psychometric: 620,
        bagrut: 88,
      },
      program: structuredProgram,
      institutions: structuredInstitutions,
    });

    const result = report.results.find(
      (entry) => entry.linkedInstitutionId === 'structured_direct',
    );

    expect(result).toMatchObject({
      linkedInstitutionId: 'structured_direct',
      capability: 'manual_gate',
      kind: 'manual_gate',
      decision: 'eligible_to_apply',
      sourceLabel: 'אפשר להגיש מועמדות',
    });
    expect(result?.explanation).toContain('עמדתם בתנאים המספריים שמופו.');
    expect(result?.explanation).not.toContain('עדיין צריך להשלים את השלבים הבאים');
    expect(result?.explanation).toContain('קיימים גם אפיקים חלופיים');
  });

  it('returns open_admission from structured detail facts even without monday evidence or a calculator source', async () => {
    const openProgram: CatalogueProgram = {
      id: 'open_fact_program',
      name: 'יסודות הפיתוח',
      institution: 'Open Fact College',
      institutionId: 'open_fact' as any,
      type: 'certificate',
      category: 'לימודי תעודה',
      profileScore: { AN: 3, TE: 3, CR: 3, SO: 3, LE: 3, OR: 3, DI: 3, ER: 3 },
      admissionType: 'requirements',
      admissionRequirements: [],
      linkedInstitutionIds: ['open_fact' as any],
      institutionDetails: [
        {
          institutionName: 'Open Fact College',
          durationYears: 1,
          estimatedStudentsPerYear: 'לא ידוע',
          quantitativeMinRequirement: null,
          englishMinRequirement: null,
          specificAdmissionNotes: [],
          officialCalculatorUrl: '',
          admissionFacts: [
            {
              id: 'open_fact_program:open_fact:fact:open',
              kind: 'open_admission',
              field: 'open_admission',
              comparison: 'eq',
              valueNumber: null,
              valueText: 'קבלה פתוחה',
              unit: 'boolean',
              description: 'קבלה פתוחה ללא תנאי סף',
              confidence: 'high',
              isRequired: false,
            },
          ],
        },
      ],
    };

    const openInstitutions: CatalogueInstitution[] = [
      {
        id: 'open_fact' as any,
        name: 'Open Fact College',
        region: 'center',
        domain: 'openfact.example',
      },
    ];

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'open_fact_program',
        psychometric: 300,
        bagrut: 60,
      },
      program: openProgram,
      institutions: openInstitutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'open_fact',
        capability: 'open_admission',
        kind: 'open_admission',
        decision: 'accepted',
      }),
    );
  });
});

for (const source of socialScienceOfficial.programmes) {
  for (const capture of source.calculatorCaptures) {
    it(`evaluates current ${capture.pairId} P${capture.input.psychometric} without generic Bagrut`, async () => {
      const id = capture.pairId.split('__')[0];
      const program = { ...bguCs, id, name: source.programme };
      const report = await evaluateAdmissionsForProgram({
        program,
        institutions,
        input: {
          degreeId: id,
          psychometric: capture.input.psychometric,
          extraInputs: {
            bguBagrutAverage: capture.input.bguBagrutAverage,
            bguSocialScienceRoute: 'score',
            bguSocialScienceRequirementsConfirmed: true,
            bguSocialScienceLanguageConfirmed: true,
            bguReturningFromStudyBreak: false,
            bguSocialWorkAcademicBackground: 'none',
          },
        },
        fetcher: async (url) =>
          new Response(
            String(url).includes('GetRdpData')
              ? JSON.stringify(source.payload)
              : capture.rawResponse,
          ),
      });
      expectBguExact(report, capture.expectedNumericRouteVerdict as 'below' | 'eligible_to_apply');
      expect(report.results[0].score).toBe(capture.officialScore);
      expect(report.results[0].nextAction).not.toContain('מבדק התאמה');
    });
  }
}

it('shows Social Work scores while retaining the outstanding academic committee decision', async () => {
  const program = { ...bguCs, id: 'bgu_socialwork' };
  const report = await evaluateAdmissionsForProgram({
    program,
    institutions,
    fetcher: async () =>
      new Response(
        JSON.stringify(
          socialScienceOfficial.programmes.find((row) => row.programme === 'social_work')!.payload,
        ),
      ),
    input: {
      degreeId: program.id,
      psychometric: 800,
      extraInputs: {
        bguSocialScienceRequirementsConfirmed: true,
        bguSocialScienceLanguageConfirmed: true,
        bguReturningFromStudyBreak: false,
        bguSocialWorkAcademicBackground: 'other',
        bguSocialWorkTranscriptProvided: false,
      },
    },
  });
  expect(report.results[0]).toMatchObject({
    capability: 'exact',
    decision: 'pending',
    scoreAssessment: 'meets_threshold',
    score: 800,
  });
  expect(report.results[0].additionalConditions).toContainEqual(
    expect.objectContaining({ id: 'bgu_social_work_academic_background', status: 'unconfirmed' }),
  );
});

it.each([
  // Ruling: /workspace/codex-tasks/r1-pr278-rulings-2026-10-25.md row 8. Official source: https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_year=2027&p_semester=1&p_institution=0&p_dep1=101&p_pat1=2&p_degree_level=1. Approved by Jorje 2026-10-25 (r1-pr278-rulings-2026-10-25.md)
  [undefined, undefined, 'accepted', 'unconfirmed', 'unconfirmed'],
  // Ruling: /workspace/codex-tasks/r1-pr278-rulings-2026-10-25.md row 9. Official source: https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_year=2027&p_semester=1&p_institution=0&p_dep1=101&p_pat1=2&p_degree_level=1. Approved by Jorje 2026-10-25 (r1-pr278-rulings-2026-10-25.md)
  [true, undefined, 'accepted', 'confirmed', 'unconfirmed'],
  // Ruling: /workspace/codex-tasks/r1-pr278-rulings-2026-10-25.md row 10. Official source: https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_year=2027&p_semester=1&p_institution=0&p_dep1=101&p_pat1=2&p_degree_level=1. Approved by Jorje 2026-10-25 (r1-pr278-rulings-2026-10-25.md)
  [true, true, 'accepted', 'confirmed', 'confirmed'],
  [false, true, 'below', 'unmet', 'confirmed'],
] as const)(
  'assesses saved Psychology scores separately from confirmations %s/%s',
  async (language, entry, decision, languageStatus, entryStatus) => {
    const program = { ...bguCs, id: 'bgu_psychology', name: 'פסיכולוגיה' };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify(
            language === false
              ? { items: [psychologyOfficial.officialRule] }
              : psychologyWalkthroughOfficial.rulePayload,
          ),
        ),
      );
    const report = await evaluateAdmissionsForProgram({
      program,
      institutions,
      input: {
        degreeId: program.id,
        psychometric: 700,
        bagrut: 110,
        extraInputs: {
          bguLanguageRequirementsConfirmed: language,
          bguPsychologyRequirementsConfirmed: entry,
        },
      },
      fetcher,
    });
    expect(report.results[0]).toMatchObject({
      kind: 'exact',
      decision,
      score: 700,
      threshold: 680,
      scoreAssessment: 'meets_threshold',
      additionalConditions: [
        { id: 'bgu_language_requirements', status: languageStatus },
        { id: 'bgu_psychology_requirements', status: entryStatus },
      ],
    });
    expect(report.results[0].requiredInputs).toBeUndefined();
    if (language !== false) {
      expect(report.results[0].nextAction).toContain('סגורה');
      expect(report.results[0].nextAction).toContain('תנאי השפה');
      expect(report.results[0].nextAction).toContain('החוג הנוסף');
      expect(report.results[0].estimated).not.toBe(true);
    }
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);

it('calculates the combined Psychology score without waiting for entry confirmations', async () => {
  const program = { ...bguCs, id: 'bgu_psychology' };
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ items: [psychologyOfficial.officialRule] })),
    )
    .mockResolvedValueOnce(
      new Response('parent.main.document.mainForm.on_final_sekem.value = 663;'),
    );
  const report = await evaluateAdmissionsForProgram({
    program,
    institutions,
    input: { degreeId: program.id, psychometric: 650, extraInputs: { bguBagrutAverage: 100 } },
    fetcher,
  });
  expect(report.results[0]).toMatchObject({
    kind: 'exact',
    decision: 'pending',
    score: 663,
    threshold: 650,
    scoreAssessment: 'meets_threshold',
  });
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('keeps a below-threshold score separate from unanswered Psychology conditions', async () => {
  const program = { ...bguCs, id: 'bgu_psychology' };
  const report = await evaluateAdmissionsForProgram({
    program,
    institutions,
    input: {
      degreeId: program.id,
      psychometric: 679,
      extraInputs: { bguPsychologyRoute: 'psychometric' },
    },
    fetcher: vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ items: [psychologyOfficial.officialRule] })),
      ),
  });
  expect(report.results[0]).toMatchObject({
    decision: 'below',
    score: 679,
    threshold: 680,
    scoreAssessment: 'below_threshold',
  });
  expect(
    report.results[0].additionalConditions?.every(
      (condition) => condition.status === 'unconfirmed',
    ),
  ).toBe(true);
});

it('returns degraded/unknown when the official BGU response is empty', async () => {
  const program = { ...bguCs, id: 'bgu_psychology' };
  const fetcher = vi.fn<typeof fetch>();
  const report = await evaluateAdmissionsForProgram({
    program,
    institutions,
    input: { degreeId: program.id, psychometric: 650, bagrut: 110 },
    fetcher,
  });
  // Ruling: /workspace/codex-tasks/r1-pr278-rulings-2026-10-25.md row 4. Official source: https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_year=2027&p_semester=1&p_institution=0&p_dep1=101&p_pat1=2&p_degree_level=1. Approved by Jorje 2026-10-25 (r1-pr278-rulings-2026-10-25.md)
  expect(report.results[0]).toMatchObject({
    kind: 'degraded',
    decision: 'unknown',
    estimated: true,
  });
  expect(report.results[0].scoreAssessment).toBeUndefined();
  expect(report.results[0].score).toBeUndefined();
  expect(report.results[0].explanation).toContain('החישוב הרשמי לא הושלם');
  expect(report.results[0].nextAction).toContain('מקצועות הבגרות');
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('returns an estimated Psychology proxy score from a valid official response', async () => {
  const program = { ...bguCs, id: 'bgu_psychology' };
  const report = await evaluateAdmissionsForProgram({
    program,
    institutions,
    input: { degreeId: program.id, psychometric: 650, bagrut: 110 },
    fetcher: async (url) =>
      new Response(
        String(url).includes('GetRdpData')
          ? JSON.stringify(psychologyWalkthroughOfficial.rulePayload)
          : psychologyWalkthroughOfficial.scoreResponseHtml,
      ),
  });
  expect(report.results[0]).toMatchObject({
    kind: 'exact',
    decision: 'pending',
    score: 734,
    estimated: true,
  });
  expect(report.results[0].estimationReason).toContain('110');
  expect(report.results[0].nextAction).toContain('סגורה');
});

it('withholds the score assessment when official Psychology rules change', async () => {
  const program = { ...bguCs, id: 'bgu_psychology' };
  const report = await evaluateAdmissionsForProgram({
    program,
    institutions,
    input: { degreeId: program.id, psychometric: 700 },
    fetcher: vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ items: [{ ...psychologyOfficial.officialRule, psycho_value: 651 }] }),
        ),
      ),
  });
  expect(report.results[0].decision).toBe('unknown');
  expect(report.results[0].scoreAssessment).toBeUndefined();
});

it.each(['psychology', 'bgu_psychology'])(
  'evaluates %s main-campus score and prep routes without generic Bagrut',
  async (id) => {
    const program = {
      ...bguCs,
      id,
      name: 'פסיכולוגיה',
      thresholds: { bgu: 650 },
      minimumPsychometric: { bgu: 650 },
    };
    const common = {
      bguLanguageRequirementsConfirmed: true,
      bguPsychologyRequirementsConfirmed: true,
    };
    for (const [psychometric, score, decision] of [
      [650, 663, 'eligible_to_apply'],
      [649, 662, 'below'],
    ] as const) {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ items: [psychologyOfficial.officialRule] })),
        )
        .mockResolvedValueOnce(
          new Response(`parent.main.document.mainForm.on_final_sekem.value = ${score};`),
        );
      const report = await evaluateAdmissionsForProgram({
        program,
        institutions,
        input: {
          degreeId: id,
          psychometric,
          extraInputs: { ...common, bguBagrutAverage: 100, bguPsychologyRoute: 'score' },
        },
        fetcher,
      });
      expectBguExact(report, decision);
      expect(report.results[0].score).toBe(score);
    }
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [psychologyOfficial.officialRule] })),
      );
    const report = await evaluateAdmissionsForProgram({
      program,
      institutions,
      input: {
        degreeId: id,
        extraInputs: {
          ...common,
          bguPsychologyRoute: 'bagrut',
          bguPreparatoryTrack: 'natural_life_sciences',
          bguPreparatoryAverage: 94.25,
          bguPreparatoryCompleted: true,
        },
      },
      fetcher,
    });
    expectBguExact(report, 'eligible_to_apply');
    expect(report.results[0].score).toBe(94.25);
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);

describe('current HUJI Medicine staged evaluation', () => {
  const hujiInstitutions: CatalogueInstitution[] = [
    {
      id: 'huji',
      name: 'האוניברסיטה העברית',
      region: 'center',
      domain: 'huji.ac.il',
      universityId: 'huji',
    },
  ];
  const medicine: CatalogueProgram = {
    ...bguMedicine,
    id: 'medicine',
    institutionId: 'huji',
    linkedInstitutionIds: ['huji'],
    thresholds: {},
  };
  it.each(['medicine', 'huji_medicine'])('evaluates %s without generic Bagrut', async (id) => {
    const report = await evaluateAdmissionsForProgram({
      program: { ...medicine, id },
      institutions: hujiInstitutions,
      input: { degreeId: id, psychometric: 800, extraInputs: HUJI_MEDICINE_ELIGIBLE_INPUTS },
      fetcher: vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(medicineOfficial.calculatorHtml)),
    });
    expect(report.results).toContainEqual(
      expect.objectContaining({
        capability: 'exact',
        kind: 'manual_gate',
        decision: 'eligible_to_apply',
        score: 26.612,
        threshold: 25.783,
        scoreLabel: 'ציון התאמה סופי לרפואה',
      }),
    );
  });
  it('shows passing screening as incomplete when assessment is missing', async () => {
    const report = await evaluateAdmissionsForProgram({
      program: medicine,
      institutions: hujiInstitutions,
      input: {
        degreeId: 'medicine',
        psychometric: 800,
        extraInputs: { ...HUJI_MEDICINE_ELIGIBLE_INPUTS, hujiMedicineAssessmentScore: undefined },
      },
    });
    expect(report.results).toContainEqual(
      expect.objectContaining({
        kind: 'needs_input',
        decision: 'unknown',
        score: 27.921,
        requiredInputs: ['huji_medicine_assessment_score'],
      }),
    );
  });
  it('does not trust changed calculator arithmetic', async () => {
    const report = await evaluateAdmissionsForProgram({
      program: medicine,
      institutions: hujiInstitutions,
      input: {
        degreeId: 'medicine',
        psychometric: 800,
        extraInputs: HUJI_MEDICINE_ELIGIBLE_INPUTS,
      },
      fetcher: vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response(medicineOfficial.calculatorHtml.replace('0.0290', '0.0286')),
        ),
    });
    expect(report.results).toContainEqual(
      expect.objectContaining({ kind: 'degraded', decision: 'unknown' }),
    );
  });
});

import healthOfficial from '../../../docs/admissions-verification/2026-09-28-bgu-health-official.json';
import { BGU_HEALTH_CONFIG } from '@/data/admissions/bguHealthVerification';
it.each([...healthOfficial.captures, ...healthOfficial.additionalCaptures])(
  'evaluates health $pairId $kind through the public evaluator without generic Bagrut',
  async (fixture) => {
    const id = fixture.pairId.split('__')[0] as keyof typeof BGU_HEALTH_CONFIG;
    const config = BGU_HEALTH_CONFIG[id];
    const { psychometric, bagrut: _bagrut, ...extraInputs } = fixture.input;
    const report = await evaluateAdmissionsForProgram({
      program: {
        ...bguCs,
        id,
        name: config.name,
        thresholds: { bgu: config.threshold },
        minimumPsychometric: { bgu: config.minimumPsychometric },
      },
      institutions,
      input: { degreeId: id, psychometric, extraInputs: extraInputs as AdmissionsExtraInputs },
      fetcher: vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response(healthOfficial.programmes[id].rawRuleResponse))
        .mockResolvedValueOnce(new Response(fixture.rawResponse)),
    });
    expectBguExact(report, fixture.kind === 'eligible' ? 'eligible_to_apply' : 'below');
    expect(report.results[0].score).toBe(fixture.score);
    expect(report.results[0].nextAction).toContain('סגורה');
  },
);
it('evaluates OT degree review without psychometric or Bagrut and does not promise admission', async () => {
  const config = BGU_HEALTH_CONFIG.occupational_therapy;
  const report = await evaluateAdmissionsForProgram({
    program: {
      ...bguCs,
      id: 'occupational_therapy',
      name: config.name,
      thresholds: { bgu: 620 },
      minimumPsychometric: { bgu: 600 },
    },
    institutions,
    input: {
      degreeId: 'occupational_therapy',
      extraInputs: {
        bguOccupationalTherapyRoute: 'academic',
        bguOccupationalTherapyRequirementsConfirmed: true,
        bguBachelorsDegreeCompleted: true,
        bguBachelorsDegreeAverage: 85.25,
      },
    },
    fetcher: vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(healthOfficial.programmes.occupational_therapy.rawRuleResponse),
      ),
  });
  expectBguExact(report, 'eligible_to_apply');
  expect(report.results[0]).toMatchObject({
    score: 85.25,
    scoreLabel: 'ממוצע תואר ראשון',
    explanation: expect.stringContaining('דיון במחלקה'),
  });
});

for (const source of socialScienceOfficial.programmes) {
  const capture = source.calculatorCaptures.find(
    (row) => row.expectedNumericRouteVerdict === 'eligible_to_apply',
  )!;
  it.each([undefined, false] as const)(
    `keeps ${capture.pairId} scores with a separate language condition (%s)`,
    async (confirmed) => {
      const id = capture.pairId.split('__')[0];
      const input = {
        degreeId: id,
        psychometric: capture.input.psychometric,
        extraInputs: {
          bguBagrutAverage: capture.input.bguBagrutAverage,
          bguSocialScienceRoute: 'score' as const,
          bguSocialScienceLanguageConfirmed: confirmed,
        },
      };
      const before = structuredClone(input);
      const report = await evaluateAdmissionsForProgram({
        program: { ...bguCs, id },
        institutions,
        input,
        fetcher: async (url) =>
          new Response(
            String(url).includes('GetRdpData')
              ? JSON.stringify(source.payload)
              : capture.rawResponse,
          ),
      });
      expect(report.results[0]).toMatchObject({
        kind: 'exact',
        score: capture.officialScore,
        scoreAssessment: 'meets_threshold',
        decision: confirmed === false ? 'below' : 'pending',
        additionalConditions: expect.arrayContaining([
          expect.objectContaining({
            id: 'bgu_social_science_language',
            status: confirmed === false ? 'unmet' : 'unconfirmed',
          }),
        ]),
      });
      expect(input).toEqual(before);
    },
  );
}

it.each(healthOfficial.captures.filter((fixture) => fixture.kind === 'eligible'))(
  'keeps $pairId scores without confirming health registration requirements',
  async (fixture) => {
    const id = fixture.pairId.split('__')[0] as keyof typeof BGU_HEALTH_CONFIG;
    const { psychometric, bagrut: _bagrut, ...extraInputs } = fixture.input;
    const report = await evaluateAdmissionsForProgram({
      program: { ...bguCs, id },
      institutions,
      input: {
        degreeId: id,
        psychometric,
        extraInputs: {
          ...extraInputs,
          bguOccupationalTherapyRequirementsConfirmed: undefined,
          bguPhysiotherapyRequirementsConfirmed: undefined,
          bguOccupationalTherapyExamSession: undefined,
        } as AdmissionsExtraInputs,
      },
      fetcher: vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response(healthOfficial.programmes[id].rawRuleResponse))
        .mockResolvedValueOnce(new Response(fixture.rawResponse)),
    });
    expect(report.results[0]).toMatchObject({
      kind: 'exact',
      score: fixture.score,
      scoreAssessment: 'meets_threshold',
      decision: 'pending',
    });
    expect(report.results[0].additionalConditions).toContainEqual(
      expect.objectContaining({ status: 'unconfirmed' }),
    );
  },
);

describe('catalogue eligibility safety', () => {
  const onoLaw = getStaticCataloguePrograms().find((program) => program.id === 'ono_law')!;
  const onoSocialwork: CatalogueProgram = {
    ...onoLaw,
    id: 'ono_socialwork',
    name: 'עבודה סוציאלית',
    admissionRequirements: ['פסיכומטרי 440 ומעלה', 'ממוצע בגרות 70 ומעלה'],
    institutionDetails: [
      {
        ...onoLaw.institutionDetails![0],
        admissionFacts: [
          {
            id: 'ono_socialwork:psychometric',
            kind: 'numeric_gate',
            field: 'psychometric',
            comparison: 'gte',
            valueNumber: 440,
            valueText: null,
            unit: 'points',
            description: 'פסיכומטרי 440 ומעלה',
            confidence: 'high',
            isRequired: true,
          },
          {
            id: 'ono_socialwork:bagrut',
            kind: 'numeric_gate',
            field: 'bagrut_average',
            comparison: 'gte',
            valueNumber: 70,
            valueText: null,
            unit: 'average',
            description: 'ממוצע בגרות 70 ומעלה',
            confidence: 'high',
            isRequired: true,
          },
        ],
      },
    ],
  };

  it.each([
    ['ono_law', 'ono', 'below'],
    ['ono_socialwork', 'ono', 'eligible_to_apply'],
    ['tau_medicine', 'tau', 'unknown'],
    ['medicine', 'tau', 'unknown'],
    ['mta_cs', 'mta', 'unknown'],
  ])(
    'does not claim eligibility for a weak profile at %s:%s',
    async (degreeId, institutionId, decision) => {
      const program =
        degreeId === 'ono_socialwork'
          ? onoSocialwork
          : getStaticCataloguePrograms().find((item) => item.id === degreeId)!;
      expect(program).toBeDefined();
      const report = await evaluateAdmissionsForProgram({
        input: { degreeId, psychometric: 420, bagrut: 70 },
        program,
        institutions: getStaticCatalogueInstitutions(),
        fetcher: vi.fn<typeof fetch>().mockRejectedValue(new Error('Offline fixture')),
      });
      const result = report.results.find((item) => item.linkedInstitutionId === institutionId)!;
      expect(result).toBeDefined();
      expect(result.decision).toBe(decision);
      if (decision === 'unknown') {
        expect(result.kind).toBe(degreeId === 'mta_cs' ? 'needs_input' : 'requirements_only');
        expect(resultLabel(result).group).toBe('explore');
        if (degreeId === 'mta_cs')
          expect(result.requiredInputs).toEqual([
            'math_units',
            'math_grade',
            'psychometric_english',
          ]);
      }
      expect(result.explanation).not.toMatch(/[A-Za-z]{2,}\s+[A-Za-z]{2,}/);
      if (degreeId === 'ono_socialwork') {
        expect(result).toMatchObject({
          capability: 'manual_gate',
          kind: 'manual_gate',
          decision: 'eligible_to_apply',
        });
        expect(result.scoreAssessment).toBeUndefined();
        expect(result.explanation).toContain('ראיון');
        expect(result.explanation).not.toMatch(/מתואם|סכם|מצרף/);
      }
    },
  );

  const manualFact: AdmissionFact = {
    id: 'fixture:interview',
    kind: 'manual_gate',
    field: 'interview',
    comparison: 'present',
    valueNumber: null,
    valueText: null,
    unit: 'text',
    description: 'ריאיון קבלה',
    confidence: 'high',
    isRequired: true,
  };
  const numericFact = onoSocialwork.institutionDetails![0].admissionFacts![0];
  const absence = (field: 'psychometric' | 'bagrut_average'): AdmissionFact => ({
    ...manualFact,
    id: `fixture:absence:${field}`,
    kind: 'explicit_absence',
    field,
    comparison: 'not_required',
    description: field === 'psychometric' ? 'אין צורך בפסיכומטרי' : 'אין צורך בבגרות',
  });

  it.each([
    { name: 'manual steps alone', facts: [manualFact], eligible: false },
    {
      name: 'a missing numeric value',
      facts: [manualFact, { ...numericFact, valueNumber: null }],
      eligible: false,
    },
    {
      name: 'a placeholder numeric threshold',
      facts: [manualFact, { ...numericFact, valueNumber: 0 }],
      eligible: false,
    },
    {
      name: 'an unsupported numeric field',
      facts: [manualFact, { ...numericFact, field: 'sekhem' as const }],
      eligible: false,
    },
    {
      name: 'an unverified numeric fact',
      facts: [manualFact, { ...numericFact, confidence: 'low' as const }],
      eligible: false,
    },
    {
      name: 'an unchecked grouped route',
      facts: [manualFact, { ...numericFact, valueNumber: null, groupKey: 'route/first' }],
      eligible: false,
    },
    {
      name: 'a partly checked route',
      facts: [
        manualFact,
        { ...numericFact, valueNumber: 400 },
        { ...numericFact, id: 'fixture:unchecked', field: 'sekhem' as const },
      ],
      eligible: false,
    },
    {
      name: 'only psychometric explicitly absent',
      facts: [manualFact, absence('psychometric')],
      eligible: false,
    },
    {
      name: 'unverified absence of grade gates',
      facts: [
        manualFact,
        { ...absence('psychometric'), confidence: 'low' as const },
        absence('bagrut_average'),
      ],
      eligible: false,
    },
    {
      name: 'both grades explicitly absent',
      facts: [manualFact, absence('psychometric'), absence('bagrut_average')],
      eligible: true,
    },
    {
      name: 'open admission with an interview',
      facts: [
        manualFact,
        {
          ...manualFact,
          id: 'fixture:open',
          kind: 'open_admission' as const,
          field: 'open_admission' as const,
        },
      ],
      eligible: true,
    },
    {
      name: 'a checked numeric gate',
      facts: [manualFact, { ...numericFact, valueNumber: 400 }],
      eligible: true,
    },
    {
      name: 'a checked grouped alternative',
      facts: [
        manualFact,
        { ...numericFact, valueNumber: null, groupKey: 'route/first' },
        { ...numericFact, id: 'fixture:passed', valueNumber: 400, groupKey: 'route/second' },
      ],
      eligible: true,
    },
  ])('requires checked numeric gates or explicit absence: $name', async ({ facts, eligible }) => {
    // This institution has no institution-wide claim of admission without grades.
    const institution = getStaticCatalogueInstitutions().find((item) => item.id === 'mta')!;
    const program: CatalogueProgram = {
      ...onoSocialwork,
      id: 'eligibility_fixture',
      institution: institution.name,
      institutionId: 'mta',
      linkedInstitutionIds: ['mta'],
      institutionDetails: [
        {
          ...onoSocialwork.institutionDetails![0],
          institutionName: institution.name,
          admissionFacts: facts,
          admissionAlternativePaths: [],
          specificAdmissionNotes: [],
        },
      ],
    };
    const report = await evaluateAdmissionsForProgram({
      program,
      institutions: [institution],
      input: { degreeId: program.id, psychometric: 420, bagrut: 70 },
    });
    expect(report.results[0].decision).toBe(eligible ? 'eligible_to_apply' : 'unknown');
    if (!eligible) expect(resultLabel(report.results[0]).group).toBe('explore');
  });

  it('sanitises internal notes in free-text requirements without mutating source data', async () => {
    const institution = getStaticCatalogueInstitutions().find((item) => item.id === 'mta')!;
    const program: CatalogueProgram = {
      ...onoSocialwork,
      id: 'free_text_fixture',
      institution: institution.name,
      institutionId: 'mta',
      linkedInstitutionIds: ['mta'],
      admissionRequirements: [
        'Admission depends on manual review such as interview, portfolio, exam, or committee.',
        'ממוצע בגרות 90 ומעלה',
        'IELTS 6.5',
      ],
      institutionDetails: [],
    };
    const before = structuredClone(program);
    const report = await evaluateAdmissionsForProgram({
      program,
      institutions: [institution],
      input: { degreeId: program.id, psychometric: 420, bagrut: 70 },
    });
    expect(report.results[0].decision).toBe('unknown');
    expect(report.results[0].explanation).not.toContain('Admission depends');
    expect(report.results[0].explanation).toContain('הקבלה כוללת מיון נוסף');
    expect(report.results[0].explanation).toContain('ממוצע בגרות 90 ומעלה');
    expect(report.results[0].explanation).toContain('IELTS 6.5');
    expect(program).toEqual(before);
  });

  it('never marks a weak profile eligible across the catalogue without checked gates or explicit no-grade admission', async () => {
    const profile = { psychometric: 420, bagrut: 70 };
    const passes = (fact: AdmissionFact) => {
      const actual =
        fact.field === 'psychometric'
          ? profile.psychometric
          : fact.field === 'bagrut_average'
            ? profile.bagrut
            : undefined;
      if (actual === undefined || fact.valueNumber === null || fact.confidence !== 'high')
        return false;
      if (fact.comparison === 'gte') return actual >= fact.valueNumber;
      if (fact.comparison === 'lte') return actual <= fact.valueNumber;
      return fact.comparison === 'eq' && actual === fact.valueNumber;
    };
    let checkedPairs = 0;
    for (const program of getStaticCataloguePrograms()) {
      const report = await evaluateAdmissionsForProgram({
        program,
        institutions: getStaticCatalogueInstitutions(),
        input: { degreeId: program.id, ...profile },
        fetcher: vi.fn<typeof fetch>().mockRejectedValue(new Error('Offline fixture')),
      });
      for (const result of report.results) {
        checkedPairs += 1;
        if (result.decision !== 'eligible_to_apply') continue;
        const detail = program.institutionDetails?.find(
          (item) =>
            item.institutionName === program.institution ||
            item.institutionName === result.institution.name,
        );
        const facts = detail?.admissionFacts ?? [];
        const explicitNoGate =
          facts.some((fact) => fact.kind === 'open_admission') ||
          ['psychometric', 'bagrut_average'].every((field) =>
            facts.some((fact) => fact.kind === 'explicit_absence' && fact.field === field),
          ) ||
          getMondayAdmissionEvidenceByCatalogueInstitutionId(result.linkedInstitutionId).some(
            (evidence) => evidence.noBagrutNeeded && evidence.noPsychometricNeeded,
          );
        const numeric = facts.filter((fact) => fact.kind === 'numeric_gate');
        const groups = new Map<string, Map<string, AdmissionFact[]>>();
        const common: AdmissionFact[] = [];
        for (const fact of numeric) {
          const encoded = fact.id.match(/:fact:group:([^:]+):/u)?.[1];
          const group = fact.groupKey ?? (encoded ? decodeURIComponent(encoded) : undefined);
          if (!group) {
            common.push(fact);
            continue;
          }
          const [category, option] = group.split('/', 2);
          const options = groups.get(category) ?? new Map<string, AdmissionFact[]>();
          options.set(option, [...(options.get(option) ?? []), fact]);
          groups.set(category, options);
        }
        const checkedFacts =
          numeric.length > 0 &&
          common.every(passes) &&
          [...groups.values()].every((options) =>
            [...options.values()].some((option) => option.every(passes)),
          );
        const checkedThreshold =
          result.score !== undefined &&
          result.threshold != null &&
          result.threshold > 0 &&
          result.score >= result.threshold;
        const honestManualGate =
          result.capability === 'manual_gate' &&
          result.kind === 'manual_gate' &&
          result.scoreAssessment !== 'meets_threshold';
        expect(
          explicitNoGate || checkedFacts || checkedThreshold || honestManualGate,
          `${program.id}:${result.linkedInstitutionId}`,
        ).toBe(true);
      }
    }
    expect(checkedPairs).toBeGreaterThan(400);
  });
});

describe('results average normalization regressions', () => {
  const record = {
    schemaVersion: 2 as const,
    sector: 'jewish' as const,
    certificateType: 'internal' as const,
    complete: true,
    subjects: [
      { subjectId: 'history', units: 2, grade: 100, assessmentKind: 'exam' as const },
      { subjectId: 'civics', units: 2, grade: 100, assessmentKind: 'exam' as const },
      { subjectId: 'mathematics', units: 5, grade: 90, assessmentKind: 'exam' as const },
      { subjectId: 'english', units: 5, grade: 100, assessmentKind: 'exam' as const },
      { subjectId: 'literature', units: 5, grade: 100, assessmentKind: 'exam' as const },
      { subjectId: 'bible', units: 2, grade: 100, assessmentKind: 'exam' as const },
      { subjectId: 'hebrew_expression', units: 2, grade: 100, assessmentKind: 'exam' as const },
    ],
  };
  it('derives an overall estimate so subjects alone do not remove otherwise usable results', async () => {
    const program = getStaticCataloguePrograms().find((row) => row.id === 'huji_cs')!;
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: program.id,
        psychometric: 700,
        extraInputs: { bagrutSubjectRecord: record },
      },
      program,
      institutions: getStaticCatalogueInstitutions(),
      fetcher: vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')),
    });
    const result = report.results.find((row) => row.linkedInstitutionId === 'huji')!;
    expect(result.requiredInputs ?? []).not.toContain('bagrut_average');
    expect(result.estimated).toBe(true);
    expect(result.estimationReason).toBeTruthy();
  });
  it.each(['bgu_cs', 'tau_cs'])(
    'derives the %s institutional average from a complete record',
    async (degreeId) => {
      const program = degreeId === 'bgu_cs' ? bguCs : tauCs;
      const report = await evaluateAdmissionsForProgram({
        input: {
          degreeId,
          bagrut: 110,
          psychometric: 700,
          extraInputs: {
            bagrutSubjectRecord: record,
            psychometricMath: 140,
            psychometricVerbal: 130,
            psychometricEnglish: 130,
          },
        },
        program,
        institutions,
        fetcher: vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')),
      });
      expect(report.results[0].requiredInputs ?? []).not.toContain(
        degreeId === 'bgu_cs' ? 'bgu_bagrut_average' : 'tau_bagrut_average',
      );
      expect(report.results[0].estimated).not.toBe(true);
    },
  );
  it('marks an average-only proxy explicitly without manufacturing a subject record', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: { degreeId: 'tau_cs', bagrut: 110, psychometric: 700 },
      program: tauCs,
      institutions,
    });
    expect(report.results[0]).toMatchObject({
      estimated: true,
      requiredInputs: ['bagrut_subject_record'],
    });
    expect(report.results[0].estimationReason).toContain('110');
  });
  it('accepts paired BGU math inputs through the adapter without requiring a certificate record', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(BGU_COMPUTER_SCIENCE_RULE_CAPTURE)))
      .mockResolvedValueOnce(
        new Response(
          '<script>parent.main.document.getElementById("on_c_val").innerHTML = 875;</script>',
        ),
      );
    const { bagrutSubjectRecord: _record, ...extraInputs } = csInputs;
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'bgu_cs',
        bagrut: 110,
        psychometric: 760,
        extraInputs: { ...extraInputs, mathUnits: 5, mathGrade: 85 },
      },
      program: bguCs,
      institutions,
      fetcher,
    });
    expect(report.results[0]).toMatchObject({ kind: 'exact', score: 875 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it.each([
    [5, 79],
    [4, 89],
    [3, 100],
  ])(
    'keeps the published BGU math floor for paired inputs %s × %s',
    async (mathUnits, mathGrade) => {
      const fetcher = vi.fn<typeof fetch>();
      const { bagrutSubjectRecord: _record, ...extraInputs } = csInputs;
      const report = await evaluateAdmissionsForProgram({
        input: {
          degreeId: 'bgu_cs',
          bagrut: 110,
          psychometric: 760,
          extraInputs: { ...extraInputs, mathUnits, mathGrade },
        },
        program: bguCs,
        institutions,
        fetcher,
      });
      expect(report.results[0]).toMatchObject({ kind: 'exact', decision: 'below' });
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it('defaults Haifa years while retaining qualification questions', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'haifa_cs',
        bagrut: 105,
        psychometric: 650,
        extraInputs: {
          psychometricMath: 130,
          psychometricVerbal: 130,
          psychometricEnglish: 130,
          mathUnits: 5,
          mathGrade: 90,
        },
      },
      program: haifaCs,
      institutions,
    });
    expect(report.results[0]).toMatchObject({ estimated: true });
    expect(report.results[0].requiredInputs).toContain('haifa_admission_qualification');
    expect(report.results[0].requiredInputs).not.toContain('haifa_bagrut_year');
  });
  it('does not leak the HIT implementation note after math gates are supplied', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'hit_cs',
        bagrut: 110,
        psychometric: 700,
        extraInputs: { mathUnits: 5, mathGrade: 90 },
      },
      program: { ...hitEngineering, admissionType: 'requirements', thresholds: undefined },
      institutions: institutions.map((row) =>
        row.id === 'hit'
          ? {
              ...row,
              calculatorConfig: { formulaType: 'minimum_floors', scaleDescription: 'סף קבלה HIT' },
            }
          : row,
      ),
    });
    expect(report.results[0]).toMatchObject({ kind: 'unsupported', decision: 'unknown' });
    expect(report.results[0].explanation).not.toMatch(/[A-Za-z]/);
    expect(report.results[0].nextAction).not.toMatch(/[A-Za-z]/);
  });
});

describe('BGU psychology production walkthrough regression', () => {
  it.each([679, 680])('keeps the inclusive psych-only boundary at %s', async (psychometric) => {
    const program = { ...bguCs, id: 'bgu_psychology' };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(psychologyWalkthroughOfficial.rulePayload)));
    const report = await evaluateAdmissionsForProgram({
      program,
      institutions,
      fetcher,
      input: {
        degreeId: program.id,
        bagrut: 112,
        psychometric,
        extraInputs: { bguPsychologyRoute: 'psychometric' },
      },
    });
    expect(report.results[0]).toMatchObject({
      decision: psychometric === 680 ? 'accepted' : 'below',
      score: psychometric,
      threshold: 680,
      scoreLabel: 'פסיכומטרי',
    });
    expect(report.results[0].estimated).not.toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([650, 690, 720])(
    'evaluates bagrut 112 / psychometric %s against the current official rule',
    async (psychometric) => {
      const program = { ...bguCs, id: 'bgu_psychology', name: 'פסיכולוגיה' };
      const fetcher = vi
        .fn<typeof fetch>()
        .mockImplementation(
          async (url) =>
            new Response(
              String(url) === psychologyWalkthroughOfficial.rulesUrl
                ? JSON.stringify(psychologyWalkthroughOfficial.rulePayload)
                : psychologyWalkthroughOfficial.scoreResponseHtml,
            ),
        );
      const report = await evaluateAdmissionsForProgram({
        program,
        institutions,
        fetcher,
        input: { degreeId: program.id, bagrut: 112, psychometric },
      });
      const result = report.results[0];
      expect(result.kind).toBe('exact');
      expect(result.degradationReason).toBeUndefined();
      expect(result.officialUrls).toContain(psychologyWalkthroughOfficial.rulesUrl);
      if (psychometric >= 680) {
        expect(result).toMatchObject({
          decision: 'accepted',
          score: psychometric,
          threshold: 680,
          scoreLabel: 'פסיכומטרי',
          scoreAssessment: 'meets_threshold',
        });
        expect(result.estimated).not.toBe(true);
        expect(fetcher).toHaveBeenCalledTimes(1);
      } else {
        expect(result).toMatchObject({
          decision: 'pending',
          score: 734,
          estimated: true,
          scoreLabel: 'סכם',
          scoreAssessment: 'meets_threshold',
        });
        expect(fetcher).toHaveBeenCalledTimes(2);
      }
      expect(result.nextAction).toContain('סגורה');
      expect(result.additionalConditions).toContainEqual(
        expect.objectContaining({
          id: 'bgu_language_requirements',
          status: 'unconfirmed',
        }),
      );
    },
  );
});

it('asks for subjects rather than reporting unavailable when the Psychology proxy-score replay fails', async () => {
  const program = { ...bguCs, id: 'bgu_psychology' };
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(JSON.stringify(psychologyWalkthroughOfficial.rulePayload)))
    .mockResolvedValueOnce(new Response('unavailable', { status: 503 }));
  const report = await evaluateAdmissionsForProgram({
    program,
    institutions,
    fetcher,
    input: { degreeId: program.id, bagrut: 112, psychometric: 650 },
  });
  expect(report.results[0]).toMatchObject({
    kind: 'needs_input',
    decision: 'unknown',
    estimated: true,
    requiredInputs: ['bagrut_subject_record'],
  });
  expect(report.results[0].score).toBeUndefined();
  expect(report.results[0].explanation).toContain('החישוב הרשמי לא הושלם');
});

it('keeps an actual Psychology score-service outage distinct when an explicit institutional average exists', async () => {
  const program = { ...bguCs, id: 'bgu_psychology' };
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(JSON.stringify(psychologyWalkthroughOfficial.rulePayload)))
    .mockResolvedValueOnce(new Response('unavailable', { status: 503 }));
  const report = await evaluateAdmissionsForProgram({
    program,
    institutions,
    fetcher,
    input: { degreeId: program.id, psychometric: 650, extraInputs: { bguBagrutAverage: 112 } },
  });
  expect(report.results[0]).toMatchObject({ kind: 'degraded', decision: 'unknown' });
  expect(report.results[0].requiredInputs).toBeUndefined();
});

describe('R1 ruling safeguards G1–G3', () => {
  async function psychology(score: number, extraInputs: AdmissionsExtraInputs = {}, bagrut = 110) {
    const program = { ...bguCs, id: 'bgu_psychology' };
    const report = await evaluateAdmissionsForProgram({
      program,
      institutions,
      input: { degreeId: program.id, bagrut, psychometric: 650, extraInputs },
      fetcher: async (url) =>
        new Response(
          String(url).includes('GetRdpData')
            ? JSON.stringify(psychologyWalkthroughOfficial.rulePayload)
            : `parent.main.document.mainForm.on_final_sekem.value = ${score};`,
        ),
    });
    return report.results[0];
  }

  async function colman(
    bagrut: number,
    psychometric?: number,
    extraInputs: AdmissionsExtraInputs = {},
  ) {
    const program = getStaticCataloguePrograms().find((row) => row.id === 'colmgmt_economics')!;
    const report = await evaluateAdmissionsForProgram({
      program,
      institutions: getStaticCatalogueInstitutions(),
      input: { degreeId: program.id, bagrut, psychometric, extraInputs },
    });
    return report.results.find((row) => row.linkedInstitutionId === 'colman')!;
  }

  it.each([0.98, 1.02, 0.979, 1.021])('G2 Colman proxy at floor × %s', async (ratio) => {
    const result = await colman(85 * ratio, 420, { colmanBagrutCertificateConfirmed: true });
    expect(result.estimated).toBe(true);
    if (ratio === 0.98 || ratio === 1.02) {
      expect(result).toMatchObject({
        kind: 'needs_input',
        decision: 'unknown',
        requiredInputs: ['bagrut_subject_record'],
      });
      expect(result.scoreAssessment).toBeUndefined();
    } else {
      expect(result).toMatchObject({
        kind: 'manual_gate',
        decision: ratio < 1 ? 'below' : 'eligible_to_apply',
      });
    }
  });

  it.each([0.98, 1.02, 0.979, 1.021])('G2 BGU proxy-derived score at floor × %s', async (ratio) => {
    const result = await psychology(650 * ratio, {
      bguPreparatoryTrack: 'natural_life_sciences',
      bguPreparatoryCompleted: true,
      bguPreparatoryAverage: 80,
    });
    expect(result.estimated).toBe(true);
    if (ratio === 0.98 || ratio === 1.02) {
      expect(result).toMatchObject({
        kind: 'needs_input',
        decision: 'unknown',
        requiredInputs: ['bagrut_subject_record'],
      });
      expect(result.scoreAssessment).toBeUndefined();
    } else {
      expect(result).toMatchObject({ kind: 'exact', decision: ratio < 1 ? 'below' : 'pending' });
    }
  });

  it.each([
    ['passing', 600, 130],
    ['undecidable', undefined, undefined],
    ['failing', 420, undefined],
  ] as const)(
    'G3 Colman proxy-below with %s alternative',
    async (state, psychometric, quantitative) => {
      const result = await colman(70, psychometric, {
        psychometricMath: quantitative,
        colmanBagrutCertificateConfirmed: true,
      });
      expect(result.estimated).toBe(true);
      if (state === 'failing')
        expect(result).toMatchObject({ kind: 'manual_gate', decision: 'below' });
      else
        expect(result).toMatchObject({
          kind: 'needs_input',
          decision: 'unknown',
          requiredInputs: ['bagrut_subject_record'],
        });
    },
  );

  it('G3 BGU proxy-below with an undecidable preparatory channel has no verdict', async () => {
    expect(await psychology(600)).toMatchObject({
      kind: 'needs_input',
      decision: 'unknown',
      estimated: true,
      requiredInputs: ['bagrut_subject_record'],
    });
  });

  it('G3 BGU proxy-below with a passing preparatory channel has no below verdict', async () => {
    const result = await psychology(600, {
      bguPsychologyRoute: 'score',
      bguPreparatoryTrack: 'natural_life_sciences',
      bguPreparatoryCompleted: true,
      bguPreparatoryAverage: 95,
    });
    expect(result).toMatchObject({
      kind: 'needs_input',
      decision: 'unknown',
      estimated: true,
      requiredInputs: ['bagrut_subject_record'],
    });
  });

  it('G1 real BGU average is unflagged and exempt from G2', async () => {
    const result = await psychology(650, { bguBagrutAverage: 110 });
    expect(result).toMatchObject({ kind: 'exact', decision: 'pending', score: 650 });
    expect(result.estimated).not.toBe(true);
  });

  it('G1 real Colman average is unflagged and exempt from G2', async () => {
    const result = await colman(85, 420, {
      colmanBagrutAverage: 85,
      colmanBagrutCertificateConfirmed: true,
    });
    expect(result).toMatchObject({ kind: 'manual_gate', decision: 'eligible_to_apply', score: 85 });
    expect(result.estimated).not.toBe(true);
  });

  it.each([true, false])(
    'G1 Haifa estimated years only when defaulted: %s',
    async (defaultYears) => {
      const report = await evaluateAdmissionsForProgram({
        program: haifaCs,
        institutions,
        input: {
          degreeId: 'haifa_cs',
          bagrut: 105,
          psychometric: 680,
          extraInputs: {
            haifaBagrutAverage: 102,
            ...(defaultYears ? {} : { haifaBagrutYear: 2020, haifaPsychometricYear: 2025 }),
          },
        },
      });
      expect(report.results[0].estimated === true).toBe(defaultYears);
      if (defaultYears) expect(report.results[0].estimationReason).toContain('2026');
    },
  );

  it('G1 a BGU average proxy is labelled as estimated, never official', async () => {
    const result = await psychology(700, {}, 116);
    expect(result).toMatchObject({ estimated: true, score: 116 });
    expect(result.scoreLabel).not.toContain('רשמי');
    expect(result.explanation).not.toContain('רשמי');
  });
});

it.each([
  { bagrut: 110, bguPsychologyRoute: 'bagrut' as const },
  { bagrut: 112, bguPsychologyRoute: 'score' as const },
])(
  'G3 withholds proxy-below when another Psychology score channel is untested or borderline: %j',
  async ({ bagrut, bguPsychologyRoute }) => {
    const program = { ...bguCs, id: 'bgu_psychology' };
    const report = await evaluateAdmissionsForProgram({
      program,
      institutions,
      input: {
        degreeId: program.id,
        bagrut,
        psychometric: 650,
        extraInputs: {
          bguPsychologyRoute,
          bguPreparatoryTrack: 'natural_life_sciences',
          bguPreparatoryCompleted: true,
          bguPreparatoryAverage: 80,
        },
      },
      fetcher: async (url) =>
        new Response(
          String(url).includes('GetRdpData')
            ? JSON.stringify(psychologyWalkthroughOfficial.rulePayload)
            : 'parent.main.document.mainForm.on_final_sekem.value = 600;',
        ),
    });
    expect(report.results[0]).toMatchObject({
      kind: 'needs_input',
      decision: 'unknown',
      estimated: true,
      requiredInputs: ['bagrut_subject_record'],
    });
  },
);

it.each([
  { psychometric: 420, quantitative: undefined, decision: 'below' },
  { psychometric: 600, quantitative: 130, decision: 'unknown' },
  { psychometric: undefined, quantitative: undefined, decision: 'unknown' },
] as const)(
  '06:40 ruling: G3 economics copy follows all-channel outcome %j',
  async ({ psychometric, quantitative, decision }) => {
    const program = getStaticCataloguePrograms().find((row) => row.id === 'colmgmt_economics')!;
    const report = await evaluateAdmissionsForProgram({
      program,
      institutions: getStaticCatalogueInstitutions(),
      input: {
        degreeId: program.id,
        bagrut: 70,
        psychometric,
        extraInputs: { psychometricMath: quantitative },
      },
    });
    const result = report.results.find((row) => row.linkedInstitutionId === 'colman')!;
    expect(result.decision).toBe(decision);
    expect(result.explanation).not.toContain('זו אינה דחייה מכל מסלולי הקבלה.');
    if (decision === 'unknown') expect(result.kind).toBe('needs_input');
  },
);
