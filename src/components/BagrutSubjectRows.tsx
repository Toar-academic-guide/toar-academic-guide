'use client';

import { useId } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ALL_SUBJECTS, SECTORS } from '@/data/bagrutSubjects';
import type { BagrutWizardSubjectInput } from '@/utils/bagrutSubjectRecord';

export type BagrutSubjectRow = BagrutWizardSubjectInput;

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
}: {
  rows: BagrutSubjectRow[];
  onChange: (rows: BagrutSubjectRow[]) => void;
  isBlankRow?: (row: BagrutSubjectRow) => boolean;
  disabled?: boolean;
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
            <tr key={index}>
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
