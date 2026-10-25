import { describe, expect, it } from 'vitest';
import { TECHNION_WINTER_CUTOFFS, technionWinterRequirement } from './technionWinterCutoffs';

describe('Technion browser-safe winter requirements', () => {
  it('keeps the official winter cutoffs', () => {
    expect(TECHNION_WINTER_CUTOFFS).toEqual({ ee: 91.5, me: 87 });
  });

  it.each([
    ['ee', 'בחורף תשפ"ז: סכם 91.5'],
    ['technion_ee', 'בחורף תשפ"ז: סכם 91.5'],
    ['me', 'בחורף תשפ"ז: סכם 87'],
    ['technion_me', 'בחורף תשפ"ז: סכם 87'],
  ])('resolves %s at Technion', (programId, expected) => {
    expect(technionWinterRequirement(programId, 'technion')).toBe(expected);
  });

  it.each([
    ['technion_ee', undefined],
    ['technion_me', ''],
    ['ee', 'tau'],
    ['me', 'bgu'],
    ['technion_ee', 'tau'],
    ['technion_me', 'bgu'],
    ['technion_cs', 'technion'],
    ['cs', 'technion'],
    ['', 'technion'],
    ['ee__technion', 'technion'],
    ['technion_ee__technion', 'technion'],
  ])('does not resolve %s / %s', (programId, institutionId) => {
    expect(technionWinterRequirement(programId, institutionId)).toBeUndefined();
  });
});
