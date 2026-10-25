import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function runCalculator(script: string, bagrut = 100, psychometric = 700): string {
  return execFileSync(
    process.execPath,
    [
      resolve('scripts/admissions-calculators', script),
      '--bagrut',
      String(bagrut),
      '--psycho',
      String(psychometric),
    ],
    { encoding: 'utf8', timeout: 10_000 },
  );
}

describe('postfreeze-5 standalone calculator scripts', () => {
  // Ariel published-formula text verified; official calculator not run.
  it('pin 15: Ariel B100/P700 prints sekhem 683', () => {
    const output = runCalculator('8_ariel.js');
    expect(output.match(/Computed Sekhem: \d+/g)).toEqual(Array(11).fill('Computed Sekhem: 683'));
  });

  it('Ariel B120/P800 prints the unrounded composite 799.96', () => {
    const output = runCalculator('8_ariel.js', 120, 800);
    const unrounded = output.match(/^Unrounded Sekhem: (\d+\.\d{2})$/m);
    expect(unrounded, 'missing labelled Unrounded Sekhem output').not.toBeNull();
    expect(Number(unrounded?.[1])).toBeCloseTo(799.96, 2);
  });

  it.each(['4_bgu.js', '5_biu.js'])(
    'pin 16: %s reports no published conversion and no composite',
    (script) => {
      const output = runCalculator(script);
      expect.soft(output).toContain('not found: no published bagrut conversion');
      expect.soft(output).not.toMatch(/Computed Sekhem:\s*\d/);
      expect.soft(output).not.toMatch(/Status:\s*(?:Accepted|Rejected)/);
    },
  );
});
