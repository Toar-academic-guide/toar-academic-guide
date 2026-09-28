import { isHujiMedicineProgram } from './hujiMedicineInputs';
import { isBguPsychologyProgram } from './bguPsychologyInputs';

export function allowsNoPsychometric(programId: string): boolean {
  return ['business', 'tau_business'].includes(programId) || isBguPsychologyProgram(programId);
}

export function allowsNoGenericBagrut(programId: string): boolean {
  return isBguPsychologyProgram(programId) || isHujiMedicineProgram(programId);
}
