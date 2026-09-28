import type {
  AdmissionsEvaluationInput,
  AdmissionsEvaluationResult,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';
import type { CatalogueInstitution } from '@/types/catalogue';
import {
  TAU_PHYSIOTHERAPY_REGISTRATION_URL,
  TAU_PHYSIOTHERAPY_SELECTION_URL,
} from '@/lib/tauPhysiotherapyInputs';
import { runTauAdmissionsProof } from '@/server/ingestion/adapters/tauAdmissions';
import { withBoundedOfficialResponse } from '@/server/ingestion/boundedOfficialFetch';

function pageText(html: string): string {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function readTauPhysiotherapyThresholds(selectionHtml: string, registrationHtml: string) {
  const selection = pageText(selectionHtml);
  const registration = pageText(registrationHtml);
  const acceptance = Number(
    selection.match(/ציון התאמה\s*\(סכם\)\s*קבלה\s*-\s*(\d+(?:\.\d+)?)/)?.[1],
  );
  const rejection = Number(
    selection.match(/ציון התאמה\s*\(סכם\)\s*דחייה\s*-\s*(\d+(?:\.\d+)?)/)?.[1],
  );
  if (
    !Number.isFinite(acceptance) ||
    !Number.isFinite(rejection) ||
    acceptance <= rejection ||
    !/פסיכומטרי[^.]{0,80}630/.test(registration) ||
    !/ידע באנגלית[^.]{0,80}120/.test(registration) ||
    !/מתמטיקה[^.]{0,80}4 יחידות/.test(registration)
  ) {
    throw new Error(
      'Current TAU physiotherapy cutoffs or entry requirements could not be confirmed',
    );
  }
  return { acceptance, rejection };
}

/** Numeric screening only: TAU's interview and final ranking remain uncalculated. */
export async function evaluateTauPhysiotherapyResult({
  input,
  institution,
  fetcher = fetch,
}: {
  input: AdmissionsEvaluationInput;
  institution: CatalogueInstitution;
  fetcher?: typeof fetch;
}): Promise<AdmissionsEvaluationResult> {
  const { id, name, region, domain, logoUrl, programUrl, calculatorUrl, universityId } =
    institution;
  const base = {
    institution: { id, name, region, domain, logoUrl, programUrl, calculatorUrl, universityId },
    linkedInstitutionId: id,
    officialUrls: [TAU_PHYSIOTHERAPY_SELECTION_URL, TAU_PHYSIOTHERAPY_REGISTRATION_URL],
    sourceLabel: 'סכם ותנאי הגשה רשמיים לפיזיותרפיה בתל אביב',
  };
  const extra = input.extraInputs;
  const missing: AdmissionsRequiredInput[] = [];
  if (!extra?.tauPhysiotherapyRoute) missing.push('tau_physiotherapy_route');
  if (input.psychometric === undefined) missing.push('psychometric_overall');
  if (extra?.tauPhysiotherapyRequirementsConfirmed === undefined)
    missing.push('tau_physiotherapy_requirements');
  const math = extra?.bagrutSubjectRecord?.subjects.find(
    (subject) => subject.subjectId === 'mathematics',
  );
  const mathPasses =
    (math?.units ?? extra?.mathUnits ?? 0) >= 4 && (math?.grade ?? extra?.mathGrade ?? 0) >= 55;
  const englishPasses = (extra?.psychometricEnglish ?? 0) >= 120;
  if (!mathPasses && extra?.tauPhysiotherapyAcademicMathConfirmed === undefined)
    missing.push('tau_physiotherapy_academic_math');
  if (!englishPasses && extra?.tauPhysiotherapyEnglishAlternativeConfirmed === undefined)
    missing.push('tau_physiotherapy_english_alternative');
  const unmet = [
    ...(input.psychometric !== undefined && input.psychometric < 630
      ? ['פסיכומטרי תקף 630 לפחות']
      : []),
    ...(extra?.tauPhysiotherapyRequirementsConfirmed === false
      ? ['שאר תנאי ההגשה, כולל רישום במועד']
      : []),
    ...(!mathPasses && extra?.tauPhysiotherapyAcademicMathConfirmed === false
      ? ['מתמטיקה 4 יחידות בציון עובר או קורס אקדמי שאושר']
      : []),
    ...(!englishPasses && extra?.tauPhysiotherapyEnglishAlternativeConfirmed === false
      ? ['אנגלית 120 לפחות או חלופה מוכרת']
      : []),
  ];
  const needsInput = (): AdmissionsEvaluationResult => ({
    ...base,
    capability: 'needs_input',
    kind: 'needs_input',
    decision: 'unknown',
    confidence: 'low',
    explanation: 'נדרשים נתונים נוספים לבדיקת הסכם ותנאי ההגשה לפיזיותרפיה בתל אביב.',
    nextAction: 'פתחו את הפרופיל האקדמי והשלימו את הממוצע הרשמי ותנאי הפיזיותרפיה בתל אביב.',
    requiredInputs: missing,
  });
  if (!unmet.length && missing.length) return needsInput();
  const timedFetcher = withBoundedOfficialResponse(fetcher, { timeoutMs: 5000 });
  try {
    const pages = await Promise.all(
      [TAU_PHYSIOTHERAPY_SELECTION_URL, TAU_PHYSIOTHERAPY_REGISTRATION_URL].map(async (url) => {
        const response = await timedFetcher(url);
        if (!response.ok)
          throw new Error(`TAU physiotherapy page returned HTTP ${response.status}`);
        return response.text();
      }),
    );
    const thresholds = readTauPhysiotherapyThresholds(pages[0], pages[1]);
    if (unmet.length)
      return {
        ...base,
        capability: 'manual_gate',
        kind: 'manual_gate',
        decision: 'below',
        confidence: 'high',
        explanation: `לא מתקיימים תנאי ההגשה: ${unmet.join('; ')}.`,
        nextAction: 'בדקו באתר התוכנית את התנאי החסר והחלופות המוכרות.',
      };
    if (extra!.tauPhysiotherapyRoute !== 'bagrut')
      return {
        ...base,
        capability: 'manual_gate',
        kind: 'manual_gate',
        decision: 'unknown',
        confidence: 'low',
        explanation:
          'אפיק המכינה או הלימודים האקדמיים דורש בדיקת מסמכים וחישוב מוסדי. אין כאן סכם מאומת לאפיק זה, ולכן אין מסקנת זכאות או דחייה.',
        nextAction: 'בקשו מתל אביב את הסכם הגבוה מבין האפיקים המתאימים ואת בדיקת תנאי האפיק.',
      };
    if (extra?.tauBagrutAverage === undefined) missing.push('tau_bagrut_average');
    if (extra?.tauPhysiotherapyMoocBonusConfirmed === undefined)
      missing.push('tau_physiotherapy_mooc_bonus');
    if (missing.length) return needsInput();
    const proof = await runTauAdmissionsProof({
      fetcher: timedFetcher,
      program: {
        targetId: 'tau-physiotherapy-live',
        pairId: 'physiotherapy__tau',
        id: 'tau-physiotherapy',
        name: 'Physiotherapy',
        nodeId: 8213,
        externalId: '016411010000',
        scoreField: 'hatama_refua',
        decisionMode: 'eligible_to_apply',
        staticThresholds: thresholds,
      },
      applicant: { psychometric: input.psychometric!, bagrutAverage: extra!.tauBagrutAverage! },
    });
    const payload = proof.normalizedPayload;
    if (
      proof.status !== 'succeeded' ||
      payload.selectedScoreField !== 'hatama_refua' ||
      typeof payload.selectedScore !== 'number' ||
      !Array.isArray(payload.matchedProgramIds) ||
      !payload.matchedProgramIds.includes('016411010000')
    ) {
      throw new Error('TAU physiotherapy did not return its mapped medical score');
    }
    const bonus = extra!.tauPhysiotherapyMoocBonusConfirmed ? 5 : 0;
    const score = Math.round((payload.selectedScore + bonus) * 100) / 100;
    const decision =
      score >= thresholds.acceptance
        ? 'eligible_to_apply'
        : score <= thresholds.rejection
          ? 'below'
          : 'pending';
    return {
      ...base,
      capability: 'manual_gate',
      kind: 'manual_gate',
      decision,
      confidence: 'high',
      score,
      scoreLabel: `סכם פיזיותרפיה${bonus ? ' כולל בונוס קורס 5 נקודות' : ''}`,
      threshold: decision === 'below' ? thresholds.rejection : thresholds.acceptance,
      explanation:
        decision === 'below'
          ? 'הסכם באפיק הבגרות אינו מעל סף הדחייה שפורסם לפיזיותרפיה. אפיק אקדמי אחר, אם מתאים, דורש חישוב מוסדי.'
          : decision === 'pending'
            ? 'הסכם בין סף הדחייה לסף הקבלה שפורסמו; נדרשת בדיקת האוניברסיטה.'
            : 'הסכם עומד בסף המספרי שפורסם, ושאר תנאי ההגשה אושרו על ידך. ראיון ודירוג התאמה עדיין נדרשים; אין כאן אישור זימון או קבלה סופית.',
      nextAction: 'בדקו מול האוניברסיטה את מצב הרישום, הזימון לראיון וההחלטה הסופית.',
    };
  } catch (error) {
    return {
      ...base,
      capability: 'authority_unavailable',
      kind: 'authority_unavailable',
      decision: 'unknown',
      confidence: 'low',
      explanation: 'לא ניתן לאמת כרגע את הסכם או תנאי הפיזיותרפיה מול המקור הרשמי.',
      nextAction: 'נסו שוב או בדקו במחשבון ובאתר תל אביב.',
      degradationReason: error instanceof Error ? error.message : String(error),
    };
  }
}
