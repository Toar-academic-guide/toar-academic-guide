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

import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import * as publicCataloguePages from '@/lib/publicCataloguePages';

import InstitutionPage from './page';

describe('InstitutionPage', () => {
  it('renders public institution content and links into app routes', async () => {
    const institution = getStaticCatalogueInstitutions()[0];

    render(await InstitutionPage({ params: Promise.resolve({ institutionId: institution.id }) }));

    expect(screen.getByRole('heading', { name: institution.name })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'שאלון התאמה' }).getAttribute('href')).toBe(
      '/app/assessment',
    );
    expect(
      within(screen.getByRole('main'))
        .getByRole('link', { name: 'מחשבון קבלה' })
        .getAttribute('href'),
    ).toBe('/app/calculator');
    expect(screen.queryByText('academicScores')).toBeNull();
  });

  it('calls notFound for unknown institution IDs', async () => {
    await expect(
      InstitutionPage({ params: Promise.resolve({ institutionId: 'missing-institution' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(hoisted.notFound).toHaveBeenCalled();
  });

  it.each([
    [17, 'הצגת עוד 5 מסלולים'],
    [13, 'הצגת מסלול נוסף'],
  ])(
    'renders all %i program links in order with the remaining-count label',
    async (count, label) => {
      const institution = getStaticCatalogueInstitutions()[0];
      const programs = getStaticCataloguePrograms().slice(0, count);
      vi.spyOn(publicCataloguePages, 'getPublicInstitutionPageData').mockResolvedValue({
        institution,
        programs,
      });

      const { container } = render(
        await InstitutionPage({ params: Promise.resolve({ institutionId: institution.id }) }),
      );

      expect(screen.getByText(label).tagName).toBe('SUMMARY');
      expect(container.querySelector('details')?.open).toBe(false);
      const links = Array.from(container.querySelectorAll('main a[href^="/programs/"]'));
      expect(links.map((link) => link.getAttribute('href'))).toEqual(
        programs.map((program) => `/programs/${encodeURIComponent(program.id)}`),
      );
      expect(container.querySelectorAll('details a[href^="/programs/"]')).toHaveLength(count - 12);
    },
  );

  it.each([0, 1, 12])('renders no summary for %i programs', async (count) => {
    const institution = getStaticCatalogueInstitutions()[0];
    vi.spyOn(publicCataloguePages, 'getPublicInstitutionPageData').mockResolvedValue({
      institution,
      programs: getStaticCataloguePrograms().slice(0, count),
    });

    const { container } = render(
      await InstitutionPage({ params: Promise.resolve({ institutionId: institution.id }) }),
    );

    expect(container.querySelector('summary')).toBeNull();
    expect(container.querySelectorAll('main a[href^="/programs/"]')).toHaveLength(count);
  });

  it('uses the concise Haifa program name with its existing link', async () => {
    render(await InstitutionPage({ params: Promise.resolve({ institutionId: 'haifa' }) }));

    expect(screen.getByText('הנדסה וטכנולוגיה').closest('a')?.getAttribute('href')).toBe(
      '/programs/haifa_engineering',
    );
    expect(screen.queryByText('הנדסה וטכנולוגיה - אוניברסיטת חיפה')).toBeNull();
  });
});
