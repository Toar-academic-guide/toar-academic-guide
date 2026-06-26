import type {
  AdmissionAlternativePath,
  AdmissionFact,
  AdmissionsConfidence,
  InstitutionDetail,
  Program,
} from '@/data/degrees/types';
import type {
  AdmissionsDecision,
  AdmissionsDecisionConfidence,
  AdmissionsDecisionMissingItem,
  AdmissionsDecisionNextAction,
  AdmissionsDecisionSource,
  AdmissionsDecisionStatus,
  UniversityResult,
  UserScores,
} from '@/types';

const STATUS_LABELS: Record<AdmissionsDecisionStatus, string> = {
  accepted: 'התקבלת',
  likely_accepted_needs_verification: 'התקבלת כנראה / דורש אימות',
  close_to_accepted: 'קרוב להתקבל',
  not_accepted_has_path: 'לא התקבלת - אבל יש דרך',
  far_from_track: 'רחוק מהמסלול',
  insufficient_data: 'אין מספיק דאטה',
};

const CONFIDENCE_RANK: Record<AdmissionsConfidence, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const NUMERIC_FIELD_LABELS: Partial<Record<AdmissionFact['field'], string>> = {
  sekhem: 'סכם',
  psychometric: 'פסיכומטרי',
  bagrut_average: 'ממוצע בגרות',
  psychometric_quantitative: 'כמותי בפסיכומטרי',
  psychometric_english: 'אנגלית בפסיכומטרי',
  math_units: 'יחידות מתמטיקה',
  english_units: 'יחידות אנגלית',
};

export interface EvaluateAdmissionsDecisionInput {
  program: Program;
  institutionDetail?: InstitutionDetail;
  scores: UserScores;
  calculatorResult?: UniversityResult | null;
}

function minConfidence(values: AdmissionsConfidence[]): AdmissionsDecisionConfidence {
  if (values.length === 0) {
    return 'low';
  }

  return values.reduce((lowest, current) =>
    CONFIDENCE_RANK[current] < CONFIDENCE_RANK[lowest] ? current : lowest,
  );
}

function sourcesFromDetail(detail?: InstitutionDetail): AdmissionsDecisionSource[] {
  return (
    detail?.admissionsSourceCandidates?.map((source) => ({
      label: source.title ?? source.url,
      url: source.url,
      confidence: source.confidence,
    })) ?? []
  );
}

function bestSourceUrl(detail?: InstitutionDetail): string | undefined {
  return (
    detail?.admissionsSourceCandidates?.[0]?.url ??
    detail?.calculatorUrl ??
    detail?.officialCalculatorUrl ??
    detail?.programUrl
  );
}

function sourceConfidence(detail?: InstitutionDetail): AdmissionsDecisionConfidence {
  return minConfidence(
    detail?.admissionsSourceCandidates?.map((source) => source.confidence) ?? [],
  );
}

function numericValueForField(field: AdmissionFact['field'], scores: UserScores): number | null {
  if (field === 'psychometric') {
    return scores.psychometric;
  }
  if (field === 'bagrut_average') {
    return scores.bagrut;
  }
  return null;
}

function isPassingFact(fact: AdmissionFact, scores: UserScores): boolean | null {
  if (fact.kind === 'open_admission' || fact.kind === 'explicit_absence') {
    return true;
  }

  if (fact.kind !== 'numeric_gate' || fact.valueNumber === null) {
    return null;
  }

  const currentValue = numericValueForField(fact.field, scores);
  if (currentValue === null) {
    return null;
  }

  if (fact.comparison === 'gte') {
    return currentValue >= fact.valueNumber;
  }
  if (fact.comparison === 'lte') {
    return currentValue <= fact.valueNumber;
  }
  if (fact.comparison === 'eq') {
    return currentValue === fact.valueNumber;
  }

  return null;
}

function missingFromFact(
  fact: AdmissionFact,
  scores: UserScores,
): AdmissionsDecisionMissingItem | null {
  if (fact.kind !== 'numeric_gate' || fact.valueNumber === null || fact.comparison !== 'gte') {
    return null;
  }

  const currentValue = numericValueForField(fact.field, scores);
  if (currentValue === null || currentValue >= fact.valueNumber) {
    return null;
  }

  return {
    label: NUMERIC_FIELD_LABELS[fact.field] ?? fact.description,
    field: fact.field,
    currentValue,
    requiredValue: fact.valueNumber,
    delta: Math.ceil(fact.valueNumber - currentValue),
  };
}

function missingFromCalculator(result: UniversityResult): AdmissionsDecisionMissingItem[] {
  if (result.status !== 'below' || !result.deltaNeeded) {
    return [];
  }

  const missing: AdmissionsDecisionMissingItem[] = [];
  if (result.deltaNeeded.psychometric > 0) {
    missing.push({
      label: 'פסיכומטרי',
      field: 'psychometric',
      delta: result.deltaNeeded.psychometric,
    });
  }
  if (result.deltaNeeded.bagrut > 0) {
    missing.push({
      label: 'ממוצע בגרות',
      field: 'bagrut_average',
      delta: result.deltaNeeded.bagrut,
    });
  }
  return missing;
}

