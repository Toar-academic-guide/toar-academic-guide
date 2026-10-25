import type { RequirementTilesModel } from './requirementTiles';

const weighted =
  'בדרך עם פסיכומטרי המכללה משקללת את הפסיכומטרי עם ממוצע הבגרות ולא מפרסמת את הציון הנדרש, אז כדאי לבדוק מולה.';
const colmanAverage =
  'ממוצע הבגרות כאן הוא ממוצע משוקלל לפי שיטת החישוב של המכללה, לא הממוצע שבתעודה. אפשר לבדוק אותו במחשבון המכללה.';
const shchakim =
  'לא עומדים בתנאים? אפשר להתקבל למכינת שחקים של המכללה, ומי שמסיים אותה בהצלחה יכול להתחיל את התואר.';

const mtaAverage =
  'ממוצע הבגרות הוא החישוב של המכללה (עם בונוסים), לא הממוצע שבתעודה. אפשר לבדוק אותו במחשבון המכללה.';
const colmanCsPrep = [
  'חסר רק ממוצע הבגרות: אחרי סיום מכינת שחקים בהצלחה.',
  'חסר רק ציון המתמטיקה: אחרי מבדק פנימי וסיום מכינת ריענון במתמטיקה בהצלחה.',
  'חסרים שניהם: אחרי מבדק פנימי וסיום שתי המכינות בהצלחה.',
];

type OverrideId = 'tlvyaffo_cs' | 'colmgmt_law' | 'colmgmt_business' | 'colmgmt_cs';
export const requirementTileOverrides: Record<OverrideId, RequirementTilesModel> = {
  tlvyaffo_cs: {
    semantics: 'alternatives',
    tiles: [
      { value: 630, label: 'ציון משולב', qualifiers: ['פסיכומטרי + בגרות'] },
      { value: 670, label: 'פסיכומטרי', qualifiers: ['+ זכאות לבגרות'] },
      { value: 102, label: 'בגרות', qualifiers: ['+ מתמטיקה 5 יח"ל 80 / 4 יח"ל 95'] },
    ],
    chips: ['מתמטיקה 5 יח"ל 70 / 4 יח"ל 90', 'אנגלית 100'],
    supplementalDetails: [mtaAverage],
    details: [
      'איך מחושב הציון המשולב: (פסיכומטרי + (ממוצע בגרות − 30) × 10) ÷ 2',
      mtaAverage,
      'אנגלית: ציון 100+ בחלק האנגלית של הפסיכומטרי או במבחן אמיר"ם/אמירנ"ט.',
      'מסלול מתוגבר (מסלול לימודים נפרד, עם תנאי קבלה משלו): ממוצע בגרות 100 ומתמטיקה 4 יח"ל 80+ או 5 יח"ל 60+; או ממוצע בגרות 95 ופסיכומטרי 550, עם אותה דרישת מתמטיקה.',
      'לא עומדים בתנאים? אפשר לפנות למרכז ייעוץ ורישום של המכללה ולברר אם בכל זאת אפשר להגיש מועמדות. יש גם מכינה שמחליפה את הפסיכומטרי.',
    ],
  },
  colmgmt_law: {
    semantics: 'alternatives',
    tiles: [
      { value: 100, label: 'בגרות', qualifiers: ['ממוצע משוקלל'] },
      { value: 540, label: 'פסיכומטרי', qualifiers: ['המכללה מחליטה'] },
      { value: 80, label: 'תואר קודם', qualifiers: ['+ ראיון'] },
    ],
    chips: [],
    supplementalDetails: [colmanAverage],
    details: [
      weighted,
      colmanAverage,
      'לבעלי תואר ראשון: ממוצע 80+ בתואר ממוסד אקדמי מוכר בישראל, וראיון קבלה.',
      'משפטים וכלכלה (תואר דו־חוגי): צריך לעמוד בתנאי הקבלה הרגילים וגם לעבור ראיון קבלה.',
      shchakim,
    ],
  },
  colmgmt_business: {
    semantics: 'alternatives',
    tiles: [
      { value: 85, label: 'בגרות', qualifiers: ['ממוצע משוקלל'] },
      { value: 555, label: 'פסיכומטרי', qualifiers: ['+ כמותי 100', 'המכללה מחליטה'] },
    ],
    chips: [],
    supplementalDetails: [colmanAverage],
    details: [weighted, colmanAverage, shchakim],
  },
  colmgmt_cs: {
    semantics: 'alternatives',
    tiles: [
      { value: 85, label: 'בגרות', qualifiers: ['מתמטיקה 5 יח"ל 70 / 4 יח"ל 80', '+ מבדק פנימי'] },
      {
        value: 'המכללה מחליטה',
        label: 'פסיכומטרי',
        qualifiers: ['+ מבדק פנימי', 'פטור: פסיכומטרי 600 וכמותי 120'],
      },
    ],
    chips: [],
    supplementalDetails: [colmanAverage, ...colmanCsPrep],
    details: [
      weighted,
      'פטור מהמבדק הפנימי בדרך עם הפסיכומטרי: פסיכומטרי 600+ וכמותי 120+.',
      colmanAverage,
      'לא עומדים בתנאים? יש עוד דרך להתקבל, לפי מה שחסר:',
      ...colmanCsPrep,
    ],
  },
};
