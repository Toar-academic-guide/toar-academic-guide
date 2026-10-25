// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('./actions', () => ({ resolveReviewItemApproveFormAction: vi.fn(), resolveReviewItemNoChangeFormAction: vi.fn() }));
import ReviewActionPanel from './ReviewActionPanel';

describe('review action panel', () => {
  it('renders both resolution buttons for an admin', () => {
    render(<ReviewActionPanel canReject reviewItemId="review-id" />);
    expect(screen.getByRole('button', { name: 'אישור השינוי' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Resolve investigation — no canonical change' }).hasAttribute('disabled')).toBe(false);
    expect(screen.queryByText(/This screen cannot approve/)).toBeNull();
  });
  it('disables both buttons when the review cannot be resolved', () => {
    render(<ReviewActionPanel canReject={false} reviewItemId="review-id" />);
    expect(screen.getByRole('button', { name: 'אישור השינוי' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Resolve investigation — no canonical change' }).hasAttribute('disabled')).toBe(true);
  });
});
