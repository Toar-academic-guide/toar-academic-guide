// @vitest-environment jsdom
import { render, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { catalogueAdmissionRequirements } from '@/lib/catalogueDisplayText';
import AdmissionRequirements from './AdmissionRequirements';
import RequirementTiles from './RequirementTiles';
const program = getStaticCataloguePrograms().find((p) => p.id === 'colmgmt_law')!;
const requirements = catalogueAdmissionRequirements(
  program.institutionDetails?.[0].specificAdmissionNotes,
  program.admissionRequirements,
  program.id,
);
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-23T12:00:00Z'));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
describe('opt-in requirement tiles', () => {
  it('preserves the current list exactly when evidence is missing', () => {
    const props = { programId: 'unknown', institutionId: 'colman', requirements };
    expect(
      renderToStaticMarkup(<RequirementTiles program={{ ...program, id: 'unknown' }} {...props} />),
    ).toBe(renderToStaticMarkup(<AdmissionRequirements {...props} />));
  });
  it('puts all calculator list items once in closed details, without a calculator self-link', () => {
    const { container } = render(
      <RequirementTiles
        program={program}
        institutionId="colman"
        requirements={requirements}
        preserveRequirements
      />,
    );
    expect(container.textContent).toContain('מספיק אחד מאלה:');
    const details = container.querySelector('details')!;
    expect(details.open).toBe(false);
    for (const text of requirements)
      expect(
        [...details.querySelectorAll('li')].filter((li) => li.textContent === text),
      ).toHaveLength(1);
    expect(container.querySelector('a')).toBeNull();
    expect(details.querySelector('summary')?.textContent).toBe('פרטים נוספים');
  });
  it('shows the page calculator link and keeps MTA formula left to right', () => {
    const mta = getStaticCataloguePrograms().find((p) => p.id === 'tlvyaffo_cs')!;
    const reqs = catalogueAdmissionRequirements(
      mta.institutionDetails?.[0].specificAdmissionNotes,
      mta.admissionRequirements,
      mta.id,
    );
    const { container } = render(
      <RequirementTiles program={mta} institutionId="mta" requirements={reqs} showCalculatorLink />,
    );
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/app/calculator');
    expect(container.querySelector('details bdi[dir="ltr"]')?.textContent).toContain('÷ 2');
    expect(container.textContent).toContain('אנגלית 100');
  });
  it('keeps Colman CS internal test on the routes and accurate prep paths in details', () => {
    const cs = getStaticCataloguePrograms().find((p) => p.id === 'colmgmt_cs')!;
    const reqs = catalogueAdmissionRequirements(
      cs.institutionDetails?.[0].specificAdmissionNotes,
      cs.admissionRequirements,
      cs.id,
    );
    const { container } = render(
      <RequirementTiles program={cs} institutionId="colman" requirements={reqs} />,
    );
    expect(container.textContent).not.toContain('חובה בכל דרך:');
    expect(container.textContent).not.toContain('עם בונוסים');
    expect(container.textContent).toContain('חסר רק ציון המתמטיקה: אחרי מבדק פנימי');
    expect(container.textContent).toContain('חסרים שניהם: אחרי מבדק פנימי');
  });
});
