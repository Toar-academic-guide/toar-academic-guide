import { TECHNION_MEDICINE_INVITATION_THRESHOLD } from '@/data/admissions/technionThresholds';
import { formatJourneyScore } from '@/lib/studyJourney';

export default function TechnionMedicineComparison({ score }: { score: number }) {
  const above = score >= TECHNION_MEDICINE_INVITATION_THRESHOLD;
  return (
    <p className={`text-right text-sm ${above ? 'text-green-700' : 'text-slate-500'}`}>
      {`הסכם שלך ${formatJourneyScore(score)}, ${score === TECHNION_MEDICINE_INVITATION_THRESHOLD ? 'בסף' : above ? 'מעל סף' : 'מתחת לסף'} הזימון המשוער (${TECHNION_MEDICINE_INVITATION_THRESHOLD})`}
    </p>
  );
}
