export const nursingSource = {
  url: 'https://www1.health.gov.il/en/nursing/study/programs-institutions/bachelors-degree-institutions/',
  checkedDate: '2026-11-18',
};

export const nursingTrackLabels = {
  bsn: 'תואר ראשון',
  retraining: 'הסבת אקדמאים',
  pisga: 'עתודה (פסגה)',
  national_service: 'מסלול לבוגרי שירות לאומי',
};

type NursingTrack = keyof typeof nursingTrackLabels;

interface NursingInstitution {
  institution: string;
  mohName: string;
  tracks: readonly NursingTrack[];
  officialUrl: string;
  officialFormat?: 'pdf';
  programId?: string;
  hubAnchor?: 'tau';
  pisgaLabel?: string;
}

export const nursingInstitutions: readonly NursingInstitution[] = [
  {
    institution: 'אוניברסיטת תל אביב',
    mohName: 'Tel Aviv University',
    tracks: ['bsn', 'retraining', 'pisga', 'national_service'],
    officialUrl: 'https://go.tau.ac.il/he/med/ba/nursing',
    hubAnchor: 'tau',
    pisgaLabel: 'באוניברסיטת תל אביב',
  },
  {
    institution: 'אוניברסיטת חיפה',
    mohName: 'Haifa University',
    tracks: ['bsn', 'retraining'],
    officialUrl: 'https://admissions.haifa.ac.il/social-welfare-health-sciences/program/2973/',
    programId: 'haifa_nursing',
  },
  {
    institution: 'האוניברסיטה העברית בירושלים',
    mohName: 'Hebrew University of Jerusalem',
    tracks: ['bsn', 'retraining', 'pisga'],
    officialUrl: 'https://info.huji.ac.il/bachelor/Nursing-Ein-Kerem',
    pisgaLabel: 'באוניברסיטה העברית',
  },
  {
    institution: 'אוניברסיטת בן-גוריון בנגב',
    mohName: 'Ben-Gurion University of the Negev',
    tracks: ['bsn', 'retraining'],
    officialUrl: 'https://www.bgu.ac.il/welcome/ba/catalog/categories/nursing/',
    programId: 'bgu_nursing',
  },
  {
    institution: 'המרכז האקדמי לב',
    mohName: 'Lev Academic Center',
    tracks: ['bsn', 'retraining'],
    officialUrl:
      'https://www.jct.ac.il/%d7%9e%d7%a1%d7%9c%d7%95%d7%9c%d7%99-%d7%94%d7%9c%d7%99%d7%9e%d7%95%d7%93/%d7%94%d7%a4%d7%a7%d7%95%d7%9c%d7%98%d7%94-%d7%9c%d7%9e%d7%93%d7%a2%d7%99-%d7%94%d7%97%d7%99%d7%99%d7%9d-%d7%95%d7%94%d7%91%d7%a8%d7%99%d7%90%d7%95%d7%aa/%d7%90-%d7%97-%d7%99%d7%95-%d7%aa-%d7%a1%d7%99%d7%a2%d7%95%d7%93/',
  },
  {
    institution: 'המכללה האקדמית צפת',
    mohName: 'Zefat Academic College',
    tracks: ['bsn', 'retraining'],
    officialUrl:
      'https://www.zefat.ac.il/%D7%91%D7%AA%D7%99-%D7%A1%D7%A4%D7%A8-%D7%95%D7%9E%D7%9B%D7%99%D7%A0%D7%95%D7%AA/%D7%9E%D7%A7%D7%A6%D7%95%D7%A2%D7%95%D7%AA-%D7%94%D7%91%D7%A8%D7%99%D7%90%D7%95%D7%AA/%D7%A1%D7%99%D7%A2%D7%95%D7%93-bsn/',
  },
  {
    institution: 'המכללה האקדמית עמק יזרעאל',
    mohName: 'Emek Jezreel Academic College',
    tracks: ['bsn', 'retraining'],
    officialUrl: 'https://www.yvc.ac.il/degree/b-a-nursing/',
  },
  {
    institution: 'המכללה האקדמית רמת גן',
    mohName: 'Ramat Gan Academic College',
    tracks: ['bsn', 'retraining'],
    officialUrl:
      'https://iac.ac.il/%D7%AA%D7%95%D7%90%D7%A8-%D7%A8%D7%90%D7%A9%D7%95%D7%9F-%D7%91%D7%A1%D7%99%D7%A2%D7%95%D7%93-bsn/',
  },
  {
    institution: 'המרכז האקדמי רופין',
    mohName: 'Ruppin Academic Center',
    tracks: ['bsn'],
    officialUrl: 'https://www.ruppin.ac.il/faculties/ba/nursing/',
  },
  {
    institution: 'המכללה האקדמית תל-אביב-יפו',
    mohName: 'Tel Aviv-Yaffo Academic College',
    tracks: ['bsn', 'retraining'],
    officialUrl: 'https://www.mta.ac.il/program/nursing_bsn',
    programId: 'tlvyaffo_nursing',
  },
  {
    institution: 'אוניברסיטת אריאל',
    mohName: 'Ariel University',
    tracks: ['bsn', 'retraining'],
    officialUrl:
      'https://www.ariel.ac.il/wp/wp-content/uploads/2026/06/BA_2026_A5_MAY_newD-6.pdf#page=43',
    officialFormat: 'pdf',
    programId: 'ariel_nursing',
  },
  {
    institution: 'המכללה האקדמית אשקלון',
    mohName: 'Ashkelon Academic College',
    tracks: ['bsn', 'retraining'],
    officialUrl:
      'https://www.aac.ac.il/health-sciences/%d7%aa%d7%95%d7%90%d7%a8-%d7%a8%d7%90%d7%a9%d7%95%d7%9f-%d7%91%d7%a1%d7%99%d7%a2%d7%95%d7%93/',
  },
  {
    institution: 'המכללה האקדמית אונו',
    mohName: 'Ono Academic College',
    tracks: ['bsn', 'retraining'],
    officialUrl: 'https://www.ono.ac.il/curriculum/nursing/',
    programId: 'ono_nursing',
  },
  {
    institution: 'המרכז האקדמי שערי מדע ומשפט (הוד השרון)',
    mohName: 'Academic College of Law & Science in Hod HaSharon',
    tracks: ['bsn'],
    officialUrl:
      'https://mishpat.ac.il/%d7%aa%d7%95%d7%90%d7%a8-%d7%a8%d7%90%d7%a9%d7%95%d7%9f-%d7%91%d7%a1%d7%99%d7%a2%d7%95%d7%93-b-s-n/',
  },
  {
    institution: 'בית הספר האקדמי לסיעוד נצרת (תוכנית משותפת עם המכללה האקדמית אונו)',
    mohName: 'Nazareth Academic School of Nursing',
    tracks: ['bsn', 'retraining'],
    officialUrl: 'https://naznursing.org/ba-%d7%91%d7%a1%d7%99%d7%a2%d7%95%d7%93/',
  },
];

