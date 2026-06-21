import {
  ProfileScores,
  ValuesProfile,
  EnvironmentPreference,
  RecommendedField,
  AvoidanceTag,
  ProfileDimension,
} from '@/types';
import { allPrograms } from '@/data/degrees';
import type { Program } from '@/data/degrees/types';
import { PROGRAM_FIELD_MAP } from '@/data/degrees/fieldEnrichment';

const PROFILE_DIMS: ProfileDimension[] = ['AN', 'TE', 'CR', 'SO', 'LE', 'OR', 'DI', 'ER'];
const VALUE_KEYS: (keyof ValuesProfile)[] = [
  'incomeVsImpact',
  'independenceVsTeam',
  'growthVsStability',
  'prestigeVsMeaning',
];

const NEUTRAL_ENV: EnvironmentPreference = { soloScore: 1, deskScore: 1 };
const NEUTRAL_VALUES: ValuesProfile = {
  incomeVsImpact: 0,
  independenceVsTeam: 0,
  growthVsStability: 0,
  prestigeVsMeaning: 0,
};

const PROFILE_DIM_LABELS: Record<ProfileDimension, { name: string; nameF: string }> = {
  AN: { name: 'אנליטי', nameF: 'אנליטית' },
  TE: { name: 'טכני', nameF: 'טכנית' },
  CR: { name: 'יצירתי', nameF: 'יצירתית' },
  SO: { name: 'חברתי', nameF: 'חברתית' },
  LE: { name: 'מנהיגותי', nameF: 'מנהיגותית' },
  OR: { name: 'מערכתי', nameF: 'מערכתית' },
  DI: { name: 'דיגיטלי', nameF: 'דיגיטלית' },
  ER: { name: 'עיוני', nameF: 'עיונית' },
};

const VALUE_LABELS: Record<keyof ValuesProfile, { left: string; right: string }> = {
  incomeVsImpact: {
    left: 'ביטחון כלכלי',
    right: 'משמעות והשפעה',
  },
  independenceVsTeam: {
    left: 'עצמאות',
    right: 'שייכות ועבודת צוות',
  },
  growthVsStability: {
    left: 'צמיחה מתמדת',
    right: 'יציבות',
  },
  prestigeVsMeaning: {
    left: 'קריירה מוכרת ומוערכת',
    right: 'דרך אישית ונכונה לך',
  },
};

