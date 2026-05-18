export type { Program } from './types';
export { ACADEMIC_PROGRAMS } from './academic';
export { academicPrograms } from './academicPrograms';
export { vocationalPrograms } from './vocationalPrograms';

import { ACADEMIC_PROGRAMS } from './academic';
import { academicPrograms } from './academicPrograms';
import { vocationalPrograms } from './vocationalPrograms';

// Single combined catalogue.
// Add future sub-modules by spreading their arrays here.
export const allPrograms = [
  ...ACADEMIC_PROGRAMS,
  ...academicPrograms,
  ...vocationalPrograms,
];
