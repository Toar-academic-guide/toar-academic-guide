import { isBguHealthProgram } from './bguHealthInputs';
import { isBguPsychologyProgram } from './bguPsychologyInputs';

export function allowsNoPsychometric(programId: string): boolean {
  return (
    ['business', 'tau_business', 'occupational_therapy'].includes(programId) ||
    isBguPsychologyProgram(programId)
  );
}

export function allowsNoGenericBagrut(programId: string): boolean {
  return isBguPsychologyProgram(programId) || isBguHealthProgram(programId);
}
