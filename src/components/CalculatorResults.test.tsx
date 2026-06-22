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
const calculatorInstitutions = getCalculatorInstitutionsFromCatalogue(getStaticCatalogueInstitutions());

describe('CalculatorResults', () => {
  it('derives admission badges from the submitted scores and selected degree', () => {
    const props = {
      degreeId: 'tau_cs',
      programs,
      calculatorInstitutions,
      onBack: () => {},
    };

    const { rerender } = render(
      <CalculatorResults {...props} psychometric={800} bagrut={120} />
    );

    expect(screen.getByLabelText('אוניברסיטת תל אביב: מתקבל/ת')).toBeTruthy();

    rerender(<CalculatorResults {...props} psychometric={300} bagrut={70} />);

    expect(screen.getByLabelText('אוניברסיטת תל אביב: נדרש שיפור')).toBeTruthy();
  });
});
