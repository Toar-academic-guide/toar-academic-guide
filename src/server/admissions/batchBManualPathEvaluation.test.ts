import { describe, expect, it } from 'vitest';
import {
  BATCH_B_PROGRAM_IDS,
  BATCH_B_PROGRAMS,
  evaluateBatchBManualPath,
  isBatchBManualProgram,
} from './batchBManualPathEvaluation';
import type { CatalogueInstitution } from '@/types/catalogue';
import {
  BATCH_B_MANUAL_PROGRAM_INSTITUTIONS,
  isBatchBManualProgramId,
} from '@/data/admissions/batchBManualProgramIds';

const institution = (id: string): CatalogueInstitution =>
  ({
    id,
    name: id,
    nameHe: id,
    type: 'college',
    region: 'center',
  }) as unknown as CatalogueInstitution;

describe('Batch B manual path evaluation', () => {
  it('registers a coherent Batch B set', () => {
    expect(BATCH_B_PROGRAM_IDS.length).toBeGreaterThanOrEqual(35);
    expect(BATCH_B_PROGRAM_IDS.length).toBeLessThanOrEqual(50);
    expect(isBatchBManualProgram('ono_nursing', 'ono')).toBe(true);
    expect(isBatchBManualProgram('bezalel_fashion', 'bezalel')).toBe(true);
    expect(isBatchBManualProgram('telhai_cs', 'telhai')).toBe(false);
    expect(isBatchBManualProgram('ariel_nursing', 'ariel')).toBe(false);
    expect(isBatchBManualProgram('biu_socialwork', 'biu')).toBe(false);
  });

  it('keeps client ID map in sync with evaluator registry', () => {
    const registryPairs = [
      ...Object.entries(BATCH_B_PROGRAMS).map(([id, config]) => [id, config.institutionId] as const),
      ['ono_nursing', 'ono'] as const,
    ];
    expect(Object.keys(BATCH_B_MANUAL_PROGRAM_INSTITUTIONS).sort()).toEqual(
      registryPairs.map(([id]) => id).sort(),
    );
    for (const [id, institutionId] of registryPairs) {
      expect(isBatchBManualProgramId(id, institutionId)).toBe(true);
      expect(isBatchBManualProgram(id, institutionId)).toBe(true);
    }
  });

  it.each(Object.entries(BATCH_B_PROGRAMS))(
    '%s returns honest manual_gate without fake score eligibility',
    (degreeId, config) => {
      const result = evaluateBatchBManualPath({
        input: { degreeId, psychometric: 760, bagrut: 110 },
        institution: institution(config.institutionId),
      });
      expect(result).toMatchObject({
        capability: 'manual_gate',
        kind: 'manual_gate',
        decision: 'eligible_to_apply',
      });
      expect(result?.scoreAssessment).toBeUndefined();
      expect(result?.explanation).not.toMatch(/מתואם|סכם|מצרף/);
      expect(result?.explanation).toMatch(/ראיון|תיק|אודישן|מבחן|מיון|ועדה/);
      expect(result?.requiredInputs).toBeUndefined();
    },
  );

  it('portfolio programmes stay honest with weak or missing scores', () => {
    for (const scores of [
      { psychometric: 420, bagrut: 70 },
      { psychometric: undefined, bagrut: undefined },
    ] as const) {
      const result = evaluateBatchBManualPath({
        input: { degreeId: 'bezalel_industrial_design', ...scores },
        institution: institution('bezalel'),
      });
      expect(result).toMatchObject({
        capability: 'manual_gate',
        kind: 'manual_gate',
        decision: 'eligible_to_apply',
      });
      expect(result?.explanation).toContain('תיק עבודות');
    }
  });

  it('ono nursing encodes official floors and keeps interview pending', () => {
    const weak = evaluateBatchBManualPath({
      input: { degreeId: 'ono_nursing', psychometric: 420, bagrut: 70 },
      institution: institution('ono'),
    });
    expect(weak).toMatchObject({
      decision: 'below',
      scoreAssessment: 'below_threshold',
    });

    const strong = evaluateBatchBManualPath({
      input: { degreeId: 'ono_nursing', psychometric: 520, bagrut: 85 },
      institution: institution('ono'),
    });
    expect(strong).toMatchObject({
      capability: 'manual_gate',
      kind: 'manual_gate',
      decision: 'pending',
      scoreAssessment: 'meets_threshold',
    });
    expect(strong?.additionalConditions).toContainEqual(
      expect.objectContaining({ id: 'admissions_committee', status: 'unconfirmed' }),
    );
    expect(strong?.explanation).toContain('ראיון');
    expect(JSON.stringify(strong)).not.toMatch(/מתואם|סכם|מצרף/);
  });

  it('ono nursing transition path clears on bagrut 85 without psych', () => {
    const result = evaluateBatchBManualPath({
      input: { degreeId: 'ono_nursing', bagrut: 85 },
      institution: institution('ono'),
    });
    expect(result).toMatchObject({
      capability: 'manual_gate',
      kind: 'manual_gate',
      decision: 'pending',
      scoreAssessment: 'meets_threshold',
    });
  });

  it('telhai nursing never rubber-stamps seed floors as eligible', () => {
    const result = evaluateBatchBManualPath({
      input: { degreeId: 'telhai_nursing', psychometric: 460, bagrut: 76 },
      institution: institution('telhai'),
    });
    expect(result).toMatchObject({ capability: 'manual_gate', kind: 'manual_gate' });
    expect(result?.scoreAssessment).toBeUndefined();
    expect(result?.decision).not.toBe('accepted');
  });

  it('reichman infosystems never asks for סכם', () => {
    const result = evaluateBatchBManualPath({
      input: { degreeId: 'reichman_infosystems', psychometric: 700, bagrut: 100 },
      institution: institution('reichman'),
    });
    expect(result?.explanation).toContain('ראיון');
    expect(result?.explanation).not.toMatch(/מתואם|סכם|מצרף/);
    expect(result?.requiredInputs).toBeUndefined();
  });
});
