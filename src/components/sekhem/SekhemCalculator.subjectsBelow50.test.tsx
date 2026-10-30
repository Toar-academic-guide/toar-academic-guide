// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import SekhemCalculator from './SekhemCalculator';

vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));
afterEach(() => vi.unstubAllGlobals());

it.each([
  { field: 'englishGrade', units: 'englishUnits', subjectId: 'english', row: 2 },
  { field: 'physicsGrade', units: 'physicsUnits', subjectId: 'physics', row: 8 },
  { field: 'csGrade', units: 'csUnits', subjectId: 'computer_science', row: 9 },
])('keeps $field = 45 in the evaluation request', async ({ field, units, subjectId, row }) => {
  sessionStorage.clear();
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      Response.json({ data: { reports: {}, failedDegreeIds: ['open_university_cs'] } }),
    );
  vi.stubGlobal('fetch', fetchMock);
  render(
    <SekhemCalculator
      offerings={[
        {
          programId: 'open_university_cs',
          programName: 'מדעי המחשב',
          institutionId: 'open_university',
          institutionName: 'האוניברסיטה הפתוחה',
        },
      ]}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'ערכים לדוגמה' }));
  const grade = screen.getByLabelText(`ציון ${row}`) as HTMLInputElement;
  fireEvent.change(grade, { target: { value: '45' } });
  expect(grade.checkValidity()).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'חשבו את הסכם שלי' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  expect(fetchMock.mock.calls[0][0]).toBe('/api/admissions/evaluate');
  const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
  expect(body.extraInputs).toMatchObject({ [units]: 5, [field]: 45 });
  expect(body.extraInputs.bagrutSubjectRecord.subjects).toContainEqual({
    subjectId,
    units: 5,
    grade: 45,
    assessmentKind: 'exam',
  });
});
