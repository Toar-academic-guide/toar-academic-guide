import { describe, expect, it, vi } from 'vitest';
import official from '../../../docs/admissions-verification/2026-10-23-official-requirements-5.json';
import { buildCatalogueSeed } from '@/db/seeds/catalogueSeed';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { allowsNoGenericBagrut, allowsNoPsychometric } from '@/lib/calculatorInputRequirements';
import { evaluateAdmissionsForProgram } from './evaluator';

vi.mock('server-only', () => ({}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: async () => ({ data: getStaticCataloguePrograms(), meta: {} }),
  listCatalogueInstitutions: async () => ({ data: getStaticCatalogueInstitutions(), meta: {} }),
}));
import {
  getPublicProgramPageData,
  getPublicProgramRequirementSources,
} from '@/lib/publicCataloguePages';

const seed = buildCatalogueSeed();

describe('official requirements batch1 preservation and Colman economics', () => {
  it.each(Object.entries(official))(
    '%s preserves exact operator copy and official sources',
    (pairId, value) => {
      expect(seed.admissionRequirements.find((row) => row.id === pairId)).toMatchObject({
        admissionRequirements: value.requirements,
        // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 39)
        specificAdmissionNotes:
          pairId === 'ono_law:ono'
            ? value.notes.filter(
                (note) =>
                  note !==
                  'המחשבון בודק רק ממוצע בגרות ופסיכומטרי. מסלול גיל 30+, תואר קודם ואפיק המעבר לא נבדקים בו.',
              )
            : value.notes,
      });
      expect(seed.sourceUrls.find((row) => row.id === `${pairId}:program`)?.url).toBe(
        value.programUrl,
      );
      const version = seed.requirementVersions.find(
        (row) => row.admissionRequirementId === pairId,
      )!;
      expect(version.sourceSnapshot).toMatchObject({ program: value.programUrl });
      if ('calculatorUrl' in value) {
        expect(seed.sourceUrls.find((row) => row.id === `${pairId}:calculator`)?.url).toBe(
          value.calculatorUrl,
        );
        expect(version.sourceSnapshot).toMatchObject({ calculator: value.calculatorUrl });
      }
      if ('facts' in value) {
        expect(seed.admissionFacts.filter((row) => row.admissionRequirementId === pairId)).toEqual(
          value.facts.map((fact) => ({
            ...fact,
            admissionRequirementId: pairId,
            programId: value.program,
            institutionId: value.institution,
            sourceCandidateId: null,
            confidence: 'high',
            isRequired: true,
          })),
        );
        expect(
          seed.admissionAlternativePaths.filter((row) => row.admissionRequirementId === pairId),
        ).toEqual([]);
      }
    },
  );

  it('preserves the Haifa nursing sekhem threshold', () => {
    expect(
      seed.admissionThresholds.find(
        (row) => row.programId === 'haifa_nursing' && row.institutionId === 'haifa',
      ),
    ).toMatchObject({ thresholdValue: 580 });
  });

  it('shows economics requirements and the special route together with tracked official links', async () => {
    const value = official['colmgmt_economics:colman'];
    const page = (await getPublicProgramPageData(value.program))!;
    const source = (await getPublicProgramRequirementSources(page)).colman;
    expect(source.requirements).toEqual([...value.requirements, ...value.notes]);
    for (const [key, url] of [
      ['officialUrl', value.programUrl],
      ['officialCalculatorUrl', value.calculatorUrl],
    ] as const) {
      const actual = new URL(source[key]!);
      const expected = new URL(url);
      expect(actual.origin + actual.pathname).toBe(expected.origin + expected.pathname);
      for (const [key, value] of expected.searchParams)
        expect(actual.searchParams.get(key)).toBe(value);
      expect(actual.searchParams.get('utm_source')).toBe('myway');
      expect(actual.searchParams.get('utm_medium')).toBe('referral');
    }
    expect(allowsNoGenericBagrut(value.program)).toBe(true);
    expect(allowsNoPsychometric(value.program)).toBe(true);
  });

  it.each([
    // Ruling: /workspace/codex-tasks/r1-pr278-rulings-2026-10-25.md row 5. Official source: https://www.colman.ac.il/academics/ba/economy/. Approved by Jorje 2026-10-25 (r1-pr278-rulings-2026-10-25.md)
    // Amit ruling 2026-10-25 via Jorje: full bagrut assumed when grades entered
    [undefined, 420, undefined, 'below', 'exact'],
    // Amit ruling 2026-10-25 via Jorje: full bagrut assumed when grades entered
    [86, undefined, undefined, 'accepted', 'exact'],
    // Amit ruling 2026-10-25 via Jorje: full bagrut assumed when grades entered
    [80, 560, 115, 'accepted', 'exact'],
    // Amit ruling 2026-10-25 via Jorje: full bagrut assumed when grades entered
    [85, undefined, undefined, 'accepted', 'exact'],
    // Amit ruling 2026-10-25 via Jorje: full bagrut assumed when grades entered
    [80, 540, 110, 'accepted', 'exact'],
    // Amit ruling 2026-10-25 via Jorje: full bagrut assumed when grades entered
    [80, 520, undefined, 'below', 'exact'],
    // Amit ruling 2026-10-25 via Jorje: full bagrut assumed when grades entered
    [80, 560, 100, 'below', 'exact'],
    // Amit ruling 2026-10-25 via Jorje: full bagrut assumed when grades entered
    [80, 560, undefined, 'unknown', 'needs_input'],
  ] as const)(
    'economics average=%s psych=%s quant=%s returns %s/%s through dispatch',
    async (average, psychometric, quantitative, decision, kind) => {
      const report = await evaluateAdmissionsForProgram({
        input: {
          degreeId: 'colmgmt_economics',
          bagrut: 70,
          psychometric,
          extraInputs: {
            colmanBagrutAverage: average,
            psychometricMath: quantitative,
            colmanBagrutCertificateConfirmed: true,
          },
        },
        program: getStaticCataloguePrograms().find(
          (program) => program.id === 'colmgmt_economics',
        )!,
        institutions: getStaticCatalogueInstitutions(),
        freshnessStatesBySourceId: new Map(),
      });
      const result = report.results.find((result) => result.linkedInstitutionId === 'colman')!;
      expect(result).toMatchObject({ decision, kind });
      if (average === undefined) {
        expect(result.estimated).toBe(true);
        expect(psychometric).toBeLessThan(540);
        expect(result.explanation).toContain('פסיכומטרי 540');
      }
      expect(result.explanation).not.toContain('לא מפרסמת את הציון המשוקלל');
      if (decision === 'below') expect(result.nextAction).toContain('מכינת שחקים');
      if (kind === 'needs_input')
        expect(result.requiredInputs).toEqual([
          average === undefined ? 'colman_bagrut_average' : 'psychometric_math',
        ]);
      expect(result.officialUrls).toContain(official['colmgmt_economics:colman'].programUrl);
    },
  );
});
