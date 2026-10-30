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

  it('starts compulsory one-unit-minimum subjects at 2 and keeps clearing a units field empty', () => {
    render(<JourneyExactGrades onComplete={vi.fn()} />);
    for (const subject of ['תנ״ך', 'ספרות', 'הבעה עברית', 'היסטוריה / תע״י', 'אזרחות']) {
      // Approved test update, Jorje 2026-10-30
      expect(field(`יחידות ${rowNumber(subject)}`).value).toBe('2');
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
    for (const subject of compulsory) {
      // Approved test update, Jorje 2026-10-30
      expect(field(`יחידות ${rowNumber(subject)}`).value).toBe('2');
    }
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

  it('uses default units when a compulsory grade is entered', () => {
    const onComplete = vi.fn();
    render(<JourneyExactGrades onComplete={onComplete} />);
    fillMathAndEnglish();
    fireEvent.change(field(`ציון ${rowNumber('אזרחות')}`), { target: { value: '90' } });
    // Approved test update, Jorje 2026-10-30
    expect(field(`יחידות ${rowNumber('אזרחות')}`).validity.valueMissing).toBe(false);
    submit();
    // Approved test update, Jorje 2026-10-30
    expect(onComplete).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        complete: true,
        subjects: [
          { subjectId: 'civics', units: 2, grade: 90, assessmentKind: 'exam' },
          { subjectId: 'english', units: 5, grade: 85, assessmentKind: 'exam' },
          { subjectId: 'mathematics', units: 5, grade: 90, assessmentKind: 'exam' },
        ],
      }),
    );
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

describe('new-row defaults in journey', () => {
  const unitsFor = (label: string) => {
    const index = screen
      .getAllByLabelText(/^מקצוע /)
      .findIndex((input) => (input as HTMLInputElement).value === label);
    return screen.getByLabelText(`יחידות ${index + 1}`);
  };

  it('defaults starters to 2 or 3 and excludes untouched starters from the record', () => {
    const onComplete = vi.fn();
    render(<JourneyExactGrades onComplete={onComplete} />);
    expect(unitsFor('אזרחות')).toHaveProperty('value', '2');
    expect(unitsFor('אנגלית')).toHaveProperty('value', '3');
    expect(unitsFor('מתמטיקה')).toHaveProperty('value', '3');
    fireEvent.change(screen.getByLabelText('סוג תעודה'), { target: { value: 'internal' } });
    fireEvent.change(screen.getByLabelText('ציון 4'), { target: { value: '90' } });
    expect(screen.getByRole('button', { name: 'המשיכו' }).closest('form')!.checkValidity()).toBe(
      true,
    );
    fireEvent.click(screen.getByRole('button', { name: 'המשיכו' }));
    expect(onComplete.mock.calls[0][0]).toEqual({
      schemaVersion: 2,
      sector: 'jewish',
      certificateType: 'internal',
      complete: true,
      subjects: [{ subjectId: 'english', units: 3, grade: 90, assessmentKind: 'exam' }],
    });
  });

  it.each(['ערבי', 'דרוזי'])(
    'replaces untouched starters and defaults Hebrew to 3 in %s',
    (sector) => {
      render(<JourneyExactGrades onComplete={vi.fn()} />);
      fireEvent.change(screen.getByLabelText('מגזר'), { target: { value: sector } });
      expect(unitsFor('עברית')).toHaveProperty('value', '3');
      expect(unitsFor('ערבית')).toHaveProperty('value', '2');
      expect(
        screen.getAllByLabelText(/^מקצוע /).map((input) => (input as HTMLInputElement).value),
      ).toEqual(SECTORS[sector].map((subject) => subject.n));
    },
  );

  it('recomputes an added Hebrew row on sector changes until units are chosen', () => {
    render(<JourneyExactGrades onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /הוספת מקצוע/ }));
    fireEvent.change(screen.getByLabelText('מקצוע 8'), { target: { value: 'עברית' } });
    expect(unitsFor('עברית')).toHaveProperty('value', '2');
    fireEvent.change(screen.getByLabelText('מגזר'), { target: { value: 'ערבי' } });
    expect(unitsFor('עברית')).toHaveProperty('value', '3');
    fireEvent.change(screen.getByLabelText('מגזר'), { target: { value: 'יהודי' } });
    expect(unitsFor('עברית')).toHaveProperty('value', '2');
  });

  it.each(['4', ''])('preserves picked units %j through label and sector changes', (value) => {
    render(<JourneyExactGrades onComplete={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('יחידות 1'), { target: { value } });
    fireEvent.change(screen.getByLabelText('מקצוע 1'), { target: { value: 'עברית' } });
    fireEvent.change(screen.getByLabelText('מגזר'), { target: { value: 'ערבי' } });
    expect(unitsFor('עברית')).toHaveProperty('value', value);
  });

  it.each([2, 4])('preserves initialRecord units %s through label and sector changes', (units) => {
    render(
      <JourneyExactGrades
        onComplete={vi.fn()}
        initialRecord={{
          schemaVersion: 2,
          sector: 'jewish',
          certificateType: 'internal',
          complete: false,
          subjects: [{ subjectId: 'english', units, grade: 90, assessmentKind: 'exam' }],
        }}
      />,
    );
    fireEvent.change(screen.getByLabelText('מקצוע 1'), { target: { value: 'עברית' } });
    fireEvent.change(screen.getByLabelText('מגזר'), { target: { value: 'ערבי' } });
    expect(screen.getByLabelText('יחידות 1')).toHaveProperty('value', String(units));
  });

  it('preserves imported legacy units through label and sector changes', async () => {
    const { readBagrutPdf } = await import('@/lib/bagrutPdf');
    vi.mocked(readBagrutPdf).mockResolvedValueOnce([{ label: 'אנגלית', units: 2, grade: 90 }]);
    const { container } = render(<JourneyExactGrades onComplete={vi.fn()} />);
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [new File(['pdf'], 'grades.pdf', { type: 'application/pdf' })] },
    });
    await screen.findByText('בדקתי את הציונים שזוהו מול התעודה ותיקנתי או השלמתי את הנדרש');
    fireEvent.change(screen.getByLabelText('מקצוע 1'), { target: { value: 'עברית' } });
    fireEvent.change(screen.getByLabelText('מגזר'), { target: { value: 'ערבי' } });
    expect(screen.getByLabelText('יחידות 1')).toHaveProperty('value', '2');
  });
});

