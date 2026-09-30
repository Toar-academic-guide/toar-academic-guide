// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CareerAssessment from './CareerAssessment';

describe('CareerAssessment saved progress', () => {
  it('restores a saved screen and reports the next canonical draft', () => {
    const onProgressChange = vi.fn();

    render(
      <CareerAssessment
        initialDraft={{
          screenIndex: 1,
          multiSelectAnswers: { Q1: ['Q1-A'] },
          quickPickAnswers: {},
          sliderAnswers: {},
          skippedScreens: [],
        }}
        onProgressChange={onProgressChange}
        onComplete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /פיצוח לוגי/ }));

    expect(onProgressChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        screenIndex: 1,
        multiSelectAnswers: { Q1: ['Q1-A', 'Q1-B'] },
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'הבא' }));
    expect(onProgressChange).toHaveBeenLastCalledWith(expect.objectContaining({ screenIndex: 2 }));
  });
});