function isSmallGap(missing: AdmissionsDecisionMissingItem[]): boolean {
  if (missing.length === 0) {
    return false;
  }

  return missing.every((item) => {
    if (item.field === 'psychometric') {
      return (item.delta ?? 0) <= 60;
    }
    if (item.field === 'bagrut_average') {
      return (item.delta ?? 0) <= 10;
    }
    return (item.delta ?? 0) <= 5;
  });
}

function isLargeGap(missing: AdmissionsDecisionMissingItem[]): boolean {
  return missing.some((item) => {
    if (item.field === 'psychometric') {
      return (item.delta ?? 0) > 120;
    }
    if (item.field === 'bagrut_average') {
      return (item.delta ?? 0) > 20;
    }
    return (item.delta ?? 0) > 10;
  });
}

function bestAlternative(
  alternatives: AdmissionAlternativePath[] = [],
): AdmissionAlternativePath | undefined {
  return [...alternatives].sort((a, b) => a.priority - b.priority)[0];
}

function nextActionFor(args: {
  status: AdmissionsDecisionStatus;
  missing: AdmissionsDecisionMissingItem[];
  alternative?: AdmissionAlternativePath;
  sourceUrl?: string;
}): AdmissionsDecisionNextAction {
  const { status, missing, alternative, sourceUrl } = args;

  if (status === 'accepted') {
    return {
      kind: 'register',
      label: 'להמשיך להרשמה ולבדוק מועדי פתיחה',
      ...(sourceUrl ? { url: sourceUrl } : {}),
    };
  }

  if (status === 'likely_accepted_needs_verification') {
    return {
      kind: 'manual_check',
      label: 'לאמת את התנאים מול המקור הרשמי',
      ...(sourceUrl ? { url: sourceUrl } : {}),
    };
  }

  const psychometricGap = missing.find((item) => item.field === 'psychometric');
  const bagrutGap = missing.find((item) => item.field === 'bagrut_average');

  if (status === 'close_to_accepted') {
    if (psychometricGap && (!bagrutGap || (psychometricGap.delta ?? 0) <= 60)) {
      return {
        kind: 'improve_psychometric',
        label: `שיפור של כ-${psychometricGap.delta} נקודות בפסיכומטרי יכול לפתוח את האפשרות`,
      };
    }
    if (bagrutGap) {
      return {
        kind: 'improve_bagrut',
        label: `שיפור של כ-${bagrutGap.delta} נקודות בממוצע הבגרות יכול לפתוח את האפשרות`,
      };
    }
  }

  if (alternative) {
    return {
      kind:
        alternative.kind === 'lower_threshold_institution'
          ? 'other_institution'
          : alternative.kind === 'prep_program'
            ? 'prep_program'
            : alternative.kind === 'transfer_path'
              ? 'transfer_path'
              : alternative.kind === 'exceptions_committee'
                ? 'exceptions_committee'
                : alternative.kind === 'similar_program'
                  ? 'similar_program'
                  : alternative.kind === 'online_or_abroad'
                    ? 'online_or_abroad'
                    : 'manual_check',
      label: alternative.title,
      ...(alternative.url ? { url: alternative.url } : {}),
    };
  }

  return {
    kind: status === 'insufficient_data' ? 'official_source' : 'manual_check',
    label:
      status === 'insufficient_data'
        ? 'לבדוק את מקור הקבלה הרשמי או לשמור יעד למעקב'
        : 'לבצע בדיקה ידנית לפני החלטה',
    ...(sourceUrl ? { url: sourceUrl } : {}),
  };
}

function buildDecision(args: {
  status: AdmissionsDecisionStatus;
  confidence: AdmissionsDecisionConfidence;
  explanation: string[];
  metConditions: string[];
  missing: AdmissionsDecisionMissingItem[];
  manualGates: string[];
  sources: AdmissionsDecisionSource[];
  nextAction: AdmissionsDecisionNextAction;
}): AdmissionsDecision {
  return {
    status: args.status,
    confidence: args.confidence,
    statusLabel: STATUS_LABELS[args.status],
    explanation: args.explanation,
    metConditions: args.metConditions,
    missing: args.missing,
    manualGates: args.manualGates,
    sources: args.sources,
    nextAction: args.nextAction,
  };
}

