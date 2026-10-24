import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/StudyJourney', () => ({ default: () => null }));
import CalculatorPage from './page';

describe('calculator programme query', () => {
  it('passes a single programme query to the journey', async () => {
    const page = await CalculatorPage({ searchParams: Promise.resolve({ program: 'tau_cs' }) });
    expect(page.props).toMatchObject({ initialStep: 'subjects', initialProgramId: 'tau_cs' });
  });

  it('ignores ambiguous repeated programme parameters', async () => {
    const page = await CalculatorPage({
      searchParams: Promise.resolve({ program: ['tau_cs', 'haifa_law'] }),
    });
    expect(page.props.initialProgramId).toBeUndefined();
  });
});