interface CategoryMeta {
  name: string;
  description: string;
  marketDemand: RecommendedField['marketDemand'];
  aiResilience: RecommendedField['aiResilience'];
  aiResilienceNote: string;
  dailyWorkflow: string;
  soloFriendly: boolean;
  requiresSoloInvestigative?: boolean;
  valueSignals?: Partial<Record<keyof ValuesProfile, 1 | -1>>;
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  'הנדסה וטכנולוגיה': {
    name: 'הנדסת תוכנה ומחשבים',
    description: 'פיתוח מערכות, אלגוריתמים וארכיטקטורת תוכנה',
    marketDemand: 'גבוה מאוד',
    aiResilience: 'גבוהה',
    aiResilienceNote: 'מפתח שמבין מה ה-AI עושה מתחת למנוע — ולא רק משתמש בו — יישאר בלתי ניתן להחלפה',
    dailyWorkflow: 'כתיבת קוד, קוד ריביו, ספרינטים, דיבאגינג, תיכנון ארכיטקטורה',
    soloFriendly: true,
    requiresSoloInvestigative: true,
    valueSignals: { incomeVsImpact: -1, independenceVsTeam: -1, growthVsStability: -1 },
  },
  'מדעי המחשב': {
    name: 'מדעי המחשב ותוכנה',
    description: 'פיתוח תוכנה, אלגוריתמים ומחשוב תיאורטי',
    marketDemand: 'גבוה מאוד',
    aiResilience: 'גבוהה',
    aiResilienceNote: 'מפתחים שמבינים עומק — לא רק פלט — יישארו רלוונטיים עם ה-AI',
    dailyWorkflow: 'כתיבת קוד, ביקורות קוד, ספרינטים, דיבאגינג, ארכיטקטורה',
    soloFriendly: true,
    requiresSoloInvestigative: true,
    valueSignals: { incomeVsImpact: -1, independenceVsTeam: -1, growthVsStability: -1 },
  },
  'הנדסה': {
    name: 'הנדסה קלאסית',
    description: 'חשמל, מכניקה ואינפרסטרוקטורה פיזית',
    marketDemand: 'גבוה',
    aiResilience: 'גבוהה',
    aiResilienceNote: 'תכנון פיזי, הבנת חומרים ועבודה בשטח לא ניתנים לאוטומציה מלאה',
    dailyWorkflow: 'CAD, סימולציות, מעבדות, עבודה עם ספקים ובניית אב-טיפוסים',
    soloFriendly: true,
    requiresSoloInvestigative: true,
    valueSignals: { incomeVsImpact: -1, growthVsStability: -1 },
  },
  'מדעי החברה': {
    name: 'מדעי החברה והבריאות',
    description: 'פסיכולוגיה, יעוץ, טיפול ועבודה סוציאלית',
    marketDemand: 'גבוה',
    aiResilience: 'גבוהה',
    aiResilienceNote: 'אמפתיה, ברית טיפולית ותקשורת אנושית הם בלתי ניתנים לאוטומציה',
    dailyWorkflow: 'פגישות מטופלים, הדרכות, עבודה קלינית, כתיבת דוחות',
    soloFriendly: false,
    valueSignals: { incomeVsImpact: 1, independenceVsTeam: 1, prestigeVsMeaning: 1 },
  },
  'משפטים': {
    name: 'משפטים ומדיניות',
    description: 'ייעוץ משפטי, ייצוג ופרקטיקה עסקית',
    marketDemand: 'בינוני',
    aiResilience: 'בינונית',
    aiResilienceNote: 'שיקול דעת משפטי ותקשורת בפני ערכאות נשארים אנושיים; מחקר פסיקה מתאמט',
    dailyWorkflow: 'כתיבת בריפים, ישיבות לקוח, דיונים בבית משפט, חקר פסיקה',
    soloFriendly: false,
    valueSignals: { incomeVsImpact: -1, independenceVsTeam: 1, prestigeVsMeaning: -1 },
  },
  'כלכלה ועסקים': {
    name: 'כלכלה, עסקים וניהול',
    description: 'ניהול ארגוני, יזמות, פיננסים וכלכלה',
    marketDemand: 'גבוה',
    aiResilience: 'בינונית',
    aiResilienceNote: 'ניהול אנשים, משא ומתן ואסטרטגיה ארגונית לא ניתנים לאוטומציה מלאה',
    dailyWorkflow: 'פגישות ניהוליות, ניתוח עסקי, תיאום בין-מחלקתי, קבלת החלטות',
    soloFriendly: false,
    valueSignals: { incomeVsImpact: -1, independenceVsTeam: 1, prestigeVsMeaning: -1 },
  },
  'מדעי החיים': {
    name: 'מדעי החיים והביולוגיה',
    description: 'מחקר ביולוגי, ביוטכנולוגיה ומדעי הטבע',
    marketDemand: 'גבוה',
    aiResilience: 'גבוהה',
    aiResilienceNote: 'ניסויים, הבנה מדעית ופרשנות ביולוגית דורשים מוח אנושי',
    dailyWorkflow: 'עבודת מעבדה, ניסויים, ניתוח נתונים, כתיבת מאמרים',
    soloFriendly: true,
    requiresSoloInvestigative: true,
    valueSignals: { incomeVsImpact: 1, growthVsStability: -1 },
  },
  'מדעי הבריאות': {
    name: 'מדעי הבריאות והסיעוד',
    description: 'טיפול בחולים, סיעוד ומקצועות פרא-רפואיים',
    marketDemand: 'גבוה מאוד',
    aiResilience: 'גבוהה',
    aiResilienceNote: 'מגע אנושי, אמפתיה וקבלת החלטות קליניות בשטח — לא ניתנים לאוטומציה',
    dailyWorkflow: 'טיפול בחולים, עבודת צוות, שמירת תיעוד, תיאום עם רופאים',
    soloFriendly: false,
    valueSignals: { incomeVsImpact: 1, independenceVsTeam: 1, prestigeVsMeaning: 1 },
  },
  'רפואה': {
    name: 'רפואה',
    description: 'לימודי רפואה, אבחון קליני וטיפול',
    marketDemand: 'גבוה מאוד',
    aiResilience: 'גבוהה',
    aiResilienceNote: 'AI מסייע לאבחון, אך שיקול דעת קליני ואמון המטופל יישארו אנושיים לחלוטין',
    dailyWorkflow: 'ויזיטות, מיון, ניתוחים, עבודת צוות רפואי, עדכון תיקים',
    soloFriendly: false,
    valueSignals: { incomeVsImpact: 1, independenceVsTeam: 1, prestigeVsMeaning: -1 },
  },
  'אמנות ועיצוב': {
    name: 'אמנות, עיצוב ויצירה',
    description: 'ציור, צילום, עיצוב גרפי, קולנוע ואנימציה',
    marketDemand: 'בינוני',
    aiResilience: 'בינונית',
    aiResilienceNote: 'יצירתיות אנושית וקול אמנותי ייחודי נשארים בשוק; חלק מהטכניקות מתאמטות',
    dailyWorkflow: 'עבודת סטודיו, פרויקטים יצירתיים, הצגת עבודות ללקוחות, שיתופי פעולה',
    soloFriendly: true,
    valueSignals: { independenceVsTeam: -1, growthVsStability: -1, prestigeVsMeaning: 1 },
  },
  'קולינריה וגסטרונומיה': {
    name: 'קולינריה וגסטרונומיה',
    description: 'בישול, אפייה וניהול מטבח מקצועי',
    marketDemand: 'גבוה',
    aiResilience: 'גבוהה',
    aiResilienceNote: 'מגע עם אוכל, יצירתיות קולינרית וחוויית אורח — לא ניתנים לשכפול דיגיטלי',
    dailyWorkflow: 'הכנת מנות, ניהול מטבח, פיתוח תפריטים, עבודה עם ספקים',
    soloFriendly: false,
    valueSignals: { independenceVsTeam: 1, growthVsStability: -1, prestigeVsMeaning: 1 },
  },
  'רפואה אינטגרטיבית': {
    name: 'רפואה אינטגרטיבית',
    description: 'רפואה סינית, הומאופתיה, נטורופתיה וטיפולים משלימים',
    marketDemand: 'בינוני',
    aiResilience: 'גבוהה',
    aiResilienceNote: 'טיפול הוליסטי, מגע ואמון מטופל — לא ניתנים לאוטומציה',
    dailyWorkflow: 'פגישות מטופלים, טיפולים, בניית תוכנית טיפול, מעקב',
    soloFriendly: false,
    valueSignals: { incomeVsImpact: 1, independenceVsTeam: 1, prestigeVsMeaning: 1 },
  },
  'טכנולוגיה ופיתוח': {
    name: 'טכנולוגיה, פיתוח וסייבר',
    description: 'בוטקאמפים מעשיים: פולסטאק, סייבר, דאטה ו-DevOps',
    marketDemand: 'גבוה מאוד',
    aiResilience: 'גבוהה',
    aiResilienceNote: "מפתחים שמדברים שפת AI — ולא רק משתמשים בו — יישארו מבוקשים",
    dailyWorkflow: "כתיבת קוד, בניית מוצרים, עבודה בצוות אג'ייל, דיפלוי לענן",
    soloFriendly: true,
    requiresSoloInvestigative: true,
    valueSignals: { incomeVsImpact: -1, independenceVsTeam: -1, growthVsStability: -1 },
  },
};

