export interface PublicationArguments {
  manifestPath: string;
  repositoryCommit: string;
}

export function parsePublicationArguments(argv: string[]): PublicationArguments {
  const values = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag !== '--manifest' && flag !== '--repository-commit') {
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

  return { manifestPath, repositoryCommit: repositoryCommit.toLowerCase() };
}
