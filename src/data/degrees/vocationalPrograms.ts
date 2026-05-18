import type { Program } from './types';

// ── RIASEC reference profiles (Holland Occupational Themes, 0–5 scale) ───────
// Vocational / creative disciplines. Artistic (A) dominates design tracks;
// Investigative (I) dominates technical tracks; Social (S) dominates therapy.
const R: Record<string, Program['riasecScore']> = {
  // ── Arts & Design ──────────────────────────────────────────────────────────
  industrialDesign: { R: 3, I: 2, A: 5, S: 1, E: 2, C: 2 },
  fineArts:         { R: 1, I: 1, A: 5, S: 1, E: 2, C: 1 },
  photography:      { R: 2, I: 1, A: 5, S: 2, E: 2, C: 1 },
  fashion:          { R: 2, I: 1, A: 5, S: 1, E: 3, C: 2 },
  graphicDesign:    { R: 1, I: 2, A: 5, S: 1, E: 2, C: 2 },
  animation:        { R: 2, I: 3, A: 5, S: 1, E: 2, C: 2 },
  dance:            { R: 3, I: 0, A: 5, S: 3, E: 2, C: 1 },
  cinema:           { R: 2, I: 2, A: 5, S: 2, E: 3, C: 1 },
  screenwriting:    { R: 0, I: 2, A: 5, S: 2, E: 3, C: 1 },
  documentary:      { R: 1, I: 3, A: 5, S: 3, E: 2, C: 1 },
  // ── Culinary ───────────────────────────────────────────────────────────────
  chef:             { R: 3, I: 1, A: 4, S: 2, E: 2, C: 2 },
  pastry:           { R: 3, I: 1, A: 4, S: 1, E: 2, C: 3 },
  restaurantMgmt:   { R: 1, I: 2, A: 2, S: 3, E: 4, C: 3 },
  culinaryArts:     { R: 3, I: 2, A: 5, S: 2, E: 2, C: 2 },
  // ── Integrative Medicine ───────────────────────────────────────────────────
  chineseMedicine:  { R: 2, I: 3, A: 1, S: 4, E: 1, C: 2 },
  homeopathy:       { R: 1, I: 3, A: 1, S: 4, E: 1, C: 2 },
  psychotherapy:    { R: 0, I: 3, A: 2, S: 5, E: 1, C: 1 },
  naturopathy:      { R: 2, I: 3, A: 1, S: 4, E: 1, C: 2 },
  reflexology:      { R: 2, I: 2, A: 1, S: 4, E: 1, C: 2 },
  // ── Tech Bootcamps ─────────────────────────────────────────────────────────
  fullstack:        { R: 2, I: 4, A: 2, S: 1, E: 2, C: 3 },
  cyber:            { R: 3, I: 5, A: 1, S: 0, E: 2, C: 3 },
  dataAnalysis:     { R: 1, I: 5, A: 0, S: 0, E: 2, C: 4 },
  cloudDevOps:      { R: 2, I: 4, A: 0, S: 1, E: 2, C: 4 },
};

