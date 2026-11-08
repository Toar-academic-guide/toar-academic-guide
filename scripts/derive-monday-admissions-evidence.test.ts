import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, it } from 'vitest';

it('removes the escaped hyphen while retaining the technology college mapping', () => {
  const directory = mkdtempSync(join(tmpdir(), 'monday-evidence-name-'));
  const input = join(directory, 'input.json');
  const output = join(directory, 'evidence.ts');

  try {
    writeFileSync(
      input,
      JSON.stringify({
        schema: 'toar/monday-admissions-updates-export.v1',
        exportedAt: '2026-11-08T00:00:00Z',
        board: { id: 'test', name: 'test', url: 'https://example.org', updatedAt: '' },
        summary: { updateCount: 0, itemsAtUpdateLimit: [] },
        items: [
          {
            id: '12341091743',
            name: '54. המכללה למינהל\\- רשת מכללות הנדסאים',
            url: 'https://example.org/item',
            columns: [],
            updates: [],
            evidence: {
              capabilityCandidate: 'eligible_with_manual_gate',
              urls: ['https://college.org.il/'],
            },
          },
        ],
      }),
    );

    execFileSync(
      process.execPath,
      [
        'scripts/derive-monday-admissions-evidence.mjs',
        '--input', input,
        '--overrides', join(directory, 'none.json'),
        '--ts-out', output,
        '--summary-out', join(directory, 'summary.md'),
        '--missing-rules-out', join(directory, 'missing.md'),
      ],
      { cwd: process.cwd() },
    );

    const generated = readFileSync(output, 'utf8');
    expect(generated).toContain('displayName: "המכללה למינהל - רשת מכללות הנדסאים"');
    expect(generated).toContain('catalogueInstitutionId: "tech_management"');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
