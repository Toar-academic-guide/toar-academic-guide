import { describe, expect, it } from 'vitest';
import { MEDICINE_ADMISSIONS } from './medicineAdmissions';
import { ISSUE_370_CORRECTIONS } from './issue370Corrections';

describe('medicine admissions facts', () => {
  it('keeps five sourced university rows and the five child pages on the same reviewed facts', () => {
    expect(MEDICINE_ADMISSIONS.map(({ programId }) => programId)).toEqual([
      'huji_medicine',
      'technion_medicine',
      'tau_medicine',
      'bgu_medicine',
      'biu_medicine',
    ]);
    for (const row of MEDICINE_ADMISSIONS) {
      expect(row.sourceUrl).toMatch(/^https:\/\//);
      expect(row.checkedAt).toBe('2026-11-27');
      const child = ISSUE_370_CORRECTIONS.find(({ programId }) => programId === row.programId);
      expect(child).toMatchObject({
        institutionId: row.institutionId,
        sourceUrl: row.sourceUrl,
        checkedAt: row.checkedAt,
        notes: row.childNotes,
      });
    }
  });

  it('keeps cycle-specific figures and unknowns attached to the right institution', () => {
    const [huji, technion, tau, bgu, biu] = MEDICINE_ADMISSIONS;
    expect(huji.stageOne).toEqual({ kind: 'value', text: 'סף קוגניטיבי 25.186', cycle: 'תשפ״ז' });
    expect(huji.lastFinal).toEqual({ kind: 'value', text: '25.708', cycle: 'תשפ״ז' });
    expect(huji.registrationDeadline).toEqual({
      kind: 'value',
      text: '30.04.2027',
      cycle: 'תשפ״ח',
    });
    expect(technion.minimumPsychometric.kind).toBe('notPublished');
    expect(technion.lastFinal).toEqual({
      kind: 'value',
      text: 'ציון מו״ר משוקלל 205',
      cycle: 'תשפ״ז',
    });
    expect(tau.registrationDeadline).toEqual({
      kind: 'value',
      text: 'תשפ״ז: 30.04.2026 · תשפ״ח: יעודכן',
    });
    expect(tau.screeningWeight).toEqual({
      kind: 'value',
      text: '70% מבחנים לא קוגניטיביים + 30% ציון התאמה ראשוני',
      cycle: 'תשפ״ז',
    });
    expect(tau.lastPsychometricSitting).toEqual({
      kind: 'value',
      text: 'תשפ״ז: מרץ/אפריל 2026 · תשפ״ח: יעודכן',
    });
    expect(bgu.minimumPsychometric).toEqual({
      kind: 'value',
      text: 'סף פסיכומטרי וסכם נקבע בכל שנה',
    });
    expect(biu.screening).toEqual({ kind: 'value', text: 'פרטים באתר בר־אילן' });
    expect(biu.footnote).toContain('הפסיכומטרי הדו־תחומי');
    expect(biu.footnote).toContain('אמירנט');
    expect(JSON.stringify(MEDICINE_ADMISSIONS)).not.toMatch(/735|730|206|25\.783|30\/70/);
  });
});
