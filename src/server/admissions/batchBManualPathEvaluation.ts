import { allOf, evaluatePublishedNumericRoutes, minimum } from './publishedNumericRoutes';
import type {
  AdmissionsEvaluationInput,
  AdmissionsEvaluationResult,
} from '@/types/admissionsEvaluation';
import type { CatalogueInstitution } from '@/types/catalogue';

export type ManualGateKind =
  'portfolio' | 'audition' | 'interview' | 'committee' | 'practical_exam' | 'mixed';

export type BatchBProgramConfig = {
  institutionId: string;
  gate: ManualGateKind;
  /** Student-facing remaining steps; natural Hebrew, no internal jargon. */
  steps: string[];
  officialUrls?: string[];
  /** When true, bagrut/psych are optional for the primary answer. */
  scoresOptional?: boolean;
  notes?: string;
};

/**
 * Batch B — programmes where admission is not decided by bagrut/psych alone.
 * Numeric floors are encoded only when grounded in an official extract this run.
 */
export const BATCH_B_PROGRAMS: Record<string, BatchBProgramConfig> = {
  // ── Design / arts (portfolio + exam + interview) ──────────────────────────
  bezalel_industrial_design: {
    institutionId: 'bezalel',
    gate: 'portfolio',
    scoresOptional: true,
    steps: ['הגשת תיק עבודות', 'מבחן כניסה', 'ראיון קבלה'],
    officialUrls: ['https://www.bezalel.ac.il/'],
  },
  bezalel_fine_arts: {
    institutionId: 'bezalel',
    gate: 'portfolio',
    scoresOptional: true,
    steps: ['הגשת תיק עבודות', 'מבחן כניסה', 'ראיון קבלה'],
    officialUrls: ['https://www.bezalel.ac.il/'],
  },
  bezalel_photography: {
    institutionId: 'bezalel',
    gate: 'portfolio',
    scoresOptional: true,
    steps: ['הגשת תיק עבודות', 'מבחן כניסה', 'ראיון קבלה'],
    officialUrls: ['https://www.bezalel.ac.il/'],
  },
  bezalel_fashion: {
    institutionId: 'bezalel',
    gate: 'portfolio',
    scoresOptional: true,
    steps: ['הגשת תיק עבודות', 'מבחן כניסה', 'ראיון קבלה'],
    officialUrls: ['https://www.bezalel.ac.il/'],
  },
  shenkar_industrial_design: {
    institutionId: 'shenkar',
    gate: 'portfolio',
    scoresOptional: true,
    steps: ['הגשת תיק עבודות', 'מבחן כניסה', 'ראיון קבלה'],
    officialUrls: ['https://www.shenkar.ac.il/'],
  },
  shenkar_fashion: {
    institutionId: 'shenkar',
    gate: 'portfolio',
    scoresOptional: true,
    steps: ['הגשת תיק עבודות', 'מבחן כניסה', 'ראיון קבלה'],
    officialUrls: ['https://www.shenkar.ac.il/'],
  },
  shenkar_graphic_design: {
    institutionId: 'shenkar',
    gate: 'portfolio',
    scoresOptional: true,
    steps: ['הגשת תיק עבודות', 'מבחן כניסה', 'ראיון קבלה'],
    officialUrls: ['https://www.shenkar.ac.il/'],
  },
  shenkar_animation: {
    institutionId: 'shenkar',
    gate: 'portfolio',
    scoresOptional: true,
    steps: ['הגשת תיק עבודות', 'מבחן כניסה', 'ראיון קבלה'],
    officialUrls: ['https://www.shenkar.ac.il/'],
  },
  hit_visual_comm: {
    institutionId: 'hit',
    gate: 'portfolio',
    scoresOptional: true,
    steps: ['הגשת תיק עבודות', 'מבחן כניסה', 'ראיון קבלה'],
  },
  hit_industrial_design: {
    institutionId: 'hit',
    gate: 'portfolio',
    scoresOptional: true,
    steps: ['הגשת תיק עבודות', 'מבחן כניסה', 'ראיון קבלה'],
  },
  minshar_fine_arts: {
    institutionId: 'minshar',
    gate: 'portfolio',
    scoresOptional: true,
    steps: ['הגשת תיק עבודות', 'ראיון קבלה'],
  },
  minshar_photography: {
    institutionId: 'minshar',
    gate: 'portfolio',
    scoresOptional: true,
    steps: ['הגשת תיק עבודות', 'ראיון קבלה'],
  },
  minshar_animation: {
    institutionId: 'minshar',
    gate: 'portfolio',
    scoresOptional: true,
    steps: ['הגשת תיק עבודות', 'מבחן כניסה', 'ראיון קבלה'],
  },
  minshar_dance: {
    institutionId: 'minshar',
    gate: 'audition',
    scoresOptional: true,
    steps: ['אודישן מעשי', 'מבחן התאמה', 'ראיון קבלה'],
  },

  // ── Cinema / screen ───────────────────────────────────────────────────────
  samspiegel_cinema: {
    institutionId: 'spieldocs',
    gate: 'mixed',
    scoresOptional: true,
    steps: ['הגשת פרויקט קולנועי', 'ראיון עם ועדה אמנותית'],
  },
  samspiegel_screenwriting: {
    institutionId: 'spieldocs',
    gate: 'interview',
    scoresOptional: true,
    steps: ['הגשת תסריט קצר', 'ראיון קבלה'],
  },

  // ── Music / acting / dance / physical ed ──────────────────────────────────
  jerusalem_academy_classical: {
    institutionId: 'jerusalem_academy',
    gate: 'audition',
    scoresOptional: true,
    steps: ['אודישן ביצוע', 'ראיון קבלה'],
  },
  jerusalem_academy_jazz: {
    institutionId: 'jerusalem_academy',
    gate: 'audition',
    scoresOptional: true,
    steps: ['אודישן ביצוע', 'ראיון קבלה'],
  },
  rubin_classical: {
    institutionId: 'rubin',
    gate: 'audition',
    scoresOptional: true,
    steps: ['אודישן ביצוע', 'ראיון קבלה'],
  },
  jerusalem_academy_dance: {
    institutionId: 'jerusalem_academy',
    gate: 'audition',
    scoresOptional: true,
    steps: ['אודישן מעשי במחול'],
    officialUrls: ['https://jamd.ac.il/dance', 'https://jamd.ac.il/acceptance'],
  },
  nativ_acting: {
    institutionId: 'nativ',
    gate: 'audition',
    scoresOptional: true,
    steps: ['אודישן משחק', 'ראיון קבלה'],
  },
  beit_zvi_acting: {
    institutionId: 'beit_zvi',
    gate: 'audition',
    scoresOptional: true,
    steps: ['אודישן משחק', 'ראיון קבלה'],
  },
  beit_zvi_directing: {
    institutionId: 'beit_zvi',
    gate: 'audition',
    scoresOptional: true,
    steps: ['מבחן כניסה / אודישן', 'ראיון קבלה'],
  },
  seminar_art_education: {
    institutionId: 'seminar',
    gate: 'portfolio',
    scoresOptional: true,
    steps: ['הגשת תיק עבודות', 'ראיון קבלה'],
  },
  seminar_music_education: {
    institutionId: 'seminar',
    gate: 'audition',
    scoresOptional: true,
    steps: ['אודישן', 'ראיון קבלה'],
  },
  seminar_dance: {
    institutionId: 'seminar',
    gate: 'audition',
    scoresOptional: true,
    steps: ['אודישן מחול', 'ראיון קבלה'],
  },
  wingate_coaching: {
    institutionId: 'wingate',
    gate: 'interview',
    scoresOptional: true,
    steps: ['ראיון קבלה', 'מבחני התאמה מקצועיים לפי המסלול'],
  },
  wingate_physical_ed: {
    institutionId: 'wingate',
    gate: 'interview',
    scoresOptional: true,
    steps: ['ראיון קבלה', 'מבחני התאמה מקצועיים לפי המסלול'],
  },

  // ── Complementary / CE (interview-primary) ────────────────────────────────
  reidman_chinese_medicine: {
    institutionId: 'reidman',
    gate: 'interview',
    scoresOptional: true,
    steps: ['ראיון קבלה'],
  },
  reidman_naturopathy: {
    institutionId: 'reidman',
    gate: 'interview',
    scoresOptional: true,
    steps: ['ראיון קבלה'],
  },
  reidman_homeopathy: {
    institutionId: 'reidman',
    gate: 'interview',
    scoresOptional: true,
    steps: ['ראיון קבלה'],
  },
  reidman_reflexology: {
    institutionId: 'reidman',
    gate: 'interview',
    scoresOptional: true,
    steps: ['ראיון קבלה'],
  },
  broshim_homeopathy: {
    institutionId: 'broshim',
    gate: 'interview',
    scoresOptional: true,
    steps: ['ראיון קבלה'],
  },
  broshim_psychotherapy: {
    institutionId: 'broshim',
    gate: 'interview',
    scoresOptional: true,
    steps: ['ראיון קבלה אישי'],
    notes: 'לרוב נדרש תואר ראשון — בדקו באתר המוסד.',
  },
  broshim_naturopathy: {
    institutionId: 'broshim',
    gate: 'interview',
    scoresOptional: true,
    steps: ['ראיון קבלה'],
  },
  ono_ce_chinese_medicine: {
    institutionId: 'ono_ce',
    gate: 'interview',
    scoresOptional: true,
    steps: ['בדיקה רפואית', 'ראיון קבלה'],
  },
  ono_ce_psychotherapy: {
    institutionId: 'ono_ce',
    gate: 'interview',
    scoresOptional: true,
    steps: ['ראיון קבלה'],
    notes: 'נדרש תואר ראשון — בדקו באתר המוסד.',
  },
  pardeshana_integrative: {
    institutionId: 'pardeshana',
    gate: 'interview',
    scoresOptional: true,
    steps: ['ראיון קבלה'],
  },
  bishulim_chef: {
    institutionId: 'bishulim',
    gate: 'practical_exam',
    scoresOptional: true,
    steps: ['מבחן התאמה במטבח', 'ראיון קבלה'],
  },
  bishulim_pastry: {
    institutionId: 'bishulim',
    gate: 'practical_exam',
    scoresOptional: true,
    steps: ['מבחן התאמה במטבח', 'ראיון קבלה'],
  },
  bishulim_restaurant_mgmt: {
    institutionId: 'bishulim',
    gate: 'interview',
    scoresOptional: true,
    steps: ['ראיון קבלה'],
  },

  // ── Nursing / social work ─────────────────────────────────────────────────
  // Tel Hai: interview-primary. Seed 76/460 failed smell-test vs published estimates;
  // official programme pages were unreachable this run — do not rubber-stamp floors.
  telhai_nursing: {
    institutionId: 'telhai',
    gate: 'interview',
    scoresOptional: true,
    steps: ['ראיון קבלה', 'יום מיון לפי פרסום החוג'],
    officialUrls: ['https://www.telhai.ac.il/'],
    notes: 'סף הציונים מתפרסם בחוג ומשתנה; לא מחשבים כאן זכאות מספרית.',
  },
  telhai_socialwork: {
    institutionId: 'telhai',
    gate: 'interview',
    scoresOptional: true,
    steps: ['ראיון קבלה'],
    officialUrls: ['https://www.telhai.ac.il/'],
    notes: 'סף הציונים מתפרסם בחוג; לא מחשבים כאן זכאות מספרית.',
  },
  // Still listed; product may delist later — honest gate only, no invented scores.
  tlvyaffo_socialwork: {
    institutionId: 'mta',
    gate: 'interview',
    scoresOptional: true,
    steps: ['ראיון קבלה'],
    notes: 'מועמדות לראיון בלבד לפי המידע שבקטלוג; מומלץ לוודא שהמסלול פתוח באתר המכללה.',
  },
  ono_socialwork: {
    institutionId: 'ono',
    gate: 'interview',
    scoresOptional: true,
    steps: ['ראיון קבלה'],
    notes: 'אם המסלול עדיין מופיע — הגישו מול המכללה; ייתכן שאינו מוצע כעת.',
  },

  // Reichman Business+Data Analytics style infosystems — interview track (Batch A deferral).
  reichman_infosystems: {
    institutionId: 'reichman',
    gate: 'interview',
    scoresOptional: true,
    steps: ['ראיון קבלה / ועדת קבלה'],
    officialUrls: ['https://www.runi.ac.il/'],
    notes: 'אין שורת סף מספרית ברורה למסלול הקטלוג; הקבלה כוללת מיון ידני.',
  },
};

