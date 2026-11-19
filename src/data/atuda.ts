export const atudaBooklet = 'https://online.fliphtml5.com/atudaacademit/nyes/';
export const atudaIdfPage = 'https://go.idf.il/AtudaWeb';
export const atudaCheckedOn = '17.11.2026';

export const bookletPage = (page: number) => `${atudaBooklet}#p=${page}`;

type Institution = {
  name: string;
  page?: string;
  engineeringPage?: boolean;
};

export type AtudaMajor = {
  name: string;
  bookletPage: number;
  institutions: Institution[];
  note?: string;
};

export const atudaMajors: AtudaMajor[] = [
  {
    name: 'הנדסת חשמל ואלקטרוניקה · דיגמא',
    bookletPage: 13,
    institutions: [
      { name: 'הטכניון', page: 'technion_ee' },
      { name: 'אוניברסיטת תל אביב (חשמל ומחשבים)', page: 'tau_ee' },
      { name: 'אוניברסיטת בן־גוריון', page: 'bgu_ee' },
      { name: 'אוניברסיטת בר־אילן (חשמל / חשמל ומחשבים)', page: 'biu_ee' },
      { name: 'אוניברסיטת אריאל', page: 'ariel_ee' },
      {
        name: 'האוניברסיטה העברית (חשמל ומחשבים)',
        page: 'huji_engineering',
        engineeringPage: true,
      },
      { name: 'המרכז האקדמי לב' },
      { name: 'HIT', page: 'hit_engineering', engineeringPage: true },
      { name: 'סמי שמעון', page: 'sce_engineering', engineeringPage: true },
      { name: 'בראודה', page: 'braude_engineering', engineeringPage: true },
      { name: 'אפקה', page: 'afeka_ee' },
      { name: 'עזריאלי ירושלים', page: 'azrieli_engineering', engineeringPage: true },
      { name: 'כנרת', page: 'kinneret_engineering', engineeringPage: true },
      { name: 'רופין', page: 'ruppin_engineering', engineeringPage: true },
      { name: 'שנקר', page: 'shenkar_engineering', engineeringPage: true },
    ],
  },
  {
    name: 'מדעי המחשב · אמירים',
    bookletPage: 14,
    institutions: [
      { name: 'הטכניון (תלת־שנתי בלבד)', page: 'technion_cs' },
      { name: 'האוניברסיטה העברית', page: 'huji_cs' },
      { name: 'אוניברסיטת תל אביב', page: 'tau_cs' },
      { name: 'אוניברסיטת בן־גוריון', page: 'bgu_cs' },
      { name: 'אוניברסיטת בר־אילן', page: 'biu_cs' },
      { name: 'אוניברסיטת חיפה', page: 'haifa_cs' },
      { name: 'אוניברסיטת אריאל', page: 'ariel_cs' },
      { name: 'המרכז האקדמי לב' },
      { name: 'אוניברסיטת רייכמן', page: 'reichman_cs' },
    ],
  },
  {
    name: 'הנדסת תוכנה · אמירים',
    bookletPage: 14,
    institutions: [
      { name: 'הטכניון (דרך הפקולטה למדעי המחשב, כולל פסגות)' },
      { name: 'אוניברסיטת בן־גוריון (כולל פסגות)', page: 'bgu_engineering', engineeringPage: true },
      { name: 'המרכז האקדמי לב' },
      { name: 'אפקה', page: 'afeka_softwareeng' },
    ],
  },
  {
    name: 'הנדסת מכונות',
    bookletPage: 13,
    institutions: [
      { name: 'הטכניון (כולל ברקים)', page: 'technion_me' },
      { name: 'אוניברסיטת תל אביב (הנדסה מכנית)', page: 'tau_me' },
      { name: 'אוניברסיטת בן־גוריון', page: 'bgu_me' },
      { name: 'אוניברסיטת אריאל (מכונות ומכטרוניקה, מסלול מכונות)', page: 'ariel_me' },
      { name: 'אפקה' },
      { name: 'בראודה', page: 'braude_engineering', engineeringPage: true },
      { name: 'סמי שמעון', page: 'sce_engineering', engineeringPage: true },
    ],
  },
  {
    name: 'הנדסת תעשייה וניהול / מערכות מידע',
    bookletPage: 13,
    institutions: [
      { name: 'הטכניון', page: 'technion_industrial' },
      { name: 'אוניברסיטת תל אביב', page: 'tau_industrial' },
      { name: 'אוניברסיטת בן־גוריון', page: 'bgu_industrial' },
      {
        name: 'אוניברסיטת בר־אילן (תעשייה ומערכות מידע)',
        page: 'biu_engineering',
        engineeringPage: true,
      },
      { name: 'אוניברסיטת אריאל', page: 'ariel_industrial_eng' },
      { name: 'בראודה', page: 'braude_engineering', engineeringPage: true },
      { name: 'סמי שמעון', page: 'sce_engineering', engineeringPage: true },
      { name: 'עזריאלי ירושלים', page: 'azrieli_engineering', engineeringPage: true },
      { name: 'אפקה' },
      { name: 'המרכז האקדמי לב' },
      { name: 'רופין', page: 'ruppin_engineering', engineeringPage: true },
      { name: 'HIT', page: 'hit_engineering', engineeringPage: true },
      { name: 'שנקר', page: 'shenkar_engineering', engineeringPage: true },
    ],
  },
  {
    name: 'משפטים',
    bookletPage: 15,
    institutions: [
      { name: 'האוניברסיטה העברית', page: 'huji_law' },
      { name: 'אוניברסיטת תל אביב', page: 'tau_law' },
      { name: 'אוניברסיטת בר־אילן', page: 'biu_law' },
      { name: 'אוניברסיטת חיפה', page: 'haifa_law' },
      { name: 'אוניברסיטת רייכמן (4 שנים)', page: 'reichman_law' },
      { name: 'המכללה למינהל', page: 'colmgmt_law' },
    ],
  },
  {
    name: 'כלכלה וחשבונאות',
    bookletPage: 15,
    institutions: [
      { name: 'אוניברסיטת תל אביב', page: 'tau_economics' },
      { name: 'אוניברסיטת בן־גוריון (כולל חשבונאות)', page: 'bgu_economics' },
      { name: 'אוניברסיטת בר־אילן' },
      { name: 'אוניברסיטת חיפה', page: 'haifa_economics' },
      { name: 'האוניברסיטה העברית', page: 'huji_economics' },
      { name: 'אוניברסיטת אריאל', page: 'ariel_economics' },
      {
        name: 'אוניברסיטת רייכמן (חשבונאות או מנהל עסקים בהתמחות בחשבונאות)',
      },
      { name: 'מכללת תל־חי' },
      { name: 'עמק יזרעאל (כלכלה וניהול)' },
      { name: 'ספיר (כלכלה יישומית וניהול)' },
      { name: 'המכללה למינהל', page: 'colmgmt_economics' },
      { name: 'רופין' },
      { name: 'המרכז האקדמי לב' },
      { name: 'מכללת תל אביב–יפו', page: 'tlvyaffo_economics' },
    ],
  },
  {
    name: 'רפואה כללית · צמרת',
    bookletPage: 16,
    institutions: [{ name: 'האוניברסיטה העברית בלבד', page: 'huji_medicine' }],
  },
  {
    name: 'סיעוד · פסגה',
    bookletPage: 16,
    institutions: [
      { name: 'אוניברסיטת תל אביב' },
      { name: 'האוניברסיטה העברית' },
      { name: 'אוניברסיטת חיפה', page: 'haifa_nursing' },
    ],
    note: 'פתיחת הכיתות במסלול פסגה מותנית באישור חיל הרפואה.',
  },
];

