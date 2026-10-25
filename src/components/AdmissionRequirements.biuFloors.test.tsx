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
    const table = screen.getByRole('table', { name: 'בדיקת תנאי הסף לפי הציונים שלך' });
    expect(table.closest('[dir="rtl"]')).toBeTruthy();
    expect(within(table).getByText('נדרש')).toBeTruthy();
    expect(within(table).getByText('שלך')).toBeTruthy();
    for (const text of [
      'עומד/ת',
      'לא עומד/ת',
      'חסר נתון',
      'מקורות סותרים',
      'לפי המחשבון: קבלה מותנית בקורס הכנה בקיץ',
    ])
      expect(within(table).getByText(text)).toBeTruthy();
    expect(within(table).getByText('בדף הפקולטה באנגלית ובדף מועמדי חו"ל מופיע 650')).toBeTruthy();
    const link = screen.getByRole('link', { name: 'המחשבון הרשמי של בר-אילן' });
    const url = new URL(link.getAttribute('href')!);
    expect(url.origin + url.pathname).toBe('https://shoham.biu.ac.il/kabala/');
    expect(url.searchParams.get('utm_source')).toBe('myway');
    expect(url.searchParams.get('utm_medium')).toBe('referral');
    expect(container.textContent).not.toMatch(/soft_miss|conflicting|accepted|נדחה/);
  });
  it('does not add a floor table or BIU calculator to existing non-floor requirements', () => {
    render(<AdmissionRequirements requirements={['בגרות מלאה']} institutionId="tau" />);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('link', { name: 'המחשבון הרשמי של בר-אילן' })).toBeNull();
  });
});
