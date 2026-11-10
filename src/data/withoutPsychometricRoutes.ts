/** Official admission routes checked on 10 November 2026 (Asia/Jerusalem).
 * Programme IDs are used only when the official route matches a catalogue identity.
 */
export const WITHOUT_PSYCHOMETRIC_CHECKED_ON = '2026-11-10';

export interface WithoutPsychometricRoute {
  institutionId: string;
  institution: string;
  programme: string;
  programId?: string;
  calculatorEligible?: boolean;
  average?: number;
  averageLabel?: string;
  conditions: string;
  status?: string;
  source: string;
}

const hujiSource = 'https://info.huji.ac.il/reception-channels/KabalaYeshira_Bagrut';
const hujiConditions =
  'לראויים לקידום יש סף נפרד כמפורט בטבלה. נדרשת גם עמידה בדרישות החוג האחרות, כגון אנגלית, עברית, מתמטיקה, מקצוע מדעי נוסף, ריאיון או בחינת כניסה, לפי החוג.';
const huji = (
  programme: string,
  programId: string | undefined,
  average: number,
  promoted: number,
): WithoutPsychometricRoute => ({
  institutionId: 'huji',
  institution: 'האוניברסיטה העברית',
  programme,
  ...(programId && { programId }),
  average,
  averageLabel: `ממוצע בגרות ${average} בסולם האוניברסיטה; ראויים לקידום ${promoted}`,
  conditions: hujiConditions,
  status: 'הטבלה הרשמית ללא שנת לימודים; האתר בעדכון לקראת תשפ״ח.',
  source: hujiSource,
});

const technion = (programme: string, programId?: string): WithoutPsychometricRoute => ({
  institutionId: 'technion',
  institution: 'הטכניון',
  programme,
  ...(programId && { programId }),
  average: 90,
  averageLabel: 'ממוצע בגרות רגיל 90, ללא בונוסים',
  conditions: 'אנגלית, מתמטיקה ופיזיקה: 5 יחידות בציון 95 לפחות בכל מקצוע; ריאיון אישי בפקולטה.',
  status: 'סמסטר א׳ תשפ״ז (אוקטובר 2026) בלבד.',
  source: 'https://admissions.technion.ac.il/acceptance-without-psychometric-exam/',
});

const biu = (programme: string, programId: string): WithoutPsychometricRoute => ({
  institutionId: 'biu',
  institution: 'אוניברסיטת בר־אילן',
  programme,
  programId,
  conditions: 'בדקו באתר המוסד את סף הבגרות ואת הדרישות הנוספות לפני הרשמה.',
  source: 'https://www.biu.ac.il/registration-and-admission/information/acceptance-no-psychometry',
});

