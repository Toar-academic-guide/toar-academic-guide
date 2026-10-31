import { describe, expect, it } from 'vitest';

import { allPrograms } from '@/data/degrees';
import { buildFormulaBackedPairInventory } from './formulaBackedPairInventory';
import {
  FORMULA_BACKED_VERIFICATION_LEDGER,
  formulaPairVerificationCompletion,
  reconcileFormulaPairVerificationLedger,
  verifiedProgramEntry,
} from './formulaBackedVerificationLedger';
import {
  PROGRAM_VERIFICATION_ARTIFACTS,
  TAU_PROGRAM_VERIFICATION_METADATA,
} from './tauProgramVerification';
import { evaluateProgramVerification } from '@/server/admissions/verification/programVerification';

describe('formula-backed verification ledger', () => {
  const inventory = buildFormulaBackedPairInventory(allPrograms);

  it('retains NULL generic BIU medicine for catalogue requirements without exact coverage', () => {
    expect(inventory.excludedPairs.find((pair) => pair.id === 'medicine__biu')).toMatchObject({
      cutoff: null,
    });
    expect(
      FORMULA_BACKED_VERIFICATION_LEDGER.find(
        (entry) => entry.pairId === 'medicine__biu' && entry.state === 'exact',
      ),
    ).toBeUndefined();
  });

  it.each(
    Object.entries(PROGRAM_VERIFICATION_ARTIFACTS).filter(
      ([, artifact]) => artifact.contract.proof.state === 'verified',
    ),
  )('keeps the complete verification artifacts valid for %s', (_pair, artifact) => {
    expect(
      evaluateProgramVerification({
        ...artifact,
        currentAdmissionCycle: artifact.contract.admissionCycle,
        currentSourceFingerprint: artifact.contract.sourceFingerprint,
      }),
    ).toEqual({ state: 'exact', capability: 'exact', issues: [] });
  });

  it('does not claim exact coverage when a declared verified fixture has drifted', () => {
    const artifact = structuredClone(TAU_PROGRAM_VERIFICATION_METADATA.ee__tau);
    artifact.fixtures[0].expected.score += 1;
    expect(verifiedProgramEntry(artifact).state).toBe('stale');
    artifact.contract.sourceFingerprint = 'sha256:invalid';
    expect(verifiedProgramEntry(artifact).state).toBe('blocked');
  });

  it('has one reviewed capability record for every in-scope pair', () => {
    const reconciliation = reconcileFormulaPairVerificationLedger(
      inventory,
      FORMULA_BACKED_VERIFICATION_LEDGER,
    );

    expect(reconciliation).toEqual({
      isMatching: true,
      missingPairIds: [],
      unexpectedPairIds: [],
      duplicatePairIds: [],
    });
    // Approved by Jorje 2026-10-25 02:10 (4): final BIU brief §2 routes CS, EE and social work, adding three ledger records.
    // Approved test update, Jorje 2026-10-28
    // Approved test update, Jorje 2026-10-31: generic BGU medicine adds one withheld record; HUJI medicine retains its verified independent authority.
    expect(FORMULA_BACKED_VERIFICATION_LEDGER).toHaveLength(144);
  });

  it('counts only fully proved pairs as exact', () => {
    const completion = formulaPairVerificationCompletion(
      inventory,
      FORMULA_BACKED_VERIFICATION_LEDGER,
    );

    // Approved by Jorje 2026-10-25 02:10 (4): final BIU brief §2 adds three withheld pairs; exact remains 125.
    // Approved test update, Jorje 2026-10-28
    expect(completion).toMatchObject({
      // Approved test update, Jorje 2026-10-31: adding generic BGU medicine increases the inventory by one.
      total: 144,
      // Approved test update: Jorje 2026-10-29, haifa_psychology and psychology become exact in the Haifa formula PR
      exact: 125,
      // Approved test update: Jorje 2026-10-29, haifa_psychology and psychology become exact in the Haifa formula PR
      // Approved test update, Jorje 2026-10-31: generic BGU medicine lacks an exact evaluator target and adds one withheld pair.
      withheld: 18,
      isComplete: false,
    });
    // Approved by Jorje 2026-10-25 02:10 (4): final BIU brief §2 expands BIU from seven to ten withheld pairs.
    // Approved test update, Jorje 2026-10-28
    expect(completion.totalsByInstitution).toEqual({
      tau: { total: 33, exact: 29, withheld: 4, stale: 0, blocked: 0 },
      huji: { total: 28, exact: 28, withheld: 0, stale: 0, blocked: 0 },
      // Approved test update, Jorje 2026-10-31: generic BGU medicine adds one pair without claiming new exact coverage.
      bgu: { total: 29, exact: 28, withheld: 1, stale: 0, blocked: 0 },
      // Approved test update: Jorje 2026-10-29, haifa_psychology and psychology become exact in the Haifa formula PR
      haifa: { total: 27, exact: 26, withheld: 0, stale: 0, blocked: 1 },
      technion: { total: 14, exact: 14, withheld: 0, stale: 0, blocked: 0 },
      colman: { total: 1, exact: 0, withheld: 1, stale: 0, blocked: 0 },
      biu: { total: 12, exact: 0, withheld: 12, stale: 0, blocked: 0 },
    });
    // Approved test update, Jorje 2026-10-28
    expect(
      FORMULA_BACKED_VERIFICATION_LEDGER.filter((entry) => entry.state === 'exact').map(
        (entry) => entry.pairId,
      ),
      // Approved test update: Jorje 2026-10-29, haifa_psychology and psychology become exact in the Haifa formula PR
    ).toHaveLength(125);
  });

  it('names a newly discovered pair that lacks a reviewed ledger record', () => {
    const expandedInventory = {
      ...inventory,
      pairs: [
        ...inventory.pairs,
        {
          id: 'new_program__tau',
          programId: 'new_program',
          programName: 'New Program',
          institutionId: 'tau' as const,
          cutoff: 700,
          discovery: 'threshold' as const,
        },
      ],
      total: inventory.total + 1,
      totalsByInstitution: {
        ...inventory.totalsByInstitution,
        tau: inventory.totalsByInstitution.tau + 1,
      },
    };

    expect(
      reconcileFormulaPairVerificationLedger(expandedInventory, FORMULA_BACKED_VERIFICATION_LEDGER),
    ).toMatchObject({
      isMatching: false,
      missingPairIds: ['new_program__tau'],
    });
  });

  it('does not count the unresolved Haifa Information Systems mapping as verified', () => {
    expect(
      FORMULA_BACKED_VERIFICATION_LEDGER.find(
        (entry) => entry.pairId === 'haifa_infosystems__haifa',
      ),
    ).toMatchObject({ state: 'blocked', liveProof: { comparedVerdict: false } });
  });

  it('never puts explicitly excluded Ariel or Bar-Ilan pairs in completion totals', () => {
    const ledgerPairIds = new Set(FORMULA_BACKED_VERIFICATION_LEDGER.map((entry) => entry.pairId));

    expect(inventory.excludedPairs.length).toBeGreaterThan(0);
    expect(inventory.excludedPairs.some((pair) => ledgerPairIds.has(pair.id))).toBe(false);
  });

  it('records an authority-specific reason for every withheld pair', () => {
    const withheld = FORMULA_BACKED_VERIFICATION_LEDGER.filter(
      (entry) => entry.state === 'withheld',
    );

    // Approved by Jorje 2026-10-25 02:10 (4): final BIU brief §2 adds three estimated pairs without exact formula proof.
    // Approved test update, Jorje 2026-10-28
    // Approved test update: Jorje 2026-10-29, haifa_psychology and psychology become exact in the Haifa formula PR
    // Approved test update, Jorje 2026-10-31: generic BGU medicine is withheld until its alias has programme-specific replay proof.
    expect(withheld).toHaveLength(18);
    expect(withheld.every((entry) => entry.reason.length > 80)).toBe(true);
    expect(withheld.every((entry) => entry.sourceUrl.startsWith('https://'))).toBe(true);
    expect(
      withheld
        .filter((entry) => entry.pairId === 'colmgmt_cs__colman')
        .every(
          (entry) =>
            entry.officialProgramId === null &&
            !entry.liveProof.comparedScore &&
            !entry.liveProof.comparedVerdict,
        ),
    ).toBe(true);
  });
});
