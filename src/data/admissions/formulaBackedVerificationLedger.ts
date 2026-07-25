import { allPrograms } from '@/data/degrees';
import {
  buildFormulaBackedPairInventory,
  FORMULA_BACKED_INSTITUTION_IDS,
  type FormulaBackedInstitutionId,
  type FormulaBackedPairInventory,
} from './formulaBackedPairInventory';

export type FormulaPairLedgerState = 'exact' | 'withheld' | 'stale' | 'blocked';

export interface FormulaPairVerificationLedgerEntry {
  pairId: string;
  institutionId: FormulaBackedInstitutionId;
  admissionCycle: '2026-2027';
  state: FormulaPairLedgerState;
  officialProgramId: string | null;
  sourceUrl: string;
  formulaFamily: string | null;
  fixtureEvidence: {
    eligible: boolean;
    below: boolean;
    fingerprint: string | null;
  };
  liveProof: {
    comparedScore: boolean;
    comparedVerdict: boolean;
    comparedAt: string | null;
    sourceFingerprint: string | null;
  };
  reason: string;
}

export interface FormulaPairLedgerReconciliation {
  isMatching: boolean;
  missingPairIds: string[];
  unexpectedPairIds: string[];
  duplicatePairIds: string[];
}

interface InstitutionCompletion {
  total: number;
  exact: number;
  withheld: number;
  stale: number;
  blocked: number;
}

export interface FormulaPairVerificationCompletion extends InstitutionCompletion {
  isComplete: boolean;
  totalsByInstitution: Record<FormulaBackedInstitutionId, InstitutionCompletion>;
}

const REVIEWED_PAIR_IDS_BY_INSTITUTION: Record<FormulaBackedInstitutionId, readonly string[]> = {
  tau: [
    'accounting__tau',
    'architecture__tau',
    'biology__tau',
    'business__tau',
    'communication__tau',
    'cs__tau',
    'datascience__tau',
    'economics__tau',
    'education__tau',
    'ee__tau',
    'law__tau',
    'me__tau',
    'medicine__tau',
    'nursing__tau',
    'nutrition__tau',
    'occupational_therapy__tau',
    'physiotherapy__tau',
    'political_science__tau',
    'psychology__tau',
    'social_work__tau',
    'tau_accounting__tau',
    'tau_biology__tau',
    'tau_business__tau',
    'tau_cs__tau',
    'tau_datascience__tau',
    'tau_economics__tau',
    'tau_ee__tau',
    'tau_industrial__tau',
    'tau_infosystems__tau',
    'tau_law__tau',
    'tau_me__tau',
    'tau_medicine__tau',
    'tau_occupational_therapy__tau',
    'tau_psychology__tau',
    'tau_socialwork__tau',
  ],
  huji: [
    'accounting__huji',
    'biology__huji',
    'business__huji',
    'communication__huji',
    'cs__huji',
    'datascience__huji',
    'economics__huji',
    'education__huji',
    'huji_accounting__huji',
    'huji_biology__huji',
    'huji_business__huji',
    'huji_cs__huji',
    'huji_datascience__huji',
    'huji_economics__huji',
    'huji_law__huji',
    'huji_medicine__huji',
    'huji_occupational_therapy__huji',
    'huji_psychology__huji',
    'huji_socialwork__huji',
    'law__huji',
    'medicine__huji',
    'nursing__huji',
    'nutrition__huji',
    'occupational_therapy__huji',
    'pharmacy__huji',
    'physiotherapy__huji',
    'political_science__huji',
    'psychology__huji',
    'social_work__huji',
  ],
  bgu: [
    'accounting__bgu',
    'bgu_accounting__bgu',
    'bgu_biology__bgu',
    'bgu_business__bgu',
    'bgu_cs__bgu',
    'bgu_datascience__bgu',
    'bgu_economics__bgu',
    'bgu_ee__bgu',
    'bgu_industrial__bgu',
    'bgu_me__bgu',
    'bgu_medicine__bgu',
    'bgu_nursing__bgu',
    'bgu_psychology__bgu',
    'bgu_socialwork__bgu',
    'biology__bgu',
    'business__bgu',
    'communication__bgu',
    'cs__bgu',
    'datascience__bgu',
    'economics__bgu',
    'education__bgu',
    'ee__bgu',
    'me__bgu',
    'nutrition__bgu',
    'occupational_therapy__bgu',
    'physiotherapy__bgu',
    'political_science__bgu',
    'psychology__bgu',
    'social_work__bgu',
  ],
  haifa: [
    'accounting__haifa',
    'biology__haifa',
    'communication__haifa',
    'cs__haifa',
    'economics__haifa',
    'haifa_accounting__haifa',
    'haifa_biology__haifa',
    'haifa_communication__haifa',
    'haifa_cs__haifa',
    'haifa_economics__haifa',
    'haifa_infosystems__haifa',
    'haifa_law__haifa',
    'haifa_math__haifa',
    'haifa_nursing__haifa',
    'haifa_physiotherapy__haifa',
    'haifa_politicalscience__haifa',
    'haifa_psychology__haifa',
    'haifa_socialwork__haifa',
    'haifa_sociology__haifa',
    'haifa_statistics__haifa',
    'law__haifa',
    'nursing__haifa',
    'occupational_therapy__haifa',
    'physiotherapy__haifa',
    'political_science__haifa',
    'psychology__haifa',
    'social_work__haifa',
  ],
  technion: [
    'architecture__technion',
    'cs__technion',
    'datascience__technion',
    'ee__technion',
    'me__technion',
    'medicine__technion',
    'technion_biomedical__technion',
    'technion_civil__technion',
    'technion_cs__technion',
    'technion_datascience__technion',
    'technion_ee__technion',
    'technion_industrial__technion',
    'technion_me__technion',
    'technion_medicine__technion',
  ],
  colman: ['colmgmt_cs__colman'],
};

