// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const capture = vi.hoisted(() => vi.fn());
vi.mock('posthog-js', () => ({ default: { capture } }));
import CalculatorShareButton from './CalculatorShareButton';

function shareButton(surface: 'journey_calculator' | 'sekhem_calculator' = 'journey_calculator') {
  render(<CalculatorShareButton surface={surface} />);
  return screen.getByRole('button', { name: 'שיתוף התוצאות' });
}

describe('sharing calculator results', () => {
  afterEach(() => {
    capture.mockClear();
    cleanup();
    vi.unstubAllGlobals();
  });

  it('opens the native share sheet on a phone', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const open = vi.fn();
    vi.stubGlobal('navigator', { share });
    vi.stubGlobal('open', open);
    vi.stubGlobal(
      'matchMedia',
      (query: string) => ({ matches: query === '(pointer: coarse)' }) as MediaQueryList,
    );
    fireEvent.click(shareButton());
    await waitFor(() =>
      expect(share).toHaveBeenCalledWith({
        title: 'מחשבון סיכויי קבלה | MyWay',
        text: 'בדקתי את סיכויי הקבלה שלי ב-MyWay. אפשר לבדוק גם:',
        url: 'https://findmyway.co.il/app/calculator',
      }),
    );
    expect(open).not.toHaveBeenCalled();
    expect(capture.mock.calls).toEqual([
      ['calculator_results_shared', { calculator_surface: 'journey_calculator' }],
    ]);
  });

  it('opens WhatsApp with the sekhem invitation when there is no share sheet', () => {
    const open = vi.fn();
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('open', open);
    vi.stubGlobal('matchMedia', () => ({ matches: false }) as MediaQueryList);
    fireEvent.click(shareButton('sekhem_calculator'));
    const target = open.mock.calls[0][0] as string;
    const text = new URL(target).searchParams.get('text') ?? '';
    expect(target.startsWith('https://wa.me/?text=')).toBe(true);
    expect(text).toContain('חישבתי סכם וממוצע בגרות ב-MyWay');
    expect(text).toContain('https://findmyway.co.il/sekhem-calculator');
    expect(text).not.toMatch(/[=&](bagrut|psychometric|score)=/);
    expect(open).toHaveBeenCalledWith(target, '_blank', 'noopener,noreferrer');
    expect(capture.mock.calls).toEqual([
      ['calculator_results_shared', { calculator_surface: 'sekhem_calculator' }],
    ]);
  });

  it('leaves the page alone when the share sheet is cancelled', async () => {
    const open = vi.fn();
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError')),
    });
    vi.stubGlobal('open', open);
    vi.stubGlobal(
      'matchMedia',
      (query: string) => ({ matches: query === '(pointer: coarse)' }) as MediaQueryList,
    );
    fireEvent.click(shareButton());
    await waitFor(() => expect(screen.getByRole('button').hasAttribute('disabled')).toBe(false));
    expect(open).not.toHaveBeenCalled();
  });

  it('falls back to WhatsApp when the phone share sheet fails', async () => {
    const open = vi.fn();
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError')),
    });
    vi.stubGlobal('open', open);
    vi.stubGlobal(
      'matchMedia',
      (query: string) => ({ matches: query === '(pointer: coarse)' }) as MediaQueryList,
    );
    fireEvent.click(shareButton());
    await waitFor(() => expect(open).toHaveBeenCalled());
    expect(String(open.mock.calls[0][0]).startsWith('https://wa.me/?text=')).toBe(true);
  });
});
