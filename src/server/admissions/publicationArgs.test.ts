import { describe, expect, it } from 'vitest';

import { parsePublicationArguments } from './publicationArgs';

describe('publication command arguments', () => {
  it('accepts an exact manifest path and merged commit', () => {
    expect(
      parsePublicationArguments([
        '--manifest',
        'src/data/admissions/reviewedManifest.json',
        '--repository-commit',
        '0123456789abcdef',
      ]),
    ).toEqual({
      manifestPath: 'src/data/admissions/reviewedManifest.json',
      repositoryCommit: '0123456789abcdef',
    });
  });

  it('rejects missing values, unknown flags, and untrusted commit identifiers', () => {
    expect(() => parsePublicationArguments([])).toThrow(/--manifest/i);
    expect(() =>
      parsePublicationArguments(['--manifest', 'manifest.json', '--repository-commit', 'main']),
    ).toThrow(/commit/i);
    expect(() =>
      parsePublicationArguments([
        '--manifest',
        'manifest.json',
        '--repository-commit',
        '0123456',
        '--unexpected',
      ]),
    ).toThrow(/unknown/i);
  });

  it('allows only the explicit controlled proof fault option', () => {
    expect(
      parsePublicationArguments([
        '--manifest',
        'src/data/admissions/reviewedManifest.json',
        '--repository-commit',
        '0123456789abcdef',
        '--proof-failure-stage',
        'after_attempt_started',
        '--proof-confirmation-id',
        'proof-plan001-20260820',
      ]),
    ).toMatchObject({
      proofFailureStage: 'after_attempt_started',
      proofConfirmationId: 'proof-plan001-20260820',
    });
    expect(() =>
      parsePublicationArguments([
        '--manifest',
        'src/data/admissions/reviewedManifest.json',
        '--repository-commit',
        '0123456789abcdef',
        '--proof-failure-stage',
        'after_attempt_started',
      ]),
    ).toThrow(/confirmation/i);
  });
});
