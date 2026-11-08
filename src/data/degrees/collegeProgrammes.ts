import { INSTITUTION_BY_ID, type InstitutionId } from '../institutions';
import type { Program } from './types';

interface CollegeProgrammeSpec {
  id: string;
  institutionId: Extract<InstitutionId, 'achva' | 'beit_berl' | 'david_yellin'>;
  name: string;
  category: string;
  credential: string;
  url: string;
  admissionsUrl?: string;
  durationYears?: number;
  notes: string[];
}

const davidYellinGeneralChecks = [
  'נדרשים ועדת קבלה וריאיון אישי, וכן ציון מיון באנגלית.',
  'ללומדים במסלול בעברית עם בגרות שאינה בעברית נדרש יע״ל 110 לפחות עד סוף שנה א׳. לבעלי בגרות מחו״ל תנאים נפרדים.',
];

// Individual current programme and admissions pages checked on 2026-11-08.
// Exact claim-to-source records are in docs/admissions-verification/2026-11-08-four-colleges.md.
const specs: CollegeProgrammeSpec[] = [
  {
    id: 'achva_psychology',
    institutionId: 'achva',
    name: 'פסיכולוגיה (B.A.)',
    category: 'פסיכולוגיה',
    credential: 'B.A.',
    durationYears: 3,
    url: 'https://www.achva.ac.il/תואר-ראשון/תואר-ראשון-בפסיכולוגיה/',
    notes: [
      'קבלה על סמך בגרות: ממוצע 85 לפחות, עם 4 יחידות באנגלית בציון 70 לפחות.',
      'קיימים גם אפיקי קבלה על סמך פסיכומטרי או מכינה; התנאים המלאים מפורטים באתר המכללה.',
    ],
  },
  {
    id: 'achva_digital_behavior',
    institutionId: 'achva',
    name: 'התנהגות אנושית בעולם דיגיטלי (B.A.)',
    category: 'מדעי החברה',
    credential: 'B.A.',
    durationYears: 3,
    url: 'https://www.achva.ac.il/תואר-ראשון/תואר-ראשון-בהתנהגות-אנושית-בעידן-דיגי/',
    notes: [
      'קבלה על סמך בגרות: ממוצע 85, 3 יחידות במתמטיקה בציון 80 ו־4 יחידות באנגלית בציון 70.',
      'קיים גם אפיק עם בגרות מלאה וציון פסיכומטרי או סכם 535; תנאי האפיקים הנוספים באתר המכללה.',
    ],
  },
  {
    id: 'achva_cs_information_systems',
    institutionId: 'achva',
    name: 'מערכות מידע ומדעי המחשב היישומיים (B.Sc.)',
    category: 'מדעי המחשב',
    credential: 'B.Sc.',
    durationYears: 3,
    url: 'https://www.achva.ac.il/תואר-ראשון/תואר-ראשון-דו-חוגי-במערכות-מידע-ומדעי-ה/',
    notes: [
      'מסלול דו־חוגי. קבלה על סמך פסיכומטרי או סכם 550 לפחות, עם 4 יחידות במתמטיקה בציון 80 או 5 יחידות בציון 70.',
      'קיים גם אפיק ללא פסיכומטרי לבעלי ממוצע בגרות 100 לפחות העומדים בדרישת המתמטיקה; יתר האפיקים באתר המכללה.',
    ],
  },
  {
    id: 'achva_information_systems',
    institutionId: 'achva',
    name: 'מערכות מידע (B.Sc.)',
    category: 'מערכות מידע',
    credential: 'B.Sc.',
    durationYears: 3,
    url: 'https://www.achva.ac.il/תואר-ראשון/תואר-ראשון-במערכות-מידע/',
    notes: [
      'מסלול חד־חוגי. קבלה על סמך פסיכומטרי או סכם 550 לפחות, עם 5 יחידות במתמטיקה בציון 70 או 4 יחידות בציון 80.',
      'קיים גם אפיק בגרות בממוצע 90 לפחות עם דרישת המתמטיקה; יתר האפיקים באתר המכללה.',
    ],
  },
  {
    id: 'achva_communication_disorders',
    institutionId: 'achva',
    name: 'הפרעות בתקשורת (B.A.)',
    category: 'רפואה',
    credential: 'B.A.',
    durationYears: 3.5,
    url: 'https://www.achva.ac.il/תואר-ראשון/תואר-ראשון-בהפרעות-בתקשורת/',
    notes: [
      'קבלה על סמך סכם 650 לפחות או פסיכומטרי 630 לפחות, רמת אנגלית מתקדמים א׳ לפחות וועדת קבלה.',
      'למועמדים ששפת אמם אינה עברית נדרש ציון 107 לפחות ביע״ל.',
    ],
  },
  {
    id: 'achva_life_sciences',
    institutionId: 'achva',
    name: 'מדעי החיים (B.Sc.)',
    category: 'מדעי החיים',
    credential: 'B.Sc.',
    durationYears: 3,
    url: 'https://www.achva.ac.il/תואר-ראשון/תואר-ראשון-במדעי-החיים/',
    notes: [
      'קבלה על סמך בגרות: ממוצע 90 לפחות, 4 יחידות באנגלית בציון 70, 4 יחידות במתמטיקה בציון עובר ו־5 יחידות במקצוע מדעי בציון 70 לפחות.',
      'קיימים גם אפיקי פסיכומטרי ומכינה; פירוט התנאים באתר המכללה.',
    ],
  },
  {
    id: 'achva_education',
    institutionId: 'achva',
    name: 'חינוך ותעודת הוראה (B.Ed.)',
    category: 'חינוך',
    credential: 'B.Ed.',
    url: 'https://www.achva.ac.il/תואר-ראשון/תואר-ראשון-בחינוך/',
    notes: [
      'התואר משלב תעודת הוראה. משך הלימודים שלוש עד ארבע שנים, בהתאם למסלול.',
      'אפיקי הקבלה כוללים בגרות מלאה, פסיכומטרי, תעודת הנדסאי או מכינה ייעודית; המכללה מפרטת את התנאים בייעוץ והרשמה.',
    ],
  },
  {
    id: 'achva_social_humanities',
    institutionId: 'achva',
    name: 'מדעי החברה והרוח, רב־תחומי (B.A.)',
    category: 'מדעי החברה',
    credential: 'B.A.',
    durationYears: 3,
    url: 'https://www.achva.ac.il/תואר-ראשון/תואר-ראשון-b-a-רב-תחומי-במדעי-החברה-והרוח/',
    notes: [
      'קבלה על סמך בגרות: ממוצע 75 לפחות עם 4 יחידות באנגלית.',
      'קיימים גם אפיקי פסיכומטרי או סכם 400 ומכינה קדם־אקדמית; התנאים המלאים באתר המכללה.',
    ],
  },
  {
    id: 'beit_berl_early_childhood',
    institutionId: 'beit_berl',
    name: 'חינוך לגיל הרך (B.Ed.)',
    category: 'חינוך',
    credential: 'B.Ed.',
    url: 'https://www.beitberl.ac.il/academic/gil-rach/',
    admissionsUrl: 'https://www.beitberl.ac.il/admission/b-ed/',
    notes: ['קבלה על סמך בגרות: ממוצע 85 לפחות. בחלק מהמסלולים ייתכנו הליכי מיון נוספים.'],
  },
  {
    id: 'beit_berl_primary_education',
    institutionId: 'beit_berl',
    name: 'חינוך לבית הספר היסודי (B.Ed.)',
    category: 'חינוך',
    credential: 'B.Ed.',
    durationYears: 4,
    url: 'https://www.beitberl.ac.il/academic/yesodi/',
    admissionsUrl: 'https://www.beitberl.ac.il/admission/b-ed/',
    notes: [
      'המסלול משלב תואר ראשון ותעודת הוראה לבית הספר היסודי.',
      'קבלה על סמך בגרות: ממוצע 85 לפחות. בחלק מהמסלולים ייתכנו הליכי מיון נוספים.',
    ],
  },
  {
    id: 'beit_berl_secondary_education',
    institutionId: 'beit_berl',
    name: 'חינוך לבית הספר העל־יסודי (B.Ed.)',
    category: 'חינוך',
    credential: 'B.Ed.',
    durationYears: 4,
    url: 'https://www.beitberl.ac.il/academic/al-yesodi/',
    admissionsUrl: 'https://www.beitberl.ac.il/admission/b-ed/',
    notes: [
      'המסלול משלב תואר ראשון ותעודת הוראה לבית הספר העל־יסודי.',
      'קבלה על סמך בגרות: ממוצע 85 לפחות. בחלק מהמסלולים ייתכנו הליכי מיון נוספים.',
    ],
  },
  {
    id: 'beit_berl_special_education',
    institutionId: 'beit_berl',
    name: 'חינוך מיוחד (B.Ed.)',
    category: 'חינוך',
    credential: 'B.Ed.',
    url: 'https://www.beitberl.ac.il/academic/chinuch-meyuchad/',
    admissionsUrl: 'https://www.beitberl.ac.il/admission/b-ed/',
    notes: [
      'המסלול משלב תואר ראשון ותעודת הוראה בחינוך מיוחד.',
      'קבלה על סמך בגרות: ממוצע 85 לפחות. בחלק מהמסלולים ייתכנו הליכי מיון נוספים.',
    ],
  },
  {
    id: 'beit_berl_special_early_childhood',
    institutionId: 'beit_berl',
    name: 'חינוך מיוחד בגיל הרך (B.Ed.)',
    category: 'חינוך',
    credential: 'B.Ed.',
    url: 'https://www.beitberl.ac.il/academic/meyuhad-rach/',
    admissionsUrl: 'https://www.beitberl.ac.il/admission/b-ed/',
    notes: ['קבלה על סמך בגרות: ממוצע 85 לפחות. בחלק מהמסלולים ייתכנו הליכי מיון נוספים.'],
  },
  {
    id: 'beit_berl_english_teaching',
    institutionId: 'beit_berl',
    name: 'הוראת אנגלית (B.Ed.)',
    category: 'חינוך',
    credential: 'B.Ed.',
    url: 'https://www.beitberl.ac.il/academic/english/',
    admissionsUrl: 'https://www.beitberl.ac.il/admission/b-ed/',
    notes: [
      'קבלה על סמך בגרות: ממוצע 85 לפחות, עם 5 יחידות באנגלית בציון 80 לפחות. בחלק מהמסלולים ייתכנו הליכי מיון נוספים.',
    ],
  },
  {
    id: 'beit_berl_non_formal_education',
    institutionId: 'beit_berl',
    name: 'חינוך בלתי פורמלי (B.Ed.)',
    category: 'חינוך',
    credential: 'B.Ed.',
    url: 'https://www.beitberl.ac.il/academic/bilti-formal/',
    admissionsUrl: 'https://www.beitberl.ac.il/admission/b-ed/',
    notes: [
      'המסלול מעניק גם תעודת עובד חינוך; אפשר לשלב הכשרה לתעודת הוראה.',
      'קבלה על סמך בגרות: ממוצע 85 לפחות. בחלק מהמסלולים ייתכנו הליכי מיון נוספים.',
    ],
  },
  {
    id: 'beit_berl_youth_advancement',
    institutionId: 'beit_berl',
    name: 'קידום נוער (B.Ed.)',
    category: 'חינוך',
    credential: 'B.Ed.',
    url: 'https://www.beitberl.ac.il/academic/kidum-noar/',
    admissionsUrl: 'https://www.beitberl.ac.il/admission/b-ed/',
    notes: [
      'המסלול מעניק גם תעודת עובד חינוך בהתמחות בקידום נוער בסיכון.',
      'קבלה על סמך בגרות: ממוצע 85 לפחות. בחלק מהמסלולים ייתכנו הליכי מיון נוספים.',
    ],
  },
  {
    id: 'beit_berl_art_teaching',
    institutionId: 'beit_berl',
    name: 'אמנות והוראת אמנות (B.Ed.F.A.)',
    category: 'אמנות',
    credential: 'B.Ed.F.A.',
    url: 'https://www.beitberl.ac.il/academic/bedfa/',
    admissionsUrl: 'https://www.beitberl.ac.il/admission/bed-fa/',
    notes: [
      'ממוצע בגרות 85 לפחות, תיק עבודות, עבודת בית וראיון בפני ועדת מיון.',
      'למועמדים מעל גיל 30 ללא בגרות יש אפיק מכינה ייעודית; פירוט באתר המכללה.',
    ],
  },
  {
    id: 'beit_berl_film_education',
    institutionId: 'beit_berl',
    name: 'קולנוע והוראת קולנוע (B.Ed.F.A.)',
    category: 'קולנוע',
    credential: 'B.Ed.F.A.',
    url: 'https://www.beitberl.ac.il/academic/bed-cinema/',
    admissionsUrl: 'https://www.beitberl.ac.il/admission/bed-cinema/',
    notes: [
      'נדרשת תעודת בגרות. ממוצע בגרות 85 לפחות עם מקצוע מוגבר של 5 יחידות פוטר מפסיכומטרי.',
      'מבחן כניסה או עבודת בית וראיון אישי; בעלי בגרות שאינה עומדת בתנאי הפטור נדרשים לפסיכומטרי.',
    ],
  },
  {
    id: 'beit_berl_criminology',
    institutionId: 'beit_berl',
    name: 'קרימינולוגיה, קהילה וחינוך (B.A.)',
    category: 'מדעי החברה',
    credential: 'B.A.',
    durationYears: 3,
    url: 'https://www.beitberl.ac.il/academic/ba-criminlogoy/',
    admissionsUrl: 'https://www.beitberl.ac.il/admission/criminology/',
    notes: [
      'ממוצע בגרות 85 לפחות פוטר מפסיכומטרי; יש להציג ציון במבחן אמיר״ם.',
      'בממוצע בגרות 84 ומטה נדרש פסיכומטרי 450 לפחות. נדרשים גם ראיון ומכתב קבלה אישי.',
    ],
  },
  {
    id: 'beit_berl_ai_education',
    institutionId: 'beit_berl',
    name: 'בינה מלאכותית וחינוך (B.A.)',
    category: 'חינוך',
    credential: 'B.A.',
    url: 'https://www.beitberl.ac.il/degree/bed-ba/',
    notes: [
      'תנאי הקבלה למסלול אינם מפורטים בעמוד התוכנית. אפשר לברר אותם במרכז הייעוץ והרישום של המכללה.',
    ],
  },
  {
    id: 'david_yellin_early_childhood',
    institutionId: 'david_yellin',
    name: 'חינוך לגיל הרך (B.Ed.)',
    category: 'חינוך',
    credential: 'B.Ed.',
    durationYears: 4,
    url: 'https://dyellin.ac.il/bed/kindergarden',
    notes: [
      'המסלול משלב תואר ראשון ותעודת הוראה לגיל הרך.',
      'לפי עמוד המסלול: בגרות או מכינה בממוצע 92 לפחות, או בגרות וציון משולב 540 לפחות. המכללה מפרטת בנפרד את תנאי ההכרה במכינות.',
      ...davidYellinGeneralChecks,
    ],
  },
  {
    id: 'david_yellin_primary_education',
    institutionId: 'david_yellin',
    name: 'חינוך לבית הספר היסודי (B.Ed.)',
    category: 'חינוך',
    credential: 'B.Ed.',
    durationYears: 3,
    url: 'https://dyellin.ac.il/bed/elementary',
    notes: [
      'המסלול משלב תואר ראשון ותעודת הוראה לכיתות א׳–ו׳.',
      'לפי עמוד המסלול: בגרות או מכינה בממוצע 92 לפחות, או בגרות וציון משולב 540 לפחות. המכללה מפרטת בנפרד את תנאי ההכרה במכינות.',
      ...davidYellinGeneralChecks,
    ],
  },
  {
    id: 'david_yellin_secondary_education',
    institutionId: 'david_yellin',
    name: 'חינוך לבית הספר העל־יסודי (B.Ed.)',
    category: 'חינוך',
    credential: 'B.Ed.',
    url: 'https://dyellin.ac.il/bed/junior_high_ed',
    notes: [
      'מסלול תלת־שנתי לתעודת הוראה אחת או ארבע־שנתי לשתי תעודות הוראה.',
      'לפי עמוד המסלול: בגרות או מכינה בממוצע 95 לפחות, או בגרות וציון משולב 540 לפחות. המכללה מפרטת בנפרד את תנאי ההכרה במכינות.',
      ...davidYellinGeneralChecks,
    ],
  },
  {
    id: 'david_yellin_special_education',
    institutionId: 'david_yellin',
    name: 'חינוך מיוחד (B.Ed.)',
    category: 'חינוך',
    credential: 'B.Ed.',
    durationYears: 4,
    url: 'https://dyellin.ac.il/bed/special_ed',
    admissionsUrl: 'https://dyellin.ac.il/prerequisites',
    notes: [
      'המסלול משלב תואר ראשון ותעודת הוראה בחינוך מיוחד לגילי 6–21.',
      'לפי עמוד המסלול: בגרות או מכינה בממוצע 95 לפחות, או בגרות וציון משולב 540 לפחות. המכללה מפרטת בנפרד את תנאי ההכרה במכינות.',
      ...davidYellinGeneralChecks,
    ],
  },
  {
    id: 'david_yellin_non_formal_education',
    institutionId: 'david_yellin',
    name: 'חינוך בלתי פורמלי במסלול העל־יסודי (B.Ed.)',
    category: 'חינוך',
    credential: 'B.Ed.',
    durationYears: 3,
    url: 'https://dyellin.ac.il/bed/non_formal_education',
    admissionsUrl: 'https://dyellin.ac.il/prerequisites',
    notes: [
      'המסלול מעניק תעודת עובד חינוך. אפשר להרחיב את הלימודים לארבע שנים ולשלב גם תעודת הוראה.',
      'תנאי הקבלה הכלליים ל־B.Ed. כוללים זכאות לבגרות, אפשרות לציון משולב 540 לפחות, ועדת קבלה וריאיון אישי, וציון מיון באנגלית. בכלל מסלולי החינוך העל־יסודי, בגרות בממוצע 95 לפחות פוטרת מפסיכומטרי; תנאים ייחודיים לחוג אינם מפורטים בעמודו.',
      'ללומדים במסלול בעברית עם בגרות שאינה בעברית נדרש יע״ל 110 לפחות עד סוף שנה א׳. לבעלי בגרות מחו״ל תנאים נפרדים.',
    ],
  },
];

export const collegeProgrammes: Program[] = specs.map((spec) => {
  const institution = INSTITUTION_BY_ID[spec.institutionId].name;
  return {
    id: spec.id,
    name: spec.name,
    awardedCredential: spec.credential,
    institution,
    institutionId: spec.institutionId,
    type: 'academic',
    category: spec.category,
    profileScore: { AN: 3, TE: 3, CR: 3, SO: 3, LE: 3, OR: 3, DI: 3, ER: 3 },
    admissionType: 'requirements',
    admissionRequirements: [],
    institutionDetails: [
      {
        institutionName: institution,
        durationYears: spec.durationYears ?? null,
        estimatedStudentsPerYear: '',
        quantitativeMinRequirement: null,
        englishMinRequirement: null,
        specificAdmissionNotes: spec.notes,
        officialCalculatorUrl: '',
        programUrl: spec.url,
        ...(spec.admissionsUrl
          ? {
              admissionsSourceCandidates: [
                {
                  id: `${spec.id}:${spec.institutionId}:source:admissions`,
                  origin: 'manual',
                  specificity: 'program_admissions',
                  confidence: 'high',
                  url: spec.admissionsUrl,
                },
              ],
            }
          : {}),
      },
    ],
  };
});
