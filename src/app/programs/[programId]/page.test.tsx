// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InstitutionId } from '@/data/institutions';
import type { CatalogueProgram } from '@/types/catalogue';

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

vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: vi.fn(),
  listCatalogueInstitutions: vi.fn(),
}));

import { getStaticCataloguePrograms, getStaticCatalogueInstitutions } from '@/lib/catalogueStatic';
import { listCataloguePrograms, listCatalogueInstitutions } from '@/server/catalogue/queries';

import ProgramPage from './page';

describe('ProgramPage', () => {
  beforeEach(() => {
    vi.mocked(listCataloguePrograms).mockResolvedValue({
      data: getStaticCataloguePrograms(),
      meta: {},
    });
    vi.mocked(listCatalogueInstitutions).mockResolvedValue({
      data: getStaticCatalogueInstitutions(),
      meta: {},
    });
  });
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
    vi.mocked(listCataloguePrograms).mockResolvedValue({
      data: [
        {
          ...program,
          institutionDetails: institutions.map((institution) => ({
            ...program.institutionDetails![0],
            institutionName: institution.name,
            specificAdmissionNotes: [`תנאי ${institution.id}`],
            programUrl: officialSources[institution.id],
          })),
        },
      ],
      meta: { catalogueSource: 'database' },
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

  describe('general nursing requirement sources', () => {
    const institutions = getStaticCatalogueInstitutions();
    const tau = institutions.find((item) => item.id === 'tau')!;
    const haifa = institutions.find((item) => item.id === 'haifa')!;
    const unknown = { ...tau, id: 'test_no_website' as InstitutionId, name: 'מוסד בדיקה' };
    const base = getStaticCataloguePrograms().find((item) => item.id === 'nursing')!;
    const haifaNotes = [
      'ביולוגיה — חובה',
      'ציון פסיכומטרי מינימלי: 580',
      'ממוצע בגרות מינימלי: 76',
    ];
    const tauNotes = ['תנאי הסיעוד הקיימים בתל אביב'];
    const makeDetail = (
      institutionName: string,
      specificAdmissionNotes: string[],
      programUrl = '',
    ) => ({
      ...base.institutionDetails![0],
      institutionName,
      specificAdmissionNotes,
      programUrl,
    });
    const general: CatalogueProgram = {
      ...base,
      institutionId: 'tau',
      linkedInstitutionIds: ['tau'],
      admissionRequirements: [],
      thresholds: { tau: 610, huji: 600 },
      institutionDetails: [
        makeDetail(tau.name, tauNotes),
        makeDetail(haifa.name, [], 'https://www.haifa.ac.il/general-only'),
        makeDetail(unknown.name, []),
      ],
    };
    const ownProgram = (institutionId: InstitutionId, notes: string[]): CatalogueProgram => ({
      ...base,
      id: `${institutionId}_nursing`,
      institutionId,
      linkedInstitutionIds: [institutionId],
      admissionRequirements: [],
      thresholds: undefined,
      institutionDetails: [
        makeDetail(
          institutions.find((item) => item.id === institutionId)!.name,
          notes,
          institutionId === 'haifa' ? 'https://www.haifa.ac.il/nursing' : '',
        ),
      ],
    });

    beforeEach(() => {
      vi.mocked(listCatalogueInstitutions).mockResolvedValue({
        data: [...institutions, unknown],
        meta: { catalogueSource: 'database' },
      });
      vi.mocked(listCataloguePrograms).mockResolvedValue({
        data: [
          general,
          ownProgram('tau', ['תנאי אחר שאין להציג במקום התנאים הקיימים']),
          ownProgram('haifa', haifaNotes),
          ownProgram('bgu', ['ראיון קבלה מחייב', 'ביולוגיה ברמה מקיפה — יתרון']),
          ownProgram('ariel', []),
        ],
        meta: { catalogueSource: 'database' },
      });
    });

    it('preserves TAU and renders each own page’s exact requirements and official URL', async () => {
      const view = render(await ProgramPage({ params: Promise.resolve({ programId: 'nursing' }) }));
      const block = (name: string) => within(screen.getByRole('heading', { name }).parentElement!);
      const bullets = (name: string) =>
        block(name)
          .getAllByRole('listitem')
          .map((li) => li.textContent);

      expect(bullets(tau.name)).toEqual(tauNotes);
      expect(block(tau.name).queryByRole('link', { name: 'לפרטים המלאים' })).toBeNull();
      expect(bullets(haifa.name)).toEqual(haifaNotes);
      expect(
        block(haifa.name).getByRole('link', { name: 'לפרטים המלאים' }).getAttribute('href'),
      ).toBe('/programs/haifa_nursing');
      expect(block(haifa.name).getByRole('link', { name: 'לאתר המוסד' }).getAttribute('href')).toBe(
        'https://www.haifa.ac.il/nursing?utm_source=myway&utm_medium=referral',
      );
      expect(bullets(institutions.find((item) => item.id === 'bgu')!.name)).toEqual([
        'ראיון קבלה מחייב',
        'ביולוגיה ברמה מקיפה — יתרון',
      ]);
      expect(screen.queryByText('לפרטים על תנאי הקבלה, יש לבדוק באתר המוסד.')).toBeNull();

      view.unmount();
      render(await ProgramPage({ params: Promise.resolve({ programId: 'haifa_nursing' }) }));
      expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(haifaNotes);
      expect(screen.queryByRole('link', { name: 'לפרטים המלאים' })).toBeNull();
    });

    it('shows short linked fallbacks without bullets when requirements are absent', async () => {
      render(await ProgramPage({ params: Promise.resolve({ programId: 'nursing' }) }));
      const block = (name: string) => within(screen.getByRole('heading', { name }).parentElement!);
      const ariel = block(institutions.find((item) => item.id === 'ariel')!.name);
      expect(ariel.queryByRole('list')).toBeNull();
      expect(ariel.getByRole('link', { name: 'לפרטים על המסלול' }).getAttribute('href')).toBe(
        '/programs/ariel_nursing',
      );
      expect(ariel.queryByRole('link', { name: 'לאתר המוסד' })).toBeNull();
      const huji = block(institutions.find((item) => item.id === 'huji')!.name);
      expect(huji.queryByRole('list')).toBeNull();
      expect(huji.getByText('תנאי הקבלה מפורטים באתר המוסד.', { exact: false })).toBeTruthy();
      expect(huji.getByRole('link', { name: 'לאתר המוסד' }).getAttribute('href')).toContain(
        'huji.ac.il',
      );
      const noWebsite = block(unknown.name);
      expect(noWebsite.queryByRole('list')).toBeNull();
      expect(noWebsite.getByRole('link', { name: 'לדף המוסד' }).getAttribute('href')).toBe(
        '/institutions/test_no_website',
      );
    });

    it('keeps the existing placeholder on an institution-specific page without requirements', async () => {
      render(await ProgramPage({ params: Promise.resolve({ programId: 'ariel_nursing' }) }));
      expect(screen.getByRole('listitem').textContent).toBe(
        'לפרטים על תנאי הקבלה, יש לבדוק באתר המוסד.',
      );
      expect(screen.queryByRole('link', { name: 'לפרטים על המסלול' })).toBeNull();
    });

    it('keeps unlisted pages’ existing unavailable message', async () => {
      vi.mocked(listCataloguePrograms).mockResolvedValue({
        data: [{ ...general, isListed: false }],
        meta: {},
      });
      render(await ProgramPage({ params: Promise.resolve({ programId: 'nursing' }) }));
      expect(screen.getByText('אין כרגע מידע עדכני על המסלול.')).toBeTruthy();
      expect(screen.queryByRole('listitem')).toBeNull();
      expect(screen.queryByRole('link', { name: 'לפרטים המלאים' })).toBeNull();
    });
  });
});
