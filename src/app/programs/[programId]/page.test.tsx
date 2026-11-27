// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InstitutionId } from '@/data/institutions';
import type { CatalogueProgram } from '@/types/catalogue';

vi.mock('server-only', () => ({}));
vi.mock('@/env', () => ({ getCatalogueSourceMode: () => 'static' }));

const hoisted = vi.hoisted(() => ({
  capture: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('posthog-js', () => ({ default: { capture: hoisted.capture } }));

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    usePathname: () => '/',
    notFound: hoisted.notFound,
  };
});

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
import { hasPublishedCompositeThreshold } from '@/lib/publishedCompositeThresholds';
import { DANON_BEGINNER_REQUIREMENT } from '@/data/admissions/danon';
import { csAnswer, csComparisonRows, csFaq, csOfficialUrls } from '@/data/csComparison';
import * as publicCataloguePages from '@/lib/publicCataloguePages';
import * as institutionLinks from '@/lib/institutionLinks';
import { datascienceReferences } from '@/data/datascienceReferences';
import { psychologyComparisonRows, psychologyFaq } from '@/data/psychologyComparison';
import { haifaPsychologyOfekUrl } from '@/components/seo/HaifaPsychologyOfek';
import { prepFundingUrl } from '@/components/seo/PrepGuide';
import { lawBarOutcomes } from '@/data/lawBarOutcomes';
import { nursingInstitutions, nursingSource, nursingTrackLabels } from '@/data/nursingInstitutions';

import ProgramPage, { generateMetadata } from './page';
import { MEDICINE_ANSWER, MEDICINE_FAQS } from '@/components/MedicineAdmissionsGuide';
import { MEDICINE_ADMISSIONS } from '@/data/admissions/medicineAdmissions';

