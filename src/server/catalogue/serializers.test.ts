import { serializeInstitutionRow, serializeProgramRow } from '@/server/catalogue/serializers';
import { allPrograms } from '@/data/degrees';
import type {
  AdmissionAlternativePathRow,
  AdmissionFactRow,
  AdmissionRequirementRow,
  AdmissionsSourceCandidateRow,
  InstitutionRow,
  ProgramInstitutionRow,
  ProgramRow,
  UniversityCalculatorConfigRow,
} from '@/db/types';

describe('catalogue serializers', () => {
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
