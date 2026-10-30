// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import JourneyExactGrades from './JourneyExactGrades';
import { SECTORS } from '@/data/bagrutSubjects';
import {
  calculateOptimizedBagrutAverage,
  calculateBguBagrutAverage,
  calculateTauBagrutAverage,
} from '@/server/admissions/bagrutPolicies';

vi.mock('@/lib/bagrutPdf', () => ({
  readBagrutPdf: vi.fn(async () => [{ label: 'אנגלית', units: 5, grade: 90 }]),
}));

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
    screen.getByLabelText(label, { selector: 'input, select' }) as
      HTMLInputElement | HTMLSelectElement;
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
  const submit = () => fireEvent.click(screen.getByRole('button', { name: 'המשיכו' }));

  it('starts compulsory one-unit-minimum subjects empty and keeps clearing a units field empty', () => {
    render(<JourneyExactGrades onComplete={vi.fn()} />);
    for (const subject of ['תנ״ך', 'ספרות', 'הבעה עברית', 'היסטוריה / תע״י', 'אזרחות']) {
      expect(field(`יחידות ${rowNumber(subject)}`).value).toBe('');
    }
    expect(field(`יחידות ${rowNumber('מתמטיקה')}`).value).toBe('3');
    const civics = field(`יחידות ${rowNumber('אזרחות')}`);
    fireEvent.change(civics, { target: { value: '2' } });
    fireEvent.change(civics, { target: { value: '' } });
    expect(civics.value).toBe('');
  });

  it('keeps the average unchanged when compulsory rows are left blank', () => {
    const onComplete = vi.fn();
    render(<JourneyExactGrades onComplete={onComplete} />);
    fillMathAndEnglish();
    const compulsory = ['תנ״ך', 'ספרות', 'הבעה עברית', 'היסטוריה / תע״י', 'אזרחות'];
    for (const subject of compulsory) expect(field(`יחידות ${rowNumber(subject)}`).value).toBe('');
    submit();
    const withBlankRows = onComplete.mock.calls[0][0];
    for (let index = labels().length; index >= 1; index--) {
      if (compulsory.includes(labels()[index - 1])) {
        fireEvent.click(screen.getByRole('button', { name: `הסרת מקצוע ${index}` }));
      }
    }
    submit();
    const withoutBlankRows = onComplete.mock.calls[1][0];
    expect(withBlankRows).toEqual(withoutBlankRows);
    const policy = {
      id: 'ux-blank-rows',
      version: 'test',
      sourceUrl: 'https://example.edu/policy',
      recordSchemaVersion: 2 as const,
      requiredSubjectIds: ['english', 'mathematics'],
      optionalSubjectIds: [],
      subjectBonuses: [],
      dropOptionalSubjectsWhenAverageImproves: false,
    };
    const average = calculateOptimizedBagrutAverage(withBlankRows, policy);
    expect(average).toMatchObject({ state: 'calculated', average: 87.5 });
    expect(calculateOptimizedBagrutAverage(withoutBlankRows, policy)).toEqual(average);
  });

  it('requires explicit units when a compulsory grade is entered', () => {
    const onComplete = vi.fn();
    render(<JourneyExactGrades onComplete={onComplete} />);
    fillMathAndEnglish();
    fireEvent.change(field(`ציון ${rowNumber('אזרחות')}`), { target: { value: '90' } });
    expect(field(`יחידות ${rowNumber('אזרחות')}`).validity.valueMissing).toBe(true);
    submit();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('preserves units from a saved subject record', () => {
    render(
      <JourneyExactGrades
        onComplete={vi.fn()}
        initialRecord={{
          schemaVersion: 2,
          sector: 'jewish',
          certificateType: 'internal',
          complete: false,
          subjects: [{ subjectId: 'civics', units: 2, grade: 88, assessmentKind: 'exam' }],
        }}
      />,
    );
    expect(field('יחידות 1').value).toBe('2');
    expect(field('ציון 1').value).toBe('88');
  });

  it('submits when the untouched starter rows are left blank and sends only filled rows', () => {
    const onComplete = vi.fn();
    render(<JourneyExactGrades onComplete={onComplete} />);
    fillMathAndEnglish();

    expect(screen.getByRole('button', { name: 'המשיכו' }).closest('form')!.checkValidity()).toBe(
      true,
    );
    submit();

    expect(screen.queryByRole('alert')).toBeNull();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({
      sector: 'jewish',
      certificateType: 'internal',
      complete: true,
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
    fireEvent.submit(screen.getByRole('button', { name: 'המשיכו' }).closest('form')!);

    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe(
      'יש להשלים את המקצוע, היחידות והציון בכל שורה ולוודא שאין כפילויות.',
    );
  });
});

it('removes assessment editing and completeness confirmation', () => {
  render(<JourneyExactGrades onComplete={vi.fn()} />);
  expect(screen.queryByText('עבודת גמר או ציון משולב')).toBeNull();
  expect(screen.queryByLabelText(/הזנתי את כל המקצועות/)).toBeNull();
});

it.each(['final_project', 'combined'] as const)(
  'resubmits saved %s facts and their label unchanged',
  (assessmentKind) => {
    const onComplete = vi.fn();
    const subjects = [{ subjectId: 'english', units: 2, grade: 90, assessmentKind }];
    render(
      <JourneyExactGrades
        onComplete={onComplete}
        initialRecord={{
          schemaVersion: 2,
          sector: 'jewish',
          certificateType: 'internal',
          complete: false,
          subjects,
        }}
      />,
    );
    expect(
      screen.getByText(assessmentKind === 'final_project' ? 'עבודת גמר' : 'ציון משולב'),
    ).toBeTruthy();
    expect(screen.getByLabelText('יחידות 1')).toHaveProperty('value', '2');
    fireEvent.click(screen.getByRole('button', { name: 'המשיכו' }));
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ complete: true, subjects }));
  },
);

