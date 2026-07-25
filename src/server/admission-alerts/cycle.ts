const ADMISSIONS_TIME_ZONE = 'Asia/Jerusalem';

export function admissionCycleFor(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ADMISSIONS_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    throw new Error('Unable to determine the admissions cycle.');
  }

  return String(month >= 10 ? year + 1 : year);
}

export function isAdmissionCycleCurrent(cycle: string, now = new Date()): boolean {
  return cycle === admissionCycleFor(now);
}

export function isAdmissionCycleExpired(cycle: string, now = new Date()): boolean {
  return Number(cycle) < Number(admissionCycleFor(now));
}
