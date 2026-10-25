// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BucketList from './BucketList';
import { academicPrograms } from '@/data/degrees/academicPrograms';
import { UNIVERSITIES } from '@/data/degreesData';
import { getStaticCatalogueInstitutions } from '@/lib/catalogueStatic';

const { analyze } = vi.hoisted(() => ({ analyze: vi.fn() }));
vi.mock('@/utils/bucketListEngine', () => ({ analyzeBucketList: analyze }));
vi.mock('@/components/InstitutionLogo', () => ({ default: () => null }));

describe('BucketList without a published composite', () => {
  it.each(['qualified', 'gap'])(
    'hides the full score/threshold line when %s has null sekhem',
    (status) => {
      const fixture = academicPrograms.find((entry) => entry.id === 'bgu_ee');
      if (!fixture) throw new Error('Missing bgu_ee fixture');
      // An untyped module mock exercises the proposed nullable consumer contract
      // without lying to TypeScript about today's number-only BucketEntry type.
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
    },
  );
});
