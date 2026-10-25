/** Public identities only: persisted ids and saved programme references are never rewritten. */
export const INSTITUTION_ALIASES: Readonly<Record<string, string>> = {
  ort_braude: 'braude',
  mon_12220708942: 'braude',
};

export function canonicalInstitutionId(id: string): string {
  return Object.hasOwn(INSTITUTION_ALIASES, id) ? INSTITUTION_ALIASES[id] : id;
}

/** Keep legacy rows available to saved references; supply a public row if absent. */
export function withCanonicalInstitutionAliases<T extends { id: string }>(rows: T[]): T[] {
  const ids = new Set(rows.map((row) => row.id));
  const result = [...rows];
  for (const row of rows) {
    const canonical = canonicalInstitutionId(row.id);
    if (!ids.has(canonical)) {
      result.push({ ...row, id: canonical });
      ids.add(canonical);
    }
  }
  return result;
}
