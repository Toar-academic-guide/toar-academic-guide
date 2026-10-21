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

import { getStaticCatalogueInstitutions } from '@/lib/catalogueStatic';

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
});
