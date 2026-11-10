import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import manifest from '@/server/admissions/__fixtures__/reviewedManifest-2026-10-29-bgu.json';
import { bguQuantitativeProgramme } from '@/server/admissions/bguQuantitativeRoutesPolicy';

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
  ['business', 590, 620, 'business', 'p_dep1=142&p_pat1=1&p_spe1=1'],
  ['bgu_business', 590, 620, 'business', 'p_dep1=142&p_pat1=1&p_spe1=1'],
  ['economics', 615, 620, 'economics', 'p_dep1=142&p_pat1=3'],
  ['bgu_economics', 615, 620, 'economics', 'p_dep1=142&p_pat1=3'],
  ['communication', 590, 520, 'communication', 'p_dep1=183&p_pat1=2'],
] as const;

const supportedManifest = {
  ...manifest,
  changes: manifest.changes
    .filter(({ target }) => target.programId !== 'bgu_biology')
    .map((change) => {
      if (change.target.programId === 'communication') return change;
      const config = bguQuantitativeProgramme(change.target.programId)!;
      const sourceDir = 'docs/admissions-verification/evidence/2026-10-29-bgu-cutoffs-business';
      const source = JSON.parse(
        readFileSync(`${sourceDir}/official-${config.family}.json`, 'utf8'),
      );
      const item = source.items[0];
      const headers = readFileSync(`${sourceDir}/official-${config.family}.headers`, 'utf8');
      const status = Number(headers.match(/^HTTP\/1\.1 (\d{3})/m)?.[1]);
      const mainExcerpt = `סכם כמותי ${change.after}`;
      if (!item.comments.includes(mainExcerpt) || status !== 200) {
        throw new Error(`Archived ${config.family} source lacks the main cutoff or HTTP 200`);
      }
      return {
        ...change,
        sourceProofs: change.sourceProofs.map((proof) => ({
          ...proof,
          cutoffEvidence: {
            value: change.after,
            metric: 'quantitative_sekhem',
            route: 'main',
            cycle: change.target.cycle,
            programPath: config.officialProgramId,
            registrationStatus: item.reg_status,
            prerequisites: `psychometric minimum ${item.psycho_value}; ${item.psycho_info}`,
            sourceUrl: proof.url,
            sourceStatus: status,
            sourceExcerpt: mainExcerpt,
          },
        })),
      };
    }),
};

describe('2026-10-29 BGU canonical cutoff release', () => {
  it('rejects the archived biology psychometric sekem as a quantitative cutoff', () => {
    expect(() => parseReviewedAdmissionsManifest(manifest)).toThrow(
      'Canonical cutoff needs matching main-route',
    );
  });

  it('contains the six supported changes with reproducible exact official proofs', () => {
    const parsed = parseReviewedAdmissionsManifest(supportedManifest);
    expect(parsed.releaseKind).toBe('canonical_change');
    expect(Object.keys(supportedManifest).sort()).toEqual(['changes', 'releaseKind', 'version']);
    expect(parsed.changes).toHaveLength(6);
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
            ...(family === 'communication'
              ? {}
              : {
                  cutoffEvidence: expect.objectContaining({
                    value: after,
                    metric: 'quantitative_sekhem',
                    route: 'main',
                    cycle: '2027',
                    sourceStatus: 200,
                    sourceExcerpt: `סכם כמותי ${after}`,
                  }),
                }),
          },
        ],
      });
    }
  });

  it('publishes six supported cutoff rows and release items once in memory', async () => {
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
    const input = { manifest: supportedManifest, repositoryCommit: 'bgu-cutoffs-2026-10-29' };
    await expect(publisher.publish(input)).resolves.toMatchObject({
      status: 'published',
      alreadyApplied: [],
    });
    await expect(publisher.publish(input)).resolves.toMatchObject({ status: 'already_published' });
    expect(releases).toHaveLength(1);
    expect(transitions).toHaveLength(6);
    expect(items).toHaveLength(6);
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
