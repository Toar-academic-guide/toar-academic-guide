import { describe, expect, it } from 'vitest';

import {
  evaluateFreshnessDiscovery,
  normalizeDecisionPayload,
  type FreshnessDiscoveryInput,
} from './freshnessDiscovery';

const baseHtml = `
  <html>
    <header>Apply now</header>
    <nav>Admissions homepage | Contact</nav>
    <main>
      <h1>Computer Science admissions</h1>
      <p>Minimum psychometric score: 680.</p>
      <p>Acceptance threshold: 720.</p>
      <p>English requirement: advanced A.</p>
    </main>
    <footer>Updated site footer</footer>
  </html>
`;

function evaluate(input: Omit<FreshnessDiscoveryInput, 'id'>) {
  return evaluateFreshnessDiscovery({ id: 'source-1', ...input });
}

describe('evaluateFreshnessDiscovery', () => {
  it('keeps a stable HTML source on the same normalized fingerprint across two runs', () => {
    const first = evaluate({ sourceClass: 'official_html', body: baseHtml });
    const second = evaluate({
      sourceClass: 'official_html',
      body: baseHtml,
      previousNormalizedFingerprint: first.normalizedFingerprint,
    });

    expect(second.status).toBe('fresh');
    expect(second.reviewWorthy).toBe(false);
    expect(second.normalizedFingerprint).toBe(first.normalizedFingerprint);
  });

  it('marks mocked decision-bearing threshold changes as review-worthy', () => {
    const previous = evaluate({ sourceClass: 'official_html', body: baseHtml });
    const changed = evaluate({
      sourceClass: 'official_html',
      body: baseHtml.replace('Acceptance threshold: 720.', 'Acceptance threshold: 735.'),
      previousNormalizedFingerprint: previous.normalizedFingerprint,
    });

    expect(changed.status).toBe('changed_needs_review');
    expect(changed.reviewWorthy).toBe(true);
    expect(changed.normalizedDecisionPayload).toMatchObject({
      decisionLines: expect.arrayContaining(['Acceptance threshold: 735.']),
    });
  });

  it('ignores navigation and footer changes for HTML normalized fingerprints', () => {
    const previous = evaluate({ sourceClass: 'official_html', body: baseHtml });
    const boilerplateOnlyChange = evaluate({
      sourceClass: 'official_html',
      body: baseHtml
        .replace('Admissions homepage | Contact', 'Admissions homepage | Contact | Events')
        .replace('Updated site footer', 'New marketing footer'),
      previousNormalizedFingerprint: previous.normalizedFingerprint,
    });

    expect(boilerplateOnlyChange.status).toBe('fresh');
    expect(boilerplateOnlyChange.normalizedFingerprint).toBe(previous.normalizedFingerprint);
    expect(boilerplateOnlyChange.rawFingerprint).not.toBe(previous.rawFingerprint);
    expect(boilerplateOnlyChange.ignoredNoise).toContain('header/nav/footer markup');
  });

  it('classifies browser-required sources as blocked without failing the run', () => {
    const result = evaluate({
      sourceClass: 'browser_required',
      body: '',
      blockedReason: 'Radware cookies require a persistent browser profile',
    });

    expect(result.status).toBe('blocked');
    expect(result.capability).toBe('blocked');
    expect(result.reviewWorthy).toBe(false);
    expect(result.blockedReason).toBe('Radware cookies require a persistent browser profile');
  });

  it('keeps score-only calculators separate from decision-capable calculators', () => {
    const previous = evaluate({
      sourceClass: 'score_only_calculator',
      body: { score: 714 },
    });
    const changedScore = evaluate({
      sourceClass: 'score_only_calculator',
      body: { score: 718 },
      previousNormalizedFingerprint: previous.normalizedFingerprint,
    });

    expect(changedScore.status).toBe('changed_needs_review');
    expect(changedScore.capability).toBe('score_only');
    expect(changedScore.reviewWorthy).toBe(false);
    expect(changedScore.normalizedDecisionPayload).toMatchObject({
      scoreOnly: true,
      fields: { score: 718 },
    });
  });
});

describe('normalizeDecisionPayload', () => {
  it('normalizes API/static JSON by keeping decision-bearing fields and sorting keys', () => {
    const normalized = normalizeDecisionPayload('api_static_json', {
      uiLabel: 'Homepage tab',
      programs: [
        {
          name: 'Computer Science',
          threshold: 720,
          rejectionCutoff: 690,
          marketingCopy: 'Join us',
        },
      ],
    });

    expect(normalized).toEqual({
      fields: {
        programs: [
          {
            rejectionCutoff: 690,
            threshold: 720,
          },
        ],
      },
    });
  });

  it('normalizes PDF text into decision lines', () => {
    const normalized = normalizeDecisionPayload(
      'pdf_text',
      'Page 1\nAdmissions guide\nMinimum bagrut average: 95.\nPage 2\nCampus map.\n',
    );

    expect(normalized).toEqual({
      decisionLines: ['Minimum bagrut average: 95.'],
    });
  });
});
