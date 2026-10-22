// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/env', () => ({ getCatalogueSourceMode: () => 'static' }));

const hoisted = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  notFound: hoisted.notFound,
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ loading: false, user: null }),
}));

vi.mock('@/lib/publicCataloguePages', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/publicCataloguePages')>();
  return { ...original, getPublicProgramPageData: vi.fn(original.getPublicProgramPageData) };
});

import { getStaticCataloguePrograms, getStaticCatalogueInstitutions } from '@/lib/catalogueStatic';
import { getPublicProgramPageData } from '@/lib/publicCataloguePages';

import ProgramPage from './page';

describe('ProgramPage', () => {
  it('renders public program content and links into app routes', async () => {
    const program = getStaticCataloguePrograms()[0];

    render(await ProgramPage({ params: Promise.resolve({ programId: program.id }) }));

    expect(screen.getByRole('heading', { name: program.name })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'בדיקת סיכויי קבלה' }).getAttribute('href')).toBe(
      '/app/calculator',
    );
    expect(screen.getByRole('link', { name: 'התאמה אישית' }).getAttribute('href')).toBe(
      '/app/assessment',
    );
    expect(screen.queryByText('savedProgramIds')).toBeNull();
  });

  it('calls notFound for unknown program IDs', async () => {
    await expect(
      ProgramPage({ params: Promise.resolve({ programId: 'missing-program' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(hoisted.notFound).toHaveBeenCalled();
  });

  it('shows existing institution requirements instead of a generic placeholder', async () => {
    const program = getStaticCataloguePrograms().find((entry) => entry.id === 'tau_ee')!;
    const note = program.institutionDetails![0].specificAdmissionNotes[0];

    render(await ProgramPage({ params: Promise.resolve({ programId: program.id }) }));

    expect(
      screen.getAllByRole('listitem', { hidden: true }).some((li) => li.textContent === note),
    ).toBe(true);
    expect(screen.queryByText('לפרטים על תנאי הקבלה, יש לבדוק באתר המוסד.')).toBeNull();
  });

  it('shows Communication’s sourced alternative routes and direct official link', async () => {
    render(await ProgramPage({ params: Promise.resolve({ programId: 'communication' }) }));

    const visibleNotes = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(visibleNotes).toContain('פסיכומטרי כללי 640 ומעלה וזכאות לבגרות.');
    expect(visibleNotes).toContain('ללא פסיכומטרי: ממוצע בגרות 102 ומעלה');
    expect(screen.getByText('כל התנאים ודרכי קבלה נוספות').closest('details')?.open).toBe(false);
    const tauRequirements = screen.getByRole('heading', {
      name: 'אוניברסיטת תל אביב',
    }).parentElement!;
    expect(
      within(tauRequirements).getByRole('link', { name: 'לאתר המוסד' }).getAttribute('href'),
    ).toBe(
      'https://go.tau.ac.il/he/social-sciences/ba/communications?v=requirements&utm_source=myway&utm_medium=referral',
    );
  });

  it('keeps each institution’s requirements with its own source', async () => {
    const program = getStaticCataloguePrograms().find((entry) => entry.id === 'communication')!;
    const institutions = getStaticCatalogueInstitutions().filter((entry) =>
      ['tau', 'bgu'].includes(entry.id),
    );
    const officialSources: Record<string, string> = {
      tau: 'https://go.tau.ac.il/he/social-sciences/ba/communications?v=requirements',
      bgu: 'https://www.bgu.ac.il/welcome/ba/',
    };
    vi.mocked(getPublicProgramPageData).mockResolvedValueOnce({
      program: {
        ...program,
        institutionDetails: institutions.map((institution) => ({
          ...program.institutionDetails![0],
          institutionName: institution.name,
          specificAdmissionNotes: [`תנאי ${institution.id}`],
          programUrl: officialSources[institution.id],
        })),
      },
      institutions,
      isGeneral: true,
      institutionProgramPaths: Object.fromEntries(
        institutions.map((institution) => [institution.id, `/institutions/${institution.id}`]),
      ),
    });

    render(await ProgramPage({ params: Promise.resolve({ programId: program.id }) }));

    for (const institution of institutions) {
      const section = screen.getByRole('heading', { name: institution.name }).parentElement!;
      expect(within(section).getByText(`תנאי ${institution.id}`)).toBeTruthy();
      expect(within(section).getAllByRole('listitem')).toHaveLength(1);
      const expectedLink = new URL(officialSources[institution.id]);
      expectedLink.searchParams.set('utm_source', 'myway');
      expectedLink.searchParams.set('utm_medium', 'referral');
      expect(within(section).getByRole('link', { name: 'לאתר המוסד' }).getAttribute('href')).toBe(
        expectedLink.toString(),
      );
    }
  });
});
