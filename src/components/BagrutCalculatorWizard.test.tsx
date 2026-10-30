// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react';
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
    for (const units of screen.getAllByLabelText(/^יחידות /)) {
      fireEvent.change(units, { target: { value: '5' } });
    }
    for (const input of screen.getAllByLabelText(/^ציון /)) {
      fireEvent.change(input, { target: { value: '80' } });
    }
    fireEvent.change(screen.getByLabelText('יחידות מתמטיקה'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('ציון מתמטיקה'), { target: { value: '90' } });
    fireEvent.click(screen.getByRole('button', { name: 'המשך למקצועות בחירה ←' }));
    expect(screen.queryByLabelText(/הזנתי את כל המקצועות/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'הצג רשימה מלאה' }));
    fireEvent.click(screen.getByRole('button', { name: 'כימיה' }));
    fireEvent.change(screen.getByLabelText('יחידות כימיה 1'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('ציון כימיה 1'), { target: { value: '85' } });
    fireEvent.click(screen.getByRole('button', { name: 'חשב ממוצע בגרות ←' }));
    fireEvent.click(screen.getByRole('button', { name: 'השתמש/י באומדן זה ←' }));

    expect(onStructuredComplete.mock.calls[0][0].subjects).toHaveLength(8);
    expect(
      onStructuredComplete.mock.calls[0][0].subjects.every(
        (row: { assessmentKind: string }) => row.assessmentKind === 'exam',
      ),
    ).toBe(true);
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

  it('uses empty sector-aware units selects and text grades without final-project controls', () => {
    render(<BagrutCalculatorWizard onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'המשך למקצועות חובה ←' }));
    expect(screen.queryByRole('button', { name: /עבודת גמר/ })).toBeNull();
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0);
    for (const name of ['אנגלית', 'מתמטיקה']) {
      const units = screen.getByRole('combobox', { name: `יחידות ${name}` }) as HTMLSelectElement;
      expect(units.value).toBe('');
      expect(Array.from(units.options, (o) => o.value)).toEqual(['', '3', '4', '5']);
    }
    expect(screen.getAllByText('יחידות')).toHaveLength(7);
    expect(screen.getAllByText('ציונים')).toHaveLength(7);
    const grade = screen.getByRole('textbox', { name: 'ציון מתמטיקה' });
    expect(grade.getAttribute('inputmode')).toBe('numeric');
    fireEvent.click(screen.getByRole('button', { name: 'המשך למקצועות בחירה ←' }));
    fireEvent.click(screen.getByRole('button', { name: 'הצג רשימה מלאה' }));
    fireEvent.click(screen.getByRole('button', { name: 'כימיה' }));
    const units = screen.getByRole('combobox', { name: 'יחידות כימיה 1' }) as HTMLSelectElement;
    expect(units.value).toBe('');
    expect(Array.from(units.options, (o) => o.value)).toEqual(['', '1', '2', '3', '4', '5']);
    expect(within(units).queryByRole('option', { name: '10' })).toBeNull();
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0);
    expect(screen.queryByLabelText(/סוג הערכה/)).toBeNull();
    expect(screen.queryByText('גמר +')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('invalidates a calculated record after an academic input changes', () => {
    const onStructuredComplete = vi.fn();
    render(
      <BagrutCalculatorWizard onComplete={vi.fn()} onStructuredComplete={onStructuredComplete} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'המשך למקצועות חובה ←' }));
    fireEvent.change(screen.getByLabelText('יחידות מתמטיקה'), { target: { value: '5' } });
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

it.each(['abc', '90.5', '101'])(
  'ignores a grade %s and missing units in the estimate and counters',
  (invalid) => {
    const onStructuredComplete = vi.fn();
    render(
      <BagrutCalculatorWizard onComplete={vi.fn()} onStructuredComplete={onStructuredComplete} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'המשך למקצועות חובה ←' }));
    fireEvent.change(screen.getByLabelText('יחידות מתמטיקה'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('ציון מתמטיקה'), { target: { value: '90' } });
    fireEvent.change(screen.getByLabelText('יחידות אנגלית'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('ציון אנגלית'), { target: { value: invalid } });
    fireEvent.change(screen.getByLabelText('ציון אזרחות'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'המשך למקצועות בחירה ←' }));
    fireEvent.click(screen.getByRole('button', { name: 'חשב ממוצע בגרות ←' }));
    expect(screen.getByText('90.0')).toBeTruthy();
    expect(screen.getByText('יחידות לימוד').previousElementSibling?.textContent).toBe('5');
    expect(screen.getByText('מקצועות חובה').previousElementSibling?.textContent).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: 'השתמש/י באומדן זה ←' }));
    expect(onStructuredComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        complete: false,
        subjects: [{ subjectId: 'mathematics', units: 5, grade: 90, assessmentKind: 'exam' }],
      }),
    );
  },
);
