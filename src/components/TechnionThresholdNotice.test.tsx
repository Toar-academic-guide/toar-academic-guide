// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import RequirementTiles from './RequirementTiles';

describe('Technion winter verification notice', () => {
  it.each(['technion_ee', 'technion_me'])(
    'shows the linked official source without a checked date for %s',
    (id) => {
      const program = getStaticCataloguePrograms().find((row) => row.id === id)!;
      render(<RequirementTiles program={program} institutionId="technion" requirements={[]} />);
      expect(screen.getByRole('link', { name: 'הטכניון' }).parentElement?.textContent).toBe(
        'מקור: הטכניון',
      );
      expect(screen.queryByText('25.10.2026')).toBeNull();
      expect(screen.queryByText(/עודכן לאחרונה/)).toBeNull();
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