export const atudaElite = [
  {
    name: 'פסגות',
    studies:
      '4 שנים: הנדסת חשמל ופיזיקה בטכניון או באוניברסיטת תל אביב, או הנדסת תוכנה בטכניון או באוניברסיטת בן־גוריון',
    psychometric: 675,
    dapar: '80',
  },
  {
    name: 'רעמים',
    studies:
      '5 שנים: תואר ראשון ושני בהנדסת חשמל (עיבוד אות, RF, תקשורת וקושחה), בבן־גוריון או בבר־אילן',
    psychometric: 665,
    dapar: '70',
  },
  {
    name: 'גלקסיה',
    studies: '4 שנים: תואר ראשון ושני בפיזיקה, בבן־גוריון',
    psychometric: 650,
    dapar: '70',
  },
  {
    name: 'ברקים',
    studies: '4 שנים: תואר ראשון ושני בהנדסת מכונות בטכניון, או מכונות ופיזיקה בבן־גוריון',
    psychometric: 675,
    dapar: '70',
  },
  {
    name: 'סילון',
    studies: '5 שנים: אווירונאוטיקה וחלל ותואר שני בטכניון',
    psychometric: 650,
    dapar: '70',
  },
  {
    name: 'אלונים',
    studies: '4.5 שנים: תואר ראשון ושני בהנדסת נתונים ומידע בטכניון',
    psychometric: 680,
    dapar: 'לא צוין בעמוד',
  },
  {
    name: 'גבישים',
    studies: '5 שנים: תואר ראשון ושני מחקרי במדע והנדסה של חומרים בטכניון',
    psychometric: 650,
    dapar: '70',
  },
  {
    name: 'אביבים',
    studies: '4.5 שנים: תואר ראשון ושני בהנדסת תעשייה וניהול בטכניון',
    psychometric: 660,
    dapar: 'לא צוין בעמוד',
  },
  {
    name: 'ביו',
    studies: '4 שנים: תואר ראשון ולימודים לתואר שני בביולוגיה חישובית באוניברסיטה העברית',
    psychometric: 720,
    dapar: '70',
  },
] as const;