const SOURCE_BY_INSTITUTION: Record<FormulaBackedInstitutionId, { url: string; reason: string }> = {
  tau: {
    url: 'https://go.tau.ac.il/graphql',
    reason:
      'TAU pair mapping, two verdict fixtures, and a current score-and-verdict comparison are not yet reviewed.',
  },
  huji: {
    url: 'https://go.huji.ac.il/jjson/huji.json.gz',
    reason:
      'HUJI bundled calculation logic and pair-specific verdict fixtures are not yet reproduced and reviewed.',
  },
  bgu: {
    url: 'https://bgu4u.bgu.ac.il/html/average_calc/index.php',
    reason:
      'BGU score-family output is insufficient without pair-specific gates, verdict fixtures, and live proof.',
  },
  haifa: {
    url: 'https://applicants.haifa.ac.il/enrollmentChances/index.html',
    reason:
      'Haifa pair mappings and current eligible/below verdict fixtures are not yet reviewed for every pair.',
  },
  technion: {
    url: 'https://admissions.technion.ac.il/calculator/',
    reason:
      'Technion score output and catalogue cutoffs have not been joined by pair-specific live verdict proof.',
  },
  colman: {
    url: 'https://www.colman.ac.il/academics/ba/computer-science/',
    reason:
      'The College of Management pair does not yet have an official calculator replay with two verdict fixtures.',
  },
};

export const FORMULA_BACKED_VERIFICATION_LEDGER: FormulaPairVerificationLedgerEntry[] =
  FORMULA_BACKED_INSTITUTION_IDS.flatMap((institutionId) => {
    const source = SOURCE_BY_INSTITUTION[institutionId];
    return REVIEWED_PAIR_IDS_BY_INSTITUTION[institutionId].map((pairId) => ({
      pairId,
      institutionId,
      admissionCycle: '2026-2027' as const,
      state: 'withheld' as const,
      officialProgramId: null,
      sourceUrl: source.url,
      formulaFamily: null,
      fixtureEvidence: {
        eligible: false,
        below: false,
        fingerprint: null,
      },
      liveProof: {
        comparedScore: false,
        comparedVerdict: false,
        comparedAt: null,
        sourceFingerprint: null,
      },
      reason: source.reason,
    }));
  });

