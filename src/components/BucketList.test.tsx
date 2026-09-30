// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BucketList from './BucketList';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import type { StudyRegionId } from '@/data/studyRegions';

vi.mock('@/components/InstitutionLogo', () => ({ default: () => null }));
afterEach(cleanup);

const institutions = getStaticCatalogueInstitutions().filter((item) =>
  ['tau', 'technion', 'huji', 'bgu'].includes(item.id),
);
const programs = institutions.map((institution) => ({
  ...getStaticCataloguePrograms()[0],
  id: `${institution.id}-test`,
  institutionId: institution.id,
  institution: institution.name,
}));

function showRegions(initialRegions: StudyRegionId[]) {
  const onRegionsChange = vi.fn();
  render(
    <BucketList
      programs={programs}
      calculatorInstitutions={[]}
      catalogueInstitutions={institutions}
      savedProgramIds={programs.map((program) => program.id)}
      initialRegions={initialRegions}
      onRegionsChange={onRegionsChange}
      onRemove={vi.fn()}
      onBack={vi.fn()}
    />,
  );
  return onRegionsChange;
}

describe('saved-program study-region continuation', () => {
  it.each(['center', 'haifa', 'jerusalem', 'south'] as const)(
    'applies the initial %s selection instead of showing every institution',
    (region) => {
      showRegions([region]);
      // Hebrew University has Jerusalem and Rehovot campuses in the directory.
      expect(screen.getByText(`מציג ${region === 'center' ? 2 : 1} מתוך 4`)).toBeTruthy();
      expect(screen.getByRole('button', { name: 'נקה סינון' })).toBeTruthy();
    },
  );

  it('combines selected regions and notifies when the filter is cleared', () => {
    const changed = showRegions(['haifa', 'south']);
    expect(screen.getByText('מציג 2 מתוך 4')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'נקה סינון' }));
    expect(screen.getByText('מציג 4 מתוך 4')).toBeTruthy();
    expect(changed).toHaveBeenCalledWith([]);
  });

  it('shows all institutions for an unrestricted selection', () => {
    showRegions([]);
    expect(screen.getByText('מציג 4 מתוך 4')).toBeTruthy();
  });
});
