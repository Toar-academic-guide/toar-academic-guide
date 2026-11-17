import { describe, expect, it } from 'vitest';
import { parseTau370CutoffPage, TAU_370_CUTOFFS } from './tau370CutoffVerification';

const page = (receipt: number, rejection: number) =>
  `<script>({"semester_label":"סמסטר א","semester_year":"תשפ\\u0022ז","field_this_year_receipt_threshol":"${receipt}","field_this_year_rejection_thresh":"${rejection}"})</script>`;

describe('TAU issue 370 cutoff drift check', () => {
  it('covers ten programmes and both CS/EE semester tabs', () => {
    expect(TAU_370_CUTOFFS).toHaveLength(12);
    expect(new Set(TAU_370_CUTOFFS.map(([id]) => id)).size).toBe(10);
    expect(TAU_370_CUTOFFS.filter(([id]) => id === 'tau_cs' || id === 'tau_ee')).toHaveLength(4);
  });
  it('reads receipt and rejection fields independently', () => {
    expect(parseTau370CutoffPage(page(705, 704))).toEqual({
      acceptance: 705,
      rejection: 704,
      semester: 'סמסטר א',
      year: 'תשפ"ז',
    });
    expect(parseTau370CutoffPage(page(705, 695))?.rejection).toBe(695);
  });
  it('fails closed on missing or conflicting embedded fields', () => {
    expect(parseTau370CutoffPage('<html>maintenance</html>')).toBeNull();
    expect(parseTau370CutoffPage(`${page(705, 704)}${page(705, 695)}`)).toBeNull();
  });
});
