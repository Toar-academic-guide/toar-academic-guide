/** Official preparatory-programme facts checked against institution pages. */
export interface PrepRow {
  id: string;
  institutionId: string;
  name: string;
  replaces?: string;
  entry?: string;
  fields?: string;
  duration?: string;
  afterCompletion?: string;
  officialUrl?: string;
  sources?: { label: string; url: string }[];
  checked?: string;
}

export const PREP_ROWS: PrepRow[] = [
  {
    id: 'huji_prep',
    institutionId: 'huji',
    name: 'האוניברסיטה העברית',
    replaces: 'תעודת הבגרות',
    entry:
      'נדרש פסיכומטרי; הסף משתנה לפי מסלול. במסלול רוח וחברה בעלי בגרות מלאה יכולים להתקבל בלעדיו; לקדם־מכינה אפשר להתקבל ללא פסיכומטרי, ומסיימיה פטורים ממנו בקבלה לרוב מסלולי המכינה, למעט המסלולים המוגברים.',
    fields: 'מדעי הטבע והחיים, מדעים מדויקים והנדסה, מדעי הרוח והחברה',
    duration: 'כ־9 חודשים',
    officialUrl: 'https://mechina.huji.ac.il/',
    sources: [
      { label: 'עמוד המכינה', url: 'https://mechina.huji.ac.il/' },
      { label: 'תנאי קבלה', url: 'https://mechina.huji.ac.il/תנאי-קבלה-1' },
      { label: 'שאלות ותשובות', url: 'https://mechina.huji.ac.il/שאלות-ותשובות' },
    ],
    checked: '18.11.2026',
  },
  {
    id: 'biu_prep',
    institutionId: 'biu',
    name: 'אוניברסיטת בר־אילן',
    officialUrl: 'https://mechina-kda.biu.ac.il/node/851',
  },
  {
    id: 'braude_prep',
    institutionId: 'braude',
    name: 'אורט בראודה',
    replaces: 'תעודת הבגרות לצורך קבלה ללימודי הנדסה בבראודה',
    entry: '500 לפחות בפסיכומטרי או במימ״ד',
    fields: 'הנדסה',
    duration: 'מסלול שנתי: נובמבר–יולי או פברואר–אוקטובר',
    afterCompletion:
      'בוגרי המכינה עם ממוצע משוקלל בתעודת המכינה של 85 ומעלה, ללא בונוסים, אינם נדרשים להציג ציון פסיכומטרי בקבלה לחשמל ואלקטרוניקה, ביוטכנולוגיה, תעשייה וניהול, מדעי המחשב, תוכנה, מערכות מידע ומכונות. בהנדסה אזרחית, מועמדים עם ממוצע משוקלל בתעודת המכינה של 90 ומעלה וללא פסיכומטרי נבחנים בוועדת קבלה; אין קבלה אוטומטית.',
    officialUrl: 'https://w3.braude.ac.il/department/mechina/',
    sources: [{ label: 'עמוד המכינה', url: 'https://w3.braude.ac.il/department/mechina/' }],
    checked: '18.11.2026',
  },
  {
    id: 'ruppin_prep',
    institutionId: 'ruppin',
    name: 'רופין',
    officialUrl: 'https://www.ruppin.ac.il/',
  },
  {
    id: 'sapir_prep',
    institutionId: 'sapir',
    name: 'ספיר',
  },
  {
    id: 'telhai_prep',
    institutionId: 'telhai',
    name: 'תל־חי',
    replaces: 'תעודת הבגרות לצורך קבלה ללימודים בפקולטה למדעי הרוח והחברה בתל־חי',
    entry: 'מימ״ד או פסיכומטרי בציון 420 ומעלה; אפשר לבקש חריג מ־400',
    fields:
      'עבודה סוציאלית, שירותי אנוש, כלכלה וניהול, פסיכולוגיה, לימודים רב־תחומיים, חינוך ולימודי מזרח אסיה',
    duration: '9 חודשים',
    officialUrl: 'https://www.telhai.ac.il/מכינה_לפקולטה_למדעי_החברה_והרוח',
    sources: [
      {
        label: 'המכינה הייעודית למח״ר',
        url: 'https://www.telhai.ac.il/מכינה_לפקולטה_למדעי_החברה_והרוח',
      },
    ],
    checked: '18.11.2026',
  },
  {
    id: 'sce_prep',
    institutionId: 'sce',
    name: 'SCE',
    officialUrl: 'https://www.sce.ac.il/',
  },
];

export function prepRow(id: string) {
  return PREP_ROWS.find((row) => row.id === id);
}
