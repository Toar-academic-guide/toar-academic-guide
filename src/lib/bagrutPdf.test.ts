import { resolveBagrutWizardSubject } from '@/utils/bagrutSubjectRecord';
import { describe, expect, it } from 'vitest';
import { parseBagrutTable, parseSimpleBagrutLines, type PositionedItem } from './bagrutPdf';

const item = (str: string, x: number, y = 500, width = 15): PositionedItem => ({
  str,
  x,
  y,
  width,
});
const row = (name = 'מתמטיקה', units = '5', grade = '045', y = 500): PositionedItem[] => [
  item('*', 552, y + 1),
  item('999901', 505, y),
  item(name, 410, y, 85),
  item(`${units} יח״ל`, 313, y, 30),
  item('רגיל', 240, y),
  item(grade, 103, y),
  item('04/2024', 45, y, 30),
];

describe('positioned final Bagrut rows', () => {
  it('attaches an offset star and reads final units/zero-padded grade, excluding the date', () => {
    expect(parseBagrutTable([row()])).toMatchObject({
      valid: true,
      starredRows: 1,
      subjects: [{ label: 'מתמטיקה', units: 5, grade: 45 }],
    });
  });
  it('ignores component rows, fractional units, non-starred units, hours and the terminator', () => {
    const component = row('מתמטיקה (רמה מוגברת)', '1/2', '099', 480).filter((i) => i.str !== '*');
    const nonFinal = row('אנגלית', '4', '088', 460).filter((i) => i.str !== '*');
    const hours = row('מעורבות חברתית', '60', '100', 440)
      .filter((i) => i.str !== '*')
      .map((i) => (i.str.includes('יח״ל') ? { ...i, str: '60 שעות' } : i));
    const terminator = [45, 103, 313, 410, 505, 552].map((x) => item('*', x, 400));
    expect(
      parseBagrutTable([[...row(), ...component, ...nonFinal, ...hours, ...terminator]]),
    ).toMatchObject({
      valid: true,
      starredRows: 1,
      subjects: [{ label: 'מתמטיקה', units: 5, grade: 45 }],
    });
  });
  it('selects the final column even if a component mark is also present', () => {
    expect(parseBagrutTable([[...row(), item('099', 140)]])).toMatchObject({
      subjects: [{ grade: 45 }],
      valid: true,
    });
  });
  it('keeps unmatched Hebrew names and handles pages independently', () => {
    expect(
      parseBagrutTable([row('מקצוע בדיקה עם ף', '4', '054'), row('אנגלית', '5', '100')]),
    ).toMatchObject({
      valid: true,
      starredRows: 2,
      subjects: [
        { label: 'מקצוע בדיקה עם ף', units: 4, grade: 54, unmatched: true },
        { label: 'אנגלית', units: 5, grade: 100 },
      ],
    });
  });
  it('maps quote, spacing and parenthetical level variations to catalogue labels', () => {
    expect(parseBagrutTable([row('תנ"ך (רמה רגילה)', '2', '084')]).subjects[0].label).toBe('תנ״ך');
  });
  it('joins split name and units items in their relative columns at a shifted scale', () => {
    const parts = row('מדעי', '5', '054').filter((i) => !i.str.includes('יח״ל'));
    parts.push(item('המחשב', 360, 501, 40), item('יח״ל', 313, 500, 20), item('5', 339));
    const scaled = parts.map((i) => ({
      ...i,
      x: i.x * 1.5 + 70,
      y: i.y * 1.5,
      width: (i.width ?? 0) * 1.5,
    }));
    expect(parseBagrutTable([scaled])).toMatchObject({
      valid: true,
      subjects: [{ label: 'מדעי המחשב', units: 5, grade: 54 }],
    });
  });
  it.each(['0', '11', '1/2'])('fails document sanity on invalid units %s', (units) => {
    expect(parseBagrutTable([row('אנגלית', units), row()]).valid).toBe(false);
  });
  it.each(['101', '', '90'])('fails sanity for missing or malformed final grade %s', (grade) => {
    expect(parseBagrutTable([row('אנגלית', '5', grade), row()]).valid).toBe(false);
  });
  it('rejects a missing final-column mark even when the component column is populated', () => {
    const incomplete = [...row('אנגלית', '5', '', 460), item('099', 140, 460)];
    expect(parseBagrutTable([[...row(), ...incomplete]]).valid).toBe(false);
  });
  it('fails sanity when there are no final rows or an orphan star', () => {
    expect(parseBagrutTable([[]]).valid).toBe(false);
    expect(parseBagrutTable([[...row(), item('*', 552, 420)]]).valid).toBe(false);
  });
});

it.each(['פיזיקה', 'פיסיקה'])(
  'maps PDF spelling %s through the shared manual-entry subject map',
  (name) => {
    const parsed = parseBagrutTable([row(name)]).subjects[0];
    expect(parsed.label).toBe('פיסיקה');
    expect(parsed.unmatched).toBeUndefined();
    expect(resolveBagrutWizardSubject(parsed.label)).toEqual(resolveBagrutWizardSubject(name));
  },
);

it('accepts simple subject/units/grade lines in either PDF text direction, retaining unknowns', () => {
  expect(
    parseSimpleBagrutLines([
      'פיזיקה 5 90',
      '054 4 אנגלית',
      'מקצוע בדיקה עם ף 4 55',
      '000000000',
      '04/2024 מתמטיקה 5 90',
      'אנגלית 5 90 95',
      'מעורבות חברתית 60 שעות 100',
    ]),
  ).toEqual([
    { label: 'פיסיקה', units: 5, grade: 90 },
    { label: 'אנגלית', units: 4, grade: 54 },
    { label: 'מקצוע בדיקה עם ף', units: 4, grade: 55, unmatched: true },
  ]);
});
