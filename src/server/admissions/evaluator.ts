import 'server-only';

import { getCalculatorInstitutionsFromCatalogue } from '@/lib/calculatorInstitutions';
import { evaluateUniversities } from '@/utils/sekhemCalculators';
import type { University } from '@/types';
import type {
  AdmissionsEvaluationInput,
  AdmissionsEvaluationReport,
  AdmissionsEvaluationResult,
} from '@/types/admissionsEvaluation';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';
import {
  buildAdmissionsCapabilityMatrix,
  loadFreshnessStatesBySourceIds,
  type AdmissionsCapabilityEntry,
} from './capabilityMatrix';
import { runHaifaAdmissionsProof } from '@/server/ingestion/adapters/haifaAdmissions';
import { runTauAdmissionsProof } from '@/server/ingestion/adapters/tauAdmissions';
import { runTechnionAdmissionsProof } from '@/server/ingestion/adapters/technionAdmissions';
import { runBguAdmissionsProof } from '@/server/ingestion/adapters/bguAdmissions';

const MAX_EXACT_SOURCE_CALLS = 2;
const OFFICIAL_SOURCE_TIMEOUT_MS = 5000;

export async function evaluateAdmissionsForProgram(args: {
  input: AdmissionsEvaluationInput;
  program: CatalogueProgram;
  institutions: CatalogueInstitution[];
  fetcher?: typeof fetch;
  now?: Date;
}): Promise<AdmissionsEvaluationReport> {
  const { input, program, institutions, fetcher, now = new Date() } = args;

  const exactSourceIds = program.linkedInstitutionIds
    .map((institutionId) => `${program.id}__${institutionId}`)
    .flatMap((key) => {
      if (key === 'haifa_cs__haifa') return ['haifa-cs-live'];
      if (key === 'tau_datascience__tau') return ['tau-digital-sciences-live'];
      return [];
    });

  const freshnessStatesBySourceId = await loadFreshnessStatesBySourceIds(exactSourceIds);
  const capabilityEntries = buildAdmissionsCapabilityMatrix({
    program,
    institutions,
    freshnessStatesBySourceId,
    now,
  });

  const results = await evaluateCapabilityEntries({
    input,
    program,
    institutions,
    capabilityEntries,
    fetcher,
  });

  return {
    generatedAt: now.toISOString(),
    input,
    program: {
      id: program.id,
      name: program.name,
    },
    results,
  };
}

async function evaluateCapabilityEntries(args: {
  input: AdmissionsEvaluationInput;
  program: CatalogueProgram;
  institutions: CatalogueInstitution[];
  capabilityEntries: AdmissionsCapabilityEntry[];
  fetcher?: typeof fetch;
}): Promise<AdmissionsEvaluationResult[]> {
  const { input, program, institutions, capabilityEntries, fetcher } = args;
  let exactCallCount = 0;

  const results: AdmissionsEvaluationResult[] = [];

  for (const entry of capabilityEntries) {
    const institution = institutions.find((item) => item.id === entry.institutionId);
    if (!institution) {
      continue;
    }

    if (
      entry.capability === 'exact' &&
      entry.exactTarget &&
      exactCallCount < MAX_EXACT_SOURCE_CALLS
    ) {
      exactCallCount += 1;
      results.push(
        await evaluateExactResult({
          input,
          institution,
          exactTarget: entry.exactTarget,
          fetcher,
        }),
      );
      continue;
    }

    results.push(
      evaluateNonExactResult({
        input,
        program,
        institution,
        entry,
        exactCallsBounded: exactCallCount >= MAX_EXACT_SOURCE_CALLS,
      }),
    );
  }

  return results;
}

async function evaluateExactResult(args: {
  input: AdmissionsEvaluationInput;
  institution: CatalogueInstitution;
  exactTarget: NonNullable<AdmissionsCapabilityEntry['exactTarget']>;
  fetcher?: typeof fetch;
}): Promise<AdmissionsEvaluationResult> {
  const { input, institution, exactTarget, fetcher } = args;

  const timedFetcher = withTimeout(fetcher ?? fetch, OFFICIAL_SOURCE_TIMEOUT_MS);

  try {
    if (exactTarget.sourceTarget.adapterId === 'haifa') {
      const proof = await runHaifaAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          psychometric: input.psychometric,
          psychometricSubscores: {
            english: input.extraInputs?.psychometricEnglish ?? 0,
            math: input.extraInputs?.psychometricMath ?? 0,
            verbal: input.extraInputs?.psychometricVerbal ?? 0,
          },
        },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת חיפה',
      });
    }

    if (exactTarget.sourceTarget.adapterId === 'technion') {
      const proof = await runTechnionAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          psychometric: input.psychometric,
        },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של הטכניון',
      });
    }

    if (exactTarget.sourceTarget.adapterId === 'bgu') {
      const proof = await runBguAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          psychometric: input.psychometric,
        },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת בן-גוריון',
      });
    }

    const proof = await runTauAdmissionsProof({
      fetcher: timedFetcher,
      program: exactTarget.program,
      applicant: {
        bagrutAverage: input.bagrut,
        psychometric: input.psychometric,
      },
    });

    return normalizeExactProofResult({
      institution,
      proof: proof.normalizedPayload,
      explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
    });
  } catch (error) {
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'stale',
      kind: 'degraded',
      decision: 'unknown',
      confidence: 'low',
      sourceLabel: 'אימות רשמי לא זמין',
      explanation:
        error instanceof Error
          ? `לא הצלחנו לקבל אימות רשמי כרגע: ${error.message}`
          : 'לא הצלחנו לקבל אימות רשמי כרגע.',
      nextAction: institution.calculatorUrl
        ? 'נסו שוב מאוחר יותר או בדקו ישירות במחשבון הרשמי.'
        : 'נסו שוב מאוחר יותר.',
      degradationReason: 'official_source_unavailable',
    };
  }
}

