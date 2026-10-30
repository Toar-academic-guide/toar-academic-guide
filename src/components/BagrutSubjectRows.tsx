'use client';

import { Fragment, useId } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { unitOptionsFor } from './bagrutUnitOptions';
import { ALL_SUBJECTS, SECTORS } from '@/data/bagrutSubjects';
import type { BagrutWizardSubjectInput } from '@/utils/bagrutSubjectRecord';

export type BagrutSubjectRow = BagrutWizardSubjectInput & { gradeText?: string };

export function parseBagrutGrade(text: string): number | '' {
  return text === '' ? '' : /^\d+$/.test(text) ? Number(text) : Number.NaN;
}

export function bagrutGradeError(grade: number | '') {
  return grade !== '' && (!Number.isInteger(grade) || grade < 0 || grade > 100)
    ? 'ציון בין 0 ל-100'
    : undefined;
}

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
  sector = 'יהודי',
}: {
  rows: BagrutSubjectRow[];
  onChange: (rows: BagrutSubjectRow[]) => void;
  isBlankRow?: (row: BagrutSubjectRow) => boolean;
  disabled?: boolean;
  fieldErrors?: BagrutFieldErrors;
  sector?: string;
}) {
  const subjectListId = useId();
  const errors: BagrutFieldErrors = rows.map((row, index) => ({
    ...fieldErrors?.[index],
    grade: bagrutGradeError(row.grade) ?? fieldErrors?.[index]?.grade,
  }));
  const change = (index: number, updates: Partial<BagrutSubjectRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...updates } : row)));
  return (
    <>
      <table className="journey-grade-table">
        <thead>
          <tr>
            <th scope="col">מקצועות</th>
            <th scope="col">יחידות</th>
            <th scope="col">ציונים</th>
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
                  <select
                    className={
                      errors?.[index]?.units
                        ? 'px-1! aria-invalid:border-[#8c2438]! focus:outline-[#8c2438]! focus-visible:outline-[#8c2438]!'
                        : 'px-1!'
                    }
                    aria-invalid={errors?.[index]?.units ? true : undefined}
                    aria-describedby={
                      errors?.[index]?.units ? `${subjectListId}-${index}-units-error` : undefined
                    }
                    aria-label={`יחידות ${index + 1}`}
                    required={!isBlankRow(row)}
                    disabled={disabled}
                    value={row.units}
                    onChange={(event) =>
                      change(index, {
                        units: event.target.value === '' ? '' : Number(event.target.value),
                      })
                    }
                  >
                    <option value="">בחירה</option>
                    {unitOptionsFor(row.label, sector, row.units).map((units) => (
                      <option key={units} value={units}>
                        {units}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    className={
                      errors?.[index]?.grade
                        ? 'aria-invalid:border-[#8c2438]! focus:outline-[#8c2438]! focus-visible:outline-[#8c2438]!'
                        : undefined
                    }
                    aria-invalid={errors?.[index]?.grade ? true : undefined}
                    aria-describedby={
                      errors?.[index]?.grade ? `${subjectListId}-${index}-grade-error` : undefined
                    }
                    aria-label={`ציון ${index + 1}`}
                    type="text"
                    inputMode="numeric"
                    required={!isBlankRow(row)}
                    disabled={disabled}
                    value={row.gradeText ?? (Number.isNaN(row.grade) ? '' : row.grade)}
                    ref={(input) => {
                      input?.setCustomValidity(bagrutGradeError(row.grade) ?? '');
                    }}
                    onChange={(event) =>
                      change(index, {
                        gradeText: event.target.value,
                        grade: parseBagrutGrade(event.target.value),
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
              {(errors?.[index]?.units || errors?.[index]?.grade) && (
                <tr>
                  <td colSpan={4} className="text-right">
                    {errors?.[index]?.units && (
                      <p
                        id={`${subjectListId}-${index}-units-error`}
                        className="mt-1 text-right text-xs text-[#8c2438]"
                      >
                        {errors[index].units}
                      </p>
                    )}
                    {errors?.[index]?.grade && (
                      <p
                        id={`${subjectListId}-${index}-grade-error`}
                        className="mt-1 text-right text-xs text-[#8c2438]"
                      >
                        {errors[index].grade}
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
          onChange([...rows, { label: '', units: '', grade: '', assessmentKind: 'exam' }])
        }
      >
        <Plus size={16} className="inline" /> הוספת מקצוע
      </button>
    </>
  );
}
