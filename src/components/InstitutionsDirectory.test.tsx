// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { DirectoryInstitution } from '@/data/institutionDirectory';
vi.mock('@/components/WayPageShell', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/InstitutionLogo', () => ({ default: () => null }));
import InstitutionsDirectory from './InstitutionsDirectory';
const fields = [
  { key: 'engineering', label: 'הנדסה' },
  { key: 'social', label: 'מדעי החברה' },
];
const subjects = [
  { key: 'software', label: 'הנדסת תוכנה', type: 'academic' as const, field: fields[0] },
  { key: 'psychology', label: 'פסיכולוגיה', type: 'academic' as const, field: fields[1] },
];
const programme = (id: string, subject: (typeof subjects)[number]) => ({
  id,
  name: subject.label,
  subjectKey: subject.key,
  fieldKey: subject.field.key,
  href: `/programs/${id}`,
});
const base: DirectoryInstitution = {
  fieldSources: {},
  id: 'a',
  name: 'מוסד א׳',
  type: 'אוניברסיטה',
  funding: null,
  location: 'צפון',
  diplomaType: null,
  sourceUrl: null,
  domain: null,
  logoUrl: null,
  areas: ['north'],
  categories: ['universities'],
  credentials: [],
  programmes: [programme('a_software', subjects[0]), programme('a_psychology', subjects[1])],
};
const institutions: DirectoryInstitution[] = [
  base,
  {
    ...base,
    id: 'b',
    name: 'מוסד ב׳',
    areas: ['center'],
    location: 'מרכז',
    programmes: [programme('b_psychology', subjects[1])],
  },
  {
    ...base,
    id: 'c',
    name: 'מוסד ג׳',
    fieldSources: { engineering: 'https://example.edu/engineering' },
    programmes: [],
  },
];
function open() {
  render(<InstitutionsDirectory institutions={institutions} subjects={subjects} fields={fields} />);
}
const fieldGroup = () => screen.getByRole('group', { name: 'תחום לימודים' });
const subjectGroup = () => screen.getByRole('group', { name: 'תכנית לימודים' });
describe('institution subject pills', () => {
  it('identifies the official operator when ITC links to the Jewish Agency', () => {
    render(
      <InstitutionsDirectory
        institutions={[
          {
            ...base,
            id: 'itc',
            name: 'Israel Tech Challenge (ITC)',
            sourceUrl: 'https://www.jewishagency.org/israel-tech-challenge/',
          },
        ]}
        subjects={subjects}
        fields={fields}
      />,
    );
    const link = screen.getByRole('link', {
      name: 'מידע על Israel Tech Challenge (ITC) באתר הסוכנות היהודית',
    });
    expect(link.getAttribute('href')).toBe('https://www.jewishagency.org/israel-tech-challenge/');
    expect(link.textContent).toContain('מידע באתר הסוכנות היהודית');
  });
  it('starts with every institution and filters directly by a programme, then clears it', () => {
    open();
    expect(screen.getByRole('link', { name: 'מוסד ג׳' })).toBeTruthy();
    fireEvent.click(within(subjectGroup()).getByRole('button', { name: 'הנדסת תוכנה' }));
    expect(screen.queryByRole('link', { name: 'מוסד ב׳' })).toBeNull();
    expect(screen.getByRole('link', { name: 'הנדסת תוכנה' }).getAttribute('href')).toBe(
      '/programs/a_software',
    );
    expect(screen.getByText('מוסד אחד')).toBeTruthy();
    fireEvent.click(within(subjectGroup()).getByRole('button', { name: 'הנדסת תוכנה' }));
    expect(screen.getByRole('link', { name: 'מוסד ג׳' })).toBeTruthy();
  });
  it('clears the programme when changing fields and combines secondary filters', () => {
    open();
    fireEvent.click(within(fieldGroup()).getByRole('button', { name: 'הנדסה' }));
    fireEvent.click(within(subjectGroup()).getByRole('button', { name: 'הנדסת תוכנה' }));
    fireEvent.click(within(fieldGroup()).getByRole('button', { name: 'מדעי החברה' }));
    expect(
      within(subjectGroup()).getByRole('button', { name: 'הכל' }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.getByRole('link', { name: 'מוסד ב׳' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('אזור'), { target: { value: 'south' } });
    expect(screen.getByText('לא נמצאו מוסדות שמתאימים לסינון.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('אזור'), { target: { value: 'all' } });
    expect(screen.getByRole('link', { name: 'מוסד א׳' })).toBeTruthy();
  });
  it('shows a documented field match without inventing a specific programme or counting it', () => {
    open();
    fireEvent.click(within(fieldGroup()).getByRole('button', { name: 'הנדסה' }));
    const row = screen.getByRole('row', { name: /מוסד ג׳/ });
    expect(within(row).getByText('—')).toBeTruthy();
    expect(within(row).getByRole('link', { name: 'מסלולים באתר המוסד' }).getAttribute('href')).toBe(
      'https://example.edu/engineering',
    );
    fireEvent.click(within(subjectGroup()).getByRole('button', { name: 'הנדסת תוכנה' }));
    expect(screen.queryByRole('link', { name: 'מוסד ג׳' })).toBeNull();
  });
  it('searches programme options without filtering results until selection', () => {
    open();
    fireEvent.change(screen.getByLabelText('חיפוש תכנית לימודים'), { target: { value: 'תוכנה' } });
    expect(within(subjectGroup()).queryByRole('button', { name: 'פסיכולוגיה' })).toBeNull();
    expect(screen.getByRole('link', { name: 'מוסד ב׳' })).toBeTruthy();
  });
});
