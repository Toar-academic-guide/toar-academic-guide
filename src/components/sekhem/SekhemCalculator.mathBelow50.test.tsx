// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import SekhemCalculator from './SekhemCalculator';

vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));
afterEach(() => vi.unstubAllGlobals());

it('submits math 45 in the evaluation request without blocking or dropping the grade', async () => {
  sessionStorage.clear();
  const fetchMock = vi
    .fn()
    .mockResolvedValue(Response.json({ data: { reports: {}, failedDegreeIds: ['tau_business'] } }));
  vi.stubGlobal('fetch', fetchMock);
  render(
    <SekhemCalculator
      offerings={[
        {
          programId: 'tau_business',
          programName: 'ניהול',
          institutionId: 'tau',
          institutionName: 'אוניברסיטת תל אביב',
        },
      ]}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'ערכים לדוגמה' }));
  fireEvent.change(screen.getByLabelText('יחידות 1'), { target: { value: '4' } });
  const grade = screen.getByLabelText('ציון 1') as HTMLInputElement;
  fireEvent.change(grade, { target: { value: '45' } });
  expect(grade.checkValidity()).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'חשבו את הסכם שלי' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  expect(fetchMock.mock.calls[0][0]).toBe('/api/admissions/evaluate');
  const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
  expect(body.extraInputs).toMatchObject({ mathUnits: 4, mathGrade: 45 });
  expect(body.extraInputs.bagrutSubjectRecord.subjects).toContainEqual({
    subjectId: 'mathematics',
    units: 4,
    grade: 45,
    assessmentKind: 'exam',
  });
});
