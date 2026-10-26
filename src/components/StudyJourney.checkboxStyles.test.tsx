// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ENQUIRY_PREP_CONSENT } from '@/lib/enquiries';
import EnquiryForm from './EnquiryForm';

vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

it('exempts only enquiry prep consent from the 18px journey checkbox rule', () => {
  const style = document.createElement('style');
  style.textContent = readFileSync('src/components/StudyJourney.css', 'utf8');
  document.head.append(style);

  try {
    render(
      <div className="study-journey">
        <EnquiryForm programId="cs" institutionId="tau" title="מדעי המחשב" surface="journey" />
        <label className="journey-complete">
          <input type="checkbox" />
          השלמת ציונים
        </label>
        <div className="journey-saved-row">
          <label>
            <input type="checkbox" />
            להשוואה
          </label>
        </div>
      </div>,
    );

    const rule = Array.from(style.sheet!.cssRules).find(
      (rule): rule is CSSStyleRule =>
        rule instanceof CSSStyleRule && rule.selectorText.includes("input[type='checkbox']"),
    );
    expect(rule).toBeDefined();
    expect(rule!.style.getPropertyValue('width')).toBe('18px');
    expect(rule!.style.getPropertyValue('height')).toBe('18px');
    expect(rule!.style.getPropertyValue('flex-shrink')).toBe('0');
    expect(rule!.style.getPropertyValue('accent-color')).toBe('rgb(101, 84, 184)');

    const prep = within(screen.getByRole('dialog')).getByRole('checkbox', {
      name: ENQUIRY_PREP_CONSENT,
    });
    expect(prep.matches(rule!.selectorText)).toBe(false);
    expect(prep.classList.contains('size-[22px]')).toBe(true);
    expect(prep.classList.contains('accent-[#5548aa]')).toBe(true);

    for (const name of ['השלמת ציונים', 'להשוואה']) {
      const checkbox = screen.getByRole('checkbox', { name });
      expect(checkbox.matches(rule!.selectorText)).toBe(true);
      const computed = getComputedStyle(checkbox);
      expect(computed.width).toBe('18px');
      expect(computed.height).toBe('18px');
      expect(computed.flexShrink).toBe('0');
      expect(computed.accentColor).toBe('rgb(101, 84, 184)');
    }
  } finally {
    style.remove();
  }
});
