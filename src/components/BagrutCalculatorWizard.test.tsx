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
    fireEvent.click(screen.getByRole('button', { name: 'המשיכו למקצועות חובה ←' }));
    for (const units of screen.getAllByLabelText(/^יחידות /)) {
      fireEvent.change(units, { target: { value: '5' } });
    }
    for (const input of screen.getAllByLabelText(/^ציון /)) {
      fireEvent.change(input, { target: { value: '80' } });
    }
    fireEvent.change(screen.getByLabelText('יחידות מתמטיקה'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('ציון מתמטיקה'), { target: { value: '90' } });
    fireEvent.click(screen.getByRole('button', { name: 'המשיכו למקצועות בחירה ←' }));
    expect(screen.queryByLabelText(/הזנתי את כל המקצועות/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'הציגו רשימה מלאה' }));
    fireEvent.click(screen.getByRole('button', { name: 'כימיה' }));
    fireEvent.change(screen.getByLabelText('יחידות כימיה 1'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('ציון כימיה 1'), { target: { value: '85' } });
    fireEvent.click(screen.getByRole('button', { name: 'חשבו ממוצע בגרות ←' }));
    fireEvent.click(screen.getByRole('button', { name: 'השתמשו באומדן זה ←' }));

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
    fireEvent.click(screen.getByRole('button', { name: 'המשיכו למקצועות חובה ←' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'המשיכו למקצועות בחירה ←' }));
    fireEvent.click(screen.getByRole('button', { name: 'הציגו רשימה מלאה' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'המשיכו למקצועות חובה ←' }));
    fireEvent.change(screen.getByLabelText('יחידות מתמטיקה'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('ציון מתמטיקה'), { target: { value: '90' } });
    fireEvent.click(screen.getByRole('button', { name: 'המשיכו למקצועות בחירה ←' }));
    fireEvent.click(screen.getByRole('button', { name: 'חשבו ממוצע בגרות ←' }));
    fireEvent.click(screen.getByText('חובה'));
    fireEvent.change(screen.getByLabelText('ציון מתמטיקה'), { target: { value: '91' } });

    expect(screen.getByRole('button', { name: '4' })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByText('תוצאה'));
    expect(screen.queryByText('אומדן ממוצע הציונים שלכם')).toBeNull();
    expect(onStructuredComplete).not.toHaveBeenCalled();
  });
});

it.each(['abc', '90.5', '101'])(
  'blocks invalid grade %s and ignores missing units after correction',
  (invalid) => {
    const onStructuredComplete = vi.fn();
    render(
      <BagrutCalculatorWizard onComplete={vi.fn()} onStructuredComplete={onStructuredComplete} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'המשיכו למקצועות חובה ←' }));
    fireEvent.change(screen.getByLabelText('יחידות מתמטיקה'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('ציון מתמטיקה'), { target: { value: '90' } });
    fireEvent.change(screen.getByLabelText('יחידות אנגלית'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('ציון אנגלית'), { target: { value: invalid } });
    fireEvent.change(screen.getByLabelText('ציון אזרחות'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'המשיכו למקצועות בחירה ←' }));
    fireEvent.click(screen.getByRole('button', { name: 'חשבו ממוצע בגרות ←' }));
    expect(screen.queryByText('אומדן ממוצע הציונים שלכם')).toBeNull();
    expect(onStructuredComplete).not.toHaveBeenCalled();
    expect(screen.getByLabelText('ציון אנגלית')).toHaveProperty('value', invalid);
    expect(screen.getByText('ציון בין 0 ל-100')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('ציון אנגלית'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'המשיכו למקצועות בחירה ←' }));
    fireEvent.click(screen.getByRole('button', { name: 'חשבו ממוצע בגרות ←' }));
    expect(screen.getByText('90.0')).toBeTruthy();
    expect(screen.getByText('יחידות לימוד').previousElementSibling?.textContent).toBe('5');
    expect(screen.getByText('מקצועות חובה').previousElementSibling?.textContent).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: 'השתמשו באומדן זה ←' }));
    expect(onStructuredComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        complete: false,
        subjects: [{ subjectId: 'mathematics', units: 5, grade: 90, assessmentKind: 'exam' }],
      }),
    );
  },
);

it.each(
  ['8.5', '-3', '85a', ' 90', '101'].flatMap((raw) =>
    ['mandatory', 'elective'].map((kind) => [kind, raw]),
  ),
)('preserves %s grade %j and blocks calculation until corrected', (kind, raw) => {
  const onStructuredComplete = vi.fn();
  render(
    <BagrutCalculatorWizard onComplete={vi.fn()} onStructuredComplete={onStructuredComplete} />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'המשיכו למקצועות חובה ←' }));
  fireEvent.change(screen.getByLabelText('יחידות מתמטיקה'), { target: { value: '5' } });
  fireEvent.change(screen.getByLabelText('ציון מתמטיקה'), { target: { value: '90' } });
  if (kind === 'elective') {
    fireEvent.click(screen.getByRole('button', { name: 'המשיכו למקצועות בחירה ←' }));
    fireEvent.click(screen.getByRole('button', { name: 'הציגו רשימה מלאה' }));
    fireEvent.click(screen.getByRole('button', { name: 'כימיה' }));
    fireEvent.change(screen.getByLabelText('יחידות כימיה 1'), { target: { value: '5' } });
  }
  const label = kind === 'mandatory' ? 'ציון מתמטיקה' : 'ציון כימיה 1';
  let grade = screen.getByLabelText(label) as HTMLInputElement;
  fireEvent.change(grade, { target: { value: '' } });
  for (let length = 1; length <= raw.length; length++) {
    const value = raw.slice(0, length);
    fireEvent.change(grade, { target: { value } });
    expect(grade.value).toBe(value);
  }
  expect(grade.getAttribute('aria-invalid')).toBe('true');
  expect(screen.getByText('ציון בין 0 ל-100').id).toBe(grade.getAttribute('aria-describedby'));
  if (kind === 'mandatory')
    fireEvent.click(screen.getByRole('button', { name: 'המשיכו למקצועות בחירה ←' }));
  fireEvent.click(screen.getByRole('button', { name: 'חשבו ממוצע בגרות ←' }));
  expect(screen.queryByText('אומדן ממוצע הציונים שלכם')).toBeNull();
  expect(onStructuredComplete).not.toHaveBeenCalled();
  grade = screen.getByLabelText(label) as HTMLInputElement;
  expect(grade.value).toBe(raw);
  fireEvent.change(grade, { target: { value: '85' } });
  expect(screen.queryByText('ציון בין 0 ל-100')).toBeNull();
  if (kind === 'mandatory')
    fireEvent.click(screen.getByRole('button', { name: 'המשיכו למקצועות בחירה ←' }));
  fireEvent.click(screen.getByRole('button', { name: 'חשבו ממוצע בגרות ←' }));
  fireEvent.click(screen.getByRole('button', { name: 'השתמשו באומדן זה ←' }));
  expect(onStructuredComplete).toHaveBeenCalledTimes(1);
  expect(onStructuredComplete.mock.calls[0][0].subjects).toContainEqual({
    subjectId: kind === 'mandatory' ? 'mathematics' : 'chemistry',
    units: 5,
    grade: 85,
    assessmentKind: 'exam',
  });
});