const CATEGORY_AVOIDANCE: Record<string, AvoidanceTag[]> = {
  'הנדסה וטכנולוגיה': ['heavy-math', 'solo-work'],
  'מדעי המחשב': ['heavy-math', 'solo-work'],
  'הנדסה': ['heavy-math'],
  'מדעי החברה': ['heavy-reading'],
  'משפטים': ['heavy-reading', 'bureaucracy'],
  'כלכלה ועסקים': ['heavy-math'],
  'מדעי החיים': ['heavy-reading', 'solo-work'],
  'מדעי הבריאות': ['bureaucracy'],
  'רפואה': ['heavy-reading', 'bureaucracy'],
  'אמנות ועיצוב': [],
  'קולינריה וגסטרונומיה': [],
  'רפואה אינטגרטיבית': ['bureaucracy'],
  'טכנולוגיה ופיתוח': ['heavy-math', 'solo-work'],
};

function dotProduct(user: ProfileScores, program: Program): number {
  return PROFILE_DIMS.reduce((sum, dim) => sum + user[dim] * program.profileScore[dim], 0);
}

function topUserDims(scores: ProfileScores): [ProfileDimension, ProfileDimension] {
  const sorted = (Object.entries(scores) as [ProfileDimension, number][])
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);
  return [sorted[0]?.[0] ?? 'AN', sorted[1]?.[0] ?? 'OR'];
}

