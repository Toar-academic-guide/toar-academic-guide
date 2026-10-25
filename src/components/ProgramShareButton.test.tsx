// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const capture = vi.hoisted(() => vi.fn());
vi.mock('posthog-js', () => ({ default: { capture } }));
import ProgramShareButton from './ProgramShareButton';

describe('programme sharing', () => {
  afterEach(() => {
    capture.mockClear();
    cleanup();
    vi.unstubAllGlobals();
  });

  const url = () => `${window.location.origin}/programs/danon_cs`;
  function clickShare() {
    render(<ProgramShareButton programId="danon_cs" institutionId="danon" title="קולינריה" />);
    fireEvent.click(screen.getByRole('button', { name: 'שיתוף המסלול' }));
    expect(capture.mock.calls).toEqual([
      ['program_shared', { program_id: 'danon_cs', institution_id: 'danon' }],
    ]);
  }

  it('uses native sharing when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    vi.stubGlobal('navigator', { share, clipboard: { writeText } });
    clickShare();
    await waitFor(() => expect(share).toHaveBeenCalledWith({ title: 'קולינריה', url: url() }));
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies the public programme URL when native sharing is absent', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    clickShare();
    expect((await screen.findByRole('status')).textContent).toBe('הקישור הועתק.');
    expect(writeText).toHaveBeenCalledWith(url());
  });

  it('falls back to copying after a native-share permission failure', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError')),
      clipboard: { writeText },
    });
    clickShare();
    expect((await screen.findByRole('status')).textContent).toBe('הקישור הועתק.');
    expect(writeText).toHaveBeenCalledWith(url());
  });

  it('does not copy after the user cancels the native sheet', async () => {
    const writeText = vi.fn();
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError')),
      clipboard: { writeText },
    });
    clickShare();
    await waitFor(() => expect(screen.getByRole('button').hasAttribute('disabled')).toBe(false));
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('keeps the link usable if the embedded browser never settles native sharing', async () => {
    vi.stubGlobal('navigator', { share: vi.fn(() => new Promise(() => {})) });
    clickShare();
    const input = await screen.findByRole<HTMLInputElement>('textbox', { name: 'קישור לשיתוף' });
    expect(input.value).toBe(url());
    fireEvent.focus(input);
    expect(input.selectionEnd).toBe(url().length);
  });

  it.each([undefined, { writeText: vi.fn().mockRejectedValue(new Error('Denied')) }])(
    'provides a selectable link when both sharing methods are unavailable (%s)',
    async (clipboard) => {
      vi.stubGlobal('navigator', {
        share: vi.fn().mockRejectedValue(new TypeError('Unsupported')),
        clipboard,
      });
      clickShare();
      const input = await screen.findByRole<HTMLInputElement>('textbox', { name: 'קישור לשיתוף' });
      expect(input.value).toBe(url());
      fireEvent.focus(input);
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe(url().length);
      expect(screen.queryByRole('status')).toBeNull();
    },
  );
});
