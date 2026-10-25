'use client';

import Link from 'next/link';
import posthog from 'posthog-js';
import type { ReactNode } from 'react';

export type ProgramClickEvent =
  | 'institution_site_clicked'
  | 'institution_calculator_clicked'
  | 'program_contact_cta_clicked'
  | 'program_calculator_cta_clicked';

export default function ProgramTrackedLink({
  event,
  programId,
  institutionId,
  ...props
}: {
  event: ProgramClickEvent;
  programId: string;
  institutionId: string;
  href: string;
  children: ReactNode;
  className?: string;
  target?: string;
  rel?: string;
}) {
  return (
    <Link
      {...props}
      onClick={() => {
        posthog.capture(event, { program_id: programId, institution_id: institutionId });
      }}
    />
  );
}
