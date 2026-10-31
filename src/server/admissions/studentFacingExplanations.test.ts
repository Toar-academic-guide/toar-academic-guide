import { describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import * as evidence from '@/data/admissions/mondayEvidence';
import { admissionsSourceTargets } from '@/server/ingestion/admissionsSourceRegistry';
import * as matrix from './capabilityMatrix';
import { evaluateAdmissionsForProgram } from './evaluator';

vi.mock('server-only', () => ({}));
vi.mock('@/db/client', () => ({
  getDb() {
    throw new Error('Student copy guard must not access a database');
  },
}));

const programs = getStaticCataloguePrograms();
const institutions = getStaticCatalogueInstitutions();
const openProgram = programs.find((program) => program.id === 'open_university_cs')!;
const openEvidence = evidence.mondayAdmissionsEvidence.find(
  (record) => record.itemId === '12220699690',
)!;
const approvedCopy =
  'באוניברסיטה הפתוחה הקבלה לתואר ראשון פתוחה לכולם: אין צורך בציון פסיכומטרי או בתעודת בגרות מלאה כדי להתחיל ללמוד. אם אתם מתחת לגיל 18 או עדיין בתיכון, יש תהליך קבלה נפרד.';
const openDefault = 'מוסד זה מציע אפיק קבלה פתוחה ללא צורך בציון פסיכומטרי או ממוצע בגרות מינימלי.';
const profiles = [{ psychometric: 650, bagrut: 100 }, { psychometric: 500, bagrut: 80 }, {}];

function evaluate(program = openProgram, profile = profiles[0]) {
  return evaluateAdmissionsForProgram({
    program,
    institutions,
    input: { degreeId: program.id, ...profile },
    now: new Date('2026-10-30T12:00:00Z'),
    freshnessStatesBySourceId: new Map(),
    fetcher: vi.fn<typeof fetch>().mockRejectedValue(new Error('Offline student copy guard')),
  });
}

function useEntry(entry: Omit<matrix.AdmissionsCapabilityEntry, 'institutionId'>) {
  vi.spyOn(matrix, 'buildAdmissionsCapabilityMatrix').mockReturnValue([
    { institutionId: 'open_university', ...entry },
  ]);
}

describe('student-facing evaluator explanations', () => {
  it.each(profiles)(
    'keeps internal ids out of tracked-missing-rule explanations: %j',
    async (profile) => {
      const trackedPrograms = new Set<string>();
      for (const program of programs) {
        const report = await evaluate(program, profile);
        for (const result of report.results) {
          if (result.kind !== 'tracked_missing_rule') continue;
          trackedPrograms.add(program.id);
          expect(result.explanation, program.id).not.toMatch(/[a-z_]/i);
          expect(result.explanation, program.id).not.toContain('מקור העבודה');
          if (program.id === 'ariel_engineering') {
            expect(result.explanation).toBe('עדיין חסר כלל רשמי כדי לתת החלטת קבלה.');
          }
        }
      }
      expect(trackedPrograms.has('ariel_engineering')).toBe(true);
    },
  );

  it.each([true, false])(
    'keeps the tracked fallback generic with evidence present: %s',
    async (withEvidence) => {
      const trackedEvidence = withEvidence
        ? {
            ...openEvidence,
            itemName: '8. Internal evidence item',
            missingData: ['synthetic_missing_official_rule'],
          }
        : undefined;
      useEntry({ capability: 'tracked_missing_rule', evidence: trackedEvidence });
      const result = (await evaluate()).results[0];
      expect(result.kind).toBe('tracked_missing_rule');
      expect(result.explanation).not.toMatch(/[a-z_]/i);
      expect(result.explanation).not.toContain('מקור העבודה');
      expect(result.explanation).toBe('עדיין חסר כלל רשמי כדי לתת החלטת קבלה.');
      expect(result).toMatchObject({
        decision: 'unknown',
        confidence: trackedEvidence?.confidence ?? 'medium',
        sourceLabel: 'חסר כלל רשמי ממופה',
        nextAction: 'צריך להשלים אימות רשמי לפני שנציג קבלה או דחייה.',
        evidenceItemId: trackedEvidence?.itemId,
        evidenceItemName: trackedEvidence?.itemName,
        missingData: trackedEvidence?.missingData ?? ['official_rule'],
        officialUrls: trackedEvidence?.officialUrls ?? [],
      });
    },
  );

  it.each(profiles)(
    'has no Latin-only student fields across the entire static catalogue: %j',
    async (profile) => {
      const offenders: { programId: string; institutionId: string; field: string; text: string }[] =
        [];
      for (const program of programs) {
        const report = await evaluate(program, profile);
        expect(report.results.length, program.id).toBeGreaterThan(0);
        for (const result of report.results) {
          // Registry blockedReason is exposed as explanation, never as a separate result field.
          for (const field of ['explanation', 'nextAction', 'sourceLabel'] as const) {
            const text = result[field];
            if (text && /[a-z]/i.test(text) && !/[א-ת]/.test(text)) {
              offenders.push({
                programId: program.id,
                institutionId: result.linkedInstitutionId,
                field,
                text,
              });
            }
          }
        }
      }
      expect(offenders).toEqual([]);
    },
  );

  it.each(['open_university_cs', 'open_university_engineering', 'open_university_certificate'])(
    '%s uses the approved explanation for every profile without changing admission',
    async (programId) => {
      const program = programs.find((candidate) => candidate.id === programId)!;
      for (const profile of profiles) {
        const report = await evaluate(program, profile);
        expect(report.results).toContainEqual(
          expect.objectContaining({
            linkedInstitutionId: 'open_university',
            explanation: approvedCopy,
            capability: 'open_admission',
            kind: 'open_admission',
            decision: 'accepted',
          }),
        );
      }
    },
  );

  it.each(['Internal evidence without reviewed student copy.', 'הערת עבודה פנימית'])(
    'uses the Hebrew default for unreviewed evidence, including institution fallback: %s',
    async (decisionReason) => {
      useEntry({ capability: 'open_admission' });
      vi.spyOn(evidence, 'getMondayAdmissionEvidenceByCatalogueInstitutionId').mockReturnValue([
        { ...openEvidence, itemId: 'unreviewed', decisionReason },
      ]);
      expect((await evaluate()).results[0].explanation).toBe(openDefault);
    },
  );

  it.each(['biu-browser-required', 'ariel-browser-required'])(
    'fails closed for registry blockedReason and nextAction: %s',
    async (targetId) => {
      useEntry({
        capability: 'blocked',
        sourceTarget: admissionsSourceTargets.find((target) => target.id === targetId)!,
      });
      expect((await evaluate()).results[0]).toMatchObject({
        capability: 'blocked',
        kind: 'unsupported',
        decision: 'unknown',
        explanation: 'המקור הרשמי דורש בדיקה ידנית באתר המוסד.',
        nextAction: 'בדקו ישירות באתר המוסד.',
      });
    },
  );

  it('fails closed for tracked evidence and registry next actions', async () => {
    const ariel = evidence.mondayAdmissionsEvidence.find(
      (record) => record.itemId === '12220680983',
    )!;
    const sourceTarget = admissionsSourceTargets.find(
      (target) => target.id === 'ariel-browser-required',
    )!;
    const program = programs.find((candidate) => candidate.id === 'ariel_engineering')!;
    expect(program.linkedInstitutionIds).toEqual(['ariel']);
    vi.spyOn(matrix, 'buildAdmissionsCapabilityMatrix').mockReturnValue([
      { institutionId: 'ariel', capability: 'tracked_missing_rule', evidence: ariel, sourceTarget },
    ]);
    expect((await evaluate(program)).results[0].nextAction).toBe(
      'בדקו את תנאי הקבלה ישירות באתר של אוניברסיטת אריאל.',
    );
  });

  it('uses the generic fallback for a non-Ariel tracked rule without Hebrew next actions', async () => {
    useEntry({
      capability: 'tracked_missing_rule',
      evidence: { ...openEvidence, nextAction: 'Internal next action.' },
      sourceTarget: {
        ...admissionsSourceTargets.find((target) => target.id === 'ariel-browser-required')!,
        nextAction: 'Internal registry next action.',
      },
    });
    const result = (await evaluate()).results[0];
    expect(result.linkedInstitutionId).toBe('open_university');
    expect(result.nextAction).toBe('צריך להשלים אימות רשמי לפני שנציג קבלה או דחייה.');
    expect(result.nextAction).not.toContain('אריאל');
  });

  it('retains Hebrew registry copy and can use it after an English evidence next action', async () => {
    const sourceTarget = {
      ...admissionsSourceTargets.find((target) => target.id === 'ariel-browser-required')!,
      blockedReason: 'נדרש אימות ידני מול המוסד.',
      nextAction: 'בדקו ישירות באתר המוסד.',
    };
    useEntry({ capability: 'blocked', sourceTarget });
    expect((await evaluate()).results[0]).toMatchObject({
      explanation: sourceTarget.blockedReason,
      nextAction: sourceTarget.nextAction,
    });
    useEntry({
      capability: 'tracked_missing_rule',
      evidence: { ...openEvidence, nextAction: 'Internal next action.' },
      sourceTarget,
    });
    expect((await evaluate()).results[0].nextAction).toBe(sourceTarget.nextAction);
  });
});
