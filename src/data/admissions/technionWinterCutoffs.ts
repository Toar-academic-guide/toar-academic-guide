// Official initial winter תשפ"ז / October 2026 table: https://admissions.technion.ac.il/sechem-for-admission/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%94%D7%9C%D7%99%D7%9E%D7%95%D7%93-%D7%9C%D7%A4%D7%99-%D7%90%D7%A4%D7%99%D7%A7%D7%99-%D7%94%D7%A7%D7%91%D7%9C%D7%94/
export const TECHNION_WINTER_CUTOFFS = { ee: 91.5, me: 87 } as const;

export function technionWinterRequirement(
  programId: string,
  institutionId?: string,
): string | undefined {
  if (institutionId !== 'technion') return undefined;
  // Match both aliases accepted by getCodeReviewedTechnionWinterVerification.
  if (programId === 'ee' || programId === 'technion_ee')
    return `בחורף תשפ"ז: סכם ${TECHNION_WINTER_CUTOFFS.ee}`;
  if (programId === 'me' || programId === 'technion_me')
    return `בחורף תשפ"ז: סכם ${TECHNION_WINTER_CUTOFFS.me}`;
  return undefined;
}
