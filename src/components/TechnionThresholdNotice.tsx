import { TECHNION_EE_SPRING_NOTE } from '@/data/admissions/technionThresholds';

export default function TechnionThresholdNotice({
  programId,
  institutionId,
}: {
  programId?: string;
  institutionId?: string;
}) {
  if (institutionId !== 'technion') return null;
  const id = programId?.replace(/^technion_/, '');
  if (id !== 'ee') return null;
  return (
    <div
      dir="rtl"
      className="mt-2 min-w-0 text-right text-xs leading-relaxed text-[var(--text-muted)]"
    >
      <p>{TECHNION_EE_SPRING_NOTE}</p>
    </div>
  );
}
