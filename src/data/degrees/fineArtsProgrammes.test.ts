import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/env', () => ({ getCatalogueSourceMode: () => 'static' }));
vi.mock('@/db/client', () => ({
  getDb: () => {
    throw new Error('No database in the fine arts regression');
  },
}));
import { allPrograms } from './index';
import { fineArtsProgrammes } from './fineArtsProgrammes';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { evaluateAdmissionsForProgram } from '@/server/admissions/evaluator';
import { getPublicSubjectHub } from '@/lib/publicCatalogueLinks';
import { buildProgramMetadata } from '@/lib/seo/metadata';
import guide from '../fineArtsGuide.json';

it('keeps the three sourced programmes distinct and in the existing fine-arts hub', async () => {
  expect(fineArtsProgrammes.map(({ id }) => id)).toEqual([
    'haifa_fine_arts',
    'shenkar_fine_arts',
    'tau_multidisciplinary_arts',
  ]);
  const hub = await getPublicSubjectHub('fine_arts');
  expect(hub?.hub.programs.map(({ id }) => id).sort()).toEqual(
    ['bezalel_fine_arts', 'minshar_fine_arts', ...fineArtsProgrammes.map(({ id }) => id)].sort(),
  );
  const metadata = await buildProgramMetadata('fine_arts');
  expect(metadata.title).toBe(guide.title);
  expect(metadata.description).toBe(guide.description);
  expect(metadata.alternates?.canonical).toBe('/programs/fine_arts');
  const bezalel = allPrograms.find(({ id }) => id === 'bezalel_fine_arts')!;
  expect(bezalel.admissionRequirements.join(' ')).toContain('תרגילי בית');
  expect(bezalel.admissionRequirements.join(' ')).not.toContain('מבחן כניסה');
  expect(bezalel.admissionRequirements.join(' ')).toContain('20.1.2027');
  expect(
    allPrograms.find(({ id }) => id === 'minshar_fine_arts')!.admissionRequirements.join(' '),
  ).toContain('הקבלה אינה מותנית בתעודת בגרות; מעל גיל 18');
});

it.each(fineArtsProgrammes.map(({ id }) => id))(
  'does not turn %s display requirements into an admissions verdict',
  async (id) => {
    const program = getStaticCataloguePrograms().find((candidate) => candidate.id === id)!;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error('No live source calls in this test'));
    const report = await evaluateAdmissionsForProgram({
      program,
      institutions: getStaticCatalogueInstitutions(),
      input: { degreeId: id, bagrut: 100, psychometric: 650 },
      now: new Date('2026-11-23T12:00:00Z'),
      freshnessStatesBySourceId: new Map(),
      fetcher,
    });
    expect(report.results).toHaveLength(1);
    expect(report.results[0]).toMatchObject({
      kind: 'requirements_only',
      decision: 'unknown',
      confidence: 'medium',
    });
    expect(report.results[0].score).toBeUndefined();
    expect(report.results[0].threshold).toBeUndefined();
    expect(report.results[0].explanation).not.toMatch(
      /אין צורך בבגרות|אין צורך בפסיכומטרי|ראיון קבלה חובה|הגשת תיק עבודות חובה/,
    );
    expect(fetcher).not.toHaveBeenCalled();
  },
);
