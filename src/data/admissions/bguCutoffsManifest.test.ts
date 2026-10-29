import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import manifest from './reviewedManifest.json';

vi.mock('server-only', () => ({}));

import { parseReviewedAdmissionsManifest } from '@/server/admissions/reviewedManifest';
import {
  createAdmissionsReleasePublisher,
  type AdmissionReleaseItemRecord,
  type AdmissionReleaseRecord,
  type AdmissionTargetTransitionRecord,
  type AdmissionsReleaseWriter,
} from '@/server/admissions/admissionsReleasePublisher';

const approved = [
  ['bgu_accounting', 610, 620, 'accounting', 'p_dep1=142&p_pat1=1&p_spe1=6'],
  ['bgu_biology', 610, 585, 'biology', 'p_dep1=205&p_pat1=15'],
  ['business', 590, 620, 'business', 'p_dep1=142&p_pat1=1&p_spe1=1'],
  ['bgu_business', 590, 620, 'business', 'p_dep1=142&p_pat1=1&p_spe1=1'],
  ['economics', 615, 620, 'economics', 'p_dep1=142&p_pat1=3'],
  ['bgu_economics', 615, 620, 'economics', 'p_dep1=142&p_pat1=3'],
  ['communication', 590, 520, 'communication', 'p_dep1=183&p_pat1=2'],
] as const;

describe('2026-10-29 BGU canonical cutoff release', () => {
  it('contains exactly the seven approved changes with reproducible exact official proofs', () => {
    const parsed = parseReviewedAdmissionsManifest(manifest);
    expect(parsed.releaseKind).toBe('canonical_change');
    expect(Object.keys(manifest).sort()).toEqual(['changes', 'releaseKind', 'version']);
    expect(parsed.changes).toHaveLength(7);
    expect(
      parsed.changes.map(({ target, before, after }) => [target.programId, before, after]),
    ).toEqual(approved.map(([programId, before, after]) => [programId, before, after]));
    expect(
      parsed.changes.some(({ target }) => ['accounting', 'biology'].includes(target.programId)),
    ).toBe(false);

    for (const [programId, before, after, family, params] of approved) {
      const change = parsed.changes.find(({ target }) => target.programId === programId)!;
      const raw = readFileSync(
        `docs/admissions-verification/evidence/2026-10-29-bgu-cutoffs-business/official-${family}.json`,
      );
      expect(change).toEqual({
        target: { institutionId: 'bgu', programId, cycle: '2027' },
        ruleKind: 'admission_cutoff',
        before,
        after,
        effectiveFrom: '2026-10-29',
        sourceProofs: [
          {
            sourceId: `bgu-${programId}-live`,
            digest: `sha256:${createHash('sha256').update(raw).digest('hex')}`,
            excerpt: expect.stringContaining(String(after)),
            url: `https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_year=2027&p_semester=1&p_institution=0&${params}&p_degree_level=1`,
            proofType: 'exact_official',
          },
        ],
      });
    }
  });

  it('publishes seven cutoff rows and release items once in memory', async () => {
    const cutoffs = new Map<string, number>(approved.map(([id, before]) => [`bgu:${id}`, before]));
    const releases: AdmissionReleaseRecord[] = [];
    const transitions: AdmissionTargetTransitionRecord[] = [];
    const items: AdmissionReleaseItemRecord[] = [];
    const writer: AdmissionsReleaseWriter = {
      findReleaseByManifestDigest: async (digest) =>
        releases.find((release) => release.manifestDigest === digest) ?? null,
      createRelease: async (release) => {
        releases.push(release);
      },
      createPublicationAttempt: vi.fn(),
      createTargetTransition: async (transition) => {
        transitions.push(transition);
      },
      createReleaseItems: async (created) => {
        items.push(...created);
      },
      applyCanonicalAdmissionCutoff: async ({ change }) => {
        const key = `${change.target.institutionId}:${change.target.programId}`;
        if (cutoffs.get(key) !== change.before) throw new Error('Unexpected before value');
        cutoffs.set(key, change.after);
        return 'applied';
      },
      applyOperationalProofAdmissionCutoff: async () => {
        throw new Error('Canonical release only');
      },
      markReleasePending: vi.fn(),
      markReleasePublished: async (id, publishedAt) => {
        Object.assign(
          releases.find((release) => release.id === id)!,
          { status: 'published', publishedAt },
        );
      },
      markReleaseFailed: vi.fn(),
      markPublicationAttemptSucceeded: vi.fn(),
      markPublicationAttemptFailed: vi.fn(),
    };
    const publisher = createAdmissionsReleasePublisher({
      transaction: async (callback) => callback(writer),
    });
    const input = { manifest, repositoryCommit: 'bgu-cutoffs-2026-10-29' };
    await expect(publisher.publish(input)).resolves.toMatchObject({
      status: 'published',
      alreadyApplied: [],
    });
    await expect(publisher.publish(input)).resolves.toMatchObject({ status: 'already_published' });
    expect(releases).toHaveLength(1);
    expect(transitions).toHaveLength(7);
    expect(items).toHaveLength(7);
    for (const [programId, before, after] of approved) {
      expect(cutoffs.get(`bgu:${programId}`)).toBe(after);
      const transition = transitions.find((row) => row.programId === programId)!;
      expect(transition).toMatchObject({ institutionId: 'bgu', cycle: '2027' });
      expect(items.find((row) => row.transitionId === transition.id)).toMatchObject({
        beforeValue: { value: before },
        afterValue: { value: after },
        effectiveFrom: '2026-10-29',
        sourceProofs: [expect.objectContaining({ proofType: 'exact_official' })],
      });
    }
  });
});
