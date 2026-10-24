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
import repair from '@/data/admissions/catalogueContentRepair.json';
import { DANON_BEGINNER_REQUIREMENT } from '@/data/admissions/danon';
import * as publicCataloguePages from '@/lib/publicCataloguePages';
import * as institutionLinks from '@/lib/institutionLinks';

import ProgramPage, { generateMetadata } from './page';

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
  it('renders Danon’s culinary programme link and the existing beginner note', async () => {
    render(await ProgramPage({ params: Promise.resolve({ programId: 'danon_culinary' }) }));
    expect(screen.getByRole('link', { name: 'לאתר המוסד' }).getAttribute('href')).toBe(
      'https://www.danon.org.il/cuisine/?utm_source=myway&utm_medium=referral',
    );
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      DANON_BEGINNER_REQUIREMENT,
    ]);
    expect(screen.queryByText(/עודכן לאחרונה:/)).toBeNull();
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

  it('keeps the full Haifa heading without an adjacent institution label and deduplicates metadata', async () => {
    const props = { params: Promise.resolve({ programId: 'haifa_engineering' }) };
    render(await ProgramPage(props));

    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'הנדסה וטכנולוגיה - אוניברסיטת חיפה',
    });
    expect(heading.previousElementSibling?.textContent).toBe('הנדסה');
    expect(within(heading.parentElement!).queryByText('אוניברסיטת חיפה')).toBeNull();
    expect(await generateMetadata(props)).toMatchObject({
      title: 'הנדסה וטכנולוגיה – אוניברסיטת חיפה',
      alternates: { canonical: '/programs/haifa_engineering' },
    });
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

  it('shows the regular Haifa psychology floor and keeps Pasifas separate', async () => {
    render(await ProgramPage({ params: Promise.resolve({ programId: 'haifa_psychology' }) }));
    const items = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(items).toContain('סכם 650 לפחות; ציונים 630–649 נמצאים בטווח ההמתנה.');
    expect(items).toContain(
      'תוכנית פסיפס (מסלול נפרד עם החוג לפילוסופיה): סכם 680 לפחות + ראיון קבלה.',
    );
    expect(items.join(' ')).not.toMatch(
      /ציון פסיכומטרי מינימלי|ממוצע בגרות מינימלי|אופק|מילואים|תואר קודם|האוניברסיטה הפתוחה/,
    );
  });

  it.each(['afeka_ee', 'afeka_softwareeng', 'afeka_cs'])(
    'renders %s complete official route copy without the obsolete shell',
    async (programId) => {
      render(await ProgramPage({ params: Promise.resolve({ programId }) }));
      const items = screen.getAllByRole('listitem').map((item) => item.textContent);
      const program = getStaticCataloguePrograms().find((row) => row.id === programId)!;
      for (const note of program.admissionRequirements) expect(items).toContain(note);
      expect(items.join(' ')).toContain('כמותי 115 לפחות');
      expect(items.join(' ')).not.toMatch(
        /ממוצע בגרות מינימלי|ציון פסיכומטרי מינימלי|550|בדרך לאפקה|הנדסאי/,
      );
    },
  );

  describe('requirements checked line', () => {
    it.each([
      ['ono_law', 'ono', 'https://www.ono.ac.il/curriculum/llb/', '23.10.2026'],
      [
        'afeka_ee',
        'afeka',
        'https://www.afeka.ac.il/candidate/candidate-information-bsc/undergraduates/',
        '24.10.2026',
      ],
      [
        'afeka_softwareeng',
        'afeka',
        'https://www.afeka.ac.il/candidate/candidate-information-bsc/admission-and-registration-in-science/',
        '24.10.2026',
      ],
      [
        'afeka_cs',
        'afeka',
        'https://www.afeka.ac.il/candidate/candidate-information-bsc/admission-and-registration-in-science/',
        '24.10.2026',
      ],
      [
        'colmgmt_cs',
        'colman',
        'https://www.colman.ac.il/academics/ba/b-a-admission/',
        '23.10.2026',
      ],
      [
        'haifa_psychology',
        'haifa',
        'https://admissions.haifa.ac.il/social-sciences/program/3268/',
        '24.10.2026',
      ],
    ] as const)(
      'renders the packet stamp for %s and withholds it on note drift',
      async (programId, institutionId, sourceUrl, date) => {
        const institution = getStaticCatalogueInstitutions().find(
          (item) => item.id === institutionId,
        )!;
        const { unmount } = render(await ProgramPage({ params: Promise.resolve({ programId }) }));

        const sourceLink = screen.getByRole('link', { name: `אתר ${institution.name}` });
        expect(sourceLink.getAttribute('href')).toBe(
          `${sourceUrl}?utm_source=myway&utm_medium=referral`,
        );
        expect(sourceLink.closest('p')!.textContent).toBe(
          `עודכן לאחרונה: ${date} · מקור: אתר ${institution.name}`,
        );
        if (programId === 'colmgmt_cs') {
          expect(screen.getByRole('link', { name: 'לאתר המוסד' }).getAttribute('href')).toBe(
            'https://www.colman.ac.il/academics/ba/computer-science/?utm_source=myway&utm_medium=referral',
          );
        }
        unmount();

        const program = getStaticCataloguePrograms().find((item) => item.id === programId)!;
        vi.mocked(listCataloguePrograms).mockResolvedValue({
          data: [
            {
              ...program,
              institutionDetails: program.institutionDetails!.map((detail) => ({
                ...detail,
                specificAdmissionNotes: detail.specificAdmissionNotes.map((note) => `${note} `),
              })),
            },
          ],
          meta: { catalogueSource: 'database' },
        });
        render(await ProgramPage({ params: Promise.resolve({ programId }) }));
        expect(screen.queryByText(/עודכן לאחרונה:/)).toBeNull();
        expect(screen.queryByRole('link', { name: `אתר ${institution.name}` })).toBeNull();
      },
    );

    const entry = repair.requirements.find((row) => row.programId === 'bgu_psychology')!;
    const institution = getStaticCatalogueInstitutions().find((item) => item.id === 'bgu')!;
    const trackedSource = new URL(entry.sourceUrl);
    trackedSource.searchParams.set('utm_source', 'myway');
    trackedSource.searchParams.set('utm_medium', 'referral');

    it('renders the exact date and fetched source below the link row', async () => {
      render(await ProgramPage({ params: Promise.resolve({ programId: entry.programId }) }));

      const link = screen.getByRole('link', { name: `אתר ${institution.name}` });
      expect(link.getAttribute('href')).toBe(trackedSource.href);
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
      const line = link.closest('p')!;
      expect(line.textContent).toBe(`עודכן לאחרונה: 21.10.2026 · מקור: אתר ${institution.name}`);
      expect(line.getAttribute('dir')).toBe('rtl');
      expect(line.className).toBe(
        'mt-2 text-right text-xs leading-[18px] font-normal text-[var(--text-muted)]',
      );
      expect(line.previousElementSibling?.textContent).toBe('לאתר המוסד');
      expect(line.parentElement?.lastElementChild).toBe(line);
    });

    it.each(['different notes', 'no entry'])('hides the entire line for %s', async (reason) => {
      const program = getStaticCataloguePrograms().find((item) => item.id === entry.programId)!;
      const changed = {
        ...program,
        id: reason === 'no entry' ? 'program_without_repair' : program.id,
        institutionDetails: program.institutionDetails!.map((detail) => ({
          ...detail,
          specificAdmissionNotes: reason === 'different notes' ? ['תנאי קבלה חדש'] : entry.notes,
        })),
      };
      vi.mocked(listCataloguePrograms).mockResolvedValue({ data: [changed], meta: {} });
      render(await ProgramPage({ params: Promise.resolve({ programId: changed.id }) }));

      expect(screen.queryByText(/עודכן לאחרונה:/)).toBeNull();
      expect(screen.queryByRole('link', { name: `אתר ${institution.name}` })).toBeNull();
    });

    it('renders only the date when the presentation helper rejects the fetched URL', async () => {
      const institutionLink = institutionLinks.institutionLink;
      vi.spyOn(institutionLinks, 'institutionLink').mockImplementation((url, id, options) =>
        url === entry.sourceUrl && options?.fallbackToWebsite === false
          ? undefined
          : institutionLink(url, id, options),
      );
      render(await ProgramPage({ params: Promise.resolve({ programId: entry.programId }) }));

      expect(screen.getByText('עודכן לאחרונה: 21.10.2026').textContent).toBe(
        'עודכן לאחרונה: 21.10.2026',
      );
      expect(screen.queryByText(/מקור:/)).toBeNull();
      expect(screen.queryByRole('link', { name: `אתר ${institution.name}` })).toBeNull();
    });

    it('uses the own program’s entry in a general psychology institution block', async () => {
      render(await ProgramPage({ params: Promise.resolve({ programId: 'psychology' }) }));

      const block = within(screen.getByRole('heading', { name: institution.name }).parentElement!);
      expect(block.getByRole('link', { name: 'לפרטים המלאים' }).getAttribute('href')).toBe(
        '/programs/bgu_psychology',
      );
      expect(
        block.getByRole('link', { name: `אתר ${institution.name}` }).getAttribute('href'),
      ).toBe(trackedSource.href);
      expect(block.getByText(/עודכן לאחרונה:/).textContent).toBe(
        `עודכן לאחרונה: 21.10.2026 · מקור: אתר ${institution.name}`,
      );
    });

    it('keeps the line at the bottom when there is no link row', async () => {
      vi.spyOn(publicCataloguePages, 'getPublicProgramRequirementSources').mockResolvedValue({
        bgu: {
          program: getStaticCataloguePrograms().find((p) => p.id === entry.programId)!,
          sourceProgramId: entry.programId,
          requirements: entry.notes,
          checked: { date: '21.10.2026', sourceUrl: trackedSource.href },
        },
      });
      render(await ProgramPage({ params: Promise.resolve({ programId: entry.programId }) }));

      const line = screen.getByText(/עודכן לאחרונה:/);
      expect(screen.queryByRole('link', { name: 'לאתר המוסד' })).toBeNull();
      expect(line.parentElement?.lastElementChild).toBe(line);
      expect(line.classList.contains('mt-2')).toBe(true);
    });
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
      expect(
        within(screen.getByRole('heading', { name: 'תנאי קבלה' }).parentElement!)
          .getAllByRole('listitem')
          .map((li) => li.textContent),
      ).toEqual(haifaNotes);
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
      expect(
        within(screen.getByRole('heading', { name: 'תנאי קבלה' }).parentElement!).getByRole(
          'listitem',
        ).textContent,
      ).toBe('לפרטים על תנאי הקבלה, יש לבדוק באתר המוסד.');
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
