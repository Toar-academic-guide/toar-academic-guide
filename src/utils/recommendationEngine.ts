import { RiasecDimension, RiasecScores, EnvironmentPreference, RecommendedField } from '@/types';
import { getTopDimensions, DIMENSION_LABELS } from './riasecEngine';

interface FieldDefinition {
  id: string;
  name: string;
  description: string;
  suggestedDegreeIds: string[];
  primaryDimensions: RiasecDimension[];
  soloFriendly: boolean;
  marketDemand: RecommendedField['marketDemand'];
  aiResilience: RecommendedField['aiResilience'];
  aiResilienceNote: string;
  dailyWorkflow: string;
  requiresSoloInvestigative?: boolean; // triggers warning for S-dominant / team-oriented users
}

const FIELDS: FieldDefinition[] = [
  {
    id: 'cs_engineering',
    name: 'הנדסת תוכנה ומחשבים',
    description: 'פיתוח מערכות, אלגוריתמים וארכיטקטורת תוכנה',
    suggestedDegreeIds: ['cs', 'ee'],
    primaryDimensions: ['I', 'R', 'C'],
    soloFriendly: true,
    marketDemand: 'גבוה מאוד',
    aiResilience: 'גבוהה',
    aiResilienceNote: 'מפתח שמבין מה ה-AI עושה מתחת למנוע — ולא רק משתמש בו — יישאר בלתי ניתן להחלפה',
    dailyWorkflow: 'כתיבת קוד, קוד ריביו, ספרינטים, דיבאגינג, תיכנון ארכיטקטורה',
    requiresSoloInvestigative: true,
  },
  {
    id: 'data_science',
    name: 'מדעי הנתונים וסטטיסטיקה',
    description: 'ניתוח נתונים, מודלים סטטיסטיים ולמידת מכונה',
    suggestedDegreeIds: ['datascience', 'economics'],
    primaryDimensions: ['I', 'C', 'R'],
    soloFriendly: true,
    marketDemand: 'גבוה מאוד',
    aiResilience: 'גבוהה',
    aiResilienceNote: 'ה-AI מייצר נתונים שמישהו חייב להבין ולפרש — פרשנות אנושית נשארת קריטית',
    dailyWorkflow: 'ניתוח מערכות נתונים, בניית מודלים, דשבורדים, הצגת תובנות להנהלה',
    requiresSoloInvestigative: true,
  },
  {
    id: 'social_science',
    name: 'מדעי החברה והבריאות',
    description: 'פסיכולוגיה, יעוץ, טיפול ומחקר התנהגותי',
    suggestedDegreeIds: ['psychology'],
    primaryDimensions: ['S', 'I', 'A'],
    soloFriendly: false,
    marketDemand: 'גבוה',
    aiResilience: 'גבוהה',
    aiResilienceNote: 'אמפתיה, ברית טיפולית ותקשורת אנושית הם בלתי ניתנים לאוטומציה',
    dailyWorkflow: 'פגישות מטופלים, הדרכות, עבודה קלינית, כתיבת דוחות',
  },
  {
    id: 'medicine',
    name: 'רפואה ומדעי הבריאות',
    description: 'לימודי רפואה, אבחון קליני וטיפול',
    suggestedDegreeIds: ['medicine'],
    primaryDimensions: ['I', 'S', 'R'],
    soloFriendly: false,
    marketDemand: 'גבוה מאוד',
    aiResilience: 'גבוהה',
    aiResilienceNote: 'AI מסייע לאבחון, אך שיקול דעת קליני ואמון המטופל יישארו אנושיים לחלוטין',
    dailyWorkflow: 'ויזיטות, מיון, ניתוחים, עבודת צוות רפואי, עדכון תיקים',
  },
  {
    id: 'law_policy',
    name: 'משפטים ומדיניות',
    description: 'ייעוץ משפטי, ייצוג ופרקטיקה עסקית',
    suggestedDegreeIds: ['law'],
    primaryDimensions: ['E', 'S', 'C'],
    soloFriendly: false,
    marketDemand: 'בינוני',
    aiResilience: 'בינונית',
    aiResilienceNote: 'שיקול דעת משפטי ותקשורת בפני ערכאות נשארים אנושיים; מחקר פסיקה מתאמט',
    dailyWorkflow: 'כתיבת בריפים, ישיבות לקוח, דיונים בבית משפט, חקר פסיקה',
  },
  {
    id: 'business_management',
    name: 'עסקים וניהול',
    description: 'ניהול ארגוני, יזמות, פיננסים ואסטרטגיה',
    suggestedDegreeIds: ['business'],
    primaryDimensions: ['E', 'C', 'S'],
    soloFriendly: false,
    marketDemand: 'גבוה',
    aiResilience: 'בינונית',
    aiResilienceNote: 'ניהול אנשים, משא ומתן ואסטרטגיה ארגונית לא ניתנים לאוטומציה מלאה',
    dailyWorkflow: 'פגישות ניהוליות, ניתוח עסקי, תיאום בין-מחלקתי, קבלת החלטות',
  },
  {
    id: 'economics_finance',
    name: 'כלכלה ומימון',
    description: 'מדיניות כלכלית, שוקי הון ומחקר כלכלי',
    suggestedDegreeIds: ['economics'],
    primaryDimensions: ['I', 'C', 'E'],
    soloFriendly: true,
    marketDemand: 'גבוה',
    aiResilience: 'בינונית',
    aiResilienceNote: 'מחקר כלכלי ופרשנות נשארים בידי אנשים; חלק מהניתוחים השגרתיים יתאמטו',
    dailyWorkflow: 'ניתוח נתונים כלכליים, בניית מודלים, ייעוץ למנהלים, עבודה עם שוקי הון',
    requiresSoloInvestigative: true,
  },
  {
    id: 'mechanical_engineering',
    name: 'הנדסה מכנית ואנרגיה',
    description: 'עיצוב מכונות, תרמודינמיקה ומערכות פיזיקליות',
    suggestedDegreeIds: ['me'],
    primaryDimensions: ['R', 'I'],
    soloFriendly: true,
    marketDemand: 'גבוה',
    aiResilience: 'גבוהה',
    aiResilienceNote: 'תכנון מכני, הבנת חומרים ועבודה בשטח לא ניתנים לאוטומציה מלאה',
    dailyWorkflow: 'CAD, סימולציות, מעבדות, עבודה עם ספקים ובניית אב-טיפוסים',
    requiresSoloInvestigative: true,
  },
];

