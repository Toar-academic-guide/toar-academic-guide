import { describe, expect, it } from 'vitest';
import { getStaticCataloguePrograms } from './catalogueStatic';

describe('Haifa catalogue official destinations', () => {
  it.each([
    ['haifa_cs', 'https://admissions.haifa.ac.il/computer-information-science/program/3210/'],
    ['haifa_law', 'https://admissions.haifa.ac.il/law/program/3000/'],
  ])('uses current programme and calculator links for %s', (id, programUrl) => {
    const program = getStaticCataloguePrograms().find((entry) => entry.id === id)!;
    expect(program.institutionDetails).toHaveLength(1);
    expect(program.institutionDetails![0]).toMatchObject({
      programUrl,
      officialCalculatorUrl: 'https://admissions.haifa.ac.il/score-calculation/',
      calculatorUrl: 'https://admissions.haifa.ac.il/score-calculation/',
    });
  });
});
