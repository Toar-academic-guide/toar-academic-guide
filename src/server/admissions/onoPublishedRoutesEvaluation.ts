import {
  allOf,
  evaluatePublishedNumericRoutes,
  examSubject,
  mathAlternatives,
  minimum,
  type PublishedNumericRoute,
} from './publishedNumericRoutes';
import type { AdmissionsEvaluationInput } from '@/types/admissionsEvaluation';
import type { CatalogueInstitution } from '@/types/catalogue';

export function evaluateOnoPublishedRoutes({
  input,
  institution,
}: {
  input: AdmissionsEvaluationInput;
  institution: CatalogueInstitution;
}) {
  const cs = input.degreeId === 'ono_cs';
  const bagrut = cs ? 100 : 95;
  const psychometric = cs ? 650 : 600;
  const mathSubject = examSubject(input, 'mathematics');
  // Official BA business direct admission also requires math 3u@75 / 4u@65 / 5u pass.
  const businessMath = mathAlternatives(input, [
    [3, 75],
    [4, 65],
    [5, 55],
  ]);
  const directRoutes: PublishedNumericRoute[] = [
    {
      label: 'ממוצע בגרות',
      score: input.bagrut,
      threshold: bagrut,
      requirements: cs
        ? `ממוצע בגרות ${bagrut} לפחות`
        : `ממוצע בגרות ${bagrut} לפחות ומתמטיקה 3 יחידות בציון 75, 4 בציון 65 או 5 יחידות בציון עובר`,
      ...(cs
        ? minimum(input.bagrut, bagrut, 'bagrut_average')
        : allOf(minimum(input.bagrut, bagrut, 'bagrut_average'), businessMath)),
    },
    {
      label: 'פסיכומטרי',
      score: input.psychometric,
      threshold: psychometric,
      requirements: cs
        ? `פסיכומטרי ${psychometric} לפחות`
        : `פסיכומטרי ${psychometric} לפחות, בגרות מלאה, ומתמטיקה 3 יחידות בציון 75, 4 בציון 65 או 5 יחידות בציון עובר`,
      ...(cs
        ? minimum(input.psychometric, psychometric, 'psychometric_overall')
        : allOf(minimum(input.psychometric, psychometric, 'psychometric_overall'), businessMath)),
    },
  ];
  if (cs)
    directRoutes.push({
      label: 'מתמטיקה',
      score: mathSubject.grade,
      threshold: mathSubject.units === 4 ? 95 : 75,
      requirements: 'מתמטיקה 5 יחידות בציון 75 או 4 יחידות בציון 95',
      ...mathAlternatives(input, [
        [5, 75],
        [4, 95],
      ]),
    });

  const officialUrls = [
    cs
      ? 'https://www.ono.ac.il/business/curriculum/computer-science-bsc/'
      : 'https://www.ono.ac.il/curriculum/finance-and-capital-markets-ba/',
  ];
  const caveat = cs
    ? 'ממוצע הבגרות ושקלול הציונים כפופים לחישוב המכללה.'
    : 'עמידה בסף אינה אישור קבלה; יש לאשר את תנאי ההתמחות מול המכללה.';

  const direct = evaluatePublishedNumericRoutes({
    institution,
    routes: directRoutes,
    officialUrls,
    caveat,
  });
  if (cs || direct.decision !== 'below') return direct;

  const conditions = [
    {
      id: 'admissions_committee' as const,
      label: 'ראיון קבלה ואישור המסלול וההתמחות',
      status: 'unconfirmed' as const,
    },
  ];
  const interview = evaluatePublishedNumericRoutes({
    institution,
    routes: [
      {
        label: 'ממוצע בגרות — ראיון',
        score: input.bagrut,
        threshold: 80,
        requirements: 'ממוצע בגרות 80–94 וראיון קבלה',
        ...allOf(minimum(input.bagrut, 80, 'bagrut_average'), {
          below: input.bagrut !== undefined && input.bagrut >= 95,
          missing: [],
        }),
        conditions,
      },
      {
        label: 'פסיכומטרי — ראיון',
        score: input.psychometric,
        threshold: 550,
        requirements: 'פסיכומטרי 550 לפחות וראיון קבלה',
        ...minimum(input.psychometric, 550, 'psychometric_overall'),
        conditions,
      },
    ],
    officialUrls,
    caveat,
  });
  return interview.additionalConditions?.some(
    (condition) => condition.id === 'admissions_committee',
  )
    ? { ...interview, kind: 'manual_gate' as const, capability: 'manual_gate' as const }
    : interview;
}
