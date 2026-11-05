// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import {
  readSekhemSession,
  writeSekhemSession,
  SEKHEM_SESSION_KEY,
  type SekhemCalculatorSnapshot,
} from './sekhemCalculatorSession';
const offerings = [
  {
    programId: 'haifa_cs',
    programName: 'מדעי המחשב',
    institutionId: 'haifa',
    institutionName: 'חיפה',
  },
];
const snapshot = (): SekhemCalculatorSnapshot => ({
  rows: [{ label: 'מתמטיקה', units: 4, grade: 92, assessmentKind: 'final_project' }],
  sector: 'יהודי',
  certificate: 'internal',
  psychometric: '700',
  verbal: '130',
  quantitative: '140',
  english: '135',
  programId: 'haifa_cs',
  requiredKeys: ['haifaBagrutAverage'],
  haifaValues: { haifaBagrutAverage: '104' },
  reports: [],
  failedIds: ['haifa_cs'],
});
beforeEach(() => sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());
it('round trips the complete academic draft, assessment kinds and failed programmes', () => {
  writeSekhemSession(snapshot());
  expect(readSekhemSession(offerings)).toEqual(snapshot());
});
it('excludes enquiry state and contact PII from persisted snapshots', () => {
  writeSekhemSession({
    ...snapshot(),
    enquiry: { name: 'PRIVATE', phone: '0501234567' },
    haifaValues: { haifaBagrutAverage: '104', phone: 'PRIVATE' },
  } as SekhemCalculatorSnapshot);
  expect(sessionStorage.getItem(SEKHEM_SESSION_KEY)).not.toBeNull();
  expect(sessionStorage.getItem(SEKHEM_SESSION_KEY)).not.toMatch(
    /PRIVATE|phone|enquiry|0501234567/,
  );
});
it.each([
  '{',
  JSON.stringify({ version: 0, ...snapshot() }),
  JSON.stringify({ version: 1, ...snapshot(), reports: [{}] }),
  JSON.stringify({
    version: 1,
    ...snapshot(),
    reports: [{ input: { degreeId: 'haifa_cs' }, program: { id: 'haifa_cs' }, results: [null] }],
  }),
])('ignores corrupt, old or malformed snapshots (%s)', (raw) => {
  sessionStorage.setItem(SEKHEM_SESSION_KEY, raw);
  expect(readSekhemSession(offerings)).toBeNull();
});
it('ignores snapshots whose programme is no longer offered', () => {
  writeSekhemSession(snapshot());
  expect(readSekhemSession([])).toBeNull();
});
it('tolerates unavailable and full storage', () => {
  vi.spyOn(Object.getPrototypeOf(window.sessionStorage), 'getItem').mockImplementation(() => {
    throw new Error('unavailable');
  });
  vi.spyOn(Object.getPrototypeOf(window.sessionStorage), 'setItem').mockImplementation(() => {
    throw new Error('full');
  });
  expect(() => writeSekhemSession(snapshot())).not.toThrow();
  expect(readSekhemSession(offerings)).toBeNull();
});

it('rejects malformed report rows and reports for removed offerings', () => {
  const report = {
    generatedAt: '2026-10-29',
    evaluatorVersion: 'test',
    inputDigest: 'test',
    input: { degreeId: 'haifa_cs' },
    program: { id: 'haifa_cs', name: 'מדעי המחשב' },
    results: [
      {
        institution: { id: 'haifa', name: 'חיפה', region: 'north' },
        linkedInstitutionId: 'haifa',
        kind: 'exact',
        capability: 'exact',
        decision: 'accepted',
        confidence: 'high',
        sourceLabel: '',
        explanation: '',
        nextAction: '',
        score: 706,
      },
    ],
  };
  sessionStorage.setItem(
    SEKHEM_SESSION_KEY,
    JSON.stringify({ version: 1, ...snapshot(), reports: [report] }),
  );
  expect(readSekhemSession(offerings)?.reports).toHaveLength(1);
  expect(readSekhemSession([{ ...offerings[0], institutionId: 'tau' }])).toBeNull();
  for (const results of [
    [{ ...report.results[0], requiredInputs: [null] }],
    [{ ...report.results[0], additionalConditions: [null] }],
    [{ ...report.results[0], score: '706' }],
  ]) {
    sessionStorage.setItem(
      SEKHEM_SESSION_KEY,
      JSON.stringify({ version: 1, ...snapshot(), reports: [{ ...report, results }] }),
    );
    expect(readSekhemSession(offerings)).toBeNull();
  }
});