export const nursingInstitutionCount = nursingInstitutions.length;
export const nursingRetrainingCount = nursingInstitutions.filter(({ tracks }) =>
  tracks.includes('retraining'),
).length;
export const nursingPisgaInstitutions = nursingInstitutions
  .filter(({ tracks }) => tracks.includes('pisga'))
  .map(({ institution, pisgaLabel }) => pisgaLabel ?? `ב${institution}`)
  .join(' ו');

export const nursingInstitutionBreakdown = `${nursingInstitutionCount - 1} אוניברסיטאות ומכללות, ובית הספר האקדמי לסיעוד נצרת בתוכנית משותפת עם המכללה האקדמית אונו`;

export const nursingFaq = [
  {
    question: 'איפה אפשר ללמוד סיעוד בישראל?',
    answer: `ברשימת משרד הבריאות יש ${nursingInstitutionCount} מסגרות לתואר ראשון בסיעוד: ${nursingInstitutionBreakdown}. הרשימה המלאה מופיעה בטבלה בעמוד הזה, עם קישור לאתר כל מוסד.`,
  },
  {
    question: 'האם צריך לעבור בחינת רישוי כדי לעבוד כאח או אחות?',
    answer:
      'כן. בסיום התואר המוסד מעביר לאגף הסיעוד במשרד הבריאות את גיליון הציונים, ומי שנמצא זכאי נרשם לבחינת הרישוי הממשלתית דרך פורטל מקצועות הבריאות.',
  },
  {
    question: 'האם יש הסבת אקדמאים לסיעוד?',
    answer: `כן. ברשימת משרד הבריאות מופיע מסלול הסבה לבעלי תואר אקדמי ב-${nursingRetrainingCount} מסגרות. תנאי הקבלה וההכרה בלימודים קודמים נקבעים בכל מוסד, ולכן כדאי לבדוק באתר המוסד.`,
  },
];
