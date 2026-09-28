'use client';

import {
  HAIFA_ADMISSION_YEAR,
  HAIFA_QUALIFICATION_PROFILE_KEYS,
  HAIFA_NUMERIC_QUALIFICATION_KEYS,
  haifaProfileInputsSchema,
} from '@/lib/haifaAdmissionsInputs';
import HaifaQualificationFields, {
  type HaifaQualificationValues,
} from './HaifaQualificationFields';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Upload, FileText, X, Brain, GraduationCap, Loader2 } from 'lucide-react';
import type { AcademicScores, UserProfile } from '@/types';
import BguHealthFields, { type HealthFormValues } from './BguHealthFields';
import { BGU_HEALTH_PROFILE_KEYS, bguHealthInputsSchema } from '@/lib/bguHealthInputs';
import BguQuantitativeFields from './BguQuantitativeFields';
import { BGU_QUANTITATIVE_PROFILE_KEYS } from '@/lib/calculatorInputRequirements';
import type { BguQuantitativeInputs } from '@/lib/bguQuantitativeInputs';
import BguPsychologyFields, { type PsychologyFormValues } from './BguPsychologyFields';
import { BGU_PSYCHOLOGY_PROFILE_KEYS, bguPsychologyInputsSchema } from '@/lib/bguPsychologyInputs';
import HujiMedicineFields, { type MedicineFormValues } from './HujiMedicineFields';
import { HUJI_MEDICINE_PROFILE_KEYS, hujiMedicineInputsSchema } from '@/lib/hujiMedicineInputs';
import BguSocialScienceFields, { type SocialScienceFormValues } from './BguSocialScienceFields';
import {
  BGU_SOCIAL_SCIENCE_PROFILE_KEYS,
  bguSocialScienceInputsSchema,
} from '@/lib/bguSocialScienceInputs';
import BagrutCalculatorWizard from './BagrutCalculatorWizard';
import { BguEngineeringFields } from './BguEngineeringFields';

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
  const [medicineValues, setMedicineValues] = useState<MedicineFormValues>(() =>
    Object.fromEntries(
      HUJI_MEDICINE_PROFILE_KEYS.map((key) => [
        key,
        initialScores?.admissions?.[key]?.toString() ?? '',
      ]),
    ),
  );
  const [haifaQualificationValues, setHaifaQualificationValues] =
    useState<HaifaQualificationValues>(() =>
      Object.fromEntries(
        HAIFA_QUALIFICATION_PROFILE_KEYS.map((key) => [
          key,
          initialScores?.admissions?.[key]?.toString() ?? '',
        ]),
      ),
    );
  const [healthValues, setHealthValues] = useState<HealthFormValues>(() =>
    Object.fromEntries(
      BGU_HEALTH_PROFILE_KEYS.map((key) => [
        key,
        initialScores?.admissions?.[key]?.toString() ?? '',
      ]),
    ),
  );
  const [socialScienceValues, setSocialScienceValues] = useState<SocialScienceFormValues>(() =>
    Object.fromEntries(
      BGU_SOCIAL_SCIENCE_PROFILE_KEYS.map((key) => [
        key,
        initialScores?.admissions?.[key]?.toString() ?? '',
      ]),
    ),
  );
  const [psychologyValues, setPsychologyValues] = useState<PsychologyFormValues>(() =>
    Object.fromEntries(
      BGU_PSYCHOLOGY_PROFILE_KEYS.filter((key) => !key.startsWith('bguPreparatory')).map((key) => [
        key,
        initialScores?.admissions?.[key]?.toString() ?? '',
      ]),
    ),
  );
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
  const [tauBagrutAverage, setTauBagrutAverage] = useState(
    initialScores?.admissions?.tauBagrutAverage?.toString() ?? '',
  );
  const [bguBagrutAverage, setBguBagrutAverage] = useState(
    initialScores?.admissions?.bguBagrutAverage?.toString() ?? '',
  );
  const [haifaBagrutAverage, setHaifaBagrutAverage] = useState(
    initialScores?.admissions?.haifaBagrutAverage?.toString() ?? '',
  );
  const [haifaBagrutYear, setHaifaBagrutYear] = useState(
    initialScores?.admissions?.haifaBagrutYear?.toString() ?? '',
  );
  const [haifaPsychometricYear, setHaifaPsychometricYear] = useState(
    initialScores?.admissions?.haifaPsychometricYear?.toString() ?? '',
  );
  const [bguEngineering, setBguEngineering] = useState(initialScores?.admissions?.bguEngineering);
  const [tauApplicationRequirements, setTauApplicationRequirements] = useState(
    initialScores?.admissions?.tauApplicationRequirementsConfirmed?.toString() ?? '',
  );
  const [bguLanguageRequirements, setBguLanguageRequirements] = useState(
    initialScores?.admissions?.bguLanguageRequirementsConfirmed?.toString() ?? '',
  );
  const [bguQuantitative, setBguQuantitative] = useState<BguQuantitativeInputs>(() =>
    Object.fromEntries(
      BGU_QUANTITATIVE_PROFILE_KEYS.map((key) => [key, initialScores?.admissions?.[key]]).filter(
        ([, value]) => value !== undefined,
      ),
    ),
  );
  const psychologyFormValues: PsychologyFormValues = {
    ...psychologyValues,
    bguPreparatoryTrack: bguQuantitative.bguPreparatoryTrack ?? '',
    bguPreparatoryAverage: bguQuantitative.bguPreparatoryAverage?.toString() ?? '',
    bguPreparatoryCompleted: bguQuantitative.bguPreparatoryCompleted?.toString() ?? '',
  };
  function handlePsychologyChange(key: keyof PsychologyFormValues, value: string) {
    if (key === 'bguPreparatoryAverage') {
      setBguQuantitative((previous) => ({
        ...previous,
        bguPreparatoryAverage: value === '' ? undefined : Number(value),
      }));
    } else if (key === 'bguPreparatoryCompleted') {
      setBguQuantitative((previous) => ({
        ...previous,
        bguPreparatoryCompleted: value === '' ? undefined : value === 'true',
      }));
    } else if (key === 'bguPreparatoryTrack') {
      setBguQuantitative((previous) => ({
        ...previous,
        bguPreparatoryTrack: (value || undefined) as BguQuantitativeInputs['bguPreparatoryTrack'],
      }));
    } else {
      setPsychologyValues((previous) => ({ ...previous, [key]: value }));
    }
  }
  const [tauMathPlacementScore, setTauMathPlacementScore] = useState(
    initialScores?.admissions?.tauMathPlacementScore?.toString() ?? '',
  );
  const [managementRequirements, setManagementRequirements] = useState(
    initialScores?.admissions?.tauManagementRequirementsConfirmed?.toString() ?? '',
  );
  const [managementAcademic, setManagementAcademic] = useState(
    initialScores?.admissions?.tauManagementAcademicRouteConfirmed?.toString() ?? '',
  );
  const [managementMoocCount, setManagementMoocCount] = useState(
    initialScores?.admissions?.tauManagementQualifyingMoocCount?.toString() ?? '',
  );
  const [managementNoPsychometricMoocs, setManagementNoPsychometricMoocs] = useState(
    initialScores?.admissions?.tauManagementNoPsychometricMoocsConfirmed?.toString() ?? '',
  );
  const [architectureAverage, setArchitectureAverage] = useState(
    initialScores?.admissions?.technionArchitectureBagrutAverage?.toString() ?? '',
  );
  const [architectureExam, setArchitectureExam] = useState(
    initialScores?.admissions?.technionArchitectureExamScore?.toString() ?? '',
  );
  const [architectureExamPassed, setArchitectureExamPassed] = useState(
    initialScores?.admissions?.technionArchitectureExamPassed?.toString() ?? '',
  );
  const [architectureRequirements, setArchitectureRequirements] = useState(
    initialScores?.admissions?.technionArchitectureRequirementsConfirmed?.toString() ?? '',
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
    setTauBagrutAverage('');
    setPsychologyValues({});
    setMedicineValues({});
    setHealthValues({});
    setSocialScienceValues({});
    setBguBagrutAverage('');
    setHaifaBagrutAverage('');
    setHaifaBagrutYear('');
    setHaifaPsychometricYear('');
    setTauApplicationRequirements('');
    setBguLanguageRequirements('');
    setBguQuantitative({});
    setTauMathPlacementScore('');
    setManagementRequirements('');
    setManagementAcademic('');
    setManagementMoocCount('');
    setManagementNoPsychometricMoocs('');
    setArchitectureAverage('');
    setArchitectureExam('');
    setArchitectureExamPassed('');
    setArchitectureRequirements('');
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

    const admissions: NonNullable<AcademicScores['admissions']> = Object.fromEntries(
      Object.entries(bguQuantitative).filter(([, value]) => value !== undefined),
    );
    if (bguEngineering !== undefined) admissions.bguEngineering = bguEngineering;
    if (
      bguQuantitative.bguPreparatoryAverage !== undefined &&
      (!Number.isFinite(bguQuantitative.bguPreparatoryAverage) ||
        bguQuantitative.bguPreparatoryAverage < 0 ||
        bguQuantitative.bguPreparatoryAverage > 100)
    ) {
      setError('ממוצע המכינה חייב להיות בין 0 ל־100.');
      setIsSaving(false);
      return;
    }
    const psychologyInputs = Object.fromEntries(
      BGU_PSYCHOLOGY_PROFILE_KEYS.filter(
        (key) => psychologyFormValues[key] !== undefined && psychologyFormValues[key] !== '',
      ).map((key) => [
        key,
        key.endsWith('Confirmed') || key.endsWith('Completed')
          ? psychologyFormValues[key] === 'true'
          : key.endsWith('Average')
            ? Number(psychologyFormValues[key])
            : psychologyFormValues[key],
      ]),
    );
    const parsedPsychology = bguPsychologyInputsSchema.safeParse(psychologyInputs);
    if (!parsedPsychology.success) {
      setError('יש להזין נתוני פסיכולוגיה ומכינה תקינים; ממוצע מכינה בין 0 ל־100.');
      setIsSaving(false);
      return;
    }
    Object.assign(admissions, parsedPsychology.data);
    const medicineInputs = Object.fromEntries(
      HUJI_MEDICINE_PROFILE_KEYS.filter(
        (key) => medicineValues[key] !== undefined && medicineValues[key] !== '',
      ).map((key) => [
        key,
        /(?:Confirmed|Eligible)$/.test(key)
          ? medicineValues[key] === 'true'
          : /(?:Average|Score|Year)$/.test(key)
            ? Number(medicineValues[key])
            : medicineValues[key],
      ]),
    );
    const parsedMedicine = hujiMedicineInputsSchema.safeParse(medicineInputs);
    if (!parsedMedicine.success) {
      setError('יש להזין נתוני רפואה בעברית בטווחים המוצגים ותאריך תקין.');
      setIsSaving(false);
      return;
    }
    Object.assign(admissions, parsedMedicine.data);
    const healthInputs = Object.fromEntries(
      BGU_HEALTH_PROFILE_KEYS.filter(
        (key) => healthValues[key] !== undefined && healthValues[key] !== '',
      ).map((key) => [
        key,
        key.endsWith('Confirmed') || key.endsWith('Completed')
          ? healthValues[key] === 'true'
          : key.endsWith('Average')
            ? Number(healthValues[key])
            : healthValues[key],
      ]),
    );
    const parsedHealth = bguHealthInputsSchema.safeParse(healthInputs);
    if (!parsedHealth.success) {
      setError('יש להזין נתוני מדעי הבריאות תקינים; ממוצע תואר ראשון בין 0 ל־100.');
      setIsSaving(false);
      return;
    }
    Object.assign(admissions, parsedHealth.data);
    const socialScienceInputs = Object.fromEntries(
      BGU_SOCIAL_SCIENCE_PROFILE_KEYS.filter(
        (key) => socialScienceValues[key] !== undefined && socialScienceValues[key] !== '',
      ).map((key) => [
        key,
        key.endsWith('Confirmed') ||
        [
          'bguReturningFromStudyBreak',
          'bguSocialWorkTranscriptProvided',
          'bguEnglishClassificationMissing',
          'bguEducationEnglishConditionAcknowledged',
        ].includes(key)
          ? socialScienceValues[key] === 'true'
          : key.endsWith('Average') || key === 'bguApplicantAge'
            ? Number(socialScienceValues[key])
            : socialScienceValues[key],
      ]),
    );
    const parsedSocialScience = bguSocialScienceInputsSchema.safeParse(socialScienceInputs);
    if (!parsedSocialScience.success) {
      setError('יש להזין נתוני מדעי החברה תקינים: גיל שלם בין 0 ל־120 וממוצע אקדמי בין 0 ל־100.');
      setIsSaving(false);
      return;
    }
    Object.assign(admissions, parsedSocialScience.data);
    const architectureAverageValue = optionalNumber(architectureAverage);
    const architectureExamValue = optionalNumber(architectureExam);
    if (
      (architectureAverageValue !== undefined &&
        (architectureAverageValue < 0 || architectureAverageValue > 119)) ||
      (architectureExamValue !== undefined &&
        (architectureExamValue < 0 || architectureExamValue > 140))
    ) {
      setError('לארכיטקטורה בטכניון יש להזין ממוצע רשמי עד 119 וציון בחינת כניסה בין 0 ל־140.');
      setIsSaving(false);
      return;
    }
    if (architectureAverageValue !== undefined)
      admissions.technionArchitectureBagrutAverage = architectureAverageValue;
    if (architectureExamValue !== undefined)
      admissions.technionArchitectureExamScore = architectureExamValue;
    if (architectureExamPassed !== '')
      admissions.technionArchitectureExamPassed = architectureExamPassed === 'true';
    if (architectureRequirements !== '')
      admissions.technionArchitectureRequirementsConfirmed = architectureRequirements === 'true';
    const tauAverage = optionalNumber(tauBagrutAverage);
    const bguAverage = optionalNumber(bguBagrutAverage);
    const mathPlacement = optionalNumber(tauMathPlacementScore);
    if (tauAverage !== undefined) admissions.tauBagrutAverage = tauAverage;
    if (bguAverage !== undefined) admissions.bguBagrutAverage = bguAverage;
    const haifaAverage = optionalNumber(haifaBagrutAverage);
    const certificateYear = optionalNumber(haifaBagrutYear);
    const examYear = optionalNumber(haifaPsychometricYear);
    if (haifaAverage !== undefined) admissions.haifaBagrutAverage = haifaAverage;
    if (certificateYear !== undefined) admissions.haifaBagrutYear = certificateYear;
    if (examYear !== undefined) admissions.haifaPsychometricYear = examYear;
    const haifaQualificationInputs = Object.fromEntries(
      HAIFA_QUALIFICATION_PROFILE_KEYS.filter(
        (key) =>
          haifaQualificationValues[key] !== undefined && haifaQualificationValues[key] !== '',
      ).map((key) => [
        key,
        key === 'haifaOtUnjustifiedAbsence'
          ? haifaQualificationValues[key] === 'true'
          : HAIFA_NUMERIC_QUALIFICATION_KEYS.includes(key)
            ? Number(haifaQualificationValues[key])
            : haifaQualificationValues[key],
      ]),
    );
    const parsedHaifa = haifaProfileInputsSchema.safeParse({
      ...admissions,
      ...haifaQualificationInputs,
    });
    if (!parsedHaifa.success) {
      setError(
        `בדקו את נתוני חיפה: ממוצע 50–130, שנים שלמות עד ${HAIFA_ADMISSION_YEAR}, חודש 1–12 וציון עברית 50–150. יחידות וניסיונות מיון צריכים להיות מספרים שלמים.`,
      );
      setIsSaving(false);
      return;
    }
    Object.assign(admissions, parsedHaifa.data);
    if (tauApplicationRequirements !== '') {
      admissions.tauApplicationRequirementsConfirmed = tauApplicationRequirements === 'true';
    }
    if (bguLanguageRequirements !== '') {
      admissions.bguLanguageRequirementsConfirmed = bguLanguageRequirements === 'true';
    }
    if (managementRequirements !== '')
      admissions.tauManagementRequirementsConfirmed = managementRequirements === 'true';
    if (managementAcademic !== '')
      admissions.tauManagementAcademicRouteConfirmed = managementAcademic === 'true';
    if (managementMoocCount !== '')
      admissions.tauManagementQualifyingMoocCount = Number(managementMoocCount) as 0 | 1 | 2;
    if (managementNoPsychometricMoocs !== '')
      admissions.tauManagementNoPsychometricMoocsConfirmed =
        managementNoPsychometricMoocs === 'true';
    if (mathPlacement !== undefined) admissions.tauMathPlacementScore = mathPlacement;
    if (Object.keys(admissions).length > 0) {
      scores.admissions = admissions;
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

          <section className="mb-8 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-800">
                ממוצעים רשמיים ונתוני קבלה (רשות)
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                ממוצעים מוסדיים עשויים להיות שונים מהממוצע הכללי. הזן רק ממוצע רשמי שכבר חישבת; אל
                תעתיק לכאן אוטומטית אומדן מהאשף.
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <a
                  href="https://www.ims.tau.ac.il/md/ut/bagrut.aspx"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-indigo-700 underline underline-offset-2"
                >
                  מחשבון ממוצע בגרות של אוניברסיטת תל אביב
                </a>
                <a
                  href="https://bgu4u.bgu.ac.il/html/average_calc/index.php"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-indigo-700 underline underline-offset-2"
                >
                  מחשבון ממוצע בגרות של בן־גוריון
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <HujiMedicineFields
                values={medicineValues}
                onChange={(key, value) =>
                  setMedicineValues((previous) => ({ ...previous, [key]: value }))
                }
                disabled={isSaving}
                inputClassName={inputBase}
              />
              <BguHealthFields
                values={healthValues}
                onChange={(key, value) =>
                  setHealthValues((previous) => ({ ...previous, [key]: value }))
                }
                disabled={isSaving}
                inputClassName={inputBase}
              />
              <BguPsychologyFields
                values={psychologyFormValues}
                onChange={handlePsychologyChange}
                disabled={isSaving}
                inputClassName={inputBase}
              />
              <BguSocialScienceFields
                values={socialScienceValues}
                onChange={(key, value) =>
                  setSocialScienceValues((previous) => ({ ...previous, [key]: value }))
                }
                prepValues={psychologyFormValues}
                onPrepChange={handlePsychologyChange}
                disabled={isSaving}
                inputClassName={inputBase}
              />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tau-bagrut-average" className="text-xs font-medium text-slate-600">
                  ממוצע בגרות רשמי של אוניברסיטת תל אביב (50–130)
                </label>
                <input
                  id="tau-bagrut-average"
                  type="number"
                  min={50}
                  max={130}
                  step={0.01}
                  placeholder="לא ידוע"
                  value={tauBagrutAverage}
                  onChange={(event) => setTauBagrutAverage(event.target.value)}
                  disabled={isSaving}
                  className={inputBase + ' disabled:cursor-not-allowed disabled:opacity-50'}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="bgu-bagrut-average" className="text-xs font-medium text-slate-600">
                  ממוצע בגרות או הנדסאי מוכר של בן־גוריון (50–130)
                </label>
                <input
                  id="bgu-bagrut-average"
                  type="number"
                  min={50}
                  max={130}
                  step={0.01}
                  placeholder="לא ידוע"
                  value={bguBagrutAverage}
                  onChange={(event) => setBguBagrutAverage(event.target.value)}
                  disabled={isSaving}
                  className={inputBase + ' disabled:cursor-not-allowed disabled:opacity-50'}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="haifa-bagrut-average"
                  className="text-xs font-medium text-slate-600"
                >
                  ממוצע בגרות רשמי של אוניברסיטת חיפה (50–130)
                </label>
                <input
                  id="haifa-bagrut-average"
                  type="number"
                  min={50}
                  max={130}
                  step={0.01}
                  placeholder="לא ידוע"
                  value={haifaBagrutAverage}
                  onChange={(event) => setHaifaBagrutAverage(event.target.value)}
                  disabled={isSaving}
                  className={inputBase + ' disabled:cursor-not-allowed disabled:opacity-50'}
                />
                <a
                  href="https://applicants.haifa.ac.il/enrollmentChances/index.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 underline"
                >
                  למחשבון הבגרות הרשמי של חיפה
                </a>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="haifa-bagrut-year" className="text-xs font-medium text-slate-600">
                  שנת הזכאות לבגרות או השיפור האחרון בחיפה
                </label>
                <input
                  id="haifa-bagrut-year"
                  type="number"
                  min={1948}
                  max={HAIFA_ADMISSION_YEAR}
                  step={1}
                  placeholder="לא ידוע"
                  value={haifaBagrutYear}
                  onChange={(event) => setHaifaBagrutYear(event.target.value)}
                  disabled={isSaving}
                  className={inputBase + ' disabled:cursor-not-allowed disabled:opacity-50'}
                />
                <p className="text-xs text-slate-500">
                  אם שיפרתם שני מקצועות בגרות או יותר, הזינו את שנת השיפור האחרון. השנה משפיעה על
                  משקל הבגרות בסכם.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="haifa-psychometric-year"
                  className="text-xs font-medium text-slate-600"
                >
                  שנת הבחינה הפסיכומטרית לחישוב בחיפה
                </label>
                <input
                  id="haifa-psychometric-year"
                  type="number"
                  min={1948}
                  max={HAIFA_ADMISSION_YEAR}
                  step={1}
                  placeholder="לא ידוע"
                  value={haifaPsychometricYear}
                  onChange={(event) => setHaifaPsychometricYear(event.target.value)}
                  disabled={isSaving}
                  className={inputBase + ' disabled:cursor-not-allowed disabled:opacity-50'}
                />
                <p className="text-xs text-slate-500">
                  הזינו את השנה של הבחינה שממנה לקחתם את ציוני הכמותי, המילולי והאנגלית.
                </p>
              </div>
              <HaifaQualificationFields
                values={haifaQualificationValues}
                onChange={(key, value) =>
                  setHaifaQualificationValues((previous) => ({ ...previous, [key]: value }))
                }
                disabled={isSaving}
                inputClassName={inputBase}
              />
              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
                האם מולאו תנאי ההגשה לתל אביב: זכאות לבגרות, אנגלית ברמת מתקדמים א׳ (100 לפחות
                בפסיכומטרי או במבחן מיון נפרד באנגלית), דרישת העברית והרשמה בעדיפות ראשונה למדעי
                המחשב?
                <select
                  aria-label="אישור תנאי הגשה לתל אביב"
                  value={tauApplicationRequirements}
                  onChange={(event) => setTauApplicationRequirements(event.target.value)}
                  disabled={isSaving}
                  className={inputBase + ' disabled:cursor-not-allowed disabled:opacity-50'}
                >
                  <option value="">לא ידוע</option>
                  <option value="true">כן</option>
                  <option value="false">לא</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
                האם דרישות האנגלית (בסיסי) והעברית (רמה ה׳, אם נדרשת) בבן־גוריון מולאו או שיש פטור
                תקף?
                <select
                  aria-label="אישור דרישות שפה בבן־גוריון"
                  value={bguLanguageRequirements}
                  onChange={(event) => setBguLanguageRequirements(event.target.value)}
                  disabled={isSaving}
                  className={inputBase + ' disabled:cursor-not-allowed disabled:opacity-50'}
                >
                  <option value="">לא ידוע</option>
                  <option value="true">כן</option>
                  <option value="false">לא</option>
                </select>
              </label>
              <BguQuantitativeFields
                value={bguQuantitative}
                onChange={setBguQuantitative}
                disabled={isSaving}
              />
              <BguEngineeringFields
                value={bguEngineering}
                onChange={setBguEngineering}
                disabled={isSaving}
                inputClassName={inputBase}
              />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tau-math-placement" className="text-xs font-medium text-slate-600">
                  ציון סיווג במתמטיקה של אוניברסיטת תל אביב (0–100)
                </label>
                <input
                  id="tau-math-placement"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  placeholder="לא ידוע"
                  value={tauMathPlacementScore}
                  onChange={(event) => setTauMathPlacementScore(event.target.value)}
                  disabled={isSaving}
                  className={inputBase + ' disabled:cursor-not-allowed disabled:opacity-50'}
                />
              </div>
            </div>
          </section>

          <section className="mb-8 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
            <h2 className="text-sm font-semibold text-slate-800">
              ניהול באוניברסיטת תל אביב (רשות)
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              השתמשו בממוצע תל אביב הרשמי שבשדה למעלה ובמקצועות המתמטיקה והאנגלית שהזנתם. אפיק PMA
              יכול להתאים גם מתחת לפסיכומטרי 620.
            </p>
            <a
              href="https://go.tau.ac.il/he/management/ba/management?v=requirements"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs font-medium text-indigo-700 underline"
            >
              תנאי הקבלה לניהול בתל אביב
            </a>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="tau-management-requirements"
                  className="text-xs font-medium text-slate-600"
                >
                  אישור תנאי הגשה לניהול בתל אביב
                </label>
                <select
                  id="tau-management-requirements"
                  value={managementRequirements}
                  onChange={(event) => setManagementRequirements(event.target.value)}
                  disabled={isSaving}
                  className={inputBase}
                >
                  <option value="">לא ידוע</option>
                  <option value="true">כן</option>
                  <option value="false">לא</option>
                </select>
                <p className="text-xs leading-5 text-slate-500">
                  תעודת בגרות מוכרת, עברית ואנגלית, לימודים קודמים מותרים ותנאי החוג השני לפי העמוד
                  הרשמי.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="tau-management-academic"
                  className="text-xs font-medium text-slate-600"
                >
                  אפיק לימודים אקדמיים קודמים לניהול
                </label>
                <select
                  id="tau-management-academic"
                  value={managementAcademic}
                  onChange={(event) => setManagementAcademic(event.target.value)}
                  disabled={isSaving}
                  className={inputBase}
                >
                  <option value="">לא ידוע</option>
                  <option value="true">כן</option>
                  <option value="false">לא</option>
                </select>
                <p className="text-xs leading-5 text-slate-500">
                  לפחות 30 שעות אקדמיות מוכרות בממוצע 85 ומעלה.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="tau-management-no-psychometric"
                  className="text-xs font-medium text-slate-600"
                >
                  שני הקורסים לאפיק ללא פסיכומטרי
                </label>
                <select
                  id="tau-management-no-psychometric"
                  value={managementNoPsychometricMoocs}
                  onChange={(event) => setManagementNoPsychometricMoocs(event.target.value)}
                  disabled={isSaving}
                  className={inputBase}
                >
                  <option value="">לא ידוע</option>
                  <option value="true">כן</option>
                  <option value="false">לא</option>
                </select>
                <p className="text-xs leading-5 text-slate-500">
                  להבין דוחות כספיים ומבוא לתכנות בשפת פייתון, בציון 85 ומעלה בכל אחד.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="tau-management-mooc-count"
                  className="text-xs font-medium text-slate-600"
                >
                  מספר קורסי הבונוס לניהול בציון 85 ומעלה
                </label>
                <select
                  id="tau-management-mooc-count"
                  value={managementMoocCount}
                  onChange={(event) => setManagementMoocCount(event.target.value)}
                  disabled={isSaving}
                  className={inputBase}
                >
                  <option value="">לא ידוע</option>
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2 או יותר</option>
                </select>
                <p className="text-xs leading-5 text-slate-500">
                  מתוך מבוא לפסיכולוגיה, צמיחה כלכלית וצדק חלוקתי, מבוא לפייתון ולהבין דוחות כספיים.
                  בונוס 5 נקודות לקורס, עד שני קורסים.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
            <h2 className="text-sm font-semibold text-slate-800">
              נתונים לקבלה לארכיטקטורה בטכניון (רשות)
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              למסלול הבגרות הישראלי הרגיל בלבד, לשנת תשפ״ז (2026–2027). הזן את הממוצע הרשמי
              לארכיטקטורה, שבו אין כפל משקל במתמטיקה, ואת תוצאת בחינת הכניסה לארכיטקטורה. גם עמידה
              בסף אינה מבטיחה קבלה: הקבלה תלויה במקום פנוי.
            </p>
            <div className="my-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <a
                href="https://admissions.technion.ac.il/calculator/"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-indigo-700 underline underline-offset-2"
              >
                מחשבון הטכניון — ארכיטקטורה
              </a>
              <a
                href="https://admissions.technion.ac.il/architecture-info/"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-indigo-700 underline underline-offset-2"
              >
                תנאי הקבלה לארכיטקטורה בטכניון
              </a>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="technion-architecture-average"
                  className="text-xs font-medium text-slate-600"
                >
                  ממוצע בגרות רשמי לארכיטקטורה בטכניון (עד 119)
                </label>
                <input
                  id="technion-architecture-average"
                  type="number"
                  min={0}
                  max={119}
                  step="any"
                  placeholder="לא ידוע"
                  value={architectureAverage}
                  onChange={(event) => setArchitectureAverage(event.target.value)}
                  disabled={isSaving}
                  className={inputBase + ' disabled:cursor-not-allowed disabled:opacity-50'}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="technion-architecture-exam"
                  className="text-xs font-medium text-slate-600"
                >
                  ציון בחינת כניסה לארכיטקטורה בטכניון (0–140)
                </label>
                <input
                  id="technion-architecture-exam"
                  type="number"
                  min={0}
                  max={140}
                  step="any"
                  placeholder="לא ידוע"
                  value={architectureExam}
                  onChange={(event) => setArchitectureExam(event.target.value)}
                  disabled={isSaving}
                  className={inputBase + ' disabled:cursor-not-allowed disabled:opacity-50'}
                />
              </div>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
                האם התוצאה הרשמית בבחינת הכניסה התקפה לארכיטקטורה היא ״עובר״? אין להסיק זאת מציון
                הבחינה בלבד.
                <select
                  aria-label="תוצאה רשמית של בחינת הכניסה לארכיטקטורה"
                  value={architectureExamPassed}
                  onChange={(event) => setArchitectureExamPassed(event.target.value)}
                  disabled={isSaving}
                  className={inputBase + ' disabled:cursor-not-allowed disabled:opacity-50'}
                >
                  <option value="">לא ידוע</option>
                  <option value="true">עובר</option>
                  <option value="false">לא עובר</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
                האם מולאו תנאי המסלול הרגיל: בגרות ישראלית מלאה, מתמטיקה 4 יח׳ בציון 70 או 5 יח׳
                בציון 65, אנגלית 4 יח׳ לפחות, סיווג אנגלית מעל 104 או חלופה רשמית, עברית 121 או פטור
                תקף, והרשמה וציונים תקפים לתשפ״ז לפי המועדים הרשמיים?
                <select
                  aria-label="אישור תנאי הגשה לארכיטקטורה בטכניון"
                  value={architectureRequirements}
                  onChange={(event) => setArchitectureRequirements(event.target.value)}
                  disabled={isSaving}
                  className={inputBase + ' disabled:cursor-not-allowed disabled:opacity-50'}
                >
                  <option value="">לא ידוע</option>
                  <option value="true">כן</option>
                  <option value="false">לא</option>
                </select>
              </label>
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

function optionalNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
