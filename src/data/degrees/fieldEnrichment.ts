export interface FieldEnrichment {
  name: string;
  emoji: string;
  aboutText: string;
  marketStatus: string;
  endGoalJobs: string[];
  advancedDegreesSteps?: string;
  programIds: string[]; // IDs of allPrograms entries that belong to this field
}

// Maps a program ID → its canonical field key
export const PROGRAM_FIELD_MAP: Record<string, string> = {
  // ── Generic (academic.ts) ───────────────────────────────────────────────────
  cs: 'cs', ee: 'ee', me: 'me', psychology: 'psychology',
  medicine: 'medicine', law: 'law', business: 'business',
  economics: 'economics', datascience: 'datascience',

  // ── HUJI ────────────────────────────────────────────────────────────────────
  huji_cs: 'cs', huji_datascience: 'datascience', huji_psychology: 'psychology',
  huji_law: 'law', huji_economics: 'economics', huji_business: 'business',
  huji_biology: 'biology', huji_socialwork: 'socialWork', huji_medicine: 'medicine',

  // ── TAU ─────────────────────────────────────────────────────────────────────
  tau_cs: 'cs', tau_datascience: 'datascience', tau_ee: 'ee', tau_me: 'me',
  tau_industrial: 'industrialEng', tau_psychology: 'psychology', tau_law: 'law',
  tau_economics: 'economics', tau_business: 'business', tau_biology: 'biology',
  tau_socialwork: 'socialWork', tau_medicine: 'medicine',

  // ── Technion ─────────────────────────────────────────────────────────────────
  technion_cs: 'cs', technion_datascience: 'datascience', technion_ee: 'ee',
  technion_me: 'me', technion_civil: 'civilEng', technion_industrial: 'industrialEng',
  technion_biomedical: 'biomedical', technion_medicine: 'medicine',

  // ── BGU ─────────────────────────────────────────────────────────────────────
  bgu_cs: 'cs', bgu_datascience: 'datascience', bgu_ee: 'ee', bgu_me: 'me',
  bgu_industrial: 'industrialEng', bgu_psychology: 'psychology', bgu_law: 'law',
  bgu_economics: 'economics', bgu_business: 'business', bgu_biology: 'biology',
  bgu_nursing: 'nursing', bgu_socialwork: 'socialWork', bgu_medicine: 'medicine',

  // ── Haifa (requirements-based) ───────────────────────────────────────────────
  haifa_cs: 'cs', haifa_psychology: 'psychology', haifa_law: 'law',
  haifa_economics: 'economics',

  // ── Arts & Design ───────────────────────────────────────────────────────────
  bezalel_industrial_design: 'industrialDesign', shenkar_industrial_design: 'industrialDesign',
  bezalel_fine_arts: 'fineArts', minshar_fine_arts: 'fineArts',
  bezalel_photography: 'photography', minshar_photography: 'photography',
  bezalel_fashion: 'fashion', shenkar_fashion: 'fashion',
  shenkar_graphic_design: 'graphicDesign',
  shenkar_animation: 'animation', minshar_animation: 'animation',
  minshar_dance: 'dance',
  samspiegel_cinema: 'cinema',
  samspiegel_screenwriting: 'screenwriting',
  samspiegel_documentary: 'documentary',

  // ── Culinary ────────────────────────────────────────────────────────────────
  danon_chef: 'chef', bishulim_chef: 'chef', danon_culinary_arts: 'chef',
  danon_pastry: 'pastry', bishulim_pastry: 'pastry',
  bishulim_restaurant_mgmt: 'restaurantMgmt',

  // ── Integrative Medicine ─────────────────────────────────────────────────────
  reidman_chinese_medicine: 'chineseMedicine', ono_ce_chinese_medicine: 'chineseMedicine',
  reidman_naturopathy: 'naturopathy', broshim_naturopathy: 'naturopathy',
  reidman_homeopathy: 'homeopathy', broshim_homeopathy: 'homeopathy',
  reidman_reflexology: 'reflexology',
  broshim_psychotherapy: 'psychotherapy', ono_ce_psychotherapy: 'psychotherapy',

  // ── Tech Bootcamps ───────────────────────────────────────────────────────────
  hackeru_fullstack: 'fullstack', elevation_fullstack: 'fullstack',
  hackeru_cyber: 'cyber', elevation_cyber: 'cyber', johnbryce_cyber: 'cyber',
  hackeru_data: 'dataAnalysis', itc_data_science: 'dataAnalysis',
  johnbryce_cloud_devops: 'cloudDevOps',

  // ── Haifa (additional programs missing from initial map) ──────────────────
  haifa_biology: 'biology', haifa_socialwork: 'socialWork', haifa_nursing: 'nursing',

  // ── Reichman (IDC Herzliya) ───────────────────────────────────────────────
  reichman_cs: 'cs', reichman_psychology: 'psychology', reichman_law: 'law',
  reichman_business: 'business', reichman_economics: 'economics',
  reichman_infosystems: 'infoSystems',

  // ── Tel-Hai ───────────────────────────────────────────────────────────────
  telhai_cs: 'cs', telhai_biology: 'biology',
  telhai_nursing: 'nursing', telhai_socialwork: 'socialWork',

  // ── Afeka ─────────────────────────────────────────────────────────────────
  afeka_cs: 'cs', afeka_softwareeng: 'cs', afeka_ee: 'ee', afeka_biomedical: 'biomedical',

  // ── Tel Aviv-Yaffo Academic College ──────────────────────────────────────
  tlvyaffo_cs: 'cs', tlvyaffo_business: 'business', tlvyaffo_economics: 'economics',
  tlvyaffo_nursing: 'nursing', tlvyaffo_socialwork: 'socialWork',

  // ── College of Management ─────────────────────────────────────────────────
  colmgmt_cs: 'cs', colmgmt_business: 'business', colmgmt_economics: 'economics',
  colmgmt_law: 'law', colmgmt_accounting: 'accounting', colmgmt_infosystems: 'infoSystems',

  // ── Ono Academic College ──────────────────────────────────────────────────
  ono_law: 'law', ono_business: 'business', ono_cs: 'cs',
  ono_socialwork: 'socialWork', ono_nursing: 'nursing', ono_psychology: 'psychology',

  // ── New accounting & info-systems programs ────────────────────────────────
  tau_accounting: 'accounting', huji_accounting: 'accounting', bgu_accounting: 'accounting',
  tau_infosystems: 'infoSystems',

  // ── New specialised programs ───────────────────────────────────────────────
  hit_visual_comm:              'graphicDesign',
  hit_industrial_design:        'industrialDesign',
  kinneret_sound_eng:           'soundEngineering',
  ruppin_marine_bio:            'marineBiology',
  tau_occupational_therapy:     'occupationalTherapy',
  huji_occupational_therapy:    'occupationalTherapy',
  pardeshana_integrative:       'homeopathy',
};

