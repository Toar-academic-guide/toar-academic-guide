// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import CalculatorResults from '@/components/CalculatorResults';
import { getCalculatorInstitutionsFromCatalogue } from '@/lib/calculatorInstitutions';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';

vi.mock('posthog-js', () => ({
  default: {
    capture: vi.fn(),
  },
}));

const programs = getStaticCataloguePrograms();
const calculatorInstitutions = getCalculatorInstitutionsFromCatalogue(
  getStaticCatalogueInstitutions(),
);

describe('CalculatorResults', () => {
  it('renders admissions decision cards from the submitted scores and selected degree', () => {
    const props = {
      degreeId: 'tau_cs',
      programs,
      calculatorInstitutions,
      onBack: () => {},
    };

    const { rerender } = render(<CalculatorResults {...props} psychometric={800} bagrut={120} />);

    expect(screen.getByLabelText('אוניברסיטת תל אביב: התקבלת')).toBeTruthy();
    expect(screen.getByText('הסטטוס שלך')).toBeTruthy();
    expect(screen.getByText('למה קיבלת את התוצאה')).toBeTruthy();
    expect(screen.getByText('מה חסר לך')).toBeTruthy();
    expect(screen.getByText('הצעד הכי טוב הבא')).toBeTruthy();

    rerender(<CalculatorResults {...props} psychometric={300} bagrut={70} />);

    expect(screen.getByLabelText('אוניברסיטת תל אביב: רחוק מהמסלול')).toBeTruthy();
  });

  it('renders Haifa and TAU matches for a database-backed computer science catalogue row', () => {
    const csProgram = programs.find((program) => program.id === 'cs');
    expect(csProgram).toBeTruthy();

    render(
      <CalculatorResults
        degreeId="cs"
        programs={[
          {
            ...csProgram!,
            institutionDetails: [
              {
                institutionName: 'אוניברסיטת תל אביב',
                durationYears: null,
                estimatedStudentsPerYear: '',
                quantitativeMinRequirement: null,
                englishMinRequirement: null,
                specificAdmissionNotes: [],
                officialCalculatorUrl: '',
              },
              {
                institutionName: 'אוניברסיטת חיפה',
                durationYears: null,
                estimatedStudentsPerYear: '',
                quantitativeMinRequirement: null,
                englishMinRequirement: null,
                specificAdmissionNotes: [],
                officialCalculatorUrl: '',
              },
            ],
          },
        ]}
        calculatorInstitutions={calculatorInstitutions}
        psychometric={750}
        bagrut={110}
        onBack={() => {}}
      />,
    );

    expect(screen.getByLabelText('אוניברסיטת תל אביב: התקבלת')).toBeTruthy();
    expect(screen.getByLabelText('אוניברסיטת חיפה: התקבלת')).toBeTruthy();
  });
});
