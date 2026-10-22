export const PROGRAM_CANONICAL_ALIASES: Readonly<Record<string, string>> = {
  danon_cs: 'danon_culinary',
};

export function canonicalProgramId(id: string): string {
  return PROGRAM_CANONICAL_ALIASES[id] ?? id;
}

export function canonicalProgramPath(id: string): string {
  return `/programs/${encodeURIComponent(canonicalProgramId(id))}`;
}
