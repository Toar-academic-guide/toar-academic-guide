import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProgramPage from '@/app/programs/[programId]/page';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { loadPublicCatalogue } from '@/lib/publicCataloguePages';
import { listCatalogueInstitutions, listCataloguePrograms } from '@/server/catalogue/queries';
import type { CatalogueProgram } from '@/types/catalogue';
import EnquiryPage, { metadata } from './page';
import failedLinks from './__fixtures__/failed-links.json';

vi.mock('server-only', () => ({}));
vi.mock('@/components/WayPageShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: vi.fn(),
  listCatalogueInstitutions: vi.fn(),
}));

const programs = getStaticCataloguePrograms();
// These programme rows were present in the public production catalogue on
// 2026-10-24, while institution-wide legacy IDs existed only in code.
const livePrograms = [
  ...programs.filter(
    (program) =>
      !failedLinks.some((href) => {
        const { searchParams } = new URL(href, 'https://myway.example');
        return program.id === searchParams.get('program') && !!program.institutionId;
      }),
  ),
  ...['psychology', 'social_work'].map((id): CatalogueProgram => ({
    ...programs.find((program) => program.id === id)!,
    id: id === 'social_work' ? 'ono_socialwork' : 'ono_psychology',
    institutionId: 'ono',
    linkedInstitutionIds: ['ono'],
    thresholds: {},
    institutionDetails: [],
  })),
  {
    ...programs.find((program) => program.id === 'ono_business')!,
    name: programs.find((program) => program.id === 'business')!.name,
  },
].filter((program, index, all) => all.findLastIndex((item) => item.id === program.id) === index);

function params(href: string) {
  const { searchParams } = new URL(href, 'https://myway.example');
  return {
    program: searchParams.get('program') ?? undefined,
    institution: searchParams.get('institution') ?? undefined,
  };
}

async function form(href: string) {
  return renderToStaticMarkup(await EnquiryPage({ searchParams: Promise.resolve(params(href)) }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listCataloguePrograms).mockResolvedValue({
    data: livePrograms,
    meta: { catalogueSource: 'database' },
  });
  vi.mocked(listCatalogueInstitutions).mockResolvedValue({
    data: getStaticCatalogueInstitutions(),
    meta: {},
  });
});

describe('enquiry link integrity', () => {
  it('renders the approved prep intro before the unchanged title and action', async () => {
    const markup = await form('/enquiry?program=psychometric-preparation');
    expect(markup).toContain('>הציון שלכם בפסיכומטרי מתחיל בהכנה</h1>');
    expect(markup).toContain(
      '<p class="mt-2">ברוב המוסדות בישראל, הציון הפסיכומטרי נכנס לסכם יחד עם ציוני הבגרות, ולכן הוא שווה הכנה רצינית. החל מדצמבר 2026 הבחינה כוללת שני תחומים בלבד: חשיבה מילולית וחשיבה כמותית, בציון של 200 עד 800. המרכז הארצי לבחינות ולהערכה כותב זאת במפורש: מי שמתכונן צפוי להשיג ציון גבוה יותר, והשיפור תלוי בעיקר ברצינות ובהשקעה. השאירו פרטים ותתחילו להתכונן נכון.</p><p class="mt-2">הכנה לפסיכומטרי</p>',
    );
    expect(markup).toContain('השאירו פרטים</button>');
    expect(markup).not.toContain('רוצים תשובות ישר מהמוסד?');
    expect(markup).not.toMatch(/חינם|בחינם|ללא עלות|תוצאות/);
  });

  it('keeps the institution enquiry intro unchanged', async () => {
    const markup = await form('/enquiry?program=cs&institution=reichman');
    expect(markup).toContain('>רוצים תשובות ישר מהמוסד?</h1>');
    expect(markup).not.toContain('הציון שלכם בפסיכומטרי מתחיל בהכנה');
    expect(markup).not.toContain('ברוב המוסדות בישראל');
  });

  it('keeps enquiry pages noindex with links followed', () => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it.each([
    '/enquiry?program=accounting&institution=colman',
    '/enquiry?program=cs&institution=reichman',
    '/enquiry?program=afeka_engineering&institution=afeka',
  ])('renders the form for regression URL %s', async (href) => {
    expect(await form(href)).toContain('<form');
  });

  it('renders a form for every one of the 113 QA failures', async () => {
    expect(new Set(failedLinks).size).toBe(113);
    for (const href of failedLinks) {
      await expect(form(href), href).resolves.toContain('<form');
    }
  });

  it.each(['static', 'database'] as const)(
    'resolves every emitted programme-page enquiry link in %s mode',
    async (mode) => {
      vi.mocked(listCataloguePrograms).mockResolvedValue({
        data: mode === 'static' ? programs : livePrograms,
        meta: { catalogueSource: mode },
      });
      const catalogue = await loadPublicCatalogue();
      const hrefs = new Set<string>();
      for (const program of catalogue.programs) {
        const markup = renderToStaticMarkup(
          await ProgramPage({ params: Promise.resolve({ programId: program.id }) }),
        );
        for (const [, href] of markup.matchAll(/href="(\/enquiry[^"]*)"/g)) {
          hrefs.add(href.replaceAll('&amp;', '&'));
        }
      }
      expect(hrefs.size).toBeGreaterThan(programs.length);
      for (const href of hrefs) await expect(form(href), href).resolves.toContain('<form');
    },
    30_000,
  );

  it.each([
    '/enquiry',
    '/enquiry?program=unknown&institution=tau',
    '/enquiry?program=cs&institution=unknown',
    '/enquiry?program=afeka_engineering&institution=reichman',
    '/enquiry?program=accounting&institution=danon',
  ])('keeps invalid pair %s as a 404', async (href) => {
    await expect(form(href)).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
  });

  it('keeps the psychometric preparation enquiry available', async () => {
    expect(await form('/enquiry?program=psychometric-preparation')).toContain('<form');
    expect(listCataloguePrograms).not.toHaveBeenCalled();
  });

  it('does not hide database failures behind the code registry', async () => {
    vi.mocked(listCataloguePrograms).mockRejectedValue(new Error('database unavailable'));
    await expect(form(failedLinks[0])).rejects.toThrow('database unavailable');
  });
});