function normalizeExactProofResult(args: {
  institution: CatalogueInstitution;
  proof: Record<string, unknown>;
  explanationPrefix: string;
}): AdmissionsEvaluationResult {
  const { institution, proof, explanationPrefix } = args;

  const score = numberOrUndefined(proof.selectedScore) ?? numberOrUndefined(proof.weightedScore);
  const threshold =
    numberOrUndefined(proof.acceptanceThreshold) ?? numberOrUndefined(proof.acceptanceCutoff);

  if (score === undefined || threshold === undefined) {
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'unsupported',
      kind: 'degraded',
      decision: 'unknown',
      confidence: 'low',
      sourceLabel: 'אימות רשמי חלקי',
      explanation: `${explanationPrefix} החזיר נתונים חלקיים ללא סף קבלה מאומת.`,
      nextAction: 'בדקו ישירות במקור הרשמי או נסו שוב מאוחר יותר.',
      degradationReason: 'official_source_partial',
    };
  }

  const decision = score >= threshold ? 'accepted' : 'below';
  const scoreLabel = proof.selectedScore !== undefined ? 'ציון התאמה' : 'ציון משוקלל';

  return {
    institution: publicInstitutionShape(institution),
    linkedInstitutionId: institution.id,
    capability: 'exact',
    kind: 'exact',
    decision,
    confidence: 'high',
    sourceLabel: 'אימות רשמי',
    explanation: `${explanationPrefix} סיפק ציון וסף קבלה מעודכנים למסלול זה.`,
    nextAction:
      decision === 'accepted'
        ? 'בדקו את דף ההרשמה הרשמי והשלימו כל דרישה ידנית נוספת.'
        : 'שמרו את המסלול והשוו מול מוסדות אחרים או שפרו את הנתונים לפני הרשמה.',
    score,
    scoreLabel,
    threshold,
  };
}

