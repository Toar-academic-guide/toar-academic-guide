'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Upload, FileText, X, Brain, GraduationCap, Loader2 } from 'lucide-react';
import type { AcademicScores, UserProfile } from '@/types';
import BagrutCalculatorWizard from './BagrutCalculatorWizard';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.72, ease: EASE, delay },
});

interface FileInfo {
  name: string;
  size: number;
}

interface Props {
  onComplete: (scores: AcademicScores) => void | Promise<boolean | void>;
  onSkip: () => void;
  onClearLocalProfileData: () => Promise<void>;
  initialScores?: AcademicScores;
  initialDocuments?: UserProfile['uploadedDocuments'];
  isAuthenticated?: boolean;
  alertContinuation?: {
    title: string;
    submitLabel: string;
    requiresStructuredBagrut: boolean;
  };
}

export default function AcademicProfileForm({
  onComplete,
  onSkip,
  onClearLocalProfileData,
  initialScores,
  initialDocuments = [],
  isAuthenticated = false,
  alertContinuation,
}: Props) {
  const [psyOverall, setPsyOverall] = useState(
    initialScores?.psychometric?.overall?.toString() ?? '',
  );
  const [psyQuantitative, setPsyQuantitative] = useState(
    initialScores?.psychometric?.quantitative?.toString() ?? '',
  );
  const [psyVerbal, setPsyVerbal] = useState(initialScores?.psychometric?.verbal?.toString() ?? '');
  const [psyEnglish, setPsyEnglish] = useState(
    initialScores?.psychometric?.english?.toString() ?? '',
  );
  const [bagrutAverage, setBagrutAverage] = useState(
    initialScores?.bagrut?.weightedAverage?.toString() ?? '',
  );
  const [bagrutEstimate, setBagrutEstimate] = useState<number | null>(null);
  const [bagrutSubjectRecord, setBagrutSubjectRecord] = useState(
    initialScores?.bagrut?.subjectRecord,
  );

  const initialPsy = initialDocuments?.find((document) => document.kind === 'psychometric');
  const initialBagrut = initialDocuments?.find((document) => document.kind === 'bagrut');

  const [psyFile, setPsyFile] = useState<FileInfo | null>(
    initialPsy ? { name: initialPsy.displayName, size: initialPsy.sizeBytes ?? 0 } : null,
  );
  const [bagrutFile, setBagrutFile] = useState<FileInfo | null>(
    initialBagrut ? { name: initialBagrut.displayName, size: initialBagrut.sizeBytes ?? 0 } : null,
  );
  const [psyFileObject, setPsyFileObject] = useState<File | null>(null);
  const [bagrutFileObject, setBagrutFileObject] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const psyFileRef = useRef<HTMLInputElement>(null);
  const bagrutFileRef = useRef<HTMLInputElement>(null);

  function resetLocalDraftFields() {
    setPsyOverall('');
    setPsyQuantitative('');
    setPsyVerbal('');
    setPsyEnglish('');
    setBagrutAverage('');
    setBagrutSubjectRecord(undefined);
    setPsyFile(null);
    setBagrutFile(null);
    setPsyFileObject(null);
    setBagrutFileObject(null);
    if (psyFileRef.current) {
      psyFileRef.current.value = '';
    }
    if (bagrutFileRef.current) {
      bagrutFileRef.current.value = '';
    }
  }
  async function handleSave() {
    setIsSaving(true);
    setError(null);

    const scores: AcademicScores = {};
    const overall = psyOverall ? Number(psyOverall) : undefined;
    const quantitative = psyQuantitative ? Number(psyQuantitative) : undefined;
    const verbal = psyVerbal ? Number(psyVerbal) : undefined;
    const english = psyEnglish ? Number(psyEnglish) : undefined;

    if (
      overall !== undefined ||
      quantitative !== undefined ||
      verbal !== undefined ||
      english !== undefined
    ) {
      scores.psychometric = { overall, quantitative, verbal, english };
    }

    const weightedAverage = bagrutAverage ? Number(bagrutAverage) : undefined;
    if (weightedAverage !== undefined || bagrutSubjectRecord) {
      scores.bagrut = {
        ...(weightedAverage !== undefined ? { weightedAverage } : {}),
        ...(bagrutSubjectRecord ? { subjectRecord: bagrutSubjectRecord } : {}),
      };
    }

    if (
      alertContinuation?.requiresStructuredBagrut &&
      (!scores.psychometric?.overall ||
        !scores.bagrut?.weightedAverage ||
        !scores.bagrut.subjectRecord?.subjects.length)
    ) {
      setError('כדי להפעיל מעקב צריך להשלים את מקצועות הבגרות והיחידות שלך.');
      setIsSaving(false);
      return;
    }

    try {
      const promises: Promise<void>[] = [];

      if (initialPsy && !psyFile) {
        promises.push(
          fetch('/api/documents?kind=psychometric', { method: 'DELETE' }).then(async (response) => {
            if (!response.ok) {
              const body = await response.json().catch(() => ({}));
              throw new Error(body.error?.message || 'Failed to delete psychometric document');
            }
          }),
        );
      }

      if (psyFileObject) {
        const formData = new FormData();
        formData.append('file', psyFileObject);
        formData.append('kind', 'psychometric');
        promises.push(
          fetch('/api/documents', {
            method: 'POST',
            body: formData,
          }).then(async (response) => {
            if (!response.ok) {
              const body = await response.json().catch(() => ({}));
              throw new Error(body.error?.message || 'Failed to upload psychometric document');
            }
          }),
        );
      }

      if (initialBagrut && !bagrutFile) {
        promises.push(
          fetch('/api/documents?kind=bagrut', { method: 'DELETE' }).then(async (response) => {
            if (!response.ok) {
              const body = await response.json().catch(() => ({}));
              throw new Error(body.error?.message || 'Failed to delete bagrut document');
            }
          }),
        );
      }

      if (bagrutFileObject) {
        const formData = new FormData();
        formData.append('file', bagrutFileObject);
        formData.append('kind', 'bagrut');
        promises.push(
          fetch('/api/documents', {
            method: 'POST',
            body: formData,
          }).then(async (response) => {
            if (!response.ok) {
              const body = await response.json().catch(() => ({}));
              throw new Error(body.error?.message || 'Failed to upload bagrut document');
            }
          }),
        );
      }

      await Promise.all(promises);
      const completed = await onComplete(scores);
      if (completed === false) {
        setError('לא הצלחנו לשמור את הפרופיל שלך. אפשר לנסות שוב.');
        setIsSaving(false);
      }
    } catch (caughtError: any) {
      console.error('[AcademicProfileForm] Error saving documents:', caughtError);
      setError(caughtError.message || 'התרחשה שגיאה בשמירת המסמכים. אנא נסה שנית.');
      setIsSaving(false);
    }
  }

  const inputBase =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm ' +
    'text-slate-800 placeholder-slate-300 outline-none transition ' +
    'focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';

  return (
    <div className="min-h-screen bg-[#f5f4f0] px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-8">
        <motion.div {...fadeUp(0)}>
          <Image
            src="/way-logo.png"
            alt="לוגו"
            width={440}
            height={150}
            className="h-24 w-auto object-contain md:h-32"
            priority
          />
        </motion.div>

        <motion.div
          {...fadeUp(0.18)}
          className="w-full rounded-3xl border border-[#e5e7eb] bg-white p-8 shadow-lg md:p-10"
        >
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              הזן את הנתונים האקדמיים שלך
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              המידע יאפשר חישוב מדויק של סיכויי הקבלה שלך. כל השדות אופציונליים — מלא את מה שיש לך.
            </p>
            {alertContinuation ? (
              <p className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold leading-5 text-sky-900">
                {alertContinuation.title}
              </p>
            ) : null}
          </div>

          <section className="mb-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                <Brain size={17} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">ציוני פסיכומטרי</h2>
                <p className="text-xs text-slate-400">ציון סופי 200–800, ציוני דגש 50–150</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="psy-overall" className="text-xs font-medium text-slate-600">
                  ציון כללי
                </label>
                <input
                  id="psy-overall"
                  type="number"
                  min={200}
                  max={800}
                  placeholder="למשל: 650"
                  value={psyOverall}
                  onChange={(event) => setPsyOverall(event.target.value)}
                  disabled={isSaving}
                  className={`${inputBase} disabled:cursor-not-allowed disabled:opacity-50`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="psy-quant" className="text-xs font-medium text-slate-600">
                  דגש כמותי
                </label>
                <input
                  id="psy-quant"
                  type="number"
                  min={50}
                  max={150}
                  placeholder="למשל: 135"
                  value={psyQuantitative}
                  onChange={(event) => setPsyQuantitative(event.target.value)}
                  disabled={isSaving}
                  className={`${inputBase} disabled:cursor-not-allowed disabled:opacity-50`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="psy-verbal" className="text-xs font-medium text-slate-600">
                  דגש מילולי
                </label>
                <input
                  id="psy-verbal"
                  type="number"
                  min={50}
                  max={150}
                  placeholder="למשל: 120"
                  value={psyVerbal}
                  onChange={(event) => setPsyVerbal(event.target.value)}
                  disabled={isSaving}
                  className={`${inputBase} disabled:cursor-not-allowed disabled:opacity-50`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="psy-english" className="text-xs font-medium text-slate-600">
                  אנגלית
                </label>
                <input
                  id="psy-english"
                  type="number"
                  min={50}
                  max={150}
                  placeholder="למשל: 130"
                  value={psyEnglish}
                  onChange={(event) => setPsyEnglish(event.target.value)}
                  disabled={isSaving}
                  className={`${inputBase} disabled:cursor-not-allowed disabled:opacity-50`}
                />
              </div>
            </div>

            <div className="mt-4">
              <input
                ref={psyFileRef}
                type="file"
                accept="image/*,.pdf"
                className="sr-only"
                aria-label="העלאת תדפיס פסיכומטרי"
                disabled={isSaving}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    setPsyFile({ name: file.name, size: file.size });
                    setPsyFileObject(file);
                  }
                }}
              />
              {psyFile ? (
                <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-indigo-700">
                    <FileText size={14} className="shrink-0" />
                    <span className="max-w-[18rem] truncate font-medium">{psyFile.name}</span>
                    <span className="shrink-0 text-indigo-400">
                      ({(psyFile.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={isSaving}
                    aria-label="הסר קובץ"
                    onClick={() => {
                      setPsyFile(null);
                      setPsyFileObject(null);
                      if (psyFileRef.current) {
                        psyFileRef.current.value = '';
                      }
                    }}
                    className="ml-2 text-indigo-400 transition hover:text-indigo-700 disabled:opacity-50"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => psyFileRef.current?.click()}
                  className={[
                    'flex w-full items-center justify-center gap-2',
                    'rounded-xl border-2 border-dashed border-slate-200 bg-slate-50',
                    'px-4 py-3.5 text-xs font-medium text-slate-400',
                    'transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  ].join(' ')}
                >
                  <Upload size={14} />
                  <span>העלה תדפיס פסיכומטרי (תמונה / PDF)</span>
                </button>
              )}
            </div>
          </section>

          <div className="mb-8 h-px w-full bg-slate-100" />

          <section className="mb-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                <GraduationCap size={17} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">ציוני בגרות</h2>
                <p className="text-xs text-slate-400">
                  הזן את הממוצע הרשמי הכולל בונוסים. האשף למטה הוא כלי עזר בלבד.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="bagrut-avg" className="text-xs font-medium text-slate-600">
                ממוצע משוקלל כולל בונוסים
              </label>
              <input
                id="bagrut-avg"
                type="number"
                min={60}
                max={120}
                step={0.1}
                placeholder="למשל: 102.5"
                value={bagrutAverage}
                onChange={(event) => setBagrutAverage(event.target.value)}
                disabled={isSaving}
                className={`${inputBase} sm:max-w-xs disabled:cursor-not-allowed disabled:opacity-50`}
              />
              <p className="text-xs text-slate-400">
                יש להזין את הממוצע הרשמי שחושב עבורך כולל בונוסים גנריים. האשף למטה נותן אומדן לצורך
                בדיקה בלבד.
              </p>
            </div>

            {bagrutEstimate !== null ? (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div className="text-sm text-emerald-800">
                  <span className="font-semibold">אומדן מהאשף: {bagrutEstimate.toFixed(1)}</span>
                  <p className="mt-1 text-xs text-emerald-700">
                    האומדן אינו מחליף ממוצע משוקלל רשמי של המוסד או משרד החינוך.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setBagrutAverage(bagrutEstimate.toFixed(1))}
                  className="text-xs text-emerald-600 transition hover:text-emerald-800 disabled:opacity-50"
                >
                  העתק לשדה
                </button>
              </div>
            ) : null}

            <div className="mt-4">
              <input
                ref={bagrutFileRef}
                type="file"
                accept="image/*,.pdf"
                className="sr-only"
                aria-label="העלאת גיליון ציוני בגרות"
                disabled={isSaving}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    setBagrutFile({ name: file.name, size: file.size });
                    setBagrutFileObject(file);
                  }
                }}
              />
              {bagrutFile ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-emerald-700">
                    <FileText size={14} className="shrink-0" />
                    <span className="max-w-[18rem] truncate font-medium">{bagrutFile.name}</span>
                    <span className="shrink-0 text-emerald-400">
                      ({(bagrutFile.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={isSaving}
                    aria-label="הסר קובץ"
                    onClick={() => {
                      setBagrutFile(null);
                      setBagrutFileObject(null);
                      if (bagrutFileRef.current) {
                        bagrutFileRef.current.value = '';
                      }
                    }}
                    className="ml-2 text-emerald-400 transition hover:text-emerald-700 disabled:opacity-50"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => bagrutFileRef.current?.click()}
                  className={[
                    'flex w-full items-center justify-center gap-2',
                    'rounded-xl border-2 border-dashed border-slate-200 bg-slate-50',
                    'px-4 py-3.5 text-xs font-medium text-slate-400',
                    'transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  ].join(' ')}
                >
                  <Upload size={14} />
                  <span>העלה גיליון ציוני בגרות (תמונה / PDF)</span>
                </button>
              )}
            </div>

            <div className="mt-4">
              <BagrutCalculatorWizard
                onComplete={(average) => setBagrutEstimate(average)}
                onStructuredComplete={setBagrutSubjectRecord}
              />
            </div>
          </section>

          <section className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-xl">
                <h2 className="text-sm font-semibold text-slate-800">פרטיות ושליטה בנתונים</h2>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  {isAuthenticated
                    ? 'הפעולה הזאת מוחקת רק נתונים שנשמרו בדפדפן במכשיר הזה. נתוני החשבון, רשימת הייעוד והמסמכים שנשמרו בחשבון לא יימחקו כאן.'
                    : 'הפעולה הזאת מוחקת את טיוטת הפרופיל שנשמרה בדפדפן במכשיר הזה, כולל ציונים ומסמכים שהוצגו מקומית.'}
                </p>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={async () => {
                  await onClearLocalProfileData();
                  setError(null);

                  if (!isAuthenticated) {
                    resetLocalDraftFields();
                  }
                }}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                נקה נתונים מהמכשיר הזה
              </button>
            </div>
          </section>

          {error ? (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <motion.div {...fadeUp(0.38)} className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={[
                'w-full rounded-full px-8 py-3.5 text-sm font-bold text-white',
                'bg-gradient-to-l from-indigo-600 to-violet-600',
                'shadow-lg shadow-indigo-200/70',
                'transition hover:brightness-110 hover:shadow-xl active:scale-[0.98]',
                'flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50',
              ].join(' ')}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{alertContinuation?.submitLabel ?? 'שמור והמשך לשאלון ←'}</span>
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={onSkip}
              className="text-sm text-slate-400 transition hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              דלג — אמלא מאוחר יותר
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