function matchScore(
  field: FieldDefinition,
  topDimensions: [RiasecDimension, RiasecDimension],
  scores: RiasecScores,
  env: EnvironmentPreference
): number {
  const [primary, secondary] = topDimensions;
  let score = 0;

  if (field.primaryDimensions.includes(primary)) score += 3;
  if (field.primaryDimensions.includes(secondary)) score += 2;

  for (const dim of field.primaryDimensions) {
    score += scores[dim] * 0.3;
  }

  if (field.soloFriendly && env.soloScore >= 2) score += 1;
  if (!field.soloFriendly && env.soloScore <= 1) score += 1;

  return score;
}

function buildWarning(
  field: FieldDefinition,
  scores: RiasecScores,
  env: EnvironmentPreference
): { hasWarning: boolean; warningText?: string } {
  if (!field.requiresSoloInvestigative) return { hasWarning: false };

  const socialDominant = scores.S >= 4 && scores.S > scores.I;
  const teamOriented = env.soloScore <= 1;
  const lowInvestigative = scores.I <= 2;

  if (socialDominant && teamOriented && lowInvestigative) {
    return {
      hasWarning: true,
      warningText:
        'שים/י לב: הפרופיל שלך חברתי ומוכוון-צוות בעיקרו. תחום זה דורש עבודה עצמאית ממושכת ועיסוק אנליטי-טכני עמוק. ייתכן שתחומים עם יותר אינטראקציה אנושית יתאימו לך טוב יותר.',
    };
  }

  return { hasWarning: false };
}

function buildMatchReason(
  field: FieldDefinition,
  topDimensions: [RiasecDimension, RiasecDimension]
): string {
  const [primary, secondary] = topDimensions;
  const matched = field.primaryDimensions.filter((d) => d === primary || d === secondary);

  if (matched.length === 0) return 'תחום זה משלים כישורים נוספים שיעשירו את הפרופיל שלך';

  const names = matched.map((d) => DIMENSION_LABELS[d].name);
  if (names.length === 1) return `הנטייה ה${names[0]} שלך מתאימה במיוחד לתחום הזה`;
  return `הפרופיל ה${names.join('-')} שלך הוא התאמה מצוינת לתחום הזה`;
}

export function getRecommendations(
  scores: RiasecScores,
  env: EnvironmentPreference
): RecommendedField[] {
  const topDimensions = getTopDimensions(scores);

  return FIELDS.map((field) => {
    const score = matchScore(field, topDimensions, scores, env);
    const { hasWarning, warningText } = buildWarning(field, scores, env);
    const matchReason = buildMatchReason(field, topDimensions);
    const matchedDimensions = field.primaryDimensions.filter(
      (d) => d === topDimensions[0] || d === topDimensions[1]
    );

    return {
      id: field.id,
      name: field.name,
      description: field.description,
      suggestedDegreeIds: field.suggestedDegreeIds,
      score,
      matchedDimensions,
      matchReason,
      marketDemand: field.marketDemand,
      aiResilience: field.aiResilience,
      aiResilienceNote: field.aiResilienceNote,
      dailyWorkflow: field.dailyWorkflow,
      hasWarning: hasWarning || undefined,
      warningText: warningText || undefined,
    } satisfies RecommendedField;
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
