import { UNIVERSITIES } from '@/data/degreesData';
import { allPrograms } from '@/data/degrees';
import {
  FORMULA_BACKED_VERIFICATION_LEDGER,
  formulaPairVerificationCompletion,
} from '@/data/admissions/formulaBackedVerificationLedger';
import { buildFormulaBackedPairInventory } from '@/data/admissions/formulaBackedPairInventory';
import { admissionsSourceTargets } from '@/server/ingestion/admissionsSourceRegistry';
import type { AdmissionsEvaluationCapability } from '@/types/admissionsEvaluation';

export type CalculatorSupportLevel =
  | 'exact'
  | 'estimated'
  | 'score_only'
  | 'blocked'
  | 'static_candidate'
  | 'open_admission'
  | 'manual_gate'
  | 'requirements_only'
  | 'authority_unavailable'
  | 'unsupported'
  | 'missing';

export interface CalculatorCoverageEntry {
  institutionId: string;
  institutionName: string;
  mondayItemId: string;
  officialUrl: string;
  evidenceKind:
    | 'exact_official'
    | 'client_side_formula'
    | 'score_only'
    | 'browser_blocked'
    | 'static_json'
    | 'open_admission_policy'
    | 'bagrut_helper'
    | 'requirements_enrichment'
    | 'none';
  intendedCapability: AdmissionsEvaluationCapability;
  supportLevel: CalculatorSupportLevel;
  hasCalculatorConfig: boolean;
  hasSourceTarget: boolean;
  nextAction: string;
}

export const calculatorCoverageInventory: CalculatorCoverageEntry[] = [
  {
    institutionId: 'huji',
    institutionName: 'Hebrew University',
    mondayItemId: '12220699647',
    officialUrl: 'https://go.huji.ac.il/jjson/huji.json.gz',
    evidenceKind: 'static_json',
    intendedCapability: 'authority_unavailable',
    supportLevel: 'authority_unavailable',
    hasCalculatorConfig: true,
    hasSourceTarget: true,
    nextAction: 'Run a separate HUJI static JSON and bundled-JS reproduction spike',
  },
  {
    institutionId: 'tau',
    institutionName: 'Tel Aviv University',
    mondayItemId: '12220699649',
    officialUrl: 'https://go.tau.ac.il/graphql',
    evidenceKind: 'exact_official',
    intendedCapability: 'authority_unavailable',
    supportLevel: 'authority_unavailable',
    hasCalculatorConfig: true,
    hasSourceTarget: true,
    nextAction: 'Expand program-level exact target mappings beyond Digital Sciences',
  },
  {
    institutionId: 'technion',
    institutionName: 'Technion',
    mondayItemId: '12220699650',
    officialUrl:
      'https://admissions.technion.ac.il/wp-content/plugins/technion-calculators/technion-calculators-sum.php',
    evidenceKind: 'score_only',
    intendedCapability: 'authority_unavailable',
    supportLevel: 'authority_unavailable',
    hasCalculatorConfig: true,
    hasSourceTarget: true,
    nextAction: 'Pair calculator output with a reviewed official threshold source',
  },
  {
    institutionId: 'bgu',
    institutionName: 'Ben-Gurion University',
    mondayItemId: '12220699687',
    officialUrl: 'https://bgu4u.bgu.ac.il/html/average_calc/index.php',
    evidenceKind: 'score_only',
    intendedCapability: 'authority_unavailable',
    supportLevel: 'authority_unavailable',
    hasCalculatorConfig: true,
    hasSourceTarget: true,
    nextAction: 'Find or review an official cutoff/status source before product decisions',
  },
  {
    institutionId: 'biu',
    institutionName: 'Bar-Ilan University',
    mondayItemId: '12220699688',
    officialUrl: 'https://in.biu.ac.il/Pages/Psychometric.aspx',
    evidenceKind: 'browser_blocked',
    intendedCapability: 'unsupported',
    supportLevel: 'unsupported',
    hasCalculatorConfig: true,
    hasSourceTarget: true,
    nextAction: 'Move to Hermes/VPS browser automation lane',
  },
  {
    institutionId: 'haifa',
    institutionName: 'University of Haifa',
    mondayItemId: '12220699689',
    officialUrl: 'https://applicants.haifa.ac.il/enrollmentChances/index.html',
    evidenceKind: 'exact_official',
    intendedCapability: 'authority_unavailable',
    supportLevel: 'authority_unavailable',
    hasCalculatorConfig: true,
    hasSourceTarget: true,
    nextAction: 'Expand program-level exact target mappings beyond CS',
  },
  {
    institutionId: 'open_university',
    institutionName: 'Open University',
    mondayItemId: '12220699690',
    officialUrl: 'https://www.openu.ac.il/',
    evidenceKind: 'open_admission_policy',
    intendedCapability: 'open_admission',
    supportLevel: 'open_admission',
    hasCalculatorConfig: false,
    hasSourceTarget: true,
    nextAction: 'Represent as open-admission policy rather than calculator reproduction',
  },
  {
    institutionId: 'ariel',
    institutionName: 'Ariel University',
    mondayItemId: '12220680983',
    officialUrl: 'https://www.ariel.ac.il/wp/',
    evidenceKind: 'browser_blocked',
    intendedCapability: 'unsupported',
    supportLevel: 'unsupported',
    hasCalculatorConfig: true,
    hasSourceTarget: true,
    nextAction:
      'Use the mapped sekhem estimate with blocked-source disclosure for thresholded programs, and keep the Hermes/VPS browser lane as the path to re-verify official thresholds.',
  },
  {
    institutionId: 'reichman',
    institutionName: 'Reichman University',
    mondayItemId: '12220699692',
    officialUrl: 'https://www.runi.ac.il/admissions/undergraduate/calculator',
    evidenceKind: 'client_side_formula',
    intendedCapability: 'estimated',
    supportLevel: 'estimated',
    hasCalculatorConfig: true,
    hasSourceTarget: true,
    nextAction: 'Pair reviewed adapted-score formula with reviewed program thresholds',
  },
  {
    institutionId: 'afeka',
    institutionName: 'Afeka College of Engineering',
    mondayItemId: '12220699693',
    officialUrl: 'https://www.afeka.ac.il/candidate/candidate-information-bsc/calculator/',
    evidenceKind: 'client_side_formula',
    intendedCapability: 'estimated',
    supportLevel: 'estimated',
    hasCalculatorConfig: true,
    hasSourceTarget: true,
    nextAction:
      'Collect missing subject inputs or emit needs-input when required fields are absent',
  },
  {
    institutionId: 'hit',
    institutionName: 'HIT - Holon Institute of Technology',
    mondayItemId: '12220699695',
    officialUrl: 'https://calc.hit.ac.il/',
    evidenceKind: 'client_side_formula',
    intendedCapability: 'estimated',
    supportLevel: 'estimated',
    hasCalculatorConfig: true,
    hasSourceTarget: true,
    nextAction: 'Use minimum-floor estimation for engineering; manual-gate for design programs',
  },
  {
    institutionId: 'shenkar',
    institutionName: 'Shenkar - Engineering. Design. Art',
    mondayItemId: '12220699694',
    officialUrl: 'https://www.shenkar.ac.il/he/pages/calc/',
    evidenceKind: 'bagrut_helper',
    intendedCapability: 'manual_gate',
    supportLevel: 'manual_gate',
    hasCalculatorConfig: false,
    hasSourceTarget: true,
    nextAction: 'Represent as manual-gate evidence; do not model as a normal sekhem calculator',
  },
  {
    institutionId: 'mta',
    institutionName: 'MTA - Academic College of Tel Aviv-Yaffo',
    mondayItemId: '12220708944',
    officialUrl: 'https://www.mta.ac.il/conditions_for_applying',
    evidenceKind: 'requirements_enrichment',
    intendedCapability: 'requirements_only',
    supportLevel: 'requirements_only',
    hasCalculatorConfig: false,
    hasSourceTarget: true,
    nextAction: 'Reverse-engineer the secondary calculator link or represent as requirements-only',
  },
];

