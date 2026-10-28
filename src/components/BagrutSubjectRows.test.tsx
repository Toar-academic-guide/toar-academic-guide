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
