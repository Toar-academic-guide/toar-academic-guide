import type { LucideIcon } from 'lucide-react';
import { Building2, Globe2, Landmark, Mountain, Sun, Waves } from 'lucide-react';

export type StudyRegionId = 'north' | 'haifa' | 'center' | 'jerusalem' | 'south';
export type StudyLocationChoiceId = StudyRegionId | 'any';

export interface StudyRegionDefinition {
  id: StudyLocationChoiceId;
  name: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  accent: string;
  mapLabel: string;
}

export const STUDY_REGIONS: StudyRegionDefinition[] = [
  {
    id: 'north',
    name: 'צפון',
    shortName: 'צפון',
    description: 'גליל, עמקים וקמפוסים קרובים לטבע',
    icon: Mountain,
    gradient: 'from-[#e9fff6] via-[#f7fffb] to-white',
    accent: '#34c78a',
    mapLabel: 'צפון',
  },
  {
    id: 'haifa',
    name: 'חיפה והסביבה',
    shortName: 'חיפה',
    description: 'מפרץ, כרמל ומוסדות טכנולוגיים חזקים',
    icon: Waves,
    gradient: 'from-[#e9fbff] via-[#f8fdff] to-white',
    accent: '#28b8e8',
    mapLabel: 'חיפה',
  },
  {
    id: 'center',
    name: 'מרכז',
    shortName: 'מרכז',
    description: 'עירוניות, תחבורה ומבחר גדול של מוסדות',
    icon: Building2,
    gradient: 'from-[#eef4ff] via-[#fbfcff] to-white',
    accent: '#6478f3',
    mapLabel: 'מרכז',
  },
  {
    id: 'jerusalem',
    name: 'ירושלים והסביבה',
    shortName: 'ירושלים',
    description: 'קמפוסים היסטוריים וסביבה אקדמית ייחודית',
    icon: Landmark,
    gradient: 'from-[#f7f0ff] via-[#fcfaff] to-white',
    accent: '#8f63ee',
    mapLabel: 'ירושלים',
  },
  {
    id: 'south',
    name: 'דרום',
    shortName: 'דרום',
    description: 'נגב, מרחב וקמפוסים עם אופי קהילתי',
    icon: Sun,
    gradient: 'from-[#fff6e8] via-[#fffdf8] to-white',
    accent: '#f29a3d',
    mapLabel: 'דרום',
  },
  {
    id: 'any',
    name: 'לא משנה לי איפה',
    shortName: 'פתוח לכל אזור',
    description: 'הציגו לי את כל האפשרויות בארץ',
    icon: Globe2,
    gradient: 'from-[#fff0f7] via-[#f7f5ff] to-[#edfaff]',
    accent: '#ef6aa8',
    mapLabel: 'הכל',
  },
];

export const SELECTABLE_STUDY_REGION_IDS = STUDY_REGIONS.filter(
  (region): region is StudyRegionDefinition & { id: StudyRegionId } => region.id !== 'any',
).map((region) => region.id);
