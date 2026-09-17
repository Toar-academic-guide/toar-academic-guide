// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StudyLocationStep from './StudyLocationStep';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';

const programs = [
  {
    id: 'technion-cs',
    name: 'מדעי המחשב',
    institution: 'הטכניון – מכון טכנולוגי לישראל',
    institutionId: 'technion',
    admissionType: 'sekhem',
    type: 'academic',
    category: 'מדעי המחשב',
    profileScore: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 2, OR: 3, DI: 5, ER: 3 },
    admissionRequirements: [],
    linkedInstitutionIds: ['technion'],
  },
  {
    id: 'bgu-cs',
    name: 'מדעי המחשב',
    institution: 'אוניברסיטת בן-גוריון בנגב',
    institutionId: 'bgu',
    admissionType: 'sekhem',
    type: 'academic',
    category: 'מדעי המחשב',
    profileScore: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 2, OR: 3, DI: 5, ER: 3 },
    admissionRequirements: [],
    linkedInstitutionIds: ['bgu'],
  },
] satisfies CatalogueProgram[];

const institutions = [
  {
    id: 'technion',
    name: 'הטכניון – מכון טכנולוגי לישראל',
    region: 'north',
    domain: 'technion.ac.il',
  },
  {
    id: 'bgu',
    name: 'אוניברסיטת בן-גוריון בנגב',
    region: 'south',
    domain: 'bgu.ac.il',
  },
] satisfies CatalogueInstitution[];

function renderStep(onDone = vi.fn()) {
  render(
    <StudyLocationStep
      programs={programs}
      savedProgramIds={['technion-cs', 'bgu-cs']}
      catalogueInstitutions={institutions}
      onDone={onDone}
    />,
  );

  return onDone;
}

describe('StudyLocationStep', () => {
  it('selects multiple specific regions and continues with their ids', () => {
    const onDone = renderStep();

    fireEvent.click(screen.getByText('גליל, עמקים וקמפוסים קרובים לטבע').closest('button')!);
    fireEvent.click(screen.getByText('נגב, מרחב וקמפוסים עם אופי קהילתי').closest('button')!);
    fireEvent.click(screen.getByRole('button', { name: /המשך לבחירת מוסדות/ }));

    expect(onDone).toHaveBeenCalledWith({ allRegions: false, regionIds: ['north', 'south'] });
  });

  it('clears specific regions when choosing all regions', () => {
    const onDone = renderStep();

    fireEvent.click(
      screen.getAllByText('עירוניות, תחבורה ומבחר גדול של מוסדות')[0].closest('button')!,
    );
    fireEvent.click(screen.getByRole('button', { name: /לא משנה לי איפה/ }));
    fireEvent.click(screen.getByRole('button', { name: /המשך לבחירת מוסדות/ }));

    expect(onDone).toHaveBeenCalledWith({ allRegions: true, regionIds: [] });
  });

  it('turns off all-regions mode when a map region is selected', () => {
    const onDone = renderStep();

    fireEvent.click(screen.getByRole('button', { name: /לא משנה לי איפה/ }));
    fireEvent.click(screen.getByRole('button', { name: 'בחר אזור דרום' }));
    fireEvent.click(screen.getByRole('button', { name: /המשך לבחירת מוסדות/ }));

    expect(onDone).toHaveBeenCalledWith({ allRegions: false, regionIds: ['south'] });
  });
});
