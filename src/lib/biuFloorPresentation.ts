import type { AdmissionsEvaluationResult, FloorCheckRow } from '@/types/admissionsEvaluation';

// BIU presentation metadata stays separate from evaluator decisions and prose.
export type BiuFloorResult = AdmissionsEvaluationResult & {
  floorCaveats?: { kind: 'reservist' }[];
};

export function biuFloorVerdict(rows: FloorCheckRow[]): string {
  const channels = Array.from(new Set(rows.map((row) => row.channel))).map((channel) =>
    rows.filter((row) => row.channel === channel),
  );
  if (rows.length && rows.every((row) => row.status === 'pass')) return 'עומד/ת בכל תנאי הסף';
  if (channels.some((channel) => channel.every((row) => row.status === 'pass')))
    return 'עומד/ת בתנאי הסף באחד ממסלולי הקבלה';
  if (
    channels.length &&
    channels.every((channel) => channel.some((row) => row.status === 'miss'))
  ) {
    const misses = new Map<string, FloorCheckRow>();
    for (const row of rows.filter((row) => row.status === 'miss')) {
      const key = `${row.label}:${row.studentValue}`;
      const previous = misses.get(key);
      if (!previous || Number(row.displayValue) < Number(previous.displayValue))
        misses.set(key, row);
    }
    return `לא עומד/ת בתנאי הסף: ${Array.from(misses.values(), (row) =>
      typeof row.studentValue === 'number'
        ? `${row.label} ${row.studentValue} מתחת ל-${row.displayValue}`
        : `${row.label}: ${row.studentValue ?? 'חסר נתון'} · נדרש ${row.displayValue}`,
    ).join(' · ')}`;
  }
  const possible = channels
    .filter((channel) => !channel.some((row) => row.status === 'miss'))
    .flat();
  if (possible.some((row) => row.status === 'missing')) return 'חסרים נתונים לבדיקת תנאי הסף';
  if (possible.some((row) => row.status === 'conflicting'))
    return 'מקורות סותרים לגבי תנאי הסף — כדאי לבדוק במחשבון הרשמי';
  return 'יש לבדוק את תנאי הסף במחשבון הרשמי';
}
