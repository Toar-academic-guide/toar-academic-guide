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

  const psychologyNotes = getStaticCataloguePrograms().find(
    (program) => program.id === 'bgu_psychology',
  )!.institutionDetails![0].specificAdmissionNotes;

  it('separates Psychology AND, OR and no-psychometric routes without losing shared conditions', () => {
    const { container } = render(
      <AdmissionRequirements
        programId="bgu_psychology"
        institutionId="bgu"
        requirements={psychologyNotes}
      />,
    );
    const bullets = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(bullets[0]).toBe('שני התנאים יחד: סכם 650 לפחות וגם פסיכומטרי 650 לפחות');
    expect(bullets[1]).toBe('לחלופין: סכם 680 לפחות או פסיכומטרי 680 לפחות');
    expect(bullets[2]).toBe(
      'ללא פסיכומטרי: ממוצע בגרות 113 לפחות או מכינה למדעים מדויקים והנדסה או למדעי הטבע והחיים של בן־גוריון בממוצע 94 לפחות',
    );
    expect(screen.getByText(psychologyNotes[2])).toBeTruthy();
    expect(container.querySelector('details')?.open).toBe(false);
    expect(container.querySelector('details')?.textContent).toContain(psychologyNotes[3]);
    expect(container.querySelector('details')?.textContent).toContain(psychologyNotes[4]);
  });

  it('does not show old route scores for another institution or updated requirements', () => {
    const { rerender } = render(
      <AdmissionRequirements
        programId="bgu_psychology"
        institutionId="tau"
        requirements={psychologyNotes}
      />,
    );
    expect(screen.queryByText(/שני התנאים יחד/)).toBeNull();
    rerender(
      <AdmissionRequirements
        programId="bgu_psychology"
        institutionId="bgu"
        requirements={[psychologyNotes[0].replaceAll('650', '660'), ...psychologyNotes.slice(1)]}
      />,
    );
    expect(screen.queryByText(/שני התנאים יחד/)).toBeNull();
    expect(screen.getAllByRole('listitem')[0].textContent).toContain('660');
  });

  it('puts an explicitly named additional route in its own bullet, preserving AND and OR', () => {
    render(<AdmissionRequirements requirements={[psychologyNotes[0]]} />);
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'סכם 650 לפחות וגם פסיכומטרי 650 לפחות.',
      'אפיק נוסף: סכם 680 לפחות או פסיכומטרי 680 לפחות.',
    ]);
  });
});
