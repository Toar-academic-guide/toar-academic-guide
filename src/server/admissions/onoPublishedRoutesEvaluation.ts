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
  const routes: PublishedNumericRoute[] = [
    {
      label: 'ממוצע בגרות',
      score: input.bagrut,
      threshold: bagrut,
      requirements: `ממוצע בגרות ${bagrut} לפחות`,
      ...minimum(input.bagrut, bagrut, 'bagrut_average'),
    },
    {
      label: 'פסיכומטרי',
      score: input.psychometric,
      threshold: psychometric,
      requirements: `פסיכומטרי ${psychometric} לפחות`,
      ...minimum(input.psychometric, psychometric, 'psychometric_overall'),
    },
  ];
  if (cs)
    routes.push({
      label: 'מתמטיקה',
      score: mathSubject.grade,
      threshold: mathSubject.units === 4 ? 95 : 75,
      requirements: 'מתמטיקה 5 יחידות בציון 75 או 4 יחידות בציון 95',
      ...mathAlternatives(input, [
        [5, 75],
        [4, 95],
      ]),
    });
  else {
    const conditions = [
      {
        id: 'admissions_committee' as const,
        label: 'ראיון קבלה ואישור המסלול וההתמחות',
        status: 'unconfirmed' as const,
      },
    ];
    routes.push(
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
    );
  }
  const result = evaluatePublishedNumericRoutes({
    institution,
    routes,
    officialUrls: [
      cs
        ? 'https://www.ono.ac.il/curriculum/computer-science-bsc/'
        : 'https://www.ono.ac.il/curriculum/finance-and-capital-markets-ba/',
    ],
    caveat: cs
      ? 'ממוצע הבגרות ושקלול הציונים כפופים לחישוב המכללה.'
      : 'לפי ההתמחות עשויות לחול דרישות נוספות במתמטיקה; יש לאשר אותן עם המכללה.',
  });
  return result.additionalConditions?.some((condition) => condition.id === 'admissions_committee')
    ? { ...result, kind: 'manual_gate' as const, capability: 'manual_gate' as const }
    : result;
}
