/** Display precision only: API values and admission decisions remain untouched. */
export function formatSekhemNumber(value: number, institutionId: string): string {
  return String(institutionId === 'reichman' ? Math.round(value) : value);
}
