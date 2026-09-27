import { isBguPsychologyProgram } from './bguPsychologyInputs';
import { bguSocialScienceProgram } from './bguSocialScienceInputs';

export function allowsNoPsychometric(programId: string): boolean {
  return (
    ['business', 'tau_business'].includes(programId) ||
    isBguPsychologyProgram(programId) ||
    bguSocialScienceProgram(programId) !== null
  );
}

export function allowsNoGenericBagrut(programId: string): boolean {
  return isBguPsychologyProgram(programId) || bguSocialScienceProgram(programId) !== null;
}
