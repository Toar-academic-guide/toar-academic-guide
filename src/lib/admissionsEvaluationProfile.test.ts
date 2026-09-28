import { describe, expect, it } from 'vitest';

import { admissionsExtraInputsFromAcademicScores } from './admissionsEvaluationProfile';
import { admissionsInputValue } from '@/server/admissions/admissionsInputValue';

describe('admissionsExtraInputsFromAcademicScores', () => {
  it('forwards the saved Haifa average and real years without rounding or substituting them', () => {
    const admissions = {
      haifaBagrutAverage: 102.25,
      haifaBagrutYear: 2015,
      haifaPsychometricYear: 2026,
      haifaAdmissionQualification: 'full_bagrut' as const,
      haifaEnglishLevel: 'advanced_a' as const,
      haifaHebrewQualification: 'exam' as const,
      haifaHebrewScore: 120,
      haifaHebrewExamDate: '2026-04-01',
      haifaPsychometricMonth: 4,
      haifaScienceUnits: 8,
      haifaOtFailedSelectionAttempts: 0,
      haifaOtUnjustifiedAbsence: false,
    };
    const input = admissionsExtraInputsFromAcademicScores({ admissions });
    expect(input).toMatchObject(admissions);
    expect(admissionsInputValue(input, 'haifa_bagrut_average')).toBe(102.25);
    expect(admissionsInputValue(input, 'haifa_bagrut_year')).toBe(2015);
    expect(admissionsInputValue(input, 'haifa_psychometric_year')).toBe(2026);
  });
  it('forwards social science route, false confirmations and academic decimals', () => {
    const admissions = {
      bguSocialScienceRoute: 'bagrut' as const,
      bguSocialScienceRequirementsConfirmed: false,
      bguSocialScienceLanguageConfirmed: true,
      bguReturningFromStudyBreak: false,
      bguSocialWorkAcademicBackground: 'social_work' as const,
      bguSocialWorkAcademicAverage: 85.25,
      bguSocialWorkTranscriptProvided: false,
      bguApplicantAge: 45,
      bguEducationSecondDepartment: 'art' as const,
      bguEnglishClassificationMissing: false,
      bguHebrewRequirementsConfirmed: true,
      bguEducationEnglishConditionAcknowledged: false,
    };
    expect(admissionsExtraInputsFromAcademicScores({ admissions })).toMatchObject(admissions);
    expect(admissionsInputValue(admissions, 'bgu_social_science_requirements')).toBe(false);
    expect(admissionsInputValue(admissions, 'bgu_social_work_academic_average')).toBe(85.25);
  });
  it('passes saved quantitative-route details to evaluation without losing false or decimal grades', () => {
    const admissions = {
      bguQuantitativeRoute: 'bagrut' as const,
      bguPreparatoryTrack: 'natural_life_sciences' as const,
      bguPreparatoryCompleted: true,
      bguPreparatoryAverage: 87.25,
      bguPriorAcademicStudies: false,
      bguReturningOrChangingTrack: false,
      bguCertificateRequirementsConfirmed: true,
      bguApplicationPriority: 1,
      bguSecondTrackRequirementsConfirmed: true,
    };
    expect(admissionsExtraInputsFromAcademicScores({ admissions })).toMatchObject(admissions);
  });
  it('maps saved psychometric subscores and Bagrut subjects into the admissions evaluator contract', () => {
    expect(
      admissionsExtraInputsFromAcademicScores({
        psychometric: { overall: 700, quantitative: 125, verbal: 120, english: 118 },
        bagrut: {
          weightedAverage: 108,
          subjectRecord: {
            schemaVersion: 1,
            sector: 'jewish',
            subjects: [
              { subjectId: 'mathematics', units: 5, grade: 93 },
              { subjectId: 'english', units: 5, grade: 90 },
              { subjectId: 'physics', units: 5, grade: 88 },
              { subjectId: 'computer_science', units: 5, grade: 95 },
            ],
          },
        },
      }),
    ).toEqual({
      psychometricMath: 125,
      psychometricVerbal: 120,
      psychometricEnglish: 118,
      bagrutProfileSchemaVersion: 1,
      bagrutSector: 'jewish',
      bagrutSubjectRecord: {
        schemaVersion: 1,
        sector: 'jewish',
        subjects: [
          { subjectId: 'mathematics', units: 5, grade: 93 },
          { subjectId: 'english', units: 5, grade: 90 },
          { subjectId: 'physics', units: 5, grade: 88 },
          { subjectId: 'computer_science', units: 5, grade: 95 },
        ],
      },
      mathUnits: 5,
      mathGrade: 93,
      englishUnits: 5,
      englishGrade: 90,
      physicsUnits: 5,
      physicsGrade: 88,
      csUnits: 5,
      csGrade: 95,
    });
  });

  it('does not attach an empty extra-input payload when no saved structured values exist', () => {
    expect(admissionsExtraInputsFromAcademicScores({})).toBeUndefined();
  });

  it('maps optional institution-specific inputs while preserving false and zero', () => {
    expect(
      admissionsExtraInputsFromAcademicScores({
        admissions: {
          tauManagementRequirementsConfirmed: true,
          tauManagementAcademicRouteConfirmed: false,
          tauManagementQualifyingMoocCount: 0,
          tauManagementNoPsychometricMoocsConfirmed: false,
          tauBagrutAverage: 112.5,
          bguBagrutAverage: 108.25,
          tauApplicationRequirementsConfirmed: false,
          bguLanguageRequirementsConfirmed: true,
          tauMathPlacementScore: 0,
          technionArchitectureBagrutAverage: 101.9,
          technionArchitectureExamScore: 0,
          technionArchitectureExamPassed: false,
          technionArchitectureRequirementsConfirmed: true,
        },
      }),
    ).toEqual({
      tauManagementRequirementsConfirmed: true,
      tauManagementAcademicRouteConfirmed: false,
      tauManagementQualifyingMoocCount: 0,
      tauManagementNoPsychometricMoocsConfirmed: false,
      tauBagrutAverage: 112.5,
      bguBagrutAverage: 108.25,
      tauApplicationRequirementsConfirmed: false,
      bguLanguageRequirementsConfirmed: true,
      tauMathPlacementScore: 0,
      technionArchitectureBagrutAverage: 101.9,
      technionArchitectureExamScore: 0,
      technionArchitectureExamPassed: false,
      technionArchitectureRequirementsConfirmed: true,
    });
  });

  it('carries engineering qualification data and preserves false when mapping a saved profile', () => {
    const bguEngineering = {
      detailsConfirmed: true,
      physicsCoursePassed: false,
      preparatoryInstitution: 'bgu' as const,
      preparatoryCompletionYear: 2026,
      preparatoryMathUnits: 5 as const,
      preparatoryMathGrade: 95,
      diplomaRecognized: false,
    };
    const extra = admissionsExtraInputsFromAcademicScores({ admissions: { bguEngineering } });
    expect(extra).toEqual({ bguEngineering });
    expect(admissionsInputValue(extra!, 'bgu_engineering_details')).toEqual(bguEngineering);
    expect(admissionsInputValue(extra!, 'bgu_engineering_physics_course')).toBe(false);
  });

  it('resolves all institution-specific required inputs to their corresponding values', () => {
    const inputs = {
      tauBagrutAverage: 112.5,
      bguBagrutAverage: 108.25,
      tauApplicationRequirementsConfirmed: false,
      bguLanguageRequirementsConfirmed: true,
      tauMathPlacementScore: 0,
      technionArchitectureBagrutAverage: 101.9,
      technionArchitectureExamScore: 0,
      technionArchitectureExamPassed: false,
      technionArchitectureRequirementsConfirmed: true,
    };

    expect(admissionsInputValue(inputs, 'tau_bagrut_average')).toBe(112.5);
    expect(admissionsInputValue(inputs, 'bgu_bagrut_average')).toBe(108.25);
    expect(admissionsInputValue(inputs, 'tau_application_requirements')).toBe(false);
    expect(admissionsInputValue(inputs, 'bgu_language_requirements')).toBe(true);
    expect(admissionsInputValue(inputs, 'tau_math_placement_score')).toBe(0);
  });
});

it('forwards all health profile inputs while preserving decimals and false', () => {
  const admissions = {
    bguOccupationalTherapyRoute: 'academic' as const,
    bguOccupationalTherapyRequirementsConfirmed: true,
    bguBachelorsDegreeCompleted: false,
    bguBachelorsDegreeAverage: 85.25,
    bguPhysiotherapyRequirementsConfirmed: false,
    bguOccupationalTherapyExamSession: 'spring_nativ' as const,
  };
  expect(admissionsExtraInputsFromAcademicScores({ admissions })).toEqual(admissions);
  expect(admissionsInputValue(admissions, 'bgu_bachelors_degree_completed')).toBe(false);
  expect(admissionsInputValue(admissions, 'bgu_bachelors_degree_average')).toBe(85.25);
});
