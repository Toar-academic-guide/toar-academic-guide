import 'server-only';
import { institutionLink } from '@/lib/institutionLinks';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';
import type { AdmissionsEvaluationResult } from '@/types/admissionsEvaluation';

type UnsupportedReason =
  'institution_unsupported' | 'course_based' | 'vague_mapping' | 'unsupported';
interface BatchCProgramConfig {
  institutionId: string;
  reason: UnsupportedReason;
  explanationHe: string;
  nextActionHe: string;
}

const REASON_COPY: Record<
  UnsupportedReason,
  Pick<BatchCProgramConfig, 'explanationHe' | 'nextActionHe'>
> = {
  institution_unsupported: {
    explanationHe: 'עדיין אין לנו חישוב קבלה אמין למסלול הזה באוניברסיטת אריאל.',
    nextActionHe: 'בדקו את תנאי הקבלה למסלול באתר אוניברסיטת אריאל לפני ההרשמה.',
  },
  course_based: {
    explanationHe:
      'למסלול הזה אין כאן חישוב קבלה לפי ציוני בגרות ופסיכומטרי. תנאי ההרשמה תלויים בקורס שבוחרים.',
    nextActionHe: 'בחרו את הקורס באתר המוסד ובדקו את תנאי ההרשמה שלו.',
  },
  vague_mapping: {
    explanationHe:
      'תנאי הקבלה שונים בין המסלולים בתחום הזה, ולכן אין כאן חישוב קבלה שאפשר להסתמך עליו.',
    nextActionHe: 'בחרו את המסלול המדויק באתר המוסד ובדקו את תנאי הקבלה שלו.',
  },
  unsupported: {
    explanationHe: 'עדיין אין לנו חישוב קבלה אמין למסלול הזה.',
    nextActionHe: 'בדקו את תנאי הקבלה העדכניים באתר המוסד לפני ההרשמה.',
  },
};

function unsupportedProgram(institutionId: string, reason: UnsupportedReason): BatchCProgramConfig {
  return { institutionId, reason, ...REASON_COPY[reason] };
}

