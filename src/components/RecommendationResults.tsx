import { RecommendedField, RiasecScores, EnvironmentPreference, RiasecDimension } from '@/types';
import { DEGREES } from '@/data/degreesData';
import { getTopDimensions, DIMENSION_LABELS } from '@/utils/riasecEngine';

interface Props {
  recommendations: RecommendedField[];
  onSelectDegree: (degreeId: string) => void;
  riasecScores: RiasecScores;
  environment: EnvironmentPreference;
}

const DEMAND_COLOR: Record<RecommendedField['marketDemand'], string> = {
  'גבוה מאוד': 'bg-green-100 text-green-800',
  'גבוה':      'bg-blue-100 text-blue-800',
  'בינוני':    'bg-yellow-100 text-yellow-800',
};

const RESILIENCE_COLOR: Record<RecommendedField['aiResilience'], string> = {
  'גבוהה':   'bg-green-100 text-green-800',
  'בינונית': 'bg-yellow-100 text-yellow-800',
  'נמוכה':   'bg-red-100 text-red-800',
};

export default function RecommendationResults({
  recommendations,
  onSelectDegree,
  riasecScores,
  environment,
}: Props) {
  const [primary, secondary] = getTopDimensions(riasecScores);
  const profileLabel = `${DIMENSION_LABELS[primary].name}-${DIMENSION_LABELS[secondary].name}`;

  const dimensionsSorted = (
    Object.entries(riasecScores) as [RiasecDimension, number][]
  )
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Profile card ────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          הפרופיל התעסוקתי שלך
        </p>
        <h2 className="mt-1 text-2xl font-bold text-gray-900">{profileLabel}</h2>
        <p className="mt-1 text-sm text-gray-500">
          {DIMENSION_LABELS[primary].trait} עם נטייה {DIMENSION_LABELS[secondary].trait}
        </p>

        {dimensionsSorted.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {dimensionsSorted.map(([dim, score]) => (
              <span
                key={dim}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${DIMENSION_LABELS[dim].color}`}
              >
                {DIMENSION_LABELS[dim].name} · {score}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ── Field recommendation cards ──────────────────────────────────── */}
      <div className="flex flex-col gap-5">
        {recommendations.map((rec, i) => {
          const suggestedDegrees = DEGREES.filter((d) =>
            rec.suggestedDegreeIds.includes(d.id)
          );

          return (
            <section
              key={rec.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
            >
              {/* Header */}
              <div className="mb-4 flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{rec.name}</h3>
                  <p className="mt-0.5 text-sm text-gray-500">{rec.description}</p>
                </div>
              </div>

              {/* Warning */}
              {rec.hasWarning && rec.warningText && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  ⚠️ {rec.warningText}
                </div>
              )}

              {/* Why it fits */}
              <div className="mb-4 rounded-xl bg-gray-50 px-4 py-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  מדוע זה מתאים לך
                </p>
                <p className="text-sm text-gray-700">{rec.matchReason}</p>
              </div>

              {/* Career data grid */}
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5 rounded-xl border border-gray-100 p-3">
                  <p className="text-xs font-semibold text-gray-400">ביקוש בשוק</p>
                  <span
                    className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-bold ${DEMAND_COLOR[rec.marketDemand]}`}
                  >
                    {rec.marketDemand}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 rounded-xl border border-gray-100 p-3">
                  <p className="text-xs font-semibold text-gray-400">היום-יום</p>
                  <p className="text-xs leading-relaxed text-gray-600">{rec.dailyWorkflow}</p>
                </div>

                <div className="flex flex-col gap-1.5 rounded-xl border border-gray-100 p-3">
                  <p className="text-xs font-semibold text-gray-400">עמידות בפני AI</p>
                  <span
                    className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-bold ${RESILIENCE_COLOR[rec.aiResilience]}`}
                  >
                    {rec.aiResilience}
                  </span>
                  <p className="text-xs leading-relaxed text-gray-500">{rec.aiResilienceNote}</p>
                </div>
              </div>

              {/* Degree buttons */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  תארים מומלצים לחישוב
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedDegrees.map((degree) => (
                    <button
                      key={degree.id}
                      onClick={() => onSelectDegree(degree.id)}
                      className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-900 hover:bg-gray-900 hover:text-white active:scale-95"
                    >
                      {degree.name} ←
                    </button>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
