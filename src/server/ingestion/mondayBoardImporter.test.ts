import { describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import { parseMondayAdmissionsData } from './mondayBoardImporter';

describe('mondayBoardImporter', () => {
  it('successfully parses mock raw board data into source candidates, facts, and alternative paths', () => {
    const mockData = [
      {
        id: '12345',
        name: 'אוניברסיטת רייכמן',
        column_values: [
          {
            id: 'link_mm44f8t0',
            text: 'מחשבון סכם',
            value: JSON.stringify({ url: 'https://runi.ac.il/calculator' }),
          },
          {
            id: 'long_text_mm44b0qm',
            text: 'דרישות',
            value: JSON.stringify({ text: 'תיק עבודות חובה' }),
          },
          {
            id: 'long_text_mm46nsp6',
            text: 'מכינה',
            value: JSON.stringify({ text: 'יש מכינה קדם אקדמית מצוינת במסלול מובנה של 9 חודשים' }),
          },
        ],
        updates: [
          {
            id: 'update1',
            body: 'ממוצע בגרות 100+ ופסיכומטרי 600+ ללימודי מדעי המחשב',
            created_at: '2026-06-10T20:25:53.457Z',
          },
        ],
      },
    ];

    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockData));

    const result = parseMondayAdmissionsData('mock_path.json');

    expect(result.sourceCandidates.length).toBe(1);
    const reichmanCandidate = result.sourceCandidates.find((c) => c.institutionId === 'reichman');
    expect(reichmanCandidate).toBeDefined();
    expect(reichmanCandidate?.url).toBe('https://runi.ac.il/calculator');
    expect(reichmanCandidate?.programId).toBe('cs'); // Resolved dynamically to 'cs' via regex match of CS

    expect(result.facts.length).toBeGreaterThan(0);
    const psychometricFact = result.facts.find((f) => f.field === 'psychometric');
    expect(psychometricFact?.valueNumber).toBe(600);

    expect(result.alternativePaths.length).toBe(1);
    expect(result.alternativePaths[0].title).toBe('מכינה קדם-אקדמית');

    vi.restoreAllMocks();
  });
});
