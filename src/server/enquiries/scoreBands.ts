import type { EnquiryRecord } from '@/lib/enquiries';

// Integer labels represent floor(score / width) buckets; decimal Bagrut averages
// stay in their five-point bucket. The last bucket includes the valid maximum
// (115–120 / 750–800) so it never singles out a perfect score. Missing stays null.
function scoreBand(score: number | null, width: number, maximum: number): string | null {
  if (score === null) return null;
  const lower = Math.min(Math.floor(score / width) * width, maximum - width);
  const upper = lower === maximum - width ? maximum : lower + width - 1;
  return `${lower}–${upper}`;
}

export function enquiryScoreBands(enquiry: Pick<EnquiryRecord, 'bagrut' | 'psychometric'>) {
  return {
    bagrut_band: scoreBand(enquiry.bagrut, 5, 120),
    psychometric_band: scoreBand(enquiry.psychometric, 50, 800),
  };
}
