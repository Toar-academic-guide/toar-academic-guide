/** Public identities only: persisted ids and saved programme references are never rewritten. */
export const INSTITUTION_ALIASES: Readonly<Record<string, string>> = {
  ort_braude: 'braude',
  mon_12220708942: 'braude',
};

export function canonicalInstitutionId(id: string): string {
  return Object.hasOwn(INSTITUTION_ALIASES, id) ? INSTITUTION_ALIASES[id] : id;
}

/** Public lists contain one canonical identity; input rows and saved ids stay intact. */
export function withCanonicalInstitutionAliases<T extends { id: string }>(rows: T[]): T[] {
  const result = new Map<string, T>();
  for (const row of rows) {
    const canonical = canonicalInstitutionId(row.id);
    if (!result.has(canonical) || row.id === canonical) {
      result.set(canonical, row.id === canonical ? row : { ...row, id: canonical });
    }
  }
  return [...result.values()];
}
