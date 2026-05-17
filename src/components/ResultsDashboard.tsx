import { UniversityResult } from '@/types';
import UniversityCard from './UniversityCard';

interface Props {
  results: UniversityResult[];
  degreeName: string;
}

export default function ResultsDashboard({ results, degreeName }: Props) {
  const acceptedCount = results.filter((r) => r.status === 'accepted').length;
  const availableCount = results.filter((r) => r.status !== 'unavailable').length;

  return (
    <section id="results" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-gray-900">
          תוצאות עבור: <span className="text-blue-700">{degreeName}</span>
        </h2>
        <p className="text-sm text-gray-500">
          {acceptedCount === 0
            ? 'לצערנו, אינך עומד בסף הקבלה באף אוניברסיטה כעת'
            : `אתה עומד בסף הקבלה ב-${acceptedCount} מתוך ${availableCount} אוניברסיטאות המציעות תואר זה`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {results.map((result) => (
          <UniversityCard key={result.university.id} result={result} />
        ))}
      </div>
    </section>
  );
}
