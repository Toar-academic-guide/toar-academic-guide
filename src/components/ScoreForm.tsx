'use client';

import { useState } from 'react';
import { UserScores, EngineeringOptions } from '@/types';
import { allPrograms } from '@/data/degrees';

const SEKHEM_PROGRAMS = allPrograms.filter((p) => p.admissionType === 'sekhem');

interface Props {
  onSubmit: (scores: UserScores, degreeId: string, engineering: EngineeringOptions) => void;
  defaultDegreeId?: string;
}

export default function ScoreForm({ onSubmit, defaultDegreeId }: Props) {
  const [psychometric, setPsychometric] = useState('');
  const [bagrut, setBagrut] = useState('');
  const [degreeId, setDegreeId] = useState(defaultDegreeId ?? SEKHEM_PROGRAMS[0].id);
  const [hasMath5, setHasMath5] = useState(false);
  const [hasPhysics5, setHasPhysics5] = useState(false);
  const [errors, setErrors] = useState<{ psychometric?: string; bagrut?: string }>({});

  const selectedDegree = SEKHEM_PROGRAMS.find((d) => d.id === degreeId)!;
  const showEngineeringSection = selectedDegree.isTauEngineering ?? false;

  function validate(): boolean {
    const errs: typeof errors = {};
    const psy = Number(psychometric);
    const bag = Number(bagrut);

    if (!psychometric || isNaN(psy) || psy < 200 || psy > 800) {
      errs.psychometric = 'יש להזין ציון פסיכומטרי תקין בין 200 ל-800';
    }
    if (!bagrut || isNaN(bag) || bag < 60 || bag > 120) {
      errs.bagrut = 'יש להזין ממוצע בגרות תקין בין 60 ל-120 (כולל בונוסים)';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(
      { psychometric: Number(psychometric), bagrut: Number(bagrut) },
      degreeId,
      { hasMath5, hasPhysics5 }
    );
  }

  const inputBase =
    'rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:ring-2';
  const inputNormal = 'border-gray-200 bg-white focus:border-blue-400 focus:ring-blue-100';
  const inputError = 'border-red-400 bg-red-50 focus:ring-red-100';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Psychometric */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700" htmlFor="psychometric">
            ציון פסיכומטרי
          </label>
          <input
            id="psychometric"
            type="number"
            min={200}
            max={800}
            placeholder="למשל: 655"
            value={psychometric}
            onChange={(e) => setPsychometric(e.target.value)}
            className={`${inputBase} ${errors.psychometric ? inputError : inputNormal}`}
          />
          {errors.psychometric && (
            <p className="text-xs text-red-600">{errors.psychometric}</p>
          )}
        </div>

        {/* Bagrut */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700" htmlFor="bagrut">
            ממוצע בגרות כולל בונוסים
          </label>
          <input
            id="bagrut"
            type="number"
            min={60}
            max={120}
            step={0.1}
            placeholder="למשל: 100"
            value={bagrut}
            onChange={(e) => setBagrut(e.target.value)}
            className={`${inputBase} ${errors.bagrut ? inputError : inputNormal}`}
          />
          {errors.bagrut && <p className="text-xs text-red-600">{errors.bagrut}</p>}
          <p className="text-xs text-gray-400">
            ממוצע סופי כולל כל הבונוסים הגנריים שחושבו (מקסימום 120)
          </p>
        </div>
      </div>

      {/* Degree selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700" htmlFor="degree">
          תחום לימוד
        </label>
        <select
          id="degree"
          value={degreeId}
          onChange={(e) => setDegreeId(e.target.value)}
          className={`${inputBase} ${inputNormal}`}
        >
          {SEKHEM_PROGRAMS.map((degree) => (
            <option key={degree.id} value={degree.id}>
              {degree.name}
            </option>
          ))}
        </select>
      </div>

      {/* TAU Engineering bonus section — shown only for STEM degrees */}
      {showEngineeringSection && (
        <div className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div>
            <p className="text-sm font-semibold text-blue-900">
              סכם הנדסה ומדעים מדויקים — אוניברסיטת תל אביב
            </p>
            <p className="mt-0.5 text-xs text-blue-700">
              עבור תואר זה, אוניברסיטת תל אביב מעניקה בונוס ישיר לסכם על פי מקצועות הבגרות שלמדת ב-5 יחידות.
              לחץ על המקצועות הרלוונטיים כדי לראות את השפעתם על הסיכויים.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Math 5 */}
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border-2 bg-white px-4 py-2.5 text-sm font-medium transition select-none
              has-[:checked]:border-blue-600 has-[:checked]:bg-blue-600 has-[:checked]:text-white
              border-gray-200 text-gray-700 hover:border-blue-300">
              <input
                type="checkbox"
                className="sr-only"
                checked={hasMath5}
                onChange={(e) => setHasMath5(e.target.checked)}
              />
              <span>📐 מתמטיקה 5 יח׳</span>
              <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-bold text-blue-700 has-[:checked]:bg-blue-500 has-[:checked]:text-white">
                +35
              </span>
            </label>

            {/* Physics 5 */}
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border-2 bg-white px-4 py-2.5 text-sm font-medium transition select-none
              has-[:checked]:border-blue-600 has-[:checked]:bg-blue-600 has-[:checked]:text-white
              border-gray-200 text-gray-700 hover:border-blue-300">
              <input
                type="checkbox"
                className="sr-only"
                checked={hasPhysics5}
                onChange={(e) => setHasPhysics5(e.target.checked)}
              />
              <span>⚛️ פיזיקה 5 יח׳</span>
              <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-bold text-blue-700">
                +25
              </span>
            </label>
          </div>

          {(hasMath5 || hasPhysics5) && (
            <p className="text-xs font-medium text-blue-800">
              סה"כ בונוס לסכם תל אביב:{' '}
              <span className="font-bold">
                +{(hasMath5 ? 35 : 0) + (hasPhysics5 ? 25 : 0)} נקודות
              </span>
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        className="mt-1 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-700 active:scale-95"
      >
        חשב סיכויי קבלה ←
      </button>
    </form>
  );
}
