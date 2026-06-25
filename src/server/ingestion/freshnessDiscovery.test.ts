import { describe, expect, it } from 'vitest';

import { evaluateFreshnessDiscovery } from './freshnessDiscovery';

describe('evaluateFreshnessDiscovery', () => {
  it('normalizes official HTML by ignoring boilerplate and tracking decision lines', () => {
    const result = evaluateFreshnessDiscovery({
      id: 'official-html',
      sourceClass: 'official_html',
      body: `
        <header>Admissions news</header>
        <main>
          <p>Minimum psychometric score: 680.</p>
          <p>Acceptance threshold: 720.</p>
        </main>
        <footer>Campaign 2026</footer>
      `,
    });

    expect(result.status).toBe('fresh');
    expect(result.capability).toBe('decision_capable');
    expect(result.normalizedDecisionPayload).toEqual({
      decisionLines: ['Acceptance threshold: 720.', 'Minimum psychometric score: 680.'],
    });
    expect(result.ignoredNoise).toContain('header/nav/footer markup');
  });

  it('marks changed decision-capable fingerprints as review-worthy', () => {
    const first = evaluateFreshnessDiscovery({
      id: 'api-json',
      sourceClass: 'api_static_json',
      body: { threshold: 720, generatedAt: 'ignored' },
    });

    const second = evaluateFreshnessDiscovery({
      id: 'api-json',
      sourceClass: 'api_static_json',
      body: { threshold: 730, generatedAt: 'ignored' },
      previousNormalizedFingerprint: first.normalizedFingerprint,
    });

    expect(second.status).toBe('changed_needs_review');
    expect(second.reviewWorthy).toBe(true);
  });

  it('tracks score-only changes without making them review-worthy for acceptance', () => {
    const first = evaluateFreshnessDiscovery({
      id: 'score-only',
      sourceClass: 'score_only_calculator',
      body: { score: 714 },
    });

    const second = evaluateFreshnessDiscovery({
      id: 'score-only',
      sourceClass: 'score_only_calculator',
      body: { score: 720 },
      previousNormalizedFingerprint: first.normalizedFingerprint,
    });

    expect(second.status).toBe('changed_needs_review');
    expect(second.capability).toBe('score_only');
    expect(second.reviewWorthy).toBe(false);
  });

  it('classifies browser-required sources as blocked without source fetching', () => {
    const result = evaluateFreshnessDiscovery({
      id: 'blocked',
      sourceClass: 'browser_required',
      body: '',
      blockedReason: 'Radware/browser session required',
    });

    expect(result.status).toBe('blocked');
    expect(result.capability).toBe('blocked');
    expect(result.reviewWorthy).toBe(false);
    expect(result.blockedReason).toBe('Radware/browser session required');
  });
});
