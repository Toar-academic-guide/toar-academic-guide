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

describe('JourneyExactGrades blank rows', () => {
  const labels = () =>
    screen
      .getAllByLabelText(/^מקצוע /)
      .filter((element) => element.tagName === 'INPUT')
      .map((input) => (input as HTMLInputElement).value);
  const field = (label: string) =>
    screen.getByLabelText(label, { selector: 'input' }) as HTMLInputElement;
  const rowNumber = (label: string) => labels().indexOf(label) + 1;
  const fillRow = (index: number, units: string, grade: string) => {
    fireEvent.change(field(`יחידות ${index}`), { target: { value: units } });
    fireEvent.change(field(`ציון ${index}`), { target: { value: grade } });
  };
  const fillMathAndEnglish = () => {
    fireEvent.change(screen.getByLabelText('סוג תעודה'), { target: { value: 'internal' } });
    fillRow(rowNumber('מתמטיקה'), '5', '90');
    fillRow(rowNumber('אנגלית'), '5', '85');
  };
  const submit = () => fireEvent.click(screen.getByRole('button', { name: 'המשך' }));

  it('submits when the untouched starter rows are left blank and sends only filled rows', () => {
    const onComplete = vi.fn();
    render(<JourneyExactGrades onComplete={onComplete} />);
    fillMathAndEnglish();

    expect(screen.getByRole('button', { name: 'המשך' }).closest('form')!.checkValidity()).toBe(
      true,
    );
    submit();

    expect(screen.queryByRole('alert')).toBeNull();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({
      sector: 'jewish',
      certificateType: 'internal',
      subjects: [
        { subjectId: 'english', units: 5, grade: 85, assessmentKind: 'exam' },
        { subjectId: 'mathematics', units: 5, grade: 90, assessmentKind: 'exam' },
      ],
    });
  });

  it('ignores an added row left completely empty', () => {
    const onComplete = vi.fn();
    render(<JourneyExactGrades onComplete={onComplete} />);
    fillMathAndEnglish();
    fireEvent.click(screen.getByRole('button', { name: /הוספת מקצוע/ }));
    submit();

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0].subjects).toHaveLength(2);
  });

  it('still requires a grade on a row with a subject the student entered', () => {
    const onComplete = vi.fn();
    render(<JourneyExactGrades onComplete={onComplete} />);
    fillMathAndEnglish();
    fireEvent.click(screen.getByRole('button', { name: /הוספת מקצוע/ }));
    const added = labels().length;
    fireEvent.change(field(`מקצוע ${added}`), { target: { value: 'פיזיקה' } });

    expect(field(`ציון ${added}`).required).toBe(true);
    expect(field(`ציון ${added}`).validity.valid).toBe(false);
    submit();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('still requires a grade on a starter row whose units were changed', () => {
    const onComplete = vi.fn();
    render(<JourneyExactGrades onComplete={onComplete} />);
    fillMathAndEnglish();
    const history = rowNumber('אזרחות');
    fireEvent.change(field(`יחידות ${history}`), { target: { value: '2' } });

    expect(field(`ציון ${history}`).validity.valid).toBe(false);
    submit();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('still requires a subject on a row with only a grade', () => {
    const onComplete = vi.fn();
    render(<JourneyExactGrades onComplete={onComplete} />);
    fillMathAndEnglish();
    fireEvent.click(screen.getByRole('button', { name: /הוספת מקצוע/ }));
    const added = labels().length;
    fireEvent.change(field(`ציון ${added}`), { target: { value: '80' } });

    expect(field(`מקצוע ${added}`).validity.valid).toBe(false);
    submit();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('shows the existing message when every row is blank', () => {
    const onComplete = vi.fn();
    render(<JourneyExactGrades onComplete={onComplete} />);
    fireEvent.change(screen.getByLabelText('סוג תעודה'), { target: { value: 'internal' } });
    fireEvent.submit(screen.getByRole('button', { name: 'המשך' }).closest('form')!);

    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe(
      'יש להשלים את המקצוע, היחידות והציון בכל שורה ולוודא שאין כפילויות.',
    );
  });
});
