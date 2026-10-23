import {
  allOf,
  evaluatePublishedNumericRoutes,
  mathAlternatives,
  minimum,
} from './publishedNumericRoutes';
import type { AdmissionsEvaluationInput } from '@/types/admissionsEvaluation';
import type { CatalogueInstitution } from '@/types/catalogue';

export function evaluateRuppinComputerScience({
  input,
  institution,
}: {
  input: AdmissionsEvaluationInput;
  institution: CatalogueInstitution;
}) {
  const math = mathAlternatives(input, [
    [5, 70],
    [4, 85],
  ]);
  const routes = [
    {
      label: 'ממוצע בגרות',
      score: input.bagrut,
      threshold: 100,
      requirements: 'ממוצע בגרות 100 לפחות',
      gate: minimum(input.bagrut, 100, 'bagrut_average'),
    },
    {
      label: 'ממוצע בגרות ומתמטיקה',
      score: input.bagrut,
      threshold: 98,
      requirements: 'ממוצע בגרות 98 לפחות ומתמטיקה 5 יחידות בציון 80 או 4 יחידות בציון 95',
      gate: allOf(
        minimum(input.bagrut, 98, 'bagrut_average'),
        mathAlternatives(input, [
          [5, 80],
          [4, 95],
        ]),
      ),
    },
    {
      label: 'פסיכומטרי',
      score: input.psychometric,
      threshold: 600,
      requirements: 'פסיכומטרי 600 לפחות',
      gate: minimum(input.psychometric, 600, 'psychometric_overall'),
    },
    {
      label: 'פסיכומטרי וכמותי',
      score: input.psychometric,
      threshold: 590,
      requirements: 'פסיכומטרי 590 לפחות וכמותי 120 לפחות',
      gate: allOf(
        minimum(input.psychometric, 590, 'psychometric_overall'),
        minimum(input.extraInputs?.psychometricMath, 120, 'psychometric_math'),
      ),
    },
  ].map(({ gate, ...route }) => ({ ...route, ...allOf(gate, math) }));
  return evaluatePublishedNumericRoutes({
    institution,
    routes,
    officialUrls: [
      'https://www.ruppin.ac.il/faculties/ba/computer-science/application-requirements/',
    ],
    caveat:
      'נבדקו מסלולי הבגרות והפסיכומטרי. מסלול נוסף משלב ביניהם לפי חישוב רופין, ודורש בדיקה מול הרישום. ממוצע הבגרות כפוף לחישוב המוסד.',
  });
}
