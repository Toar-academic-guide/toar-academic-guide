import { RiasecScores, EnvironmentPreference, RecommendedField, RiasecDimension } from '@/types';
import { allPrograms } from '@/data/degrees';
import type { Program } from '@/data/degrees/types';
import { DIMENSION_LABELS } from './riasecEngine';
import { PROGRAM_FIELD_MAP } from '@/data/degrees/fieldEnrichment';

interface CategoryMeta {
  name: string;
  description: string;
  marketDemand: RecommendedField['marketDemand'];
  aiResilience: RecommendedField['aiResilience'];
  aiResilienceNote: string;
  dailyWorkflow: string;
  soloFriendly: boolean;
  requiresSoloInvestigative?: boolean;
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
  },
  'מדעי החברה': {
    name: 'מדעי החברה והבריאות',
    description: 'פסיכולוגיה, יעוץ, טיפול ועבודה סוציאלית',
    marketDemand: 'גבוה',
    aiResilience: 'גבוהה',
    aiResilienceNote: 'אמפתיה, ברית טיפולית ותקשורת אנושית הם בלתי ניתנים לאוטומציה',
    dailyWorkflow: 'פגישות מטופלים, הדרכות, עבודה קלינית, כתיבת דוחות',
    soloFriendly: false,
  },
  'משפטים': {
    name: 'משפטים ומדיניות',
    description: 'ייעוץ משפטי, ייצוג ופרקטיקה עסקית',
    marketDemand: 'בינוני',
    aiResilience: 'בינונית',
    aiResilienceNote: 'שיקול דעת משפטי ותקשורת בפני ערכאות נשארים אנושיים; מחקר פסיקה מתאמט',
    dailyWorkflow: 'כתיבת בריפים, ישיבות לקוח, דיונים בבית משפט, חקר פסיקה',
    soloFriendly: false,
  },
  'כלכלה ועסקים': {
    name: 'כלכלה, עסקים וניהול',
    description: 'ניהול ארגוני, יזמות, פיננסים וכלכלה',
    marketDemand: 'גבוה',
    aiResilience: 'בינונית',
    aiResilienceNote: 'ניהול אנשים, משא ומתן ואסטרטגיה ארגונית לא ניתנים לאוטומציה מלאה',
    dailyWorkflow: 'פגישות ניהוליות, ניתוח עסקי, תיאום בין-מחלקתי, קבלת החלטות',
    soloFriendly: false,
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
  },
  'מדעי הבריאות': {
    name: 'מדעי הבריאות והסיעוד',
    description: 'טיפול בחולים, סיעוד ומקצועות פרא-רפואיים',
    marketDemand: 'גבוה מאוד',
    aiResilience: 'גבוהה',
    aiResilienceNote: 'מגע אנושי, אמפתיה וקבלת החלטות קליניות בשטח — לא ניתנים לאוטומציה',
    dailyWorkflow: 'טיפול בחולים, עבודת צוות, שמירת תיעוד, תיאום עם רופאים',
    soloFriendly: false,
  },
  'רפואה': {
    name: 'רפואה',
    description: 'לימודי רפואה, אבחון קליני וטיפול',
    marketDemand: 'גבוה מאוד',
    aiResilience: 'גבוהה',
    aiResilienceNote: 'AI מסייע לאבחון, אך שיקול דעת קליני ואמון המטופל יישארו אנושיים לחלוטין',
    dailyWorkflow: 'ויזיטות, מיון, ניתוחים, עבודת צוות רפואי, עדכון תיקים',
    soloFriendly: false,
  },
  'אמנות ועיצוב': {
    name: 'אמנות, עיצוב ויצירה',
    description: 'ציור, צילום, עיצוב גרפי, קולנוע ואנימציה',
    marketDemand: 'בינוני',
    aiResilience: 'בינונית',
    aiResilienceNote: 'יצירתיות אנושית וקול אמנותי ייחודי נשארים בשוק; חלק מהטכניקות מתאמטות',
    dailyWorkflow: 'עבודת סטודיו, פרויקטים יצירתיים, הצגת עבודות ללקוחות, שיתופי פעולה',
    soloFriendly: true,
  },
  'קולינריה וגסטרונומיה': {
    name: 'קולינריה וגסטרונומיה',
    description: 'בישול, אפייה וניהול מטבח מקצועי',
    marketDemand: 'גבוה',
    aiResilience: 'גבוהה',
    aiResilienceNote: 'מגע עם אוכל, יצירתיות קולינרית וחוויית אורח — לא ניתנים לשכפול דיגיטלי',
    dailyWorkflow: 'הכנת מנות, ניהול מטבח, פיתוח תפריטים, עבודה עם ספקים',
    soloFriendly: false,
  },
  'רפואה אינטגרטיבית': {
    name: 'רפואה אינטגרטיבית',
    description: 'רפואה סינית, הומאופתיה, נטורופתיה וטיפולים משלימים',
    marketDemand: 'בינוני',
    aiResilience: 'גבוהה',
    aiResilienceNote: 'טיפול הוליסטי, מגע ואמון מטופל — לא ניתנים לאוטומציה',
    dailyWorkflow: 'פגישות מטופלים, טיפולים, בניית תוכנית טיפול, מעקב',
    soloFriendly: false,
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
  },
};

