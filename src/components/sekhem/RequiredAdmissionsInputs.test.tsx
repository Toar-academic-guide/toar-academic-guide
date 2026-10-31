// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import RequiredAdmissionsInputs, { requestedHaifaKeys } from './RequiredAdmissionsInputs';
import type { BagrutSubjectRecordV2 } from '@/types';

it('maps only requested Haifa inputs including the API partner requirement name', () => {
  // Approved test update, Jorje 2026-10-31: route uncomputable Haifa averages to subject rows, never to a numeric field.
  expect(
    requestedHaifaKeys([
      'haifa_bagrut_average',
      'haifa_hebrew_qualification',
      'haifa_information_systems_partner_requirements',
      'psychometric_math',
    ]),
  ).toEqual([
    'haifaInformationSystemsPartnerRequirementsConfirmed',
    'haifaBagrutAverage',
    'haifaHebrewQualification',
  ]);
  const focusBagrut = vi.fn();
  const props = {
    keys: requestedHaifaKeys(['haifa_bagrut_average']),
    values: {},
    onChange: vi.fn(),
    disabled: false,
    onBagrutFocus: focusBagrut,
  };
  const view = render(<RequiredAdmissionsInputs {...props} />);
  expect(screen.queryByLabelText('ממוצע בגרות בחיפה')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'השלימו ציוני בגרות' }));
  expect(focusBagrut).toHaveBeenCalledOnce();
  const record: BagrutSubjectRecordV2 = {
    schemaVersion: 2,
    sector: 'jewish',
    certificateType: 'internal',
    complete: true,
    subjects: [
      'mathematics',
      'english',
      'civics',
      'hebrew_expression',
      'history',
      'literature',
      'bible',
    ].map((subjectId) => ({
      subjectId,
      units: 3,
      grade: 90,
      assessmentKind: 'exam',
    })),
  };
  view.rerender(<RequiredAdmissionsInputs {...props} bagrutSubjectRecord={record} />);
  expect(screen.queryByRole('button', { name: 'השלימו ציוני בגרות' })).toBeNull();
  expect(screen.queryByLabelText('ממוצע בגרות בחיפה')).toBeNull();
});
it('renders optional requested Hebrew score and date without a whole questionnaire', () => {
  const change = vi.fn();
  render(
    <RequiredAdmissionsInputs
      keys={['haifaHebrewScore', 'haifaHebrewExamDate']}
      values={{}}
      onChange={change}
      disabled={false}
    />,
  );
  expect(screen.queryByText('תנאי החוגים באוניברסיטת חיפה')).toBeNull();
  const score = screen.getByLabelText('ציון מבחן העברית בחיפה');
  expect(score.hasAttribute('required')).toBe(false);
  fireEvent.change(score, { target: { value: '120' } });
  expect(change).toHaveBeenCalledWith('haifaHebrewScore', '120');
  expect(screen.getByLabelText('תאריך מבחן העברית בחיפה')).toBeTruthy();
});

it('requests the sitting year whenever Haifa requests the psychometric month', () => {
  expect(requestedHaifaKeys(['haifa_psychometric_month'])).toEqual([
    'haifaPsychometricYear',
    'haifaPsychometricMonth',
  ]);
});

it('shows the sitting year next to the month in the same follow-up step', () => {
  const change = vi.fn();
  render(
    <RequiredAdmissionsInputs
      keys={['haifaPsychometricMonth']}
      values={{ haifaPsychometricMonth: '4', haifaPsychometricYear: '2025' }}
      onChange={change}
      disabled={false}
    />,
  );
  const month = screen.getByLabelText('חודש הבחינה הפסיכומטרית לחיפה');
  const year = screen.getByLabelText('שנת הפסיכומטרי');
  expect(year).toHaveProperty('value', '2025');
  expect(month.parentElement?.parentElement?.contains(year)).toBe(true);
  fireEvent.change(year, { target: { value: '2024' } });
  expect(change).toHaveBeenCalledWith('haifaPsychometricYear', '2024');
});

it('never asks for a numeric Haifa average even when the API requests it', () => {
  render(
    <RequiredAdmissionsInputs
      keys={['haifaBagrutAverage']}
      values={{}}
      onChange={vi.fn()}
      disabled={false}
    />,
  );
  expect(screen.queryByLabelText('ממוצע בגרות בחיפה')).toBeNull();
});
