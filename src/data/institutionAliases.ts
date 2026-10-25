/** Public identities only: persisted ids and saved programme references are never rewritten. */
export const INSTITUTION_ALIASES: Readonly<Record<string, string>> = {
  ort_braude: 'braude',
  mon_12220708942: 'braude',
};

export function canonicalInstitutionId(id: string): string {
  return Object.hasOwn(INSTITUTION_ALIASES, id) ? INSTITUTION_ALIASES[id] : id;
}

/** Resolve both records before replacing canonical metadata; leave saved rows intact. */
export function curatedCanonicalInstitution<T extends { id: string }>(
  rows: readonly T[],
  canonicalId: string,
  curatedId: string,
): { index: number; institution: T } {
  const curated = rows.find((row) => row.id === curatedId);
  if (!curated) throw new Error(`Missing institution metadata: ${curatedId}`);
  const index = rows.findIndex((row) => row.id === canonicalId);
  if (index < 0) throw new Error(`Missing institution metadata: ${canonicalId}`);
  return { index, institution: { ...curated, id: canonicalId } };
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
