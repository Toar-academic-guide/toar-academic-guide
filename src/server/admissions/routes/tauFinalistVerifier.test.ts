import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  createTauFinalistCircuit,
  verifyTauComputerScienceFinalists,
  type TauFinalistCache,
} from './tauFinalistVerifier';
import {
  TAU_COMPUTER_SCIENCE_ACCEPTANCE_CUTOFF,
  TAU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT,
} from '@/data/admissions/tauComputerScienceVerification';

const finalist = {
  id: 'candidate-1',
  psychometric: 690,
  bagrutAverage: 108,
  hasQualifiedMathAndPhysics: true,
};

const requirementsHtml = `
  <main>
    תעודת בגרות ישראלית או תעודת סיום תיכון מחו"ל לפרוט ידיעת השפה העברית לפרוט ידיעת השפה האנגלית פרוט למידע המלא
    <h2>תנאים בסיסיים מצטברים לקבלה</h2>
    הרשמה בעדיפות ראשונה התכנית נבחרה בעדיפות ראשונה
    פסיכומטרי ציון 660 לפחות או תואר בוגר (תואר ראשון) ממוסד אקדמי מוכר ע"י המל"ג בתחום מדעים מדויקים או הנדסה, בציון 80 ומעלה. על התוכנית לכלול קורסי בסיס מתמטיים שקולים ברמתם ובהיקפם לקורסים הנלמדים בביה"ס למדעי המחשב
    ידע במתמטיקה ציון 80 לפחות במתמטיקה בהיקף של 5 יח"ל או בעלי ציון 70-79 במתמטיקה בהיקף 5 יח"ל וציון של 75 לפחות בבחינת הסיווג במתמטיקה או ציון 88 לפחות במתמטיקה בהיקף של 4 יח"ל; או ציון 75-87 במתמטיקה בהיקף 4 יח"ל וציון של 75 לפחות ב בחינת הסיווג במתמטיקה
    הנתונים שלך לא עומדים בדרישות אפיקי קבלה
    <p>ציון התאמה מדעים מדוייקים-מועמד שנבחן ב-5 יח"ל במתמטיקה ובפיזיקה בציון 55 לפחות בכל אחד מהם, יקבל תוספת של 10 נקודות בונוס לציון ההתאמה הרגיל.</p>
  </main>`;
const englishRequirementsHtml = `
  <main>
    <p>ב. ידיעת השפה - סיווג לרמת אנגלית</p>
    <p>כל המועמדות והמועמדים נדרשים להגיע לרמת מתקדמים א' לפחות באנגלית (100 נקודות במבחן המיון באנגלית במסגרת הבחינה הפסיכומטרית או בחינת אמיר"ם ) ולרמת פטור עד סוף שנה א' ללימודים</p>
    <p>ג. ידיעת השפה העברית</p>
  </main>`;