const ONO_NURSING_URL = 'https://www.ono.ac.il/curriculum/nursing/';

function gateLabel(gate: ManualGateKind): string {
  switch (gate) {
    case 'portfolio':
      return 'נדרש תיק עבודות ומיון';
    case 'audition':
      return 'נדרש אודישן ומיון';
    case 'practical_exam':
      return 'נדרש מבחן מעשי ומיון';
    case 'committee':
      return 'נדרש דיון בוועדה';
    case 'mixed':
      return 'נדרש מיון נוסף';
    case 'interview':
    default:
      return 'נדרש ראיון קבלה';
  }
}

function manualPendingResult(
  institution: CatalogueInstitution,
  config: BatchBProgramConfig,
): AdmissionsEvaluationResult {
  const steps = config.steps.join(', ');
  const note = config.notes ? ` ${config.notes}` : '';
  return {
    institution,
    linkedInstitutionId: institution.id,
    capability: 'manual_gate',
    kind: 'manual_gate',
    decision: 'eligible_to_apply',
    confidence: 'medium',
    sourceLabel: gateLabel(config.gate),
    explanation: `במסלול הזה לא מספיקים ציוני בגרות או פסיכומטרי לבדם. כדי להתקדם צריך להשלים: ${steps}.${note}`,
    nextAction:
      'הגישו מועמדות באתר המוסד והשלימו את שלבי המיון שפורסמו שם. עמידה בשלבים אלה אינה הבטחת קבלה.',
    additionalConditions: [
      {
        id: 'admissions_committee' as const,
        label: steps,
        status: 'unconfirmed' as const,
      },
    ],
    officialUrls: config.officialUrls,
  };
}

