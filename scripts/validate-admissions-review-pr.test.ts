import { describe, expect, it } from 'vitest';

import { validateRunKey, validateManifestValue } from './validate-admissions-review-pr.mjs';

const bootstrapManifest = {
  version: 2,
  releaseKind: 'canonical_bootstrap',
  changes: [{}],
};

describe('review PR manifest validation', () => {
  it('allows stable proof ids only for operational-proof manifests', () => {
    expect(() => validateRunKey('2026-W39', bootstrapManifest)).not.toThrow();
    expect(() =>
      validateRunKey('proof-plan001-20260820', {
        ...bootstrapManifest,
        releaseKind: 'operational_proof',
      }),
    ).not.toThrow();
    expect(() => validateRunKey('proof-plan001-20260820', bootstrapManifest)).toThrow(
      'Usage: validate-admissions-review-pr --run-key YYYY-Www or stable-proof-id',
    );
    expect(() =>
      validateRunKey('proof plan 001', {
        ...bootstrapManifest,
        releaseKind: 'operational_proof',
      }),
    ).toThrow('Usage: validate-admissions-review-pr --run-key YYYY-Www or stable-proof-id');
  });

  it('accepts the reviewed manifest version emitted by bootstrap and change runs', () => {
    expect(() => validateManifestValue(bootstrapManifest)).not.toThrow();
    expect(() =>
      validateManifestValue({ ...bootstrapManifest, releaseKind: 'canonical_change' }),
    ).not.toThrow();
  });

  it('rejects the legacy manifest version, unknown release kinds, and empty changes', () => {
    expect(() => validateManifestValue({ ...bootstrapManifest, version: 1 })).toThrow();
    expect(() =>
      validateManifestValue({ ...bootstrapManifest, releaseKind: 'unexpected' }),
    ).toThrow();
    expect(() => validateManifestValue({ ...bootstrapManifest, changes: [] })).toThrow();
  });
});
