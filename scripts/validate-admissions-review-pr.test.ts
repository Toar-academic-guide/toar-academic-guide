import { describe, expect, it } from 'vitest';

import { validateManifestValue } from './validate-admissions-review-pr.mjs';

const bootstrapManifest = {
  version: 2,
  releaseKind: 'canonical_bootstrap',
  changes: [{}],
};

describe('review PR manifest validation', () => {
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