export function evaluateAdmissionsDecision({
  program,
  institutionDetail,
  scores,
  calculatorResult,
}: EvaluateAdmissionsDecisionInput): AdmissionsDecision {
  const facts = institutionDetail?.admissionFacts ?? [];
  const alternatives = institutionDetail?.admissionAlternativePaths ?? [];
  const manualGates = facts
    .filter((fact) => fact.kind === 'manual_gate' && fact.isRequired)
    .map((fact) => fact.description);
  const sources = sourcesFromDetail(institutionDetail);
  const sourceUrl = bestSourceUrl(institutionDetail);
  const alternative = bestAlternative(alternatives);

  if (calculatorResult?.status === 'accepted') {
    const confidence = manualGates.length > 0 ? 'medium' : 'high';
    return buildDecision({
      status: 'accepted',
      confidence,
      explanation: [
        calculatorResult.admissionTrack === 'direct'
          ? 'הציון הפסיכומטרי עומד במסלול קבלה ישירה.'
          : `הסכם המחושב ${calculatorResult.sekhem} עומד בסף ${calculatorResult.threshold}.`,
      ],
      metConditions: facts
        .filter((fact) => isPassingFact(fact, scores) === true)
        .map((fact) => fact.description),
      missing: [],
      manualGates,
      sources,
      nextAction: nextActionFor({ status: 'accepted', missing: [], alternative, sourceUrl }),
    });
  }

  if (calculatorResult?.status === 'below') {
    const missing = missingFromCalculator(calculatorResult);
    const status = isSmallGap(missing)
      ? 'close_to_accepted'
      : isLargeGap(missing)
        ? 'far_from_track'
        : 'not_accepted_has_path';

    return buildDecision({
      status,
      confidence: 'high',
      explanation: [
        `הסכם המחושב ${calculatorResult.sekhem} נמוך מסף ${calculatorResult.threshold}.`,
      ],
      metConditions: [],
      missing,
      manualGates,
      sources,
      nextAction: nextActionFor({ status, missing, alternative, sourceUrl }),
    });
  }

  if (facts.length === 0) {
    return buildDecision({
      status: 'insufficient_data',
      confidence: 'low',
      explanation: ['אין לנו עדיין תנאי קבלה מובנים למסלול הזה.'],
      metConditions: [],
      missing: [],
      manualGates: [],
      sources,
      nextAction: nextActionFor({
        status: 'insufficient_data',
        missing: [],
        alternative,
        sourceUrl,
      }),
    });
  }

  const confidence = minConfidence([
    ...facts.map((fact) => fact.confidence),
    sourceConfidence(institutionDetail),
  ]);
  const unknownFacts = facts.filter((fact) => fact.kind === 'unknown');
  const openAdmissionFact = facts.find((fact) => fact.kind === 'open_admission');
  const numericFacts = facts.filter((fact) => fact.kind === 'numeric_gate');
  const missing = numericFacts
    .map((fact) => missingFromFact(fact, scores))
    .filter((item): item is AdmissionsDecisionMissingItem => item !== null);
  const metConditions = facts
    .filter((fact) => isPassingFact(fact, scores) === true)
    .map((fact) => fact.description);

  if (unknownFacts.length > 0 && numericFacts.length === 0 && !openAdmissionFact) {
    return buildDecision({
      status: 'insufficient_data',
      confidence: 'low',
      explanation: unknownFacts.map((fact) => fact.description),
      metConditions,
      missing: [],
      manualGates,
      sources,
      nextAction: nextActionFor({
        status: 'insufficient_data',
        missing: [],
        alternative,
        sourceUrl,
      }),
    });
  }

  if (missing.length === 0 && openAdmissionFact) {
    const status =
      confidence === 'low' || unknownFacts.length > 0
        ? 'likely_accepted_needs_verification'
        : 'accepted';
    return buildDecision({
      status,
      confidence,
      explanation: [openAdmissionFact.description],
      metConditions,
      missing: [],
      manualGates,
      sources,
      nextAction: nextActionFor({ status, missing: [], alternative, sourceUrl }),
    });
  }

  if (missing.length === 0 && numericFacts.length > 0) {
    const status =
      confidence === 'low' || unknownFacts.length > 0
        ? 'likely_accepted_needs_verification'
        : 'accepted';
    return buildDecision({
      status,
      confidence,
      explanation: [
        manualGates.length > 0
          ? 'הציונים עומדים בתנאים המספריים שפורסמו, אך נשאר תנאי ידני.'
          : 'הציונים עומדים בתנאי הקבלה שפורסמו.',
      ],
      metConditions,
      missing: [],
      manualGates,
      sources,
      nextAction: nextActionFor({ status, missing: [], alternative, sourceUrl }),
    });
  }

  const status = isSmallGap(missing)
    ? 'close_to_accepted'
    : isLargeGap(missing)
      ? 'far_from_track'
      : 'not_accepted_has_path';

  return buildDecision({
    status,
    confidence,
    explanation: [`לפי הנתונים שיש לנו, עדיין חסרים תנאי קבלה במסלול ${program.name}.`],
    metConditions,
    missing,
    manualGates,
    sources,
    nextAction: nextActionFor({ status, missing, alternative, sourceUrl }),
  });
}
