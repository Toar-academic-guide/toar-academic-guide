import type {
  AdmissionsEvaluationInput,
  AdmissionsEvaluationResult,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';
import { subjectIdForWizardLabel } from '@/utils/bagrutSubjectRecord';
import type { CatalogueInstitution } from '@/types/catalogue';
import {
  calculateBguBagrutAverage,
  calculateHujiBagrutAverage,
  calculateTauBagrutAverage,
} from './bagrutPolicies';
import {
  HUJI_MEDICINE_POLICY,
  HUJI_MEDICINE_REQUIREMENTS_URL,
  hujiMedicineCognitiveScore,
} from './hujiMedicinePolicy';
import { runTauAdmissionsProof } from '@/server/ingestion/adapters/tauAdmissions';
import { runBguAdmissionsProof } from '@/server/ingestion/adapters/bguAdmissions';
import { getBguProgramConfig } from '@/data/admissions/bguProgramVerification';
import { withScoreAssessment, confirmationCondition } from './scoreAssessment';
import {
  medicineBagrutSubjects,
  COMBINED_MEDICINE_SUBJECT_IDS,
  UNRESOLVED_MEDICINE_SUBJECT_IDS,
} from '@/data/admissions/medicineBagrutSubjects';

/** Academic-stage evidence is separate from the existing final-stage proof ledger. */
export async function evaluateMedicineAcademicStage({
  input,
  institution,
  fetcher = fetch,
}: {
  input: AdmissionsEvaluationInput;
  institution: CatalogueInstitution;
  fetcher?: typeof fetch;
}): Promise<AdmissionsEvaluationResult> {
  const id = institution.id;
  const extra = input.extraInputs ?? {};
  const record =
    extra.bagrutSubjectRecord &&
    medicineBagrutSubjects(extra.bagrutSubjectRecord, extra.medicineCertificateLanguage);
  const sourceUrl =
    id === 'huji'
      ? HUJI_MEDICINE_REQUIREMENTS_URL
      : id === 'tau'
        ? 'https://go.tau.ac.il/he/med/ba/med-doc?v=new-info'
        : getBguProgramConfig('medicine').sourceUrl;
  const base: AdmissionsEvaluationResult = {
    institution: { id, name: institution.name, region: institution.region, programUrl: sourceUrl },
    linkedInstitutionId: id,
    stage: 'academic',
    admissionCycle: '2026-2027',
    registrationStatus: 'closed',
    capability: 'needs_input',
    kind: 'needs_input',
    decision: 'unknown',
    confidence: 'high',
    sourceLabel: 'השלב האקדמי ברפואה',
    explanation: 'השלימו את פרטי הבגרות והפסיכומטרי.',
    nextAction:
      id === 'bgu'
        ? 'בהמשך: מבחן מיון וראיונות. העמידה בסף אינה מבטיחה זימון או קבלה.'
        : 'בהמשך: מיון אישיותי ודירוג המועמדים. העמידה בסף אינה מבטיחה זימון או קבלה.',
    officialUrls: [sourceUrl],
  };
  if (!record) return { ...base, requiredInputs: ['bagrut_subject_record'] };
  // Sector alone does not identify the certificate language for every school.
  if (record.sector !== 'jewish' && !extra.medicineCertificateLanguage)
    return { ...base, requiredInputs: ['medicine_certificate_language'] };
  if (record.subjects.some((s) => s.subjectId === subjectIdForWizardLabel('עבודת גמר')))
    return { ...base, requiredInputs: ['bagrut_final_project_subject'] };
  // Combined records need the actual transcript breakdown; never omit their grades.
  if (
    record.schemaVersion === 2 &&
    record.subjects.some(
      (s) => s.assessmentKind === 'combined' || COMBINED_MEDICINE_SUBJECT_IDS.has(s.subjectId),
    )
  )
    return { ...base, requiredInputs: ['bagrut_combined_subjects'] };
  if (id !== 'bgu' && record.subjects.some((s) => UNRESOLVED_MEDICINE_SUBJECT_IDS.has(s.subjectId)))
    return {
      ...base,
      kind: 'authority_unavailable',
      capability: 'authority_unavailable',
      confidence: 'low',
      explanation: 'לא ניתן לחשב כרגע את התעודה הזו לפי כללי המוסד.',
    };
  const average = (
    id === 'tau'
      ? calculateTauBagrutAverage
      : id === 'bgu'
        ? calculateBguBagrutAverage
        : calculateHujiBagrutAverage
  )(record);
  if (average.state === 'needs_input')
    return { ...base, requiredInputs: average.missingInputs as AdmissionsRequiredInput[] };
  if (input.psychometric === undefined)
    return { ...base, requiredInputs: ['psychometric_overall'] };

  const floor = id === 'bgu' ? 680 : 700;
  const deadline = id === 'bgu' ? '2025-12-31' : '2026-04-30';
  const conditions = [
    confirmationCondition(
      'psychometric_overall',
      `פסיכומטרי ${floor} לפחות`,
      input.psychometric >= floor,
    ),
  ];
  const requiredInputs: AdmissionsRequiredInput[] = [];
  const condition = (key: AdmissionsRequiredInput, label: string, value: boolean | undefined) => {
    conditions.push(confirmationCondition(key, label, value));
    if (value === undefined) requiredInputs.push(key);
  };
  condition(
    'medicine_psychometric_date',
    id === 'bgu' ? 'פסיכומטרי עד דצמבר 2025' : 'פסיכומטרי עד אפריל 2026',
    extra.medicinePsychometricDate === undefined
      ? undefined
      : extra.medicinePsychometricDate <= deadline,
  );
  const englishMeets =
    extra.medicineEnglishExempt === true ||
    (extra.psychometricEnglish !== undefined && extra.psychometricEnglish >= 120);
  condition(
    'psychometric_english',
    'אנגלית ברמת מתקדמים ב׳ לפחות',
    englishMeets
      ? true
      : extra.medicineEnglishExempt === undefined || extra.psychometricEnglish === undefined
        ? undefined
        : false,
  );
  if (!englishMeets && extra.medicineEnglishExempt === undefined)
    requiredInputs.push('medicine_english_exempt');
  const hebrew = extra.medicineHebrewBasis;
  condition(
    hebrew === 'exam' ? 'medicine_hebrew_score' : 'medicine_hebrew_basis',
    id === 'bgu' ? 'עברית ברמה ו׳ או פטור' : 'עברית: ציון 105 לפחות או פטור',
    hebrew === undefined
      ? undefined
      : hebrew === 'hebrew_school' || hebrew === 'exempt'
        ? true
        : extra.medicineHebrewScore === undefined
          ? undefined
          : extra.medicineHebrewScore >= (id === 'bgu' ? 116 : 105),
  );
  if (id === 'tau') {
    const math = record.subjects.find(
      (s) =>
        s.subjectId === 'mathematics' && (!('assessmentKind' in s) || s.assessmentKind === 'exam'),
    );
    condition(
      'math_units',
      'מתמטיקה: 4 יחידות לפחות בציון עובר',
      math === undefined ? undefined : math.units >= 4 && math.grade >= 55,
    );
  }

  let score: number | undefined;
  let threshold: number | undefined;
  try {
    if (id === 'huji') {
      score = hujiMedicineCognitiveScore(average.average, input.psychometric, 'bagrut');
      threshold = HUJI_MEDICINE_POLICY.screeningCutoff;
    } else {
      const applicant = { bagrutAverage: average.average, psychometric: input.psychometric };
      const proof =
        id === 'tau'
          ? await runTauAdmissionsProof({
              fetcher,
              applicant,
              program: {
                id: 'medicine',
                pairId: 'medicine__tau',
                name: 'Medicine',
                targetId: 'tau-medicine-live',
                nodeId: 8215,
                externalId: '011167010000',
                scoreField: 'hatama_refua',
                decisionMode: 'eligible_to_apply',
              },
            })
          : await runBguAdmissionsProof({
              fetcher,
              applicant,
              program: {
                id: 'medicine',
                pairId: 'medicine__bgu',
                name: 'Medicine',
                targetId: 'bgu-medicine-live',
                searchText: sourceUrl,
              },
            });
      const payload = proof.normalizedPayload;
      if (
        proof.status !== 'succeeded' ||
        typeof payload.selectedScore !== 'number' ||
        typeof payload.acceptanceThreshold !== 'number' ||
        payload.acceptanceThreshold !== (id === 'tau' ? 726.44 : 735) ||
        (id === 'tau' &&
          (!Array.isArray(payload.matchedProgramIds) ||
            !payload.matchedProgramIds.includes('011167010000'))) ||
        (id === 'bgu' &&
          (payload.psychometricFloor !== 680 || payload.medicineRequiresBoth !== true))
      )
        throw new Error('Academic source unavailable or changed');
      score = payload.selectedScore;
      threshold = payload.acceptanceThreshold;
    }
  } catch {
    return {
      ...base,
      kind: 'authority_unavailable',
      capability: 'authority_unavailable',
      confidence: 'low',
      explanation: 'לא ניתן לחשב כרגע מול המקור הרשמי. נסו שוב מאוחר יותר.',
      requiredInputs,
      additionalConditions: conditions,
    };
  }
  return withScoreAssessment(
    {
      ...base,
      kind: 'exact',
      capability: 'exact',
      score,
      threshold,
      scoreLabel: id === 'huji' ? 'ציון קוגניטיבי לרפואה' : 'ציון אקדמי לרפואה',
      requiredInputs,
      scoreAssessment: score >= threshold ? 'meets_threshold' : 'below_threshold',
      decision: score >= threshold ? 'eligible_to_apply' : 'below',
      explanation: 'בדיקת השלב האקדמי לתשפ״ז (2026–2027).',
    },
    conditions,
  );
}
