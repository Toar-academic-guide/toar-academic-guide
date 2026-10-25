import { isCalculatedAdmissionResult } from '@/lib/isCalculatedAdmissionResult';
import type { AdmissionsEvaluationResult } from '@/types/admissionsEvaluation';

export default function AdmissionEstimate({
  result,
}: {
  result?: Pick<
    AdmissionsEvaluationResult,
    'estimated' | 'estimationReason' | 'kind' | 'decision' | 'score'
  >;
}) {
  if (!result?.estimated || !isCalculatedAdmissionResult(result)) return null;
  const reason = result.estimationReason ?? '';
  const yearReasons = reason.match(/שנת (?:הבגרות|הפסיכומטרי)[^.]*\./g) ?? [];
  const averageEstimated = !yearReasons.length || reason.includes('הממוצע הכללי');
  const averageNotice =
    'הערכה: חישבנו לפי הממוצע הכללי שהזנת, לא לפי ממוצע המוסד. להערכה מדויקת יותר, הזינו ציונים לפי מקצוע.';
  const yearNotice = yearReasons.join(' ');
  const text = averageEstimated
    ? [averageNotice, yearNotice].filter(Boolean).join(' ')
    : `הערכה: ${yearNotice} להערכה מדויקת יותר, הזינו את ${yearReasons.length === 1 ? 'שנת הבחינה' : 'שנות הבחינות'} בפועל.`;
  return (
    <p
      className="admission-estimate mt-2 text-right text-xs leading-relaxed text-slate-500"
      dir="rtl"
    >
      {text}
    </p>
  );
}
