// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import JourneyExactGrades from './JourneyExactGrades';
import { SECTORS } from '@/data/bagrutSubjects';
import { calculateOptimizedBagrutAverage } from '@/server/admissions/bagrutPolicies';

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

vi.mock('@/lib/bagrutPdf', () => ({ readBagrutPdf: vi.fn() }));

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
    expect(screen.getByRole('status').textContent).toBe('זוהו 2 מקצועות · 1 לא זוהה, נא לבדוק');
    const reviewed = screen.getByLabelText(/בדקתי את הציונים שזוהו/);
    expect(reviewed).toHaveProperty('checked', false);
    fireEvent.click(reviewed);
    await upload([{ label: 'תנ״ך', units: 2, grade: 85 }]);
    expect(reviewed).toHaveProperty('checked', false);
    expect(subjectInputs()).toHaveLength(2);
  });
});