export const BATCH_C_PROGRAMS: Readonly<Record<string, BatchCProgramConfig>> = {
  cs: unsupportedProgram('ariel', 'institution_unsupported'),
  ee: unsupportedProgram('ariel', 'institution_unsupported'),
  psychology: unsupportedProgram('ariel', 'institution_unsupported'),
  me: unsupportedProgram('ariel', 'institution_unsupported'),
  economics: unsupportedProgram('ariel', 'institution_unsupported'),
  sports_science: unsupportedProgram('wingate', 'unsupported'),
  ariel_cs: unsupportedProgram('ariel', 'institution_unsupported'),
  ariel_ee: unsupportedProgram('ariel', 'institution_unsupported'),
  ariel_civil_eng: unsupportedProgram('ariel', 'institution_unsupported'),
  ariel_industrial_eng: unsupportedProgram('ariel', 'institution_unsupported'),
  ariel_me: unsupportedProgram('ariel', 'institution_unsupported'),
  ariel_chemical_eng: unsupportedProgram('ariel', 'institution_unsupported'),
  ariel_economics: unsupportedProgram('ariel', 'institution_unsupported'),
  ariel_socialwork: unsupportedProgram('ariel', 'institution_unsupported'),
  ariel_psychology: unsupportedProgram('ariel', 'institution_unsupported'),
  ariel_architecture: unsupportedProgram('ariel', 'institution_unsupported'),
  ariel_communication: unsupportedProgram('ariel', 'institution_unsupported'),
  ariel_criminology: unsupportedProgram('ariel', 'institution_unsupported'),
  ariel_molecular_bio: unsupportedProgram('ariel', 'institution_unsupported'),
  ariel_chemistry: unsupportedProgram('ariel', 'institution_unsupported'),
  ariel_math: unsupportedProgram('ariel', 'institution_unsupported'),
  ariel_physics: unsupportedProgram('ariel', 'institution_unsupported'),
  ariel_health_systems: unsupportedProgram('ariel', 'institution_unsupported'),
  ariel_nutrition: unsupportedProgram('ariel', 'institution_unsupported'),
  ariel_nursing: unsupportedProgram('ariel', 'institution_unsupported'),
  kinneret_sound_eng: unsupportedProgram('kinneret', 'vague_mapping'),
  elevation_cyber: unsupportedProgram('elevation', 'course_based'),
  elevation_fullstack: unsupportedProgram('elevation', 'course_based'),
  itc_data_science: {
    ...unsupportedProgram('itc', 'course_based'),
    nextActionHe: 'פנו למוסד לבירור הקורסים הזמינים ותנאי ההרשמה.',
  },
  huji_engineering: unsupportedProgram('huji', 'vague_mapping'),
  huji_prep: unsupportedProgram('huji', 'vague_mapping'),
  tau_engineering: unsupportedProgram('tau', 'vague_mapping'),
  technion_engineering: unsupportedProgram('technion', 'vague_mapping'),
  bgu_engineering: unsupportedProgram('bgu', 'vague_mapping'),
  haifa_engineering: unsupportedProgram('haifa', 'vague_mapping'),
  telhai_general_academic: unsupportedProgram('telhai', 'vague_mapping'),
  wingate_general_academic: unsupportedProgram('wingate', 'vague_mapping'),
  shenkar_engineering: unsupportedProgram('shenkar', 'vague_mapping'),
  sce_general_academic: unsupportedProgram('sce', 'vague_mapping'),
  azrieli_engineering: unsupportedProgram('azrieli', 'vague_mapping'),
  braude_engineering: unsupportedProgram('braude', 'vague_mapping'),
  braude_prep: unsupportedProgram('braude', 'vague_mapping'),
  ruppin_engineering: unsupportedProgram('ruppin', 'vague_mapping'),
  ruppin_prep: unsupportedProgram('ruppin', 'vague_mapping'),
  bezalel_graphic_design: unsupportedProgram('bezalel', 'vague_mapping'),
  hadassah_general_academic: unsupportedProgram('hadassah', 'vague_mapping'),
  wizo_general_academic: unsupportedProgram('wizo', 'vague_mapping'),
  beit_berl_graphic_design: unsupportedProgram('beit_berl', 'vague_mapping'),
  ono_medicine: unsupportedProgram('ono', 'unsupported'),
  mon_12220685575_graphic_design: unsupportedProgram('mon_12220685575', 'course_based'),
  mon_12220697934_certificate: unsupportedProgram('mon_12220697934', 'course_based'),
  minshar_graphic_design: unsupportedProgram('minshar', 'course_based'),
  mon_12220697938_graphic_design: unsupportedProgram('mon_12220697938', 'course_based'),
  nativ_graphic_design: unsupportedProgram('nativ', 'course_based'),
  mon_12220697940_graphic_design: unsupportedProgram('mon_12220697940', 'course_based'),
  mon_12220697942_certificate: unsupportedProgram('mon_12220697942', 'course_based'),
  mon_12220696299_certificate: {
    ...unsupportedProgram('mon_12220696299', 'course_based'),
    nextActionHe: 'פנו למוסד לבירור הקורסים הזמינים ותנאי ההרשמה.',
  },
  mon_12220699120_graphic_design: unsupportedProgram('mon_12220699120', 'course_based'),
  shaare_mishpat_law: unsupportedProgram('shaare_mishpat', 'unsupported'),
  mon_12341063909_graphic_design: unsupportedProgram('mon_12341063909', 'course_based'),
  schechter_certificate: unsupportedProgram('schechter', 'course_based'),
  mon_12341126300_education: unsupportedProgram('mon_12341126300', 'course_based'),
  tech_management_engineering: unsupportedProgram('tech_management', 'vague_mapping'),
  telhai_prep: unsupportedProgram('telhai', 'vague_mapping'),
  mon_12341098184_prep: unsupportedProgram('mon_12341098184', 'vague_mapping'),
  kinneret_engineering: unsupportedProgram('kinneret', 'vague_mapping'),
  mon_12341114114_engineering: unsupportedProgram('mon_12341114114', 'course_based'),
  israel_academic_general_academic: unsupportedProgram('israel_academic', 'vague_mapping'),
  mon_12341118768_general_academic: unsupportedProgram('mon_12341118768', 'vague_mapping'),
  mon_12341092879_graphic_design: unsupportedProgram('mon_12341092879', 'course_based'),
  mon_12341113400_cs: unsupportedProgram('mon_12341113400', 'course_based'),
  mon_12341143672_business: unsupportedProgram('mon_12341143672', 'course_based'),
  mon_12341098628_business: unsupportedProgram('mon_12341098628', 'course_based'),
  beit_berl_general_academic: unsupportedProgram('beit_berl', 'vague_mapping'),
  mon_12341122522_certificate: unsupportedProgram('mon_12341122522', 'course_based'),
  mon_12341134763_engineering: unsupportedProgram('mon_12341134763', 'course_based'),
  mon_12341122982_graphic_design: unsupportedProgram('mon_12341122982', 'course_based'),
  reidman_medicine: unsupportedProgram('reidman', 'course_based'),
  mon_12341203461_graphic_design: unsupportedProgram('mon_12341203461', 'course_based'),
  mon_12341155561_business: unsupportedProgram('mon_12341155561', 'course_based'),
};

export function evaluateBatchCUnsupportedPath({
  program,
  institution,
}: {
  program: CatalogueProgram;
  institution: CatalogueInstitution;
}): AdmissionsEvaluationResult | undefined {
  const config = BATCH_C_PROGRAMS[program.id];
  if (!config || config.institutionId !== institution.id) return undefined;
  const detail = program.institutionDetails?.find((d) => d.institutionName === institution.name);
  const officialUrl = institutionLink(detail?.programUrl ?? institution.programUrl, institution.id);
  return {
    institution,
    linkedInstitutionId: institution.id,
    capability: 'unsupported',
    kind: 'unsupported',
    decision: 'unknown',
    confidence: 'low',
    sourceLabel: 'אין חישוב למסלול זה',
    explanation: config.explanationHe,
    nextAction: config.nextActionHe,
    officialUrls: officialUrl ? [officialUrl] : undefined,
  };
}
