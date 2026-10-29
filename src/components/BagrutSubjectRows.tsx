'use client';

import { Fragment, useId } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ALL_SUBJECTS, SECTORS } from '@/data/bagrutSubjects';
import type { BagrutWizardSubjectInput } from '@/utils/bagrutSubjectRecord';

export type BagrutSubjectRow = BagrutWizardSubjectInput;

export type BagrutFieldErrors = Partial<Record<'units' | 'grade', string>>[];

export const bagrutSubjectLabels = [
  ...new Set([
    ...ALL_SUBJECTS,
    ...Object.values(SECTORS).flatMap((items) => items.map((item) => item.n)),
  ]),
];

export default function BagrutSubjectRows({
  rows,
  onChange,
  isBlankRow = (row) => row.label.trim() === '' && row.grade === '',
  disabled = false,
  fieldErrors,
}: {
  rows: BagrutSubjectRow[];
  onChange: (rows: BagrutSubjectRow[]) => void;
  isBlankRow?: (row: BagrutSubjectRow) => boolean;
  disabled?: boolean;
  fieldErrors?: BagrutFieldErrors;
}) {
  const subjectListId = useId();
  const change = (index: number, updates: Partial<BagrutSubjectRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...updates } : row)));
  return (
    <>
      <table className="journey-grade-table">
        <thead>
          <tr>
            <th scope="col">מקצוע</th>
            <th scope="col">יחידות</th>
            <th scope="col">ציון</th>
            <th scope="col">
              <span className="sr-only">הסרה</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <Fragment key={index}>
              <tr>
                <td>
                  <input
                    list={subjectListId}
                    aria-label={`מקצוע ${index + 1}`}
                    value={row.label}
                    required={!isBlankRow(row)}
                    disabled={disabled}
                    onChange={(event) => change(index, { label: event.target.value })}
                  />
                  {row.assessmentKind !== 'exam' && (
                    <small>
                      {row.assessmentKind === 'final_project' ? 'עבודת גמר' : 'ציון משולב'}
                    </small>
                  )}
                </td>
                <td>
                  <input
                    className={
                      fieldErrors?.[index]?.units
                        ? 'aria-invalid:border-[#8c2438]! focus:outline-[#8c2438]! focus-visible:outline-[#8c2438]!'
                        : undefined
                    }
                    aria-invalid={fieldErrors?.[index]?.units ? true : undefined}
                    aria-describedby={
                      fieldErrors?.[index]?.units
                        ? `${subjectListId}-${index}-units-error`
                        : undefined
                    }
                    aria-label={`יחידות ${index + 1}`}
                    type="number"
                    min={1}
                    max={5}
                    step={1}
                    required={!isBlankRow(row)}
                    disabled={disabled}
                    value={row.units}
                    onChange={(event) =>
                      change(index, {
                        units: event.target.value === '' ? '' : Number(event.target.value),
                      })
                    }
                  />
                </td>
                <td>
                  <input
                    className={
                      fieldErrors?.[index]?.grade
                        ? 'aria-invalid:border-[#8c2438]! focus:outline-[#8c2438]! focus-visible:outline-[#8c2438]!'
                        : undefined
                    }
                    aria-invalid={fieldErrors?.[index]?.grade ? true : undefined}
                    aria-describedby={
                      fieldErrors?.[index]?.grade
                        ? `${subjectListId}-${index}-grade-error`
                        : undefined
                    }
                    aria-label={`ציון ${index + 1}`}
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    required={!isBlankRow(row)}
                    disabled={disabled}
                    value={row.grade}
                    onChange={(event) =>
                      change(index, {
                        grade: event.target.value === '' ? '' : Number(event.target.value),
                      })
                    }
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="journey-icon-button"
                    disabled={disabled}
                    aria-label={`הסרת מקצוע ${index + 1}`}
                    onClick={() => onChange(rows.filter((_, i) => i !== index))}
                  >
                    <Trash2 size={17} />
                  </button>
                </td>
              </tr>
              {(fieldErrors?.[index]?.units || fieldErrors?.[index]?.grade) && (
                <tr>
                  <td colSpan={4} className="text-right">
                    {fieldErrors?.[index]?.units && (
                      <p
                        id={`${subjectListId}-${index}-units-error`}
                        className="mt-1 text-right text-xs text-[#8c2438]"
                      >
                        {fieldErrors[index].units}
                      </p>
                    )}
                    {fieldErrors?.[index]?.grade && (
                      <p
                        id={`${subjectListId}-${index}-grade-error`}
                        className="mt-1 text-right text-xs text-[#8c2438]"
                      >
                        {fieldErrors[index].grade}
                      </p>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      <datalist id={subjectListId}>
        {bagrutSubjectLabels.map((label) => (
          <option key={label} value={label} />
        ))}
      </datalist>
      <button
        className="journey-text-button"
        disabled={disabled}
        type="button"
        onClick={() =>
          onChange([...rows, { label: '', units: 5, grade: '', assessmentKind: 'exam' }])
        }
      >
        <Plus size={16} className="inline" /> הוספת מקצוע
      </button>
    </>
  );
}
