'use client';
import type { AdmissionsRequiredInput } from '@/types/admissionsEvaluation';
import {
  MEDICINE_REQUIRED_INPUTS,
  type MedicineAcademicInputs,
} from '@/lib/medicineAcademicInputs';

export type MedicineAcademicValues = Partial<Record<keyof MedicineAcademicInputs, string>>;
export default function MedicineAcademicFields({
  required,
  values,
  onChange,
  disabled,
}: {
  required: AdmissionsRequiredInput[];
  values: MedicineAcademicValues;
  onChange: (key: keyof MedicineAcademicInputs, value: string) => void;
  disabled: boolean;
}) {
  const visible = (key: keyof typeof MEDICINE_REQUIRED_INPUTS) =>
    required.includes(MEDICINE_REQUIRED_INPUTS[key]) || Boolean(values[key]);
  if (
    !Object.keys(MEDICINE_REQUIRED_INPUTS).some((key) =>
      visible(key as keyof typeof MEDICINE_REQUIRED_INPUTS),
    )
  )
    return null;
  return (
    <div className="mt-5 grid gap-4 text-right sm:grid-cols-2">
      {visible('medicineCertificateLanguage') && (
        <label className="text-sm">
          שפת תעודת הבגרות
          <select
            id="medicineCertificateLanguage"
            className="sekhem-input mt-1 text-right"
            disabled={disabled}
            value={values.medicineCertificateLanguage ?? ''}
            onChange={(e) => onChange('medicineCertificateLanguage', e.target.value)}
          >
            <option value="">בחרו</option>
            <option value="hebrew">עברית</option>
            <option value="arabic">ערבית</option>
          </select>
        </label>
      )}
      {visible('medicinePsychometricDate') && (
        <label className="text-sm">
          מועד הפסיכומטרי
          <input
            id="medicinePsychometricDate"
            type="date"
            className="sekhem-input mt-1 text-right [&::-webkit-datetime-edit]:flex [&::-webkit-datetime-edit]:justify-end [&::-webkit-date-and-time-value]:text-right"
            dir="ltr"
            disabled={disabled}
            value={values.medicinePsychometricDate ?? ''}
            onChange={(e) => onChange('medicinePsychometricDate', e.target.value)}
          />
        </label>
      )}
      {visible('medicineEnglishExempt') && (
        <label className="text-sm">
          פטור באנגלית
          <select
            id="medicineEnglishExempt"
            className="sekhem-input mt-1"
            disabled={disabled}
            value={values.medicineEnglishExempt ?? ''}
            onChange={(e) => onChange('medicineEnglishExempt', e.target.value)}
          >
            <option value="">בחרו</option>
            <option value="true">פטור מוכר</option>
            <option value="false">לפי ציון האנגלית</option>
          </select>
        </label>
      )}
      {visible('medicineHebrewBasis') && (
        <label className="text-sm">
          ידיעת עברית
          <select
            id="medicineHebrewBasis"
            className="sekhem-input mt-1"
            disabled={disabled}
            value={values.medicineHebrewBasis ?? ''}
            onChange={(e) => onChange('medicineHebrewBasis', e.target.value)}
          >
            <option value="">בחרו</option>
            <option value="hebrew_school">תיכון בשפה העברית</option>
            <option value="exam">ציון יע״ל / יעלנט</option>
            <option value="exempt">פטור מוכר</option>
          </select>
        </label>
      )}
      {(visible('medicineHebrewScore') || values.medicineHebrewBasis === 'exam') && (
        <label className="text-sm">
          ציון יע״ל / יעלנט
          <input
            id="medicineHebrewScore"
            className="sekhem-input mt-1 text-right"
            type="number"
            dir="ltr"
            min={0}
            max={150}
            disabled={disabled}
            value={values.medicineHebrewScore ?? ''}
            onChange={(e) => onChange('medicineHebrewScore', e.target.value)}
          />
        </label>
      )}
    </div>
  );
}
