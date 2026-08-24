// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import InstitutionLogo from '@/components/InstitutionLogo';

describe('InstitutionLogo', () => {
  it('keeps the fallback avatar visible until an external logo loads', () => {
    render(
      <InstitutionLogo
        institution="מוסד בדיקה"
        logoUrl="https://example.com/logo.svg"
        domain="example.ac.il"
      />,
    );

    expect(screen.getByText('מ')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'מוסד בדיקה' }).style.opacity).toBe('0');

    fireEvent.load(screen.getByRole('img', { name: 'מוסד בדיקה' }));

    expect(screen.getByRole('img', { name: 'מוסד בדיקה' }).style.opacity).toBe('1');
  });

  it('tries the favicon fallback after an explicit logo fails', async () => {
    render(
      <InstitutionLogo
        institution="מוסד בדיקה"
        logoUrl="https://example.com/logo.svg"
        domain="example.ac.il"
      />,
    );

    fireEvent.error(screen.getByRole('img', { name: 'מוסד בדיקה' }));

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'מוסד בדיקה' }).getAttribute('src')).toBe(
        'https://www.google.com/s2/favicons?domain=example.ac.il&sz=64',
      );
    });
  });
});