export const atudaQuestions = [
  {
    question: 'האם 590 מספיק כדי להתקבל לעתודה?',
    answer:
      '590 הוא הציון המינימלי של צה״ל להמשך המיונים, למעט מסלולים חריגים, והוא נבחן מחדש כל שנה. כדי להתקבל צריך גם לעמוד בתנאי הקבלה של המוסד והמגמה, ובתוכניות העילית הרף גבוה יותר.',
    pages: 'מידעון 2027–2028, עמ׳ 10, 35–36',
  },
  {
    question: 'אפשר להתקבל לעתודה בלי פסיכומטרי?',
    answer:
      'רק במקרים חריגים: באוניברסיטאות בלבד, כשמתקבלים למסלול מצטיינים ללא פסיכומטרי על סמך ציוני הבגרות, ובבקשה מסודרת למיטב.',
    pages: 'עמ׳ 10, 18',
  },
  {
    question: 'עד מתי נרשמים לעתודה לשנת 2027–2028?',
    answer:
      'נרשמים בשאלון העתודה באתר ״מתגייסים״ עד 28.02.2027. עד אותו תאריך צריך גם להעביר למיטב אישור הרשמה לפסיכומטרי או ציון. ההרשמה למועד אפריל נסגרת ב־10.2.2027.',
    pages: 'עמ׳ 11, 18, 20',
  },
  {
    question: 'מה המענקים בעתודה?',
    answer:
      '10,500 ש״ח לכל שנת לימוד בתנאי קצב לימודים תקין וממוצע 75 ומעלה (בחלק מהמסלולים יותר), ועוד 2,500 ש״ח פעם אחת למתקבלים שהתגייסו בפועל.',
    pages: 'עמ׳ 28',
  },
  {
    question: 'כמה זמן משרתים אחרי העתודה?',
    answer:
      'בסיום הלימודים משרתים שירות חובה על פי חוק כקצינים אקדמיים ועוד שלוש שנות שירות קבע, למעט מסלולים ייחודיים שבהם נכתב אחרת.',
    pages: 'עמ׳ 9',
  },
] as const;
