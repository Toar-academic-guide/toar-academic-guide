// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';

const state = vi.hoisted(() => ({
  fetchPrograms: vi.fn(),
  fetchInstitutions: vi.fn(),
  evaluate: vi.fn(),
  savedProgramIds: [] as string[],
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/app/calculator',
}));
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));
vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    hydrated: true,
    initialProfileStatus: 'ready',
    profile: { savedProgramIds: state.savedProgramIds, academicScores: {} },
  }),
}));
vi.mock('@/lib/catalogueClient', () => ({
  fetchCataloguePrograms: state.fetchPrograms,
  fetchCatalogueInstitutions: state.fetchInstitutions,
}));
vi.mock('@/lib/admissionsEvaluationClient', () => ({ fetchAdmissionsBatch: state.evaluate }));
import StudyJourney from '@/components/StudyJourney';

const subjects = ['5 יח"ל מתמטיקה — חובה', '5 יח"ל פיזיקה — חובה'];
const spring = 'באביב תשפ"ז, על בסיס מקום פנוי: סכם 94 — מספר המקומות מצומצם';
const explanation =
  'כדי לחשב את המסלול במוסד זה צריך נתוני מקצועות בגרות שהמחשבון הרשמי משתמש בהם.';

describe.each(['detail', 'compare'] as const)('Technion no-score %s requirements', (view) => {
  describe.each([
    ['technion_ee', 'הנדסת חשמל', 'בחורף תשפ"ז: סכם 91.5'],
    ['technion_me', 'הנדסת מכונות', 'בחורף תשפ"ז: סכם 87'],
  ])('%s', (programId, name, winter) => {
    let scope: HTMLElement;

    // The ordinary setup test also runs these checks so setup errors cannot be hidden by it.fails.
    beforeEach(async () => {
      window.history.replaceState(null, '', '/app/calculator');
      window.sessionStorage.clear();
      state.savedProgramIds = view === 'compare' ? ['technion_ee', 'technion_me'] : [];
      vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
      const programs = getStaticCataloguePrograms().filter((p) =>
        ['technion_ee', 'technion_me'].includes(p.id),
      );
      const institution = getStaticCatalogueInstitutions().find((i) => i.id === 'technion')!;
      state.fetchPrograms.mockResolvedValue(programs);
      state.fetchInstitutions.mockResolvedValue([institution]);
      state.evaluate.mockResolvedValue({
        reports: Object.fromEntries(
          programs.map((p) => [
            p.id,
            {
              results: [
                {
                  linkedInstitutionId: 'technion',
                  institution,
                  capability: 'needs_input',
                  kind: 'needs_input',
                  decision: 'unknown',
                  confidence: 'low',
                  sourceLabel: 'נדרשים נתונים נוספים',
                  explanation,
                  nextAction: 'השלימו את יחידות וציון המקצועות החסרים כדי לקבל הערכה למסלול.',
                  requiredInputs: ['bagrut_subject_record'],
                },
              ],
            },
          ]),
        ),
        failedDegreeIds: [],
      });
      window.sessionStorage.setItem(
        'myway_study_journey_v2',
        JSON.stringify({
          fields: [],
          locations: ['all'],
          types: ['all'],
          selectedRowId: `${programId}:technion`,
          scores: { bagrut: { weightedAverage: 110 }, psychometric: { overall: 750 } },
        }),
      );
      const { container } = render(
        <StudyJourney initialStep={view === 'detail' ? 'detail' : 'saved'} />,
      );
      if (view === 'detail') {
        await screen.findByText(explanation);
        expect(screen.getByRole('heading', { name })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'יצירת קשר' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'שמירה לרשימה' })).toBeTruthy();
        scope = container.querySelector('.journey-narrow')!;
      } else {
        await screen.findByRole('button', { name: /^הנדסת חשמל —/ });
        for (const box of screen.getAllByRole('checkbox', { name: 'להשוואה' }))
          fireEvent.click(box);
        fireEvent.click(screen.getByRole('button', { name: 'השוואת מסלולים' }));
        await screen.findByRole('heading', { name: 'משווים אפשרויות' });
        scope = screen.getByRole('heading', { name }).closest('article')!;
      }
      expect(scope).toBeTruthy();
      for (const subject of subjects)
        expect(
          within(scope)
            .getAllByRole('listitem')
            .map((li) => li.textContent),
        ).toContain(subject);
      if (programId === 'technion_me') expect(scope.textContent).not.toMatch(/באביב תשפ/);
    });

    it('loads the no-score view with subject requirements', () => {
      for (const subject of subjects)
        expect(
          within(scope)
            .getAllByRole('listitem')
            .map((li) => li.textContent),
        ).toContain(subject);
    });

    // awaiting StudyJourney edit after #278 merges
    it.fails('puts winter first, subjects next, and EE spring last', () => {
      const items = [...scope.querySelectorAll('li')].map((li) => li.textContent);
      expect(items[0], 'winter must be the first requirement').toBe(winter);
      expect(items.slice(1, 3)).toEqual(subjects);
      if (programId === 'technion_ee') {
        expect(scope.textContent).toContain(spring);
        const physics = within(scope).getByText(
          (_, node) => node?.tagName === 'LI' && node.textContent === subjects[1],
        );
        const springLine = within(scope).getByText(spring);
        expect(
          physics.compareDocumentPosition(springLine) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
      } else {
        expect(scope.textContent).not.toMatch(/באביב תשפ/);
      }
    });
  });
});