const CURRENT_INVENTORY = buildFormulaBackedPairInventory(allPrograms);
const LEDGER_BY_PAIR_ID = new Map(
  FORMULA_BACKED_VERIFICATION_LEDGER.map((entry) => [entry.pairId, entry]),
);
const IN_SCOPE_PAIR_IDS = new Set(CURRENT_INVENTORY.pairs.map((pair) => pair.id));
const EXCLUDED_PAIR_IDS = new Set(CURRENT_INVENTORY.excludedPairs.map((pair) => pair.id));

export function getFormulaPairVerificationEntry(
  pairId: string,
): FormulaPairVerificationLedgerEntry | undefined {
  return LEDGER_BY_PAIR_ID.get(pairId);
}

export function formulaBackedPairScope(pairId: string): 'in_scope' | 'excluded' | undefined {
  if (IN_SCOPE_PAIR_IDS.has(pairId)) {
    return 'in_scope';
  }
  if (EXCLUDED_PAIR_IDS.has(pairId)) {
    return 'excluded';
  }
  return undefined;
}

export function reconcileFormulaPairVerificationLedger(
  inventory: FormulaBackedPairInventory,
  ledger: readonly FormulaPairVerificationLedgerEntry[],
): FormulaPairLedgerReconciliation {
  const inventoryPairIds = new Set(inventory.pairs.map((pair) => pair.id));
  const ledgerPairIds = new Set<string>();
  const duplicatePairIds = new Set<string>();

  for (const entry of ledger) {
    if (ledgerPairIds.has(entry.pairId)) {
      duplicatePairIds.add(entry.pairId);
    }
    ledgerPairIds.add(entry.pairId);
  }

  const missingPairIds = [...inventoryPairIds]
    .filter((pairId) => !ledgerPairIds.has(pairId))
    .sort();
  const unexpectedPairIds = [...ledgerPairIds]
    .filter((pairId) => !inventoryPairIds.has(pairId))
    .sort();

  return {
    isMatching:
      missingPairIds.length === 0 && unexpectedPairIds.length === 0 && duplicatePairIds.size === 0,
    missingPairIds,
    unexpectedPairIds,
    duplicatePairIds: [...duplicatePairIds].sort(),
  };
}

export function formulaPairVerificationCompletion(
  inventory: FormulaBackedPairInventory,
  ledger: readonly FormulaPairVerificationLedgerEntry[],
): FormulaPairVerificationCompletion {
  const totalsByInstitution = Object.fromEntries(
    FORMULA_BACKED_INSTITUTION_IDS.map((institutionId) => [institutionId, emptyCompletion()]),
  ) as Record<FormulaBackedInstitutionId, InstitutionCompletion>;
  const completion = emptyCompletion();

  for (const pair of inventory.pairs) {
    const entry = ledger.find((candidate) => candidate.pairId === pair.id);
    const state = entry?.state ?? 'withheld';
    incrementCompletion(completion, state);
    incrementCompletion(
      totalsByInstitution[pair.institutionId as FormulaBackedInstitutionId],
      state,
    );
  }

  return {
    ...completion,
    isComplete: completion.total > 0 && completion.exact === completion.total,
    totalsByInstitution,
  };
}

function emptyCompletion(): InstitutionCompletion {
  return {
    total: 0,
    exact: 0,
    withheld: 0,
    stale: 0,
    blocked: 0,
  };
}

function incrementCompletion(
  completion: InstitutionCompletion,
  state: FormulaPairLedgerState,
): void {
  completion.total += 1;
  completion[state] += 1;
}
