// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import RequirementTiles from './RequirementTiles';

describe('Technion winter verification notice', () => {
  it.each(['technion_ee', 'technion_me'])(
    'shows the capture date and linked official source for %s',
    (id) => {
      const program = getStaticCataloguePrograms().find((row) => row.id === id)!;
      render(<RequirementTiles program={program} institutionId="technion" requirements={[]} />);
      expect(screen.getByText('25.10.2026').parentElement?.textContent).toBe(
        'עודכן לאחרונה: 25.10.2026 · מקור: הטכניון',
      );
      expect(screen.getByRole('link', { name: 'הטכניון' }).getAttribute('href')).toContain(
        'admissions.technion.ac.il/sechem-for-admission/',
      );
      if (id === 'technion_ee')
        expect(
          screen.getByText('באביב תשפ"ז, על בסיס מקום פנוי: סכם 94 — מספר המקומות מצומצם'),
        ).toBeTruthy();
    },
  );
});