export const vocationalPrograms: Program[] = [

  // ════════════════════════════════════════════════════════════════════════════
  // ARTS & DESIGN
  // ════════════════════════════════════════════════════════════════════════════

  // ── בצלאל – אקדמיה לאמנות ועיצוב ירושלים ──────────────────────────────────
  // CHE-accredited institution granting BFA/BDes degrees.
  {
    id: 'bezalel_industrial_design',
    name: 'עיצוב תעשייתי',
    institution: 'בצלאל – אקדמיה לאמנות ועיצוב ירושלים',
    type: 'academic',
    category: 'אמנות ועיצוב',
    riasecScore: R.industrialDesign,
    admissionType: 'requirements',
    admissionRequirements: [
      'תיק עבודות יצירתי',
      'מבחן כניסה מקצועי חד-יומי',
      'ראיון אישי עם ועדת קבלה',
    ],
  },
  {
    id: 'bezalel_fine_arts',
    name: 'אמנות',
    institution: 'בצלאל – אקדמיה לאמנות ועיצוב ירושלים',
    type: 'academic',
    category: 'אמנות ועיצוב',
    riasecScore: R.fineArts,
    admissionType: 'requirements',
    admissionRequirements: [
      'תיק עבודות יצירתי',
      'מבחן כניסה',
      'ראיון קבלה',
    ],
  },
  {
    id: 'bezalel_photography',
    name: 'צילום',
    institution: 'בצלאל – אקדמיה לאמנות ועיצוב ירושלים',
    type: 'academic',
    category: 'אמנות ועיצוב',
    riasecScore: R.photography,
    admissionType: 'requirements',
    admissionRequirements: [
      'תיק עבודות – סדרת צילומים מקורית',
      'מבחן כניסה',
      'ראיון קבלה',
    ],
  },
  {
    id: 'bezalel_fashion',
    name: 'עיצוב אופנה',
    institution: 'בצלאל – אקדמיה לאמנות ועיצוב ירושלים',
    type: 'academic',
    category: 'אמנות ועיצוב',
    riasecScore: R.fashion,
    admissionType: 'requirements',
    admissionRequirements: [
      'תיק עבודות',
      'מבחן תפירה ועיצוב בסיסי',
      'ראיון קבלה',
    ],
  },

  // ── שנקר – הנדסה. עיצוב. אמנות ─────────────────────────────────────────────
  // CHE-accredited; runs competitive entrance exams across design tracks.
  {
    id: 'shenkar_industrial_design',
    name: 'עיצוב תעשייתי',
    institution: 'שנקר – הנדסה. עיצוב. אמנות',
    type: 'academic',
    category: 'אמנות ועיצוב',
    riasecScore: R.industrialDesign,
    admissionType: 'requirements',
    admissionRequirements: [
      'תיק עבודות',
      'מבחן כניסה מקצועי',
      'ראיון אישי',
    ],
  },
  {
    id: 'shenkar_fashion',
    name: 'עיצוב אופנה',
    institution: 'שנקר – הנדסה. עיצוב. אמנות',
    type: 'academic',
    category: 'אמנות ועיצוב',
    riasecScore: R.fashion,
    admissionType: 'requirements',
    admissionRequirements: [
      'תיק עבודות',
      'מבחן כניסה – יצירה וחשיבה עיצובית',
      'ראיון קבלה',
    ],
  },
  {
    id: 'shenkar_graphic_design',
    name: 'עיצוב גרפי ותקשורת חזותית',
    institution: 'שנקר – הנדסה. עיצוב. אמנות',
    type: 'academic',
    category: 'אמנות ועיצוב',
    riasecScore: R.graphicDesign,
    admissionType: 'requirements',
    admissionRequirements: [
      'תיק עבודות',
      'מבחן כניסה',
      'ראיון קבלה',
    ],
  },
  {
    id: 'shenkar_animation',
    name: 'אנימציה',
    institution: 'שנקר – הנדסה. עיצוב. אמנות',
    type: 'academic',
    category: 'אמנות ועיצוב',
    riasecScore: R.animation,
    admissionType: 'requirements',
    admissionRequirements: [
      'תיק עבודות – כולל ניסיון ציור ידני',
      'מבחן כניסה',
      'ראיון קבלה',
    ],
  },

  // ── מנשר לאמנות ─────────────────────────────────────────────────────────────
  // Tel Aviv art school offering certificate and diploma programs.
  {
    id: 'minshar_fine_arts',
    name: 'אמנות',
    institution: 'מנשר לאמנות',
    type: 'certificate',
    category: 'אמנות ועיצוב',
    riasecScore: R.fineArts,
    admissionType: 'requirements',
    admissionRequirements: [
      'תיק עבודות',
      'ראיון קבלה',
    ],
  },
  {
    id: 'minshar_photography',
    name: 'צילום',
    institution: 'מנשר לאמנות',
    type: 'certificate',
    category: 'אמנות ועיצוב',
    riasecScore: R.photography,
    admissionType: 'requirements',
    admissionRequirements: [
      'תיק עבודות – עבודות צילום מקוריות',
      'ראיון קבלה',
    ],
  },
  {
    id: 'minshar_animation',
    name: 'אנימציה ומדיה דיגיטלית',
    institution: 'מנשר לאמנות',
    type: 'certificate',
    category: 'אמנות ועיצוב',
    riasecScore: R.animation,
    admissionType: 'requirements',
    admissionRequirements: [
      'תיק עבודות',
      'מבחן כניסה',
      'ראיון קבלה',
    ],
  },
  {
    id: 'minshar_dance',
    name: 'ריקוד עכשווי',
    institution: 'מנשר לאמנות',
    type: 'certificate',
    category: 'אמנות ועיצוב',
    riasecScore: R.dance,
    admissionType: 'requirements',
    admissionRequirements: [
      'אודישן מעשי',
      'מבחן התאמה גופנית',
      'ראיון קבלה',
    ],
  },

  // ── בית הספר לקולנוע ולטלוויזיה ע"ש סם שפיגל ──────────────────────────────
  // Jerusalem film school; diploma programs in filmmaking, screenwriting,
  // and documentary.
  {
    id: 'samspiegel_cinema',
    name: 'קולנוע',
    institution: 'בית הספר לקולנוע ולטלוויזיה ע"ש סם שפיגל',
    type: 'certificate',
    category: 'אמנות ועיצוב',
    riasecScore: R.cinema,
    admissionType: 'requirements',
    admissionRequirements: [
      'בגרות מלאה',
      'פרויקט קולנועי קצר – גרעין סיפורי כתוב',
      'ראיון קבלה עם ועדה אמנותית',
    ],
  },
  {
    id: 'samspiegel_screenwriting',
    name: 'תסריטאות',
    institution: 'בית הספר לקולנוע ולטלוויזיה ע"ש סם שפיגל',
    type: 'certificate',
    category: 'אמנות ועיצוב',
    riasecScore: R.screenwriting,
    admissionType: 'requirements',
    admissionRequirements: [
      'תסריט קצר מקורי (עד 10 עמ׳)',
      'ראיון קבלה',
    ],
  },
  {
    id: 'samspiegel_documentary',
    name: 'קולנוע דוקומנטרי',
    institution: 'בית הספר לקולנוע ולטלוויזיה ע"ש סם שפיגל',
    type: 'certificate',
    category: 'אמנות ועיצוב',
    riasecScore: R.documentary,
    admissionType: 'requirements',
    admissionRequirements: [
      'פרויקט תיעודי קצר או מסמך פיתוח',
      'ראיון קבלה',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // CULINARY & GASTRONOMY
  // ════════════════════════════════════════════════════════════════════════════

  // ── מכון דנון לבישול ─────────────────────────────────────────────────────
  {
    id: 'danon_chef',
    name: 'שף מקצועי',
    institution: 'מכון דנון לבישול',
    type: 'vocational',
    category: 'קולינריה וגסטרונומיה',
    riasecScore: R.chef,
    admissionType: 'requirements',
    admissionRequirements: [
      'מבחן התאמה מעשי במטבח',
      'ראיון קבלה',
    ],
  },
  {
    id: 'danon_pastry',
    name: 'קונדיטוריה מקצועית',
    institution: 'מכון דנון לבישול',
    type: 'vocational',
    category: 'קולינריה וגסטרונומיה',
    riasecScore: R.pastry,
    admissionType: 'requirements',
    admissionRequirements: [
      'מבחן התאמה מעשי',
    ],
  },
  {
    id: 'danon_culinary_arts',
    name: 'אמנות קולינרית',
    institution: 'מכון דנון לבישול',
    type: 'vocational',
    category: 'קולינריה וגסטרונומיה',
    riasecScore: R.culinaryArts,
    admissionType: 'requirements',
    admissionRequirements: [
      'מבחן התאמה מעשי במטבח',
      'ראיון קבלה',
    ],
  },

  // ── בישולים – בית ספר ישראלי לאמנות הבישול ───────────────────────────────
  {
    id: 'bishulim_chef',
    name: 'שף מקצועי',
    institution: 'בישולים – בית ספר ישראלי לאמנות הבישול',
    type: 'vocational',
    category: 'קולינריה וגסטרונומיה',
    riasecScore: R.chef,
    admissionType: 'requirements',
    admissionRequirements: [
      'מבחן טעימה וזיהוי חומרי גלם',
      'ראיון קבלה',
    ],
  },
  {
    id: 'bishulim_pastry',
    name: 'פטיסרי ועוגות',
    institution: 'בישולים – בית ספר ישראלי לאמנות הבישול',
    type: 'vocational',
    category: 'קולינריה וגסטרונומיה',
    riasecScore: R.pastry,
    admissionType: 'requirements',
    admissionRequirements: [
      'מבחן התאמה מעשי',
    ],
  },
  {
    id: 'bishulim_restaurant_mgmt',
    name: 'ניהול מסעדות ואוכל',
    institution: 'בישולים – בית ספר ישראלי לאמנות הבישול',
    type: 'vocational',
    category: 'קולינריה וגסטרונומיה',
    riasecScore: R.restaurantMgmt,
    admissionType: 'requirements',
    admissionRequirements: [
      'ראיון קבלה',
      'ניסיון עבודה בתחום הקולינרי (יתרון)',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // INTEGRATIVE & ALTERNATIVE MEDICINE
  // ════════════════════════════════════════════════════════════════════════════

  // ── מכללת רידמן ─────────────────────────────────────────────────────────────
  // Israel's largest integrative medicine college; all programs lead to
  // a certified practitioner diploma.
  {
    id: 'reidman_chinese_medicine',
    name: 'רפואה סינית מסורתית',
    institution: 'מכללת רידמן',
    type: 'certificate',
    category: 'רפואה אינטגרטיבית',
    riasecScore: R.chineseMedicine,
    admissionType: 'requirements',
    admissionRequirements: [
      'בגרות מלאה',
      'ראיון קבלה',
    ],
  },
  {
    id: 'reidman_naturopathy',
    name: 'נטורופתיה',
    institution: 'מכללת רידמן',
    type: 'certificate',
    category: 'רפואה אינטגרטיבית',
    riasecScore: R.naturopathy,
    admissionType: 'requirements',
    admissionRequirements: [
      'בגרות מלאה',
      'ראיון קבלה',
    ],
  },
  {
    id: 'reidman_homeopathy',
    name: 'הומאופתיה',
    institution: 'מכללת רידמן',
    type: 'certificate',
    category: 'רפואה אינטגרטיבית',
    riasecScore: R.homeopathy,
    admissionType: 'requirements',
    admissionRequirements: [
      'בגרות מלאה',
      'ראיון קבלה',
    ],
  },
  {
    id: 'reidman_reflexology',
    name: 'רפלקסולוגיה',
    institution: 'מכללת רידמן',
    type: 'certificate',
    category: 'רפואה אינטגרטיבית',
    riasecScore: R.reflexology,
    admissionType: 'requirements',
    admissionRequirements: [
      'בגרות מלאה',
      'ראיון קבלה',
    ],
  },

  // ── מכללת ברושים ─────────────────────────────────────────────────────────────
  {
    id: 'broshim_homeopathy',
    name: 'הומאופתיה',
    institution: 'מכללת ברושים',
    type: 'certificate',
    category: 'רפואה אינטגרטיבית',
    riasecScore: R.homeopathy,
    admissionType: 'requirements',
    admissionRequirements: [
      'בגרות מלאה',
      'ראיון קבלה',
    ],
  },
  {
    id: 'broshim_psychotherapy',
    name: 'פסיכותרפיה אינטגרטיבית',
    institution: 'מכללת ברושים',
    type: 'certificate',
    category: 'רפואה אינטגרטיבית',
    riasecScore: R.psychotherapy,
    admissionType: 'requirements',
    admissionRequirements: [
      'תואר ראשון בכל תחום (יתרון לתחום טיפולי)',
      'ראיון קבלה אישי',
    ],
  },
  {
    id: 'broshim_naturopathy',
    name: 'נטורופתיה',
    institution: 'מכללת ברושים',
    type: 'certificate',
    category: 'רפואה אינטגרטיבית',
    riasecScore: R.naturopathy,
    admissionType: 'requirements',
    admissionRequirements: [
      'בגרות מלאה',
      'ראיון קבלה',
    ],
  },

  // ── המכללה האקדמית אונו – לימודי המשך ──────────────────────────────────────
  {
    id: 'ono_ce_chinese_medicine',
    name: 'רפואה סינית מסורתית',
    institution: 'המכללה האקדמית אונו – לימודי המשך',
    type: 'certificate',
    category: 'רפואה אינטגרטיבית',
    riasecScore: R.chineseMedicine,
    admissionType: 'requirements',
    admissionRequirements: [
      'בגרות מלאה',
      'בדיקה רפואית',
      'ראיון קבלה',
    ],
  },
  {
    id: 'ono_ce_psychotherapy',
    name: 'פסיכותרפיה אינטגרטיבית',
    institution: 'המכללה האקדמית אונו – לימודי המשך',
    type: 'certificate',
    category: 'רפואה אינטגרטיבית',
    riasecScore: R.psychotherapy,
    admissionType: 'requirements',
    admissionRequirements: [
      'תואר ראשון בכל תחום',
      'ראיון קבלה',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // TECHNICAL & BOOTCAMPS
  // ════════════════════════════════════════════════════════════════════════════

  // ── HackerU ──────────────────────────────────────────────────────────────────
  // Israel's largest tech bootcamp chain; intensive 6–12 month programs.
  {
    id: 'hackeru_fullstack',
    name: 'פיתוח Full-Stack',
    institution: 'HackerU',
    type: 'vocational',
    category: 'טכנולוגיה ופיתוח',
    riasecScore: R.fullstack,
    admissionType: 'requirements',
    admissionRequirements: [
      'מבחן התאמה טכני מקוון',
      'ראיון קבלה',
    ],
  },
  {
    id: 'hackeru_cyber',
    name: 'אבטחת מידע וסייבר',
    institution: 'HackerU',
    type: 'vocational',
    category: 'טכנולוגיה ופיתוח',
    riasecScore: R.cyber,
    admissionType: 'requirements',
    admissionRequirements: [
      'מבחן התאמה טכני',
      'ראיון קבלה',
    ],
  },
  {
    id: 'hackeru_data',
    name: 'אנליזת נתונים ו-BI',
    institution: 'HackerU',
    type: 'vocational',
    category: 'טכנולוגיה ופיתוח',
    riasecScore: R.dataAnalysis,
    admissionType: 'requirements',
    admissionRequirements: [
      'מבחן התאמה כמותי-לוגי',
      'ראיון קבלה',
    ],
  },

  // ── Elevation Academy ─────────────────────────────────────────────────────────
  // Cyber-first bootcamp; selective acceptance with technical screening.
  {
    id: 'elevation_cyber',
    name: 'סייבר הגנתי ומתקפי',
    institution: 'Elevation Academy',
    type: 'vocational',
    category: 'טכנולוגיה ופיתוח',
    riasecScore: R.cyber,
    admissionType: 'requirements',
    admissionRequirements: [
      'מבחן כניסה טכני',
      'ראיון טכני',
      'רקע בסיסי ברשתות ו/או תכנות',
    ],
  },
  {
    id: 'elevation_fullstack',
    name: 'פיתוח Full-Stack',
    institution: 'Elevation Academy',
    type: 'vocational',
    category: 'טכנולוגיה ופיתוח',
    riasecScore: R.fullstack,
    admissionType: 'requirements',
    admissionRequirements: [
      'מבחן כניסה',
      'ראיון טכני',
    ],
  },

  // ── Israel Tech Challenge (ITC) ──────────────────────────────────────────────
  // Selective data-science bootcamp targeting career changers.
  {
    id: 'itc_data_science',
    name: 'מדעי הנתונים',
    institution: 'Israel Tech Challenge (ITC)',
    type: 'vocational',
    category: 'טכנולוגיה ופיתוח',
    riasecScore: R.dataAnalysis,
    admissionType: 'requirements',
    admissionRequirements: [
      'מבחן כניסה כמותי',
      'ראיון',
      'יתרון לרקע אקדמי כמותי (מתמטיקה, סטטיסטיקה, פיזיקה)',
    ],
  },

  // ── ג'ון ברייס ──────────────────────────────────────────────────────────────
  // Veteran Israeli training center; structured certification programs.
  {
    id: 'johnbryce_cyber',
    name: 'אבטחת סייבר – מסלול מקצועי',
    institution: 'ג׳ון ברייס',
    type: 'vocational',
    category: 'טכנולוגיה ופיתוח',
    riasecScore: R.cyber,
    admissionType: 'requirements',
    admissionRequirements: [
      'מבחן כניסה',
      'ראיון קבלה',
    ],
  },
  {
    id: 'johnbryce_cloud_devops',
    name: 'Cloud & DevOps',
    institution: 'ג׳ון ברייס',
    type: 'vocational',
    category: 'טכנולוגיה ופיתוח',
    riasecScore: R.cloudDevOps,
    admissionType: 'requirements',
    admissionRequirements: [
      'מבחן כניסה',
      'ידע בסיסי בלינוקס ורשתות',
    ],
  },
];
