import { isBguPsychologyProgram } from './bguPsychologyInputs';
import { isHaifaProgram } from './haifaAdmissionsInputs';

export function allowsNoPsychometric(programId: string): boolean {
  return ['business', 'tau_business'].includes(programId) || isBguPsychologyProgram(programId);
}

export function allowsNoGenericBagrut(programId: string): boolean {
  return isBguPsychologyProgram(programId) || isHaifaProgram(programId);
}
