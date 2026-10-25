import { serializeInstitutionRow, serializeProgramRow } from '@/server/catalogue/serializers';
import { allPrograms } from '@/data/degrees';
import { buildCatalogueSeed } from '@/db/seeds/catalogueSeed';
import type {
  AdmissionAlternativePathRow,
  AdmissionFactRow,
  AdmissionThresholdRow,
  AdmissionRequirementRow,
  AdmissionsSourceCandidateRow,
  InstitutionRow,
  ProgramInstitutionRow,
  ProgramRow,
  UniversityCalculatorConfigRow,
  SourceUrlRow,
} from '@/db/types';

describe('catalogue serializers', () => {
  it.each(['ruppin_marine_bio', 'afeka_biomedical'])(
    'sweep38 repairs persisted %s requirements',
    (id) => {
      const seed = buildCatalogueSeed();
      const requirement = seed.admissionRequirements.find((row) => row.programId === id)!;
      const staleNotes =
        id === 'afeka_biomedical'
          ? ['ממוצע בגרות מינימלי: 80', 'ציון פסיכומטרי מינימלי: 530']
          : ['500 / 75'];
      const result = serializeProgramRow({
        program: {
          ...seed.programs.find((row) => row.id === id)!,
          name:
            id === 'ruppin_marine_bio'
              ? 'ביולוגיה ימית ומכמורת'
              : seed.programs.find((row) => row.id === id)!.name,
        } as ProgramRow,
        relations: seed.programInstitutions.filter(
          (row) => row.programId === id,
        ) as ProgramInstitutionRow[],
        requirements: [
          { ...requirement, admissionRequirements: staleNotes, specificAdmissionNotes: staleNotes },
        ] as AdmissionRequirementRow[],
        thresholds: [],
        sourceUrls: [],
        institutionsById: new Map(seed.institutions.map((row) => [row.id, row as InstitutionRow])),
      });
      const expected = allPrograms.find((row) => row.id === id)!;
      expect(result.institutionDetails![0].specificAdmissionNotes).toEqual(
        expected.institutionDetails![0].specificAdmissionNotes,
      );
      expect(result.name).toBe(expected.name);
      expect(result.id).toBe(id);
    },
  );

  it('sweep38 renames persisted marine science from the static official name', () => {
    const seed = buildCatalogueSeed();
    const result = serializeProgramRow({
      program: {
        ...seed.programs.find((row) => row.id === 'ruppin_marine_bio')!,
        name: 'ביולוגיה ימית ומכמורת',
      } as ProgramRow,
      relations: [],
      requirements: [],
      thresholds: [],
      sourceUrls: [],
      institutionsById: new Map(),
    });
    expect(result.name).toBe('מדעי הים והסביבה הימית');
  });

  it.each([
    ['haifa_cs', 'https://admissions.haifa.ac.il/computer-information-science/program/3210/'],
    ['haifa_law', 'https://admissions.haifa.ac.il/law/program/3000/'],
  ])(
    'replaces persisted broken official URLs for %s without changing admissions data',
    (id, programUrl) => {
      const seed = buildCatalogueSeed();
      const requirement = seed.admissionRequirements.find((row) => row.programId === id)!;
      const result = serializeProgramRow({
        program: seed.programs.find((row) => row.id === id)! as ProgramRow,
        relations: seed.programInstitutions.filter(
          (row) => row.programId === id,
        ) as ProgramInstitutionRow[],
        requirements: [requirement] as AdmissionRequirementRow[],
        thresholds: seed.admissionThresholds.filter(
          (row) => row.programId === id,
        ) as AdmissionThresholdRow[],
        sourceUrls: ['program', 'calculator'].map((kind) => ({
          id: `old-${kind}`,
          admissionRequirementId: requirement.id,
          kind,
          url: `https://www.haifa.ac.il/index.php/he/${kind}`,
        })) as SourceUrlRow[],
        institutionsById: new Map(seed.institutions.map((row) => [row.id, row as InstitutionRow])),
      });
      expect(result.institutionDetails![0]).toMatchObject({
        programUrl,
        calculatorUrl: 'https://admissions.haifa.ac.il/score-calculation/',
        officialCalculatorUrl: 'https://admissions.haifa.ac.il/score-calculation/',
        specificAdmissionNotes: requirement.specificAdmissionNotes,
      });
      expect(result.linkedInstitutionIds).toEqual(['haifa']);
      expect(result.thresholds).toEqual(
        allPrograms.find((program) => program.id === id)!.thresholds,
      );
    },
  );
  it('preserves database updated_at timestamps for sitemap provenance', () => {
    const seed = buildCatalogueSeed();
    const updatedAt = new Date('2026-10-23T12:34:56Z');
    const institution = serializeInstitutionRow({
      ...seed.institutions[0],
      updatedAt,
    } as InstitutionRow);
    const program = serializeProgramRow({
      program: { ...seed.programs[0], updatedAt } as ProgramRow,
      relations: [],
      requirements: [],
      thresholds: [],
      sourceUrls: [],
      institutionsById: new Map(),
    });
    expect(institution.updatedAt).toBe('2026-10-23T12:34:56.000Z');
    expect(program.updatedAt).toBe('2026-10-23T12:34:56.000Z');
  });

  it.each(['afeka_ee', 'afeka_softwareeng', 'afeka_cs'])(
    'repairs persisted %s shells, facts and thresholds after a successful database read',
    (id) => {
      const seed = buildCatalogueSeed();
      const requirement = seed.admissionRequirements.find((row) => row.programId === id)!;
      const staleNotes = ['ממוצע בגרות מינימלי: 80', 'ציון פסיכומטרי מינימלי: 550'];
      const result = serializeProgramRow({
        program: seed.programs.find((row) => row.id === id)! as ProgramRow,
        relations: seed.programInstitutions.filter(
          (row) => row.programId === id,
        ) as ProgramInstitutionRow[],
        requirements: [
          {
            ...requirement,
            admissionRequirements: staleNotes,
            specificAdmissionNotes: staleNotes,
            quantitativeMinRequirement: 550,
            englishMinRequirement: 60,
          },
        ] as AdmissionRequirementRow[],
        thresholds: ['sekhem', 'psychometric'].map((thresholdKind) => ({
          id: `${id}:${thresholdKind}`,
          programId: id,
          universityId: 'afeka',
          thresholdKind,
          thresholdValue: 550,
        })) as AdmissionThresholdRow[],
        sourceUrls: [],
        admissionFacts: [
          ['psychometric', 550],
          ['bagrut_average', 80],
          ['math_units', 5],
          ['physics_units', 5],
        ].map(([field, valueNumber]) => ({
          id: `${id}:${field}`,
          admissionRequirementId: requirement.id,
          kind: 'numeric_gate',
          field,
          valueNumber,
        })) as AdmissionFactRow[],
        admissionAlternativePaths: [
          {
            id: `${id}:prep`,
            admissionRequirementId: requirement.id,
            kind: 'prep_program',
            title: 'בדרך לאפקה',
            priority: 1,
          },
        ] as AdmissionAlternativePathRow[],
        institutionsById: new Map(seed.institutions.map((row) => [row.id, row as InstitutionRow])),
      });
      const expected = allPrograms.find((program) => program.id === id)!;
      expect(result.admissionRequirements).toEqual(expected.admissionRequirements);
      expect(result.institutionDetails![0]).toMatchObject({
        specificAdmissionNotes: expected.admissionRequirements,
        programUrl: expected.institutionDetails![0].programUrl,
        quantitativeMinRequirement: null,
        englishMinRequirement: null,
        admissionFacts: [],
        admissionAlternativePaths: [],
      });
      expect(result.thresholds).toBeUndefined();
      expect(result.directPsychometric).toBeUndefined();
      expect(result.minimumBagrut).toBeUndefined();
      expect(result.minimumPsychometric).toBeUndefined();
      expect(result.linkedInstitutionIds).toEqual(['afeka']);
    },
  );

  it('repairs persisted Haifa psychology floors without turning Pasifas into a main gate', () => {
    const seed = buildCatalogueSeed();
    const id = 'haifa_psychology';
    const requirement = seed.admissionRequirements.find((row) => row.programId === id)!;
    const result = serializeProgramRow({
      program: seed.programs.find((row) => row.id === id)! as ProgramRow,
      relations: seed.programInstitutions.filter(
        (row) => row.programId === id,
      ) as ProgramInstitutionRow[],
      requirements: [
        {
          ...requirement,
          specificAdmissionNotes: ['ציון פסיכומטרי מינימלי: 680', 'ממוצע בגרות מינימלי: 85'],
        },
      ] as AdmissionRequirementRow[],
      thresholds: [
        ...seed.admissionThresholds.filter((row) => row.programId === id),
        {
          id: 'legacy-direct',
          programId: id,
          universityId: 'haifa',
          thresholdKind: 'psychometric',
          thresholdValue: 680,
        },
      ] as AdmissionThresholdRow[],
      sourceUrls: [],
      admissionFacts: [
        {
          id: 'legacy-psych',
          admissionRequirementId: requirement.id,
          kind: 'numeric_gate',
          field: 'psychometric',
          valueNumber: 680,
        },
        {
          id: 'legacy-bagrut',
          admissionRequirementId: requirement.id,
          kind: 'numeric_gate',
          field: 'bagrut_average',
          valueNumber: 85,
        },
      ] as AdmissionFactRow[],
      institutionsById: new Map(seed.institutions.map((row) => [row.id, row as InstitutionRow])),
    });
    expect(result.institutionDetails![0].specificAdmissionNotes[0]).toBe(
      'סכם 650 לפחות; ציונים 630–649 נמצאים בטווח ההמתנה.',
    );
    expect(result.institutionDetails![0].specificAdmissionNotes[2]).toMatch(
      /פסיפס \(מסלול נפרד.*סכם 680.*ראיון/,
    );
    expect(result.institutionDetails![0].programUrl).toBe(
      'https://admissions.haifa.ac.il/social-sciences/program/3268/',
    );
    expect(result.institutionDetails![0].admissionFacts ?? []).toEqual([]);
    expect(result.thresholds).toEqual({ haifa: 650 });
    expect(result.directPsychometric).toBeUndefined();
    expect(result.minimumPsychometric).toBeUndefined();
    expect(result.minimumBagrut).toBeUndefined();
    expect(result.linkedInstitutionIds).toEqual(['haifa']);
  });

  it('presents the legacy Danon programme without repeating its subject', () => {
    const program = {
      id: 'danon_cs',
      name: 'קולינריה - דנון - קולינריה',
      institutionName: 'מכון דנון לבישול',
      institutionId: 'danon',
      type: 'certificate',
      category: 'קולינריה',
      riasecR: 1,
      riasecI: 1,
      riasecA: 1,
      riasecS: 1,
      riasecE: 1,
      riasecC: 1,
      admissionType: 'requirements',
      isTauEngineering: false,
    } as ProgramRow;
    const result = serializeProgramRow({
      program,
      relations: [],
      requirements: [],
      thresholds: [],
      sourceUrls: [],
      institutionsById: new Map(),
    });
    expect(result.name).toBe('קולינריה — דנון');
    expect(result.id).toBe('danon_cs');
  });
  it('preserves missing durationYears as null instead of coercing to zero', () => {
    const program = {
      id: 'test_program',
      name: 'תוכנית בדיקה',
      institutionName: 'אוניברסיטת בדיקה',
      institutionId: 'test_university',
      type: 'academic',
      category: 'בדיקה',
      riasecR: 1,
      riasecI: 1,
      riasecA: 1,
      riasecS: 1,
      riasecE: 1,
      riasecC: 1,
      admissionType: 'requirements',
      isTauEngineering: false,
    } as ProgramRow;

    const institution = {
      id: 'test_university',
      name: 'אוניברסיטת בדיקה',
      region: 'center',
      domain: null,
      logoUrl: null,
      programUrl: null,
      calculatorUrl: null,
      universityId: null,
    } as InstitutionRow;

    const requirement = {
      id: 'req_1',
      programId: 'test_program',
      institutionId: 'test_university',
      durationYears: null,
      estimatedStudentsPerYear: null,
      quantitativeMinRequirement: null,
      englishMinRequirement: null,
      specificAdmissionNotes: [],
      programDescription: null,
      admissionRequirements: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      reviewStatus: 'seeded' as const,
    } as AdmissionRequirementRow;

    const serialized = serializeProgramRow({
      program,
      relations: [
        { programId: 'test_program', institutionId: 'test_university' },
      ] as ProgramInstitutionRow[],
      requirements: [requirement],
      thresholds: [],
      sourceUrls: [],
      institutionsById: new Map([[institution.id, institution]]),
    });

    expect(serialized.institutionDetails?.[0]?.durationYears).toBeNull();
  });

  it('restores full eight-dimension profile scores from the static catalogue bridge', () => {
    const staticProgram = allPrograms.find(
      (program) => program.profileScore.DI > 0 || program.profileScore.ER > 0,
    );

    expect(staticProgram).toBeDefined();

    const program = {
      id: staticProgram!.id,
      name: staticProgram!.name,
      institutionName: staticProgram!.institution,
      institutionId: staticProgram!.institutionId ?? 'test_university',
      type: staticProgram!.type,
      category: staticProgram!.category,
      riasecR: 1,
      riasecI: 1,
      riasecA: 1,
      riasecS: 1,
      riasecE: 1,
      riasecC: 1,
      admissionType: staticProgram!.admissionType,
      isTauEngineering: false,
    } as ProgramRow;

    const serialized = serializeProgramRow({
      program,
      relations: [],
      requirements: [],
      thresholds: [],
      sourceUrls: [],
      institutionsById: new Map(),
    });

    expect(serialized.profileScore).toEqual(staticProgram!.profileScore);
  });

  it('serializes structured admissions facts, source context, and alternatives', () => {
    const program = {
      id: 'ono_nursing',
      name: 'סיעוד',
      institutionName: 'המכללה האקדמית אונו',
      institutionId: 'ono',
      type: 'academic',
      category: 'מדעי הבריאות',
      riasecR: 1,
      riasecI: 1,
      riasecA: 1,
      riasecS: 5,
      riasecE: 1,
      riasecC: 1,
      admissionType: 'requirements',
      isTauEngineering: false,
    } as ProgramRow;

    const institution = {
      id: 'ono',
      name: 'המכללה האקדמית אונו',
      region: 'center',
      domain: 'ono.ac.il',
      logoUrl: null,
      programUrl: null,
      calculatorUrl: null,
      universityId: null,
    } as InstitutionRow;

    const requirement = {
      id: 'ono_nursing:ono',
      programId: 'ono_nursing',
      institutionId: 'ono',
      durationYears: 3,
      estimatedStudentsPerYear: null,
      quantitativeMinRequirement: null,
      englishMinRequirement: null,
      specificAdmissionNotes: [],
      programDescription: null,
      admissionRequirements: ['בגרות מלאה'],
      createdAt: new Date(),
      updatedAt: new Date(),
      reviewStatus: 'seeded' as const,
    } as AdmissionRequirementRow;

    const sourceCandidate = {
      id: 'ono_nursing:ono:program-source',
      admissionRequirementId: requirement.id,
      institutionId: 'ono',
      programId: 'ono_nursing',
      origin: 'catalogue_url',
      specificity: 'program_admissions',
      confidence: 'high',
      url: 'https://www.ono.ac.il/curriculum/nursing/',
      title: 'תנאי קבלה - תואר ראשון באֲחָיוּת (סיעוד) - הקריה האקדמית אונו',
      notes: null,
      createdAt: new Date(),
    } as AdmissionsSourceCandidateRow;

    const interviewFact = {
      id: 'ono_nursing:ono:fact:interview',
      admissionRequirementId: requirement.id,
      institutionId: 'ono',
      programId: 'ono_nursing',
      sourceCandidateId: sourceCandidate.id,
      kind: 'manual_gate',
      field: 'interview',
      comparison: 'present',
      valueNumber: null,
      valueText: 'ראיון קבלה',
      unit: 'text',
      description: 'ראיון קבלה אישי נדרש גם במסלולים ללא פסיכומטרי.',
      confidence: 'high',
      isRequired: true,
      createdAt: new Date(),
    } as AdmissionFactRow;

    const alternative = {
      id: 'ono_nursing:ono:alt:bridge',
      admissionRequirementId: requirement.id,
      institutionId: 'ono',
      programId: 'ono_nursing',
      sourceCandidateId: sourceCandidate.id,
      kind: 'transfer_path',
      title: 'אפיק מעבר ללא פסיכומטרי',
      description: 'לבעלי בגרות 85 ומעלה יש אפיק מעבר וראיון קבלה גם ללא פסיכומטרי.',
      url: 'https://www.ono.ac.il/curriculum/nursing/',
      priority: 20,
      createdAt: new Date(),
    } as AdmissionAlternativePathRow;

    const serialized = serializeProgramRow({
      program,
      relations: [{ programId: 'ono_nursing', institutionId: 'ono' }] as ProgramInstitutionRow[],
      requirements: [requirement],
      thresholds: [],
      sourceUrls: [],
      admissionsSourceCandidates: [sourceCandidate],
      admissionFacts: [interviewFact],
      admissionAlternativePaths: [alternative],
      institutionsById: new Map([[institution.id, institution]]),
    });

    expect(serialized.institutionDetails?.[0]).toMatchObject({
      admissionsSourceCandidates: [
        {
          id: sourceCandidate.id,
          origin: 'catalogue_url',
          confidence: 'high',
        },
      ],
      admissionFacts: [
        {
          id: interviewFact.id,
          kind: 'manual_gate',
          field: 'interview',
        },
      ],
      admissionAlternativePaths: [
        {
          id: alternative.id,
          kind: 'transfer_path',
        },
      ],
    });
  });

  it('preserves minimum-floor calculator fields on serialized institutions', () => {
    const institution = {
      id: 'test_college',
      name: 'מכללת בדיקה',
      region: 'center',
      domain: null,
      logoUrl: null,
      programUrl: null,
      calculatorUrl: null,
      universityId: null,
    } as InstitutionRow;

    const calculatorConfig = {
      institutionId: 'test_college',
      formulaType: 'minimum_floors',
      psyWeight: null,
      bagrutWeight: null,
      minPsychometric: 560,
      minBagrut: 85,
      scaleDescription: 'בדיקה',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as UniversityCalculatorConfigRow;

    const serialized = serializeInstitutionRow(institution, calculatorConfig);

    expect(serialized.calculatorConfig).toMatchObject({
      formulaType: 'minimum_floors',
      minPsychometric: 560,
      minBagrut: 85,
    });
  });
});

describe('verified programme identity overlays on stale DB data', () => {
  it.each([
    [
      'jerusalem_academy_graphic_design',
      'jerusalem_academy_dance',
      'jerusalem_academy',
      'תואר ראשון במחול',
      'B.Dance',
    ],
    [
      'jerusalem_academy_dance',
      'jerusalem_academy_dance',
      'jerusalem_academy',
      'תואר ראשון במחול',
      'B.Dance',
    ],
    ['rubin_classical', 'rubin_classical', 'rubin', 'תואר ראשון במוזיקה', 'B.Mus.'],
  ])(
    'repairs %s without carrying invented score floors or descriptions',
    (oldId, id, institutionId, name, credential) => {
      const seed = buildCatalogueSeed();
      const institution = seed.institutions.find(
        (row) => row.id === institutionId,
      )! as InstitutionRow;
      const result = serializeProgramRow({
        program: {
          ...seed.programs[0],
          id: oldId,
          institutionId,
          institutionName: institution.name,
        } as ProgramRow,
        relations: [{ programId: oldId, institutionId }] as ProgramInstitutionRow[],
        requirements: [
          {
            id: `${oldId}:${institutionId}`,
            programId: oldId,
            institutionId,
            durationYears: 3,
            admissionRequirements: ['ממוצע בגרות 90'],
            specificAdmissionNotes: ['Admission depends on manual review'],
            programDescription: 'Mixed graphic design import',
            quantitativeMinRequirement: 550,
            englishMinRequirement: 80,
          },
        ] as AdmissionRequirementRow[],
        thresholds: [
          {
            programId: oldId,
            universityId: institutionId,
            thresholdKind: 'sekhem',
            thresholdValue: 550,
          },
        ] as AdmissionThresholdRow[],
        sourceUrls: [],
        institutionsById: new Map([[institutionId, institution]]),
      });
      expect(result).toMatchObject({
        id,
        name,
        awardedCredential: credential,
        admissionType: 'requirements',
      });
      expect(result.thresholds).toBeUndefined();
      expect(result.institutionDetails![0]).toMatchObject({
        durationYears: 4,
        quantitativeMinRequirement: null,
        englishMinRequirement: null,
      });
      expect(result.institutionDetails![0].programDescription).not.toBe(
        'Mixed graphic design import',
      );
      if (id === 'jerusalem_academy_dance') {
        expect(result.institutionDetails![0].programDescription).toBe(
          'הלימודים לתואר B.Dance נמשכים ארבע שנים. הסטאז׳ מתקיים בשנה החמישית.',
        );
      } else {
        expect(result.institutionDetails![0].programDescription).toBeUndefined();
      }
      expect(result.institutionDetails![0].specificAdmissionNotes).toEqual(
        allPrograms.find((p) => p.id === id)!.institutionDetails![0].specificAdmissionNotes,
      );
    },
  );

  it('repairs the stale Sam Spiegel institution domain and homepage', () => {
    const seed = buildCatalogueSeed();
    const row = seed.institutions.find((i) => i.id === 'spieldocs')!;
    expect(
      serializeInstitutionRow({
        ...row,
        domain: 'spieldocs.ac.il',
        programUrl: 'https://www.spieldocs.ac.il/',
      } as InstitutionRow),
    ).toMatchObject({
      domain: 'www.jsfs.co.il',
      programUrl: 'https://www.jsfs.co.il',
    });
  });
});

describe('Braude persisted identity reconciliation', () => {
  it.each(['ort_braude', 'mon_12220708942'])(
    'serializes %s programmes under braude without changing stored ids',
    (alias) => {
      const seed = buildCatalogueSeed();
      const original = {
        ...seed.programs[0],
        id: 'mon_12220708942_cs',
        institutionId: alias,
      } as ProgramRow;
      const institution = { ...seed.institutions[0], id: alias } as InstitutionRow;
      const result = serializeProgramRow({
        program: original,
        relations: [{ programId: original.id, institutionId: alias }],
        requirements: [],
        thresholds: [],
        sourceUrls: [],
        institutionsById: new Map([[alias, institution]]),
      });
      expect(result).toMatchObject({
        id: 'mon_12220708942_cs',
        institutionId: 'braude',
        linkedInstitutionIds: ['braude'],
      });
      expect(original.institutionId).toBe(alias);
      expect(serializeInstitutionRow(institution).id).toBe(alias);
    },
  );
});