const DIMS: RiasecDimension[] = ['R', 'I', 'A', 'S', 'E', 'C'];

function dotProduct(user: RiasecScores, program: Program['riasecScore']): number {
  return DIMS.reduce((sum, d) => sum + user[d] * program[d], 0);
}

function topUserDims(scores: RiasecScores): [RiasecDimension, RiasecDimension] {
  const sorted = DIMS.filter((d) => scores[d] > 0).sort((a, b) => scores[b] - scores[a]);
  return [sorted[0] ?? 'I', sorted[1] ?? 'C'];
}

function buildWarning(
  meta: CategoryMeta,
  scores: RiasecScores,
  env: EnvironmentPreference
): { hasWarning: boolean; warningText?: string } {
  if (!meta.requiresSoloInvestigative) return { hasWarning: false };
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
  matched: RiasecDimension[],
  top: [RiasecDimension, RiasecDimension]
): string {
  if (matched.length === 0) return 'תחום זה משלים כישורים נוספים שיעשירו את הפרופיל שלך';
  if (matched.length === 1) {
    // "נטייה" is feminine — use the feminine adjectival form (nameF)
    return `הנטייה ה${DIMENSION_LABELS[matched[0]].nameF} שלך מתאימה במיוחד לתחום הזה`;
  }
  const names = matched.map((d) => DIMENSION_LABELS[d].name);
  return `הפרופיל ה${names.join('-')} שלך הוא התאמה מצוינת לתחום הזה`;
}

export function getRecommendations(
  scores: RiasecScores,
  env: EnvironmentPreference
): RecommendedField[] {
  type Scored = { program: Program; score: number };

  // 1. Dot-product score every program (skip generic placeholder rows)
  const scored: Scored[] = allPrograms
    .filter((p) => p.institution !== 'אוניברסיטה')
    .map((p) => ({
      program: p,
      score: dotProduct(scores, p.riasecScore),
    }));

  // 2. Group by category; category score = max single-program score within it
  const byCategory = new Map<string, { programs: Scored[]; catScore: number }>();
  for (const s of scored) {
    const cat = s.program.category;
    if (!CATEGORY_META[cat]) continue;
    const existing = byCategory.get(cat);
    if (!existing) {
      byCategory.set(cat, { programs: [s], catScore: s.score });
    } else {
      existing.programs.push(s);
      if (s.score > existing.catScore) existing.catScore = s.score;
    }
  }

  // 3. Apply environment preference bonus
  for (const [cat, data] of byCategory) {
    const meta = CATEGORY_META[cat];
    if (meta.soloFriendly && env.soloScore >= 2) data.catScore += 15;
    if (!meta.soloFriendly && env.soloScore <= 1) data.catScore += 15;
  }

  // 4. Sort categories, keep top 5
  const [primary, secondary] = topUserDims(scores);
  const topCats = [...byCategory.entries()]
    .sort((a, b) => b[1].catScore - a[1].catScore)
    .slice(0, 5);

  // 5. Build one RecommendedField per top category
  return topCats.map(([cat, data]) => {
    const meta = CATEGORY_META[cat];

    // Top 3 programs per category, one representative per unique field key
    const topPrograms: Program[] = [];
    const seenFields = new Set<string>();
    for (const s of [...data.programs].sort((a, b) => b.score - a.score)) {
      const fk = PROGRAM_FIELD_MAP[s.program.id] ?? s.program.id;
      if (!seenFields.has(fk)) {
        seenFields.add(fk);
        topPrograms.push(s.program);
        if (topPrograms.length === 3) break;
      }
    }

    // Dimensions that are both top-user dims AND prominent in top programs (avg >= 3)
    const avgDimScore = (d: RiasecDimension) =>
      topPrograms.reduce((sum, p) => sum + p.riasecScore[d], 0) / topPrograms.length;
    const matchedDimensions = ([primary, secondary] as RiasecDimension[]).filter(
      (d) => avgDimScore(d) >= 3
    );

    const { hasWarning, warningText } = buildWarning(meta, scores, env);
    const matchReason = buildMatchReason(matchedDimensions, [primary, secondary]);

    return {
      id: cat,
      name: meta.name,
      description: meta.description,
      suggestedDegreeIds: topPrograms.map((p) => p.id),
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
