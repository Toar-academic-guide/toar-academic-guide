export interface PublicationArguments {
  manifestPath: string;
  repositoryCommit: string;
  proofFailureStage?: 'after_attempt_started';
  proofConfirmationId?: string;
}

export function parsePublicationArguments(argv: string[]): PublicationArguments {
  const values = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (
      flag !== '--manifest' &&
      flag !== '--repository-commit' &&
      flag !== '--proof-failure-stage' &&
      flag !== '--proof-confirmation-id'
    ) {
      throw new Error(`Unknown publication argument: ${flag ?? '(missing)'}.`);
    }
    if (!value || value.startsWith('--')) {
      throw new Error(`Publication argument ${flag} requires a value.`);
    }
    if (values.has(flag)) {
      throw new Error(`Publication argument ${flag} may only be provided once.`);
    }
    values.set(flag, value);
  }

  const manifestPath = values.get('--manifest');
  if (!manifestPath) {
    throw new Error('Publication requires --manifest.');
  }
  const repositoryCommit = values.get('--repository-commit');
  if (!repositoryCommit || !/^[a-f0-9]{7,64}$/i.test(repositoryCommit)) {
    throw new Error('Publication requires a full or abbreviated hexadecimal repository commit.');
  }

  const suppliedProofFailureStage = values.get('--proof-failure-stage');
  const proofFailureStage: 'after_attempt_started' | undefined =
    suppliedProofFailureStage === undefined
      ? undefined
      : suppliedProofFailureStage === 'after_attempt_started'
        ? 'after_attempt_started'
        : (() => {
            throw new Error('Unsupported proof failure stage.');
          })();
  const proofConfirmationId = values.get('--proof-confirmation-id');
  if (Boolean(proofFailureStage) !== Boolean(proofConfirmationId)) {
    throw new Error('Proof failure injection requires both a stage and matching confirmation ID.');
  }

  return {
    manifestPath,
    repositoryCommit: repositoryCommit.toLowerCase(),
    ...(proofFailureStage ? { proofFailureStage } : {}),
    ...(proofConfirmationId ? { proofConfirmationId } : {}),
  };
}
