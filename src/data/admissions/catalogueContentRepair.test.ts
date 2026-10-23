import { allPrograms, programsWithLegacyAdmissionFacts } from '@/data/degrees';
import type { Program } from '@/data/degrees/types';
import { buildCatalogueSeed } from '@/db/seeds/catalogueSeed';
import { getRequirementsChecked } from '@/lib/requirementsChecked';
import { applyCatalogueContentRepair } from './catalogueContentRepair';
import repair from './catalogueContentRepair.json';

describe('verified catalogue content repair', () => {
  it.each([
    [
      'ono_law',
      'ono',
      'https://www.ono.ac.il/curriculum/llb/',
      '2ea5e02446f90bb3c34fd480df1b11084bdd1b45133cebc8941c7f98d2888e8e',
      6,
    ],
    [
      'colmgmt_cs',
      'colman',
      'https://www.colman.ac.il/academics/ba/b-a-admission/',
      '084c3ba35a4be7290448cd627a5db52a2d2ae0a50ea72d1017208eaadb4e3637',
      1,
    ],
  ] as const)(
    'stamps %s without changing its existing catalogue content',
    (id, institutionId, sourceUrl, sourceSha256, noteCount) => {
      const before = programsWithLegacyAdmissionFacts.find((program) => program.id === id)!;
      const notes = before.institutionDetails![0].specificAdmissionNotes;
      const row = repair.requirements.find(
        (item) => item.programId === id && item.institutionId === institutionId,
      );
      expect(row).toMatchObject({
        checkedAt: '2026-10-23',
        sourceUrl,
        sourceSha256,
        coverage: 'published_conditions',
        notes,
      });
      expect(notes).toHaveLength(noteCount);
      expect(applyCatalogueContentRepair(before)).toEqual(before);
      expect(getRequirementsChecked(id, { id: institutionId }, notes)).toEqual({
        date: '23.10.2026',
        sourceUrl: `${sourceUrl}?utm_source=myway&utm_medium=referral`,
      });
      expect(
        getRequirementsChecked(
          id,
          { id: institutionId },
          notes.map((note) => `${note} `),
        ),
      ).toBeUndefined();
    },
  );

  it('re-encodes and stamps the regular Haifa psychology route', () => {
    const program = allPrograms.find((item) => item.id === 'haifa_psychology')!;
    const notes = program.institutionDetails![0].specificAdmissionNotes;
    expect(notes).toEqual([
      'סכם 650 לפחות; ציונים 630–649 נמצאים בטווח ההמתנה.',
      'נדרשת אנגלית ברמת טרום בסיסי לפחות ועברית 90 ביעלנט או במבחן הסיווג של האוניברסיטה, בקבלה על תנאי עד השלמה ל־120 בשנה א׳; אפשר גם להשלים קורס עברית באקדמיה במכינה.',
      'תוכנית פסיפס (מסלול נפרד עם החוג לפילוסופיה): סכם 680 לפחות + ראיון קבלה.',
    ]);
    expect(program.thresholds).toEqual({ haifa: 650 });
    expect(program.institutionDetails![0].admissionFacts ?? []).toEqual([]);
    expect(program.institutionDetails![0].admissionAlternativePaths ?? []).toEqual([]);
    expect(repair.requirements.find((row) => row.programId === program.id)).toMatchObject({
      institutionId: 'haifa',
      sourceUrl: 'https://admissions.haifa.ac.il/social-sciences/program/3268/',
      sourceSha256: 'ce3270195a0ee34608b949f6b2b698b69a4de9fcf80007721f99a915b2232476',
      checkedAt: '2026-10-24',
      coverage: 'published_conditions',
      notes,
    });
    expect(getRequirementsChecked(program.id, { id: 'haifa' }, notes)).toEqual({
      date: '24.10.2026',
      sourceUrl:
        'https://admissions.haifa.ac.il/social-sciences/program/3268/?utm_source=myway&utm_medium=referral',
    });
    expect(
      getRequirementsChecked(
        program.id,
        { id: 'haifa' },
        notes.map((note) => `${note} `),
      ),
    ).toBeUndefined();
  });

  it.each(['afeka_ee', 'afeka_softwareeng', 'hit_visual_comm'])(
    'keeps the packet HOLD program %s unstamped',
    (id) => {
      expect(repair.requirements.some((row) => row.programId === id)).toBe(false);
    },
  );

  it.each([
    ['law', 112, [/אנגלית 5 יחידות בציון 90 לפחות/]],
    ['biu_law', 112, [/אנגלית 5 יחידות בציון 90 לפחות/]],
    ['criminology', 98, [/דו־חוגי/, /תנאים של החוג הנוסף/]],
    ['biu_criminology', 98, [/דו־חוגי/, /תנאים של החוג הנוסף/]],
    [
      'biu_lifesciences',
      108,
      [
        /אחת משתי האפשרויות/,
        /מתמטיקה 5 יחידות בציון 85 לפחות/,
        /או מכפלת ציון המתמטיקה במספר היחידות של 320 לפחות ובנוסף שני מקצועות מדעיים שונים בהיקף 5 יחידות ובציון 80 לפחות בכל אחד/,
      ],
    ],
    [
      'biu_biotech',
      108,
      [
        /מכפלת ציון המתמטיקה במספר היחידות של 320 לפחות ובנוסף שני מקצועות מדעיים שונים בהיקף 5 יחידות ובציון 80 לפחות בכל אחד/,
      ],
    ],
    ['biu_computational_bio', 112, [/מתמטיקה 5 יחידות בציון 95 לפחות/]],
  ] as const)('publishes the תשפ״ז Bagrut-only contract for %s at BIU', (id, floor, gates) => {
    const row = repair.requirements.find(
      (item) => item.programId === id && item.institutionId === 'biu',
    )!;
    expect(row).toBeDefined();
    expect(row.checkedAt).toBe('2026-10-23');
    expect(row.sourceUrl).toBe(
      'https://www.biu.ac.il/registration-and-admission/information/acceptance-no-psychometry',
    );
    const program = allPrograms.find((item) => item.id === id)!;
    const notes = program.institutionDetails!.find((detail) =>
      detail.institutionName.includes('בר-אילן'),
    )!.specificAdmissionNotes;
    expect(notes).toEqual(row.notes);
    const text = notes.join(' ');
    expect(text).toContain(`לתשפ״ז, ללא פסיכומטרי: ממוצע בגרות ${floor} לפחות`);
    expect(text).toMatch(/זכאות לתעודת בגרות/);
    expect(text).toMatch(/סיווג אנגלית 85 לפחות/);
    expect(text).toMatch(/עברית 105 לפחות למי שנדרשים לבחינת יע״ל/);
    expect(text).toMatch(/משולב.*מחשבון הקבלה הרשמי של בר־אילן/);
    expect(text).not.toMatch(/720|סכם\s*\d|משולב\s*\d|משוקלל\s*\d/);
    for (const gate of gates) expect(text).toMatch(gate);
    if (id === 'biu_lifesciences' || id === 'biu_biotech') {
      expect(text).toContain('ביולוגיה, ביוטכנולוגיה, מתמטיקה, כימיה, פיזיקה, הנדסה ומדעי המחשב');
      expect(text).toContain('מתמטיקה יכולה להיחשב כאחד משני המקצועות');
    }
  });

  it('seeds researched pairs present in the static catalogue without changing their keys', () => {
    const seed = buildCatalogueSeed();
    const seededIds = new Set(seed.programs.map((row) => row.id));
    expect(
      new Set(repair.requirements.map((row) => `${row.programId}:${row.institutionId}`)).size,
    ).toBe(repair.requirements.length);
    for (const row of repair.requirements) {
      // Live-only legacy rows are repaired in SQL, not reintroduced into the seed catalogue.
      if (!seededIds.has(row.programId)) continue;
      const id = `${row.programId}:${row.institutionId}`;
      expect(
        seed.admissionRequirements.find((item) => item.id === id),
        id,
      ).toMatchObject({
        specificAdmissionNotes: row.notes,
      });
      expect(
        seed.sourceUrls.find((item) => item.id === `${id}:program`),
        id,
      ).toMatchObject({
        url: 'programUrl' in row ? row.programUrl : row.sourceUrl,
      });
    }
  });

  it('keeps institution conditions separate and preserves calculation inputs', () => {
    const program = allPrograms.find((item) => item.id === 'communication')!;
    const unchanged = { ...program, id: 'unrelated' };
    expect(applyCatalogueContentRepair(unchanged)).toBe(unchanged);
    const result = applyCatalogueContentRepair(program);
    expect(result.thresholds).toBe(program.thresholds);
    expect(result.minimumBagrut).toBe(program.minimumBagrut);
    expect(result.minimumPsychometric).toBe(program.minimumPsychometric);
    expect(result.admissionRequirements).toBe(program.admissionRequirements);
    for (const detail of result.institutionDetails!) {
      const original = program.institutionDetails!.find(
        (item) => item.institutionName === detail.institutionName,
      )!;
      expect(detail.admissionFacts).toBe(original.admissionFacts);
      expect(detail.admissionAlternativePaths).toBe(original.admissionAlternativePaths);
    }
    const tau = result.institutionDetails!.find((item) =>
      item.institutionName.includes('תל אביב'),
    )!;
    expect(tau.specificAdmissionNotes).not.toEqual(
      result.institutionDetails!.find((item) => item.institutionName.includes('חיפה'))!
        .specificAdmissionNotes,
    );
  });

  it('retains excluded IDs for saved links and corrects verified course identities', () => {
    const byId = new Map(allPrograms.map((program) => [program.id, program]));
    for (const row of repair.excludedPrograms) {
      // Some withdrawn legacy rows exist only in the database, never re-create them in seeds.
      const legacy = { ...allPrograms[0], id: row.programId };
      expect(applyCatalogueContentRepair(legacy)).toMatchObject({
        id: row.programId,
        isListed: false,
      });
    }
    for (const row of repair.requirements) {
      if (row.identity) {
        expect(['academic', 'certificate']).toContain(row.identity.type);
        const input = byId.get(row.programId) ?? { ...allPrograms[0], id: row.programId };
        expect(applyCatalogueContentRepair(input)).toMatchObject(row.identity);
      }
    }
    expect(byId.get('mon_12341122982_graphic_design')).toMatchObject({
      name: 'הכשרת דולות',
      category: 'ליווי לידה',
      type: 'certificate',
    });
  });

  it('preserves every existing numeric rule, fact and alternative path across the content overlay', () => {
    for (const before of programsWithLegacyAdmissionFacts) {
      const after = applyCatalogueContentRepair(before);
      expect(after.thresholds).toEqual(before.thresholds);
      expect(after.minimumBagrut).toBe(before.minimumBagrut);
      expect(after.minimumPsychometric).toBe(before.minimumPsychometric);
      expect(after.admissionRequirements).toEqual(before.admissionRequirements);
      for (const detail of before.institutionDetails ?? []) {
        const updated = after.institutionDetails!.find(
          (item) => item.institutionName === detail.institutionName,
        )!;
        expect(updated.admissionFacts).toEqual(detail.admissionFacts);
        expect(updated.admissionAlternativePaths).toEqual(detail.admissionAlternativePaths);
        expect(updated.quantitativeMinRequirement).toBe(detail.quantitativeMinRequirement);
        expect(updated.englishMinRequirement).toBe(detail.englishMinRequirement);
      }
    }
  });

  it('does not derive admission facts from newly added display text', () => {
    const original = allPrograms.find((program) => program.id === 'mon_12341134448_business')!;
    const facts: NonNullable<Program['institutionDetails']>[number]['admissionFacts'] = [];
    const input = {
      ...original,
      institutionDetails: original.institutionDetails!.map((detail) => ({
        ...detail,
        admissionFacts: facts,
      })),
    };
    expect(applyCatalogueContentRepair(input).institutionDetails![0].admissionFacts).toBe(facts);
  });
});