export const FIELD_ENRICHMENT: Record<string, FieldEnrichment> = {
  cs: {
    name: 'מדעי המחשב',
    emoji: '💻',
    aboutText: 'תואר מדעי המחשב הוא אחד מהתארים המבוקשים ביותר בישראל. הלימודים מכסים אלגוריתמיקה, מבני נתונים, ארכיטקטורת מחשבים, מערכות הפעלה ולמידת מכונה. הבסיס המתמטי כולל קומבינטוריקה, אלגברה לינארית ולוגיקה. בוגרים עובדים בחברות הייטק מקומיות ורב-לאומיות.',
    marketStatus: 'שוק עבודה חם במיוחד. ישראל מדורגת בין מדינות הטכנולוגיה המובילות בעולם. הביקוש לבוגרי מדעי המחשב נמצא בשיא, עם שכר ממוצע של 25,000–50,000 ₪ למנוסים.',
    endGoalJobs: ['מפתח/ת תוכנה', 'ארכיטקט/ית תוכנה', 'מהנדס/ת ML / AI', 'Tech Lead', 'מנהל/ת R&D', 'CTO'],
    advancedDegreesSteps: 'תואר שני (M.Sc.) פותח דלתות לתפקידי מחקר ב-R&D ולחברות כמו Google ו-Meta. לחלופין, MBA לאחר שנות ניסיון מכוון לניהול מוצר ו-Startup founding.',
    programIds: ['cs', 'tau_cs', 'huji_cs', 'technion_cs', 'bgu_cs', 'haifa_cs'],
  },

  datascience: {
    name: 'מדעי הנתונים',
    emoji: '📊',
    aboutText: 'מדעי הנתונים משלב סטטיסטיקה, תכנות ודומיין ידע כדי לחלץ תובנות מנתוני ענק. הלימודים כוללים Python, SQL, ויזואליזציה, מודלים סטטיסטיים ו-Machine Learning. מתאים מאוד לחשיבה כמותית המחוברת לבעיות עסקיות.',
    marketStatus: 'ביקוש גבוה מאוד. כמעט כל תאגיד גדול — פינטק, ביומד, קמעונאות ולוגיסטיקה — צריך מדעני נתונים. שכר ממוצע 22,000–40,000 ₪. גל ה-AI מאיץ את הביקוש.',
    endGoalJobs: ['Data Scientist', 'Machine Learning Engineer', 'BI Analyst', 'Product Analyst', 'מנהל/ת נתונים'],
    advancedDegreesSteps: 'תואר שני בסטטיסטיקה, מדעי הנתונים, או CS מחזק מאוד את הפרופיל. הסמכות כמו Deep Learning Specialization מאיצות כניסה לתפקידי AI.',
    programIds: ['datascience', 'tau_datascience', 'huji_datascience', 'technion_datascience', 'bgu_datascience'],
  },

  ee: {
    name: 'הנדסת חשמל',
    emoji: '⚡',
    aboutText: 'הנדסת חשמל עוסקת בתכנון מעגלים, מערכות אנרגיה, תקשורת ואלקטרוניקה. הלימודים כוללים מעגלים לינאריים, עיבוד אותות, אנטנות ומערכות Embedded. מסלולי ריכוז בתקשורת ובמחשבים מאפשרים מעבר לפיתוח תוכנה מוטמעת.',
    marketStatus: 'ביקוש גבוה, במיוחד בתעשיית הביטחון (אלביט, רפאל, תע"א) ובהייטק. שכר ממוצע 20,000–38,000 ₪. Embedded ו-VLSI מבוקשים מאוד.',
    endGoalJobs: ['מהנדס/ת חשמל', 'מהנדס/ת Embedded', 'מהנדס/ת RF', 'מהנדס/ת VLSI', 'מהנדס/ת אנרגיה מתחדשת'],
    advancedDegreesSteps: 'תואר שני בהנדסת חשמל, תקשורת, או ניהול מערכות. הסמכות אנרגיה מתחדשת פופולריות בקרב בוגרים.',
    programIds: ['ee', 'tau_ee', 'technion_ee', 'bgu_ee'],
  },

  me: {
    name: 'הנדסת מכונות',
    emoji: '⚙️',
    aboutText: 'הנדסת מכונות עוסקת בתכנון וניתוח מערכות מכניות — ממנועים ורכיבים תעשייתיים ועד מכשור רפואי ורכבים אוטונומיים. הלימודים משלבים מכניקה, תרמודינמיקה, דינמיקה ו-CAD. מסלולי Robotics ו-Autonomous Systems פופולריים מאוד.',
    marketStatus: 'ביקוש יציב ומתמיד. תעשיות הביטחון, הרפואה והרכב החשמלי (EV) מגדילות ביקוש. שכר ממוצע 18,000–35,000 ₪.',
    endGoalJobs: ['מהנדס/ת מכונות', 'מהנדס/ת R&D מוצר', 'מהנדס/ת ייצור', 'מהנדס/ת Robotics', 'מנהל/ת פרויקט הנדסי'],
    advancedDegreesSteps: 'תואר שני בהנדסת מכונות, Mechatronics, או ניהול הנדסי. Robotics ו-Autonomous Vehicles הם מסלולים חמים.',
    programIds: ['me', 'tau_me', 'technion_me', 'bgu_me'],
  },

  industrialEng: {
    name: 'הנדסת תעשייה וניהול',
    emoji: '🏭',
    aboutText: 'הנדסת תעשייה וניהול היא הגשר בין הנדסה לניהול. הלימודים כוללים חקר ביצועים, ניהול שרשרת אספקה, כלכלה הנדסית ומערכות ייצור. הבוגרים מתאימים לתפקידי ניהול תפעולי ואנליזה כמותית.',
    marketStatus: 'ביקוש גבוה בלוגיסטיקה, שירותי בריאות ופינטק. שכר ממוצע 16,000–30,000 ₪.',
    endGoalJobs: ['מנהל/ת תפעול', 'אנליסט/ית תהליכים', 'Supply Chain Manager', 'מנהל/ת פרויקטים', 'יועץ/ת ניהולי/ת'],
    programIds: ['tau_industrial', 'technion_industrial', 'bgu_industrial'],
  },

  civilEng: {
    name: 'הנדסה אזרחית',
    emoji: '🏗️',
    aboutText: 'הנדסה אזרחית עוסקת בתכנון ובנייה של תשתיות: גשרים, כבישים, מבנים ומערכות מים. ישראל משקיעה בפיתוח תשתיות רחב היקף, מה שמביא לביקוש יציב.',
    marketStatus: 'ביקוש יציב, בעיקר בפרויקטים ממשלתיים ובנייה. שכר ממוצע 15,000–28,000 ₪.',
    endGoalJobs: ['מהנדס/ת אזרחי/ת', 'מנהל/ת פרויקט תשתיות', 'מהנדס/ת קונסטרוקציה', 'מתכנן/ת עירוני/ת'],
    programIds: ['technion_civil'],
  },

  biomedical: {
    name: 'הנדסה ביורפואית',
    emoji: '🔬',
    aboutText: 'הנדסה ביורפואית משלבת הנדסה עם מדעי הרפואה — פיתוח מכשירים רפואיים, עיבוד אותות ביולוגיים ובינה מלאכותית לאבחון. תחום עם ביקוש גלובלי גובר.',
    marketStatus: 'ביקוש גובר בתעשיית הביומד הישראלית (כ-1,500 חברות פעילות). שכר ממוצע 18,000–35,000 ₪.',
    endGoalJobs: ['מהנדס/ת ביורפואי/ת', 'מפתח/ת מכשור רפואי', 'רגולציה רפואית', 'Clinical Engineer'],
    programIds: ['technion_biomedical'],
  },

  psychology: {
    name: 'פסיכולוגיה',
    emoji: '🧠',
    aboutText: 'תואר הפסיכולוגיה הוא הבסיס לקריירה טיפולית ומחקרית. הלימודים כוללים פסיכולוגיה קלינית, התפתחותית, חברתית, מחקר ואבחון. חשוב לדעת: תואר ראשון לבד אינו מאפשר עיסוק קליני עצמאי בישראל.',
    marketStatus: 'ביקוש גבוה, במיוחד לאחר תואר שני קליני. שכר ממוצע של פסיכולוגים קליניים: 12,000–25,000 ₪. טיפול פרטי יכול להניב יותר.',
    endGoalJobs: ['פסיכולוג/ית קלינ/ית', 'פסיכולוג/ית ארגוני/ת', 'יועץ/ת חינוכי/ת', 'פסיכותרפיסט/ית', 'חוקר/ת'],
    advancedDegreesSteps: 'בישראל, עיסוק קליני עצמאי מחייב תואר שני (M.A.) בפסיכולוגיה קלינית + 2–3 שנות התמחות מפוקחת + רישיון ממשרד הבריאות. התהליך כולל אורך כ-8–10 שנים. תואר ראשון פותח דלת לתפקידי שיקום, HR ומחקר בסיסי.',
    programIds: ['psychology', 'tau_psychology', 'huji_psychology', 'bgu_psychology', 'haifa_psychology'],
  },

  socialWork: {
    name: 'עבודה סוציאלית',
    emoji: '🤝',
    aboutText: 'תואר בעבודה סוציאלית מכשיר לעבודה עם אוכלוסיות מגוונות — ילדים בסיכון, קשישים, נפגעי אלימות ומשפחות במצוקה. הלימודים כוללים פרקטיקום שטחי כבר מהשנה השנייה.',
    marketStatus: 'ביקוש גבוה ויציב, בעיקר בשירות הציבורי והמגזר השלישי. שכר ממוצע 9,000–18,000 ₪. מנהלים בכירים מגיעים לשכר גבוה יותר.',
    endGoalJobs: ['עובד/ת סוציאלי/ת', 'מנהל/ת שירותים חברתיים', 'מטפל/ת משפחתי/ת', 'יועץ/ת לרשויות מקומיות'],
    advancedDegreesSteps: 'תואר שני (M.S.W.) נדרש לתפקידי פיקוח ומחקר. רישיון עובד סוציאלי ניתן לאחר שנת התמחות מפוקחת.',
    programIds: ['tau_socialwork', 'huji_socialwork', 'bgu_socialwork'],
  },

  law: {
    name: 'משפטים',
    emoji: '⚖️',
    aboutText: 'תואר המשפטים (LL.B.) הוא תואר מקצועי של 4 שנים הנדרש לעריכת דין. הלימודים כוללים דיני חוזים, נזיקין, פלילים, דיני ראיות ועוד. שוק עורכי הדין בישראל תחרותי — ניסיון מעשי בהתמחות קריטי להצלחה.',
    marketStatus: 'שוק תחרותי. עורכי דין בשנים הראשונות מרוויחים 8,000–15,000 ₪. מנוסים בתחומים מסחריים ופיננסיים — 30,000 ₪ ומעלה.',
    endGoalJobs: ['עורך/ת דין', 'יועץ/ת משפטי/ת', 'שופט/ת (אחרי ניסיון)', 'יועץ/ת רגולטורי/ת', 'מנהל/ת משפטי/ת'],
    advancedDegreesSteps: 'לאחר הסמכה, עורכי דין מתמחים ב-IP, M&A, פלילים, נדל"ן. LL.M. בחו"ל (US/UK) פותח דלתות בינלאומיות.',
    programIds: ['law', 'tau_law', 'huji_law', 'bgu_law', 'haifa_law'],
  },

  economics: {
    name: 'כלכלה',
    emoji: '📈',
    aboutText: 'תואר בכלכלה מלמד לנתח מערכות כלכליות מורכבות — ממיקרו-כלכלה ועד מדיניות מוניטרית. הלימודים מתמטיים מאוד: אקונומטריקה, תיאוריית משחקים, מודלים מקרו. בוגרים עובדים בפינטק, בנקאות, ממשלה ואקדמיה.',
    marketStatus: 'ביקוש טוב. בנק ישראל, משרד האוצר ובנקים גדולים תמיד מחפשים כלכלנים. שכר ממוצע 15,000–35,000 ₪.',
    endGoalJobs: ['כלכלן/ית', 'אנליסט/ית פיננסי/ת', 'מנהל/ת מחקר', 'יועץ/ת כלכלי/ת', 'Policy Analyst'],
    advancedDegreesSteps: 'תואר שני בכלכלה (M.A. מחקרי) נפוץ לתפקידי מחקר אקדמיים ובנקאיים. Ph.D. לאקדמיה בלבד.',
    programIds: [
      'economics', 'tau_economics', 'huji_economics', 'bgu_economics', 'haifa_economics',
      'reichman_economics', 'tlvyaffo_economics', 'colmgmt_economics',
    ],
  },

  business: {
    name: 'מנהל עסקים',
    emoji: '💼',
    aboutText: 'תואר BBA מכסה ניהול, חשבונאות, שיווק, פיננסים ומשאבי אנוש. הלימודים מאוזנים — לא מתמטיים כמו כלכלה, לא טכניים כמו הנדסה. מתאים במיוחד לאנשים עם נטייה יזמית ואנשים-מוכווני.',
    marketStatus: 'שוק רחב ותחרותי. שכר ממוצע 10,000–25,000 ₪ לבוגרים חדשים. יזמים ומנהלים בכירים מגיעים להרבה יותר.',
    endGoalJobs: ['מנהל/ת מוצר', 'מנהל/ת שיווק', 'מנהל/ת כספים', 'יועץ/ת עסקי/ת', 'יזם/ת'],
    advancedDegreesSteps: 'MBA (תואר שני עסקי) הוא הנתיב הקלאסי לניהול בכיר. מומלץ לאחר 3–5 שנות ניסיון מקצועי.',
    programIds: [
      'business', 'tau_business', 'huji_business', 'bgu_business',
      'reichman_business', 'tlvyaffo_business', 'colmgmt_business', 'ono_business',
    ],
  },

  accounting: {
    name: 'חשבונאות',
    emoji: '📊',
    aboutText: 'תואר חשבונאות מכשיר לתפקידי ניהול כספי, ביקורת וייעוץ מס. הלימודים כוללים חשבונאות פיננסית, ניהולית, מיסוי, ביקורת פנימית ומשפט מסחרי. רואי חשבון (CPA) הם מהמקצועות המוסדרים ביותר בישראל.',
    marketStatus: 'ביקוש יציב ומובטח. כל ארגון — ציבורי, פרטי ועמותה — זקוק לחשבונאים. שכר ממוצע 14,000–30,000 ₪; רואי חשבון בכירים מגיעים להרבה יותר.',
    endGoalJobs: ['רואה/ת חשבון (CPA)', 'מנהל/ת כספים (CFO)', 'מבקר/ת פנים', 'יועץ/ת מס', 'Financial Controller'],
    advancedDegreesSteps: 'לאחר הבחינות המקצועיות (רו"ח) ניתן להתמחות ב-Tax, M&A Accounting, או Forensic Accounting. MBA פותח דלתות לניהול כספי בכיר.',
    programIds: [
      'tau_accounting', 'huji_accounting', 'bgu_accounting', 'colmgmt_accounting',
    ],
  },

  infoSystems: {
    name: 'ניהול ומערכות מידע',
    emoji: '🖥️',
    aboutText: 'ניהול ומערכות מידע הוא הגשר בין עולם הטכנולוגיה לעולם הניהול. הלימודים כוללים ניתוח עסקי, מסדי נתונים, ERP, פרויקטים טכנולוגיים ואסטרטגיה דיגיטלית. מתאים מאוד לאנשים שרוצים לדבר שפת הייטק מבלי להיות מפתחים.',
    marketStatus: 'ביקוש גבוה. ארגונים זקוקים למקשרים בין IT לעסק. שכר ממוצע 15,000–32,000 ₪. תפקידי Product Manager ו-Business Analyst פותוחים לבוגרים.',
    endGoalJobs: ['Business Analyst', 'מנהל/ת מוצר (PM)', 'מנהל/ת IT', 'יועץ/ת דיגיטלי/ת', 'Data Analyst'],
    advancedDegreesSteps: 'MBA עם התמחות בטכנולוגיה או M.Sc. ב-Information Systems מחזקים תפקידי ניהול. הסמכות PMP ו-Scrum Master נפוצות.',
    programIds: [
      'tau_infosystems', 'reichman_infosystems', 'colmgmt_infosystems',
    ],
  },

  biology: {
    name: 'ביולוגיה',
    emoji: '🧬',
    aboutText: 'תואר ביולוגיה מכסה מיקרוביולוגיה, גנטיקה, ביוכימיה ואקולוגיה. בסיס מצוין למסלולי מחקר, רפואה וביוטכנולוגיה. הלימודים כוללים שעות מעבדה נרחבות.',
    marketStatus: 'ביקוש מתון לבוגרי B.Sc. בלבד. עם תואר שני/שלישי — ביקוש גבוה בביוטק ותרופות. שכר ממוצע 12,000–25,000 ₪.',
    endGoalJobs: ['חוקר/ת ביולוגי/ת', 'מדען/ת ביוטכנולוגיה', 'רגולציה פרמצבטית', 'מדריך/ת'],
    advancedDegreesSteps: 'תואר שני ושלישי כמעט חובה לתפקידי מחקר עצמאיים. תעשיית הביוטק מאפשרת כניסה עם M.Sc. בלבד.',
    programIds: ['tau_biology', 'huji_biology', 'bgu_biology'],
  },

  nursing: {
    name: 'סיעוד',
    emoji: '🏥',
    aboutText: 'תואר B.N. הוא תואר מקצועי המשלב לימוד אקדמי עם הכשרה קלינית נרחבת. בוגרים מוסמכים לעבוד כאחיות/ים רשומות/ים במערכת הבריאות הציבורית והפרטית.',
    marketStatus: 'ביקוש גבוה מאוד ויציב. ישראל נמצאת במחסור כרוני בסיעוד. שכר ממוצע 15,000–28,000 ₪, כולל תוספות תורנות.',
    endGoalJobs: ['אחות/אח מוסמך/ת', 'ראש/ת צוות', 'אחות/אח מומחה/ית', 'מרכז/ת חינוך סיעודי'],
    advancedDegreesSteps: 'תואר שני בסיעוד (M.S.N.) מכשיר לניהול, מחקר וייעוץ קליני מתקדם.',
    programIds: ['bgu_nursing'],
  },

  medicine: {
    name: 'רפואה',
    emoji: '🩺',
    aboutText: 'לימודי הרפואה בישראל אורכים 6 שנים — שנתיים פרה-קליניות ו-4 שנים קליניות. תחומי ההתמחות (אינטרניסט, כירורג, פסיכיאטר) נקבעים לאחר Residency. מסלול מאתגר מאוד מבחינת עומס לימודים וקבלה.',
    marketStatus: 'ביקוש גבוה מאוד. ישראל מתמודדת עם מחסור ברופאים. שכר מתמחים: 15,000–22,000 ₪. שכר רופאים ותיקים: 30,000–80,000 ₪ ומעלה.',
    endGoalJobs: ['רופא/ה מתמחה', 'רופא/ה מומחה/ית', 'מנהל/ת מחלקה', 'רופא/ה חוקר/ת'],
    advancedDegreesSteps: 'לאחר ה-M.D., Residency של 4–7 שנים בהתמחות נבחרת. Fellowship להתמחות-על. Ph.D. לנתיב אקדמי-קליני.',
    programIds: ['medicine', 'tau_medicine', 'huji_medicine', 'technion_medicine', 'bgu_medicine'],
  },

  animation: {
    name: 'אנימציה',
    emoji: '🎬',
    aboutText: 'לימודי אנימציה מלמדים עקרונות תנועה, עיצוב דמויות, storytelling ושימוש בכלים דיגיטליים (Maya, After Effects, Blender). התחום משלב יצירתיות אמנותית עם חשיבה טכנית.',
    marketStatus: 'ביקוש גובר בתחומי גיימינג, פרסום, חינוך דיגיטלי ו-OTT. שכר ממוצע 10,000–22,000 ₪. Freelance נפוץ.',
    endGoalJobs: ['מאייר/ת', 'מאנימטור/ית', 'Motion Designer', 'מעצב/ת VFX', 'במאי/ת אנימציה'],
    programIds: ['shenkar_animation', 'minshar_animation'],
  },

  graphicDesign: {
    name: 'עיצוב גרפי ותקשורת חזותית',
    emoji: '🎨',
    aboutText: 'עיצוב גרפי ותקשורת חזותית מלמדים יצירת זהויות ויזואליות, Typography, Branding, UX/UI ועיצוב דיגיטלי. התחום מגשר בין אמנות לתקשורת שיווקית.',
    marketStatus: 'ביקוש יציב בסוכנויות פרסום וחברות הייטק. שכר ממוצע 8,000–18,000 ₪. UX/UI Designer מגיע ל-20,000–35,000 ₪.',
    endGoalJobs: ['מעצב/ת גרפי/ת', 'מעצב/ת UX/UI', 'Creative Director', 'Art Director', 'Brand Designer'],
    advancedDegreesSteps: 'קורסי UX/UI ממוקדים (כמו של Google UX Design Certificate) מאיצים מעבר לתחום ההייטק.',
    programIds: ['shenkar_graphic_design', 'hit_visual_comm'],
  },

  fineArts: {
    name: 'אמנות פלסטית',
    emoji: '🖼️',
    aboutText: 'לימודי אמנות פלסטית מציעים חופש יצירתי רחב — ציור, פיסול, אמנות מדיה ואינסטלציה. הלימודים מתמקדים בפיתוח קול אמנותי ייחודי ובשיח אמנותי בינלאומי.',
    marketStatus: 'שוק תחרותי. הכנסה ישירה מאמנות נדירה בתחילה. רבים מלמדים, עובדים בעיצוב או בגלריות.',
    endGoalJobs: ['אמן/ית עצמאי/ת', 'מורה לאמנות', 'אוצר/ת גלריה', 'מעצב/ת', 'Art Director'],
    programIds: ['bezalel_fine_arts', 'minshar_fine_arts'],
  },

  industrialDesign: {
    name: 'עיצוב תעשייתי',
    emoji: '📐',
    aboutText: 'עיצוב תעשייתי עוסק בתכנון מוצרים — מריהוט ועד אלקטרוניקה. הלימודים משלבים הבנת חומרים, ארגונומיה, עיצוב לייצור והנדסה בסיסית. תחום הגשר בין הנדסה לאמנות.',
    marketStatus: 'ביקוש ממוצע בתעשיית המוצר. תפקידי Product / UX Designer בהייטק מאוד מבוקשים. שכר ממוצע 12,000–28,000 ₪.',
    endGoalJobs: ['מעצב/ת מוצר', 'Product Designer', 'מעצב/ת UX', 'Interaction Designer', 'Creative Director'],
    programIds: ['bezalel_industrial_design', 'shenkar_industrial_design', 'hit_industrial_design'],
  },

  photography: {
    name: 'צילום',
    emoji: '📷',
    aboutText: 'לימודי צילום מכסים טכניקות מצלמה, תאורה, עיצוב ויזואלי ועריכת תמונה. הלימודים מתמקדים גם בפיתוח עין אמנותית ייחודית לצד הממד הטכני.',
    marketStatus: 'שוק תחרותי. צלמים מסחריים (פרסום, מוצרים) מרוויחים יציב. שכר 8,000–20,000 ₪. Freelance נפוץ.',
    endGoalJobs: ['צלם/ת מסחרי/ת', 'צלם/ת אמנותי/ת', 'צלם/ת אירועים', 'Photo Editor', 'Art Director'],
    programIds: ['bezalel_photography', 'minshar_photography'],
  },

  fashion: {
    name: 'עיצוב אופנה',
    emoji: '👗',
    aboutText: 'לימודי עיצוב אופנה מלמדים: תפירה, קרינולוגיה, ניהול מותגים, צילום אופנה ועיצוב קולקציות. הלימודים דורשים מיומנות ידנית גבוהה ויצירתיות מתמשכת.',
    marketStatus: 'שוק תחרותי. לישראל תעשיית אופנה אקלקטית עם פוטנציאל ייצוא. שכר 7,000–18,000 ₪.',
    endGoalJobs: ['מעצב/ת אופנה', 'סטייליסט/ית', 'מנהל/ת מותג', 'Pattern Maker'],
    programIds: ['bezalel_fashion', 'shenkar_fashion'],
  },

  cinema: {
    name: 'קולנוע',
    emoji: '🎥',
    aboutText: 'לימודי קולנוע מלמדים בימוי, עריכה, צילום קולנועי, עיצוב סאונד ופיתוח תסריטים. בית הספר סם שפיגל נחשב לאחד הטובים בעולם — בוגריו זכו בפרסים בינלאומיים.',
    marketStatus: 'תחרותי, אך בוגרי בתי ספר יוקרתיים פורצים לתעשייה. OTT (Netflix, Apple) הגדיל ביקוש לתוכן. שכר 8,000–25,000 ₪.',
    endGoalJobs: ['במאי/ת', 'עורך/ת קולנוע', 'מפיק/ה', 'צלם/ת קולנועי/ת', 'מעצב/ת פסקול'],
    programIds: ['samspiegel_cinema'],
  },

  screenwriting: {
    name: 'תסריטאות',
    emoji: '✍️',
    aboutText: 'לימודי תסריטאות מלמדים לכתוב עלילות לקולנוע ולטלוויזיה — ממבנה עלילה ועד דיאלוג ודמויות. גם בסם שפיגל גם בבתי ספר נוספים הלימודים אינטנסיביים עם דגש על כתיבה ושיח.',
    marketStatus: 'ביקוש גובר לתוכן ישראלי בעקבות הצלחות בינלאומיות (שרות המלך, Fauda). שכר 8,000–25,000 ₪.',
    endGoalJobs: ['תסריטאי/ת', 'כותב/ת ראשי/ת', 'שואנר', 'כותב/ת Adaptation'],
    programIds: ['samspiegel_screenwriting'],
  },

  documentary: {
    name: 'קולנוע דוקומנטרי',
    emoji: '🎞️',
    aboutText: 'קולנוע דוקומנטרי מלמד לתעד מציאות — מחקר עומק, צילום בשטח, עריכה נרטיבית ואתיקה עיתונאית. ישראל ידועה בסצנה דוקומנטרית חזקה בינלאומית.',
    marketStatus: 'שוק נישה אבל גלובלי. Netflix ו-HBO משקיעים בדוקומנטרים ישראליים. שכר 8,000–20,000 ₪.',
    endGoalJobs: ['במאי/ת דוקומנטרי/ת', 'מפיק/ה', 'עיתונאי/ת טלוויזיה', 'כותב/ת תוכן'],
    programIds: ['samspiegel_documentary'],
  },

  dance: {
    name: 'ריקוד עכשווי',
    emoji: '💃',
    aboutText: 'לימודי ריקוד עכשווי כוללים טכניקות גוף, כוריאוגרפיה, פרפורמנס ותיאוריה של מחול. ישראל ידועה בסצנת מחול עכשווית איכותית (בת שבע, קומפניה).',
    marketStatus: 'שוק תחרותי. רקדנים מקצועיים עובדים בלהקות, הוראה ופרפורמנס. שכר 7,000–18,000 ₪.',
    endGoalJobs: ['רקדן/ית מקצועי/ת', 'כוריאוגרף/ית', 'מדריך/ת ריקוד', 'מנהל/ת להקה'],
    programIds: ['minshar_dance'],
  },

  chef: {
    name: 'שף מקצועי',
    emoji: '👨‍🍳',
    aboutText: 'לימודי שף מקצועי מלמדים טכניקות בישול, עיצוב תפריטים, ניהול מטבח, היגיינת מזון ועבודה תחת לחץ. הלימודים מעשיים ואינטנסיביים. ישראל מפתחת סצנת מסעדות מרשימה.',
    marketStatus: 'ביקוש גבוה ויציב לשפים מוסמכים. שכר 10,000–25,000 ₪. שפים ותיקים ומפורסמים מרוויחים הרבה יותר.',
    endGoalJobs: ['שף/ית', 'שף/ית ראשי/ת', 'מנהל/ת מטבח', 'מנהל/ת מסעדה', 'יועץ/ת קולינרי/ת'],
    programIds: ['danon_chef', 'bishulim_chef', 'danon_culinary_arts'],
  },

  pastry: {
    name: 'קונדיטוריה ואפייה',
    emoji: '🍰',
    aboutText: 'לימודי קונדיטוריה מלמדים עוגות, מאפים, שוקולד וסוכריות. שילוב של כימיה, טכניקה ויצירתיות. הלמידה מעשית לחלוטין.',
    marketStatus: 'ביקוש טוב. קונדיטורים מיומנים מבוקשים במסעדות, מלונות ועסקים עצמאיים. שכר 9,000–20,000 ₪.',
    endGoalJobs: ['קונדיטור/ית', 'Chef Pâtissier', 'בעל/ת עסק קולינרי', 'מעצב/ת עוגות'],
    programIds: ['danon_pastry', 'bishulim_pastry'],
  },

  restaurantMgmt: {
    name: 'ניהול מסעדות',
    emoji: '🍽️',
    aboutText: 'ניהול מסעדות ואוכל משלב ידע קולינרי עם כישורי ניהול — תפריט, צוות, עלויות, שיווק ושירות לקוחות. תחום עם ביקוש מתמיד.',
    marketStatus: 'ביקוש גבוה. מנהלי מסעדות מנוסים מרוויחים 12,000–28,000 ₪.',
    endGoalJobs: ['מנהל/ת מסעדה', 'F&B Manager', 'מנהל/ת הוסטלות / מלון', 'יועץ/ת קולינרי/ת'],
    programIds: ['bishulim_restaurant_mgmt'],
  },

  chineseMedicine: {
    name: 'רפואה סינית מסורתית',
    emoji: '☯️',
    aboutText: 'רפואה סינית מסורתית כוללת דיקור, צמחי מרפא, Qi Gong ותורת האנרגיה. הלימודים דורשים 4–5 שנות לימוד ויחס הוליסטי למטופל.',
    marketStatus: 'ביקוש גובר. מטופלים מחפשים חלופות לרפואה קונבנציונלית. הכנסה 10,000–25,000 ₪ בקליניקה פרטית.',
    endGoalJobs: ['רופא/ה סינ/ית', 'דייקרן/ית', 'מטפל/ת הוליסטי/ת'],
    advancedDegreesSteps: 'ניתן להמשיך להכשרות מתקדמות בסין. חברות בהסתדרות מטפלים הוליסטיים מסייעת לאמינות מקצועית.',
    programIds: ['reidman_chinese_medicine', 'ono_ce_chinese_medicine'],
  },

  naturopathy: {
    name: 'נטורופתיה',
    emoji: '🌿',
    aboutText: 'נטורופתיה היא גישה טיפולית הוליסטית המשלבת תזונה, צמחי מרפא, הומאופתיה ואורח חיים בריא. הלימודים כוללים ביוכימיה, אנטומיה ופסיכולוגיה.',
    marketStatus: 'ביקוש גובר בתחום הבריאות האינטגרטיבית. קליניקה פרטית מאפשרת גמישות. שכר 9,000–22,000 ₪.',
    endGoalJobs: ['נטורופת/ית', 'יועץ/ת תזונה הוליסטית', 'מטפל/ת אינטגרטיבי/ת'],
    programIds: ['reidman_naturopathy', 'broshim_naturopathy'],
  },

  homeopathy: {
    name: 'הומאופתיה',
    emoji: '💊',
    aboutText: 'הומאופתיה מבוססת על עקרון "דומה מרפא דומה" ושימוש בתמיסות מדוללות. הלימודים דורשים הבנה עמוקה של פרמטרים פיזיולוגיים.',
    marketStatus: 'נישה נאמנה. קליניקה פרטית. שכר 8,000–18,000 ₪.',
    endGoalJobs: ['הומאופת/ית', 'מטפל/ת הוליסטי/ת'],
    programIds: ['reidman_homeopathy', 'broshim_homeopathy', 'pardeshana_integrative'],
  },

  psychotherapy: {
    name: 'פסיכותרפיה אינטגרטיבית',
    emoji: '🫂',
    aboutText: 'לימודי פסיכותרפיה אינטגרטיבית מלמדים גישות טיפוליות שונות — CBT, גשטלט, פסיכודינמי — בשילוב גוף-נפש. הלימודים כוללים סופרוויז\'ן קליני.',
    marketStatus: 'ביקוש גובר. מודעות לבריאות הנפש עלתה משמעותית. שכר 10,000–25,000 ₪ בקליניקה פרטית.',
    endGoalJobs: ['פסיכותרפיסט/ית', 'מטפל/ת CBT', 'מאמן/ת אישי/ת', 'יועץ/ת ארגוני/ת'],
    advancedDegreesSteps: 'לא תחליף לרישיון פסיכולוג/ית. רבים ממשיכים לתואר שני ברפואה משלימה או בפסיכולוגיה קלינית.',
    programIds: ['broshim_psychotherapy', 'ono_ce_psychotherapy'],
  },

  reflexology: {
    name: 'רפלקסולוגיה',
    emoji: '🦶',
    aboutText: 'רפלקסולוגיה היא טיפול דרך לחיצות על נקודות בכפות הידיים והרגליים המקושרות לאיברים שונים. הלימודים כוללים אנטומיה, פיזיולוגיה וטכניקות לחיצה.',
    marketStatus: 'נישה. עובד בעיקר כ-Freelance. שכר 8,000–15,000 ₪.',
    endGoalJobs: ['רפלקסולוג/ית', 'מטפל/ת הוליסטי/ת'],
    programIds: ['reidman_reflexology'],
  },

  fullstack: {
    name: 'פיתוח Full-Stack',
    emoji: '🖥️',
    aboutText: 'בוטקאמפ Full-Stack מלמד פיתוח Web מקצה לקצה — Frontend (React, Vue) ו-Backend (Node, Python, APIs). הלימודים אינטנסיביים (6–12 חודשים), מעשיים ומכוונים לשוק העבודה.',
    marketStatus: 'ביקוש גבוה מאוד. מפתחי Full-Stack הם מהמבוקשים ביותר בהייטק. שכר ממוצע 18,000–35,000 ₪.',
    endGoalJobs: ['Full-Stack Developer', 'Frontend Developer', 'Backend Developer', 'Freelance Developer'],
    advancedDegreesSteps: 'לאחר שנת ניסיון ניתן לצמוח ל-Senior Developer. פורטפוליו חזק + GitHub פעיל שווים יותר מתואר.',
    programIds: ['hackeru_fullstack', 'elevation_fullstack'],
  },

  cyber: {
    name: 'סייבר ואבטחת מידע',
    emoji: '🔐',
    aboutText: 'לימודי סייבר מכסים אבטחת רשתות, Ethical Hacking, ניתוח פגיעויות, Forensics ו-SOC. ישראל היא מעצמת סייבר גלובלית עם אחד השווקים הטובים בעולם.',
    marketStatus: 'ביקוש גבוה ביותר. מחסור חמור במומחי סייבר ברמה גלובלית. שכר 20,000–50,000 ₪ למנוסים.',
    endGoalJobs: ['Penetration Tester', 'SOC Analyst', 'Incident Responder', 'CISO', 'Security Researcher'],
    advancedDegreesSteps: 'הסמכות בינלאומיות (OSCP, CEH, CISSP) מוסיפות ערך רב. CTF Competitions הם קורות חיים בפני עצמם.',
    programIds: ['hackeru_cyber', 'elevation_cyber', 'johnbryce_cyber'],
  },

  dataAnalysis: {
    name: 'אנליזת נתונים',
    emoji: '📉',
    aboutText: 'לימודי אנליזת נתונים מכסים Excel מתקדם, SQL, Python/R, Power BI ו-Machine Learning בסיסי. הלימודים מעשיים עם פרויקטים על נתוני עולם אמיתי.',
    marketStatus: 'ביקוש גבוה. כמעט כל ארגון צריך אנליסטים. שכר ממוצע 14,000–28,000 ₪.',
    endGoalJobs: ['Data Analyst', 'BI Developer', 'Business Analyst', 'מנהל/ת נתונים'],
    programIds: ['hackeru_data', 'itc_data_science'],
  },

  cloudDevOps: {
    name: 'Cloud & DevOps',
    emoji: '☁️',
    aboutText: 'לימודי Cloud & DevOps מכסים AWS/Azure/GCP, Docker, Kubernetes, CI/CD ו-Infrastructure as Code. תפקיד קריטי בכל צוות פיתוח מודרני.',
    marketStatus: 'ביקוש גבוה מאוד. מחסור בבעלי ניסיון Cloud. שכר 20,000–40,000 ₪.',
    endGoalJobs: ['DevOps Engineer', 'Cloud Architect', 'SRE', 'Platform Engineer'],
    programIds: ['johnbryce_cloud_devops'],
  },

  // ── New specialised fields ─────────────────────────────────────────────────

  soundEngineering: {
    name: 'הנדסת קול וסאונד',
    emoji: '🎵',
    aboutText: 'הנדסת קול וסאונד מכשירה מהנדסי אודיו לעבודה בסטודיואי הקלטה, תיאטרון, שידור ופיתוח גיימינג. הלימודים משלבים אלקטרוניקה, אקוסטיקה, עיבוד אותות דיגיטלי (DSP) ותוכנות DAW (Pro Tools, Logic Pro, Ableton). מסלולים מתמקדים בעיצוב סאונד, הפקה מוזיקלית ומערכות שמע מקצועיות.',
    marketStatus: 'ביקוש יציב בתעשיות הבידור, הקולנוע, הגיימינג ומערכות שמע מוסדיות. שכר ממוצע 12,000–26,000 ₪; מהנדסים בכירים ומפיקים עצמאיים מרוויחים יותר.',
    endGoalJobs: ['מהנדס/ת קול', 'מפיק/ה מוזיקלי/ת', 'Sound Designer לקולנוע וגיימינג', 'טכנאי/ת שמע לאולמות', 'Audio Engineer בסטודיו'],
    advancedDegreesSteps: 'הסמכות בינלאומיות (Pro Tools Certified, Dolby Atmos) מאיצות קריירה. תואר שני במוזיקה טכנולוגית פותח דלתות לתפקידי מחקר ופיתוח.',
    programIds: ['kinneret_sound_eng'],
  },

  marineBiology: {
    name: 'ביולוגיה ימית',
    emoji: '🌊',
    aboutText: 'ביולוגיה ימית עוסקת במחקר האוקיינוסים — אוכלוסיות דגים, אקולוגיה ימית, אלמוגים, פלנקטון ומדעי מכמורת. לישראל חוף ים תיכוני וים סוף המשמשים שדה מחקר פעיל. הלימודים משלבים ביולוגיה, כימיה ימית, אוקיינוגרפיה ומחקר שטח.',
    marketStatus: 'ביקוש מוגבל בישראל — בעיקר מחקר אקדמי, רשות הטבע, וחברות גידול דגים. ביקוש גבוה יותר בחו"ל ובארגונים בינלאומיים. שכר ממוצע 10,000–22,000 ₪.',
    endGoalJobs: ['חוקר/ת ביולוגיה ימית', 'מדען/ת סביבה', 'מנהל/ת שמורות טבע ימיות', 'יועץ/ת דיג מקיים', 'מדריך/ת צלילה מדעי/ת'],
    advancedDegreesSteps: 'תואר שני ושלישי נדרשים לתפקידי מחקר בכירים. מלגות לחקר ים תיכוני ניתן לקבל דרך אוניברסיטאות בינלאומיות.',
    programIds: ['ruppin_marine_bio'],
  },

  occupationalTherapy: {
    name: 'ריפוי בעיסוק',
    emoji: '🖐️',
    aboutText: 'ריפוי בעיסוק (Occupational Therapy) מסייע לאנשים עם מגבלות פיזיות, קוגניטיביות או נפשיות להשתתף בפעילויות היומיום. המקצוע בין-תחומי ודורש ידע רפואי, פסיכולוגי, התנהגותי ויצירתיות. בוגרים עובדים בבתי חולים, מרפאות, בתי ספר ובמרכזי שיקום.',
    marketStatus: 'ביקוש גבוה מאוד. מחסור כרוני בישראל, במיוחד לאוכלוסיות מיוחדות, ילדים ומבוגרים. שכר ממוצע 14,000–26,000 ₪; מרפאים בכירים ובמגזר הפרטי מרוויחים יותר.',
    endGoalJobs: ['מרפא/ה בעיסוק', 'מרפא/ה בעיסוק – ילדים', 'מרפא/ה בעיסוק – שיקום נוירולוגי', 'מנהל/ת מחלקת שיקום', 'יועץ/ת נגישות'],
    advancedDegreesSteps: 'תואר שני בריפוי בעיסוק פותח דלתות למחקר, הוראה והתמחויות קליניות מתקדמות. רישיון מקצועי ניתן לאחר סיום התואר ושנת התמחות.',
    programIds: ['tau_occupational_therapy', 'huji_occupational_therapy'],
  },
};

// Category-level emoji fallback for programs without a field mapping
export const CATEGORY_EMOJI: Record<string, string> = {
  'הנדסה וטכנולוגיה': '💻',
  'מדעי המחשב':        '💻',
  'הנדסה':             '⚙️',
  'מדעי החברה':        '🧠',
  'משפטים':            '⚖️',
  'כלכלה ועסקים':      '💼',
  'מדעי החיים':        '🧬',
  'מדעי הבריאות':      '🏥',
  'רפואה':             '🩺',
  'אמנות ועיצוב':      '🎨',
  'קולינריה וגסטרונומיה': '👨‍🍳',
  'רפואה אינטגרטיבית': '🌿',
  'טכנולוגיה ופיתוח':  '🖥️',
};
