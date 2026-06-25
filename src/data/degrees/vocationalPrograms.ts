import type { Program, InstitutionDetail } from './types';

// ── 8-dimension profile reference (0–5 scale) ───────────────────────────────
// AN=Analytical  TE=Technical  CR=Creative  SO=Social
// LE=Leadership  OR=Organizational  DI=Digital/Tech  ER=Erudition
const P: Record<string, Program['profileScore']> = {
  // ── Arts & Design ──────────────────────────────────────────────────────────
  industrialDesign: { AN: 2, TE: 3, CR: 5, SO: 1, LE: 2, OR: 2, DI: 2, ER: 1 },
  fineArts: { AN: 1, TE: 1, CR: 5, SO: 1, LE: 2, OR: 1, DI: 0, ER: 2 },
  photography: { AN: 1, TE: 2, CR: 5, SO: 2, LE: 2, OR: 1, DI: 2, ER: 1 },
  fashion: { AN: 1, TE: 2, CR: 5, SO: 1, LE: 3, OR: 2, DI: 1, ER: 1 },
  graphicDesign: { AN: 2, TE: 1, CR: 5, SO: 1, LE: 2, OR: 2, DI: 3, ER: 1 },
  animation: { AN: 3, TE: 2, CR: 5, SO: 1, LE: 2, OR: 2, DI: 4, ER: 1 },
  dance: { AN: 0, TE: 3, CR: 5, SO: 3, LE: 2, OR: 1, DI: 0, ER: 1 },
  cinema: { AN: 2, TE: 2, CR: 5, SO: 2, LE: 3, OR: 1, DI: 2, ER: 2 },
  screenwriting: { AN: 2, TE: 0, CR: 5, SO: 2, LE: 3, OR: 1, DI: 0, ER: 4 },
  documentary: { AN: 3, TE: 1, CR: 5, SO: 3, LE: 2, OR: 1, DI: 1, ER: 3 },
  // ── Culinary ───────────────────────────────────────────────────────────────
  chef: { AN: 1, TE: 3, CR: 4, SO: 2, LE: 2, OR: 2, DI: 0, ER: 0 },
  pastry: { AN: 1, TE: 3, CR: 4, SO: 1, LE: 2, OR: 3, DI: 0, ER: 0 },
  restaurantMgmt: { AN: 2, TE: 1, CR: 2, SO: 3, LE: 4, OR: 3, DI: 1, ER: 1 },
  culinaryArts: { AN: 2, TE: 3, CR: 5, SO: 2, LE: 2, OR: 2, DI: 0, ER: 1 },
  // ── Integrative Medicine ───────────────────────────────────────────────────
  chineseMedicine: { AN: 3, TE: 2, CR: 1, SO: 4, LE: 1, OR: 2, DI: 0, ER: 3 },
  homeopathy: { AN: 3, TE: 1, CR: 1, SO: 4, LE: 1, OR: 2, DI: 0, ER: 3 },
  psychotherapy: { AN: 3, TE: 0, CR: 2, SO: 5, LE: 1, OR: 1, DI: 0, ER: 4 },
  naturopathy: { AN: 3, TE: 2, CR: 1, SO: 4, LE: 1, OR: 2, DI: 0, ER: 3 },
  reflexology: { AN: 2, TE: 2, CR: 1, SO: 4, LE: 1, OR: 2, DI: 0, ER: 2 },
  // ── Tech Bootcamps ─────────────────────────────────────────────────────────
  fullstack: { AN: 4, TE: 2, CR: 2, SO: 1, LE: 2, OR: 3, DI: 5, ER: 1 },
  cyber: { AN: 5, TE: 3, CR: 1, SO: 0, LE: 2, OR: 3, DI: 5, ER: 2 },
  dataAnalysis: { AN: 5, TE: 1, CR: 0, SO: 0, LE: 2, OR: 4, DI: 5, ER: 2 },
  cloudDevOps: { AN: 4, TE: 2, CR: 0, SO: 1, LE: 2, OR: 4, DI: 5, ER: 1 },
  // ── Music ──────────────────────────────────────────────────────────────────
  classicalMusic: { AN: 2, TE: 2, CR: 5, SO: 3, LE: 2, OR: 3, DI: 0, ER: 3 },
  jazzMusic: { AN: 3, TE: 2, CR: 5, SO: 3, LE: 2, OR: 2, DI: 0, ER: 2 },
  musicEducation: { AN: 2, TE: 1, CR: 5, SO: 4, LE: 2, OR: 2, DI: 0, ER: 2 },
  // ── Theater & Performing Arts ─────────────────────────────────────────────
  acting: { AN: 2, TE: 1, CR: 5, SO: 4, LE: 3, OR: 1, DI: 0, ER: 2 },
  directing: { AN: 3, TE: 1, CR: 5, SO: 3, LE: 4, OR: 2, DI: 0, ER: 2 },
  artEducation: { AN: 2, TE: 2, CR: 5, SO: 4, LE: 2, OR: 1, DI: 0, ER: 2 },
  // ── Sports & Physical Education ───────────────────────────────────────────
  sportsCoaching: { AN: 3, TE: 5, CR: 2, SO: 4, LE: 3, OR: 2, DI: 0, ER: 1 },
  physicalEd: { AN: 2, TE: 5, CR: 2, SO: 5, LE: 2, OR: 2, DI: 0, ER: 1 },
  // ── Tourism & Hospitality ─────────────────────────────────────────────────
  tourismMgmt: { AN: 2, TE: 2, CR: 3, SO: 4, LE: 4, OR: 3, DI: 1, ER: 1 },
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
    institutionId: 'bezalel',
    type: 'academic',
    category: 'אמנות ועיצוב',
    profileScore: P.industrialDesign,
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
    institutionId: 'bezalel',
    type: 'academic',
    category: 'אמנות ועיצוב',
    profileScore: P.fineArts,
    admissionType: 'requirements',
    admissionRequirements: ['תיק עבודות יצירתי', 'מבחן כניסה', 'ראיון קבלה'],
  },
  {
    id: 'bezalel_photography',
    name: 'צילום',
    institution: 'בצלאל – אקדמיה לאמנות ועיצוב ירושלים',
    institutionId: 'bezalel',
    type: 'academic',
    category: 'אמנות ועיצוב',
    profileScore: P.photography,
    admissionType: 'requirements',
    admissionRequirements: ['תיק עבודות – סדרת צילומים מקורית', 'מבחן כניסה', 'ראיון קבלה'],
  },
  {
    id: 'bezalel_fashion',
    name: 'עיצוב אופנה',
    institution: 'בצלאל – אקדמיה לאמנות ועיצוב ירושלים',
    institutionId: 'bezalel',
    type: 'academic',
    category: 'אמנות ועיצוב',
    profileScore: P.fashion,
    admissionType: 'requirements',
    admissionRequirements: ['תיק עבודות', 'מבחן תפירה ועיצוב בסיסי', 'ראיון קבלה'],
  },

  // ── שנקר – הנדסה. עיצוב. אמנות ─────────────────────────────────────────────
  // CHE-accredited; runs competitive entrance exams across design tracks.
  {
    id: 'shenkar_industrial_design',
    name: 'עיצוב תעשייתי',
    institution: 'שנקר – הנדסה. עיצוב. אמנות',
    institutionId: 'shenkar',
    type: 'academic',
    category: 'אמנות ועיצוב',
    profileScore: P.industrialDesign,
    admissionType: 'requirements',
    admissionRequirements: ['תיק עבודות', 'מבחן כניסה מקצועי', 'ראיון אישי'],
  },
  {
    id: 'shenkar_fashion',
    name: 'עיצוב אופנה',
    institution: 'שנקר – הנדסה. עיצוב. אמנות',
    institutionId: 'shenkar',
    type: 'academic',
    category: 'אמנות ועיצוב',
    profileScore: P.fashion,
    admissionType: 'requirements',
    admissionRequirements: ['תיק עבודות', 'מבחן כניסה – יצירה וחשיבה עיצובית', 'ראיון קבלה'],
  },
  {
    id: 'shenkar_graphic_design',
    name: 'עיצוב גרפי ותקשורת חזותית',
    institution: 'שנקר – הנדסה. עיצוב. אמנות',
    institutionId: 'shenkar',
    type: 'academic',
    category: 'אמנות ועיצוב',
    profileScore: P.graphicDesign,
    admissionType: 'requirements',
    admissionRequirements: ['תיק עבודות', 'מבחן כניסה', 'ראיון קבלה'],
  },
  {
    id: 'shenkar_animation',
    name: 'אנימציה',
    institution: 'שנקר – הנדסה. עיצוב. אמנות',
    institutionId: 'shenkar',
    type: 'academic',
    category: 'אמנות ועיצוב',
    profileScore: P.animation,
    admissionType: 'requirements',
    admissionRequirements: ['תיק עבודות – כולל ניסיון ציור ידני', 'מבחן כניסה', 'ראיון קבלה'],
  },

  // ── HIT – המכון הטכנולוגי חולון ──────────────────────────────────────────────
  // CHE-accredited academic college. Visual Communication is a 4-year B.Des
  // programme emphasising digital branding, UX/UI, motion design and print.
  // Industrial Design (B.Des) is a parallel track focused on product, UX and
  // human-centred design — offered alongside Bezalel and Shenkar.
  {
    id: 'hit_visual_comm',
    name: 'תקשורת חזותית',
    institution: 'המכון הטכנולוגי חולון (HIT)',
    institutionId: 'hit',
    type: 'academic',
    category: 'אמנות ועיצוב',
    profileScore: P.graphicDesign,
    admissionType: 'requirements',
    admissionRequirements: [],
    institutionDetails: [
      {
        institutionName: 'המכון הטכנולוגי חולון (HIT)',
        durationYears: 4,
        estimatedStudentsPerYear: 'כ-80 סטודנטים',
        quantitativeMinRequirement: null,
        englishMinRequirement: null,
        specificAdmissionNotes: [
          'תיק עבודות יצירתי – חובה מוחלטת',
          'מבחן כניסה אמנותי חד-יומי',
          'ראיון קבלה עם ועדה מקצועית',
          'ציון פסיכומטרי מינימלי: 450 (המלצה)',
        ],
        officialCalculatorUrl: 'https://www.hit.ac.il/department/visual-communication',
      } as InstitutionDetail,
    ],
  },
  {
    id: 'hit_industrial_design',
    name: 'עיצוב תעשייתי',
    institution: 'המכון הטכנולוגי חולון (HIT)',
    institutionId: 'hit',
    type: 'academic',
    category: 'אמנות ועיצוב',
    profileScore: P.industrialDesign,
    admissionType: 'requirements',
    admissionRequirements: [],
    institutionDetails: [
      {
        institutionName: 'המכון הטכנולוגי חולון (HIT)',
        durationYears: 4,
        estimatedStudentsPerYear: 'כ-60 סטודנטים',
        quantitativeMinRequirement: null,
        englishMinRequirement: null,
        specificAdmissionNotes: [
          'בגרות מלאה – חובה',
          'מבחן כניסה חוגי – יצירה ותפיסה מרחבית',
          'תיק עבודות וראיון עם ועדת קבלה',
        ],
        officialCalculatorUrl: 'https://www.hit.ac.il/department/industrial-design',
      } as InstitutionDetail,
    ],
  },

  // ── מנשר לאמנות ─────────────────────────────────────────────────────────────
  // Tel Aviv art school offering certificate and diploma programs.
  {
    id: 'minshar_fine_arts',
    name: 'אמנות',
    institution: 'מנשר לאמנות',
    institutionId: 'minshar',
    type: 'certificate',
    category: 'אמנות ועיצוב',
    profileScore: P.fineArts,
    admissionType: 'requirements',
    admissionRequirements: ['תיק עבודות', 'ראיון קבלה'],
  },
  {
    id: 'minshar_photography',
    name: 'צילום',
    institution: 'מנשר לאמנות',
    institutionId: 'minshar',
    type: 'certificate',
    category: 'אמנות ועיצוב',
    profileScore: P.photography,
    admissionType: 'requirements',
    admissionRequirements: ['תיק עבודות – עבודות צילום מקוריות', 'ראיון קבלה'],
  },
  {
    id: 'minshar_animation',
    name: 'אנימציה ומדיה דיגיטלית',
    institution: 'מנשר לאמנות',
    institutionId: 'minshar',
    type: 'certificate',
    category: 'אמנות ועיצוב',
    profileScore: P.animation,
    admissionType: 'requirements',
    admissionRequirements: ['תיק עבודות', 'מבחן כניסה', 'ראיון קבלה'],
  },
  {
    id: 'minshar_dance',
    name: 'ריקוד עכשווי',
    institution: 'מנשר לאמנות',
    institutionId: 'minshar',
    type: 'certificate',
    category: 'אמנות ועיצוב',
    profileScore: P.dance,
    admissionType: 'requirements',
    admissionRequirements: ['אודישן מעשי', 'מבחן התאמה גופנית', 'ראיון קבלה'],
  },

  // ── בית הספר לקולנוע ולטלוויזיה ע"ש סם שפיגל ──────────────────────────────
  // Jerusalem film school; diploma programs in filmmaking, screenwriting,
  // and documentary.
  {
    id: 'samspiegel_cinema',
    name: 'קולנוע',
    institution: 'בית הספר לקולנוע ולטלוויזיה ע"ש סם שפיגל',
    institutionId: 'spieldocs',
    type: 'certificate',
    category: 'אמנות ועיצוב',
    profileScore: P.cinema,
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
    institutionId: 'spieldocs',
    type: 'certificate',
    category: 'אמנות ועיצוב',
    profileScore: P.screenwriting,
    admissionType: 'requirements',
    admissionRequirements: ['תסריט קצר מקורי (עד 10 עמ׳)', 'ראיון קבלה'],
  },
  {
    id: 'samspiegel_documentary',
    name: 'קולנוע דוקומנטרי',
    institution: 'בית הספר לקולנוע ולטלוויזיה ע"ש סם שפיגל',
    institutionId: 'spieldocs',
    type: 'certificate',
    category: 'אמנות ועיצוב',
    profileScore: P.documentary,
    admissionType: 'requirements',
    admissionRequirements: ['פרויקט תיעודי קצר או מסמך פיתוח', 'ראיון קבלה'],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // CULINARY & GASTRONOMY
  // ════════════════════════════════════════════════════════════════════════════

  // ── מכון דנון לבישול ─────────────────────────────────────────────────────
  {
    id: 'danon_chef',
    name: 'שף מקצועי',
    institution: 'מכון דנון לבישול',
    institutionId: 'danon',
    type: 'vocational',
    category: 'קולינריה וגסטרונומיה',
    profileScore: P.chef,
    admissionType: 'requirements',
    admissionRequirements: ['מבחן התאמה מעשי במטבח', 'ראיון קבלה'],
  },
  {
    id: 'danon_pastry',
    name: 'קונדיטוריה מקצועית',
    institution: 'מכון דנון לבישול',
    institutionId: 'danon',
    type: 'vocational',
    category: 'קולינריה וגסטרונומיה',
    profileScore: P.pastry,
    admissionType: 'requirements',
    admissionRequirements: ['מבחן התאמה מעשי'],
  },
  {
    id: 'danon_culinary_arts',
    name: 'אמנות קולינרית',
    institution: 'מכון דנון לבישול',
    institutionId: 'danon',
    type: 'vocational',
    category: 'קולינריה וגסטרונומיה',
    profileScore: P.culinaryArts,
    admissionType: 'requirements',
    admissionRequirements: ['מבחן התאמה מעשי במטבח', 'ראיון קבלה'],
  },

  // ── בישולים – בית ספר ישראלי לאמנות הבישול ───────────────────────────────
  {
    id: 'bishulim_chef',
    name: 'שף מקצועי',
    institution: 'בישולים – בית ספר ישראלי לאמנות הבישול',
    institutionId: 'bishulim',
    type: 'vocational',
    category: 'קולינריה וגסטרונומיה',
    profileScore: P.chef,
    admissionType: 'requirements',
    admissionRequirements: ['מבחן טעימה וזיהוי חומרי גלם', 'ראיון קבלה'],
  },
  {
    id: 'bishulim_pastry',
    name: 'פטיסרי ועוגות',
    institution: 'בישולים – בית ספר ישראלי לאמנות הבישול',
    institutionId: 'bishulim',
    type: 'vocational',
    category: 'קולינריה וגסטרונומיה',
    profileScore: P.pastry,
    admissionType: 'requirements',
    admissionRequirements: ['מבחן התאמה מעשי'],
  },
  {
    id: 'bishulim_restaurant_mgmt',
    name: 'ניהול מסעדות ואוכל',
    institution: 'בישולים – בית ספר ישראלי לאמנות הבישול',
    institutionId: 'bishulim',
    type: 'vocational',
    category: 'קולינריה וגסטרונומיה',
    profileScore: P.restaurantMgmt,
    admissionType: 'requirements',
    admissionRequirements: ['ראיון קבלה', 'ניסיון עבודה בתחום הקולינרי (יתרון)'],
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
    institutionId: 'reidman',
    type: 'certificate',
    category: 'רפואה אינטגרטיבית',
    profileScore: P.chineseMedicine,
    admissionType: 'requirements',
    admissionRequirements: ['בגרות מלאה', 'ראיון קבלה'],
  },
  {
    id: 'reidman_naturopathy',
    name: 'נטורופתיה',
    institution: 'מכללת רידמן',
    institutionId: 'reidman',
    type: 'certificate',
    category: 'רפואה אינטגרטיבית',
    profileScore: P.naturopathy,
    admissionType: 'requirements',
    admissionRequirements: ['בגרות מלאה', 'ראיון קבלה'],
  },
  {
    id: 'reidman_homeopathy',
    name: 'הומאופתיה',
    institution: 'מכללת רידמן',
    institutionId: 'reidman',
    type: 'certificate',
    category: 'רפואה אינטגרטיבית',
    profileScore: P.homeopathy,
    admissionType: 'requirements',
    admissionRequirements: ['בגרות מלאה', 'ראיון קבלה'],
  },
  {
    id: 'reidman_reflexology',
    name: 'רפלקסולוגיה',
    institution: 'מכללת רידמן',
    institutionId: 'reidman',
    type: 'certificate',
    category: 'רפואה אינטגרטיבית',
    profileScore: P.reflexology,
    admissionType: 'requirements',
    admissionRequirements: ['בגרות מלאה', 'ראיון קבלה'],
  },

  // ── מכללת ברושים ─────────────────────────────────────────────────────────────
  {
    id: 'broshim_homeopathy',
    name: 'הומאופתיה',
    institution: 'מכללת ברושים',
    institutionId: 'broshim',
    type: 'certificate',
    category: 'רפואה אינטגרטיבית',
    profileScore: P.homeopathy,
    admissionType: 'requirements',
    admissionRequirements: ['בגרות מלאה', 'ראיון קבלה'],
  },
  {
    id: 'broshim_psychotherapy',
    name: 'פסיכותרפיה אינטגרטיבית',
    institution: 'מכללת ברושים',
    institutionId: 'broshim',
    type: 'certificate',
    category: 'רפואה אינטגרטיבית',
    profileScore: P.psychotherapy,
    admissionType: 'requirements',
    admissionRequirements: ['תואר ראשון בכל תחום (יתרון לתחום טיפולי)', 'ראיון קבלה אישי'],
  },
  {
    id: 'broshim_naturopathy',
    name: 'נטורופתיה',
    institution: 'מכללת ברושים',
    institutionId: 'broshim',
    type: 'certificate',
    category: 'רפואה אינטגרטיבית',
    profileScore: P.naturopathy,
    admissionType: 'requirements',
    admissionRequirements: ['בגרות מלאה', 'ראיון קבלה'],
  },

  // ── המכללה האקדמית אונו – לימודי המשך ──────────────────────────────────────
  {
    id: 'ono_ce_chinese_medicine',
    name: 'רפואה סינית מסורתית',
    institution: 'המכללה האקדמית אונו – לימודי המשך',
    institutionId: 'ono_ce',
    type: 'certificate',
    category: 'רפואה אינטגרטיבית',
    profileScore: P.chineseMedicine,
    admissionType: 'requirements',
    admissionRequirements: ['בגרות מלאה', 'בדיקה רפואית', 'ראיון קבלה'],
  },
  {
    id: 'ono_ce_psychotherapy',
    name: 'פסיכותרפיה אינטגרטיבית',
    institution: 'המכללה האקדמית אונו – לימודי המשך',
    institutionId: 'ono_ce',
    type: 'certificate',
    category: 'רפואה אינטגרטיבית',
    profileScore: P.psychotherapy,
    admissionType: 'requirements',
    admissionRequirements: ['תואר ראשון בכל תחום', 'ראיון קבלה'],
  },

  // ── מכללת פרדס חנה ──────────────────────────────────────────────────────────
  // Boutique integrative college; practitioner certificate 1–3 year tracks.
  {
    id: 'pardeshana_integrative',
    name: 'מיקולוגיה ורפואה אינטגרטיבית',
    institution: 'מכללת פרדס חנה',
    institutionId: 'pardeshana',
    type: 'certificate',
    category: 'רפואה אינטגרטיבית',
    profileScore: P.homeopathy,
    admissionType: 'requirements',
    admissionRequirements: [],
    institutionDetails: [
      {
        institutionName: 'מכללת פרדס חנה',
        durationYears: 2,
        estimatedStudentsPerYear: 'כ-25 סטודנטים',
        quantitativeMinRequirement: null,
        englishMinRequirement: null,
        specificAdmissionNotes: [
          'תעודת בגרות מלאה',
          'ראיון התאמה אישי – מחויבות ללמידה מעשית וקלינית בשטח',
        ],
        officialCalculatorUrl: 'https://www.pardeshana.ac.il',
      } as InstitutionDetail,
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
    institutionId: 'hackeru',
    type: 'vocational',
    category: 'טכנולוגיה ופיתוח',
    profileScore: P.fullstack,
    admissionType: 'requirements',
    admissionRequirements: ['מבחן התאמה טכני מקוון', 'ראיון קבלה'],
  },
  {
    id: 'hackeru_cyber',
    name: 'אבטחת מידע וסייבר',
    institution: 'HackerU',
    institutionId: 'hackeru',
    type: 'vocational',
    category: 'טכנולוגיה ופיתוח',
    profileScore: P.cyber,
    admissionType: 'requirements',
    admissionRequirements: ['מבחן התאמה טכני', 'ראיון קבלה'],
  },
  {
    id: 'hackeru_data',
    name: 'אנליזת נתונים ו-BI',
    institution: 'HackerU',
    institutionId: 'hackeru',
    type: 'vocational',
    category: 'טכנולוגיה ופיתוח',
    profileScore: P.dataAnalysis,
    admissionType: 'requirements',
    admissionRequirements: ['מבחן התאמה כמותי-לוגי', 'ראיון קבלה'],
  },

  // ── Elevation Academy ─────────────────────────────────────────────────────────
  // Cyber-first bootcamp; selective acceptance with technical screening.
  {
    id: 'elevation_cyber',
    name: 'סייבר הגנתי ומתקפי',
    institution: 'Elevation Academy',
    institutionId: 'elevation',
    type: 'vocational',
    category: 'טכנולוגיה ופיתוח',
    profileScore: P.cyber,
    admissionType: 'requirements',
    admissionRequirements: ['מבחן כניסה טכני', 'ראיון טכני', 'רקע בסיסי ברשתות ו/או תכנות'],
  },
  {
    id: 'elevation_fullstack',
    name: 'פיתוח Full-Stack',
    institution: 'Elevation Academy',
    institutionId: 'elevation',
    type: 'vocational',
    category: 'טכנולוגיה ופיתוח',
    profileScore: P.fullstack,
    admissionType: 'requirements',
    admissionRequirements: ['מבחן כניסה', 'ראיון טכני'],
  },

  // ── Israel Tech Challenge (ITC) ──────────────────────────────────────────────
  // Selective data-science bootcamp targeting career changers.
  {
    id: 'itc_data_science',
    name: 'מדעי הנתונים',
    institution: 'Israel Tech Challenge (ITC)',
    institutionId: 'itc',
    type: 'vocational',
    category: 'טכנולוגיה ופיתוח',
    profileScore: P.dataAnalysis,
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
    institutionId: 'johnbryce',
    type: 'vocational',
    category: 'טכנולוגיה ופיתוח',
    profileScore: P.cyber,
    admissionType: 'requirements',
    admissionRequirements: ['מבחן כניסה', 'ראיון קבלה'],
  },
  {
    id: 'johnbryce_cloud_devops',
    name: 'Cloud & DevOps',
    institution: 'ג׳ון ברייס',
    institutionId: 'johnbryce',
    type: 'vocational',
    category: 'טכנולוגיה ופיתוח',
    profileScore: P.cloudDevOps,
    admissionType: 'requirements',
    admissionRequirements: ['מבחן כניסה', 'ידע בסיסי בלינוקס ורשתות'],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // MUSIC
  // ════════════════════════════════════════════════════════════════════════════

  // ── האקדמיה למוזיקה ולמחול ירושלים ─────────────────────────────────────────
  // Israel's leading music and dance conservatory; B.Mus degree.
  {
    id: 'jerusalem_academy_classical',
    name: 'מוזיקה קלאסית – ביצוע',
    institution: 'האקדמיה למוזיקה ולמחול ירושלים',
    institutionId: 'jerusalem_academy',
    type: 'academic',
    category: 'מוזיקה ותיאטרון',
    profileScore: P.classicalMusic,
    admissionType: 'requirements',
    admissionRequirements: [
      'אודישן מקצועי על כלי הנגינה / קול',
      'מבחן תיאוריה מוזיקלית',
      'ראיון קבלה',
    ],
  },
  {
    id: 'jerusalem_academy_jazz',
    name: 'ג׳אז ומוזיקה עכשווית',
    institution: 'האקדמיה למוזיקה ולמחול ירושלים',
    institutionId: 'jerusalem_academy',
    type: 'academic',
    category: 'מוזיקה ותיאטרון',
    profileScore: P.jazzMusic,
    admissionType: 'requirements',
    admissionRequirements: ['אודישן ג׳אז ואלתור', 'מבחן תיאוריה מוזיקלית', 'ראיון קבלה'],
  },

  // ── בית הספר למוזיקה ע"ש בוכמן-מהטה – אוניברסיטת תל אביב ─────────────────
  // TAU's conservatory; B.Mus degree with academic university affiliation.
  {
    id: 'rubin_classical',
    name: 'מוזיקה קלאסית – ביצוע',
    institution: 'בית הספר למוזיקה ע"ש בוכמן-מהטה – אוניברסיטת תל אביב',
    institutionId: 'rubin',
    type: 'academic',
    category: 'מוזיקה ותיאטרון',
    profileScore: P.classicalMusic,
    admissionType: 'requirements',
    admissionRequirements: ['אודישן מקצועי', 'מבחן תיאוריה ואוזן מוזיקלית', 'ראיון קבלה'],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // THEATER & PERFORMING ARTS
  // ════════════════════════════════════════════════════════════════════════════

  // ── בית הספר למשחק ניסן נתיב ────────────────────────────────────────────────
  // Israel's most prestigious acting school; 3-year professional diploma.
  {
    id: 'nativ_acting',
    name: 'משחק',
    institution: 'בית הספר למשחק ניסן נתיב',
    institutionId: 'nativ',
    type: 'certificate',
    category: 'מוזיקה ותיאטרון',
    profileScore: P.acting,
    admissionType: 'requirements',
    admissionRequirements: ['אודישן בפני ועדת קבלה אמנותית', 'מונולוג מוכן + אלתור', 'ראיון אישי'],
  },

  // ── בית צבי – בית הספר הגבוה לאמנויות הבמה ─────────────────────────────────
  // CHE-accredited performing arts school; B.F.A. in acting and directing.
  {
    id: 'beit_zvi_acting',
    name: 'משחק',
    institution: 'בית צבי – בית הספר הגבוה לאמנויות הבמה',
    institutionId: 'beit_zvi',
    type: 'academic',
    category: 'מוזיקה ותיאטרון',
    profileScore: P.acting,
    admissionType: 'requirements',
    admissionRequirements: ['אודישן', 'מונולוג קלאסי + מודרני', 'ראיון קבלה'],
  },
  {
    id: 'beit_zvi_directing',
    name: 'במאות',
    institution: 'בית צבי – בית הספר הגבוה לאמנויות הבמה',
    institutionId: 'beit_zvi',
    type: 'academic',
    category: 'מוזיקה ותיאטרון',
    profileScore: P.directing,
    admissionType: 'requirements',
    admissionRequirements: [
      'פרויקט קונספט בימתי',
      'ראיון עם ועדה אמנותית',
      'ניסיון קודם בתיאטרון (יתרון)',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // EDUCATION & ARTS AT SEMINAR
  // ════════════════════════════════════════════════════════════════════════════

  // ── סמינר הקיבוצים – המכללה לחינוך, לטכנולוגיה ולאמנויות ──────────────────
  // CHE-accredited education college; unique blend of arts, teaching and culture.
  {
    id: 'seminar_art_education',
    name: 'חינוך לאמנות',
    institution: 'סמינר הקיבוצים – המכללה לחינוך, לטכנולוגיה ולאמנויות',
    institutionId: 'seminar',
    type: 'academic',
    category: 'חינוך',
    profileScore: P.artEducation,
    admissionType: 'requirements',
    admissionRequirements: ['תיק עבודות אמנותי', 'ראיון קבלה', 'בגרות מלאה'],
  },
  {
    id: 'seminar_music_education',
    name: 'חינוך מוזיקלי',
    institution: 'סמינר הקיבוצים – המכללה לחינוך, לטכנולוגיה ולאמנויות',
    institutionId: 'seminar',
    type: 'academic',
    category: 'חינוך',
    profileScore: P.musicEducation,
    admissionType: 'requirements',
    admissionRequirements: ['אודישן מוזיקלי', 'ראיון קבלה', 'בגרות מלאה'],
  },
  {
    id: 'seminar_dance',
    name: 'ריקוד עכשווי',
    institution: 'סמינר הקיבוצים – המכללה לחינוך, לטכנולוגיה ולאמנויות',
    institutionId: 'seminar',
    type: 'academic',
    category: 'מוזיקה ותיאטרון',
    profileScore: P.acting,
    admissionType: 'requirements',
    admissionRequirements: ['אודישן מחול', 'מבחן גמישות ומוטוריקה', 'ראיון קבלה'],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // SPORTS & PHYSICAL EDUCATION
  // ════════════════════════════════════════════════════════════════════════════

  // ── מכללת לוינסקי-וינגייט ───────────────────────────────────────────────────
  // Israel's national sports & education college; B.Ed and B.Sc programs.
  {
    id: 'wingate_coaching',
    name: 'אימון ספורטיבי',
    institution: 'מכללת לוינסקי-וינגייט',
    institutionId: 'wingate',
    type: 'academic',
    category: 'ספורט',
    profileScore: P.sportsCoaching,
    admissionType: 'requirements',
    admissionRequirements: ['מבחן כושר גופני', 'תעודת בגרות', 'ראיון קבלה'],
  },
  {
    id: 'wingate_physical_ed',
    name: 'חינוך גופני',
    institution: 'מכללת לוינסקי-וינגייט',
    institutionId: 'wingate',
    type: 'academic',
    category: 'ספורט',
    profileScore: P.physicalEd,
    admissionType: 'requirements',
    admissionRequirements: ['מבחן כושר גופני', 'תעודת בגרות', 'ראיון קבלה'],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // TOURISM & HOSPITALITY
  // ════════════════════════════════════════════════════════════════════════════

  // ── מכללת ניהול ──────────────────────────────────────────────────────────────
  // Colman offers one of Israel's few accredited tourism management degrees.
  {
    id: 'colman_tourism',
    name: 'תיירות ומלונאות',
    institution: 'מכללת ניהול – לימודים אקדמיים',
    institutionId: 'colman',
    type: 'academic',
    category: 'תיירות ואירוח',
    profileScore: P.tourismMgmt,
    admissionType: 'sekhem',
    admissionRequirements: [],
    thresholds: { tau: null, huji: null, technion: null, bgu: null },
    isTauEngineering: false,
  },
];