describe('ProgramPage', () => {
  it('isolates the engineering atuda year range in its inbound link', async () => {
    render(await ProgramPage({ params: Promise.resolve({ programId: 'engineering' }) }));
    const link = screen.getByRole('link', {
      name: /עתודה אקדמית: מגמות הנדסה, תוכניות עילית ומועדי\s2027–2028/,
    });
    expect(link.getAttribute('href')).toBe('/atuda');
    const year = link.querySelector('bdi[dir="ltr"]');
    expect(year?.textContent).toBe('2027–2028');
    expect(year?.parentElement?.className).toContain('whitespace-nowrap');
    expect(year?.parentElement?.textContent).toMatch(/ומועדי\u00A02027–2028/);
    const label = year?.parentElement?.parentElement;
    expect(label?.tagName).toBe('SPAN');
    expect(label?.parentElement).toBe(link);
    expect(label?.classList.contains('whitespace-nowrap')).toBe(false);
    expect(label?.textContent).toMatch(/עילית ומועדי\u00A02027–2028/);
    expect(link.textContent).toMatch(/ומועדי\u00A02027–2028/);
    expect(link.textContent).not.toMatch(/ומועדי2027/);
    const calculator = screen.getByRole('link', { name: 'איך מחשבון סיכויי הקבלה עובד' });
    expect(calculator.parentElement).toBe(link.parentElement);
    expect(link.parentElement?.className).toContain('gap-x-6');
  });

  it.each([
    ['ee', 'לומדים חשמל בעתודה? מסלול ״דיגמא״ ותוכניות ״פסגות״ ו״רעמים״'],
    ['cs', 'מדעי המחשב בעתודה (מסלול ״אמירים״): מוסדות ומועדים'],
    ['softwareeng', 'הנדסת תוכנה בעתודה: מוסדות ותוכנית ״פסגות״'],
  ] as const)('keeps the %s atuda link from joining a word to a year', async (programId, name) => {
    render(await ProgramPage({ params: Promise.resolve({ programId }) }));
    const link = screen.getByRole('link', { name });
    expect(link.getAttribute('href')).toBe('/atuda');
    expect(link.textContent).not.toMatch(/[א-ת]\d/);
  });

  it.each([
    ['telhai_nursing', '/programs/nursing'],
    ['ono_socialwork', '/programs/social_work'],
    ['tlvyaffo_socialwork', '/programs/social_work'],
  ] as const)('permanently redirects %s to %s', async (programId, destination) => {
    await expect(ProgramPage({ params: Promise.resolve({ programId }) })).rejects.toMatchObject({
      digest: `NEXT_REDIRECT;replace;${destination};308;`,
    });
  });

  it('keeps the legacy Ono URL open with a link to Ono and no programme claims', async () => {
    const params = Promise.resolve({ programId: 'ono_medicine' });
    const { container } = render(await ProgramPage({ params }));
    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'הלימודים בקריה האקדמית אונו' })).toBeTruthy();
    expect(within(main).getAllByRole('link')).toHaveLength(1);
    expect(
      within(main).getByRole('link', { name: 'למסלולי הלימוד באונו' }).getAttribute('href'),
    ).toBe('/institutions/ono');
    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
    expect(await generateMetadata({ params })).toMatchObject({
      robots: { index: false, follow: true },
    });
  });

  it('renders all first-time law results, 12 law links, and matching hub schema', async () => {
    const { container } = render(
      await ProgramPage({ params: Promise.resolve({ programId: 'law' }) }),
    );
    const institutions = screen.getByRole('heading', { name: 'מוסדות לימוד' }).closest('section')!;
    const institutionLinks = within(institutions)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('/programs/'));
    expect(institutionLinks.map((link) => link.getAttribute('href'))).toEqual([
      '/programs/tau_law',
      '/programs/huji_law',
      '/programs/haifa_law',
      '/programs/biu_law',
      '/programs/reichman_law',
      '/programs/colmgmt_law',
      '/programs/ono_law',
      '/programs/sapir_law',
      '/programs/peres_law',
      '/programs/ramat_gan_law',
      '/programs/netanya_law',
      '/programs/shaare_mishpat_law',
    ]);
    const section = container.querySelector('#bar-pass-rates')!;
    expect(section).toBeTruthy();
    expect(
      institutions.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const table = within(section as HTMLElement).getByRole('table');
    expect(table.querySelectorAll('tbody tr')).toHaveLength(16);
    expect(table.querySelector('caption')?.textContent).toBe(lawBarOutcomes.caption);
    expect(table.querySelector('caption a')).toBeNull();
    expect(
      within(table).getByRole('rowheader', { name: 'אוניברסיטת רייכמן' }).parentElement
        ?.textContent,
    ).toContain('37');
    for (const name of [
      'עולים מחו"ל',
      'ישראלי שלמד בחו"ל',
      'המכללה האקדמית צפת',
      'המרכז האקדמי כרמל',
    ]) {
      expect(within(table).getByRole('rowheader', { name }).querySelector('a')).toBeNull();
    }
    expect(section.textContent).toContain(lawBarOutcomes.total);
    const graph = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!,
    )['@graph'];
    const faq = graph.find((node: { '@type': string }) => node['@type'] === 'FAQPage');
    const dataset = graph.find((node: { '@type': string }) => node['@type'] === 'Dataset');
    const programme = graph.find(
      (node: { '@type': string }) => node['@type'] === 'EducationalOccupationalProgram',
    );
    expect(faq.mainEntity[0].name).toBe(lawBarOutcomes.question);
    expect(faq.mainEntity[0].acceptedAnswer.text).toBe(lawBarOutcomes.answer);
    expect(dataset.description).toBe(table.querySelector('caption')?.textContent);
    expect(dataset.datePublished).toBe('2026-07-16');
    expect(programme.provider).toHaveLength(12);
    expect(await generateMetadata({ params: Promise.resolve({ programId: 'law' }) })).toMatchObject(
      {
        title: 'לימודי משפטים: תנאי קבלה וסיכויי קבלה',
        description:
          'משפטים ב-12 מוסדות לימוד: תנאי קבלה, שיעורי מעבר בבחינת הלשכה במועד קיץ 2026, ובדיקת סיכויי קבלה ב-MyWay. התנאים המחייבים באתר המוסד.',
        alternates: { canonical: '/programs/law' },
      },
    );
  });

  it.each(lawBarOutcomes.rows.filter((row) => 'programId' in row))(
    'renders the dated law outcome after admissions on $programId',
    async (row) => {
      if (!('programId' in row)) return;
      const { container } = render(
        await ProgramPage({ params: Promise.resolve({ programId: row.programId }) }),
      );
      const admission = screen.getByRole('heading', { name: 'תנאי קבלה' }).closest('section')!;
      const line = screen.getByText(/בחינת ההסמכה בכתב של לשכת עורכי הדין/).closest('section')!;
      expect(
        admission.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(line.textContent).toContain(
        `${row.passed} עוברים מתוך ${row.candidates} נבחנים, שיעור מעבר ${row.rate}%`,
      );
      expect(within(line).getByRole('link', { name: 'עמוד משפטים' }).getAttribute('href')).toBe(
        '/programs/law#bar-pass-rates',
      );
      const graph = JSON.parse(
        container.querySelector('script[type="application/ld+json"]')!.textContent!,
      )['@graph'];
      expect(graph.some((node: { '@type': string }) => node['@type'] === 'FAQPage')).toBe(false);
    },
  );
  it('renders the sourced medicine comparison and matching FAQ schema in initial HTML', async () => {
    const { container } = render(
      await ProgramPage({ params: Promise.resolve({ programId: 'medicine' }) }),
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'לימודי רפואה שש־שנתיים: איך מתקבלים בכל אוניברסיטה',
    );
    expect(container.querySelector('main h1 + p')?.textContent).toBe(MEDICINE_ANSWER);
    expect(MEDICINE_ANSWER.split(/\s+/).length).toBeGreaterThanOrEqual(40);
    expect(MEDICINE_ANSWER.split(/\s+/).length).toBeLessThanOrEqual(60);
    const table = container.querySelector('table#medicine-admission-table');
    expect(table?.querySelectorAll('tbody tr')).toHaveLength(5);
    expect(table?.textContent).toContain('25.186');
    expect(table?.textContent).toContain('30.04.2027');
    expect(table?.textContent).toContain('מבחן ממוחשב');
    expect(table?.textContent).not.toMatch(/735|730|206|25\.783/);
    expect(table?.querySelectorAll('a[href^="/programs/"]')).toHaveLength(5);
    expect(table?.querySelectorAll('a[href^="https://"]')).toHaveLength(0);
    expect(table?.textContent).not.toMatch(/מקור|נבדק|עודכן לאחרונה/);
    expect(container.querySelector('main')?.textContent).not.toContain('סף זימון משוער למבחן מו״ר');
    expect(
      screen.getByRole('link', { name: 'בדקו את הסיכויים שלכם לרפואה' }).getAttribute('href'),
    ).toBe('/calculator');
    const graph = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!,
    );
    const faq = graph['@graph'].find((node: { '@type': string }) => node['@type'] === 'FAQPage');
    expect(faq.mainEntity).toHaveLength(4);
    const visible = [...container.querySelectorAll('details')].map((detail) => ({
      question: detail.querySelector('summary')?.textContent?.trim(),
      answer: detail.querySelector('p')?.textContent?.trim(),
    }));
    expect(visible).toEqual(MEDICINE_FAQS.map(({ question, answer }) => ({ question, answer })));
    expect(
      faq.mainEntity.map((item: { name: string; acceptedAnswer: { text: string } }) => ({
        question: item.name,
        answer: item.acceptedAnswer.text,
      })),
    ).toEqual(visible);
    expect(
      await generateMetadata({ params: Promise.resolve({ programId: 'medicine' }) }),
    ).toMatchObject({
      title: { absolute: 'לימודי רפואה: שלבי הקבלה, ציוני סף ומועדים בכל אוניברסיטה | MyWay' },
      alternates: { canonical: '/programs/medicine' },
    });
  });
  it.each(MEDICINE_ADMISSIONS)(
    'shows the same medicine stage facts and hub backlink on $programId',
    async (row) => {
      const { container } = render(
        await ProgramPage({ params: Promise.resolve({ programId: row.programId }) }),
      );
      const section = screen
        .getByRole('heading', { level: 2, name: `שלבי הקבלה לרפואה — ${row.institution}` })
        .closest('section')!;
      const table = within(section).getByRole('table');
      expect(table.querySelectorAll('tbody tr')).toHaveLength(1);
      expect(table.textContent).toContain(row.institution);
      for (const cell of [
        row.minimumPsychometric,
        row.stageOne,
        row.screening,
        row.screeningWeight,
        row.lastFinal,
        row.registrationDeadline,
        row.lastPsychometricSitting,
      ]) {
        if (cell.kind === 'value') expect(table.textContent).toContain(cell.text);
      }
      expect(table.querySelectorAll('a[href^="https://"]')).toHaveLength(0);
      expect(
        within(section)
          .getByRole('link', {
            name: 'השוואת שלבי הקבלה לרפואה בכל האוניברסיטאות',
          })
          .getAttribute('href'),
      ).toBe('/programs/medicine#medicine-admission-table');
      expect(table.textContent).not.toMatch(/נבדק|עודכן לאחרונה/);
      for (const note of row.childNotes)
        expect(container.querySelector('main')?.textContent).toContain(note);
    },
  );
  it.each([
    ['beit_berl_ai_education', 'בינה מלאכותית וחינוך (B.A.)', '(B.A.)'],
    ['david_yellin_non_formal_education', 'חינוך בלתי פורמלי במסלול העל־יסודי (B.Ed.)', '(B.Ed.)'],
  ])(
    'preserves the qualification punctuation in %s headings and related links',
    async (programId, name, qualification) => {
      const { container } = render(await ProgramPage({ params: Promise.resolve({ programId }) }));
      const heading = screen.getByRole('heading', { level: 1, name });
      const relatedLink = container.querySelector('section[aria-labelledby="related-title"] > a');
      expect(heading.querySelector('bdi[dir="ltr"]')?.textContent).toBe(qualification);
      expect(relatedLink?.querySelector('bdi[dir="ltr"]')?.textContent).toBe(qualification);
      expect(heading.closest('[dir="rtl"]')?.className).toContain('text-right');
    },
  );

  it.each([
    ['technion_ee', 91.5],
    ['technion_me', 87],
  ] as const)(
    'renders %s winter cutoff before other requirements and spring availability',
    async (programId, cutoff) => {
      render(await ProgramPage({ params: Promise.resolve({ programId }) }));
      const winter = screen.getAllByRole('listitem')[0];
      expect(winter.textContent).toBe(`בחורף תשפ"ז: סכם ${cutoff}`);
      expect(winter.closest('[dir="rtl"]')?.className).toContain('text-right');
      if (programId === 'technion_ee') {
        const spring = screen.getByText(
          'באביב תשפ"ז, על בסיס מקום פנוי: סכם 94 — מספר המקומות מצומצם',
        );
        expect(
          winter.compareDocumentPosition(spring) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
        expect(
          screen.queryByText('באביב תשפ"ז: 94 — על בסיס מקום פנוי, מספר המקומות מצומצם'),
        ).toBeNull();
      } else {
        expect(screen.queryByText(/באביב תשפ/)).toBeNull();
      }
      expect(screen.queryByRole('link', { name: 'הטכניון' })).toBeNull();
    },
  );

  beforeEach(() => {
    hoisted.capture.mockReset();
    vi.mocked(listCataloguePrograms).mockResolvedValue({
      data: getStaticCataloguePrograms(),
      meta: {},
    });
    vi.mocked(listCatalogueInstitutions).mockResolvedValue({
      data: getStaticCatalogueInstitutions(),
      meta: {},
    });
  });

  it('renders the sourced nursing hub with 15 programme rows and matching FAQ schema', async () => {
    const params = Promise.resolve({ programId: 'nursing' });
    const { container } = render(await ProgramPage({ params }));
    const heading = screen.getByRole('heading', { name: 'סיעוד', level: 1 });
    expect(heading.nextElementSibling?.textContent).toContain('ברשימת משרד הבריאות יש 15 מסגרות');
    expect(heading.nextElementSibling?.textContent).toContain('ב-13 מהן יש גם מסלול הסבת אקדמאים');
    expect(heading.nextElementSibling?.textContent).toContain(
      'ובאוניברסיטת תל אביב ובאוניברסיטה העברית גם עתודה אקדמית (פסגה)',
    );
    expect(heading.nextElementSibling?.textContent).not.toMatch(/ארבע שנים|4 שנים/);
    const table = screen.getByRole('table', { name: /כל המוסדות ברשימת משרד הבריאות/ });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(15);

    for (const [index, row] of rows.entries()) {
      const source = nursingInstitutions[index];
      expect(within(row).getByRole('rowheader').textContent).toBe(source.institution);
      expect(within(row).getAllByRole('cell')[0].textContent).toBe(
        source.tracks.map((track) => nursingTrackLabels[track]).join(' · '),
      );
      expect(within(row).queryByRole('link', { name: 'לאתר המוסד' })).toBeNull();
      expect(within(row).queryByRole('link', { name: 'ידיעון האוניברסיטה (PDF)' })).toBeNull();
      if (source.programId) {
        const programme = await publicCataloguePages.getPublicProgramPageData(source.programId);
        expect(programme?.program.isListed).not.toBe(false);
        expect(programme?.program.name).toBe('סיעוד');
        expect(within(row).getByRole('link', { name: 'עמוד המסלול' }).getAttribute('href')).toBe(
          `/programs/${source.programId}`,
        );
      }
    }

    const tau = within(rows[0]).getByRole('link', { name: 'תנאי קבלה בעמוד הזה' });
    expect(tau.getAttribute('href')).toBe('#tau');
    expect(container.querySelector('#tau h3')?.textContent).toBe('אוניברסיטת תל אביב');
    expect(table.closest('section')?.querySelector(`a[href="${nursingSource.url}"]`)).toBeNull();
    expect(table.textContent).not.toMatch(/\d|נבדק|עודכן/);
    expect(container.innerHTML).not.toMatch(/telhai_nursing|תל[- ]חי/);

    const metadata = await generateMetadata({ params });
    expect(metadata.title).toBe('לימודי סיעוד: איפה לומדים ותנאי קבלה');
    expect(metadata.openGraph?.title).toBe(metadata.title);
    expect(metadata.description).toContain('כל 15 המסגרות');
    expect(metadata.alternates?.canonical).toBe('/programs/nursing');

    const graph = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!,
    )['@graph'];
    const faq = graph.filter((node: { '@type': string }) => node['@type'] === 'FAQPage');
    expect(faq).toHaveLength(1);
    expect(faq[0]['@id']).toBe('https://findmyway.co.il/programs/nursing#faq');
    expect(faq[0].mainEntity).toHaveLength(3);
    expect(
      faq[0].mainEntity.flatMap((item: { name: string; acceptedAnswer: { text: string } }) => [
        item.name,
        item.acceptedAnswer.text,
      ]),
    ).toEqual(
      [...container.querySelectorAll('#faq dt, #faq dd')].map((entry) => entry.textContent),
    );
  });

  it.each(['medicine', 'physiotherapy', 'occupational_therapy'])(
    'links from the %s subject to the nursing guide',
    async (programId) => {
      const { container } = render(await ProgramPage({ params: Promise.resolve({ programId }) }));
      const related = within(container.querySelector('main')!).getByRole('link', {
        name: 'לימודי סיעוד: איפה לומדים ותנאי קבלה',
      });
      expect(related.getAttribute('href')).toBe('/programs/nursing');
    },
  );

  it.each(nursingInstitutions.flatMap(({ programId }) => (programId ? [programId] : [])))(
    'links from the %s programme requirements to the nursing guide',
    async (programId) => {
      const { container } = render(await ProgramPage({ params: Promise.resolve({ programId }) }));
      const requirements = within(container)
        .getByRole('heading', { name: 'תנאי קבלה' })
        .closest('section')!;
      const hub = within(requirements).getByRole('link', { name: 'כל המוסדות ללימודי סיעוד' });
      expect(hub.getAttribute('href')).toBe('/programs/nursing');
    },
  );

  it('renders the sourced nine-row psychology comparison and matching visible FAQ schema', async () => {
    const { container } = render(
      await ProgramPage({ params: Promise.resolve({ programId: 'psychology' }) }),
    );
    const table = screen.getByRole('table', { name: /תנאי קבלה לתואר ראשון/ });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(9);
    for (const [index, row] of rows.entries()) {
      const source = psychologyComparisonRows[index];
      expect(within(row).getByRole('link', { name: source.institution }).getAttribute('href')).toBe(
        `/programs/${source.programId}`,
      );
      expect(row.textContent).not.toContain(source.checkedDate);
      expect(within(row).queryByRole('link', { name: 'לאתר המוסד' })).toBeNull();
    }
    expect(table.textContent).toContain('מסלול אופק ללא פסיכומטרי');
    const huji = rows.find((row) => row.textContent?.includes('האוניברסיטה העברית בירושלים'))!;
    const hujiBagrut = huji.querySelectorAll('td')[1];
    expect(hujiBagrut.textContent).toContain('113');
    expect(hujiBagrut.textContent).toContain('109.5');
    expect(hujiBagrut.textContent).not.toContain('—');
    expect(table.textContent).toContain('ציון התאמה: סף קבלה 660, סף דחייה 659');
    expect(container.textContent).not.toMatch(/נכון ל/);
    expect(table.textContent).toContain('מדעי ההתנהגות (B.A.)');
    const ariel = rows.find((row) => row.textContent?.includes('אוניברסיטת אריאל'))!;
    expect(ariel.textContent).toContain('תנאי הקבלה הנוכחיים לא אומתו');
    expect(ariel.querySelectorAll('td')[1].textContent).toContain('לא אומת');
    expect(ariel.textContent).not.toContain('97');
    expect(
      within(table)
        .getByRole('link', { name: 'הקריה האקדמית אונו — מדעי ההתנהגות (B.A.)' })
        .querySelector('bdi[dir="ltr"]')?.textContent,
    ).toBe('(B.A.)');
    expect(screen.queryByRole('heading', { name: 'מוסדות לימוד' })).toBeNull();
    const graph = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!,
    )['@graph'];
    const psychologyProgram = graph.find(
      (node: { '@type': string }) => node['@type'] === 'EducationalOccupationalProgram',
    );
    expect(psychologyProgram.provider).toHaveLength(8);
    expect(
      psychologyProgram.provider.some((provider: { name: string }) =>
        provider.name.includes('אונו'),
      ),
    ).toBe(false);
    const faq = graph.find((node: { '@type': string }) => node['@type'] === 'FAQPage');
    expect(
      faq.mainEntity.map((item: { name: string; acceptedAnswer: { text: string } }) => [
        item.name,
        item.acceptedAnswer.text,
      ]),
    ).toEqual(psychologyFaq.map(({ question, answer }) => [question, answer]));
    const visibleFaq = screen.getByRole('heading', { name: 'שאלות נפוצות' }).closest('section')!;
    expect([...visibleFaq.querySelectorAll('dt, dd')].map((node) => node.textContent)).toEqual(
      psychologyFaq.flatMap(({ question, answer }) => [question, answer]),
    );
  });

  it('keeps the Ono programme degree identity and Haifa conditional Ofek route visible', async () => {
    const ono = render(
      await ProgramPage({ params: Promise.resolve({ programId: 'ono_psychology' }) }),
    );
    expect(screen.getByRole('heading', { level: 1, name: 'מדעי ההתנהגות (B.A.)' })).toBeTruthy();
    expect(ono.container.textContent).toContain('לא תואר ראשון בפסיכולוגיה');
    ono.unmount();
    render(await ProgramPage({ params: Promise.resolve({ programId: 'haifa_psychology' }) }));
    const ofek = screen
      .getByRole('heading', { name: 'מסלול אופק בפסיכולוגיה — ללא פסיכומטרי' })
      .closest('section')!;
    expect(ofek.textContent).toContain('לומדים על תנאי');
    expect(ofek.textContent).toContain('2–3 קורסים בציון 75 לפחות');
    expect(ofek.querySelector('bdi[dir="ltr"]')?.textContent).toBe('2–3');
    expect(ofek.querySelector('a')).toBeNull();
    expect(haifaPsychologyOfekUrl).toMatch(/^https:\/\/admissions\.haifa\.ac\.il\//);
    const related = screen.getByRole('heading', { name: 'מסלולים נוספים' }).closest('section')!;
    expect(within(related).queryByRole('link', { name: /אונו/ })).toBeNull();
  });

  it('serves the sourced Ono page through the existing static route fallback when the active catalogue lacks it', async () => {
    vi.mocked(listCataloguePrograms).mockResolvedValue({
      data: getStaticCataloguePrograms().filter((program) => program.id !== 'ono_psychology'),
      meta: { catalogueSource: 'database' },
    });
    render(await ProgramPage({ params: Promise.resolve({ programId: 'ono_psychology' }) }));
    expect(screen.getByRole('heading', { level: 1, name: 'מדעי ההתנהגות (B.A.)' })).toBeTruthy();
    expect(screen.getByText(/לא תואר ראשון בפסיכולוגיה/)).toBeTruthy();
  });

  it('corrects the stale Ono psychology label in DB-mode presentation without claiming Ono awards a psychology BA', async () => {
    vi.mocked(listCataloguePrograms).mockResolvedValue({
      data: getStaticCataloguePrograms().map((program) =>
        program.id === 'ono_psychology'
          ? { ...program, name: 'פסיכולוגיה', admissionRequirements: ['תנאים ישנים'] }
          : program,
      ),
      meta: { catalogueSource: 'database' },
    });
    const ono = render(
      await ProgramPage({ params: Promise.resolve({ programId: 'ono_psychology' }) }),
    );
    expect(screen.getByRole('heading', { level: 1, name: 'מדעי ההתנהגות (B.A.)' })).toBeTruthy();
    expect(ono.container.textContent).not.toContain('תנאים ישנים');
    ono.unmount();
    const hub = render(await ProgramPage({ params: Promise.resolve({ programId: 'psychology' }) }));
    const graph = JSON.parse(
      hub.container.querySelector('script[type="application/ld+json"]')!.textContent!,
    )['@graph'];
    const psychologyProgram = graph.find(
      (node: { '@type': string }) => node['@type'] === 'EducationalOccupationalProgram',
    );
    expect(psychologyProgram.provider).toHaveLength(8);
    expect(
      psychologyProgram.provider.some((provider: { name: string }) =>
        provider.name.includes('אונו'),
      ),
    ).toBe(false);
  });

  it('shows seven prep comparisons with only verified facts and a Bagrut calculator link', async () => {
    const { container } = render(
      await ProgramPage({ params: Promise.resolve({ programId: 'prep' }) }),
    );

    const table = screen.getByRole('table', { name: 'השוואת מכינות' });
    expect(within(table).getAllByRole('row')).toHaveLength(8);
    expect(within(table).getByText('תעודת הבגרות')).toBeTruthy();
    expect(within(table).getByText('500 לפחות בפסיכומטרי או במימ״ד')).toBeTruthy();
    for (const id of ['biu_prep', 'ruppin_prep', 'sapir_prep', 'sce_prep']) {
      const row = table.querySelector(`a[href="/programs/${id}"]`)!.closest('tr')!;
      expect(row.querySelectorAll('td')).toHaveLength(4);
      expect([...row.querySelectorAll('td')].slice(0, 4).every((cell) => !cell.textContent)).toBe(
        true,
      );
    }
    expect(
      screen.getByRole('link', { name: 'חישוב סכם מהבגרות והפסיכומטרי' }).getAttribute('href'),
    ).toBe('/sekhem-calculator');
    expect(screen.queryByText(/ציון מכינה במחשבון/)).toBeNull();
    expect(screen.queryByText(/נבדק|עודכן לאחרונה/)).toBeNull();
    expect(screen.getByRole('heading', { name: 'סיוע במימון המכינה' })).toBeTruthy();
    expect(
      screen.queryByRole('link', { name: 'תנאי הזכאות ואופן ההגשה באתר משרד הביטחון' }),
    ).toBeNull();
    expect(prepFundingUrl).toMatch(/mod\.gov\.il/);
    expect(container.textContent).toContain('80%');
    const faq = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!,
    )['@graph'][0];
    const visibleFaq = screen.getByRole('heading', { name: 'שאלה נפוצה' }).closest('section')!;
    expect([
      visibleFaq.querySelector('dt')?.textContent,
      visibleFaq.querySelector('dd')?.textContent,
    ]).toEqual([faq.mainEntity[0].name, faq.mainEntity[0].acceptedAnswer.text]);
  });

  it('links verified prep children to their mechina pages and removes Sapir’s law link', async () => {
    for (const [programId, path] of [
      ['huji_prep', 'mechina.huji.ac.il/'],
      ['braude_prep', 'w3.braude.ac.il/department/mechina/'],
      ['telhai_prep', 'www.telhai.ac.il/%D7%9E%D7%9B%D7%99%D7%A0%D7%94_'],
    ]) {
      const { unmount } = render(await ProgramPage({ params: Promise.resolve({ programId }) }));
      expect(screen.getByRole('link', { name: 'לאתר המוסד' }).getAttribute('href')).toContain(path);
      expect(screen.getByRole('link', { name: 'השוואת כל המכינות' }).getAttribute('href')).toBe(
        '/programs/prep',
      );
      unmount();
    }
    render(await ProgramPage({ params: Promise.resolve({ programId: 'sapir_prep' }) }));
    expect(screen.queryByRole('link', { name: 'לאתר המוסד' })).toBeNull();
    expect(screen.getByRole('link', { name: 'השוואת כל המכינות' })).toBeTruthy();
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
    expect(screen.queryByRole('link', { name: 'בדקו אם אתם מתקבלים' })).toBeNull();
    expect(screen.getByRole('link', { name: 'מה מתאים לי?' })).toBeTruthy();
  });

  it('omits the removed Ono note rather than rendering an empty list item', async () => {
    const { container } = render(
      await ProgramPage({ params: Promise.resolve({ programId: 'ono_law' }) }),
    );
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 39)
    expect(
      screen.queryByText(
        'המחשבון בודק רק ממוצע בגרות ופסיכומטרי. מסלול גיל 30+, תואר קודם ואפיק המעבר לא נבדקים בו.',
      ),
    ).toBeNull();
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 39)
    expect([...container.querySelectorAll('li')].every((item) => item.textContent?.trim())).toBe(
      true,
    );
    expect(screen.getByText(/אפיק מעבר לאקדמיה:/)).toBeTruthy();
  });
  it('renders public program content and links into app routes', async () => {
    const program = getStaticCataloguePrograms()[0];

    render(await ProgramPage({ params: Promise.resolve({ programId: program.id }) }));

    expect(screen.getByRole('heading', { name: program.name })).toBeTruthy();
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 37)
    expect(screen.getByRole('link', { name: 'בדקו מסלולים נתמכים' }).getAttribute('href')).toBe(
      `/app/calculator?program=${encodeURIComponent(program.id)}`,
    );
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 38)
    expect(screen.getByRole('link', { name: 'מה מתאים לי?' }).getAttribute('href')).toBe(
      '/app/assessment',
    );
    expect(screen.queryByText('savedProgramIds')).toBeNull();
  });

  it('renders the approved data science comparison before institution cards with its metadata', async () => {
    const { container } = render(
      await ProgramPage({ params: Promise.resolve({ programId: 'datascience' }) }),
    );
    expect(screen.getByRole('heading', { level: 1, name: 'מדעי הנתונים' })).toBeTruthy();
    const comparison = screen
      .getByRole('heading', {
        name: 'מדעי הנתונים או מדעי המחשב — מה מתאים לכם?',
      })
      .closest('section')!;
    expect(comparison.textContent).toContain(
      'רוצים לבנות תוכנות ומערכות, או להפיק תובנות מנתונים?',
    );
    const table = within(comparison).getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(
      within(table).getByRole('rowheader', { name: 'נושאים שכדאי לחפש בתוכנית' }),
    ).toBeTruthy();
    expect(
      within(comparison)
        .getByRole('link', { name: 'השוו תוכניות במדעי המחשב' })
        .getAttribute('href'),
    ).toBe('/programs/cs');
    expect(
      within(comparison)
        .getByRole('link', { name: 'בדקו את הציונים שלכם במחשבון הסכם' })
        .getAttribute('href'),
    ).toBe('/sekhem-calculator');
    expect(
      within(comparison).queryByRole('link', { name: 'על ההבדל בין התחומים — האקדמית גליל מערבי' }),
    ).toBeNull();
    expect(
      within(comparison).queryByRole('link', {
        name: 'מדע הנתונים — המסלול האקדמי המכללה למינהל',
      }),
    ).toBeNull();
    expect(datascienceReferences.galilee).toMatch(/wgalil\.ac\.il/);
    expect(datascienceReferences.colman).toMatch(/colman\.ac\.il/);
    expect(screen.queryByRole('link', { name: 'בדקו אם אתם מתקבלים' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'חשבו סכם לתוכנית הזו' })).toBeNull();
    const institutions = screen.getByRole('heading', { name: 'מוסדות לימוד' });
    expect(
      comparison.compareDocumentPosition(institutions) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(container.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1);
    expect(
      await generateMetadata({ params: Promise.resolve({ programId: 'datascience' }) }),
    ).toMatchObject({
      title: 'מדעי הנתונים: השוואת מסלולים ותנאי קבלה',
      description:
        'השוו מסלולי לימוד במדעי הנתונים, הבינו את ההבדל ממדעי המחשב ובדקו את תנאי הקבלה של התוכניות שמעניינות אתכם.',
      alternates: { canonical: '/programs/datascience' },
    });
  });

  it('does not promise the old TAU calculator route from the electrical engineering hub', async () => {
    render(await ProgramPage({ params: Promise.resolve({ programId: 'ee' }) }));
    expect(screen.queryByRole('link', { name: 'בדקו אם אתם מתקבלים' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'חשבו סכם לתוכנית הזו' })).toBeNull();
    expect(
      screen
        .getAllByRole('listitem')
        .map((item) => item.textContent)
        .join(' '),
    ).toContain('5 יחידות בציון 90 לפחות או 4 יחידות בציון 95');
  });

  it('renders the reciprocal comparison only on the CS hub', async () => {
    render(await ProgramPage({ params: Promise.resolve({ programId: 'cs' }) }));
    const comparison = screen
      .getByRole('heading', {
        name: 'מתלבטים בין מדעי המחשב למדעי הנתונים?',
      })
      .closest('section')!;
    expect(comparison.textContent).toContain(
      'מדעי המחשב מתמקדים בפיתוח תוכנה, אלגוריתמים ומערכות. במדעי הנתונים הדגש הוא על ניתוח מידע, סטטיסטיקה ולמידת מכונה. השוו את תוכני הלימוד ואת תנאי הקבלה בשני התחומים.',
    );
    expect(
      within(comparison)
        .getByRole('link', { name: 'להשוואה עם מדעי הנתונים' })
        .getAttribute('href'),
    ).toBe('/programs/datascience');
    expect(await generateMetadata({ params: Promise.resolve({ programId: 'cs' }) })).toMatchObject({
      title: 'לימודי מדעי המחשב: תנאי קבלה וסיכויי קבלה',
      description: expect.stringContaining('ספי הקבלה למדעי המחשב'),
      alternates: { canonical: '/programs/cs' },
    });
  });

  it('renders the sourced CS table, preserves 15 cards, and matches visible FAQ to JSON-LD', async () => {
    const { container } = render(
      await ProgramPage({ params: Promise.resolve({ programId: 'cs' }) }),
    );
    const answer = screen.getByText(csAnswer);
    const table = screen.getByRole('table', {
      name: 'ספי קבלה למדעי המחשב לפי מוסד ומסלול קבלה',
    });
    expect(answer.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(11);
    for (const [index, row] of rows.entries()) {
      const source = csComparisonRows[index];
      expect(within(row).getByRole('link', { name: source.institution }).getAttribute('href')).toBe(
        `/programs/${source.programId}`,
      );
      expect(within(row).queryByRole('link', { name: 'אתר המוסד' })).toBeNull();
      expect(row.textContent).not.toContain(source.checkedDate);
      expect(row.textContent).toContain(source.value);
    }
    expect(container.querySelector('#cs-thresholds')).toBeTruthy();
    const cards = screen.getByRole('heading', { name: 'מוסדות לימוד' }).nextElementSibling!;
    expect(cards.children).toHaveLength(15);
    expect(
      screen.getByRole('heading', { name: 'מתלבטים בין מדעי המחשב למדעי הנתונים?' }),
    ).toBeTruthy();
    expect(container.querySelector('main')!.textContent).not.toContain('108');
    expect(container.querySelector('main')!.textContent).toContain('ממוצע בגרות 104');
    const graph = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!,
    )['@graph'];
    const faq = graph.find((node: { '@type': string }) => node['@type'] === 'FAQPage');
    expect(faq['@id']).toBe('https://findmyway.co.il/programs/cs#cs-faq');
    expect(
      faq.mainEntity.map((item: { name: string; acceptedAnswer: { text: string } }) => [
        item.name,
        item.acceptedAnswer.text,
      ]),
    ).toEqual(csFaq.map(({ question, answer }) => [question, answer]));
    const visibleFaq = container.querySelector('#cs-faq')!;
    expect([...visibleFaq.querySelectorAll('dt, dd')].map((node) => node.textContent)).toEqual(
      csFaq.flatMap(({ question, answer }) => [question, answer]),
    );
    expect(
      within(visibleFaq as HTMLElement)
        .getByRole('link', { name: 'בלי פסיכומטרי' })
        .getAttribute('href'),
    ).toBe('/without-psychometric');
  });

  it('uses direct official admissions links on the CS hub and links all eight child pages back', async () => {
    const hub = render(await ProgramPage({ params: Promise.resolve({ programId: 'cs' }) }));
    const admissionSection = screen.getByRole('heading', { name: 'תנאי קבלה' }).closest('section')!;
    for (const [institution, source] of [
      ['tau', csOfficialUrls.tau],
      ['huji', csOfficialUrls.huji],
      ['technion', csOfficialUrls.technion],
    ] as const) {
      expect(
        admissionSection.querySelector(`a[href^="${source.replaceAll('"', '&quot;')}"]`),
        institution,
      ).toBeTruthy();
    }
    hub.unmount();
    for (const programId of new Set(csComparisonRows.map((row) => row.programId))) {
      const child = render(await ProgramPage({ params: Promise.resolve({ programId }) }));
      expect(
        screen
          .getByRole('link', { name: 'השוו את ספי הקבלה למדעי המחשב בכל המוסדות' })
          .getAttribute('href'),
      ).toBe('/programs/cs#cs-thresholds');
      child.unmount();
    }
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
      title: 'הנדסה וטכנולוגיה – אוניברסיטת חיפה: תנאי קבלה',
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

  it('shows the regular Haifa CS cutoff and links to the sekhem calculator', async () => {
    const { container } = render(
      await ProgramPage({ params: Promise.resolve({ programId: 'haifa_cs' }) }),
    );
    const items = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(items).toContain(
      'סכם 700 לפחות (תשפ״ז); ציונים 680–699 נמצאים בטווח ההמתנה ונבחנים בוועדת הקבלה החוגית.',
    );
    expect(screen.getByRole('link', { name: 'חשבו סכם לתוכנית הזו' }).getAttribute('href')).toBe(
      '/sekhem-calculator?program=haifa_cs',
    );
    expect(container.textContent).not.toMatch(
      /ציון פסיכומטרי מינימלי|ממוצע בגרות מינימלי|5 יח"ל מתמטיקה — חובה/,
    );
    expect(hasPublishedCompositeThreshold(items as string[])).toBe(true);
    expect(screen.queryByText(/עודכן לאחרונה/)).toBeNull();
    expect(container.textContent).not.toContain('30.10.2026');
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

  describe('requirements source line', () => {
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
      'renders the source for %s and withholds it on note drift',
      async (programId, institutionId, sourceUrl, date) => {
        const institution = getStaticCatalogueInstitutions().find(
          (item) => item.id === institutionId,
        )!;
        const { unmount } = render(await ProgramPage({ params: Promise.resolve({ programId }) }));

        expect(screen.queryByRole('link', { name: `אתר ${institution.name}` })).toBeNull();
        expect(screen.queryByText(/מקור/)).toBeNull();
        expect(screen.queryByText(/עודכן לאחרונה:/)).toBeNull();
        expect(screen.queryByText(date)).toBeNull();
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

    it('renders the fetched source below the link row without the check date', async () => {
      render(await ProgramPage({ params: Promise.resolve({ programId: entry.programId }) }));

      expect(screen.queryByRole('link', { name: `אתר ${institution.name}` })).toBeNull();
      expect(screen.queryByText(/מקור/)).toBeNull();
      expect(screen.queryByText(/עודכן לאחרונה:/)).toBeNull();
      expect(screen.queryByText('21.10.2026')).toBeNull();
      expect(screen.getByRole('link', { name: 'לאתר המוסד' })).toBeTruthy();
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

    it('omits the footer when the presentation helper rejects the fetched URL', async () => {
      const institutionLink = institutionLinks.institutionLink;
      vi.spyOn(institutionLinks, 'institutionLink').mockImplementation((url, id, options) =>
        url === entry.sourceUrl && options?.fallbackToWebsite === false
          ? undefined
          : institutionLink(url, id, options),
      );
      render(await ProgramPage({ params: Promise.resolve({ programId: entry.programId }) }));

      expect(screen.queryByText(/עודכן לאחרונה:/)).toBeNull();
      expect(screen.queryByText('21.10.2026')).toBeNull();
      expect(screen.queryByText(/מקור:/)).toBeNull();
      expect(screen.queryByRole('link', { name: `אתר ${institution.name}` })).toBeNull();
    });

    it('links the BGU comparison row to its own programme and official cycle source', async () => {
      render(await ProgramPage({ params: Promise.resolve({ programId: 'psychology' }) }));

      const row = within(screen.getByRole('table')).getByRole('rowheader', {
        name: 'אוניברסיטת בן־גוריון בנגב',
      }).parentElement!;
      expect(
        within(row).getByRole('link', { name: 'אוניברסיטת בן־גוריון בנגב' }).getAttribute('href'),
      ).toBe('/programs/bgu_psychology');
      expect(within(row).queryByRole('link', { name: 'לאתר המוסד' })).toBeNull();
      expect(row.textContent).not.toContain('14.11.2026');
      expect(row.textContent).not.toMatch(/עודכן לאחרונה|נבדק בתאריך/);
      expect(row.textContent).toContain('סכם 650 וגם פסיכומטרי 650');
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

      expect(screen.queryByRole('link', { name: `אתר ${institution.name}` })).toBeNull();
      expect(screen.queryByText(/מקור/)).toBeNull();
      expect(screen.queryByRole('link', { name: 'לאתר המוסד' })).toBeNull();
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

    it('hides the unlisted programme admission block', async () => {
      vi.mocked(listCataloguePrograms).mockResolvedValue({
        data: [{ ...general, isListed: false }],
        meta: {},
      });
      render(await ProgramPage({ params: Promise.resolve({ programId: 'nursing' }) }));
      // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 40)
      expect(screen.queryByText('אין כרגע מידע עדכני על המסלול.')).toBeNull();
      // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 40)
      expect(screen.queryByRole('heading', { name: 'תנאי קבלה' })).toBeNull();
      expect(screen.queryByRole('listitem')).toBeNull();
      expect(screen.queryByRole('link', { name: 'לפרטים המלאים' })).toBeNull();
    });
  });
});

it('tracks program page CTAs and official outbound links with only canonical IDs', async () => {
  render(await ProgramPage({ params: Promise.resolve({ programId: 'colmgmt_cs' }) }));
  const actions = [
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 16)
    ['קבלו שיחה מהמוסד', 'program_contact_cta_clicked'],
    ['לאתר המוסד', 'institution_site_clicked'],
    ['למחשבון המכללה', 'institution_calculator_clicked'],
  ];
  for (const [label, event] of actions) {
    const link = screen.getByRole('link', { name: label });
    link.addEventListener('click', (e) => e.preventDefault());
    fireEvent.click(link);
    expect(hoisted.capture).toHaveBeenCalledWith(event, {
      program_id: 'colmgmt_cs',
      institution_id: 'colman',
    });
  }
  expect(hoisted.capture.mock.calls).toHaveLength(3);
});