function evaluateOnoNursing({
  input,
  institution,
}: {
  input: AdmissionsEvaluationInput;
  institution: CatalogueInstitution;
}): AdmissionsEvaluationResult {
  const interview = [
    {
      id: 'admissions_committee' as const,
      label: 'ראיון קבלה',
      status: 'unconfirmed' as const,
    },
  ];
  const routes = [
    {
      label: 'בגרות ופסיכומטרי',
      score: input.bagrut,
      threshold: 85,
      requirements: 'ממוצע בגרות 85 לפחות ופסיכומטרי 520 לפחות, וראיון קבלה',
      ...allOf(
        minimum(input.bagrut, 85, 'bagrut_average'),
        minimum(input.psychometric, 520, 'psychometric_overall'),
      ),
      conditions: interview,
    },
    {
      label: 'אפיק מעבר — בגרות',
      score: input.bagrut,
      threshold: 85,
      requirements: 'ממוצע בגרות 85 לפחות ללא פסיכומטרי (אפיק מעבר), וראיון קבלה',
      ...minimum(input.bagrut, 85, 'bagrut_average'),
      conditions: interview,
    },
    {
      label: 'מסלול מצוינות — בגרות 100',
      score: input.bagrut,
      threshold: 100,
      requirements: 'ממוצע בגרות 100 לפחות (מסלול מצוינות), וראיון קבלה',
      ...minimum(input.bagrut, 100, 'bagrut_average'),
      conditions: interview,
    },
    {
      label: 'מסלול מצוינות — בגרות 103',
      score: input.bagrut,
      threshold: 103,
      requirements: 'ממוצע בגרות 103 לפחות (מסלול מצוינות), וראיון קבלה',
      ...minimum(input.bagrut, 103, 'bagrut_average'),
      conditions: interview,
    },
  ];
  const result = evaluatePublishedNumericRoutes({
    institution,
    routes,
    officialUrls: [ONO_NURSING_URL],
    caveat: 'עמידה בסף אינה אישור קבלה; נדרש גם ראיון קבלה ואישור שפות מול המכללה.',
    confidence: 'medium',
  });
  if (result.decision !== 'pending' || result.scoreAssessment !== 'meets_threshold') return result;

  const match = routes.find((route) => !route.below && !route.missing.length)!;
  return {
    ...result,
    decision: 'accepted',
    kind: 'manual_gate',
    capability: 'manual_gate',
    explanation: `לפי הציונים שהזנת, אתה עומד בסף התוכנית (${match.requirements.replace(', וראיון קבלה', '')}).`,
  };
}

export function isBatchBManualProgram(degreeId: string, institutionId: string): boolean {
  if (degreeId === 'ono_nursing' && institutionId === 'ono') return true;
  const config = BATCH_B_PROGRAMS[degreeId];
  return Boolean(config && config.institutionId === institutionId);
}

export function evaluateBatchBManualPath({
  input,
  institution,
}: {
  input: AdmissionsEvaluationInput;
  institution: CatalogueInstitution;
}): AdmissionsEvaluationResult | undefined {
  if (input.degreeId === 'ono_nursing' && institution.id === 'ono') {
    return evaluateOnoNursing({ input, institution });
  }
  const config = BATCH_B_PROGRAMS[input.degreeId];
  if (!config || config.institutionId !== institution.id) return undefined;
  return manualPendingResult(institution, config);
}

export const BATCH_B_PROGRAM_IDS = [...Object.keys(BATCH_B_PROGRAMS), 'ono_nursing'] as const;
