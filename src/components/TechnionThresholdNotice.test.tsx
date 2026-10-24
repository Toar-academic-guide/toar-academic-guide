// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import RequirementTiles from './RequirementTiles';

describe('Technion winter verification notice', () => {
  it.each([
    'technion_ee',
    'technion_me',
    'technion_medicine',
    'technion_engineering',
    'technion_cs',
    'technion_datascience',
    'technion_civil',
    'technion_industrial',
    'technion_biomedical',
  ])('shows the capture date and linked official source for %s', (id) => {
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
        screen.getByText('באביב תשפ"ז: 94 — על בסיס מקום פנוי, מספר המקומות מצומצם'),
      ).toBeTruthy();
    if (id === 'technion_medicine')
      expect(screen.getByText(/92.000.*סף משוער לזימון למבחן מו״ר/)).toBeTruthy();
  });
});
