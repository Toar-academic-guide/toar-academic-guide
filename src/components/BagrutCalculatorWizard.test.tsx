// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import BagrutCalculatorWizard from './BagrutCalculatorWizard';

describe('BagrutCalculatorWizard', () => {
  it('emits the explicit certificate facts in a schema-v2 record', () => {
    const onStructuredComplete = vi.fn();
    render(
      <BagrutCalculatorWizard onComplete={vi.fn()} onStructuredComplete={onStructuredComplete} />,
    );

    fireEvent.change(screen.getByLabelText('סוג תעודת הבגרות'), {
      target: { value: 'external_1977_or_later' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'המשך למקצועות חובה ←' }));
    for (const input of screen.getAllByLabelText(/^ציון /)) {
      fireEvent.change(input, { target: { value: '80' } });
    }
    fireEvent.change(screen.getByLabelText('ציון מתמטיקה'), { target: { value: '90' } });
    fireEvent.click(screen.getByRole('button', { name: 'המשך למקצועות בחירה ←' }));
    fireEvent.click(screen.getByLabelText('הזנתי את כל המקצועות שמופיעים בתעודת הבגרות'));
    fireEvent.click(screen.getByRole('button', { name: 'חשב ממוצע בגרות ←' }));
    fireEvent.click(screen.getByRole('button', { name: 'השתמש/י באומדן זה ←' }));

    expect(onStructuredComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaVersion: 2,
        certificateType: 'external_1977_or_later',
        complete: true,
        subjects: expect.arrayContaining([
          expect.objectContaining({ subjectId: 'mathematics', assessmentKind: 'exam' }),
        ]),
      }),
    );
  });

  it('lets a student distinguish an additional final project from the subject exam', () => {
    render(<BagrutCalculatorWizard onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'המשך למקצועות חובה ←' }));
    fireEvent.click(screen.getByRole('button', { name: 'הוסף עבודת גמר במתמטיקה' }));
    fireEvent.click(screen.getByRole('button', { name: 'המשך למקצועות בחירה ←' }));

    expect(screen.getByLabelText('סוג הערכה מתמטיקה 1')).toHaveProperty('value', 'final_project');
  });

  it('invalidates a calculated record after an academic input changes', () => {
    const onStructuredComplete = vi.fn();
    render(
      <BagrutCalculatorWizard onComplete={vi.fn()} onStructuredComplete={onStructuredComplete} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'המשך למקצועות חובה ←' }));
    fireEvent.change(screen.getByLabelText('ציון מתמטיקה'), { target: { value: '90' } });
    fireEvent.click(screen.getByRole('button', { name: 'המשך למקצועות בחירה ←' }));
    fireEvent.click(screen.getByRole('button', { name: 'חשב ממוצע בגרות ←' }));
    fireEvent.click(screen.getByText('חובה'));
    fireEvent.change(screen.getByLabelText('ציון מתמטיקה'), { target: { value: '91' } });

    expect(screen.getByRole('button', { name: '4' })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByText('תוצאה'));
    expect(screen.queryByText('אומדן ממוצע הציונים שלך')).toBeNull();
    expect(onStructuredComplete).not.toHaveBeenCalled();
  });
});
