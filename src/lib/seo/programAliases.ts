export const PROGRAM_CANONICAL_ALIASES: Readonly<Record<string, string>> = {
  danon_cs: 'danon_culinary',
  mta_cs: 'tlvyaffo_cs',
  colman_law: 'colmgmt_law',
  colman_business: 'colmgmt_business',
  colman_cs: 'colmgmt_cs',
  beit_zvi_acting: 'beit_zvi_cs',
  bishulim_culinary: 'bishulim_cs',
  wingate_physical_ed: 'wingate_cs',
  nativ_acting: 'nativ_graphic_design',
};

export function canonicalProgramId(id: string): string {
  return PROGRAM_CANONICAL_ALIASES[id] ?? id;
}

export function canonicalProgramPath(id: string): string {
  return `/programs/${encodeURIComponent(canonicalProgramId(id))}`;
}
