import { isBguPsychologyProgram } from './bguPsychologyInputs';

export function allowsNoPsychometric(programId: string): boolean {
  return (
    ['business', 'tau_business', 'bgu_industrial'].includes(programId) ||
    isBguPsychologyProgram(programId)
  );
}

export function allowsNoGenericBagrut(programId: string): boolean {
  return (
    isBguPsychologyProgram(programId) ||
    ['ee', 'bgu_ee', 'me', 'bgu_me', 'bgu_industrial'].includes(programId)
  );
}
