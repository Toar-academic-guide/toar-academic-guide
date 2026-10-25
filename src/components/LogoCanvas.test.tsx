// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LogoCanvas from './LogoCanvas';

describe('shared wordmark', () => {
  it.each([
    [false, '/brand/myway-wordmark.svg'],
    [true, '/brand/myway-wordmark-inverse.svg'],
  ])('uses the supplied wordmark when brighten=%s', (brighten, src) => {
    render(<LogoCanvas size={32} brighten={brighten} />);
    const logo = screen.getByRole('img', { name: 'MyWay' });
    expect(logo.tagName).toBe('IMG');
    expect(logo.getAttribute('src')).toBe(src);
    expect(logo.style.height).toBe('32px');
  });
});
