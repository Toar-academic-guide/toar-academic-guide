// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import RecommendationResults from './RecommendationResults';

it('rounds only visible profile scores and preserves the ranking inputs', () => {
  const scores = Object.freeze({
    AN: 5,
    TE: 2.692307692307692,
    CR: 0,
    SO: 1.9230769230769231,
    LE: 0,
    OR: 0.7692307692307693,
    DI: 1.5384615384615385,
    ER: 0,
  });
  const { container } = render(
    <RecommendationResults
      programs={[]}
      recommendations={[]}
      onSelectDegree={vi.fn()}
      profileScores={scores}
    />,
  );
  expect(screen.getByRole('heading', { name: 'אנליטי-טכני' })).toBeTruthy();
  expect([...container.querySelectorAll('bdi')].map((node) => node.textContent)).toEqual([
    '5',
    '2.7',
    '1.9',
    '1.5',
    '0.8',
  ]);
  expect(scores.TE).toBe(2.692307692307692);
});
