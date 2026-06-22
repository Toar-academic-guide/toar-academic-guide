// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import AcademicProfileForm from '@/components/AcademicProfileForm';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

vi.mock('@/components/BagrutCalculatorWizard', () => ({
  default: ({ onComplete }: { onComplete: (avg: number) => void }) => (
    <button type="button" onClick={() => onComplete(91.4)}>
      חשב אומדן
    </button>
  ),
}));

describe('AcademicProfileForm', () => {
  it('does not save the wizard estimate as the official weighted average automatically', () => {
    const onComplete = vi.fn();

    render(<AcademicProfileForm onComplete={onComplete} onSkip={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: 'חשב אומדן' }));
    fireEvent.click(screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }));

    expect(onComplete).toHaveBeenCalledWith({});
  });

  it('saves a weighted average only after the user copies or enters it explicitly', () => {
    const onComplete = vi.fn();

    render(<AcademicProfileForm onComplete={onComplete} onSkip={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: 'חשב אומדן' }));
    fireEvent.click(screen.getByRole('button', { name: 'העתק לשדה' }));
    fireEvent.click(screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }));

    expect(onComplete).toHaveBeenCalledWith({
      bagrut: { weightedAverage: 91.4 },
    });
  });
});
