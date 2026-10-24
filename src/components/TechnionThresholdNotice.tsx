import {
  TECHNION_EE_SPRING_NOTE,
  TECHNION_THRESHOLD_URL,
} from '@/data/admissions/technionThresholds';
import { institutionLink } from '@/lib/institutionLinks';

export default function TechnionThresholdNotice({
  programId,
  institutionId,
}: {
  programId?: string;
  institutionId?: string;
}) {
  if (institutionId !== 'technion') return null;
  const id = programId?.replace(/^technion_/, '');
  if (id !== 'ee' && id !== 'me') return null;
  return (
    <div
      dir="rtl"
      className="mt-2 min-w-0 text-right text-xs leading-relaxed text-[var(--text-muted)]"
    >
      {id === 'ee' && <p>{TECHNION_EE_SPRING_NOTE}</p>}
      <p>
        עודכן לאחרונה: <time dateTime="2026-10-25">25.10.2026</time> · מקור:{' '}
        <a
          href={institutionLink(TECHNION_THRESHOLD_URL, 'technion')}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          הטכניון
        </a>
      </p>
    </div>
  );
}
