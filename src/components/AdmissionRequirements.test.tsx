// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AdmissionRequirements from './AdmissionRequirements';
import { getStaticCataloguePrograms } from '@/lib/catalogueStatic';

describe('AdmissionRequirements', () => {
  const requirements = getStaticCataloguePrograms().find(
    (program) => program.id === 'communication',
  )!.institutionDetails![0].specificAdmissionNotes;

  it('keeps the complete TAU conditions behind a closed disclosure and emphasizes scores', () => {
    const { container } = render(
      <AdmissionRequirements
        requirements={requirements}
        programId="communication"
        institutionId="tau"
      />,
    );
    const disclosure = container.querySelector('details')!;
    expect(disclosure.open).toBe(false);
    expect([...disclosure.querySelectorAll('li')].map((li) => li.textContent)).toEqual(
      requirements,
    );
    expect(
      [...container.querySelectorAll('strong')].map((element) => element.textContent),
    ).toContain('102');
    expect(screen.getByText('אחד מאפיקי הקבלה:')).toBeTruthy();
  });

  it('does not reuse TAU summaries for another institution or changed source conditions', () => {
    const { rerender, container } = render(
      <AdmissionRequirements
        requirements={requirements}
        programId="communication"
        institutionId="bgu"
      />,
    );
    expect(screen.queryByText('אחד מאפיקי הקבלה:')).toBeNull();
    rerender(
      <AdmissionRequirements
        requirements={['בגרות 105 לפחות']}
        programId="communication"
        institutionId="tau"
      />,
    );
    expect(container.textContent).toBe('בגרות 105 לפחות');
    expect(container.querySelector('details')).toBeNull();
  });

  it('preserves all conditions and their order for other programmes', () => {
    const notes = ['בגרות מלאה', 'פסיכומטרי 600 לפחות', 'מתמטיקה 5 יחידות', 'ריאיון אישי'];
    const { container } = render(<AdmissionRequirements requirements={notes} />);
    expect([...container.querySelectorAll('li')].map((li) => li.textContent)).toEqual(notes);
    expect(container.querySelector('details')?.textContent).toContain('ריאיון אישי');
  });
});
