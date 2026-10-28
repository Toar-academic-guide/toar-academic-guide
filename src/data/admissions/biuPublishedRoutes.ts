import { BIU_CHANNELS } from './biuChannels';

// Retain public IDs; resolve generic pairs through the reviewed BIU route.
const BIU_PROGRAMME_ALIASES: Readonly<Record<string, string>> = {
  cs: 'biu_cs',
  ee: 'biu_ee',
  law: 'biu_law',
  criminology: 'biu_criminology',
};
export function canonicalBiuProgrammeId(programId: string): string {
  return BIU_PROGRAMME_ALIASES[programId] ?? programId;
}

export const BIU_PUBLISHED_ROUTE_PROGRAMMES = {
  law: 'law',
  biu_law: 'law',
  criminology: 'criminology',
  biu_criminology: 'criminology',
  biu_lifesciences: 'lifesciences',
  biu_biotech: 'biotech',
  biu_computational_bio: 'computational_bio',
} as const;

export const BIU_PUBLISHED_ROUTE_PROGRAM_IDS = Object.keys(BIU_PUBLISHED_ROUTE_PROGRAMMES);
export const BIU_ROUTED_PROGRAM_IDS = [
  ...new Set([
    ...BIU_PUBLISHED_ROUTE_PROGRAM_IDS,
    ...Object.keys(BIU_CHANNELS),
    ...Object.keys(BIU_PROGRAMME_ALIASES),
  ]),
];
export const BIU_PUBLISHED_ROUTES_URL =
  'https://www.biu.ac.il/registration-and-admission/information/acceptance-no-psychometry';
export const BIU_GENERAL_REQUIREMENTS_URL =
  'https://www.biu.ac.il/registration-and-admission/information/general-admission-req';

export function isBiuPublishedRoutePair(programId: string, institutionId: string): boolean {
  const canonicalId = canonicalBiuProgrammeId(programId);
  return (
    institutionId === 'biu' &&
    (Object.hasOwn(BIU_PUBLISHED_ROUTE_PROGRAMMES, canonicalId) ||
      Object.hasOwn(BIU_CHANNELS, canonicalId))
  );
}
