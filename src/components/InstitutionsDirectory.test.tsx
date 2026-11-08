// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import InstitutionsDirectory from './InstitutionsDirectory';
import type { InstitutionDirectoryItem } from '@/data/institutionDirectory';

vi.mock('@/components/WayPageShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const institution: InstitutionDirectoryItem = {
  id: 'tau',
  itemId: 'tau',
  name: 'אוניברסיטת תל אביב',
  type: 'אוניברסיטה',
  funding: null,
  location: 'תל אביב',
  diplomaType: 'תואר אקדמי',
  sourceUrl: null,
  domain: null,
  logoUrl: null,
  areas: ['tel_aviv'],
  categories: ['universities'],
  credentials: ['academic_degree'],
  coverageLevel: null,
  confidence: null,
  launchPriority: null,
};

it('places a secondary transfer-guide link after the institution results', () => {
  render(<InstitutionsDirectory institutions={[institution]} />);

  expect(
    screen.getByRole('link', { name: 'המדריך למעבר בין מוסדות לימוד' }).getAttribute('href'),
  ).toBe('/transfer');
  expect(screen.getByRole('link', { name: 'לעמוד המוסד' }).getAttribute('href')).toBe(
    '/institutions/tau',
  );
});
