import { UniversityResult } from '@/types';

interface Props {
  result: UniversityResult;
}

export default function UniversityCard({ result }: Props) {
  const { university, sekhem, threshold, status, deltaNeeded, admissionTrack } = result;

  const sekhemDisplay =
    university.formulaType === 'technion_linear' ? sekhem.toFixed(1) : sekhem.toString();

  if (status === 'unavailable') {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight text-gray-400">{university.name}</h3>
          <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-400">
            לא זמין
          </span>
        </div>
        <p className="text-xs text-gray-400">התואר אינו מוצע באוניברסיטה זו</p>
      </div>
    );
  }

  const isAccepted = status === 'accepted';
  const progressPct = threshold ? Math.min((sekhem / threshold) * 100, 100) : 0;

  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border p-5 ${
        isAccepted ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3
            className={`font-semibold leading-tight ${
              isAccepted ? 'text-green-900' : 'text-red-900'
            }`}
          >
            {university.name}
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">{university.scaleDescription}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
              isAccepted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {isAccepted ? 'מתקבל ✓' : 'מתחת לסף'}
          </span>
          {admissionTrack === 'direct' && (
            <span className="text-xs font-medium text-green-600">קבלה ישירה</span>
          )}
        </div>
      </div>

      {/* Score row */}
      <div className="flex justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-500">הסכם שלך</span>
          <span
            className={`text-2xl font-bold tabular-nums ${
              isAccepted ? 'text-green-700' : 'text-red-600'
            }`}
          >
            {sekhemDisplay}
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-xs text-gray-500">סף קבלה</span>
          <span className="text-2xl font-bold tabular-nums text-gray-600">{threshold}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/70">
        <div
          className={`h-full rounded-full transition-all ${
            isAccepted ? 'bg-green-500' : 'bg-red-400'
          }`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Delta hint */}
      {status === 'below' && deltaNeeded && (
        <div className="rounded-xl bg-white/70 p-3 text-red-800">
          <p className="mb-1.5 text-xs font-semibold">כדי להתקבל, יש להוסיף לפחות:</p>
          <ul className="space-y-1 text-xs">
            <li>
              <span className="font-bold">{deltaNeeded.psychometric}</span> נקודות בפסיכומטרי
            </li>
            <li className="text-gray-400">או</li>
            <li>
              <span className="font-bold">{deltaNeeded.bagrut}</span> נקודות בממוצע בגרות
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
