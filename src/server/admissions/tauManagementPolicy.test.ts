import { describe, expect, it } from 'vitest';
import { evaluateTauManagementAdmission, type TauManagementApplicant } from './tauManagementPolicy';

// TAU's live calculators returned Management scores 639/638 and PMA 835/834
// for these inputs on 2026-09-27. Neither applicant meets the P >= 620 route.
const boundaryApplicant: TauManagementApplicant = {
  psychometric: 605,
  bagrutAverage: 115,
  managementScore: 639,
  acceptanceThreshold: 610,
  rejectionThreshold: 609,
  mathUnits: 5,
  mathGrade: 70,
  englishUnits: 5,
  englishGrade: 100,
  requirementsConfirmed: true,
  qualifyingMoocCount: 0,
  academicRouteConfirmed: false,
  noPsychometricMoocsConfirmed: false,
};

describe('current TAU Management admission routes', () => {
  it('accepts the independently observed PMA boundary below psychometric 620', () => {
    expect(evaluateTauManagementAdmission(boundaryApplicant)).toMatchObject({
      decision: 'accepted',
      route: 'pma',
      pma: 835,
      missingInputs: [],
    });
  });

  it('rejects the observed 834 case despite its Management score being above 610', () => {
    expect(
      evaluateTauManagementAdmission({
        ...boundaryApplicant,
        psychometric: 604,
        managementScore: 638,
      }),
    ).toMatchObject({ decision: 'below', pma: 834, missingInputs: [] });
  });

  it('checks the common mathematics condition even when the score is high', () => {
    expect(
      evaluateTauManagementAdmission({
        ...boundaryApplicant,
        psychometric: 700,
        mathUnits: 3,
        quantitativeScore: 139,
      }),
    ).toMatchObject({ decision: 'below', unmetRequirements: ['mathematics'] });
  });

  it('allows quantitative 140 as the alternative to four-unit mathematics', () => {
    expect(
      evaluateTauManagementAdmission({
        ...boundaryApplicant,
        psychometric: 680,
        mathUnits: 3,
        quantitativeScore: 140,
      }),
    ).toMatchObject({ decision: 'accepted', route: 'psychometric_680' });
  });

  it('asks for the quantitative score when it could satisfy the mathematics condition', () => {
    expect(
      evaluateTauManagementAdmission({
        ...boundaryApplicant,
        psychometric: 680,
        mathUnits: 3,
      }),
    ).toMatchObject({ decision: 'needs_input', missingInputs: ['quantitativeScore'] });
  });

  it('requires explicit confirmation of certificate, language and academic-history conditions', () => {
    expect(
      evaluateTauManagementAdmission({
        ...boundaryApplicant,
        requirementsConfirmed: undefined,
      }),
    ).toMatchObject({ decision: 'needs_input', missingInputs: ['requirementsConfirmed'] });
    expect(
      evaluateTauManagementAdmission({
        ...boundaryApplicant,
        requirementsConfirmed: false,
      }),
    ).toMatchObject({ decision: 'below', unmetRequirements: ['general_requirements'] });
  });

  it('uses the standard score route at psychometric 620', () => {
    expect(
      evaluateTauManagementAdmission({
        ...boundaryApplicant,
        psychometric: 620,
        managementScore: 610,
      }),
    ).toMatchObject({ decision: 'accepted', route: 'management_score' });
  });

  it('applies the two-course bonus to the standard score route', () => {
    expect(
      evaluateTauManagementAdmission({
        ...boundaryApplicant,
        psychometric: 620,
        managementScore: 600,
        qualifyingMoocCount: 2,
      }),
    ).toMatchObject({
      decision: 'accepted',
      route: 'management_score',
      adjustedManagementScore: 610,
    });
  });

  it('asks for unknown courses when they can change the result', () => {
    expect(
      evaluateTauManagementAdmission({
        ...boundaryApplicant,
        psychometric: 620,
        managementScore: 600,
        qualifyingMoocCount: undefined,
      }),
    ).toMatchObject({ decision: 'needs_input', missingInputs: ['qualifyingMoocCount'] });
  });

  it('does not ask for unrelated course or academic inputs after a direct route passes', () => {
    expect(
      evaluateTauManagementAdmission({
        ...boundaryApplicant,
        psychometric: 680,
        bagrutAverage: undefined,
        managementScore: undefined,
        qualifyingMoocCount: undefined,
        academicRouteConfirmed: undefined,
        noPsychometricMoocsConfirmed: undefined,
      }),
    ).toMatchObject({ decision: 'accepted', route: 'psychometric_680', missingInputs: [] });
  });

  it('accepts the direct psychometric 640 / official average 95 route', () => {
    expect(
      evaluateTauManagementAdmission({
        ...boundaryApplicant,
        psychometric: 640,
        bagrutAverage: 95,
        managementScore: 590,
      }),
    ).toMatchObject({ decision: 'accepted', route: 'psychometric_bagrut' });
  });

  it('accepts confirmed recognized academic study at psychometric 640', () => {
    expect(
      evaluateTauManagementAdmission({
        ...boundaryApplicant,
        psychometric: 640,
        bagrutAverage: 94,
        managementScore: 590,
        academicRouteConfirmed: true,
      }),
    ).toMatchObject({ decision: 'accepted', route: 'academic_study' });
  });

  it('does not invent an academic-study outcome when it could change a below result', () => {
    expect(
      evaluateTauManagementAdmission({
        ...boundaryApplicant,
        psychometric: 640,
        bagrutAverage: 94,
        managementScore: 590,
        academicRouteConfirmed: undefined,
        mathGrade: 55,
        englishGrade: 55,
      }),
    ).toMatchObject({ decision: 'needs_input', missingInputs: ['academicRouteConfirmed'] });
  });

  it('accepts the published no-psychometric route using the two specified courses', () => {
    expect(
      evaluateTauManagementAdmission({
        ...boundaryApplicant,
        psychometric: undefined,
        bagrutAverage: 104,
        managementScore: undefined,
        englishGrade: 85,
        noPsychometricMoocsConfirmed: true,
      }),
    ).toMatchObject({ decision: 'accepted', route: 'no_psychometric', missingInputs: [] });
  });

  it('requires the named no-psychometric courses rather than any two bonus courses', () => {
    expect(
      evaluateTauManagementAdmission({
        ...boundaryApplicant,
        psychometric: 604,
        managementScore: 598,
        qualifyingMoocCount: 2,
        noPsychometricMoocsConfirmed: undefined,
      }),
    ).toMatchObject({ decision: 'needs_input', missingInputs: ['noPsychometricMoocsConfirmed'] });
  });

  it('keeps a score between official rejection and acceptance pending', () => {
    expect(
      evaluateTauManagementAdmission({
        ...boundaryApplicant,
        psychometric: 620,
        bagrutAverage: 100,
        managementScore: 609.5,
      }),
    ).toMatchObject({ decision: 'pending', missingInputs: [] });
  });

  it('keeps the official rejection cutoff itself below, not pending', () => {
    expect(
      evaluateTauManagementAdmission({
        ...boundaryApplicant,
        psychometric: 620,
        bagrutAverage: 100,
        managementScore: 609,
      }),
    ).toMatchObject({ decision: 'below', missingInputs: [] });
  });

  it('adds no subject bonus below grade 60', () => {
    expect(
      evaluateTauManagementAdmission({
        ...boundaryApplicant,
        psychometric: 600,
        mathGrade: 59,
        quantitativeScore: 140,
      }),
    ).toMatchObject({ decision: 'below', pma: 784 });
  });

  it('uses the published 12.5 bonuses for four-unit mathematics and English', () => {
    expect(
      evaluateTauManagementAdmission({
        ...boundaryApplicant,
        psychometric: 610,
        mathUnits: 4,
        mathGrade: 100,
        englishUnits: 4,
        englishGrade: 100,
      }),
    ).toMatchObject({ decision: 'accepted', route: 'pma', pma: 835 });
  });

  it('does not infer passing mathematics from the quantitative score being absent', () => {
    expect(
      evaluateTauManagementAdmission({
        ...boundaryApplicant,
        mathUnits: undefined,
        mathGrade: undefined,
      }),
    ).toMatchObject({ decision: 'needs_input' });
  });
});
