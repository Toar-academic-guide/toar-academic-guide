// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HaifaQualificationFields from './HaifaQualificationFields';

describe('HaifaQualificationFields filtered mode', () => {
  it('shows only requested inputs without the default questionnaire or helper copy', () => {
    const onChange = vi.fn();
    const { container } = render(
      <HaifaQualificationFields
        values={{}}
        onChange={onChange}
        disabled={false}
        inputClassName="text-right"
        visibleKeys={['haifaHebrewQualification']}
        compact
      />,
    );
    const qualification = screen.getByLabelText('הבסיס לעמידה בדרישת העברית בחיפה');
    expect(container.querySelectorAll('input, select')).toHaveLength(1);
    expect(container.querySelector('details')).toBeNull();
    expect(container.querySelector('p')).toBeNull();
    fireEvent.change(qualification, { target: { value: 'hebrew_school' } });
    expect(onChange).toHaveBeenCalledWith('haifaHebrewQualification', 'hebrew_school');
  });

  it('honours explicitly requested score and date without adding other fields', () => {
    render(
      <HaifaQualificationFields
        values={{}}
        onChange={vi.fn()}
        disabled={false}
        inputClassName="text-right"
        visibleKeys={['haifaHebrewScore', 'haifaHebrewExamDate']}
        compact
      />,
    );
    expect(screen.getByLabelText('ציון מבחן העברית בחיפה')).toBeTruthy();
    expect(screen.getByLabelText('תאריך מבחן העברית בחיפה')).toBeTruthy();
    expect(screen.queryByLabelText('הבסיס לעמידה בדרישת העברית בחיפה')).toBeNull();
  });

  it('preserves the default disclosure and hides Hebrew test details until applicable', () => {
    const { container } = render(
      <HaifaQualificationFields
        values={{}}
        onChange={vi.fn()}
        disabled={false}
        inputClassName="text-right"
      />,
    );
    expect(container.querySelector('details')).not.toBeNull();
    expect(screen.getByLabelText('מסלול מערכות מידע בחיפה')).toBeTruthy();
    expect(screen.queryByLabelText('ציון מבחן העברית בחיפה')).toBeNull();
  });
});
