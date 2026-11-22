'use client';

import Link from 'next/link';
import posthog from 'posthog-js';
import {
  THRESHOLD_ALERT_COPY,
  THRESHOLD_ALERT_CYCLE,
  isThresholdAlertDegree,
  isThresholdAlertInstitution,
  thresholdAlertDegreeForProgram,
  thresholdAlertPath,
} from '@/lib/thresholdAlerts';

const openSurfaces = new Set(['sekhem_results', 'calculator_results', 'journey_results']);

export default function ThresholdAlertCta({
  surface,
  institutionId,
  programId,
  degreeId,
}: {
  surface: string;
  institutionId?: string;
  programId?: string;
  degreeId?: string;
}) {
  const institution =
    institutionId && isThresholdAlertInstitution(institutionId) ? institutionId : undefined;
  const mappedDegree = degreeId ?? (programId ? thresholdAlertDegreeForProgram(programId) : null);
  const degree = mappedDegree && isThresholdAlertDegree(mappedDegree) ? mappedDegree : undefined;
  if (!openSurfaces.has(surface) && !institution && !degree) return null;
  return (
    <p className="text-sm leading-6 text-slate-700">
      <Link
        href={thresholdAlertPath({
          institutions: institution ? [institution] : [],
          degrees: degree ? [degree] : [],
        })}
        className="inline-flex min-h-11 items-center font-semibold text-cyan-800 underline underline-offset-4"
        onClick={() =>
          posthog.capture('threshold_alert_cta_clicked', {
            surface,
            cycle: THRESHOLD_ALERT_CYCLE,
            ...(institution ? { institution_id: institution } : {}),
            ...(degree ? { degree_id: degree } : {}),
          })
        }
      >
        {THRESHOLD_ALERT_COPY.cta}
      </Link>
    </p>
  );
}
