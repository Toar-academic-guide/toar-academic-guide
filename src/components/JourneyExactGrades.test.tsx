// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import JourneyExactGrades from './JourneyExactGrades';
import { SECTORS } from '@/data/bagrutSubjects';

describe('JourneyExactGrades sector selection', () => {
  it('updates untouched starter rows to the selected sector', () => {
    render(<JourneyExactGrades onComplete={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('מגזר'), { target: { value: 'ערבי' } });
    expect(
      screen.getAllByLabelText(/^מקצוע /).map((input) => (input as HTMLInputElement).value),
    ).toEqual(SECTORS['ערבי'].map((subject) => subject.n));
  });

  it('preserves entered grades when the sector changes', () => {
    render(<JourneyExactGrades onComplete={vi.fn()} />);
    const grade = screen.getAllByLabelText(/^ציון /)[0];
    fireEvent.change(grade, { target: { value: '91' } });
    fireEvent.change(screen.getByLabelText('מגזר'), { target: { value: 'ערבי' } });
    expect(screen.getAllByLabelText(/^ציון /)[0]).toHaveProperty('value', '91');
    expect(
      screen.getAllByLabelText(/^מקצוע /).map((input) => (input as HTMLInputElement).value),
    ).toEqual(SECTORS['יהודי'].map((subject) => subject.n));
  });
});
