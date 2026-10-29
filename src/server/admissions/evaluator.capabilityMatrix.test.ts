import { expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import type {
  AdmissionsCapabilityEntry,
  buildAdmissionsCapabilityMatrix,
} from './capabilityMatrix';
import { evaluateAdmissionsForProgram } from './evaluator';
// Approved test update: Jorje 2026-10-29, haifa_communication uses the NITE total (general group), haifa_cs keeps Q; file granted by Oded.
import {
  gapApplicant,
  gapEvaluate,
} from '@/app/api/admissions/evaluate/sekhemCalculatorGap.fixture';

// Columns preserve programme identity, the programme actually passed to the
// matrix, and every capability/source/target/input field used for dispatch.
// Capability entries have no separate result kind; kind is assigned downstream.
type MatrixRow = [
  programmeId: string,
  evaluationProgrammeId: string,
  institutionId: string,
  capability: AdmissionsCapabilityEntry['capability'],
  formulaPairScope: AdmissionsCapabilityEntry['formulaPairScope'] | null,
  sourceId: string | null,
  targetId: string | null,
  targetSourceId: string | null,
  targetProgrammeId: string | null,
  targetPairId: string | null,
  requiredInputs: string[],
  targetRequiredInputs: string[],
];

const capture = vi.hoisted(() => ({
  programmeId: '',
  rows: [] as MatrixRow[],
  getDb: vi.fn(() => {
    throw new Error('Matrix regression must not access a database');
  }),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/db/client', () => ({ getDb: capture.getDb }));
vi.mock('./capabilityMatrix', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./capabilityMatrix')>();
  return {
    ...actual,
    buildAdmissionsCapabilityMatrix(args: Parameters<typeof buildAdmissionsCapabilityMatrix>[0]) {
      const entries = actual.buildAdmissionsCapabilityMatrix(args);
      capture.rows.push(
        ...entries.map((entry): MatrixRow => [
          capture.programmeId,
          args.program.id,
          entry.institutionId,
          entry.capability,
          entry.formulaPairScope ?? null,
          entry.sourceTarget?.id ?? null,
          entry.exactTarget?.targetId ?? null,
          entry.exactTarget?.sourceTarget.id ?? null,
          entry.exactTarget?.program.id ?? null,
          entry.exactTarget?.program.pairId ?? null,
          entry.requiredInputs ?? [],
          entry.exactTarget?.requiredInputs ?? [],
        ]),
      );
      return entries;
    },
  };
});

// Captured by actually running the evaluator at 3d2c1b0 in a detached scratch
// worktree, with the same inputs, fixed time, and empty freshness map below.
// All 436 static pairs are present. One synthetic link represents the persisted
// medicine@bgu relation from the sweep-38 brief, absent from the static catalogue.
// Keep the capture independent of the current matrix implementation.
const BASELINE_ROWS: MatrixRow[] = String.raw`
["accounting","accounting","tau","authority_unavailable","in_scope","tau-accounting-live","tau-accounting-live","tau-accounting-live","tau-accounting","accounting__tau",[],["psychometric_english"]]
["achva_general_academic","achva_general_academic","achva","manual_gate",null,null,null,null,null,null,[],[]]
["afeka_biomedical","afeka_biomedical","afeka","score_only",null,"afeka-client-formula",null,null,null,null,[],[]]
["afeka_cs","afeka_cs","afeka","score_only",null,"afeka-client-formula",null,null,null,null,[],[]]
["afeka_ee","afeka_ee","afeka","score_only",null,"afeka-client-formula",null,null,null,null,[],[]]
["afeka_engineering","afeka_engineering","afeka","score_only",null,"afeka-client-formula",null,null,null,null,[],[]]
["afeka_softwareeng","afeka_softwareeng","afeka","score_only",null,"afeka-client-formula",null,null,null,null,[],[]]
["aliya_certificate","aliya_certificate","aliya","manual_gate",null,null,null,null,null,null,[],[]]
["architecture","architecture","technion","authority_unavailable","in_scope","technion-architecture-live","technion-architecture-live","technion-architecture-live","architecture","architecture__technion",[],["technion_architecture_bagrut_average","technion_architecture_exam_score","technion_architecture_exam_passed","technion_architecture_requirements"]]
["ariel_architecture","ariel_architecture","ariel","unsupported","excluded","ariel-browser-required",null,null,null,null,[],[]]
["ariel_chemical_eng","ariel_chemical_eng","ariel","unsupported","excluded","ariel-browser-required",null,null,null,null,[],[]]
["ariel_chemistry","ariel_chemistry","ariel","unsupported","excluded","ariel-browser-required",null,null,null,null,[],[]]
["ariel_civil_eng","ariel_civil_eng","ariel","unsupported","excluded","ariel-browser-required",null,null,null,null,[],[]]
["ariel_communication","ariel_communication","ariel","unsupported","excluded","ariel-browser-required",null,null,null,null,[],[]]
["ariel_criminology","ariel_criminology","ariel","unsupported","excluded","ariel-browser-required",null,null,null,null,[],[]]
["ariel_cs","ariel_cs","ariel","unsupported","excluded","ariel-browser-required",null,null,null,null,[],[]]
["ariel_economics","ariel_economics","ariel","unsupported","excluded","ariel-browser-required",null,null,null,null,[],[]]
["ariel_ee","ariel_ee","ariel","unsupported","excluded","ariel-browser-required",null,null,null,null,[],[]]
["ariel_engineering","ariel_engineering","ariel","tracked_missing_rule",null,"ariel-browser-required",null,null,null,null,[],[]]
["ariel_health_systems","ariel_health_systems","ariel","unsupported","excluded","ariel-browser-required",null,null,null,null,[],[]]
["ariel_industrial_eng","ariel_industrial_eng","ariel","unsupported","excluded","ariel-browser-required",null,null,null,null,[],[]]
["ariel_math","ariel_math","ariel","unsupported","excluded","ariel-browser-required",null,null,null,null,[],[]]
["ariel_me","ariel_me","ariel","unsupported","excluded","ariel-browser-required",null,null,null,null,[],[]]
["ariel_molecular_bio","ariel_molecular_bio","ariel","unsupported","excluded","ariel-browser-required",null,null,null,null,[],[]]
["ariel_nursing","ariel_nursing","ariel","unsupported","excluded","ariel-browser-required",null,null,null,null,[],[]]
["ariel_nutrition","ariel_nutrition","ariel","unsupported","excluded","ariel-browser-required",null,null,null,null,[],[]]
["ariel_physics","ariel_physics","ariel","unsupported","excluded","ariel-browser-required",null,null,null,null,[],[]]
["ariel_psychology","ariel_psychology","ariel","unsupported","excluded","ariel-browser-required",null,null,null,null,[],[]]
["ariel_socialwork","ariel_socialwork","ariel","unsupported","excluded","ariel-browser-required",null,null,null,null,[],[]]
["atid_certificate","atid_certificate","atid","manual_gate",null,null,null,null,null,null,[],[]]
["atid_engineering","atid_engineering","atid","manual_gate",null,null,null,null,null,null,[],[]]
["azrieli_engineering","azrieli_engineering","azrieli","manual_gate",null,null,null,null,null,null,[],[]]
["bdo_academy_certificate","bdo_academy_certificate","bdo_academy","manual_gate",null,null,null,null,null,null,[],[]]
["bdo_academy_general_academic","bdo_academy_general_academic","bdo_academy","manual_gate",null,null,null,null,null,null,[],[]]
["beit_berl_general_academic","beit_berl_general_academic","beit_berl","manual_gate",null,null,null,null,null,null,[],[]]
["beit_berl_graphic_design","beit_berl_graphic_design","beit_berl","manual_gate",null,null,null,null,null,null,[],[]]
["beit_zvi_acting","beit_zvi_acting","beit_zvi","manual_gate",null,null,null,null,null,null,[],[]]
["beit_zvi_certificate","beit_zvi_certificate","beit_zvi","manual_gate",null,null,null,null,null,null,[],[]]
["beit_zvi_directing","beit_zvi_directing","beit_zvi","manual_gate",null,null,null,null,null,null,[],[]]
["bezalel_fashion","bezalel_fashion","bezalel","manual_gate",null,null,null,null,null,null,[],[]]
["bezalel_fine_arts","bezalel_fine_arts","bezalel","manual_gate",null,null,null,null,null,null,[],[]]
["bezalel_graphic_design","bezalel_graphic_design","bezalel","manual_gate",null,null,null,null,null,null,[],[]]
["bezalel_industrial_design","bezalel_industrial_design","bezalel","manual_gate",null,null,null,null,null,null,[],[]]
["bezalel_photography","bezalel_photography","bezalel","manual_gate",null,null,null,null,null,null,[],[]]
["bgu_accounting","bgu_accounting","bgu","authority_unavailable","in_scope","bgu-bgu_accounting-live","bgu-bgu_accounting-live","bgu-bgu_accounting-live","bgu_accounting","bgu_accounting__bgu",[],[]]
["bgu_biology","bgu_biology","bgu","authority_unavailable","in_scope","bgu-bgu_biology-live","bgu-bgu_biology-live","bgu-bgu_biology-live","bgu_biology","bgu_biology__bgu",[],[]]
["bgu_business","bgu_business","bgu","authority_unavailable","in_scope","bgu-bgu_business-live","bgu-bgu_business-live","bgu-bgu_business-live","bgu_business","bgu_business__bgu",[],[]]
["bgu_cs","bgu_cs","bgu","authority_unavailable","in_scope","bgu-bgu_cs-live","bgu-bgu_cs-live","bgu-bgu_cs-live","bgu_cs","bgu_cs__bgu",[],["bgu_bagrut_average","bgu_language_requirements","psychometric_math","psychometric_verbal","psychometric_english","bagrut_subject_record"]]
["bgu_datascience","bgu_datascience","bgu","authority_unavailable","in_scope","bgu-bgu_datascience-live","bgu-bgu_datascience-live","bgu-bgu_datascience-live","bgu_datascience","bgu_datascience__bgu",[],["bgu_bagrut_average","bgu_language_requirements","psychometric_math","psychometric_verbal","psychometric_english","bagrut_subject_record"]]
["bgu_economics","bgu_economics","bgu","authority_unavailable","in_scope","bgu-bgu_economics-live","bgu-bgu_economics-live","bgu-bgu_economics-live","bgu_economics","bgu_economics__bgu",[],[]]
["bgu_ee","bgu_ee","bgu","authority_unavailable","in_scope","bgu-bgu_ee-live","bgu-bgu_ee-live","bgu-bgu_ee-live","bgu_ee","bgu_ee__bgu",[],["bgu_engineering_details","bgu_language_requirements"]]
["bgu_engineering","bgu_engineering","bgu","score_only",null,"bgu-score-only",null,null,null,null,[],[]]
["bgu_industrial","bgu_industrial","bgu","authority_unavailable","in_scope","bgu-bgu_industrial-live","bgu-bgu_industrial-live","bgu-bgu_industrial-live","bgu_industrial","bgu_industrial__bgu",[],["bgu_engineering_details","bgu_language_requirements"]]
["bgu_me","bgu_me","bgu","authority_unavailable","in_scope","bgu-bgu_me-live","bgu-bgu_me-live","bgu-bgu_me-live","bgu_me","bgu_me__bgu",[],["bgu_engineering_details","bgu_language_requirements"]]
["bgu_medicine","bgu_medicine","bgu","authority_unavailable","in_scope","bgu-bgu_medicine-live","bgu-bgu_medicine-live","bgu-bgu_medicine-live","bgu_medicine","bgu_medicine__bgu",[],[]]
["bgu_nursing","bgu_nursing","bgu","authority_unavailable","in_scope","bgu-bgu_nursing-live","bgu-bgu_nursing-live","bgu-bgu_nursing-live","bgu_nursing","bgu_nursing__bgu",[],[]]
["bgu_psychology","bgu_psychology","bgu","authority_unavailable","in_scope","bgu-bgu_psychology-live","bgu-bgu_psychology-live","bgu-bgu_psychology-live","bgu_psychology","bgu_psychology__bgu",[],[]]
["bgu_socialwork","bgu_socialwork","bgu","authority_unavailable","in_scope","bgu-bgu_socialwork-live","bgu-bgu_socialwork-live","bgu-bgu_socialwork-live","bgu_socialwork","bgu_socialwork__bgu",[],[]]
["biology","biology","tau","authority_unavailable","in_scope","tau-biology-live","tau-biology-live","tau-biology-live","tau-biology","biology__tau",[],["psychometric_english"]]
["bishulim_chef","bishulim_chef","bishulim","manual_gate",null,null,null,null,null,null,[],[]]
["bishulim_culinary","bishulim_culinary","bishulim","manual_gate",null,null,null,null,null,null,[],[]]
["bishulim_pastry","bishulim_pastry","bishulim","manual_gate",null,null,null,null,null,null,[],[]]
["bishulim_restaurant_mgmt","bishulim_restaurant_mgmt","bishulim","manual_gate",null,null,null,null,null,null,[],[]]
["biu_biotech","biu_biotech","biu","estimated","in_scope",null,null,null,null,null,[],[]]
["biu_computational_bio","biu_computational_bio","biu","estimated","in_scope",null,null,null,null,null,[],[]]
["biu_criminology","biu_criminology","biu","estimated","in_scope",null,null,null,null,null,[],[]]
["biu_cs","biu_cs","biu","estimated","in_scope",null,null,null,null,null,[],[]]
["biu_ee","biu_ee","biu","estimated","in_scope",null,null,null,null,null,[],[]]
["biu_engineering","biu_engineering","biu","manual_gate",null,"biu-browser-required",null,null,null,null,[],[]]
["biu_law","biu_law","biu","estimated","in_scope",null,null,null,null,null,[],[]]
["biu_lifesciences","biu_lifesciences","biu","estimated","in_scope",null,null,null,null,null,[],[]]
["biu_medicine","biu_medicine","biu","unsupported","excluded","biu-browser-required",null,null,null,null,[],[]]
["biu_optometry","biu_optometry","biu","unsupported","excluded","biu-browser-required",null,null,null,null,[],[]]
["biu_prep","biu_prep","biu","manual_gate",null,"biu-browser-required",null,null,null,null,[],[]]
["biu_psychology","biu_psychology","biu","unsupported","excluded","biu-browser-required",null,null,null,null,[],[]]
["biu_socialwork","biu_socialwork","biu","estimated","in_scope",null,null,null,null,null,[],[]]
["braude_engineering","braude_engineering","braude","manual_gate",null,null,null,null,null,null,[],[]]
["braude_prep","braude_prep","braude","manual_gate",null,null,null,null,null,null,[],[]]
["broshim_homeopathy","broshim_homeopathy","broshim","manual_gate",null,null,null,null,null,null,[],[]]
["broshim_naturopathy","broshim_naturopathy","broshim","manual_gate",null,null,null,null,null,null,[],[]]
["broshim_psychotherapy","broshim_psychotherapy","broshim","manual_gate",null,null,null,null,null,null,[],[]]
["business","business","bgu","authority_unavailable","in_scope","bgu-business-live","bgu-business-live","bgu-business-live","business","business__bgu",[],[]]
["business","business","huji","authority_unavailable","in_scope","huji-business-live","huji-business-live","huji-business-live","business","business__huji",[],[]]
["business","business","tau","authority_unavailable","in_scope","tau-business-live","tau-business-live","tau-business-live","tau-business","business__tau",[],["tau_management_requirements"]]
["colman_business","colman_business","colman","manual_gate",null,"colman-computer-science-live",null,null,null,null,[],[]]
["colman_law","colman_law","colman","manual_gate",null,"colman-computer-science-live",null,null,null,null,[],[]]
["colman_tourism","colman_tourism","colman","manual_gate",null,"colman-computer-science-live",null,null,null,null,[],[]]
["colmgmt_accounting","colmgmt_accounting","colman","manual_gate",null,"colman-computer-science-live",null,null,null,null,[],[]]
["colmgmt_business","colmgmt_business","colman","manual_gate",null,"colman-computer-science-live",null,null,null,null,[],[]]
["colmgmt_cs","colmgmt_cs","colman","manual_gate","in_scope","colman-computer-science-live",null,null,null,null,[],[]]
["colmgmt_economics","colmgmt_economics","colman","manual_gate",null,"colman-computer-science-live",null,null,null,null,[],[]]
["colmgmt_infosystems","colmgmt_infosystems","colman","manual_gate",null,"colman-computer-science-live",null,null,null,null,[],[]]
["colmgmt_law","colmgmt_law","colman","manual_gate",null,"colman-computer-science-live",null,null,null,null,[],[]]
["communication","communication","tau","authority_unavailable","in_scope","tau-communication-live","tau-communication-live","tau-communication-live","tau-communication","communication__tau",[],["psychometric_english"]]
["criminology","criminology","biu","estimated","in_scope",null,null,null,null,null,[],[]]
["cs","cs","ariel","unsupported","excluded","ariel-browser-required",null,null,null,null,[],[]]
["cs","cs","bgu","authority_unavailable","in_scope","bgu-cs-live","bgu-cs-live","bgu-cs-live","cs","cs__bgu",[],["bgu_bagrut_average","bgu_language_requirements","psychometric_math","psychometric_verbal","psychometric_english","bagrut_subject_record"]]
["cs","cs","biu","unsupported","excluded","biu-browser-required",null,null,null,null,[],[]]
["cs","cs","haifa","authority_unavailable","in_scope","haifa-cs-live","haifa-cs-live","haifa-cs-live","cs","cs__haifa",[],["psychometric_math","psychometric_verbal","psychometric_english","haifa_bagrut_average","haifa_bagrut_year","haifa_psychometric_year"]]
["cs","cs","huji","authority_unavailable","in_scope","huji-cs-live","huji-cs-live","huji-cs-live","cs","cs__huji",[],[]]
["cs","cs","tau","authority_unavailable","in_scope","tau-cs-live","tau-cs-live","tau-cs-live","tau-cs","cs__tau",[],["bagrut_subject_record","tau_bagrut_average","tau_application_requirements"]]
["cs","cs","technion","authority_unavailable","in_scope","technion-cs-live","technion-cs-live","technion-cs-live","cs","cs__technion",[],["bagrut_subject_record"]]
["danon_chef","danon_chef","danon","manual_gate",null,null,null,null,null,null,[],[]]
["danon_culinary","danon_culinary","danon","manual_gate",null,null,null,null,null,null,[],[]]
["danon_culinary_arts","danon_culinary_arts","danon","manual_gate",null,null,null,null,null,null,[],[]]
["danon_pastry","danon_pastry","danon","manual_gate",null,null,null,null,null,null,[],[]]
["datascience","datascience","bgu","authority_unavailable","in_scope","bgu-datascience-live","bgu-datascience-live","bgu-datascience-live","datascience","datascience__bgu",[],["bgu_bagrut_average","bgu_language_requirements","psychometric_math","psychometric_verbal","psychometric_english","bagrut_subject_record"]]
["datascience","datascience","huji","authority_unavailable","in_scope","huji-datascience-live","huji-datascience-live","huji-datascience-live","datascience","datascience__huji",[],[]]
["datascience","datascience","tau","authority_unavailable","in_scope","tau-digital-sciences-legacy-live","tau-digital-sciences-legacy-live","tau-digital-sciences-legacy-live","tau-digital-sciences","datascience__tau",[],["psychometric_english","bagrut_subject_record"]]
["datascience","datascience","technion","authority_unavailable","in_scope","technion-datascience-live","technion-datascience-live","technion-datascience-live","datascience","datascience__technion",[],["bagrut_subject_record"]]
["david_yellin_education","david_yellin_education","david_yellin","manual_gate",null,null,null,null,null,null,[],[]]
["economics","economics","ariel","unsupported","excluded","ariel-browser-required",null,null,null,null,[],[]]
["economics","economics","bgu","authority_unavailable","in_scope","bgu-economics-live","bgu-economics-live","bgu-economics-live","economics","economics__bgu",[],[]]
["economics","economics","haifa","authority_unavailable","in_scope","haifa-economics-live","haifa-economics-live","haifa-economics-live","economics","economics__haifa",[],["psychometric_math","psychometric_verbal","psychometric_english","haifa_bagrut_average","haifa_bagrut_year","haifa_psychometric_year"]]
["economics","economics","huji","authority_unavailable","in_scope","huji-economics-live","huji-economics-live","huji-economics-live","economics","economics__huji",[],[]]
["economics","economics","tau","authority_unavailable","in_scope","tau-economics-live","tau-economics-live","tau-economics-live","tau-economics","economics__tau",[],["psychometric_english"]]
["education","education","tau","authority_unavailable","in_scope","tau-education-live","tau-education-live","tau-education-live","tau-education","education__tau",[],["psychometric_english"]]
["ee","ee","ariel","unsupported","excluded","ariel-browser-required",null,null,null,null,[],[]]
["ee","ee","bgu","authority_unavailable","in_scope","bgu-ee-live","bgu-ee-live","bgu-ee-live","ee","ee__bgu",[],["bgu_engineering_details","bgu_language_requirements"]]
["ee","ee","biu","unsupported","excluded","biu-browser-required",null,null,null,null,[],[]]
["ee","ee","tau","authority_unavailable","in_scope","tau-ee-live","tau-ee-live","tau-ee-live","tau-ee","ee__tau",[],["psychometric_english","bagrut_subject_record"]]
["ee","ee","technion","needs_input","in_scope","technion-ee-live","technion-ee-live","technion-ee-live","ee","ee__technion",["bagrut_subject_record"],["bagrut_subject_record"]]
["elevation_cyber","elevation_cyber","elevation","manual_gate",null,null,null,null,null,null,[],[]]
["elevation_fullstack","elevation_fullstack","elevation","manual_gate",null,null,null,null,null,null,[],[]]
["emek_yezreel_general_academic","emek_yezreel_general_academic","emek_yezreel","manual_gate",null,null,null,null,null,null,[],[]]
["givat_washington_certificate","givat_washington_certificate","givat_washington","manual_gate",null,null,null,null,null,null,[],[]]
["givat_washington_medicine","givat_washington_medicine","givat_washington","manual_gate",null,null,null,null,null,null,[],[]]
["hackeru_cs","hackeru_cs","hackeru","manual_gate",null,null,null,null,null,null,[],[]]
["hackeru_cyber","hackeru_cyber","hackeru","manual_gate",null,null,null,null,null,null,[],[]]
["hackeru_data","hackeru_data","hackeru","manual_gate",null,null,null,null,null,null,[],[]]
["hackeru_fullstack","hackeru_fullstack","hackeru","manual_gate",null,null,null,null,null,null,[],[]]
["hadassah_general_academic","hadassah_general_academic","hadassah","manual_gate",null,null,null,null,null,null,[],[]]
["haifa_accounting","haifa_accounting","haifa","authority_unavailable","in_scope","haifa-haifa_accounting-live","haifa-haifa_accounting-live","haifa-haifa_accounting-live","haifa_accounting","haifa_accounting__haifa",[],["psychometric_math","psychometric_verbal","psychometric_english","haifa_bagrut_average","haifa_bagrut_year","haifa_psychometric_year"]]
["haifa_biology","haifa_biology","haifa","authority_unavailable","in_scope","haifa-haifa_biology-live","haifa-haifa_biology-live","haifa-haifa_biology-live","haifa_biology","haifa_biology__haifa",[],["psychometric_math","psychometric_verbal","psychometric_english","haifa_bagrut_average","haifa_bagrut_year","haifa_psychometric_year"]]
["haifa_communication","haifa_communication","haifa","authority_unavailable","in_scope","haifa-haifa_communication-live","haifa-haifa_communication-live","haifa-haifa_communication-live","haifa_communication","haifa_communication__haifa",[],["psychometric_math","psychometric_verbal","psychometric_english","haifa_bagrut_average","haifa_bagrut_year","haifa_psychometric_year"]]
["haifa_cs","haifa_cs","haifa","authority_unavailable","in_scope","haifa-haifa_cs-live","haifa-haifa_cs-live","haifa-haifa_cs-live","haifa_cs","haifa_cs__haifa",[],["psychometric_math","psychometric_verbal","psychometric_english","haifa_bagrut_average","haifa_bagrut_year","haifa_psychometric_year"]]
["haifa_economics","haifa_economics","haifa","authority_unavailable","in_scope","haifa-haifa_economics-live","haifa-haifa_economics-live","haifa-haifa_economics-live","haifa_economics","haifa_economics__haifa",[],["psychometric_math","psychometric_verbal","psychometric_english","haifa_bagrut_average","haifa_bagrut_year","haifa_psychometric_year"]]
["haifa_engineering","haifa_engineering","haifa","unsupported",null,"haifa-infosystems-mathematics-live",null,null,null,null,[],[]]
["haifa_infosystems","haifa_infosystems","haifa","needs_input","in_scope",null,null,null,null,null,["haifa_information_systems_track"],[]]
["haifa_law","haifa_law","haifa","authority_unavailable","in_scope","haifa-haifa_law-live","haifa-haifa_law-live","haifa-haifa_law-live","haifa_law","haifa_law__haifa",[],["psychometric_math","psychometric_verbal","psychometric_english","haifa_bagrut_average","haifa_bagrut_year","haifa_psychometric_year"]]
["haifa_math","haifa_math","haifa","authority_unavailable","in_scope","haifa-haifa_math-live","haifa-haifa_math-live","haifa-haifa_math-live","haifa_math","haifa_math__haifa",[],["psychometric_math","psychometric_verbal","psychometric_english","haifa_bagrut_average","haifa_bagrut_year","haifa_psychometric_year"]]
["haifa_nursing","haifa_nursing","haifa","authority_unavailable","in_scope","haifa-haifa_nursing-live","haifa-haifa_nursing-live","haifa-haifa_nursing-live","haifa_nursing","haifa_nursing__haifa",[],["psychometric_math","psychometric_verbal","psychometric_english","haifa_bagrut_average","haifa_bagrut_year","haifa_psychometric_year"]]
["haifa_physiotherapy","haifa_physiotherapy","haifa","authority_unavailable","in_scope","haifa-haifa_physiotherapy-live","haifa-haifa_physiotherapy-live","haifa-haifa_physiotherapy-live","haifa_physiotherapy","haifa_physiotherapy__haifa",[],["psychometric_math","psychometric_verbal","psychometric_english","haifa_bagrut_average","haifa_bagrut_year","haifa_psychometric_year"]]
["haifa_politicalscience","haifa_politicalscience","haifa","authority_unavailable","in_scope","haifa-haifa_politicalscience-live","haifa-haifa_politicalscience-live","haifa-haifa_politicalscience-live","haifa_politicalscience","haifa_politicalscience__haifa",[],["psychometric_math","psychometric_verbal","psychometric_english","haifa_bagrut_average","haifa_bagrut_year","haifa_psychometric_year"]]
["haifa_psychology","haifa_psychology","haifa","authority_unavailable","in_scope","haifa-haifa_psychology-live","haifa-haifa_psychology-live","haifa-haifa_psychology-live","haifa_psychology","haifa_psychology__haifa",[],["psychometric_math","psychometric_verbal","psychometric_english","haifa_bagrut_average","haifa_bagrut_year","haifa_psychometric_year"]]
["haifa_socialwork","haifa_socialwork","haifa","authority_unavailable","in_scope","haifa-haifa_socialwork-live","haifa-haifa_socialwork-live","haifa-haifa_socialwork-live","haifa_socialwork","haifa_socialwork__haifa",[],["psychometric_math","psychometric_verbal","psychometric_english","haifa_bagrut_average","haifa_bagrut_year","haifa_psychometric_year"]]
["haifa_sociology","haifa_sociology","haifa","authority_unavailable","in_scope","haifa-haifa_sociology-live","haifa-haifa_sociology-live","haifa-haifa_sociology-live","haifa_sociology","haifa_sociology__haifa",[],["psychometric_math","psychometric_verbal","psychometric_english","haifa_bagrut_average","haifa_bagrut_year","haifa_psychometric_year"]]
["haifa_statistics","haifa_statistics","haifa","authority_unavailable","in_scope","haifa-haifa_statistics-live","haifa-haifa_statistics-live","haifa-haifa_statistics-live","haifa_statistics","haifa_statistics__haifa",[],["psychometric_math","psychometric_verbal","psychometric_english","haifa_bagrut_average","haifa_bagrut_year","haifa_psychometric_year"]]
["herzog_general_academic","herzog_general_academic","herzog","manual_gate",null,null,null,null,null,null,[],[]]
["high_q_certificate","high_q_certificate","high_q","manual_gate",null,null,null,null,null,null,[],[]]
["hit_engineering","hit_engineering","hit","score_only",null,"hit-client-formula",null,null,null,null,[],[]]
["hit_industrial_design","hit_industrial_design","hit","estimated",null,"hit-client-formula",null,null,null,null,[],[]]
["hit_visual_comm","hit_visual_comm","hit","estimated",null,"hit-client-formula",null,null,null,null,[],[]]
["huji_accounting","huji_accounting","huji","authority_unavailable","in_scope","huji-huji_accounting-live","huji-huji_accounting-live","huji-huji_accounting-live","huji_accounting","huji_accounting__huji",[],[]]
["huji_biology","huji_biology","huji","authority_unavailable","in_scope","huji-huji_biology-live","huji-huji_biology-live","huji-huji_biology-live","huji_biology","huji_biology__huji",[],[]]
["huji_business","huji_business","huji","authority_unavailable","in_scope","huji-huji_business-live","huji-huji_business-live","huji-huji_business-live","huji_business","huji_business__huji",[],[]]
["huji_cs","huji_cs","huji","authority_unavailable","in_scope","huji-huji_cs-live","huji-huji_cs-live","huji-huji_cs-live","huji_cs","huji_cs__huji",[],[]]
["huji_datascience","huji_datascience","huji","authority_unavailable","in_scope","huji-huji_datascience-live","huji-huji_datascience-live","huji-huji_datascience-live","huji_datascience","huji_datascience__huji",[],[]]
["huji_economics","huji_economics","huji","authority_unavailable","in_scope","huji-huji_economics-live","huji-huji_economics-live","huji-huji_economics-live","huji_economics","huji_economics__huji",[],[]]
["huji_engineering","huji_engineering","huji","unsupported",null,"huji-static-json",null,null,null,null,[],[]]
["huji_law","huji_law","huji","authority_unavailable","in_scope","huji-huji_law-live","huji-huji_law-live","huji-huji_law-live","huji_law","huji_law__huji",[],[]]
["huji_medicine","huji_medicine","huji","authority_unavailable","in_scope","huji-huji_medicine-live","huji-huji_medicine-live","huji-huji_medicine-live","huji_medicine","huji_medicine__huji",[],[]]
["huji_occupational_therapy","huji_occupational_therapy","huji","authority_unavailable","in_scope","huji-huji_occupational_therapy-live","huji-huji_occupational_therapy-live","huji-huji_occupational_therapy-live","huji_occupational_therapy","huji_occupational_therapy__huji",[],[]]
["huji_prep","huji_prep","huji","unsupported",null,"huji-static-json",null,null,null,null,[],[]]
["huji_psychology","huji_psychology","huji","authority_unavailable","in_scope","huji-huji_psychology-live","huji-huji_psychology-live","huji-huji_psychology-live","huji_psychology","huji_psychology__huji",[],[]]
["huji_socialwork","huji_socialwork","huji","authority_unavailable","in_scope","huji-huji_socialwork-live","huji-huji_socialwork-live","huji-huji_socialwork-live","huji_socialwork","huji_socialwork__huji",[],[]]
["idan_hahorut_education","idan_hahorut_education","idan_hahorut","manual_gate",null,null,null,null,null,null,[],[]]
["israel_academic_general_academic","israel_academic_general_academic","israel_academic","manual_gate",null,null,null,null,null,null,[],[]]
["itc_data_science","itc_data_science","itc","manual_gate",null,null,null,null,null,null,[],[]]
["jerusalem_academy_classical","jerusalem_academy_classical","jerusalem_academy","manual_gate",null,null,null,null,null,null,[],[]]
["jerusalem_academy_dance","jerusalem_academy_dance","jerusalem_academy","manual_gate",null,null,null,null,null,null,[],[]]
["jerusalem_academy_jazz","jerusalem_academy_jazz","jerusalem_academy","manual_gate",null,null,null,null,null,null,[],[]]
["johnbryce_certificate","johnbryce_certificate","johnbryce","manual_gate",null,null,null,null,null,null,[],[]]
["johnbryce_cloud_devops","johnbryce_cloud_devops","johnbryce","manual_gate",null,null,null,null,null,null,[],[]]
["johnbryce_cyber","johnbryce_cyber","johnbryce","manual_gate",null,null,null,null,null,null,[],[]]
["kaye_education","kaye_education","kaye","manual_gate",null,null,null,null,null,null,[],[]]
["kidum_certificate","kidum_certificate","kidum","manual_gate",null,null,null,null,null,null,[],[]]
["kinneret_engineering","kinneret_engineering","kinneret","manual_gate",null,null,null,null,null,null,[],[]]
["kinneret_sound_eng","kinneret_sound_eng","kinneret","manual_gate",null,null,null,null,null,null,[],[]]
["law","law","biu","estimated","in_scope",null,null,null,null,null,[],[]]
["law","law","haifa","authority_unavailable","in_scope","haifa-law-live","haifa-law-live","haifa-law-live","law","law__haifa",[],["psychometric_math","psychometric_verbal","psychometric_english","haifa_bagrut_average","haifa_bagrut_year","haifa_psychometric_year"]]
["law","law","huji","authority_unavailable","in_scope","huji-law-live","huji-law-live","huji-law-live","law","law__huji",[],[]]
["law","law","tau","authority_unavailable","in_scope","tau-law-live","tau-law-live","tau-law-live","tau-law","law__tau",[],["psychometric_english"]]
["lfa_beauty","lfa_beauty","lfa","manual_gate",null,null,null,null,null,null,[],[]]
["lfa_certificate","lfa_certificate","lfa","manual_gate",null,null,null,null,null,null,[],[]]
["me","me","ariel","unsupported","excluded","ariel-browser-required",null,null,null,null,[],[]]
["me","me","bgu","authority_unavailable","in_scope","bgu-me-live","bgu-me-live","bgu-me-live","me","me__bgu",[],["bgu_engineering_details","bgu_language_requirements"]]
["me","me","tau","authority_unavailable","in_scope","tau-me-live","tau-me-live","tau-me-live","tau-me","me__tau",[],["psychometric_english","bagrut_subject_record"]]
["me","me","technion","needs_input","in_scope","technion-me-live","technion-me-live","technion-me-live","me","me__technion",["bagrut_subject_record"],["bagrut_subject_record"]]
["medicine","medicine","bgu","score_only",null,"bgu-score-only",null,null,null,null,[],[]]
["medicine","medicine","biu","unsupported","excluded","biu-browser-required",null,null,null,null,[],[]]
["medicine","medicine","huji","authority_unavailable","in_scope","huji-medicine-live","huji-medicine-live","huji-medicine-live","medicine","medicine__huji",[],[]]
["medicine","medicine","tau","manual_gate","in_scope","tau-medicine-live","tau-medicine-live","tau-medicine-live","tau-medicine","medicine__tau",[],["psychometric_english","math_units","math_grade"]]
["medicine","medicine","technion","authority_unavailable","in_scope","technion-medicine-live","technion-medicine-live","technion-medicine-live","medicine","medicine__technion",[],["bagrut_subject_record"]]
["mediteva_certificate","mediteva_certificate","mediteva","manual_gate",null,null,null,null,null,null,[],[]]
["minshar_animation","minshar_animation","minshar","manual_gate",null,null,null,null,null,null,[],[]]
["minshar_dance","minshar_dance","minshar","manual_gate",null,null,null,null,null,null,[],[]]
["minshar_fine_arts","minshar_fine_arts","minshar","manual_gate",null,null,null,null,null,null,[],[]]
["minshar_graphic_design","minshar_graphic_design","minshar","manual_gate",null,null,null,null,null,null,[],[]]
["minshar_photography","minshar_photography","minshar","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12220685573_culinary","mon_12220685573_culinary","mon_12220685573","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12220685575_graphic_design","mon_12220685575_graphic_design","mon_12220685575","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12220696299_certificate","mon_12220696299_certificate","mon_12220696299","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12220697934_certificate","mon_12220697934_certificate","mon_12220697934","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12220697938_graphic_design","mon_12220697938_graphic_design","mon_12220697938","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12220697940_graphic_design","mon_12220697940_graphic_design","mon_12220697940","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12220697942_certificate","mon_12220697942_certificate","mon_12220697942","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12220699120_graphic_design","mon_12220699120_graphic_design","mon_12220699120","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341063909_graphic_design","mon_12341063909_graphic_design","mon_12341063909","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341064237_beauty","mon_12341064237_beauty","mon_12341064237","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341064485_graphic_design","mon_12341064485_graphic_design","mon_12341064485","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341076875_engineering","mon_12341076875_engineering","mon_12341076875","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341091471_certificate","mon_12341091471_certificate","mon_12341091471","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341091518_certificate","mon_12341091518_certificate","mon_12341091518","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341091651_certificate","mon_12341091651_certificate","mon_12341091651","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341091770_certificate","mon_12341091770_certificate","mon_12341091770","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341092241_certificate","mon_12341092241_certificate","mon_12341092241","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341092879_graphic_design","mon_12341092879_graphic_design","mon_12341092879","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341092889_certificate","mon_12341092889_certificate","mon_12341092889","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341098184_prep","mon_12341098184_prep","mon_12341098184","requirements_only",null,null,null,null,null,null,[],[]]
["mon_12341098628_business","mon_12341098628_business","mon_12341098628","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341098736_certificate","mon_12341098736_certificate","mon_12341098736","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341101353_cs","mon_12341101353_cs","mon_12341101353","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341101957_graphic_design","mon_12341101957_graphic_design","mon_12341101957","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341102793_engineering","mon_12341102793_engineering","mon_12341102793","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341102883_certificate","mon_12341102883_certificate","mon_12341102883","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341107292_general_academic","mon_12341107292_general_academic","mon_12341107292","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341107541_engineering","mon_12341107541_engineering","mon_12341107541","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341108218_certificate","mon_12341108218_certificate","mon_12341108218","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341108613_certificate","mon_12341108613_certificate","mon_12341108613","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341108755_certificate","mon_12341108755_certificate","mon_12341108755","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341113217_certificate","mon_12341113217_certificate","mon_12341113217","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341113400_cs","mon_12341113400_cs","mon_12341113400","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341113458_certificate","mon_12341113458_certificate","mon_12341113458","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341114114_engineering","mon_12341114114_engineering","mon_12341114114","missing",null,null,null,null,null,null,[],[]]
["mon_12341114237_general_academic","mon_12341114237_general_academic","mon_12341114237","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341114281_certificate","mon_12341114281_certificate","mon_12341114281","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341114949_certificate","mon_12341114949_certificate","mon_12341114949","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341118768_general_academic","mon_12341118768_general_academic","mon_12341118768","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341122479_certificate","mon_12341122479_certificate","mon_12341122479","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341122522_certificate","mon_12341122522_certificate","mon_12341122522","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341122838_certificate","mon_12341122838_certificate","mon_12341122838","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341122982_graphic_design","mon_12341122982_graphic_design","mon_12341122982","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341126233_certificate","mon_12341126233_certificate","mon_12341126233","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341126300_education","mon_12341126300_education","mon_12341126300","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341126575_beauty","mon_12341126575_beauty","mon_12341126575","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341126780_certificate","mon_12341126780_certificate","mon_12341126780","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341127690_certificate","mon_12341127690_certificate","mon_12341127690","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341128142_beauty","mon_12341128142_beauty","mon_12341128142","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341128292_medicine","mon_12341128292_medicine","mon_12341128292","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341128848_engineering","mon_12341128848_engineering","mon_12341128848","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341129101_certificate","mon_12341129101_certificate","mon_12341129101","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341133521_certificate","mon_12341133521_certificate","mon_12341133521","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341133625_certificate","mon_12341133625_certificate","mon_12341133625","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341134000_certificate","mon_12341134000_certificate","mon_12341134000","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341134405_certificate","mon_12341134405_certificate","mon_12341134405","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341134431_certificate","mon_12341134431_certificate","mon_12341134431","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341134448_business","mon_12341134448_business","mon_12341134448","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341134516_certificate","mon_12341134516_certificate","mon_12341134516","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341134763_engineering","mon_12341134763_engineering","mon_12341134763","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341134798_general_academic","mon_12341134798_general_academic","mon_12341134798","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341137305_general_academic","mon_12341137305_general_academic","mon_12341137305","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341137650_certificate","mon_12341137650_certificate","mon_12341137650","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341138289_certificate","mon_12341138289_certificate","mon_12341138289","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341138306_certificate","mon_12341138306_certificate","mon_12341138306","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341138357_certificate","mon_12341138357_certificate","mon_12341138357","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341138527_certificate","mon_12341138527_certificate","mon_12341138527","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341138594_certificate","mon_12341138594_certificate","mon_12341138594","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341138641_certificate","mon_12341138641_certificate","mon_12341138641","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341139122_certificate","mon_12341139122_certificate","mon_12341139122","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341141808_certificate","mon_12341141808_certificate","mon_12341141808","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341142058_certificate","mon_12341142058_certificate","mon_12341142058","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341142616_education","mon_12341142616_education","mon_12341142616","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341142727_certificate","mon_12341142727_certificate","mon_12341142727","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341143672_business","mon_12341143672_business","mon_12341143672","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341144078_certificate","mon_12341144078_certificate","mon_12341144078","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341144341_certificate","mon_12341144341_certificate","mon_12341144341","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341144650_general_academic","mon_12341144650_general_academic","mon_12341144650","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341144849_certificate","mon_12341144849_certificate","mon_12341144849","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341144937_certificate","mon_12341144937_certificate","mon_12341144937","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341144956_certificate","mon_12341144956_certificate","mon_12341144956","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341147363_certificate","mon_12341147363_certificate","mon_12341147363","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341147475_cs","mon_12341147475_cs","mon_12341147475","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341148145_certificate","mon_12341148145_certificate","mon_12341148145","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341148232_beauty","mon_12341148232_beauty","mon_12341148232","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341148361_certificate","mon_12341148361_certificate","mon_12341148361","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341149187_graphic_design","mon_12341149187_graphic_design","mon_12341149187","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341150395_graphic_design","mon_12341150395_graphic_design","mon_12341150395","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341150917_certificate","mon_12341150917_certificate","mon_12341150917","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341155561_business","mon_12341155561_business","mon_12341155561","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341162526_general_academic","mon_12341162526_general_academic","mon_12341162526","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341162554_certificate","mon_12341162554_certificate","mon_12341162554","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341165209_certificate","mon_12341165209_certificate","mon_12341165209","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341165356_certificate","mon_12341165356_certificate","mon_12341165356","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341165867_certificate","mon_12341165867_certificate","mon_12341165867","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341165912_certificate","mon_12341165912_certificate","mon_12341165912","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341166173_certificate","mon_12341166173_certificate","mon_12341166173","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341166462_certificate","mon_12341166462_certificate","mon_12341166462","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341166504_certificate","mon_12341166504_certificate","mon_12341166504","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341166735_certificate","mon_12341166735_certificate","mon_12341166735","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341167257_certificate","mon_12341167257_certificate","mon_12341167257","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341167283_certificate","mon_12341167283_certificate","mon_12341167283","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341167854_certificate","mon_12341167854_certificate","mon_12341167854","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341167899_certificate","mon_12341167899_certificate","mon_12341167899","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341168601_certificate","mon_12341168601_certificate","mon_12341168601","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341168658_general_academic","mon_12341168658_general_academic","mon_12341168658","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341168659_graphic_design","mon_12341168659_graphic_design","mon_12341168659","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341173466_certificate","mon_12341173466_certificate","mon_12341173466","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341175059_certificate","mon_12341175059_certificate","mon_12341175059","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341179463_education","mon_12341179463_education","mon_12341179463","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341185806_certificate","mon_12341185806_certificate","mon_12341185806","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341187468_certificate","mon_12341187468_certificate","mon_12341187468","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341187728_certificate","mon_12341187728_certificate","mon_12341187728","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341189317_certificate","mon_12341189317_certificate","mon_12341189317","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341189515_certificate","mon_12341189515_certificate","mon_12341189515","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341189852_certificate","mon_12341189852_certificate","mon_12341189852","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341203461_graphic_design","mon_12341203461_graphic_design","mon_12341203461","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341203595_certificate","mon_12341203595_certificate","mon_12341203595","manual_gate",null,null,null,null,null,null,[],[]]
["mon_12341203959_engineering","mon_12341203959_engineering","mon_12341203959","manual_gate",null,null,null,null,null,null,[],[]]
["mta_cs","mta_cs","mta","manual_gate",null,"mta-requirements-only",null,null,null,null,[],[]]
["nativ_acting","nativ_acting","nativ","manual_gate",null,null,null,null,null,null,[],[]]
["nativ_graphic_design","nativ_graphic_design","nativ","manual_gate",null,null,null,null,null,null,[],[]]
["netanya_business","netanya_business","netanya","manual_gate",null,null,null,null,null,null,[],[]]
["netanya_law","netanya_law","netanya","manual_gate",null,null,null,null,null,null,[],[]]
["nursing","nursing","tau","authority_unavailable","in_scope","tau-nursing-live","tau-nursing-live","tau-nursing-live","tau-nursing","nursing__tau",[],["psychometric_english"]]
["nutrition","nutrition","huji","authority_unavailable","in_scope","huji-nutrition-live","huji-nutrition-live","huji-nutrition-live","nutrition","nutrition__huji",[],[]]
["occupational_therapy","occupational_therapy","tau","authority_unavailable","in_scope","tau-occupational-live","tau-occupational-live","tau-occupational-live","tau-occupational-therapy","occupational_therapy__tau",[],["psychometric_english"]]
["ono_business","ono_business","ono","manual_gate",null,null,null,null,null,null,[],[]]
["ono_ce_chinese_medicine","ono_ce_chinese_medicine","ono_ce","manual_gate",null,null,null,null,null,null,[],[]]
["ono_ce_psychotherapy","ono_ce_psychotherapy","ono_ce","manual_gate",null,null,null,null,null,null,[],[]]
["ono_cs","ono_cs","ono","manual_gate",null,null,null,null,null,null,[],[]]
["ono_law","ono_law","ono","manual_gate",null,null,null,null,null,null,[],[]]
["ono_medicine","ono_medicine","ono","manual_gate",null,null,null,null,null,null,[],[]]
["ono_nursing","ono_nursing","ono","manual_gate",null,null,null,null,null,null,[],[]]
["open_university_certificate","open_university_certificate","open_university","open_admission",null,"openu-open-admission",null,null,null,null,[],[]]
["open_university_cs","open_university_cs","open_university","open_admission",null,"openu-open-admission",null,null,null,null,[],[]]
["open_university_engineering","open_university_engineering","open_university","open_admission",null,"openu-open-admission",null,null,null,null,[],[]]
["oranim_education","oranim_education","oranim","manual_gate",null,null,null,null,null,null,[],[]]
["orin_shpalter_certificate","orin_shpalter_certificate","orin_shpalter","manual_gate",null,null,null,null,null,null,[],[]]
["pardeshana_integrative","pardeshana_integrative","pardeshana","manual_gate",null,null,null,null,null,null,[],[]]
["peres_business","peres_business","peres","manual_gate",null,null,null,null,null,null,[],[]]
["peres_law","peres_law","peres","manual_gate",null,null,null,null,null,null,[],[]]
["pharmacy","pharmacy","huji","authority_unavailable","in_scope","huji-pharmacy-live","huji-pharmacy-live","huji-pharmacy-live","pharmacy","pharmacy__huji",[],[]]
["physiotherapy","physiotherapy","tau","manual_gate","in_scope","tau-physiotherapy-live","tau-physiotherapy-live","tau-physiotherapy-live","tau-physiotherapy","physiotherapy__tau",[],["psychometric_english"]]
["political_science","political_science","tau","authority_unavailable","in_scope","tau-political-science-live","tau-political-science-live","tau-political-science-live","tau-political-science","political_science__tau",[],["psychometric_english"]]
["psychology","psychology","ariel","unsupported","excluded","ariel-browser-required",null,null,null,null,[],[]]
["psychology","psychology","bgu","authority_unavailable","in_scope","bgu-psychology-live","bgu-psychology-live","bgu-psychology-live","psychology","psychology__bgu",[],[]]
["psychology","psychology","biu","unsupported","excluded","biu-browser-required",null,null,null,null,[],[]]
["psychology","psychology","haifa","authority_unavailable","in_scope","haifa-psychology-live","haifa-psychology-live","haifa-psychology-live","psychology","psychology__haifa",[],["psychometric_math","psychometric_verbal","psychometric_english","haifa_bagrut_average","haifa_bagrut_year","haifa_psychometric_year"]]
["psychology","psychology","huji","authority_unavailable","in_scope","huji-psychology-live","huji-psychology-live","huji-psychology-live","psychology","psychology__huji",[],[]]
["psychology","psychology","tau","authority_unavailable","in_scope","tau-psychology-legacy-live","tau-psychology-legacy-live","tau-psychology-legacy-live","tau-psychology","psychology__tau",[],["psychometric_english"]]
["ramat_gan_business","ramat_gan_business","ramat_gan","manual_gate",null,null,null,null,null,null,[],[]]
["ramat_gan_law","ramat_gan_law","ramat_gan","manual_gate",null,null,null,null,null,null,[],[]]
["reichman_business","reichman_business","reichman","manual_gate",null,"reichman-client-formula",null,null,null,null,[],[]]
["reichman_cs","reichman_cs","reichman","manual_gate",null,"reichman-client-formula",null,null,null,null,[],[]]
["reichman_economics","reichman_economics","reichman","manual_gate",null,"reichman-client-formula",null,null,null,null,[],[]]
["reichman_engineering","reichman_engineering","reichman","manual_gate",null,"reichman-client-formula",null,null,null,null,[],[]]
["reichman_infosystems","reichman_infosystems","reichman","manual_gate",null,"reichman-client-formula",null,null,null,null,[],[]]
["reichman_law","reichman_law","reichman","manual_gate",null,"reichman-client-formula",null,null,null,null,[],[]]
["reichman_psychology","reichman_psychology","reichman","manual_gate",null,"reichman-client-formula",null,null,null,null,[],[]]
["reidman_chinese_medicine","reidman_chinese_medicine","reidman","manual_gate",null,null,null,null,null,null,[],[]]
["reidman_homeopathy","reidman_homeopathy","reidman","manual_gate",null,null,null,null,null,null,[],[]]
["reidman_medicine","reidman_medicine","reidman","manual_gate",null,null,null,null,null,null,[],[]]
["reidman_naturopathy","reidman_naturopathy","reidman","manual_gate",null,null,null,null,null,null,[],[]]
["reidman_reflexology","reidman_reflexology","reidman","manual_gate",null,null,null,null,null,null,[],[]]
["rubin_classical","rubin_classical","rubin","manual_gate",null,null,null,null,null,null,[],[]]
["ruppin_cs","ruppin_cs","ruppin","manual_gate",null,null,null,null,null,null,[],[]]
["ruppin_engineering","ruppin_engineering","ruppin","manual_gate",null,null,null,null,null,null,[],[]]
["ruppin_marine_bio","ruppin_marine_bio","ruppin","manual_gate",null,null,null,null,null,null,[],[]]
["ruppin_prep","ruppin_prep","ruppin","manual_gate",null,null,null,null,null,null,[],[]]
["samspiegel_cinema","samspiegel_cinema","spieldocs","manual_gate",null,null,null,null,null,null,[],[]]
["samspiegel_screenwriting","samspiegel_screenwriting","spieldocs","manual_gate",null,null,null,null,null,null,[],[]]
["sapir_certificate","sapir_certificate","sapir","manual_gate",null,null,null,null,null,null,[],[]]
["sapir_law","sapir_law","sapir","manual_gate",null,null,null,null,null,null,[],[]]
["sapir_prep","sapir_prep","sapir","manual_gate",null,null,null,null,null,null,[],[]]
["sce_engineering","sce_engineering","sce","manual_gate",null,null,null,null,null,null,[],[]]
["sce_general_academic","sce_general_academic","sce","manual_gate",null,null,null,null,null,null,[],[]]
["sce_prep","sce_prep","sce","manual_gate",null,null,null,null,null,null,[],[]]
["schechter_certificate","schechter_certificate","schechter","manual_gate",null,null,null,null,null,null,[],[]]
["seminar_art_education","seminar_art_education","seminar","manual_gate",null,null,null,null,null,null,[],[]]
["seminar_certificate","seminar_certificate","seminar","manual_gate",null,null,null,null,null,null,[],[]]
["seminar_dance","seminar_dance","seminar","manual_gate",null,null,null,null,null,null,[],[]]
["seminar_music_education","seminar_music_education","seminar","manual_gate",null,null,null,null,null,null,[],[]]
["shaare_mishpat_law","shaare_mishpat_law","shaare_mishpat","manual_gate",null,null,null,null,null,null,[],[]]
["shenkar_animation","shenkar_animation","shenkar","manual_gate",null,"shenkar-bagrut-helper",null,null,null,null,[],[]]
["shenkar_engineering","shenkar_engineering","shenkar","manual_gate",null,"shenkar-bagrut-helper",null,null,null,null,[],[]]
["shenkar_fashion","shenkar_fashion","shenkar","manual_gate",null,"shenkar-bagrut-helper",null,null,null,null,[],[]]
["shenkar_graphic_design","shenkar_graphic_design","shenkar","manual_gate",null,"shenkar-bagrut-helper",null,null,null,null,[],[]]
["shenkar_industrial_design","shenkar_industrial_design","shenkar","manual_gate",null,"shenkar-bagrut-helper",null,null,null,null,[],[]]
["social_work","social_work","tau","authority_unavailable","in_scope","tau-social-work-live","tau-social-work-live","tau-social-work-live","tau-social-work","social_work__tau",[],[]]
["sports_science","sports_science","wingate","manual_gate",null,null,null,null,null,null,[],[]]
["tau_accounting","tau_accounting","tau","authority_unavailable","in_scope","tau-accounting-legacy-live","tau-accounting-legacy-live","tau-accounting-legacy-live","tau-accounting","tau_accounting__tau",[],["psychometric_english"]]
["tau_biology","tau_biology","tau","authority_unavailable","in_scope","tau-biology-legacy-live","tau-biology-legacy-live","tau-biology-legacy-live","tau-biology","tau_biology__tau",[],["psychometric_english"]]
["tau_business","tau_business","tau","authority_unavailable","in_scope","tau-business-legacy-live","tau-business-legacy-live","tau-business-legacy-live","tau-business","tau_business__tau",[],["tau_management_requirements"]]
["tau_cs","tau_cs","tau","authority_unavailable","in_scope","tau-cs-legacy-live","tau-cs-legacy-live","tau-cs-legacy-live","tau-cs","tau_cs__tau",[],["bagrut_subject_record","tau_bagrut_average","tau_application_requirements"]]
["tau_datascience","tau_datascience","tau","authority_unavailable","in_scope","tau-digital-sciences-live","tau-digital-sciences-live","tau-digital-sciences-live","tau-digital-sciences","tau_datascience__tau",[],["psychometric_english","bagrut_subject_record"]]
["tau_economics","tau_economics","tau","authority_unavailable","in_scope","tau-economics-legacy-live","tau-economics-legacy-live","tau-economics-legacy-live","tau-economics","tau_economics__tau",[],["psychometric_english"]]
["tau_ee","tau_ee","tau","authority_unavailable","in_scope","tau-ee-legacy-live","tau-ee-legacy-live","tau-ee-legacy-live","tau-ee","tau_ee__tau",[],["psychometric_english","bagrut_subject_record"]]
["tau_engineering","tau_engineering","tau","unsupported",null,"tau-biology-legacy-live",null,null,null,null,[],[]]
["tau_industrial","tau_industrial","tau","authority_unavailable","in_scope","tau-industrial-live","tau-industrial-live","tau-industrial-live","tau-industrial","tau_industrial__tau",[],["psychometric_english","bagrut_subject_record"]]
["tau_law","tau_law","tau","authority_unavailable","in_scope","tau-law-legacy-live","tau-law-legacy-live","tau-law-legacy-live","tau-law","tau_law__tau",[],["psychometric_english"]]
["tau_me","tau_me","tau","authority_unavailable","in_scope","tau-me-legacy-live","tau-me-legacy-live","tau-me-legacy-live","tau-me","tau_me__tau",[],["psychometric_english","bagrut_subject_record"]]
["tau_medicine","tau_medicine","tau","manual_gate","in_scope","tau-medicine-legacy-live","tau-medicine-legacy-live","tau-medicine-legacy-live","tau_medicine","tau_medicine__tau",[],["psychometric_english","math_units","math_grade"]]
["tau_occupational_therapy","tau_occupational_therapy","tau","authority_unavailable","in_scope","tau-occupational-legacy-live","tau-occupational-legacy-live","tau-occupational-legacy-live","tau-occupational-therapy","tau_occupational_therapy__tau",[],["psychometric_english"]]
["tau_psychology","tau_psychology","tau","authority_unavailable","in_scope","tau-psychology-live","tau-psychology-live","tau-psychology-live","tau-psychology","tau_psychology__tau",[],["psychometric_english"]]
["tau_socialwork","tau_socialwork","tau","authority_unavailable","in_scope","tau-social-work-legacy-live","tau-social-work-legacy-live","tau-social-work-legacy-live","tau-social-work","tau_socialwork__tau",[],[]]
["tcb_engineering","tcb_engineering","tcb","manual_gate",null,null,null,null,null,null,[],[]]
["tech_management_engineering","tech_management_engineering","tech_management","manual_gate",null,null,null,null,null,null,[],[]]
["technion_biomedical","technion_biomedical","technion","authority_unavailable","in_scope","technion-technion_biomedical-live","technion-technion_biomedical-live","technion-technion_biomedical-live","technion_biomedical","technion_biomedical__technion",[],["bagrut_subject_record"]]
["technion_civil","technion_civil","technion","authority_unavailable","in_scope","technion-technion_civil-live","technion-technion_civil-live","technion-technion_civil-live","technion_civil","technion_civil__technion",[],["bagrut_subject_record"]]
["technion_cs","technion_cs","technion","authority_unavailable","in_scope","technion-technion_cs-live","technion-technion_cs-live","technion-technion_cs-live","technion_cs","technion_cs__technion",[],["bagrut_subject_record"]]
["technion_datascience","technion_datascience","technion","authority_unavailable","in_scope","technion-technion_datascience-live","technion-technion_datascience-live","technion-technion_datascience-live","technion_datascience","technion_datascience__technion",[],["bagrut_subject_record"]]
["technion_ee","technion_ee","technion","needs_input","in_scope","technion-technion_ee-live","technion-technion_ee-live","technion-technion_ee-live","technion_ee","technion_ee__technion",["bagrut_subject_record"],["bagrut_subject_record"]]
["technion_engineering","technion_engineering","technion","score_only",null,"technion-score-only",null,null,null,null,[],[]]
["technion_industrial","technion_industrial","technion","authority_unavailable","in_scope","technion-technion_industrial-live","technion-technion_industrial-live","technion-technion_industrial-live","technion_industrial","technion_industrial__technion",[],["bagrut_subject_record"]]
["technion_me","technion_me","technion","needs_input","in_scope","technion-technion_me-live","technion-technion_me-live","technion-technion_me-live","technion_me","technion_me__technion",["bagrut_subject_record"],["bagrut_subject_record"]]
["technion_medicine","technion_medicine","technion","authority_unavailable","in_scope","technion-technion_medicine-live","technion-technion_medicine-live","technion-technion_medicine-live","technion_medicine","technion_medicine__technion",[],["bagrut_subject_record"]]
["telhai_biology","telhai_biology","telhai","manual_gate",null,null,null,null,null,null,[],[]]
["telhai_cs","telhai_cs","telhai","manual_gate",null,null,null,null,null,null,[],[]]
["telhai_engineering","telhai_engineering","telhai","manual_gate",null,null,null,null,null,null,[],[]]
["telhai_general_academic","telhai_general_academic","telhai","manual_gate",null,null,null,null,null,null,[],[]]
["telhai_nursing","telhai_nursing","telhai","manual_gate",null,null,null,null,null,null,[],[]]
["telhai_prep","telhai_prep","telhai","manual_gate",null,null,null,null,null,null,[],[]]
["telhai_socialwork","telhai_socialwork","telhai","manual_gate",null,null,null,null,null,null,[],[]]
["tiltan_certificate","tiltan_certificate","tiltan","manual_gate",null,null,null,null,null,null,[],[]]
["tiltan_graphic_design","tiltan_graphic_design","tiltan","manual_gate",null,null,null,null,null,null,[],[]]
["tiltan_medicine","tiltan_medicine","tiltan","manual_gate",null,null,null,null,null,null,[],[]]
["tlvyaffo_business","tlvyaffo_business","mta","manual_gate",null,"mta-requirements-only",null,null,null,null,[],[]]
["tlvyaffo_cs","tlvyaffo_cs","mta","manual_gate",null,"mta-requirements-only",null,null,null,null,[],[]]
["tlvyaffo_economics","tlvyaffo_economics","mta","manual_gate",null,"mta-requirements-only",null,null,null,null,[],[]]
["tlvyaffo_nursing","tlvyaffo_nursing","mta","manual_gate",null,"mta-requirements-only",null,null,null,null,[],[]]
["tlvyaffo_socialwork","tlvyaffo_socialwork","mta","manual_gate",null,"mta-requirements-only",null,null,null,null,[],[]]
["wingate_coaching","wingate_coaching","wingate","manual_gate",null,null,null,null,null,null,[],[]]
["wingate_general_academic","wingate_general_academic","wingate","manual_gate",null,null,null,null,null,null,[],[]]
["wingate_physical_ed","wingate_physical_ed","wingate","manual_gate",null,null,null,null,null,null,[],[]]
["wizo_general_academic","wizo_general_academic","wizo","manual_gate",null,null,null,null,null,null,[],[]]
["zefat_general_academic","zefat_general_academic","zefat","manual_gate",null,null,null,null,null,null,[],[]]
`
  .trim()
  .split('\n')
  .map((line) => JSON.parse(line) as MatrixRow)
  // Approved test update: Jorje 2026-10-29, haifa_communication uses the NITE total (general group), haifa_cs keeps Q; file granted by Oded.
  .map((row): MatrixRow =>
    row[0] === 'haifa_communication' && row[2] === 'haifa'
      ? ([
          ...row.slice(0, 11),
          ['haifa_bagrut_average', 'haifa_bagrut_year', 'haifa_psychometric_year'],
        ] as MatrixRow)
      : row,
  );

function comparePairs(a: MatrixRow, b: MatrixRow): number {
  return a[0].localeCompare(b[0]) || a[2].localeCompare(b[2]);
}

it('preserves the capability matrix except approved medicine and duplicate-ID corrections', async () => {
  capture.rows.length = 0;
  const staticPrograms = getStaticCataloguePrograms();
  expect(
    staticPrograms.reduce((count, program) => count + program.linkedInstitutionIds.length, 0),
  ).toBe(436);
  const medicine = staticPrograms.find((program) => program.id === 'medicine')!;
  expect(medicine.linkedInstitutionIds).not.toContain('bgu');
  const programs = staticPrograms.map((program) =>
    program.id === 'medicine'
      ? { ...program, linkedInstitutionIds: [...program.linkedInstitutionIds, 'bgu'] }
      : program,
  );
  const institutions = getStaticCatalogueInstitutions();
  const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('Offline matrix regression'));
  const unexpectedFetch = vi
    .fn<typeof fetch>()
    .mockRejectedValue(new Error('Unexpected global fetch'));
  vi.stubGlobal('fetch', unexpectedFetch);
  try {
    for (const program of programs) {
      capture.programmeId = program.id;
      await evaluateAdmissionsForProgram({
        program,
        institutions,
        input: { degreeId: program.id, bagrut: 100, psychometric: 650 },
        now: new Date('2026-10-25T12:00:00Z'),
        freshnessStatesBySourceId: new Map(),
        fetcher,
      });
    }
  } finally {
    vi.unstubAllGlobals();
  }
  expect(capture.getDb).not.toHaveBeenCalled();
  expect(unexpectedFetch).not.toHaveBeenCalled();
  expect(capture.rows).toHaveLength(437);
  expect(BASELINE_ROWS).toHaveLength(437);
  capture.rows.sort(comparePairs);

  // The exception must use exactly the existing named medicine target, including
  // its capability and required inputs. The approved BIU aliases below retain full row comparisons.
  const canonicalMedicine = BASELINE_ROWS.find(
    (row) => row[0] === 'bgu_medicine' && row[2] === 'bgu',
  )!;
  expect(canonicalMedicine).toBeDefined();
  const expectedRows = BASELINE_ROWS.map((row): MatrixRow => {
    if (row[0] === 'medicine' && row[2] === 'bgu')
      return [row[0], ...canonicalMedicine.slice(1)] as MatrixRow;
    if (['cs', 'ee'].includes(row[0]) && row[2] === 'biu')
      return [row[0], row[1], 'biu', 'estimated', 'in_scope', null, null, null, null, null, [], []];
    return row;
  });
  // Approved test update: Jorje 2026-10-29, haifa_communication uses the NITE total (general group), haifa_cs keeps Q; file granted by Oded.
  const communication = capture.rows.find(
    (row) => row[0] === 'haifa_communication' && row[2] === 'haifa',
  )!;
  // Approved test update: Jorje 2026-10-29, haifa_communication uses the NITE total (general group), haifa_cs keeps Q; file granted by Oded.
  expect(
    communication[11].filter((key) =>
      ['psychometric_math', 'psychometric_verbal', 'psychometric_english'].includes(key),
    ),
  ).toEqual([]);
  // Approved test update: Jorje 2026-10-29, haifa_communication uses the NITE total (general group), haifa_cs keeps Q; file granted by Oded.
  expect(capture.rows.find((row) => row[0] === 'haifa_cs' && row[2] === 'haifa')![11]).toContain(
    'psychometric_math',
  );
  for (const [index, row] of capture.rows.entries()) {
    // Approved test update, Jorje 2026-10-28
    expect(row, `${row[0]}@${row[2]}`).toEqual(expectedRows[index]);
  }
  const changedPairs = capture.rows
    .filter((row, index) => JSON.stringify(row) !== JSON.stringify(BASELINE_ROWS[index]))
    .map((row) => `${row[0]}@${row[2]}`);
  // Approved test update, Jorje 2026-10-28
  expect(changedPairs).toEqual(['cs@biu', 'ee@biu', 'medicine@bgu']);
});

// Approved test update: Jorje 2026-10-29, haifa_communication uses the NITE total (general group), haifa_cs keeps Q; file granted by Oded.
it('requires the top-level NITE total for Haifa communication', async () => {
  // The matrix captures extra-input requirements only. evaluator.ts reads top-level psychometric and requests psychometric_overall when it is absent, even with Q/V/E supplied.
  // Approved test update: Jorje 2026-10-29, haifa_communication uses the NITE total (general group), haifa_cs keeps Q; file granted by Oded.
  const program = getStaticCataloguePrograms().find((row) => row.id === 'haifa_communication')!;
  // Approved test update: Jorje 2026-10-29, haifa_communication uses the NITE total (general group), haifa_cs keeps Q; file granted by Oded.
  const applicant = gapApplicant({ haifaBagrutAverage: 104 });
  // Approved test update: Jorje 2026-10-29, haifa_communication uses the NITE total (general group), haifa_cs keeps Q; file granted by Oded.
  Reflect.deleteProperty(applicant, 'psychometric');
  // Approved test update: Jorje 2026-10-29, haifa_communication uses the NITE total (general group), haifa_cs keeps Q; file granted by Oded.
  const { result } = await gapEvaluate(program, 'haifa', applicant);
  // Approved test update: Jorje 2026-10-29, haifa_communication uses the NITE total (general group), haifa_cs keeps Q; file granted by Oded.
  expect(result).toMatchObject({ kind: 'needs_input', requiredInputs: ['psychometric_overall'] });
});
