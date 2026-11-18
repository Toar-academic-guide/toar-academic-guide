'use client';

import { Fragment, useState, useRef, useEffect, useId } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import type { BagrutCertificateType, BagrutSubjectRecord } from '@/types';
import { buildBagrutSubjectRecord, subjectIdForWizardLabel } from '@/utils/bagrutSubjectRecord';

// ── Sector → mandatory subjects ───────────────────────────────────────────────

import { SECTORS, ALL_SUBJECTS } from '@/data/bagrutSubjects';
import { bagrutGradeError, parseBagrutGrade } from './BagrutSubjectRows';
import { defaultUnitsFor, unitOptionsFor } from './bagrutUnitOptions';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MandGrade {
  units: number | '';
  autoUnits?: boolean;
  grade: number | '';
  gradeText?: string;
}

interface ElectiveRow extends MandGrade {
  name: string;
}

interface Props {
  onComplete: (weightedAverage: number) => void;
  onStructuredComplete?: (record: BagrutSubjectRecord) => void;
}

// ── Step labels ───────────────────────────────────────────────────────────────

const STEP_LABELS = ['מגזר', 'חובה', 'בחירה', 'תוצאה'] as const;

// ── Shared input class ────────────────────────────────────────────────────────

const numInput =
  'rounded-lg border border-[#bae6fd] bg-white px-2 py-1.5 text-right text-sm ' +
  'text-slate-900 outline-none placeholder:text-slate-300 ' +
  'focus:border-[#0891b2] focus:ring-2 focus:ring-[#0891b2]/20';

// ── NeoButton-style button helper ─────────────────────────────────────────────

