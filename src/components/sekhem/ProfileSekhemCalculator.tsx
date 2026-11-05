'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { CalculatorOffering } from '@/lib/sekhemCalculator';
import { calculatorProfile, editedAcademicScores, markAcademicSave } from '@/lib/sekhemProfile';
import SekhemCalculator from './SekhemCalculator';

export default function ProfileSekhemCalculator({
  offerings,
  initialProgramId,
}: {
  offerings: CalculatorOffering[];
  initialProgramId: string;
}) {
  const { user } = useAuth();
  const identity = user?.id ?? 'guest';
  const { profile, updateProfile, initialProfileStatus, retryInitialProfileLoad } =
    useUserProfile();
  const [entry, setEntry] = useState<{ id: string; identity: string; program: string }>();
  useEffect(() => {
    if (initialProfileStatus !== 'ready') return;
    const previous = window.history.state?.sekhemEntry;
    const entry =
      previous?.identity === identity && previous.program === initialProgramId
        ? previous
        : { id: crypto.randomUUID(), identity, program: initialProgramId };
    window.history.replaceState({ ...window.history.state, sekhemEntry: entry }, '');
    setEntry(entry);
  }, [identity, initialProgramId, initialProfileStatus]);
  if (initialProfileStatus === 'error')
    return (
      <p role="alert">
        טעינת הפרופיל נכשלה. <button onClick={retryInitialProfileLoad}>נסו שוב</button>
      </p>
    );
  if (
    !entry ||
    entry.identity !== identity ||
    entry.program !== initialProgramId ||
    initialProfileStatus !== 'ready'
  )
    return <p role="status">טוענים את הציונים…</p>;
  const scores = profile.academicScores ?? {};
  return (
    <SekhemCalculator
      key={entry.id}
      offerings={offerings}
      initialProgramId={initialProgramId}
      profileEntry={{
        id: entry.id,
        saved: calculatorProfile(scores),
        save: async (form) => {
          const academicScores = editedAcademicScores(scores, form);
          if (!(await updateProfile({ academicScores })))
            throw new Error('שמירת הציונים נכשלה. נסו שוב.');
          markAcademicSave(identity);
        },
      }}
    />
  );
}
