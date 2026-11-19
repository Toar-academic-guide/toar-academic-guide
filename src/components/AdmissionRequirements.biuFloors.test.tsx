// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AdmissionRequirements from './AdmissionRequirements';
import type { FloorCheckRow } from '@/types/admissionsEvaluation';

describe('BIU per-floor presentation in the shared requirements component', () => {
  it('shows required and student values, every status, sources and the labelled official calculator', () => {
    const statuses = ['pass', 'miss', 'missing', 'conflicting', 'soft_miss'] as const;
    const floors: FloorCheckRow[] = statuses.map((status, index) => ({
      channel: 'ערוץ שקלול',
      label: `תנאי ${index}`,
      displayValue: 700,
      verdictThreshold: 650,
      studentValue: status === 'missing' ? undefined : 660,
      status,
      note: status === 'conflicting' ? 'בדף הפקולטה באנגלית ובדף מועמדי חו"ל מופיע 650' : undefined,
      sourceUrl: 'https://shoham.biu.ac.il/kabala/',
    }));
    const { container } = render(
      <AdmissionRequirements requirements={[]} floorChecks={floors} institutionId="biu" />,
    );
    const table = screen.getByRole('table', { name: 'בדיקת תנאי הסף לפי הציונים שלכם' });
    expect(table.closest('[dir="rtl"]')).toBeTruthy();
    expect(within(table).getByText('נדרש')).toBeTruthy();
    expect(within(table).getByText('שלכם')).toBeTruthy();
    for (const text of [
      'עומדים',
      'לא עומדים',
      'חסר נתון',
      'נתונים סותרים',
      'לפי המחשבון: קבלה מותנית בקורס הכנה בקיץ',
    ])
      expect(within(table).getByText(text)).toBeTruthy();
    expect(within(table).getByText('בדף הפקולטה באנגלית ובדף מועמדי חו"ל מופיע 650')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'המחשבון הרשמי של בר-אילן' })).toBeNull();
    expect(within(table).queryByRole('link')).toBeNull();
    expect(within(table).getByText('תנאי 0')).toBeTruthy();
    expect(container.textContent).not.toMatch(/soft_miss|conflicting|accepted|נדחה/);
  });
  it('does not add a floor table or BIU calculator to existing non-floor requirements', () => {
    render(<AdmissionRequirements requirements={['בגרות מלאה']} institutionId="tau" />);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('link', { name: 'המחשבון הרשמי של בר-אילן' })).toBeNull();
  });
});
