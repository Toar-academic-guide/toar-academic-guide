import { describe, expect, it } from 'vitest';
import { getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { mondayAdmissionsEvidence } from './mondayEvidence';

// Only student-facing qualifications/codes; institutional evidence prose is not allowed.
const allowedLatin =
  /\b(?:UX|UI|SAT|ACT|TOEFL|IELTS|AMIR|AMIRAM|CS|BSc|BSC|BA|BFA|BEd|LLB|MBA|MSc|MA|PhD|GPA|GMAT|GRE|IB|AP|MOOC|MOOCs|ECTS|B2|C1|C2)\b/gi;
function developerProse(text: string) {
  const clean = text
    .replace(/\bSOC Analyst\b/g, '')
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(allowedLatin, '')
    .replace(/\b[A-Z]{1,5}[-/]?\d+[A-Z]?\b/g, '');
  return /[a-z]{2,}(?:[\s_/-]+[a-z]{2,})+/i.test(clean);
}

const programs = getStaticCataloguePrograms();
describe('public catalogue admission copy', () => {
  it('contains no English developer prose in any normalized public admission text', () => {
    const offenders: { id: string; field: string; text: string }[] = [];
    for (const program of programs) {
      const fields: [string, readonly string[]][] = [
        ['admissionRequirements', program.admissionRequirements],
      ];
      for (const [index, detail] of (program.institutionDetails ?? []).entries()) {
        fields.push(
          [`details[${index}].specificAdmissionNotes`, detail.specificAdmissionNotes],
          [
            `details[${index}].admissionFacts`,
            (detail.admissionFacts ?? []).flatMap((fact) => [
              fact.description,
              fact.valueText ?? '',
            ]),
          ],
          [
            `details[${index}].admissionAlternativePaths`,
            (detail.admissionAlternativePaths ?? []).flatMap((path) => [
              path.title,
              path.description,
            ]),
          ],
        );
      }
      for (const [field, texts] of fields)
        for (const text of texts)
          if (developerProse(text)) offenders.push({ id: program.id, field, text });
    }
    expect(offenders).toEqual([]);
  });

  it.each(['braude_engineering', 'braude_prep'])(
    '%s uses Hebrew requirements and keeps evidence internal',
    (id) => {
      const program = programs.find((p) => p.id === id)!;
      const detail = program.institutionDetails![0];
      expect(detail.specificAdmissionNotes.join(' ')).toMatch(/[א-ת]/);
      expect(detail.specificAdmissionNotes.some(developerProse)).toBe(false);
      expect(detail.programDescription).toBeUndefined();
      expect(detail.officialCalculatorUrl).toMatch(/^https:\/\/w3\.braude\.ac\.il\//);
      const evidence = mondayAdmissionsEvidence.find((r) => r.itemId === '12220708942')!;
      expect(evidence.limitations.join(' ')).toContain('institution cannot be collapsed');
    },
  );

  it('uses the canonical Ort Braude name in every static Braude programme title and institution name', () => {
    const braude = programs.filter((p) => p.linkedInstitutionIds.includes('braude'));
    expect(braude.map((p) => p.id)).toEqual(
      expect.arrayContaining(['braude_engineering', 'braude_prep']),
    );
    const fields = braude.flatMap((p) => [
      p.name,
      p.institution,
      ...(p.institutionDetails ?? []).map((d) => d.institutionName),
    ]);
    expect(fields.filter((text) => /בראודה/.test(text) && !/אורט בראודה/.test(text))).toEqual([]);
  });
});