function WizBtn({
  onClick,
  children,
  ghost = false,
  className = '',
}: {
  onClick: () => void;
  children: React.ReactNode;
  ghost?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'py-3 text-base font-bold transition',
        ghost ? 'way-button-secondary px-6' : 'way-button-primary',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BagrutCalculatorWizard({ onComplete, onStructuredComplete }: Props) {
  const gradeId = useId();
  const [step, setStep] = useState(1);
  const [sector, setSector] = useState('יהודי');
  const [certificateType, setCertificateType] = useState<BagrutCertificateType>('other');
  const [mandGrades, setMandGrades] = useState<MandGrade[]>(
    SECTORS['יהודי'].map((subject) => ({
      units: defaultUnitsFor(subject.n, 'יהודי'),
      autoUnits: true,
      grade: '',
    })),
  );
  const [electives, setElectives] = useState<ElectiveRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const [computedAvg, setComputedAvg] = useState<number | null>(null);
  const [structuredRecord, setStructuredRecord] = useState<BagrutSubjectRecord | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  function invalidateCalculatedRecord() {
    setComputedAvg(null);
    setStructuredRecord(null);
  }

  function handleSetSector(sec: string) {
    invalidateCalculatedRecord();
    setSector(sec);
    setMandGrades(
      SECTORS[sec].map((subject) => {
        const previous = mandGrades[SECTORS[sector].findIndex((item) => item.n === subject.n)];
        return previous
          ? {
              ...previous,
              units: previous.autoUnits ? defaultUnitsFor(subject.n, sec) : previous.units,
            }
          : { units: defaultUnitsFor(subject.n, sec), autoUnits: true, grade: '' };
      }),
    );
    setElectives((previous) =>
      previous.map((row) =>
        row.autoUnits ? { ...row, units: defaultUnitsFor(row.name, sec) } : row,
      ),
    );
  }

  function goStep(n: number) {
    if (n === 4 && !structuredRecord) return;
    setStep(n);
    setDropOpen(false);
  }

  function updateMandUnits(i: number, v: number | '') {
    invalidateCalculatedRecord();
    setMandGrades((prev) =>
      prev.map((mg, idx) => (idx === i ? { ...mg, units: v, autoUnits: false } : mg)),
    );
  }

  function updateMandGrade(i: number, text: string) {
    invalidateCalculatedRecord();
    setMandGrades((prev) =>
      prev.map((mg, idx) =>
        idx === i ? { ...mg, grade: parseBagrutGrade(text), gradeText: text } : mg,
      ),
    );
  }

  function addElective(name: string) {
    if (!electives.find((e) => e.name === name)) {
      invalidateCalculatedRecord();
      setElectives((prev) => [
        ...prev,
        { name, units: defaultUnitsFor(name, sector), autoUnits: true, grade: '' },
      ]);
    }
    setSearchQuery('');
    setDropOpen(false);
  }

  function removeElective(idx: number) {
    invalidateCalculatedRecord();
    setElectives((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateElectiveUnits(idx: number, v: number | '') {
    invalidateCalculatedRecord();
    setElectives((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, units: v, autoUnits: false } : e)),
    );
  }

  function updateElectiveGrade(idx: number, text: string) {
    invalidateCalculatedRecord();
    setElectives((prev) =>
      prev.map((e, i) =>
        i === idx ? { ...e, grade: parseBagrutGrade(text), gradeText: text } : e,
      ),
    );
  }

  function calculateAndAdvance() {
    if (mandGrades.some((row) => bagrutGradeError(row.grade))) {
      goStep(2);
      return;
    }
    if (electives.some((row) => bagrutGradeError(row.grade))) return;
    const record = buildBagrutSubjectRecord({
      certificateType,
      complete: true,
      sectorLabel: sector,
      subjects: [
        ...sectorSubs.map((subject, index) => ({
          label: subject.n,
          units: mandGrades[index]?.units ?? '',
          grade: mandGrades[index]?.grade ?? '',
          assessmentKind: 'exam' as const,
        })),
        ...electives.map((subject) => ({
          label: subject.name,
          units: subject.units,
          grade: subject.grade,
          assessmentKind: 'exam' as const,
        })),
      ],
    });
    const totalWeighted = record.subjects.reduce(
      (total, subject) => total + subject.units * subject.grade,
      0,
    );
    const totalUnits = record.subjects.reduce((total, subject) => total + subject.units, 0);

    setComputedAvg(totalUnits > 0 ? totalWeighted / totalUnits : 0);
    setStructuredRecord(record.subjects.length > 0 ? record : null);
    setStep(4);
  }

  function resetWizard() {
    setElectives([]);
    setMandGrades(
      SECTORS[sector].map((subject) => ({
        units: defaultUnitsFor(subject.n, sector),
        autoUnits: true,
        grade: '',
      })),
    );
    setComputedAvg(null);
    setStructuredRecord(null);
    setCertificateType('other');
    setStep(1);
  }

  const addedNames = new Set(electives.map((entry) => entry.name));
  const filteredSubjects = ALL_SUBJECTS.filter(
    (s) => !addedNames.has(s) && (!searchQuery || s.includes(searchQuery)),
  );

  const sectorSubs = SECTORS[sector] ?? SECTORS['יהודי'];

  const enteredRows = structuredRecord?.subjects ?? [];
  const mandatoryIds = new Set(sectorSubs.map((subject) => subjectIdForWizardLabel(subject.n)));
  const mandEnteredCount = enteredRows.filter((row) => mandatoryIds.has(row.subjectId)).length;
  const electEnteredCount = enteredRows.length - mandEnteredCount;
  const totalUnitsEntered = enteredRows.reduce((total, row) => total + row.units, 0);

  return (
    <div dir="rtl" className="overflow-hidden rounded-2xl border border-[#d9e3f3]">
      {/* ── Progress bar ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-center border-b border-[#d9e3f3] bg-[#eef4ff] px-6 py-4">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const isDone = n < step;
          const isActive = n === step;
          const isUnavailable = n === 4 && !structuredRecord;
          return (
            <Fragment key={n}>
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => goStep(n)}
                  disabled={isUnavailable}
                  className={[
                    'flex h-9 w-9 cursor-pointer select-none items-center justify-center rounded-full border-2',
                    'text-sm font-bold transition hover:scale-110',
                    isUnavailable ? 'cursor-not-allowed hover:scale-100' : '',
                    isDone
                      ? 'border-[#0891b2] bg-[#e0f9ff] text-[#0891b2] hover:bg-[#bae6fd]'
                      : isActive
                        ? 'border-[#7784e8] bg-[#7784e8] text-white shadow-[0_0_0_4px_rgba(119,132,232,0.15)] hover:bg-[#6574dc]'
                        : 'border-[#bae6fd] bg-white text-slate-400 hover:border-[#38bdf8]',
                  ].join(' ')}
                >
                  {isDone ? <Check size={14} /> : n}
                </button>
                <span
                  className={`mt-1.5 text-[11px] ${isUnavailable ? 'cursor-not-allowed' : 'cursor-pointer'} ${isActive ? 'font-bold text-slate-900' : 'text-slate-400'}`}
                  onClick={isUnavailable ? undefined : () => goStep(n)}
                >
                  {label}
                </span>
              </div>
              {i < 3 && (
                <div
                  className={`mt-4 h-0.5 min-w-8 flex-1 ${isDone ? 'bg-[#0891b2]' : 'bg-[#bae6fd]'}`}
                />
              )}
            </Fragment>
          );
        })}
      </div>

      {/* ── Step 1: Sector ───────────────────────────────────────────── */}
      {step === 1 && (
        <div className="p-4 sm:p-7">
          <h3 className="mb-1 text-xl font-black text-slate-900">מאיזה מגזר תעודת הבגרות שלכם?</h3>
          <p className="mb-5 text-sm text-slate-500">
            הבחירה קובעת אילו מקצועות חובה יופיעו בשלב הבא
          </p>
          <div className="mb-6 grid grid-cols-3 gap-2">
            {Object.keys(SECTORS).map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => handleSetSector(sec)}
                className={[
                  'rounded-xl border-2 py-3 text-sm font-bold transition',
                  sector === sec
                    ? 'border-[#7784e8] bg-[#eef4ff] text-[#4357ad]'
                    : 'border-[#bae6fd] bg-white text-slate-600 hover:border-[#38bdf8] hover:bg-[#f0fbff]',
                ].join(' ')}
              >
                {sec}
              </button>
            ))}
          </div>
          <label className="mb-6 block text-sm font-bold text-slate-700">
            סוג תעודת הבגרות
            <select
              aria-label="סוג תעודת הבגרות"
              value={certificateType}
              onChange={(event) => {
                invalidateCalculatedRecord();
                setCertificateType(event.target.value as BagrutCertificateType);
              }}
              className="mt-2 w-full rounded-xl border-2 border-[#bae6fd] bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-[#0891b2]"
            >
              <option value="other">אחר / לא בטוח</option>
              <option value="internal">תעודת בגרות אינטרנית</option>
              <option value="external_1977_or_later">תעודה אקסטרנית מ־1977 ואילך</option>
            </select>
          </label>
          <WizBtn onClick={() => goStep(2)} className="w-full">
            המשיכו למקצועות חובה ←
          </WizBtn>
        </div>
      )}

      {/* ── Step 2: Mandatory ────────────────────────────────────────── */}
      {step === 2 && (
        <div className="p-4 sm:p-7">
          <h3 className="mb-1 text-xl font-black text-slate-900">מקצועות חובה</h3>
          <p className="mb-5 text-sm text-slate-500">הזינו יחידות לימוד וציון לכל מקצוע</p>
          <div className="mb-4 space-y-2">
            {sectorSubs.map((sub, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e0f9ff] bg-[#f8feff] px-3 py-3 sm:px-4"
              >
                <span className="w-full text-sm font-bold text-slate-900 sm:w-auto sm:flex-1">
                  {sub.n}
                </span>
                <div className="flex flex-col items-center">
                  <span className="mb-1 text-[10px] font-semibold text-slate-400">יחידות</span>
                  <select
                    aria-label={`יחידות ${sub.n}`}
                    value={mandGrades[i]?.units ?? ''}
                    onChange={(e) =>
                      updateMandUnits(i, e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className={`${numInput} w-24`}
                  >
                    <option value="">בחירה</option>
                    {unitOptionsFor(sub.n, sector, mandGrades[i]?.units ?? '').map((units) => (
                      <option key={units} value={units}>
                        {units}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col items-center">
                  <span className="mb-1 text-[10px] font-semibold text-slate-400">ציונים</span>
                  <input
                    aria-label={`ציון ${sub.n}`}
                    type="text"
                    inputMode="numeric"
                    placeholder="—"
                    value={mandGrades[i]?.gradeText ?? mandGrades[i]?.grade ?? ''}
                    onChange={(event) => updateMandGrade(i, event.target.value)}
                    aria-invalid={bagrutGradeError(mandGrades[i]?.grade ?? '') ? true : undefined}
                    aria-describedby={
                      bagrutGradeError(mandGrades[i]?.grade ?? '')
                        ? `${gradeId}-mandatory-${i}`
                        : undefined
                    }
                    ref={(input) => {
                      input?.setCustomValidity(bagrutGradeError(mandGrades[i]?.grade ?? '') ?? '');
                    }}
                    className={`${numInput} w-16`}
                  />
                  {bagrutGradeError(mandGrades[i]?.grade ?? '') && (
                    <p
                      id={`${gradeId}-mandatory-${i}`}
                      className="mt-1 text-right text-xs text-[#8c2438]"
                    >
                      {bagrutGradeError(mandGrades[i]?.grade ?? '')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <WizBtn onClick={() => goStep(3)} className="flex-1">
              המשיכו למקצועות בחירה ←
            </WizBtn>
            <WizBtn onClick={() => goStep(1)} ghost>
              → חזרה
            </WizBtn>
          </div>
        </div>
      )}

      {/* ── Step 3: Electives ────────────────────────────────────────── */}
      {step === 3 && (
        <div className="p-4 sm:p-7">
          <h3 className="mb-1 text-xl font-black text-slate-900">מקצועות בחירה</h3>
          <p className="mb-4 text-sm text-slate-500">הקלידו שם מקצוע או לחצו על החץ לרשימה המלאה</p>

          {/* Search with flush chevron */}
          <div ref={searchWrapRef} className="relative mb-2">
            <div className="way-search-field flex overflow-hidden rounded-xl border-2 border-[#bae6fd] bg-white transition focus-within:border-[#0891b2]">
              <input
                ref={searchRef}
                type="text"
                placeholder="חפשו מקצוע... (לדוגמה: פיזיקה, ביולוגיה)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setDropOpen(true);
                }}
                onFocus={() => setDropOpen(true)}
                className="way-input-unframed px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => {
                  if (dropOpen) {
                    setDropOpen(false);
                  } else {
                    setSearchQuery('');
                    setDropOpen(true);
                    searchRef.current?.focus();
                  }
                }}
                className="flex shrink-0 items-center border-r border-[#bae6fd] bg-white px-4 text-[#0891b2] transition hover:bg-[#e0f9ff]"
                aria-label="הציגו רשימה מלאה"
              >
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${dropOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            {dropOpen && filteredSubjects.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-[#bae6fd] bg-white! shadow-lg">
                {filteredSubjects.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addElective(s)}
                    className="min-h-11 w-full cursor-pointer border-b border-[#f0f9ff] px-4 py-2.5 text-start text-sm text-slate-900 last:border-0 hover:bg-[#f0fbff] hover:text-[#0891b2]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Elective rows */}
          <div className="mb-4 space-y-2">
            {electives.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#bae6fd] bg-[#f8feff] px-4 py-5 text-center text-sm italic text-slate-400">
                עוד לא הוספתם מקצועות בחירה — חפשו מקצוע למעלה או לחצו על החץ לרשימה המלאה
              </div>
            ) : (
              electives.map((e, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e0f9ff] bg-[#f8feff] px-3 py-3 sm:px-4"
                >
                  <span className="w-full text-sm font-bold text-slate-900 sm:w-auto sm:flex-1">
                    {e.name}
                  </span>
                  <div className="flex flex-col items-center">
                    <span className="mb-1 text-[10px] font-semibold text-slate-400">יחידות</span>
                    <select
                      aria-label={`יחידות ${e.name} ${i + 1}`}
                      value={e.units}
                      onChange={(ev) =>
                        updateElectiveUnits(
                          i,
                          ev.target.value === '' ? '' : Number(ev.target.value),
                        )
                      }
                      className={`${numInput} w-24`}
                    >
                      <option value="">בחירה</option>
                      {unitOptionsFor(e.name, sector, e.units).map((units) => (
                        <option key={units} value={units}>
                          {units}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="mb-1 text-[10px] font-semibold text-slate-400">ציונים</span>
                    <input
                      aria-label={`ציון ${e.name} ${i + 1}`}
                      type="text"
                      inputMode="numeric"
                      placeholder="—"
                      value={e.gradeText ?? e.grade}
                      onChange={(event) => updateElectiveGrade(i, event.target.value)}
                      aria-invalid={bagrutGradeError(e.grade) ? true : undefined}
                      aria-describedby={
                        bagrutGradeError(e.grade) ? `${gradeId}-elective-${i}` : undefined
                      }
                      ref={(input) => {
                        input?.setCustomValidity(bagrutGradeError(e.grade) ?? '');
                      }}
                      className={`${numInput} w-16`}
                    />
                    {bagrutGradeError(e.grade) && (
                      <p
                        id={`${gradeId}-elective-${i}`}
                        className="mt-1 text-right text-xs text-[#8c2438]"
                      >
                        {bagrutGradeError(e.grade)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeElective(i)}
                    aria-label="הסירו מקצוע"
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-3">
            <WizBtn onClick={calculateAndAdvance} className="flex-1">
              חשבו ממוצע בגרות ←
            </WizBtn>
            <WizBtn onClick={() => goStep(2)} ghost>
              → חזרה
            </WizBtn>
          </div>
        </div>
      )}

      {/* ── Step 4: Result ───────────────────────────────────────────── */}
      {step === 4 && (
        <div className="p-4 sm:p-7">
          <h3 className="mb-4 text-xl font-black text-slate-900">אומדן ממוצע הציונים שלכם</h3>

          <div className="mb-4 rounded-2xl border border-[#b8c4ff] bg-[#eef4ff] py-6 text-center">
            <div className="text-5xl font-black tracking-tight text-slate-900">
              {computedAvg !== null && computedAvg > 0 ? computedAvg.toFixed(1) : '—'}
            </div>
            <div className="mt-1 text-sm text-slate-500">אומדן לפי ציונים ויחידות לימוד</div>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            {[
              { value: mandEnteredCount, label: 'מקצועות חובה' },
              { value: electEnteredCount, label: 'מקצועות בחירה' },
              { value: totalUnitsEntered, label: 'יחידות לימוד' },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="rounded-xl border border-[#bae6fd] bg-[#f0fbff] p-3 text-center"
              >
                <div className="text-xl font-black text-[#0891b2]">{value}</div>
                <div className="mt-0.5 text-[11px] text-slate-500">{label}</div>
              </div>
            ))}
          </div>

          <div className="mb-4 rounded-xl border border-[#e0f9ff] bg-[#f8feff] px-4 py-3.5 text-xs leading-relaxed text-slate-500">
            <strong className="font-bold text-slate-900">שימו לב — זהו אומדן ראשוני בלבד.</strong>{' '}
            הוא מחושב מציונים ויחידות בלבד ואינו מחליף ממוצע בגרות משוקלל רשמי כולל בונוסים. הממוצע
            הקובע הוא תמיד זה שמחושב במשרד הרישום של כל מוסד.
          </div>

          <div className="flex gap-3">
            {computedAvg !== null && computedAvg > 0 && (
              <WizBtn
                onClick={() => {
                  onComplete(Math.round(computedAvg * 10) / 10);
                  if (structuredRecord) {
                    onStructuredComplete?.(structuredRecord);
                  }
                }}
                className="flex-1"
              >
                השתמשו באומדן זה ←
              </WizBtn>
            )}
            <WizBtn onClick={resetWizard} ghost>
              חישוב מחדש
            </WizBtn>
          </div>
        </div>
      )}
    </div>
  );
}