function buildWarning(
  meta: CategoryMeta,
  scores: ProfileScores,
  env: EnvironmentPreference
): { hasWarning: boolean; warningText?: string } {
  if (!meta.requiresSoloInvestigative) return { hasWarning: false };

  const investigativeStrength = Math.max(scores.AN, scores.DI, scores.ER);
  const socialDominant = scores.SO >= 4 && scores.SO > investigativeStrength;
  const teamOriented = env.soloScore <= 1;
  const lowInvestigative = investigativeStrength <= 2;

  if (socialDominant && teamOriented && lowInvestigative) {
    return {
      hasWarning: true,
      warningText:
        'שים/י לב: הפרופיל שלך חברתי ומוכוון-צוות בעיקרו. תחום זה דורש עבודה עצמאית ממושכת ועיסוק אנליטי-טכני עמוק. ייתכן שתחומים עם יותר אינטראקציה אנושית יתאימו לך טוב יותר.',
    };
  }

  return { hasWarning: false };
}

function buildValueReason(values: ValuesProfile, meta: CategoryMeta): string | null {
  const signals = meta.valueSignals;
  if (!signals) return null;

  let best:
    | {
        key: keyof ValuesProfile;
        direction: 1 | -1;
        alignment: number;
      }
    | null = null;

  for (const key of VALUE_KEYS) {
    const direction = signals[key];
    if (!direction) continue;

    const alignment = values[key] * direction;
    if (alignment <= 0) continue;

    if (!best || alignment > best.alignment) {
      best = { key, direction, alignment };
    }
  }

  if (!best || best.alignment < 1) return null;

  const labels = VALUE_LABELS[best.key];
  const label = best.direction === 1 ? labels.right : labels.left;
  return `הכיוון הזה מתחבר גם להעדפה שלך ל${label}.`;
}

function scoreValueAlignment(values: ValuesProfile, meta: CategoryMeta): number {
  const signals = meta.valueSignals;
  if (!signals) return 0;

  let bonus = 0;
  for (const key of VALUE_KEYS) {
    const direction = signals[key];
    if (!direction) continue;
    bonus += values[key] * direction;
  }

  // Keep values as a ranking nudge instead of the primary score driver.
  return bonus * 2;
}