it('still requires review of PDF-imported grades before continuing', async () => {
  const onComplete = vi.fn();
  render(<JourneyExactGrades onComplete={onComplete} />);
  fireEvent.change(screen.getByLabelText('סוג תעודה'), { target: { value: 'internal' } });
  fireEvent.change(screen.getByLabelText(/העלאת גיליון PDF/), {
    target: { files: [new File(['synthetic'], 'grades.pdf', { type: 'application/pdf' })] },
  });
  const review = await screen.findByRole('checkbox', { name: /בדקתי את הציונים שזוהו/ });
  const form = screen.getByRole('button', { name: 'המשיכו' }).closest('form')!;
  fireEvent.submit(form);
  expect(onComplete).not.toHaveBeenCalled();
  expect(screen.getByRole('alert').textContent).toBe('יש לבדוק את הציונים שזוהו ולאשר אותם.');
  fireEvent.click(review);
  fireEvent.submit(form);
  expect(onComplete).toHaveBeenCalledWith(
    expect.objectContaining({
      complete: true,
      subjects: [{ subjectId: 'english', units: 5, grade: 90, assessmentKind: 'exam' }],
    }),
  );
});

it.each(['duplicate', 'invalid'])(
  'blocks a %s row instead of sending a complete record',
  (kind) => {
    const onComplete = vi.fn();
    render(
      <JourneyExactGrades
        onComplete={onComplete}
        initialRecord={{
          schemaVersion: 2,
          sector: 'jewish',
          certificateType: 'internal',
          complete: true,
          subjects: [{ subjectId: 'english', units: 5, grade: 90, assessmentKind: 'exam' }],
        }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /הוספת מקצוע/ }));
    fireEvent.change(screen.getByLabelText('מקצוע 2'), {
      target: { value: kind === 'duplicate' ? 'אנגלית' : 'כימיה' },
    });
    fireEvent.change(screen.getByLabelText('יחידות 2'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('ציון 2'), {
      target: { value: kind === 'duplicate' ? '90' : '101' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'המשיכו' }).closest('form')!);
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe(
      'יש להשלים את המקצוע, היחידות והציון בכל שורה ולוודא שאין כפילויות.',
    );
  },
);

it('supplies a complete internal record to the unchanged BGU and TAU averages', () => {
  const onComplete = vi.fn();
  render(<JourneyExactGrades onComplete={onComplete} />);
  fireEvent.change(screen.getByLabelText('סוג תעודה'), { target: { value: 'internal' } });
  SECTORS['יהודי'].forEach((subject, index) => {
    fireEvent.change(screen.getByLabelText(`יחידות ${index + 1}`), {
      target: { value: subject.min === 3 ? '5' : '2' },
    });
    fireEvent.change(screen.getByLabelText(`ציון ${index + 1}`), { target: { value: '90' } });
  });
  // Five-unit elective takes this synthetic certificate above TAU's 20-unit floor.
  fireEvent.click(screen.getByRole('button', { name: /הוספת מקצוע/ }));
  fireEvent.change(screen.getByLabelText('מקצוע 8'), { target: { value: 'כימיה' } });
  fireEvent.change(screen.getByLabelText('יחידות 8'), { target: { value: '5' } });
  fireEvent.change(screen.getByLabelText('ציון 8'), { target: { value: '90' } });
  fireEvent.click(screen.getByRole('button', { name: 'המשיכו' }));
  expect(onComplete).toHaveBeenCalledTimes(1);
  const record = onComplete.mock.calls[0][0];
  expect(record.complete).toBe(true);
  expect(
    record.subjects.every(
      (subject: { assessmentKind: string }) => subject.assessmentKind === 'exam',
    ),
  ).toBe(true);
  for (const calculate of [calculateBguBagrutAverage, calculateTauBagrutAverage]) {
    expect(calculate(record)).toMatchObject({ state: 'calculated' });
    expect(calculate({ ...record, complete: false })).toMatchObject({
      state: 'needs_input',
      missingInputs: ['bagrut_certificate_complete'],
    });
  }
});

it.each(['8.5', '-3', '85a', ' 90', '101'])(
  'keeps grade %j visible and blocks journey completion until corrected',
  (raw) => {
    const onComplete = vi.fn();
    render(
      <JourneyExactGrades
        onComplete={onComplete}
        initialRecord={{
          schemaVersion: 2,
          sector: 'jewish',
          certificateType: 'internal',
          complete: true,
          subjects: [{ subjectId: 'english', units: 5, grade: 90, assessmentKind: 'exam' }],
        }}
      />,
    );
    const grade = screen.getByLabelText('ציון 1') as HTMLInputElement;
    fireEvent.change(grade, { target: { value: '' } });
    for (let length = 1; length <= raw.length; length++) {
      const value = raw.slice(0, length);
      fireEvent.change(grade, { target: { value } });
      expect(grade.value).toBe(value);
    }
    fireEvent.click(screen.getByRole('button', { name: 'המשיכו' }));
    expect(onComplete).not.toHaveBeenCalled();
    expect(grade.validationMessage).toBe('ציון בין 0 ל-100');
    expect(screen.getByText('ציון בין 0 ל-100')).toBeTruthy();
    fireEvent.change(grade, { target: { value: '90' } });
    fireEvent.click(screen.getByRole('button', { name: 'המשיכו' }));
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        complete: true,
        subjects: [{ subjectId: 'english', units: 5, grade: 90, assessmentKind: 'exam' }],
      }),
    );
  },
);
