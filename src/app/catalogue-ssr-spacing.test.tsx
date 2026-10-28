// @vitest-environment jsdom

import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import ProgramPage from '@/app/programs/[programId]/page';
import InstitutionPage from '@/app/institutions/[institutionId]/page';
import SiteFooter from '@/components/SiteFooter';
import PublicNavBar from '@/components/PublicNavBar';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ usePathname: () => '/programs/tau_cs' }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ loading: false, user: null }) }));
vi.mock('@/components/WayBackdrop', () => ({ default: () => null }));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: async () => ({ data: getStaticCataloguePrograms(), meta: {} }),
  listCatalogueInstitutions: async () => ({ data: getStaticCatalogueInstitutions(), meta: {} }),
}));

function crawlerText(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[^]*?-->|<[^>]*>/g, '');
}

function expectLabelBoundaries(html: string, selector: string) {
  const document = new DOMParser().parseFromString(html, 'text/html');
  for (const group of document.querySelectorAll(selector)) {
    const text = crawlerText(group.outerHTML);
    const labels = [...group.querySelectorAll('a, h1, h2, summary')]
      .map((element) => element.textContent?.trim())
      .filter((label): label is string => Boolean(label));
    expect(labels.length).toBeGreaterThan(1);
    for (let index = 1; index < labels.length; index++) {
      expect(text).not.toContain(`${labels[index - 1]}${labels[index]}`);
    }
  }
}

describe('crawler-visible SSR text boundaries', () => {
  it('separates the calculator and assessment CTAs', async () => {
    const html = renderToString(
      await ProgramPage({ params: Promise.resolve({ programId: 'tau_cs' }) }),
    );
    expect(crawlerText(html)).toMatch(/בדיקת סיכויי קבלה\s+התאמה אישית/);
    expect(crawlerText(html)).not.toContain('קבלההתאמה');
  });

  it('separates the institution name from contact on program cards', async () => {
    const html = renderToString(
      await ProgramPage({ params: Promise.resolve({ programId: 'tau_cs' }) }),
    );
    expect(crawlerText(html)).toMatch(/אוניברסיטת תל אביב\s+יצירת קשר/);
    expect(crawlerText(html)).not.toContain('אביביצירת');
  });

  it.each(['program', 'institution'] as const)(
    'separates navigation, heading and CTA labels on the %s page',
    async (kind) => {
      const page =
        kind === 'program'
          ? await ProgramPage({ params: Promise.resolve({ programId: 'tau_cs' }) })
          : await InstitutionPage({ params: Promise.resolve({ institutionId: 'tau' }) });
      const html = renderToString(
        <>
          {page}
          <SiteFooter />
        </>,
      );
      expectLabelBoundaries(html, 'header, nav, main > section');
      if (kind === 'institution') expect(crawlerText(html)).toMatch(/שאלון התאמה\s+מחשבון קבלה/);
    },
  );

  it('separates every shared header link including the account action', () => {
    const text = crawlerText(renderToString(<PublicNavBar />));
    expect(text).toMatch(/מוסדות לימוד\s+הרשימה שלי\s+מי אנחנו\s+כניסה/);
  });
});