const FORMULA_BACKED_PAIR_INVENTORY = buildFormulaBackedPairInventory(allPrograms);

export const formulaBackedPairCoverage = formulaPairVerificationCompletion(
  FORMULA_BACKED_PAIR_INVENTORY,
  FORMULA_BACKED_VERIFICATION_LEDGER,
);

export interface CoverageReconciliationResult {
  coverageEntries: CalculatorCoverageEntry[];
  calculatorConfigsWithoutCoverage: string[];
  sourceTargetsWithoutCoverage: string[];
  coverageEntriesWithoutCalculatorConfig: string[];
  allCovered: boolean;
}

export function reconcileCalculatorCoverage(): CoverageReconciliationResult {
  const coverageByInstitution = new Map(
    calculatorCoverageInventory.map((entry) => [entry.institutionId, entry]),
  );

  const calculatorConfigIds = new Set(UNIVERSITIES.map((uni) => uni.id));
  const sourceTargetInstitutionIds = new Set(
    admissionsSourceTargets.map((target) => target.institutionId),
  );

  const calculatorConfigsWithoutCoverage = [...calculatorConfigIds].filter(
    (id) => !coverageByInstitution.has(id),
  );

  const sourceTargetsWithoutCoverage = [...sourceTargetInstitutionIds].filter(
    (id) => !coverageByInstitution.has(id),
  );

  const coverageEntriesWithoutCalculatorConfig = calculatorCoverageInventory
    .filter(
      (entry) =>
        !entry.hasCalculatorConfig &&
        entry.intendedCapability !== 'manual_gate' &&
        entry.intendedCapability !== 'requirements_only' &&
        entry.intendedCapability !== 'open_admission' &&
        entry.intendedCapability !== 'missing',
    )
    .map((entry) => entry.institutionId);

  const allCovered =
    calculatorConfigsWithoutCoverage.length === 0 &&
    sourceTargetsWithoutCoverage.length === 0 &&
    coverageEntriesWithoutCalculatorConfig.length === 0;

  return {
    coverageEntries: calculatorCoverageInventory,
    calculatorConfigsWithoutCoverage,
    sourceTargetsWithoutCoverage,
    coverageEntriesWithoutCalculatorConfig,
    allCovered,
  };
}
