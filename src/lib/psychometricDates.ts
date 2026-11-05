import type { PsychometricSitting } from '@/data/psychometricDates';

const jerusalemCalendar = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jerusalem',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function getJerusalemDate(now: Date): string {
  const parts = jerusalemCalendar.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((value) => value.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function formatPsychometricDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${Number(day)}.${Number(month)}.${year}`;
}

export interface SittingStatus {
  sitting: PsychometricSitting;
  registrationOpen: boolean;
  isNextOpen: boolean;
}

export function getSittingStatuses(
  sittings: readonly PsychometricSitting[],
  now: Date,
): SittingStatus[] {
  const today = getJerusalemDate(now);
  let foundNext = false;
  return sittings
    .filter((sitting) => sitting.testDays[sitting.testDays.length - 1] >= today)
    .sort((a, b) => a.testDays[0].localeCompare(b.testDays[0]))
    .map((sitting) => {
      // ISO calendar dates keep registration open for the entire local deadline day.
      const registrationOpen = sitting.registrationDeadline >= today;
      const isNextOpen = registrationOpen && !foundNext;
      if (isNextOpen) foundNext = true;
      return { sitting, registrationOpen, isNextOpen };
    });
}

export function getNextOpenSitting(
  sittings: readonly PsychometricSitting[],
  now: Date,
): PsychometricSitting | null {
  return getSittingStatuses(sittings, now).find(({ isNextOpen }) => isNextOpen)?.sitting ?? null;
}