describe('verifyTauComputerScienceFinalists', () => {
  it('requires the official TAU score replay and the official CS cutoff', async () => {
    const fetcher = tauFetcher({ score: 710 });

    const result = await verifyTauComputerScienceFinalists({ finalists: [finalist], fetcher });

    expect(result).toEqual([
      expect.objectContaining({
        id: 'candidate-1',
        status: 'verified',
        eligible: true,
        score: 710,
        cutoff: TAU_COMPUTER_SCIENCE_ACCEPTANCE_CUTOFF,
        scoreField: 'hatama_meduyakim',
        ruleFingerprint: TAU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT,
      }),
    ]);
    expect(JSON.stringify(fetcher.mock.calls[0]?.[1]?.body)).not.toContain('user');
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toMatchObject({
      variables: { scoresData: { reali10: 1, psicho: '690', bagrut: '108' } },
    });
  });

  it('fails closed rather than ranking when the official program cutoff cannot be parsed', async () => {
    const fetcher = tauFetcher({ acceptanceCutoff: null });

    const result = await verifyTauComputerScienceFinalists({ finalists: [finalist], fetcher });

    expect(result).toEqual([
      expect.objectContaining({ status: 'unavailable', reason: 'official_source_drift' }),
    ]);
  });

  it('returns an exact ineligible verdict below the reviewed cutoff', async () => {
    const fetcher = tauFetcher({ score: 704 });

    const result = await verifyTauComputerScienceFinalists({ finalists: [finalist], fetcher });

    expect(result).toEqual([
      expect.objectContaining({ status: 'verified', eligible: false, score: 704 }),
    ]);
  });

  it('withholds a gate-failing finalist without contacting the score authority', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const result = await verifyTauComputerScienceFinalists({
      finalists: [{ ...finalist, unmetRequirements: ['psychometric_660'] }],
      fetcher,
    });

    expect(result).toEqual([expect.objectContaining({ status: 'verified', eligible: false })]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('caches verified replays with an opaque key and no raw academic profile', async () => {
    const values = new Map<string, ReturnType<TauFinalistCache['get']>>();
    const cache: TauFinalistCache = {
      get: (key) => values.get(key),
      set: (key, value) => values.set(key, value),
    };
    const fetcher = tauFetcher({ score: 710 });

    await verifyTauComputerScienceFinalists({
      finalists: [finalist],
      fetcher,
      cache,
      cacheSecret: 'test-secret',
    });
    const cached = await verifyTauComputerScienceFinalists({
      finalists: [{ ...finalist, id: 'candidate-2' }],
      fetcher,
      cache,
      cacheSecret: 'test-secret',
    });

    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(cached).toEqual([expect.objectContaining({ id: 'candidate-2', status: 'verified' })]);
    expect([...values.keys()][0]).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify([...values.values()])).not.toContain('690');
    expect(JSON.stringify([...values.values()])).not.toContain('108');
  });

  it('withholds a finalist when the current cutoff drifts from the reviewed contract', async () => {
    const fetcher = tauFetcher({
      acceptanceCutoff: TAU_COMPUTER_SCIENCE_ACCEPTANCE_CUTOFF + 1,
    });

    const result = await verifyTauComputerScienceFinalists({ finalists: [finalist], fetcher });

    expect(result).toEqual([
      expect.objectContaining({ status: 'unavailable', reason: 'official_source_drift' }),
    ]);
  });

  it('withholds every finalist when the reviewed fixture contract is no longer exact', async () => {
    const fetcher = vi.fn<typeof fetch>();

    const result = await verifyTauComputerScienceFinalists({
      finalists: [finalist],
      fetcher,
      verificationArtifactCurrent: () => false,
    });

    expect(result).toEqual([
      expect.objectContaining({ status: 'unavailable', reason: 'fixture_mismatch' }),
    ]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('opens the circuit after an upstream failure and withholds remaining finalists', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('timeout'));
    const circuit = createTauFinalistCircuit(1);

    const result = await verifyTauComputerScienceFinalists({
      finalists: [finalist, { ...finalist, id: 'candidate-2' }],
      fetcher,
      circuit,
    });

    expect(result).toEqual([
      expect.objectContaining({ id: 'candidate-1', reason: 'official_score_unavailable' }),
      expect.objectContaining({ id: 'candidate-2', reason: 'circuit_open' }),
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function tauFetcher(
  options: { score?: number; acceptanceCutoff?: number | null; rejectionCutoff?: number } = {},
) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: { hatama_meduyakim: options.score ?? 710 } } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            nid: '8220',
            title: 'תואר ראשון במדעי המחשב',
            receipt_threshol:
              options.acceptanceCutoff === null
                ? null
                : [options.acceptanceCutoff ?? TAU_COMPUTER_SCIENCE_ACCEPTANCE_CUTOFF],
            rejection_thresh: [options.rejectionCutoff ?? 704],
            field_registration_comments: null,
            field_plain_id_programs: ['036811010000', '036811040455'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(new Response(requirementsHtml, { status: 200 }))
    .mockResolvedValueOnce(new Response(englishRequirementsHtml, { status: 200 }));
}