function buildMatchReason(
  matched: ProfileDimension[],
  values: ValuesProfile,
  meta: CategoryMeta
): string {
  const baseReason =
    matched.length === 0
      ? 'תחום זה משלים כישורים נוספים שיעשירו את הפרופיל שלך'
      : matched.length === 1
        ? `הנטייה ה${PROFILE_DIM_LABELS[matched[0]].nameF} שלך מתאימה במיוחד לתחום הזה`
        : `הפרופיל ה${matched.map((d) => PROFILE_DIM_LABELS[d].name).join('-')} שלך הוא התאמה מצוינת לתחום הזה`;

  const valueReason = buildValueReason(values, meta);
  return valueReason ? `${baseReason}. ${valueReason}` : baseReason;
}

export function getRecommendations(
  scores: ProfileScores,
  values: ValuesProfile = NEUTRAL_VALUES,
  env: EnvironmentPreference = NEUTRAL_ENV,
  avoidances: AvoidanceTag[] = [],
  programs: Program[] = allPrograms
): RecommendedField[] {
  type Scored = { program: Program; score: number };

  const scored: Scored[] = programs
    .filter((program) => program.institution !== 'אוניברסיטה')
    .map((program) => ({
      program,
      score: dotProduct(scores, program),
    }));

  const byCategory = new Map<string, { programs: Scored[]; catScore: number }>();
  for (const scoredProgram of scored) {
    const category = scoredProgram.program.category;
    if (!CATEGORY_META[category]) continue;

    const existing = byCategory.get(category);
    if (!existing) {
      byCategory.set(category, { programs: [scoredProgram], catScore: scoredProgram.score });
      continue;
    }

    existing.programs.push(scoredProgram);
    if (scoredProgram.score > existing.catScore) {
      existing.catScore = scoredProgram.score;
    }
  }

  for (const [category, data] of byCategory) {
    const meta = CATEGORY_META[category];
    if (meta.soloFriendly && env.soloScore >= 2) data.catScore += 15;
    if (!meta.soloFriendly && env.soloScore <= 1) data.catScore += 15;
    data.catScore += scoreValueAlignment(values, meta);
  }

  if (avoidances.length > 0) {
    for (const [category, data] of byCategory) {
      const categoryAvoidances = CATEGORY_AVOIDANCE[category] ?? [];
      const overlaps = avoidances.filter((tag) => categoryAvoidances.includes(tag)).length;
      if (overlaps > 0) {
        data.catScore *= Math.pow(0.6, overlaps);
      }
    }
  }

  const [primary, secondary] = topUserDims(scores);
  const topCategories = [...byCategory.entries()]
    .sort((a, b) => b[1].catScore - a[1].catScore)
    .slice(0, 5);

  return topCategories.map(([category, data]) => {
    const meta = CATEGORY_META[category];

    const topPrograms: Program[] = [];
    const seenFields = new Set<string>();
    for (const scoredProgram of [...data.programs].sort((a, b) => b.score - a.score)) {
      const fieldKey = PROGRAM_FIELD_MAP[scoredProgram.program.id] ?? scoredProgram.program.id;
      if (seenFields.has(fieldKey)) continue;

      seenFields.add(fieldKey);
      topPrograms.push(scoredProgram.program);
      if (topPrograms.length === 3) break;
    }

    const avgDimScore = (dim: ProfileDimension) =>
      topPrograms.reduce((sum, program) => sum + program.profileScore[dim], 0) / topPrograms.length;
    const matchedDimensions = ([primary, secondary] as ProfileDimension[]).filter(
      (dim) => avgDimScore(dim) >= 3
    );

    const { hasWarning, warningText } = buildWarning(meta, scores, env);
    const matchReason = buildMatchReason(matchedDimensions, values, meta);

    return {
      id: category,
      name: meta.name,
      description: meta.description,
      suggestedDegreeIds: topPrograms.map((program) => program.id),
      score: data.catScore,
      matchedDimensions,
      matchReason,
      marketDemand: meta.marketDemand,
      aiResilience: meta.aiResilience,
      aiResilienceNote: meta.aiResilienceNote,
      dailyWorkflow: meta.dailyWorkflow,
      hasWarning: hasWarning || undefined,
      warningText: warningText || undefined,
    } satisfies RecommendedField;
  });
}
