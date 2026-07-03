// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => ({
  notFound: hoisted.notFound,
}));

import { getStaticCataloguePrograms } from '@/lib/catalogueStatic';

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
});
