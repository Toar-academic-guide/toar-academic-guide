export const BIU_CALCULATOR_URL = 'https://shoham.biu.ac.il/kabala/';
export const BIU_LAW_URL = 'https://law.biu.ac.il/node/129';
export const BIU_ENGINEERING_URL = 'https://engineering.biu.ac.il/prerequisites';
export const BIU_SOCIAL_WORK_URL = 'https://social-work.biu.ac.il/Admission_BA';
export const BIU_EE_PSYCH_NOTE = 'בדף הפקולטה באנגלית ובדף מועמדי חו"ל מופיע 650';

export type BiuFloorMetric =
  | 'psychometric'
  | 'quant'
  | 'average'
  | 'mathProduct'
  | 'math5'
  | 'physics5'
  | 'english5'
  | 'englishClassification'
  | 'scienceExams'
  | 'entitlement'
  | 'hebrew';
export interface BiuFloor {
  metric: BiuFloorMetric;
  label: string;
  value: number;
  lenient?: number;
  strict?: number;
  soft?: boolean;
  informational?: boolean;
  note?: string;
  sourceUrl?: string;
}
export interface BiuChannel {
  label: string;
  floors: readonly BiuFloor[];
  published?: boolean;
  sourceUrl?: string;
}
const psych = (value: number): BiuFloor => ({ metric: 'psychometric', label: 'פסיכומטרי', value });
const average = (value: number): BiuFloor => ({ metric: 'average', label: 'ממוצע בגרות', value });
const mathProduct = (value: number): BiuFloor => ({
  metric: 'mathProduct',
  label: 'מכפלת מתמטיקה',
  value,
});
const math5 = (value: number): BiuFloor => ({ metric: 'math5', label: 'מתמטיקה 5 יח״ל', value });
const english: BiuFloor = { metric: 'englishClassification', label: 'סיווג אנגלית', value: 85 };
const science: BiuFloor = {
  metric: 'scienceExams',
  label: 'מקצועות מדעיים של 5 יח״ל בציון 80 לפחות',
  value: 2,
};
const bagrut = (label: string, floors: BiuFloor[]): BiuChannel => ({
  label,
  floors: [...floors, english],
  published: true,
});

// Each alternative is a channel. Engineering subject floors are remediable by
// the calculator's summer course and cannot eliminate either quantitative pair.
export const BIU_CHANNELS: Record<string, readonly BiuChannel[]> = {
  biu_law: [
    {
      ...bagrut('ערוץ בגרות', [
        average(112),
        { metric: 'english5', label: 'אנגלית 5 יח״ל', value: 90 },
      ]),
      sourceUrl: BIU_LAW_URL,
    },
    {
      label: 'ערוץ פסיכומטרי',
      published: true,
      sourceUrl: BIU_LAW_URL,
      floors: [
        psych(720),
        { metric: 'entitlement', label: 'זכאות לתעודת בגרות', value: 1, informational: true },
      ],
    },
    { label: 'ערוץ שקלול', floors: [psych(600), average(90)] },
  ],
  biu_cs: [
    { label: 'אפשרות א', floors: [psych(690), mathProduct(360)] },
    { label: 'אפשרות ב', floors: [{ metric: 'quant', label: 'כמותי', value: 130 }, math5(90)] },
  ],
  biu_ee: [130, 125].map((quant) => ({
    label: `ערוץ שקלול — כמותי ${quant}`,
    floors: [
      { ...psych(700), lenient: 650, note: BIU_EE_PSYCH_NOTE },
      {
        metric: 'quant',
        label: 'כמותי',
        value: quant,
        ...(quant === 125 && { strict: 130, note: 'בדף הפקולטה מופיע כמותי 130 בלבד' }),
      },
      {
        ...math5(quant === 130 ? 75 : 85),
        soft: true,
        ...(quant === 130 && { strict: 80, note: 'בדף הפקולטה מופיע 80' }),
      },
      { metric: 'physics5', label: 'פיזיקה 5 יח״ל', value: 80, soft: true },
    ],
  })),
  biu_socialwork: [
    {
      label: 'ערוץ שקלול',
      floors: [
        psych(580),
        { metric: 'hebrew', label: 'יע״ל (לנדרשים)', value: 120, informational: true },
      ],
    },
  ],
  biu_criminology: [{ label: 'ערוץ שקלול', floors: [] }, bagrut('ערוץ בגרות', [average(98)])],
  biu_lifesciences: [
    { label: 'ערוץ שקלול', floors: [psych(550), mathProduct(320)] },
    bagrut('ערוץ בגרות א', [average(108), mathProduct(320), science]),
    bagrut('ערוץ בגרות ב', [average(108), math5(85)]),
  ],
  biu_biotech: [
    { label: 'ערוץ שקלול', floors: [psych(580), mathProduct(320)] },
    bagrut('ערוץ בגרות', [average(108), mathProduct(320), science]),
  ],
  biu_computational_bio: [
    { label: 'ערוץ שקלול', floors: [psych(660), mathProduct(360)] },
    bagrut('ערוץ בגרות', [average(112), math5(95)]),
  ],
};

const reservists = 'אלא אם את/ה זכאי/ת למסלול מילואימניקים';
export const BIU_SPECIAL_CHANNELS: Record<string, readonly { text: string; url: string }[]> = {
  law: [{ text: reservists, url: BIU_LAW_URL }],
  ee: [{ text: reservists, url: BIU_ENGINEERING_URL }],
  socialwork: [
    { text: reservists, url: BIU_SOCIAL_WORK_URL },
    { text: 'אלא אם את/ה בוגר/ת מוסד חינוך חרדי – קיים מסלול קבלה נפרד', url: BIU_SOCIAL_WORK_URL },
    {
      text: 'אלא אם את/ה בוגר/ת המכינה הייעודית למדעי החברה או מכינת 30+ – קיים מסלול קבלה נפרד',
      url: BIU_SOCIAL_WORK_URL,
    },
  ],
  criminology: [
    {
      text: 'אלא אם את/ה זכאי/ת למסלול מילואימניקים או לדרך קבלה חלופית אחרת (בוגרי מוסדות חינוך חרדיים, עולים חדשים ועוד)',
      url: 'https://criminology.biu.ac.il/tracks/BA',
    },
  ],
  lifesciences: [{ text: reservists, url: 'https://life-sciences.biu.ac.il/node/10404' }],
  biotech: [{ text: reservists, url: 'https://life-sciences.biu.ac.il/tracks/10423' }],
  computational_bio: [{ text: reservists, url: 'https://life-sciences.biu.ac.il/tracks/10424' }],
};
export const BIU_PSYCH_ROUTE_LINES: Record<string, string> = {
  law: 'אפשר להתקבל גם עם פסיכומטרי – סף 600 (במסלול השקלול, יחד עם ממוצע בגרות 90) או 720 (במסלול הפסיכומטרי)',
  criminology:
    'אפשר להתקבל גם עם פסיכומטרי, במסלול שקלול בגרות ופסיכומטרי. לא פורסם סף פסיכומטרי למסלול זה.',
  lifesciences: 'אפשר להתקבל גם עם פסיכומטרי – סף 550 (ובנוסף מכפלת מתמטיקה 320)',
  biotech: 'אפשר להתקבל גם עם פסיכומטרי – סף 580 (ובנוסף מכפלת מתמטיקה 320)',
  computational_bio: 'אפשר להתקבל גם עם פסיכומטרי – סף 660 (ובנוסף מכפלת מתמטיקה 360)',
};
