import type { AdmissionsEvaluationResult } from '@/types/admissionsEvaluation';

export default function AdmissionConditions({
  conditions,
}: {
  conditions: AdmissionsEvaluationResult['additionalConditions'];
}) {
  const outstanding = conditions?.filter((condition) => condition.status !== 'confirmed') ?? [];
  if (!outstanding.length) return null;
  return (
    <div className="mt-4 text-right text-sm text-[#35415b]" dir="rtl">
      <h3 className="mb-2 font-semibold">תנאים נוספים לבדיקה</h3>
      <ul className="list-outside list-disc space-y-1 ps-4 leading-6">
        {outstanding.map((condition) => (
          <li key={condition.id}>
            {condition.label} —{' '}
            <strong>
              {condition.status === 'unmet' ? 'לא מתקיים לפי הנתונים שהוזנו' : 'טרם אושר'}
            </strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
