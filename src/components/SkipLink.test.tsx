// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SkipLink from './SkipLink';

function expectSkipToMain(id?: string, tabIndex?: number) {
  const scrollIntoView = vi.fn();
  render(
    <>
      <SkipLink />
      <a href="/about">Other link</a>
      <main id={id} tabIndex={tabIndex}>
        Content
      </main>
    </>,
  );
  const main = screen.getByRole('main');
  main.scrollIntoView = scrollIntoView;
  const link = screen.getByRole('link', { name: 'דלג לתוכן הראשי' });
  expect(link.getAttribute('href')).toBe('#main-content');
  fireEvent.click(link);
  expect(document.activeElement).toBe(main);
  expect(scrollIntoView).toHaveBeenCalledOnce();
  return main;
}

describe('SkipLink', () => {
  it('focuses and scrolls main#main-content', () => {
    expect(expectSkipToMain('main-content').getAttribute('tabindex')).toBe('-1');
  });
  it('falls back to an existing main without an id', () => {
    expect(expectSkipToMain().getAttribute('tabindex')).toBe('-1');
  });
  it('preserves an existing tabindex', () => {
    expect(expectSkipToMain('main-content', 0).getAttribute('tabindex')).toBe('0');
  });
  it('prefers the explicit target over an earlier main', () => {
    render(
      <>
        <SkipLink />
        <main>Earlier</main>
        <main id="main-content">Target</main>
      </>,
    );
    const target = document.getElementById('main-content')!;
    target.scrollIntoView = vi.fn();
    fireEvent.click(screen.getByRole('link'));
    expect(document.activeElement).toBe(target);
  });
  it('keeps native anchor behavior if there is no target', () => {
    render(<SkipLink />);
    expect(fireEvent.click(screen.getByRole('link'))).toBe(true);
  });
});
