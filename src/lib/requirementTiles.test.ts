import { describe, expect, it } from 'vitest';
import { buildCatalogueSeed } from '@/db/seeds/catalogueSeed';
import { serializeProgramRow } from '@/server/catalogue/serializers';
import type {
  ProgramRow,
  ProgramInstitutionRow,
  AdmissionRequirementRow,
  AdmissionThresholdRow,
  SourceUrlRow,
  InstitutionRow,
} from '@/db/types';
import { getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { catalogueAdmissionRequirements } from '@/lib/catalogueDisplayText';
import { INSTITUTION_BY_NAME, INSTITUTION_BY_ID, type InstitutionId } from '@/data/institutions';
import repair from '@/data/admissions/catalogueContentRepair.json';
import official from '../../docs/admissions-verification/2026-10-22-official-requirements-4.json';
import { selectRequirementTiles } from './requirementTiles';

const programs = getStaticCataloguePrograms();
const now = new Date('2026-10-23T12:00:00Z');
function select(id: string, institutionId: string) {
  const program = programs.find((p) => p.id === id)!;
  const detail = program.institutionDetails?.find(
    (d) => d.institutionName === INSTITUTION_BY_ID[institutionId as InstitutionId]?.name,
  );
  return selectRequirementTiles({
    program,
    institutionId,
    requirements: catalogueAdmissionRequirements(
      detail?.specificAdmissionNotes,
      program.admissionRequirements,
      id,
    ),
    now,
  });
}

describe('verified requirement tiles', () => {
  it.each(['afeka_ee', 'afeka_softwareeng'])(
    'keeps %s alternative unit-and-score routes in the full requirements',
    (id) => {
      const program = programs.find((row) => row.id === id)!;
      const requirements = catalogueAdmissionRequirements(
        program.institutionDetails![0].specificAdmissionNotes,
        program.admissionRequirements,
        id,
      );
      expect(requirements).toEqual(program.admissionRequirements);
      expect(requirements.join(' ')).toContain('כמותי 115 לפחות');
      expect(requirements.join(' ')).not.toMatch(/ממוצע בגרות מינימלי|ציון פסיכומטרי מינימלי|550/);
      expect(
        selectRequirementTiles({
          program,
          institutionId: 'afeka',
          requirements,
          now: new Date('2026-10-24T12:00:00Z'),
        }),
      ).toEqual({ reason: 'insufficient_structured_data' });
    },
  );

  it('keeps Haifa psychology composite and separate-track conditions in the full copy', () => {
    const program = programs.find((row) => row.id === 'haifa_psychology')!;
    const requirements = catalogueAdmissionRequirements(
      program.institutionDetails![0].specificAdmissionNotes,
      program.admissionRequirements,
      program.id,
    );
    expect(requirements[0]).toBe('סכם 650 לפחות; ציונים 630–649 נמצאים בטווח ההמתנה.');
    expect(requirements[2]).toMatch(/פסיפס \(מסלול נפרד.*סכם 680/);
    expect(requirements.join(' ')).not.toMatch(/פסיכומטרי מינימלי|בגרות מינימלי/);
    expect(
      selectRequirementTiles({
        program,
        institutionId: 'haifa',
        requirements,
        now: new Date('2026-10-24T12:00:00Z'),
      }),
    ).toEqual({ reason: 'unclear_semantics' });
  });

  it.each([
    ['law', 112],
    ['biu_law', 112],
    ['criminology', 98],
    ['biu_criminology', 98],
    ['biu_lifesciences', 108],
    ['biu_biotech', 108],
    ['biu_computational_bio', 112],
  ])('keeps %s BIU route gates in the full copy without inventing composite tiles', (id, floor) => {
    const program = programs.find((p) => p.id === id)!;
    const detail = program.institutionDetails!.find(
      (d) => d.institutionName === INSTITUTION_BY_ID.biu.name,
    )!;
    const requirements = catalogueAdmissionRequirements(
      detail.specificAdmissionNotes,
      program.admissionRequirements,
      id,
    );
    expect(requirements.join(' ')).toContain(`ממוצע בגרות ${floor} לפחות`);
    expect(requirements.join(' ')).toContain('סיווג אנגלית 85 לפחות');
    expect(select(id, 'biu')).toEqual({ reason: 'unclear_semantics' });
  });

  it('uses alternatives only for explicit routes and keeps cumulative gates together', () => {
    expect(select('education', 'bgu').model?.semantics).toBe('alternatives');
    expect(select('physiotherapy', 'bgu').model?.semantics).toBe('cumulative');
    expect(select('tau_law', 'tau').model).toBeUndefined();
  });

  it('states the BGU double-major scope once and uses the official English level as the chip', () => {
    const model = select('communication', 'bgu').model!;
    expect(model.scope).toBe('מסלול דו־מחלקתי');
    expect(model.chips).toEqual(['אנגלית ברמת בסיסי']);
    expect(model.tiles.flatMap((tile) => tile.qualifiers)).toEqual(['ללא פסיכומטרי']);
    expect(model.status).toBeUndefined();
  });

  it('shows the official closed-registration clause for physiotherapy', () => {
    const model = select('physiotherapy', 'bgu').model!;
    expect(model.status).toBe('במחזור תשפ״ז ההרשמה נסגרה');
    expect(model.details.some((text) => text.startsWith(`${model.status}:`))).toBe(true);
  });

  it.each(Object.values(official))('matches $program approved override thresholds', (value) => {
    const model = select(value.program, value.institution).model!;
    expect(model).toBeDefined();
    const expected: Record<string, (number | string)[]> = {
      tlvyaffo_cs: [630, 670, 102],
      colmgmt_law: [100, 540, 80],
      colmgmt_business: [85, 555],
      colmgmt_cs: [85, 'המכללה מחליטה'],
    };
    expect(model.tiles.map((t) => t.value)).toEqual(expected[value.program]);
    for (const number of JSON.stringify(model.tiles).match(/\d+(?:\.\d+)?/g) ?? [])
      expect([...value.reqs, ...value.notes].join(' ').match(/\d+(?:\.\d+)?/g)).toContain(number);
  });

  it('cross-checks every tiled catalogue source, not just the overrides', () => {
    const seed = buildCatalogueSeed();
    const seededPrograms = seed.programs.map((program) =>
      serializeProgramRow({
        program: program as ProgramRow,
        relations: seed.programInstitutions.filter(
          (r) => r.programId === program.id,
        ) as ProgramInstitutionRow[],
        requirements: seed.admissionRequirements.filter(
          (r) => r.programId === program.id,
        ) as AdmissionRequirementRow[],
        thresholds: seed.admissionThresholds.filter(
          (r) => r.programId === program.id,
        ) as AdmissionThresholdRow[],
        sourceUrls: seed.sourceUrls as SourceUrlRow[],
        institutionsById: new Map(seed.institutions.map((i) => [i.id, i as InstitutionRow])),
      }),
    );
    let tiled = 0;
    for (const program of seededPrograms)
      for (const institutionId of new Set([
        ...program.linkedInstitutionIds,
        ...(program.institutionDetails ?? []).flatMap(
          (d) => INSTITUTION_BY_NAME[d.institutionName]?.id ?? [],
        ),
      ])) {
        const detail = program.institutionDetails?.find(
          (d) => d.institutionName === INSTITUTION_BY_ID[institutionId as InstitutionId]?.name,
        );
        const result = selectRequirementTiles({
          program,
          institutionId,
          requirements: catalogueAdmissionRequirements(
            detail?.specificAdmissionNotes,
            program.admissionRequirements,
            program.id,
          ),
          now,
        });
        const approved = Object.values(official).some(
          (r) => r.program === program.id && r.institution === institutionId,
        );
        const reviewed = repair.requirements.find(
          (r) => r.programId === program.id && r.institutionId === institutionId,
        );
        if (!approved && reviewed?.coverage !== 'published_conditions')
          expect(result.model, `${program.id}:${institutionId} is not verified`).toBeUndefined();
        if (!result.model) continue;
        tiled++;
        const numbers =
          [...program.admissionRequirements, ...(detail?.specificAdmissionNotes ?? [])]
            .join(' ')
            .match(/\d+(?:\.\d+)?/g) ?? [];
        for (const number of JSON.stringify({
          tiles: result.model.tiles,
          chips: result.model.chips,
        }).match(/\d+(?:\.\d+)?/g) ?? [])
          expect(numbers, `${program.id}:${institutionId} number ${number}`).toContain(number);
      }
    expect(tiled).toBeGreaterThan(4);
  });

  it('rejects every incomplete record, changed source, old verification and unlisted program', () => {
    for (const row of repair.requirements.filter(
      (r) => r.coverage === 'incomplete_published_requirements',
    )) {
      const program = programs.find((p) => p.id === row.programId) ?? {
        ...programs[0],
        id: row.programId,
      };
      expect(
        selectRequirementTiles({
          program,
          institutionId: row.institutionId,
          requirements: row.notes,
          now,
        }).model,
      ).toBeUndefined();
    }
    const program = programs.find((p) => p.id === 'colmgmt_law')!;
    for (const args of [
      { program: { ...program, isListed: false }, requirements: program.admissionRequirements },
      { program, requirements: ['בגרות 100'] },
      {
        program,
        requirements: catalogueAdmissionRequirements(
          program.institutionDetails?.[0].specificAdmissionNotes,
          program.admissionRequirements,
          program.id,
        ),
        now: new Date('2027-10-23'),
      },
    ])
      expect(
        selectRequirementTiles({ institutionId: 'colman', now, ...args }).model,
      ).toBeUndefined();
    for (const verificationIssue of [
      'stale',
      'unverified',
      'placeholder',
      'incomplete_published_requirements',
    ])
      expect(
        selectRequirementTiles({
          program,
          institutionId: 'colman',
          requirements: catalogueAdmissionRequirements(
            program.institutionDetails?.[0].specificAdmissionNotes,
            program.admissionRequirements,
            program.id,
          ),
          now,
          verificationIssue,
        }).model,
      ).toBeUndefined();
    expect(select('cs', 'tau').model).toBeUndefined();
  });
});
