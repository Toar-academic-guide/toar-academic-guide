import programmeLinks from './officialInstitutionProgrammeLinks.json';
import type { Program } from './types';

export interface OfficialProgramme {
  id: string;
  provider: string;
  name: string;
  fieldKey: string;
  type: Program['type'] | 'course';
  url: string;
}

// These entries have individual official pages. Keep legacy category IDs
// addressable instead of assigning one of their many possible courses to them.
const reviewed: OfficialProgramme[] = [
  ...programmeLinks.academic.map((p) => ({ ...p, type: 'academic' as const, id: p.url })),
  ...programmeLinks.vocational.map((p) => ({ ...p, type: 'vocational' as const, id: p.url })),
  ...programmeLinks.courses.map((p) => ({ ...p, type: 'course' as const, id: p.url })),
  {
    id: 'bdo_retirement_planning',
    provider: 'bdo_academy',
    name: 'תכנון פרישה',
    fieldKey: 'business',
    type: 'certificate',
    url: 'https://www.bdo-academy.co.il/retirement/prisha/',
  },
  {
    id: 'mon_12341138289_cs',
    provider: 'mon_12341138289',
    name: 'בדיקות תוכנה',
    fieldKey: 'computing',
    type: 'certificate',
    url: 'https://lp.smart-college.co.il/qa/',
  },
  {
    id: 'johnbryce_cs',
    provider: 'johnbryce',
    name: 'DevOps',
    fieldKey: 'computing',
    type: 'certificate',
    url: 'https://www.johnbryce.co.il/catalog/hi-tech-courses/קורס-devops/',
  },
  {
    id: 'braude_softwareeng',
    provider: 'braude',
    name: 'הנדסת תוכנה',
    fieldKey: 'engineering',
    type: 'academic',
    url: 'https://w3.braude.ac.il/shnaton-26-27/applicant/',
  },
  {
    id: 'sce_softwareeng',
    provider: 'sce',
    name: 'הנדסת תוכנה',
    fieldKey: 'engineering',
    type: 'academic',
    url: 'https://www.sce.ac.il/academic-units1/beersheva/engineering/software-engineering',
  },
  {
    id: 'shenkar_softwareeng',
    provider: 'shenkar',
    name: 'הנדסת תוכנה',
    fieldKey: 'engineering',
    type: 'academic',
    url: 'https://www.shenkar.ac.il/engineering/bachelors/software_engineering/admission/',
  },
  {
    id: 'azrieli_softwareeng',
    provider: 'azrieli',
    name: 'הנדסת תוכנה',
    fieldKey: 'engineering',
    type: 'academic',
    url: 'https://www.jce.ac.il/degree-in-engineering/software-engineering',
  },
  {
    id: 'kinneret_sound_technician',
    provider: 'mon_12341101391',
    name: 'הנדסת סאונד',
    fieldKey: 'technical',
    type: 'vocational',
    url: 'https://www.ktec.co.il/schools/הנדסת-קול/',
  },
  {
    id: 'kinneret_softwareeng',
    provider: 'kinneret',
    name: 'הנדסת תוכנה',
    fieldKey: 'engineering',
    type: 'academic',
    url: 'https://do.kinneret.ac.il/studies/b-sc-in-software-engineering/',
  },
  {
    id: 'bgu_softwareeng',
    provider: 'bgu',
    name: 'הנדסת תוכנה',
    fieldKey: 'engineering',
    type: 'academic',
    url: 'https://www.bgu.ac.il/welcome/ba/catalog/categories/software-engineering/',
  },
];

export function officialInstitutionProgrammes(
  providerId: string,
  localIds: ReadonlySet<string>,
): OfficialProgramme[] {
  return reviewed.filter((p) => p.provider === providerId && !localIds.has(p.id));
}
