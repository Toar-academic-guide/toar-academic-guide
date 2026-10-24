import type { Program } from '../degrees/types';

// Official destinations verified with curl -L on 2026-10-25.
export const HAIFA_PROGRAM_URLS: Readonly<Record<string, string>> = {
  haifa_cs: 'https://admissions.haifa.ac.il/computer-information-science/program/3210/',
  haifa_law: 'https://admissions.haifa.ac.il/law/program/3000/',
};
export const HAIFA_CALCULATOR_URL = 'https://admissions.haifa.ac.il/score-calculation/';

/** Repair URLs after a successful DB read, preserving its admission data. */
export function applyHaifaOfficialUrls<T extends Program>(program: T): T {
  const programUrl = HAIFA_PROGRAM_URLS[program.id];
  if (!programUrl) return program;
  return {
    ...program,
    institutionDetails: program.institutionDetails?.map((detail) =>
      detail.institutionName === 'אוניברסיטת חיפה'
        ? {
            ...detail,
            programUrl,
            calculatorUrl: HAIFA_CALCULATOR_URL,
            officialCalculatorUrl: HAIFA_CALCULATOR_URL,
          }
        : detail,
    ),
  };
}
