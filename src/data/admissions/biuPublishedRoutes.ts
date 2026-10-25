import { BIU_CHANNELS } from './biuChannels';

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
  ...new Set([...BIU_PUBLISHED_ROUTE_PROGRAM_IDS, ...Object.keys(BIU_CHANNELS)]),
];
export const BIU_PUBLISHED_ROUTES_URL =
  'https://www.biu.ac.il/registration-and-admission/information/acceptance-no-psychometry';
export const BIU_GENERAL_REQUIREMENTS_URL =
  'https://www.biu.ac.il/registration-and-admission/information/general-admission-req';

export function isBiuPublishedRoutePair(programId: string, institutionId: string): boolean {
  return (
    institutionId === 'biu' &&
    (Object.hasOwn(BIU_PUBLISHED_ROUTE_PROGRAMMES, programId) ||
      Object.hasOwn(BIU_CHANNELS, programId))
  );
}
