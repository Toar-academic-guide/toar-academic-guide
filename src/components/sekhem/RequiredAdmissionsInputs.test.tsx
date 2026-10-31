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
