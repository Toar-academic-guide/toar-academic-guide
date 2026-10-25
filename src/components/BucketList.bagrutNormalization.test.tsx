// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BucketList from './BucketList';
import { academicPrograms } from '@/data/degrees/academicPrograms';
import { UNIVERSITIES } from '@/data/degreesData';
import { getStaticCatalogueInstitutions } from '@/lib/catalogueStatic';

const { analyze } = vi.hoisted(() => ({ analyze: vi.fn() }));
vi.mock('@/utils/bucketListEngine', () => ({ analyzeBucketList: analyze }));
vi.mock('@/components/InstitutionLogo', () => ({ default: () => null }));
afterEach(cleanup);

describe('BucketList without a published composite', () => {
  it.each(['qualified', 'gap', 'no-data'])(
    'hides the full score/threshold line when %s has null sekhem',
    (status) => {
      const fixture = academicPrograms.find((entry) => entry.id === 'bgu_ee');
      if (!fixture) throw new Error('Missing bgu_ee fixture');
      analyze.mockReturnValue([{ program: fixture, status, sekhem: null, threshold: 547 }]);
      render(
        <BucketList
          programs={[fixture]}
          calculatorInstitutions={UNIVERSITIES}
          catalogueInstitutions={getStaticCatalogueInstitutions()}
          savedProgramIds={[fixture.id]}
          academicScores={{ psychometric: { overall: 590 }, bagrut: { weightedAverage: 120 } }}
          onRemove={vi.fn()}
          onBack={vi.fn()}
        />,
      );
      expect(screen.getByText(fixture.name, { selector: 'p' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'הסר מהרשימה' })).toBeTruthy();
      expect(screen.queryByText(/\/\s*≥/)).toBeNull();
      expect(screen.queryByText(/547/)).toBeNull();
      expect(screen.queryByText('בדקו תנאי קבלה')).toBeNull();
      expect(screen.queryByText('ממתין לציונים')).toBeNull();
      // No replacement copy: the card's badge cluster contains only Remove.
      const remove = screen.getByRole('button', { name: 'הסר מהרשימה' });
      expect(remove.parentElement?.textContent).toBe('');
      expect(remove.parentElement?.querySelectorAll('span')).toHaveLength(0);
    },
  );
});
