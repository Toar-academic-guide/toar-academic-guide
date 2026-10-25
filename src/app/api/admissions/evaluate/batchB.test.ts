import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { BATCH_B_PROGRAMS } from '@/server/admissions/batchBManualPathEvaluation';
import { resetAdmissionsEvaluationRateLimitForTests } from '@/server/admissions/rateLimit';
import type { AdmissionsEvaluationResult } from '@/types/admissionsEvaluation';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '192.0.2.54' }),
}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: async () => ({ data: getStaticCataloguePrograms() }),
  listCatalogueInstitutions: async () => ({ data: getStaticCatalogueInstitutions() }),
}));
vi.mock('@/db/client', () => ({
  getDb: () => ({ select: () => ({ from: () => ({ where: async () => [] }) }) }),
}));
import { POST } from './route';

const staticIds = new Set(getStaticCataloguePrograms().map((p) => p.id));
const apiTargets = [
  ...Object.entries(BATCH_B_PROGRAMS)
    .filter(([id]) => staticIds.has(id))
    .map(([id, cfg]) => [id, cfg.institutionId] as const),
  ['ono_nursing', 'ono'] as const,
];

describe('Batch B API dispatch', () => {
  beforeEach(() => resetAdmissionsEvaluationRateLimitForTests());

  it.each(apiTargets)('%s returns manual_gate via API for %s', async (degreeId, institutionId) => {
    const response = await POST(
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          degreeId,
          psychometric: degreeId === 'ono_nursing' ? 420 : 560,
          bagrut: degreeId === 'ono_nursing' ? 70 : 95,
        }),
      }),
    );
    expect(response.status).toBe(200);
    const { data } = await response.json();
    const result = data.results.find(
      (row: AdmissionsEvaluationResult) => row.linkedInstitutionId === institutionId,
    );
    expect(result).toBeDefined();
    expect(result.explanation).not.toMatch(/מתואם|סכם|מצרף/);
    expect(result.requiredInputs).toBeUndefined();
    if (degreeId === 'ono_nursing') {
      expect(result.decision).toBe('below');
      expect(result.scoreAssessment).toBe('below_threshold');
    } else {
      expect(result.capability).toBe('manual_gate');
      expect(result.kind).toBe('manual_gate');
      expect(result.decision).toBe('eligible_to_apply');
      expect(result.scoreAssessment).toBeUndefined();
    }
  });

  it('ono nursing strong profile is accepted with an unconfirmed interview', async () => {
    const response = await POST(
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ degreeId: 'ono_nursing', psychometric: 520, bagrut: 85 }),
      }),
    );
    expect(response.status).toBe(200);
    const { data } = await response.json();
    const result = data.results.find(
      (row: AdmissionsEvaluationResult) => row.linkedInstitutionId === 'ono',
    );
    expect(result).toMatchObject({
      capability: 'manual_gate',
      kind: 'manual_gate',
      decision: 'accepted',
      scoreAssessment: 'meets_threshold',
    });
    expect(result.explanation).toContain('לפי הציונים שהזנת');
    expect(result.additionalConditions).toContainEqual(
      expect.objectContaining({
        id: 'admissions_committee',
        label: 'ראיון קבלה',
        status: 'unconfirmed',
      }),
    );
  });

  it('bezalel answers without requiring bagrut or psychometric', async () => {
    const response = await POST(
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ degreeId: 'bezalel_industrial_design' }),
      }),
    );
    expect(response.status).toBe(200);
    const { data } = await response.json();
    const result = data.results.find(
      (row: AdmissionsEvaluationResult) => row.linkedInstitutionId === 'bezalel',
    );
    expect(result).toMatchObject({
      capability: 'manual_gate',
      kind: 'manual_gate',
      decision: 'eligible_to_apply',
    });
    expect(result.requiredInputs).toBeUndefined();
    expect(result.explanation).toContain('תיק עבודות');
  });
});
