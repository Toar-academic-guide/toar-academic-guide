import { serializeInstitutionRow, serializeProgramRow } from '@/server/catalogue/serializers';
import type {
  AdmissionRequirementRow,
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
    } as AdmissionRequirementRow;

    const serialized = serializeProgramRow({
      program,
      relations: [{ programId: 'test_program', institutionId: 'test_university' }] as ProgramInstitutionRow[],
      requirements: [requirement],
      thresholds: [],
      sourceUrls: [],
      institutionsById: new Map([[institution.id, institution]]),
    });

    expect(serialized.institutionDetails?.[0]?.durationYears).toBeNull();
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
