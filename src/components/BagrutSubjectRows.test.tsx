// @vitest-environment jsdom

import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { buildBagrutSubjectRecord } from '@/utils/bagrutSubjectRecord';
import BagrutSubjectRows from './BagrutSubjectRows';
import type { BagrutWizardSubjectInput } from '@/utils/bagrutSubjectRecord';

function SubjectRows() {
  const [rows, setRows] = useState<BagrutWizardSubjectInput[]>([
    { label: 'מתמטיקה', units: 5, grade: 90, assessmentKind: 'exam' },
  ]);
  return <BagrutSubjectRows rows={rows} onChange={setRows} />;
}

describe('BagrutSubjectRows', () => {
  it('edits the raw subject, units and grade, adds a row and removes it', () => {
    render(<SubjectRows />);
    fireEvent.change(screen.getByLabelText('מקצוע 1'), { target: { value: 'פיזיקה' } });
    fireEvent.change(screen.getByLabelText('יחידות 1'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('ציון 1'), { target: { value: '87' } });
    expect(screen.getByLabelText('מקצוע 1')).toHaveProperty('value', 'פיזיקה');
    expect(screen.getByLabelText('יחידות 1')).toHaveProperty('value', '4');
    expect(screen.getByLabelText('ציון 1')).toHaveProperty('value', '87');

    fireEvent.click(screen.getByRole('button', { name: /הוספת מקצוע/ }));
    expect(screen.getByLabelText('מקצוע 2')).toHaveProperty('value', '');
    // Approved test update, Jorje 2026-10-30
    expect(screen.getByLabelText('יחידות 2')).toHaveProperty('value', '2');
    fireEvent.click(screen.getByRole('button', { name: 'הסרת מקצוע 1' }));
    expect(screen.queryByLabelText('מקצוע 2')).toBeNull();
    expect(screen.getByLabelText('מקצוע 1')).toHaveProperty('value', '');
  });

  it('keeps a cleared numeric value empty and offers the existing subject list', () => {
    render(<SubjectRows />);
    fireEvent.change(screen.getByLabelText('יחידות 1'), { target: { value: '' } });
    expect(screen.getByLabelText('יחידות 1')).toHaveProperty('value', '');
    const input = screen.getByLabelText('מקצוע 1') as HTMLInputElement;
    const suggestions = document.getElementById(input.getAttribute('list')!);
    expect(suggestions?.querySelector('option[value="מתמטיקה"]')).not.toBeNull();
    expect(suggestions?.querySelector('option[value="אנגלית"]')).not.toBeNull();
  });
});

it('associates supplied field errors with their numeric inputs', () => {
  const props = { fieldErrors: [{ units: 'יחידות בין 1 ל-5', grade: 'ציון בין 0 ל-100' }] };
  const { rerender } = render(
    <BagrutSubjectRows
      rows={[{ label: 'מתמטיקה', units: 6, grade: 101, assessmentKind: 'exam' }]}
      onChange={() => {}}
      {...props}
    />,
  );
  const ids: string[] = [];
  for (const [label, message] of [
    ['יחידות 1', props.fieldErrors[0].units],
    ['ציון 1', props.fieldErrors[0].grade],
  ]) {
    const input = screen.getByLabelText(label);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const id = input.getAttribute('aria-describedby')!;
    ids.push(id);
    expect(document.getElementById(id)?.textContent).toBe(message);
  }
  expect(new Set(ids).size).toBe(2);
  rerender(
    <BagrutSubjectRows
      rows={[{ label: 'מתמטיקה', units: 5, grade: 100, assessmentKind: 'exam' }]}
      onChange={() => {}}
    />,
  );
  expect(screen.getByLabelText('ציון 1').hasAttribute('aria-invalid')).toBe(false);
  expect(screen.getByLabelText('יחידות 1').hasAttribute('aria-describedby')).toBe(false);
});

it('renders field messages in one full-width row after the invalid subject row', () => {
  render(
    <BagrutSubjectRows
      rows={[
        { label: 'מתמטיקה', units: 6, grade: 130, assessmentKind: 'exam' },
        { label: 'אנגלית', units: 5, grade: 95, assessmentKind: 'exam' },
      ]}
      onChange={() => {}}
      fieldErrors={[{ units: 'יחידות בין 1 ל-5', grade: 'ציון בין 0 ל-100' }]}
    />,
  );
  const inputRow = screen.getByLabelText('מקצוע 1').closest('tr');
  const unitsMessage = screen.getByText('יחידות בין 1 ל-5');
  const gradeMessage = screen.getByText('ציון בין 0 ל-100');
  const errorRow = unitsMessage.closest('tr');
  expect(errorRow).not.toBe(inputRow);
  expect(errorRow?.previousElementSibling).toBe(inputRow);
  expect(errorRow?.nextElementSibling).toBe(screen.getByLabelText('מקצוע 2').closest('tr'));
  expect(errorRow?.querySelectorAll('td')).toHaveLength(1);
  expect(unitsMessage.closest('td')?.colSpan).toBe(4);
  expect(gradeMessage.closest('tr')).toBe(errorRow);
  for (const [label, message] of [
    ['יחידות 1', unitsMessage],
    ['ציון 1', gradeMessage],
  ] as const) {
    expect(screen.getByLabelText(label).getAttribute('aria-describedby')).toBe(message.id);
    expect(screen.getByLabelText(label).getAttribute('aria-invalid')).toBe('true');
  }
});

it('uses plural headings, default units with a clearable choice and a text grade without spinners', () => {
  render(<SubjectRows />);
  for (const name of ['מקצועות', 'יחידות', 'ציונים']) {
    expect(screen.getByRole('columnheader', { name })).toBeTruthy();
  }
  expect(screen.queryAllByRole('spinbutton')).toHaveLength(0);
  const grade = screen.getByRole('textbox', { name: 'ציון 1' });
  expect(grade.getAttribute('type')).toBe('text');
  expect(grade.getAttribute('inputmode')).toBe('numeric');
  fireEvent.click(screen.getByRole('button', { name: /הוספת מקצוע/ }));
  const units = screen.getByRole('combobox', { name: 'יחידות 2' });
  // Approved test update, Jorje 2026-10-30
  expect(units).toHaveProperty('value', '2');
  fireEvent.change(units, { target: { value: '' } });
  expect(within(units).getByRole('option', { name: 'בחירה' })).toHaveProperty('selected', true);
});

it.each([
  ['אנגלית', 'יהודי', ['', '3', '4', '5']],
  ['מתמטיקה', 'יהודי', ['', '3', '4', '5']],
  ['כימיה', 'יהודי', ['', '1', '2', '3', '4', '5']],
  ['עברית', 'ערבי', ['', '3', '4', '5']],
  ['עברית', 'יהודי', ['', '1', '2', '3', '4', '5']],
])('offers only the units for %s in %s', (label, sector, expected) => {
  render(
    <BagrutSubjectRows
      sector={sector}
      rows={[{ label, units: '', grade: '', assessmentKind: 'exam' }]}
      onChange={() => {}}
    />,
  );
  const units = screen.getByRole('combobox', { name: 'יחידות 1' }) as HTMLSelectElement;
  expect(Array.from(units.options, (option) => option.value)).toEqual(expected);
  expect(within(units).queryByRole('option', { name: '10' })).toBeNull();
});

it.each([2, 10])('preserves stored out-of-list units %s as the selected option', (units) => {
  render(
    <BagrutSubjectRows
      rows={[{ label: 'אנגלית', units, grade: 90, assessmentKind: 'exam' }]}
      onChange={() => {}}
    />,
  );
  const select = screen.getByRole('combobox', { name: 'יחידות 1' });
  expect(select).toHaveProperty('value', String(units));
  expect(within(select).getByRole('option', { name: String(units) })).toHaveProperty(
    'selected',
    true,
  );
});

it.each(['abc', '90.5', '1e2', '-1', '101'])(
  'keeps invalid grade %s rejected by record validation',
  (value) => {
    let rows: BagrutWizardSubjectInput[] = [];
    render(
      <BagrutSubjectRows
        rows={[{ label: 'אנגלית', units: 5, grade: '', assessmentKind: 'exam' }]}
        onChange={(next) => {
          rows = next;
        }}
      />,
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'ציון 1' }), { target: { value } });
    expect(
      buildBagrutSubjectRecord({ sectorLabel: 'יהודי', complete: true, subjects: rows }),
    ).toMatchObject({ complete: false, subjects: [] });
  },
);

