// @vitest-environment jsdom

import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
    expect(screen.getByLabelText('יחידות 2')).toHaveProperty('value', '5');
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
