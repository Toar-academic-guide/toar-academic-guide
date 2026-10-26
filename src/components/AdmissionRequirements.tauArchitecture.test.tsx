// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { evaluateAdmissionsForProgram } from '@/server/admissions/evaluator';
import AdmissionRequirements from './AdmissionRequirements';

vi.mock('server-only', () => ({}));
const state = vi.hoisted(() => ({ programs: vi.fn(), institutions: vi.fn(), evaluate: vi.fn() }));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/app/calculator',
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    hydrated: true,
    initialProfileStatus: 'ready',
    profile: {},
    updateProfile: vi.fn(),
  }),
}));
vi.mock('@/lib/catalogueClient', () => ({
  fetchCataloguePrograms: state.programs,
  fetchCatalogueInstitutions: state.institutions,
}));
vi.mock('@/lib/admissionsEvaluationClient', () => ({ fetchAdmissionsBatch: state.evaluate }));
import StudyJourney from './StudyJourney';

const program = {
  ...getStaticCataloguePrograms().find((row) => row.id === 'architecture')!,
  linkedInstitutionIds: ['tau'],
};
const institutions = getStaticCatalogueInstitutions();

async function evaluate(withMaths: boolean) {
  return evaluateAdmissionsForProgram({
    program,
    institutions,
    input: {
      degreeId: 'architecture',
      psychometric: 680,
      bagrut: 110,
      extraInputs: {
        psychometricEnglish: 110,
        ...(withMaths && {
          bagrutSubjectRecord: {
            schemaVersion: 1 as const,
            sector: 'jewish' as const,
            subjects: [{ subjectId: 'mathematics', units: 5, grade: 70 }],
          },
        }),
      },
    },
    freshnessStatesBySourceId: new Map(),
    fetcher: vi.fn<typeof fetch>(),
  });
}

function assertTable(table: HTMLElement) {
  expect(
    within(table)
      .getAllByRole('columnheader')
      .map((header) => header.className),
  ).toEqual([
    'w-[20%] py-2 pe-2 font-medium',
    'w-[25%] py-2 pe-2 font-medium',
    'w-[25%] py-2 pe-2 font-medium',
    'w-[30%] py-2 font-medium',
  ]);
  const mathsRow = within(table).getByRole('rowheader', { name: 'מתמטיקה' }).closest('tr')!;
  const required = within(mathsRow).getAllByRole('cell')[0];
  const lines = [...required.children];
  expect(lines.map((line) => line.textContent)).toEqual(['5 יח״ל: 70', '4 יח״ל: 80', '3 יח״ל: 90']);
  for (const line of lines) {
    expect(line.classList.contains('block')).toBe(true);
    expect(line.classList.contains('whitespace-nowrap')).toBe(true);
  }
  // Only the channel's rowgroup header spans columns; no data cell does.
  expect(table.querySelectorAll('td[colspan]')).toHaveLength(0);
  const spanningCells = table.querySelectorAll('[colspan]');
  expect(spanningCells).toHaveLength(1);
  expect(spanningCells[0].getAttribute('scope')).toBe('rowgroup');
  expect(spanningCells[0].getAttribute('colspan')).toBe('4');
  expect(spanningCells[0].textContent).toBe('דרישות סף');
  for (const header of table.querySelectorAll('th[scope="row"]')) {
    const row = header.closest('tr')!;
    expect(within(row).getAllByRole('cell')[0].textContent?.trim()).not.toBe('');
    expect(row.classList.contains('border-b')).toBe(true);
  }
  const links = within(table).getAllByRole('link');
  expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
    [
      'פסיכומטרי',
      'https://go.tau.ac.il/he/arts/ba/arch?v=admission-requirements&utm_source=myway&utm_medium=referral',
    ],
    [
      'מתמטיקה',
      'https://go.tau.ac.il/he/arts/ba/arch?v=admission-requirements&utm_source=myway&utm_medium=referral',
    ],
    [
      'אנגלית בפסיכומטרי',
      'https://go.tau.ac.il/he/ba/admissions?utm_source=myway&utm_medium=referral',
    ],
  ]);
}

describe.each([false, true])('TAU architecture requirements (maths entered: %s)', (withMaths) => {
  it('puts the three maths alternatives in the required cell without a duplicate heading or footer', async () => {
    const report = await evaluate(withMaths);
    const floors = report.results[0].floorChecks!;
    expect(floors.find((row) => row.label === 'מתמטיקה')?.status).toBe(
      withMaths ? 'pass' : 'missing',
    );
    const { container } = render(
      <AdmissionRequirements
        requirements={[]}
        programId="architecture"
        institutionId="tau"
        floorChecks={floors}
      />,
    );
    assertTable(screen.getByRole('table'));
    expect(container.textContent).not.toContain('תנאי קבלה');
    expect(container.querySelectorAll('p')).toHaveLength(0);
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('renders exactly one admission heading in the real StudyJourney section', async () => {
    const report = await evaluate(withMaths);
    state.programs.mockResolvedValue([program]);
    state.institutions.mockResolvedValue(institutions);
    state.evaluate.mockResolvedValue({ reports: { architecture: report }, failedDegreeIds: [] });
    window.history.replaceState(null, '', '/app/calculator#detail');
    window.sessionStorage.clear();
    window.sessionStorage.setItem(
      'myway_study_journey_v2',
      JSON.stringify({
        fields: [],
        locations: ['all'],
        types: ['all'],
        selectedRowId: 'architecture:tau',
        scores: { bagrut: { weightedAverage: 110 }, psychometric: { overall: 680 } },
      }),
    );
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    render(<StudyJourney initialStep="detail" />);
    const table = await screen.findByRole('table', { name: 'בדיקת תנאי הסף לפי הציונים שלך' });
    const section = table.closest('section')!;
    expect(within(section).getAllByRole('heading', { level: 2, name: 'תנאי קבלה' })).toHaveLength(
      1,
    );
    expect(section.textContent?.match(/תנאי קבלה/g)).toHaveLength(1);
    assertTable(table);
  });
});
