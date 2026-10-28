import { describe, expect, it } from 'vitest';
import { getStaticCataloguePrograms, getStaticCatalogueInstitutions } from '@/lib/catalogueStatic';
import { applyCatalogueContentRepair } from './catalogueContentRepair';
import type { AdmissionFact } from '@/data/degrees/types';
import { normalizeEvaluationInputs } from '@/server/admissions/evaluationInputs';

const cases = [
  ['tau_me', 'tau', 75, 85],
  ['me', 'tau', 75, 85],
  ['tau_ee', 'tau', 80, 90],
  ['ee', 'tau', 80, 90],
  ['tau_industrial', 'tau', 75, 85],
  ['tau_cs', 'tau', 80, 88],
  ['cs', 'tau', 80, 88],
  ['tau_datascience', 'tau', 75, 85],
  ['datascience', 'tau', 75, 85],
  ...[
    'technion_cs',
    'technion_datascience',
    'technion_ee',
    'technion_me',
    'technion_civil',
    'technion_industrial',
    'technion_biomedical',
    'cs',
    'ee',
    'me',
    'datascience',
  ].map((id) => [id, 'technion', 70, undefined] as const),
] as const;
const institutions = getStaticCatalogueInstitutions();
function detailFor(id: string, institutionId: string) {
  const program = getStaticCataloguePrograms().find((p) => p.id === id)!;
  const name = institutions.find((i) => i.id === institutionId)!.name;
  return { program, detail: program.institutionDetails!.find((d) => d.institutionName === name)! };
}

describe('item 6 engineering mathematics alternatives', () => {
  it.each(cases)(
    '%s at %s publishes alternatives without an unconditional five-unit gate',
    (id, institutionId, fiveGrade, fourGrade) => {
      const { detail } = detailFor(id, institutionId);
      expect(detail).toBeDefined();
      const copy = detail.specificAdmissionNotes.join(' ');
      expect(copy).not.toMatch(/5 יח"ל מתמטיקה — חובה/);
      expect(copy).toContain(`5 יחידות בציון ${fiveGrade}`);
      expect(copy).toContain(fourGrade ? `4 יחידות בציון ${fourGrade}` : '4 יחידות');
      expect(copy).toContain('סיווג');
      if (institutionId === 'technion') expect(copy).toMatch(/סיווג(?: במתמטיקה)? בציון 70/);
      const math = (detail.admissionFacts ?? []).filter(
        (f) => f.field === 'math_units' || f.field === 'math_grade',
      );
      expect(math.length).toBeGreaterThan(0);
      expect(math.every((f) => f.groupKey?.startsWith('math_route/'))).toBe(true);
      expect(math.some((f) => f.field === 'math_units' && f.valueNumber === 4)).toBe(true);
      expect(detail.admissionFacts).toContainEqual(
        expect.objectContaining({
          kind: 'numeric_gate',
          field: 'math_grade',
          valueNumber: fiveGrade,
          groupKey: 'math_route/5_units',
        }),
      );
      expect(detail.admissionsSourceCandidates).toContainEqual(
        expect.objectContaining({
          confidence: 'high',
          title: 'תנאי מתמטיקה',
          url: expect.stringMatching(
            institutionId === 'tau'
              ? /go\.tau\.ac\.il/
              : /admissions\.technion\.ac\.il\/math-knowledge/,
          ),
        }),
      );
    },
  );

  it.each(['tau_me', 'technion_ee'])(
    '%s repairs stale persisted copy and facts while preserving non-maths requirements',
    (id) => {
      const institutionId = id.startsWith('tau_') ? 'tau' : 'technion';
      const { program, detail } = detailFor(id, institutionId);
      const physics: AdmissionFact = {
        id: 'persisted-physics',
        kind: 'numeric_gate',
        field: 'physics_units',
        comparison: 'gte',
        valueNumber: 5,
        valueText: null,
        unit: 'units',
        description: '5 יחידות פיזיקה',
        confidence: 'high',
        isRequired: true,
      };
      const stale: AdmissionFact = {
        ...physics,
        id: 'persisted-math',
        field: 'math_units',
        description: '5 יח"ל מתמטיקה — חובה',
      };
      const repaired = applyCatalogueContentRepair({
        ...program,
        institutionDetails: [
          {
            ...detail,
            specificAdmissionNotes: ['5 יח"ל מתמטיקה — חובה'],
            admissionFacts: [stale, physics],
          },
        ],
      });
      const result = repaired.institutionDetails![0];
      expect(result.specificAdmissionNotes.join(' ')).toContain('4 יחידות');
      expect(result.admissionFacts).not.toContainEqual(stale);
      expect(result.admissionFacts).toContainEqual(physics);
      expect(result.admissionFacts).toContainEqual(
        expect.objectContaining({ field: 'math_units', valueNumber: 4 }),
      );
    },
  );

  it('does not invent a numeric pass mark for TAU engineering classification exams', () => {
    for (const id of ['tau_me', 'tau_ee', 'tau_industrial', 'tau_datascience']) {
      const { detail } = detailFor(id, 'tau');
      expect(detail.admissionFacts!.find((fact) => fact.field === 'exam')).toMatchObject({
        valueNumber: null,
        valueText: 'מעבר בחינת סיווג במתמטיקה',
        unit: 'boolean',
      });
    }
  });

  it('derives missing ordinary maths fields from an engineering subject record without overwriting supplied fields', () => {
    const bagrutSubjectRecord = {
      schemaVersion: 1 as const,
      sector: 'jewish' as const,
      subjects: [{ subjectId: 'mathematics', units: 4, grade: 85 }],
    };
    expect(
      normalizeEvaluationInputs({ degreeId: 'technion_ee', extraInputs: { bagrutSubjectRecord } })
        .input.extraInputs,
    ).toMatchObject({ mathUnits: 4, mathGrade: 85 });
    expect(
      normalizeEvaluationInputs({
        degreeId: 'technion_ee',
        extraInputs: { bagrutSubjectRecord, mathUnits: 5, mathGrade: 90 },
      }).input.extraInputs,
    ).toMatchObject({ mathUnits: 5, mathGrade: 90 });
  });
});