function evaluateNonExactResult(args: {
  input: AdmissionsEvaluationInput;
  program: CatalogueProgram;
  institution: CatalogueInstitution;
  entry: AdmissionsCapabilityEntry;
  exactCallsBounded: boolean;
}): AdmissionsEvaluationResult {
  const { input, program, institution, entry, exactCallsBounded } = args;

  if (entry.capability === 'needs_input') {
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'needs_input',
      kind: 'needs_input',
      decision: 'unknown',
      confidence: 'low',
      sourceLabel: 'נדרשים נתונים נוספים',
      explanation: 'כדי לחשב מסלול זה דרך המקור הרשמי צריך גם תתי-ציונים בפסיכומטרי.',
      nextAction: 'השלימו ציוני כמותי, מילולי ואנגלית כדי לקבל אימות רשמי.',
      requiredInputs: entry.requiredInputs,
    };
  }

  if (entry.capability === 'blocked') {
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'blocked',
      kind: 'unsupported',
      decision: 'unknown',
      confidence: 'low',
      sourceLabel: 'מקור חסום',
      explanation: entry.sourceTarget?.blockedReason ?? 'המקור הרשמי דורש דפדפן או תהליך ידני.',
      nextAction: entry.sourceTarget?.nextAction ?? 'בדקו ישירות באתר המוסד.',
    };
  }

  if (entry.capability === 'stale' || exactCallsBounded) {
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: entry.capability === 'stale' ? 'stale' : 'unsupported',
      kind: 'degraded',
      decision: 'unknown',
      confidence: 'low',
      sourceLabel: 'אימות רשמי לא זמין',
      explanation:
        entry.capability === 'stale'
          ? 'מצב המקור הרשמי מיושן או נכשל לאחרונה, ולכן לא נציג החלטה רשמית.'
          : 'הוגבל מספר קריאות האימות הרשמיות לבקשה זו.',
      nextAction: 'נסו שוב מאוחר יותר או בדקו ישירות במקור הרשמי.',
      degradationReason: entry.capability === 'stale' ? 'source_stale' : 'exact_fanout_limited',
    };
  }

  if (entry.capability === 'open_admission') {
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'open_admission',
      kind: 'open_admission',
      decision: 'accepted',
      confidence: 'high',
      sourceLabel: 'קבלה פתוחה',
      explanation: 'מוסד זה מציע אפיק קבלה פתוחה ללא צורך בציון פסיכומטרי או ממוצע בגרות מינימלי.',
      nextAction: 'הירשמו ישירות למסלול הלימודים באתר הרשמי של המוסד.',
    };
  }

  if (entry.capability === 'manual_gate') {
    const detail = program.institutionDetails?.find(
      (d) =>
        d.institutionName === institution.name ||
        d.officialCalculatorUrl?.includes(institution.id) ||
        d.programUrl?.includes(institution.id),
    );
    const factsList = detail?.admissionFacts?.map((f) => f.description) ?? [];
    const notesList = detail?.specificAdmissionNotes ?? [];
    const allRequirements = [...factsList, ...notesList];

    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'manual_gate',
      kind: 'manual_gate',
      decision: 'unknown',
      confidence: 'high',
      sourceLabel: 'מיונים ידניים',
      explanation:
        allRequirements.length > 0
          ? `דרישות קבלה למסלול זה: ${allRequirements.join('; ')}`
          : 'הקבלה למסלול זה דורשת מעבר מיונים ידניים כגון הגשת תיק עבודות, מבחן מעשי או ראיון קבלה.',
      nextAction: 'בדקו את תנאי המיון המלאים והירשמו מוקדם למחזורי הבחינות.',
    };
  }

  if (entry.capability === 'estimated' || entry.capability === 'score_only') {
    const calculatorInstitution = getCalculatorInstitutionsFromCatalogue([institution])[0];
    if (!calculatorInstitution) {
      return unsupportedResult(institution, entry);
    }

    const [evaluation] = evaluateUniversities(
      [calculatorInstitution as University],
      program,
      {
        psychometric: input.psychometric,
        bagrut: input.bagrut,
        mathGrade: input.extraInputs?.mathGrade,
        mathUnits: input.extraInputs?.mathUnits,
        englishGrade: input.extraInputs?.englishGrade,
        englishUnits: input.extraInputs?.englishUnits,
        physicsGrade: input.extraInputs?.physicsGrade,
        physicsUnits: input.extraInputs?.physicsUnits,
        csGrade: input.extraInputs?.csGrade,
        csUnits: input.extraInputs?.csUnits,
      },
      { hasMath5: false, hasPhysics5: false },
    );

    if (!evaluation || evaluation.status === 'unavailable') {
      return unsupportedResult(institution, entry);
    }

    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: entry.capability,
      kind: 'estimated',
      decision: evaluation.status === 'accepted' ? 'accepted' : 'below',
      confidence: entry.capability === 'estimated' ? 'medium' : 'low',
      sourceLabel: entry.capability === 'estimated' ? 'הערכה מבוססת סכם' : 'הערכה עם מקור חלקי',
      explanation:
        evaluation.explanation ??
        (entry.capability === 'estimated'
          ? 'התוצאה מבוססת על נוסחת הסכם והסף שנבדקו בקטלוג, לא על תשובת מחשבון רשמי חיה.'
          : 'התוצאה מבוססת על נוסחת הסכם מקומית, כשהמקור הרשמי מספק רק חלק מהמידע.'),
      nextAction:
        evaluation.status === 'accepted'
          ? 'בדקו את המקור הרשמי לפני קבלת החלטה סופית.'
          : 'שמרו את המסלול והשוו למוסדות אחרים או בדקו את המחשבון הרשמי.',
      score: evaluation.sekhem,
      scoreLabel: 'סכם משוער',
      threshold: evaluation.threshold,
      deltaNeeded: evaluation.deltaNeeded,
    };
  }

  return unsupportedResult(institution, entry);
}

function unsupportedResult(
  institution: CatalogueInstitution,
  entry: AdmissionsCapabilityEntry,
): AdmissionsEvaluationResult {
  return {
    institution: publicInstitutionShape(institution),
    linkedInstitutionId: institution.id,
    capability: entry.capability,
    kind: 'unsupported',
    decision: 'unknown',
    confidence: 'low',
    sourceLabel: 'אין מספיק מידע',
    explanation:
      entry.sourceTarget?.limitations[0] ??
      'אין כרגע מספיק מידע מאומת כדי לחשב תוצאה אמינה למסלול זה.',
    nextAction: entry.sourceTarget?.nextAction ?? 'בדקו ישירות באתר המוסד.',
  };
}

function publicInstitutionShape(
  institution: CatalogueInstitution,
): AdmissionsEvaluationResult['institution'] {
  return {
    id: institution.id,
    name: institution.name,
    region: institution.region,
    domain: institution.domain,
    logoUrl: institution.logoUrl,
    programUrl: institution.programUrl,
    calculatorUrl: institution.calculatorUrl,
    universityId: institution.universityId,
  };
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function withTimeout(fetcher: typeof fetch, timeoutMs: number): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetcher(input, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };
}