it.each(['8.5', '-3', '85a', ' 90', '101'])(
  'preserves raw grade %j while blocking invalid input and allows correction',
  (raw) => {
    render(<SubjectRows />);
    const grade = screen.getByRole('textbox', { name: 'ציון 1' }) as HTMLInputElement;
    fireEvent.change(grade, { target: { value: '' } });
    for (let length = 1; length <= raw.length; length++) {
      const value = raw.slice(0, length);
      fireEvent.change(grade, { target: { value } });
      expect(grade.value).toBe(value);
    }
    expect(grade.checkValidity()).toBe(false);
    expect(grade.validationMessage).toBe('ציון בין 0 ל-100');
    expect(grade.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('ציון בין 0 ל-100').id).toBe(grade.getAttribute('aria-describedby'));
    fireEvent.change(grade, { target: { value: '90' } });
    expect(grade.value).toBe('90');
    expect(grade.checkValidity()).toBe(true);
    expect(screen.queryByText('ציון בין 0 ל-100')).toBeNull();
    fireEvent.change(grade, { target: { value: '' } });
    expect(grade.required).toBe(true);
    expect(grade.validity.valueMissing).toBe(true);
  },
);

describe('new-row defaults in shared rows', () => {
  function NewRows() {
    const [rows, setRows] = useState<BagrutWizardSubjectInput[]>([]);
    return <BagrutSubjectRows rows={rows} onChange={setRows} />;
  }

  it('starts an empty added row at 2 and recomputes defaults as its label is typed', () => {
    render(<NewRows />);
    fireEvent.click(screen.getByRole('button', { name: /הוספת מקצוע/ }));
    const units = screen.getByLabelText('יחידות 1');
    expect(units).toHaveProperty('value', '2');
    for (const [label, value] of [
      ['כימיה', '2'],
      ['אנגלית', '3'],
      ['מתמטיקה', '3'],
      ['כימיה', '2'],
    ]) {
      fireEvent.change(screen.getByLabelText('מקצוע 1'), { target: { value: label } });
      expect(units).toHaveProperty('value', value);
    }
  });

  it.each(['4', ''])('preserves explicitly chosen units %j across label edits', (value) => {
    render(<NewRows />);
    fireEvent.click(screen.getByRole('button', { name: /הוספת מקצוע/ }));
    fireEvent.change(screen.getByLabelText('יחידות 1'), { target: { value } });
    fireEvent.change(screen.getByLabelText('מקצוע 1'), { target: { value: 'אנגלית' } });
    expect(screen.getByLabelText('יחידות 1')).toHaveProperty('value', value);
    expect(
      within(screen.getByLabelText('יחידות 1')).getByRole('option', { name: 'בחירה' }),
    ).toBeTruthy();
  });

  it('keeps unit ownership with the row when an earlier row is removed', () => {
    render(<NewRows />);
    const add = screen.getByRole('button', { name: /הוספת מקצוע/ });
    fireEvent.click(add);
    fireEvent.click(add);
    fireEvent.change(screen.getByLabelText('יחידות 1'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'הסרת מקצוע 1' }));
    fireEvent.change(screen.getByLabelText('מקצוע 1'), { target: { value: 'אנגלית' } });
    expect(screen.getByLabelText('יחידות 1')).toHaveProperty('value', '3');
  });
});
