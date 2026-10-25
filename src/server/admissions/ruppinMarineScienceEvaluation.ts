import {
  allOf,
  evaluatePublishedNumericRoutes,
  mathAlternatives,
  minimum,
} from './publishedNumericRoutes';
import type { AdmissionsEvaluationInput } from '@/types/admissionsEvaluation';
import type { CatalogueInstitution } from '@/types/catalogue';

// Official תשפ״ז routes, checked 2026-10-25:
// https://www.ruppin.ac.il/faculties/ba/marine-science-and-environment/application-requirements/
// Capture: raw/official/ruppin/sweep38_marine-ba-requirements_chrome_20261025T163156.txt,
// lines 262–292. Gate correction evidence is recorded in
// docs/admissions-verification/2026-10-25-sweep38-official-source-corrections.md.
// The 106 composite requires psychometric 550 but has NO published formula.
// Keep it uncomputed and never request an institutional composite from the student.
export function evaluateRuppinMarineScience({
  input,
  institution,
}: {
  input: AdmissionsEvaluationInput;
  institution: CatalogueInstitution;
}) {
  // As in Ruppin CS, check the school math gate; pre-course/exemption is a caveat.
  const math = mathAlternatives(input, [
    [4, 70],
    [5, 55], // Passing Bagrut grade; the source calls this "ציון עובר".
  ]);
  const routes = [
    {
      label: 'ממוצע בגרות',
      score: input.bagrut,
      threshold: 100,
      requirements: 'ממוצע בגרות משוקלל עם בונוסים 100 לפחות',
      gate: minimum(input.bagrut, 100, 'bagrut_average'),
    },
    {
      label: 'פסיכומטרי',
      score: input.psychometric,
      threshold: 620,
      requirements: 'פסיכומטרי 620 לפחות',
      gate: minimum(input.psychometric, 620, 'psychometric_overall'),
    },
  ].map(({ gate, ...route }) => ({
    ...route,
    requirements: `${route.requirements}, ומתמטיקה 4 יחידות בציון 70 לפחות או 5 יחידות בציון עובר`,
    ...allOf(gate, math),
  }));
  return evaluatePublishedNumericRoutes({
    institution,
    routes,
    officialUrls: [
      'https://www.ruppin.ac.il/faculties/ba/marine-science-and-environment/application-requirements/',
    ],
    caveat:
      'הממוצע הקובע מחושב ברופין עם בונוסים. מסלול ציון קבלה 106 עם פסיכומטרי 550 לפחות אינו מחושב כאן משום שנוסחתו אינה מפורסמת. למי שאינם עומדים בדרישת המתמטיקה קיימים קורס קדם או מבחן פטור; חלופות אלה אינן נבדקות בחישוב.',
  });
}
