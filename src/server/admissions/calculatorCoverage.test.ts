import { describe, expect, it } from 'vitest';

import {
  calculatorCoverageInventory,
  formulaBackedPairCoverage,
  reconcileCalculatorCoverage,
} from './calculatorCoverage';
import { admissionsSourceTargets } from '@/server/ingestion/admissionsSourceRegistry';
import { UNIVERSITIES } from '@/data/degreesData';

describe('calculatorCoverage', () => {
  it('gives every Monday calculator-related institution an explicit runtime capability', () => {
    for (const entry of calculatorCoverageInventory) {
      expect(entry.intendedCapability).toBeDefined();
      expect(entry.nextAction.length).toBeGreaterThan(0);
    }
  });

  it('covers all 13 Monday calculator-related institutions', () => {
    expect(calculatorCoverageInventory).toHaveLength(13);
  });

  it('reconciles UNIVERSITIES entries against the coverage registry', () => {
    const result = reconcileCalculatorCoverage();
    expect(result.calculatorConfigsWithoutCoverage).toEqual([]);
  });

  it('reconciles source targets against the coverage registry', () => {
    const result = reconcileCalculatorCoverage();
    expect(result.sourceTargetsWithoutCoverage).toEqual([]);
  });

  it('does not require Shenkar or MTA to have a calculator config', () => {
    const shenkar = calculatorCoverageInventory.find((e) => e.institutionId === 'shenkar');
    expect(shenkar?.hasCalculatorConfig).toBe(false);
    expect(shenkar?.intendedCapability).toBe('manual_gate');

    const mta = calculatorCoverageInventory.find((e) => e.institutionId === 'mta');
    expect(mta?.hasCalculatorConfig).toBe(false);
    expect(mta?.intendedCapability).toBe('requirements_only');
  });

  it('marks Reichman, Afeka, and HIT as estimated with calculator config', () => {
    for (const id of ['reichman', 'afeka', 'hit']) {
      const entry = calculatorCoverageInventory.find((e) => e.institutionId === id);
      expect(entry?.hasCalculatorConfig).toBe(true);
      expect(entry?.intendedCapability).toBe('estimated');
    }
  });

  it('marks BIU and Ariel as explicitly unsupported exclusions', () => {
    const biu = calculatorCoverageInventory.find((e) => e.institutionId === 'biu');
    expect(biu?.intendedCapability).toBe('unsupported');

    const ariel = calculatorCoverageInventory.find((e) => e.institutionId === 'ariel');
    expect(ariel?.intendedCapability).toBe('unsupported');
    expect(ariel?.supportLevel).toBe('unsupported');
    expect(ariel?.evidenceKind).toBe('browser_blocked');
  });

  it('reports pair-level formula coverage without institution-wide exact claims', () => {
    expect(formulaBackedPairCoverage).toMatchObject({
      total: 135,
      exact: 0,
      withheld: 135,
      isComplete: false,
    });

    for (const institutionId of ['tau', 'huji', 'bgu', 'haifa', 'technion']) {
      const entry = calculatorCoverageInventory.find(
        (candidate) => candidate.institutionId === institutionId,
      );
      expect(entry?.intendedCapability).toBe('authority_unavailable');
      expect(entry?.supportLevel).toBe('authority_unavailable');
    }
  });

  it('marks Open University as open admission', () => {
    const entry = calculatorCoverageInventory.find((e) => e.institutionId === 'open_university');
    expect(entry?.intendedCapability).toBe('open_admission');
  });

  it('fails if a future calculator institution is added to UNIVERSITIES without coverage', () => {
    const universityIds = new Set(UNIVERSITIES.map((u) => u.id));
    for (const entry of calculatorCoverageInventory) {
      if (entry.hasCalculatorConfig) {
        expect(universityIds.has(entry.institutionId)).toBe(true);
      }
    }
  });

  it('fails if a future source target is added without coverage metadata', () => {
    const coverageIds = new Set(calculatorCoverageInventory.map((e) => e.institutionId));
    for (const target of admissionsSourceTargets) {
      expect(coverageIds.has(target.institutionId)).toBe(true);
    }
  });
});
