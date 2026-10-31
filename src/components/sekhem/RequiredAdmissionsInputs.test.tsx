// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import RequiredAdmissionsInputs, { requestedHaifaKeys } from './RequiredAdmissionsInputs';

it('maps only requested Haifa inputs including the API partner requirement name', () => {
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