export const withoutPsychometricRoutes: readonly WithoutPsychometricRoute[] = [
  technion('הנדסה אזרחית', 'technion_civil'),
  technion('הנדסת הסביבה'),
  {
    institutionId: 'haifa',
    institution: 'אוניברסיטת חיפה',
    programme: 'סיעוד',
    programId: 'haifa_nursing',
    average: 90,
    averageLabel: 'ממוצע בגרות משוקלל 90',
    conditions:
      'לבוגרי מגמת בריאות בלבד: בגרות מלאה, ציון 90 לפחות במקצועות המגמה, מבחן אינטליגנציה רגשית ודרישות סיווג באנגלית ובעברית.',
    status: 'מסלול ייעודי לבוגרי מגמת בריאות.',
    source: 'https://admissions.haifa.ac.il/social-welfare-health-sciences/program/2973/',
  },
  {
    institutionId: 'haifa',
    institution: 'אוניברסיטת חיפה',
    programme: 'סוציולוגיה',
    programId: 'haifa_sociology',
    average: 90,
    averageLabel: 'ממוצע בגרות משוקלל 90',
    conditions:
      'בגרות מלאה; אנגלית 4 יחידות בציון 85 או 5 יחידות בציון 60; דרישות סיווג באנגלית ובעברית.',
    source: 'https://admissions.haifa.ac.il/social-sciences/program/2968/',
  },
  {
    institutionId: 'achva',
    institution: 'המכללה האקדמית אחוה',
    programme: 'מערכות מידע ומדעי המחשב היישומיים',
    programId: 'achva_cs_information_systems',
    average: 95,
    averageLabel: 'ממוצע בגרות 95',
    conditions: 'בגרות מלאה; מתמטיקה 5 יחידות בציון 75 לפחות או 4 יחידות בציון 90 לפחות.',
    source: 'https://www.achva.ac.il/תואר-ראשון/תואר-ראשון-דו-חוגי-במערכות-מידע-ומדעי-ה/',
  },
  {
    institutionId: 'achva',
    institution: 'המכללה האקדמית אחוה',
    programme: 'מערכות מידע ומדעי המחשב היישומיים',
    programId: 'achva_cs_information_systems',
    average: 100,
    averageLabel: 'ממוצע בגרות 100',
    conditions: 'בגרות מלאה; מתמטיקה 5 יחידות בציון 70 לפחות או 4 יחידות בציון 80 לפחות.',
    source: 'https://www.achva.ac.il/תואר-ראשון/תואר-ראשון-דו-חוגי-במערכות-מידע-ומדעי-ה/',
  },
  {
    institutionId: 'hadassah',
    institution: 'המרכז האקדמי הרב־תחומי ירושלים',
    programme: 'מדעי המחשב',
    programId: 'mon_12220685569_cs',
    average: 95,
    averageLabel: 'ממוצע בגרות משוקלל 95',
    conditions:
      'מתמטיקה 4 יחידות בציון 90 או 5 יחידות בציון 75. ריאיון לפי החלטת ראש החוג; הוא רשאי לדרוש גם מבחן תי״ל. ללא פסיכומטרי נדרשת בחינת סיווג באנגלית, ולמי ששפת אימם אינה עברית נדרשת בחינת סיווג בעברית.',
    source:
      'https://www.jmc.ac.il/תוכניות-לימוד/ביה-ס-הבינתחומי-לבריאות-חברה-ומדע/מדעי-המחשב/קבלה-ורישום/תנאי-קבלה/',
  },
  {
    institutionId: 'hadassah',
    institution: 'המרכז האקדמי הרב־תחומי ירושלים',
    programme: 'מדעי המחשב',
    programId: 'mon_12220685569_cs',
    average: 100,
    averageLabel: 'ממוצע בגרות משוקלל 100',
    conditions:
      'מתמטיקה 4 יחידות בציון 80 או 5 יחידות בציון 70. ריאיון לפי החלטת ראש החוג; הוא רשאי לדרוש גם מבחן תי״ל. ללא פסיכומטרי נדרשת בחינת סיווג באנגלית, ולמי ששפת אימם אינה עברית נדרשת בחינת סיווג בעברית.',
    source:
      'https://www.jmc.ac.il/תוכניות-לימוד/ביה-ס-הבינתחומי-לבריאות-חברה-ומדע/מדעי-המחשב/קבלה-ורישום/תנאי-קבלה/',
  },
  {
    institutionId: 'ono',
    institution: 'הקריה האקדמית אונו',
    programme: 'סיעוד — אפיק מעבר',
    programId: 'ono_nursing',
    average: 85,
    averageLabel: 'ממוצע בגרות 85',
    conditions: 'ריאיון קבלה ועמידה בכל הדרישות האקדמיות של אפיק המעבר.',
    status: 'קבלה לאפיק מעבר; הקבלה לתואר מותנית בהשלמתו.',
    source: 'https://www.ono.ac.il/curriculum/nursing/',
  },
  {
    institutionId: 'ono',
    institution: 'הקריה האקדמית אונו',
    programme: 'סיעוד — מסלול מצוינות מדעי',
    programId: 'ono_nursing',
    average: 100,
    averageLabel: 'ממוצע בגרות 100',
    conditions:
      '5 יחידות לפחות במקצוע מדעי; ריאיון קבלה, אנגלית ברמת מתקדמים א׳ ועברית ברמת מתקדמים.',
    source: 'https://www.ono.ac.il/curriculum/nursing/',
  },
  {
    institutionId: 'ono',
    institution: 'הקריה האקדמית אונו',
    programme: 'סיעוד — מסלול מצוינות בבגרות',
    programId: 'ono_nursing',
    average: 103,
    averageLabel: 'ממוצע בגרות 103',
    conditions: 'ריאיון קבלה, אנגלית ברמת מתקדמים א׳ ועברית ברמת מתקדמים.',
    source: 'https://www.ono.ac.il/curriculum/nursing/',
  },
  {
    institutionId: 'haifa',
    institution: 'אוניברסיטת חיפה',
    programme: 'חשבונאות — מסלול אופק',
    programId: 'haifa_accounting',
    average: 100,
    averageLabel: 'ממוצע בגרות משוקלל 100, כולל בונוסים',
    conditions:
      'בגרות מלאה; מתמטיקה 4 יחידות בציון 80 או 5 יחידות בציון 60; קורס רישום מידע חשבונאי בציון 60 לפני תחילת הלימודים; סיווג באנגלית ובעברית; שישה קורסים בציון 60 לפחות בסמסטר הראשון.',
    status: 'קבלה מן המניין רק לאחר השלמת מסלול אופק.',
    source: 'https://admissions.haifa.ac.il/social-sciences/program/2484/',
  },
  {
    institutionId: 'haifa',
    institution: 'אוניברסיטת חיפה',
    programme: 'מדע המדינה',
    programId: 'haifa_politicalscience',
    average: 102,
    averageLabel: 'ממוצע בגרות משוקלל 102',
    conditions: 'בגרות מלאה ודרישות סיווג באנגלית ובעברית.',
    source: 'https://admissions.haifa.ac.il/social-sciences/program/3054/',
  },
  {
    institutionId: 'tau',
    institution: 'אוניברסיטת תל אביב',
    programme: 'תקשורת',
    programId: 'communication',
    average: 102,
    averageLabel: 'ממוצע בגרות 102',
    conditions: 'זכאות לבגרות ועמידה בדרישות הקבלה הכלליות של האוניברסיטה.',
    status: 'המקור מתייחס לסמסטר א׳ תשפ״ז.',
    source: 'https://go.tau.ac.il/he/social-sciences/ba/communications?v=requirements',
  },
  {
    institutionId: 'tau',
    institution: 'אוניברסיטת תל אביב',
    programme: 'מדע המדינה — אפיק קורסים מקוונים',
    programId: 'political_science',
    average: 97,
    averageLabel: 'ממוצע בגרות 97',
    conditions:
      'זכאות לבגרות ושני קורסים מקוונים, אחד מכל מקבץ המפורט באתר החוג, בציון 85 לפחות בכל קורס.',
    status: 'המקור מתייחס לסמסטר א׳ תשפ״ז.',
    source: 'https://go.tau.ac.il/he/social-sciences/ba/political-science?v=admission-requirements',
  },
  {
    institutionId: 'tau',
    institution: 'אוניברסיטת תל אביב',
    programme: 'מדע המדינה',
    programId: 'political_science',
    average: 102,
    averageLabel: 'ממוצע בגרות 102',
    conditions: 'זכאות לבגרות ועמידה בדרישות הקבלה הכלליות של האוניברסיטה.',
    status: 'המקור מתייחס לסמסטר א׳ תשפ״ז.',
    source: 'https://go.tau.ac.il/he/social-sciences/ba/political-science?v=admission-requirements',
  },
  {
    institutionId: 'tau',
    institution: 'אוניברסיטת תל אביב',
    programme: 'חינוך — אפיק קורסים מקוונים',
    programId: 'education',
    average: 97,
    averageLabel: 'ממוצע בגרות משוקלל 97',
    conditions: 'זכאות לבגרות ושני קורסים מקוונים מהרשימה הרשמית בציון 80 לפחות בכל קורס.',
    status: 'המקור מתייחס לסמסטר א׳ תשפ״ז.',
    source: 'https://go.tau.ac.il/he/education/ba?v=requirements',
  },
  {
    institutionId: 'tau',
    institution: 'אוניברסיטת תל אביב',
    programme: 'חינוך',
    programId: 'education',
    average: 102,
    averageLabel: 'ממוצע בגרות 102, כולל בונוסים',
    conditions: 'זכאות לבגרות ועמידה בדרישות הקבלה הכלליות של האוניברסיטה.',
    status: 'המקור מתייחס לסמסטר א׳ תשפ״ז.',
    source: 'https://go.tau.ac.il/he/education/ba?v=requirements',
  },
  {
    institutionId: 'tau',
    institution: 'אוניברסיטת תל אביב',
    programme: 'מנהל עסקים',
    programId: 'tau_business',
    calculatorEligible: true,
    average: 104,
    averageLabel: 'ממוצע בגרות 104, כולל בונוסים',
    conditions:
      'אנגלית 5 יחידות בציון 85, מתמטיקה 5 יחידות בציון 70 או 4 יחידות בציון 90, ללא בונוסים בציוני המקצועות; הכרת דוחות כספיים וצעדים ראשונים במדעי המחשב ותכנות בפייתון, כל אחד בציון 85 לפחות.',
    status: 'המקור מתייחס לסמסטר א׳ תשפ״ז; ההרשמה לחוג היא בסמסטר א׳ בלבד.',
    source: 'https://go.tau.ac.il/he/management/ba/management?v=requirements',
  },
  {
    institutionId: 'tau',
    institution: 'אוניברסיטת תל אביב',
    programme: 'חשבונאות',
    programId: 'tau_accounting',
    average: 104,
    averageLabel: 'ממוצע בגרות 104, כולל בונוסים',
    conditions:
      'אנגלית 5 יחידות בציון 85, מתמטיקה 5 יחידות בציון 70 או 4 יחידות בציון 90, ללא בונוסים בציוני המקצועות; הכרת דוחות כספיים וצעדים ראשונים במדעי המחשב ותכנות בפייתון, כל אחד בציון 85 לפחות.',
    status: 'המקור מתייחס לסמסטר א׳ תשפ״ז; ההרשמה לחוג היא בסמסטר א׳ בלבד.',
    source: 'https://go.tau.ac.il/he/management/ba/accounting?v=admission-requirements',
  },
  {
    institutionId: 'haifa',
    institution: 'אוניברסיטת חיפה',
    programme: 'מדעי המחשב — מסלול אופק',
    programId: 'haifa_cs',
    average: 105,
    averageLabel: 'ממוצע בגרות משוקלל 105',
    conditions:
      'בגרות מלאה; מתמטיקה 4 יחידות בציון 85 או 5 יחידות בציון 75; דרישות סיווג באנגלית ובעברית, קורות חיים, וקורסי מסלול אופק. מספר המקומות מוגבל והקבלה נתונה לשיקול ועדה.',
    status: 'מסלול מותנה החל מתשפ״ז; הקבלה אינה מובטחת.',
    source: 'https://admissions.haifa.ac.il/computer-information-science/program/3210/',
  },
  {
    institutionId: 'bgu',
    institution: 'אוניברסיטת בן־גוריון בנגב',
    programme: 'מנהל עסקים — כלכלה חד־מחלקתי',
    programId: 'bgu_business',
    average: 107,
    averageLabel: 'ממוצע בגרות 107',
    conditions:
      'מתמטיקה 5 יחידות בציון 75 או 4 יחידות בציון 85; אנגלית ברמת בסיסי ועברית ברמה ה׳ לנדרשים. ממוצע 87 במכינת המדעים המדויקים וההנדסה או מדעי הטבע והחיים של בן־גוריון יכול להחליף את ממוצע הבגרות.',
    status: 'סתיו תשפ״ז (2027/1): ההרשמה סגורה.',
    source: 'https://www.bgu.ac.il/welcome/ba/catalog/categories/economics/',
  },
  {
    institutionId: 'bgu',
    institution: 'אוניברסיטת בן־גוריון בנגב',
    programme: 'תקשורת — דו־מחלקתי',
    programId: 'communication',
    average: 98,
    averageLabel: 'ממוצע בגרות 98',
    conditions:
      'אנגלית ברמת בסיסי ועברית ברמה ה׳ לנדרשים. ממוצע 70 במכינת המדעים המדויקים וההנדסה או מדעי הטבע והחיים של בן־גוריון יכול להחליף את ממוצע הבגרות.',
    status: 'סתיו תשפ״ז (2027/1): ההרשמה סגורה.',
    source: 'https://www.bgu.ac.il/welcome/ba/catalog/categories/communication-studies/',
  },
  {
    institutionId: 'bgu',
    institution: 'אוניברסיטת בן־גוריון בנגב',
    programme: 'פוליטיקה וממשל — דו־מחלקתי',
    programId: 'political_science',
    average: 100,
    averageLabel: 'ממוצע בגרות 100',
    conditions:
      'אנגלית ברמת בסיסי ועברית ברמה ה׳ לנדרשים. ממוצע 70 במכינת המדעים המדויקים וההנדסה או מדעי הטבע והחיים של בן־גוריון יכול להחליף את ממוצע הבגרות.',
    status: 'סתיו תשפ״ז (2027/1): ההרשמה סגורה.',
    source: 'https://www.bgu.ac.il/welcome/ba/catalog/categories/politics-and-government/',
  },
  {
    institutionId: 'bgu',
    institution: 'אוניברסיטת בן־גוריון בנגב',
    programme: 'חינוך — דו־מחלקתי',
    programId: 'education',
    average: 96,
    averageLabel: 'ממוצע בגרות 96',
    conditions:
      'אנגלית ברמת בסיסי ועברית ברמה ה׳ לנדרשים. ממוצע 70 במכינת המדעים המדויקים וההנדסה או מדעי הטבע והחיים של בן־גוריון יכול להחליף את ממוצע הבגרות. יש לעמוד גם בתנאי המחלקה השנייה.',
    status: 'סתיו תשפ״ז (2027/1): ההרשמה סגורה.',
    source: 'https://www.bgu.ac.il/welcome/ba/catalog/categories/education/',
  },
  {
    institutionId: 'bgu',
    institution: 'אוניברסיטת בן־גוריון בנגב',
    programme: 'חינוך — חוג ראשי',
    programId: 'education',
    average: 107,
    averageLabel: 'ממוצע בגרות 107',
    conditions:
      'אנגלית ברמת בסיסי ועברית ברמה ה׳ לנדרשים. ממוצע 89 במכינת המדעים המדויקים וההנדסה או מדעי הטבע והחיים של בן־גוריון יכול להחליף את ממוצע הבגרות; בשילוב חטיבה במדעי הטבע או במדעי המחשב נדרש גם סף החטיבה.',
    status: 'סתיו תשפ״ז (2027/1): ההרשמה סגורה.',
    source: 'https://www.bgu.ac.il/welcome/ba/catalog/categories/education/',
  },
  huji('חשבונאות', 'huji_accounting', 110, 106.5),
  huji('כלכלה', 'huji_economics', 110, 106.5),
  huji('מנהל עסקים', 'huji_business', 110, 106.5),
  huji('סטטיסטיקה ומדע הנתונים', undefined, 110, 106.5),
  huji('מדעי התזונה', undefined, 105, 101.5),
  huji('רוקחות', undefined, 113, 109.5),
  {
    institutionId: 'bgu',
    institution: 'אוניברסיטת בן־גוריון בנגב',
    programme: 'פסיכולוגיה — דו־מחלקתי',
    programId: 'bgu_psychology',
    average: 113,
    averageLabel: 'ממוצע בגרות 113',
    conditions:
      'אנגלית ברמת בסיסי ועברית ברמה ה׳ לנדרשים. ממוצע 94 במכינת המדעים המדויקים וההנדסה או מדעי הטבע והחיים של בן־גוריון יכול להחליף את ממוצע הבגרות.',
    status: 'סתיו תשפ״ז (2027/1): ההרשמה סגורה.',
    source: 'https://www.bgu.ac.il/welcome/ba/catalog/categories/psychology/',
  },
  huji('פסיכולוגיה', 'huji_psychology', 113, 109.5),
  huji('משפטים', 'huji_law', 113, 109.5),
  huji('מדעי המחשב', 'huji_cs', 114, 110.5),
  biu('משפטים', 'biu_law'),
  biu('קרימינולוגיה', 'biu_criminology'),
  biu('מדעי החיים', 'biu_lifesciences'),
  biu('ביוטכנולוגיה', 'biu_biotech'),
  biu('ביולוגיה חישובית', 'biu_computational_bio'),
  {
    institutionId: 'haifa',
    institution: 'אוניברסיטת חיפה',
    programme: 'תקשורת — מסלול אופק',
    programId: 'haifa_communication',
    conditions:
      'בגרות מלאה ללא סף ממוצע מפורסם; סיווג באנגלית ובעברית, ושניים או שלושה קורסים בציון 70 לפחות במהלך הסמסטר הראשון.',
    status: 'קבלה לתואר מותנית בהשלמת מסלול אופק.',
    source: 'https://admissions.haifa.ac.il/social-sciences/program/3229/',
  },
  {
    institutionId: 'tau',
    institution: 'אוניברסיטת תל אביב',
    programme: 'סיעוד — אפיק קורסים מקוונים',
    programId: 'nursing',
    conditions:
      'זכאות לבגרות; אנגלית 5 יחידות בציון 90 לפחות; שני קורסים מקוונים מהרשימה הרשמית בציון 85 לפחות בכל קורס. נדרשים גם מבדקי התאמה, ריאיון ועמידה בדרישות השפה.',
    status: 'המקור מתייחס לסמסטר א׳ תשפ״ז; החוג בוחר מועמדים לפי מכלול הנתונים.',
    source: 'https://go.tau.ac.il/he/med/ba/nursing?v=admission-requirements',
  },
  {
    institutionId: 'tau',
    institution: 'אוניברסיטת תל אביב',
    programme: 'חינוך — אפיק מקצועות בגרות',
    programId: 'education',
    conditions: 'זכאות לבגרות; אנגלית 5 יחידות ומתמטיקה 4 יחידות, בציון 80 לפחות בכל אחד מהם.',
    status: 'המקור מתייחס לסמסטר א׳ תשפ״ז.',
    source: 'https://go.tau.ac.il/he/education/ba?v=requirements',
  },
].sort((a, b) => (a.average ?? Infinity) - (b.average ?? Infinity));
