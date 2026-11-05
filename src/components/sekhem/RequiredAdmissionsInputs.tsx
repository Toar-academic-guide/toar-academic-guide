'use client';

import HaifaQualificationFields, {
  type HaifaQualificationValues,
} from '@/components/HaifaQualificationFields';
import {
  HAIFA_ADMISSION_YEAR,
  HAIFA_PROFILE_KEYS,
  type HaifaAdmissionsInputs,
} from '@/lib/haifaAdmissionsInputs';
import type { AdmissionsRequiredInput } from '@/types/admissionsEvaluation';
import type { BagrutSubjectRecord } from '@/types';
import { calculateHaifaBagrutAverage } from '@/data/admissions/haifaAdmissionFormula';

export function requestedHaifaKeys(
  required: AdmissionsRequiredInput[],
): (keyof HaifaAdmissionsInputs)[] {
  return HAIFA_PROFILE_KEYS.filter(
    (key) =>
      (key === 'haifaPsychometricYear' && required.includes('haifa_psychometric_month')) ||
      required.includes(
        key
          .replace(/Confirmed$/, '')
          .replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`) as AdmissionsRequiredInput,
      ),
  );
}

export default function RequiredAdmissionsInputs({
  keys,
  values,
  onChange,
  disabled,
  bagrutSubjectRecord,
  onBagrutFocus,
}: {
  keys: (keyof HaifaAdmissionsInputs)[];
  values: HaifaQualificationValues;
  onChange: (key: keyof HaifaAdmissionsInputs, value: string) => void;
  disabled: boolean;
  bagrutSubjectRecord?: BagrutSubjectRecord;
  onBagrutFocus?: () => void;
}) {
  const needsBagrutRows =
    keys.includes('haifaBagrutAverage') &&
    calculateHaifaBagrutAverage(bagrutSubjectRecord) === undefined;
  const qualificationKeys = keys.filter((key) => key !== 'haifaBagrutAverage');
  const visibleKeys = qualificationKeys.includes('haifaPsychometricMonth')
    ? [...qualificationKeys, 'haifaPsychometricYear' as const]
    : qualificationKeys;
  if (!visibleKeys.length && !needsBagrutRows) return null;
  const numeric = [
    {
      key: 'haifaBagrutYear' as const,
      label: 'שנת הבגרות',
      min: 1948,
      max: HAIFA_ADMISSION_YEAR,
      step: 1,
    },
  ];
  return (
    <div className="mt-5 grid gap-4">
      {needsBagrutRows && (
        <button
          type="button"
          className="min-h-11 text-right text-sm underline underline-offset-4"
          onClick={onBagrutFocus}
          disabled={disabled}
        >
          השלימו ציוני בגרות
        </button>
      )}
      {numeric
        .filter((field) => keys.includes(field.key))
        .map((field) => (
          <label key={field.key} className="text-sm" htmlFor={field.key}>
            {field.label}
            <input
              id={field.key}
              className="sekhem-input mt-1"
              type="number"
              min={field.min}
              max={field.max}
              step={field.step}
              value={values[field.key] ?? ''}
              onChange={(event) => onChange(field.key, event.target.value)}
              disabled={disabled}
            />
          </label>
        ))}
      <HaifaQualificationFields
        values={values}
        onChange={onChange}
        disabled={disabled}
        visibleKeys={visibleKeys}
        compact
        inputClassName="sekhem-input"
      />
    </div>
  );
}
