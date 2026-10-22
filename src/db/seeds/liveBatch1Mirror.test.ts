import snapshot from '../../../docs/admissions-verification/2026-10-23-live-batch1-snapshot.json';
import { describe, expect, it } from 'vitest';
import { buildCatalogueSeed } from '@/db/seeds/catalogueSeed';

// Production rows were corrected from official pages on 2026-10-23. A reseed must not undo that.
const seed = buildCatalogueSeed();
const pairs = Object.entries(snapshot.pairs);

describe('seed mirrors the live official requirements', () => {
  it.each(pairs)('%s keeps the live requirement text, notes and links', (id, live) => {
    const row = seed.admissionRequirements.find((entry) => entry.id === id);
    expect(row?.admissionRequirements).toEqual(live.admissionRequirements);
    expect(row?.specificAdmissionNotes).toEqual(live.specificAdmissionNotes);
    const urls = Object.fromEntries(
      seed.sourceUrls
        .filter((entry) => entry.admissionRequirementId === id)
        .map((entry) => [entry.kind, entry.url]),
    );
    expect(urls).toMatchObject(live.sourceUrls);
  });

  it.each(pairs)('%s keeps the live calculator facts', (id, live) => {
    const facts = seed.admissionFacts.filter((fact) => fact.admissionRequirementId === id);
    for (const expected of live.admissionFacts) {
      expect(facts.find((fact) => fact.id === expected.id)).toMatchObject(expected);
    }
    // Placeholder gates (for example Ono law bagrut 75) must not come back.
    expect(facts.filter((fact) => !fact.id.includes(':legacy-fact-'))).toHaveLength(
      live.admissionFacts.length,
    );
    expect(
      seed.admissionAlternativePaths
        .filter((path) => path.admissionRequirementId === id)
        .map((path) => path.id),
    ).toEqual(live.admissionAlternativePaths);
  });

  it('leaves the unmanaged Ono psychology and social-work rows to the database', () => {
    const ids = seed.admissionRequirements.map((entry) => entry.id);
    expect(ids).not.toContain('ono_psychology:ono');
    expect(ids).not.toContain('ono_socialwork:ono');
  });
});
