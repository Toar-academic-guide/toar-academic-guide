import type { CalculatorOffering } from './sekhemCalculator';

export type ResultCalculatorProgram = Pick<
  CalculatorOffering,
  'programId' | 'institutionId' | 'sourceProgramIds'
>;

export function resultCalculatorProgram(
  programs: readonly ResultCalculatorProgram[],
  programId: string,
  institutionId?: string,
) {
  return programs.find(
    (row) =>
      row.institutionId === institutionId &&
      (row.programId === programId || row.sourceProgramIds?.includes(programId)),
  )?.programId;
}

export function resultCalculatorHref(programId: string) {
  return '/sekhem-calculator?program=' + encodeURIComponent(programId) + '&from=results';
}
