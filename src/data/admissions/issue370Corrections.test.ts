import { describe, expect, it } from 'vitest';
import { allPrograms, programsWithLegacyAdmissionFacts } from '@/data/degrees';
import { getRequirementsChecked } from '@/lib/requirementsChecked';
import { applyCatalogueContentRepair } from './catalogueContentRepair';
import { ISSUE_370_CORRECTIONS, ISSUE_370_HIDDEN_PROGRAM_IDS } from './issue370Corrections';
import { INSTITUTION_BY_ID, type InstitutionId } from '@/data/institutions';

const programmes = new Map(allPrograms.map((program) => [program.id, program]));
const notesFor = (programId: string, institutionId: string) => {
  const program = programmes.get(programId)!;
  const institutionName = INSTITUTION_BY_ID[institutionId as InstitutionId].name;
  return program.institutionDetails?.find((detail) => detail.institutionName === institutionName)
    ?.specificAdmissionNotes;
};

describe('issue 370 source corrections', () => {
  it('removes the unsupported legacy minimum pairs from all sixteen programme IDs and eight hubs', () => {
    const ids = [
      'colmgmt_accounting',
      'colmgmt_infosystems',
      'haifa_biology',
      'haifa_economics',
      'haifa_law',
      'haifa_socialwork',
      'hit_visual_comm',
      'ono_business',
      'ono_cs',
      'ono_socialwork',
      'telhai_biology',
      'telhai_cs',
      'telhai_nursing',
      'telhai_socialwork',
      'tlvyaffo_economics',
      'tlvyaffo_socialwork',
    ];
    expect(ids).toHaveLength(16);
    for (const id of ids) {
      const program = programmes.get(id);
      if (
        ISSUE_370_HIDDEN_PROGRAM_IDS.includes(id as (typeof ISSUE_370_HIDDEN_PROGRAM_IDS)[number])
      ) {
        expect(program?.isListed).not.toBe(true);
        continue;
      }
      expect(program, id).toBeDefined();
      const text = [
        ...(program?.admissionRequirements ?? []),
        ...(program?.institutionDetails?.flatMap((detail) => detail.specificAdmissionNotes) ?? []),
      ].join(' ');
      expect(text, id).not.toMatch(/ציון פסיכומטרי מינימלי|ממוצע בגרות מינימלי/);
    }
    for (const id of [
      'law',
      'economics',
      'cs',
      'social_work',
      'biology',
      'accounting',
      'business',
      'nursing',
    ]) {
      const text =
        programmes
          .get(id)
          ?.institutionDetails?.flatMap((detail) => detail.specificAdmissionNotes)
          .join(' ') ?? '';
      expect(text, id).not.toMatch(/ציון פסיכומטרי מינימלי|ממוצע בגרות מינימלי/);
    }
    expect(notesFor('haifa_socialwork', 'haifa')?.[0]).toContain('סכם 615');
    expect(notesFor('social_work', 'haifa')).toEqual(notesFor('haifa_socialwork', 'haifa'));
  });

  it('repairs stale database-like notes and numeric facts without changing the main sekhem', () => {
    const before = programsWithLegacyAdmissionFacts.find(
      (program) => program.id === 'haifa_socialwork',
    )!;
    const repaired = applyCatalogueContentRepair(before);
    expect(repaired.thresholds?.haifa).toBe(615);
    expect(repaired.institutionDetails?.[0]?.specificAdmissionNotes?.[0]).toContain('סכם 615');
    expect(
      repaired.institutionDetails?.[0]?.admissionFacts?.some(
        (fact) => fact.kind === 'numeric_gate',
      ),
    ).toBe(false);
  });

  it('keeps identity-mismatched link-only rows free of stale admission facts', () => {
    for (const id of ['telhai_biology', 'telhai_cs', 'telhai_socialwork', 'tlvyaffo_economics']) {
      expect(programmes.get(id)?.institutionDetails?.[0]?.admissionFacts ?? [], id).toEqual([]);
    }
  });

  it('keeps each corrected claim attached to the matching official source and check date', () => {
    for (const row of ISSUE_370_CORRECTIONS) {
      if (!programmes.has(row.programId)) continue;
      const notes = notesFor(row.programId, row.institutionId);
      expect(notes, row.programId).toEqual(row.notes);
      expect(
        getRequirementsChecked(row.programId, { id: row.institutionId as InstitutionId }, notes),
      ).toMatchObject({
        date: row.checkedAt.split('-').reverse().join('.'),
      });
    }
  });

  it('labels TAU semester cuts and keeps the Reichman bagrut route separate', () => {
    expect(notesFor('tau_cs', 'tau')?.[0]).toContain('בסמסטר ב׳ תשפ״ז');
    expect(notesFor('tau_cs', 'tau')?.[0]).toContain('705; סף דחייה 695');
    expect(notesFor('tau_ee', 'tau')?.[0]).toContain('725; סף דחייה 695');
    expect(notesFor('tau_economics', 'tau')?.[0]).toContain('610; סף דחייה 609');
    expect(notesFor('reichman_cs', 'reichman')?.[1]).toContain('ממוצע 104');
    expect(notesFor('reichman_cs', 'reichman')?.[1]).toContain('מתמטיקה 5 יחידות בציון 75');
    expect(notesFor('cs', 'reichman')).toEqual(notesFor('reichman_cs', 'reichman'));
  });

  it('shows HUJI bagrut-only figures on the official scale without an invented year', () => {
    for (const [id, average] of [
      ['huji_psychology', 113],
      ['huji_cs', 114],
      ['huji_economics', 110],
      ['huji_law', 113],
      ['huji_accounting', 110],
      ['huji_business', 110],
    ] as const) {
      const line = notesFor(id, 'huji')?.find((note) => note.startsWith('ללא פסיכומטרי:'));
      expect(line, id).toContain(`ממוצע בגרות ${average}`);
      expect(line, id).not.toMatch(/תשפ״[זח]/);
    }
    expect(notesFor('huji_datascience', 'huji')?.join(' ')).not.toMatch(/106\.5|110/);
  });

  it('removes medicine template claims and disputed screening details', () => {
    for (const [id, institutionId] of [
      ['huji_medicine', 'huji'],
      ['technion_medicine', 'technion'],
      ['tau_medicine', 'tau'],
      ['bgu_medicine', 'bgu'],
      ['biu_medicine', 'biu'],
    ]) {
      const text = notesFor(id, institutionId)?.join(' ') ?? '';
      expect(text, id).not.toMatch(
        /יתרון גדול|מומלץ מאוד|ממוצע בגרות ≥ 100|ראיון אישי לאחר מיון ראשוני/,
      );
      expect(
        getRequirementsChecked(
          id,
          { id: institutionId as InstitutionId },
          notesFor(id, institutionId),
        ),
      ).toMatchObject({
        date: '17.11.2026',
      });
    }
    expect(notesFor('biu_medicine', 'biu')?.[0]).toMatch(/680.*101.*120/);
    expect(notesFor('bgu_medicine', 'bgu')?.join(' ')).not.toMatch(/735|680/);
    expect(programmes.get('biu_medicine')?.institutionDetails?.[0]?.admissionFacts).toEqual([]);
  });
});
