// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { evaluateAdmissionsForProgram } from '@/server/admissions/evaluator';
import AdmissionRequirements from './AdmissionRequirements';

vi.mock('server-only', () => ({}));

const programIds = [
  'law',
  'criminology',
  'biu_cs',
  'biu_law',
  'biu_ee',
  'biu_lifesciences',
  'biu_biotech',
  'biu_computational_bio',
  'biu_socialwork',
  'biu_criminology',
];

it.each(programIds)(
  'keeps floor columns and drops official calculator links for %s__biu',
  async (programId) => {
    const report = await evaluateAdmissionsForProgram({
      program: getStaticCataloguePrograms().find((row) => row.id === programId)!,
      institutions: getStaticCatalogueInstitutions(),
      input: { degreeId: programId, psychometric: 680, bagrut: 110 },
      freshnessStatesBySourceId: new Map(),
      fetcher: vi.fn<typeof fetch>(),
    });
    const floors = report.results.find((row) => row.linkedInstitutionId === 'biu')?.floorChecks;
    expect(floors?.length).toBeGreaterThan(0);
    const { container } = render(
      <AdmissionRequirements
        requirements={[]}
        programId={programId}
        institutionId="biu"
        floorChecks={floors}
      />,
    );
    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).not.toContain('המחשבון הרשמי של בר-אילן');
    expect(container.textContent).not.toContain('תנאי הקבלה בפקולטה להנדסה');
    expect(
      within(screen.getByRole('table'))
        .getAllByRole('columnheader')
        .map((header) => header.className),
    ).toEqual([
      'w-[30%] py-2 pe-2 font-medium',
      'w-[15%] py-2 pe-2 font-medium',
      'w-[25%] py-2 pe-2 font-medium',
      'w-[30%] py-2 font-medium',
    ]);
  },
);