describe('JourneyExactGrades PDF imports', () => {
  const subjectInputs = () =>
    screen.getAllByLabelText(/^מקצוע /, { selector: 'input' }) as HTMLInputElement[];
  const upload = async (
    subjects: { label: string; units: number; grade: number; unmatched?: boolean }[],
  ) => {
    const { readBagrutPdf } = await import('@/lib/bagrutPdf');
    vi.mocked(readBagrutPdf).mockResolvedValueOnce(subjects);
    fireEvent.change(screen.getByLabelText(/העלאת גיליון PDF/, { selector: 'input' }), {
      target: { files: [new File(['synthetic'], 'synthetic.pdf', { type: 'application/pdf' })] },
    });
    await screen.findByText(/בדקתי את הציונים שזוהו/);
  };

  it.each([
    { matched: 3, unmatched: 1, status: 'זוהו 3 מקצועות · 1 לא זוהה, נא לבדוק' },
    { matched: 1, unmatched: 1, status: 'זוהה מקצוע אחד · 1 לא זוהה, נא לבדוק' },
    { matched: 0, unmatched: 2, status: '2 לא זוהו, נא לבדוק' },
    { matched: 0, unmatched: 1, status: '1 לא זוהה, נא לבדוק' },
    { matched: 9, unmatched: 0, status: 'זוהו 9 מקצועות' },
  ])(
    'reports $matched matched and $unmatched unmatched PDF subjects',
    async ({ matched, unmatched, status }) => {
      render(<JourneyExactGrades onComplete={vi.fn()} />);
      const labels = [
        'מתמטיקה',
        'אנגלית',
        'פיסיקה',
        'כימיה',
        'ביולוגיה',
        'תנ״ך',
        'ספרות',
        'היסטוריה',
        'אזרחות',
      ];
      await upload([
        ...labels.slice(0, matched).map((label) => ({ label, units: 5, grade: 90 })),
        ...Array.from({ length: unmatched }, (_, i) => ({
          label: `מקצוע בדיקה ${i === 0 ? 'א' : 'ב'}`,
          units: 2,
          grade: 80,
          unmatched: true,
        })),
      ]);
      expect(screen.getByRole('status').textContent).toBe(status);
    },
  );

  it.each(['rename', 'delete'])(
    'blocks reviewed unmatched PDF subjects until students %s the unknown row',
    async (correction) => {
      const onComplete = vi.fn();
      render(<JourneyExactGrades onComplete={onComplete} />);
      fireEvent.change(screen.getByLabelText('סוג תעודה'), { target: { value: 'internal' } });
      await upload([
        { label: 'מתמטיקה', units: 5, grade: 90 },
        { label: 'מקצוע בדיקה א', units: 5, grade: 85, unmatched: true },
      ]);
      fireEvent.click(screen.getByLabelText(/בדקתי את הציונים שזוהו/));
      fireEvent.click(screen.getByRole('button', { name: 'המשיכו' }));
      expect(onComplete).not.toHaveBeenCalled();
      const unknown = screen.getByLabelText('מקצוע 2', { selector: 'input' });
      expect(unknown.getAttribute('aria-invalid')).toBe('true');
      expect(screen.getByText('נא לבדוק את שם המקצוע')).toBeTruthy();
      if (correction === 'rename') {
        fireEvent.change(unknown, { target: { value: 'פיזיקה' } });
      } else {
        fireEvent.click(screen.getByRole('button', { name: 'הסרת מקצוע 2' }));
      }
      fireEvent.click(screen.getByRole('button', { name: 'המשיכו' }));
      expect(onComplete).toHaveBeenCalledOnce();
      expect(onComplete.mock.calls[0][0].subjects).toEqual([
        { subjectId: 'mathematics', units: 5, grade: 90, assessmentKind: 'exam' },
        ...(correction === 'rename'
          ? [{ subjectId: 'physics', units: 5, grade: 85, assessmentKind: 'exam' }]
          : []),
      ]);
      expect(screen.queryByText('נא לבדוק את שם המקצוע')).toBeNull();
    },
  );

  it('keeps entered math when a PDF contains only English and drops blank starters', async () => {
    render(<JourneyExactGrades onComplete={vi.fn()} />);
    const mathIndex = subjectInputs().findIndex((i) => i.value === 'מתמטיקה') + 1;
    fireEvent.change(screen.getByLabelText(`ציון ${mathIndex}`), { target: { value: '94' } });
    await upload([{ label: 'אנגלית', units: 5, grade: 85 }]);
    expect(subjectInputs().map((i) => i.value)).toEqual(['מתמטיקה', 'אנגלית']);
    expect(screen.getByLabelText('ציון 1')).toHaveProperty('value', '94');
    expect(screen.getByRole('status').textContent).toBe('זוהה מקצוע אחד');
  });

  it('overwrites normalized overlaps once and keeps unmatched names for correction', async () => {
    render(<JourneyExactGrades onComplete={vi.fn()} />);
    const bibleIndex = subjectInputs().findIndex((i) => i.value === 'תנ״ך') + 1;
    fireEvent.change(screen.getByLabelText(`ציון ${bibleIndex}`), { target: { value: '64' } });
    await upload([
      { label: 'תנ"ך', units: 2, grade: 84 },
      { label: 'מקצוע בדיקה עם ף', units: 4, grade: 55, unmatched: true },
    ]);
    expect(subjectInputs().map((i) => i.value)).toEqual(['תנ"ך', 'מקצוע בדיקה עם ף']);
    expect(screen.getByLabelText('ציון 1')).toHaveProperty('value', '84');
    expect(screen.getByRole('status').textContent).toBe('זוהה מקצוע אחד · 1 לא זוהה, נא לבדוק');
    const reviewed = screen.getByLabelText(/בדקתי את הציונים שזוהו/);
    expect(reviewed).toHaveProperty('checked', false);
    const unknown = screen.getByLabelText('מקצוע 2', { selector: 'input' });
    expect(unknown.getAttribute('aria-invalid')).toBe('true');
    const reviewMessage = document.getElementById(unknown.getAttribute('aria-describedby')!);
    expect(reviewMessage?.textContent).toBe('נא לבדוק את שם המקצוע');
    fireEvent.change(unknown, { target: { value: 'פיזיקה' } });
    expect(unknown.getAttribute('aria-invalid')).toBeNull();
    expect(screen.queryByText('נא לבדוק את שם המקצוע')).toBeNull();
    fireEvent.click(reviewed);
    await upload([{ label: 'תנ״ך', units: 2, grade: 85 }]);
    expect(reviewed).toHaveProperty('checked', false);
    expect(subjectInputs()).toHaveLength(2);
  });
  const enterManualSubject = (label: string, units: number, grade: number) => {
    fireEvent.change(screen.getByLabelText('סוג תעודה'), { target: { value: 'internal' } });
    fireEvent.click(screen.getByRole('button', { name: /הוספת מקצוע/ }));
    const index = subjectInputs().length;
    fireEvent.change(screen.getByLabelText(`מקצוע ${index}`, { selector: 'input' }), {
      target: { value: label },
    });
    fireEvent.change(screen.getByLabelText(`יחידות ${index}`), {
      target: { value: String(units) },
    });
    fireEvent.change(screen.getByLabelText(`ציון ${index}`), { target: { value: String(grade) } });
  };
  const confirmAndContinue = () => {
    fireEvent.click(screen.getByLabelText(/בדקתי את הציונים שזוהו/));
    fireEvent.click(screen.getByRole('button', { name: 'המשיכו' }));
  };

  it.each([
    {
      name: 'physics alias',
      manualLabel: 'פיזיקה',
      pdfLabel: 'פיסיקה',
      manualGrade: 84,
      pdfGrade: 90,
      subjectId: 'physics',
    },
    {
      name: 'reverse physics alias',
      manualLabel: 'פיסיקה',
      pdfLabel: 'פיזיקה',
      manualGrade: 84,
      pdfGrade: 90,
      subjectId: 'physics',
    },
    {
      name: 'canonical math',
      manualLabel: 'מתמטיקה',
      pdfLabel: 'מתמטיקה',
      manualGrade: 80,
      pdfGrade: 95,
      subjectId: 'mathematics',
    },
  ])(
    'merges $name with PDF units/grade and completes without a duplicate error',
    async ({ manualLabel, pdfLabel, manualGrade, pdfGrade, subjectId }) => {
      const onComplete = vi.fn();
      render(<JourneyExactGrades onComplete={onComplete} />);
      enterManualSubject(manualLabel, 4, manualGrade);
      await upload([{ label: pdfLabel, units: 5, grade: pdfGrade }]);

      expect(subjectInputs().map((input) => input.value)).toEqual([pdfLabel]);
      expect(screen.getByLabelText('יחידות 1')).toHaveProperty('value', '5');
      expect(screen.getByLabelText('ציון 1')).toHaveProperty('value', String(pdfGrade));
      confirmAndContinue();

      expect(screen.queryByRole('alert')).toBeNull();
      expect(onComplete).toHaveBeenCalledOnce();
      expect(onComplete.mock.calls[0][0].subjects).toEqual([
        { subjectId, units: 5, grade: pdfGrade, assessmentKind: 'exam' },
      ]);
    },
  );

  it.each([
    {
      name: 'different unknown names',
      manualLabel: 'מקצוע בדיקה א',
      pdfLabels: ['מקצוע בדיקה ב'],
      expected: [
        { label: 'מקצוע בדיקה א', units: 4, grade: 84 },
        { label: 'מקצוע בדיקה ב', units: 5, grade: 90 },
      ],
    },
    {
      name: 'repeated unknown name',
      manualLabel: 'מקצוע בדיקה א',
      pdfLabels: ['מקצוע בדיקה א', 'מקצוע בדיקה א'],
      expected: [{ label: 'מקצוע בדיקה א', units: 5, grade: 90 }],
    },
    {
      name: 'normalized unknown name',
      manualLabel: '  מקצוע בדיקה ״א״  ',
      pdfLabels: ['מקצוע   בדיקה "א" (רמה רגילה)'],
      expected: [{ label: 'מקצוע   בדיקה "א" (רמה רגילה)', units: 5, grade: 90 }],
    },
  ])('merges $name only by normalized raw name', async ({ manualLabel, pdfLabels, expected }) => {
    const onComplete = vi.fn();
    render(<JourneyExactGrades onComplete={onComplete} />);
    enterManualSubject(manualLabel, 4, 84);
    await upload(pdfLabels.map((label) => ({ label, units: 5, grade: 90, unmatched: true })));

    expect(subjectInputs().map((input) => input.value)).toEqual(expected.map((row) => row.label));
    for (const [index, row] of expected.entries()) {
      expect(screen.getByLabelText(`יחידות ${index + 1}`)).toHaveProperty(
        'value',
        String(row.units),
      );
      expect(screen.getByLabelText(`ציון ${index + 1}`)).toHaveProperty('value', String(row.grade));
    }
    confirmAndContinue();
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getAllByText('נא לבדוק את שם המקצוע')).toHaveLength(expected.length);
  });
});
