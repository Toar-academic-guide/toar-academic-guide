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

// Captured from origin/main 1962d1f before changing AdmissionRequirements.
const baseline = {
  noPrefix: {
    text: 'המחשבון הרשמי של בר-אילן',
    html: '<p class="mt-3 text-xs text-[var(--text-muted)] [overflow-wrap:anywhere]"><a href="https://shoham.biu.ac.il/kabala/?utm_source=myway&amp;utm_medium=referral" target="_blank" rel="noopener noreferrer" class="font-semibold text-[#6554b8] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">המחשבון הרשמי של בר-אילן</a></p>',
    links: [
      {
        text: 'המחשבון הרשמי של בר-אילן',
        href: 'https://shoham.biu.ac.il/kabala/?utm_source=myway&utm_medium=referral',
      },
    ],
  },
  standard: {
    text: 'עודכן לאחרונה: 25.10.2026 · מקור: אתר אוניברסיטת בר-אילן — המחשבון הרשמי של בר-אילן',
    html: '<p class="mt-3 text-xs text-[var(--text-muted)] [overflow-wrap:anywhere]">עודכן לאחרונה: 25.10.2026 · מקור: אתר אוניברסיטת בר-אילן — <a href="https://shoham.biu.ac.il/kabala/?utm_source=myway&amp;utm_medium=referral" target="_blank" rel="noopener noreferrer" class="font-semibold text-[#6554b8] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">המחשבון הרשמי של בר-אילן</a></p>',
    links: [
      {
        text: 'המחשבון הרשמי של בר-אילן',
        href: 'https://shoham.biu.ac.il/kabala/?utm_source=myway&utm_medium=referral',
      },
    ],
  },
  engineering: {
    text: 'עודכן לאחרונה: 25.10.2026 · מקור: אתר אוניברסיטת בר-אילן — המחשבון הרשמי של בר-אילן; תנאי הקבלה בפקולטה להנדסה',
    html: '<p class="mt-3 text-xs text-[var(--text-muted)] [overflow-wrap:anywhere]">עודכן לאחרונה: 25.10.2026 · מקור: אתר אוניברסיטת בר-אילן — <a href="https://shoham.biu.ac.il/kabala/?utm_source=myway&amp;utm_medium=referral" target="_blank" rel="noopener noreferrer" class="font-semibold text-[#6554b8] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">המחשבון הרשמי של בר-אילן</a>; <a href="https://engineering.biu.ac.il/prerequisites?utm_source=myway&amp;utm_medium=referral" target="_blank" rel="noopener noreferrer" class="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">תנאי הקבלה בפקולטה להנדסה</a></p>',
    links: [
      {
        text: 'המחשבון הרשמי של בר-אילן',
        href: 'https://shoham.biu.ac.il/kabala/?utm_source=myway&utm_medium=referral',
      },
      {
        text: 'תנאי הקבלה בפקולטה להנדסה',
        href: 'https://engineering.biu.ac.il/prerequisites?utm_source=myway&utm_medium=referral',
      },
    ],
  },
};

it.each(programIds)(
  'preserves the origin/main footer and column classes for %s__biu',
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
    const footer = container.querySelector('p')!;
    const expected =
      programId === 'biu_ee'
        ? baseline.engineering
        : ['law', 'biu_law'].includes(programId)
          ? baseline.noPrefix
          : baseline.standard;
    expect(footer.textContent).toBe(expected.text);
    expect(
      within(footer)
        .getAllByRole('link')
        .map((link) => ({
          text: link.textContent,
          href: link.getAttribute('href'),
        })),
    ).toEqual(expected.links);
    expect(footer.outerHTML).toBe(expected.html);
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
