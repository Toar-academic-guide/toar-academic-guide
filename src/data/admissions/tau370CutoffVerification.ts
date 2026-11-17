export const TAU_370_CUTOFFS = [
  [
    'tau_psychology',
    'א',
    'https://go.tau.ac.il/he/social-sciences/ba/psychology?s=15870',
    660,
    659,
  ],
  ['tau_cs', 'א', 'https://go.tau.ac.il/he/exact/ba/computer?s=15460', 705, 704],
  ['tau_cs', 'ב', 'https://go.tau.ac.il/he/exact/ba/computer?s=17598', 705, 695],
  ['tau_datascience', 'א', 'https://go.tau.ac.il/he/exact/ba/datascience?s=17322', 689, 688],
  ['tau_ee', 'א', 'https://go.tau.ac.il/he/engineering/ba/electrical?s=15538', 710, 709],
  ['tau_ee', 'ב', 'https://go.tau.ac.il/he/engineering/ba/electrical?s=17661', 725, 695],
  [
    'tau_industrial',
    'א',
    'https://go.tau.ac.il/he/engineering/ba/industrial-engineering?s=15568',
    667,
    666,
  ],
  ['tau_me', 'א', 'https://go.tau.ac.il/he/engineering/ba/mechanical?s=15547', 650, 649],
  ['tau_biology', 'א', 'https://go.tau.ac.il/he/life/ba/bio?s=15530', 576, 575],
  [
    'tau_socialwork',
    'א',
    'https://go.tau.ac.il/he/social-sciences/ba/social-work?s=15899',
    580,
    579,
  ],
  ['tau_occupational_therapy', 'א', 'https://go.tau.ac.il/he/med/ba/occu?s=15394', 607, 606],
  ['tau_economics', 'א', 'https://go.tau.ac.il/he/social-sciences/ba/economics?s=15831', 610, 609],
] as const;

function singleValue(html: string, field: string): string | null {
  const values = new Set(
    [...html.matchAll(new RegExp(`"${field}":"?([^",}]+)"?`, 'g'))].map((match) => match[1]),
  );
  return values.size === 1 ? [...values][0] : null;
}

/** Fail closed if a page omits either field or embeds conflicting tab data. */
export function parseTau370CutoffPage(html: string) {
  const receiptField = singleValue(html, 'field_this_year_receipt_threshol');
  const rejectionField = singleValue(html, 'field_this_year_rejection_thresh');
  const acceptance = Number(receiptField);
  const rejection = Number(rejectionField);
  const semester = singleValue(html, 'semester_label');
  const year = singleValue(html, 'semester_year')?.replaceAll('\\u0022', '"').replaceAll('״', '"');
  if (
    !receiptField ||
    !rejectionField ||
    !Number.isFinite(acceptance) ||
    !Number.isFinite(rejection) ||
    !semester ||
    !year
  )
    return null;
  return { acceptance, rejection, semester, year };
}
