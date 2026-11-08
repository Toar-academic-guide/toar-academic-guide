import { subjectIdForWizardLabel } from '@/utils/bagrutSubjectRecord';
import type { BagrutSubjectRecord } from '@/types';

// Only unambiguous aliases named in the three published certificate policies.
const historyAliases = new Set(
  ['הסטוריה ותולדות הערבים', 'הסטוריה ותע"י', 'תולדות עם ישראל'].map(subjectIdForWizardLabel),
);
export const COMBINED_MEDICINE_SUBJECT_IDS = new Set(
  [
    'הסטוריה ואזרחות',
    'הסטוריה וגאוגרפיה',
    'הסטוריה ותולדות הערבים ואזרחות',
    'הסטוריה תע"י ואזרחות',
    'תולדות עם ישראל ואזרחות',
    'תולדות הערבית ואזרחות',
    'תנ"ך וספרות',
    'תנ"ך ותושבע"פ',
    'ספרות ותושבע"פ',
    'ערבית ומורשת דרוזים',
    'ערבית ותולדות הערבים והאסלם',
    'חנוך גופני וביולוגיה',
    'כימיה וביולוגיה',
    'ספרות ופילוסופיה',
    'תושב"ע ומשפט עברי',
    'מקצוע בין תחומי',
    'רבי מלל',
  ].map(subjectIdForWizardLabel),
);

/** Old stored records keep their IDs; academic calculations resolve their named equivalents. */
export function medicineBagrutSubjects(
  record: BagrutSubjectRecord,
  language?: 'hebrew' | 'arabic',
): BagrutSubjectRecord {
  return {
    ...record,
    sector: language === 'hebrew' ? 'jewish' : language === 'arabic' ? 'arab' : record.sector,
    subjects: record.subjects.map((subject) => ({
      ...subject,
      subjectId: historyAliases.has(subject.subjectId) ? 'history' : subject.subjectId,
    })),
  } as BagrutSubjectRecord;
}

// These legacy labels are not established equivalents of the published bonus names.
// Keep them out of exact medicine results until an official code mapping is obtained.
export const UNRESOLVED_MEDICINE_SUBJECT_IDS = new Set(
  [
    'מערכות תקשורת',
    'יהדות ממ"ד',
    'ידיעת העם והמדינה',
    'מחשוב ובקרה בהתיישבות',
    'מערכות תעופה ואביזראות מטוסים',
  ].map(subjectIdForWizardLabel),
);

// BGU's current calculator offers the aviation subject as code 343. The other
// picker labels have only differently named options, so their bonus treatment
// cannot be replayed from that form without a confirmed subject-code mapping.
export const UNRESOLVED_BGU_MEDICINE_SUBJECT_IDS = new Set(
  ['מערכות תקשורת', 'יהדות ממ"ד', 'ידיעת העם והמדינה', 'מחשוב ובקרה בהתיישבות'].map(
    subjectIdForWizardLabel,
  ),
);
