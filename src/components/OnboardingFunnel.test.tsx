// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import OnboardingFunnel from './OnboardingFunnel';

describe('OnboardingFunnel saved progress', () => {
  it('restores the saved follow-up step and reports updated answers', () => {
    const onProgressChange = vi.fn();

    render(
      <OnboardingFunnel
        initialDraft={{
          currentStep: 1,
          answers: { geography: ['פתוח/ה לכל האפשרויות'] },
        }}
        onProgressChange={onProgressChange}
        onComplete={vi.fn()}
      />,
    );

    expect(screen.getByText('איפה תרצה/י להעביר את שנות הלימודים שלך?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /להישאר קרוב\/ה לבית במרכז/ }));

    expect(onProgressChange).toHaveBeenLastCalledWith({
      currentStep: 1,
      answers: { geography: ['להישאר קרוב/ה לבית במרכז'] },
    });
  });
});
