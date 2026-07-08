import { describe, expect, it } from 'vitest';

import { mondayAdmissionsEvidence } from '../admissions/mondayEvidence';
import { INSTITUTIONS } from '../institutions';
import { allPrograms } from './index';

type CatalogueProgramLike = (typeof allPrograms)[number];
type InstitutionDetailLike = NonNullable<CatalogueProgramLike['institutionDetails']>[number];

function isSoftAdmissionsText(text: string) {
  return (
    /יתרון|מומלץ|המלצה|בונוס|תחרות גבוהה/u.test(text) ||
    /מופיע בקטלוג|קמפוס צפת/u.test(text) ||
    /The official |client-side|not published|remain behind|adapted-score formula/i.test(text)
  );
}

function hasNumericFact(detail: InstitutionDetailLike, field: string, minimum?: number) {
  return (detail.admissionFacts ?? []).some(
    (fact) =>
      fact.kind === 'numeric_gate' &&
      fact.field === field &&
      (minimum === undefined || (fact.valueNumber ?? -Infinity) >= minimum),
  );
}

function hasManualFact(detail: InstitutionDetailLike, fields: string[]) {
  return (detail.admissionFacts ?? []).some(
    (fact) => fact.kind === 'manual_gate' && fields.includes(fact.field),
  );
}

function isStructuredCoverageForText(
  program: CatalogueProgramLike,
  detail: InstitutionDetailLike,
  text: string,
) {
  if (isSoftAdmissionsText(text)) {
    return true;
  }

  const facts = detail.admissionFacts ?? [];
  const paths = detail.admissionAlternativePaths ?? [];

  if (/קבלה פתוחה/u.test(text)) {
    return facts.some((fact) => fact.kind === 'open_admission');
  }

  if (/אין סף פסיכומטרי/u.test(text)) {
    return facts.some((fact) => fact.kind === 'explicit_absence' && fact.field === 'psychometric');
  }

  if (/אין סף .*בגרות/u.test(text)) {
    return facts.some(
      (fact) => fact.kind === 'explicit_absence' && fact.field === 'bagrut_average',
    );
  }

  if (/רמת אנגלית|אמיר"ם|אמירם|מתקדמים א/u.test(text)) {
    return (
      hasManualFact(detail, ['other']) ||
      hasNumericFact(detail, 'english_units') ||
      hasNumericFact(detail, 'english_grade')
    );
  }

  if (/קבלה אוטומטית/u.test(text)) {
    return (
      hasNumericFact(detail, 'bagrut_average') ||
      hasNumericFact(detail, 'psychometric') ||
      hasNumericFact(detail, 'math_units')
    );
  }

  if (/ציון התאמה|ממוצע בגרות בהתאם למסלול/u.test(text)) {
    return hasManualFact(detail, ['other']);
  }

  if (/פסיכומטרי/u.test(text) && /כמותי/u.test(text)) {
    return (
      hasNumericFact(detail, 'psychometric') && hasNumericFact(detail, 'psychometric_quantitative')
    );
  }

  if (/פסיכומטרי/u.test(text) && /≥|\+/.test(text)) {
    return hasNumericFact(detail, 'psychometric') || Boolean(program.minimumPsychometric);
  }

  if (/ממוצע בגרות(?: משוקלל)?/u.test(text)) {
    return hasNumericFact(detail, 'bagrut_average') || Boolean(program.minimumBagrut);
  }

  if (/5 יח"ל מתמטיקה/u.test(text) && /4 יח"ל/u.test(text) && /\d+\+/u.test(text)) {
    return hasNumericFact(detail, 'math_units', 5) && hasNumericFact(detail, 'math_grade');
  }

  if (/5 יח"ל מתמטיקה/u.test(text) && /חובה/u.test(text)) {
    return hasNumericFact(detail, 'math_units', 5);
  }

  if (/4 יח"ל מתמטיקה/u.test(text) && /חובה/u.test(text)) {
    return hasNumericFact(detail, 'math_units', 4);
  }

  if (/5 יח"ל פיזיקה/u.test(text) && /חובה/u.test(text)) {
    return hasNumericFact(detail, 'physics_units', 5);
  }

  if (/בגרות מלאה/u.test(text)) {
    return hasManualFact(detail, ['document_check']);
  }

  if (/ביולוגיה|כימיה/u.test(text) && /חובה/u.test(text)) {
    return hasManualFact(detail, ['required_subject']);
  }

  if (/תיק עבודות/u.test(text)) {
    return hasManualFact(detail, ['portfolio']);
  }

  if (/ראיון/u.test(text)) {
    return hasManualFact(detail, ['interview', 'committee']);
  }

  if (/ועדת קבלה|ועדה/u.test(text)) {
    return hasManualFact(detail, ['committee', 'interview']);
  }

  if (/מבחן|אודישן|מבדק/u.test(text)) {
    return hasManualFact(detail, ['exam']);
  }

  if (/חלופ|מכינה|אפיק מעבר|מסלולי הכנה/u.test(text)) {
    return paths.length > 0;
  }

  return true;
}

describe('dynamic Monday-derived programme inference', () => {
  it('does not fall back broad culinary and education institutions to synthetic computer-science programmes', () => {
    expect(allPrograms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'danon_culinary',
          name: 'קולינריה - דנון - קולינריה',
          category: 'קולינריה',
          type: 'certificate',
        }),
        expect.objectContaining({
          id: 'mon_12220685573_culinary',
          name: 'קולינריה - אסטלה - קונדיטוריה',
          category: 'קולינריה',
          type: 'certificate',
        }),
        expect.objectContaining({
          id: 'david_yellin_education',
          name: 'חינוך והוראה - המכללה האקדמית לחינוך ע"ש דוד ילין',
          category: 'חינוך',
          type: 'academic',
        }),
      ]),
    );

    expect(allPrograms.some((program) => program.id === 'danon_cs')).toBe(false);
    expect(allPrograms.some((program) => program.id === 'mon_12220685573_cs')).toBe(false);
    expect(allPrograms.some((program) => program.id === 'david_yellin_cs')).toBe(false);
  });

  it('classifies legal, engineering, preparatory, and generic certificate institutions into safer fallback buckets', () => {
    const expectedPrograms = [
      { id: 'shaare_mishpat_law', category: 'משפטים', type: 'academic' },
      { id: 'sce_engineering', category: 'הנדסה', type: 'academic' },
      { id: 'sce_prep', category: 'מכינות', type: 'academic' },
      { id: 'schechter_certificate', category: 'לימודי תעודה', type: 'certificate' },
      { id: 'sapir_certificate', category: 'לימודי תעודה', type: 'certificate' },
      { id: 'ruppin_engineering', category: 'הנדסה', type: 'academic' },
      { id: 'givat_washington_certificate', category: 'לימודי תעודה', type: 'certificate' },
      { id: 'israel_academic_general_academic', category: 'לימודים אקדמיים', type: 'academic' },
      { id: 'tech_management_engineering', category: 'הנדסה', type: 'academic' },
      { id: 'bdo_academy_general_academic', category: 'לימודים אקדמיים', type: 'academic' },
      { id: 'bdo_academy_certificate', category: 'לימודי תעודה', type: 'certificate' },
      { id: 'atid_engineering', category: 'הנדסה', type: 'certificate' },
      { id: 'atid_certificate', category: 'לימודי תעודה', type: 'certificate' },
      { id: 'lfa_beauty', category: 'מקצועות היופי', type: 'certificate' },
      { id: 'lfa_certificate', category: 'לימודי תעודה', type: 'certificate' },
      { id: 'mediteva_certificate', category: 'לימודי תעודה', type: 'certificate' },
      { id: 'high_q_certificate', category: 'לימודי תעודה', type: 'certificate' },
      { id: 'kidum_certificate', category: 'לימודי תעודה', type: 'certificate' },
    ] as const;

    for (const expectedProgram of expectedPrograms) {
      expect(allPrograms).toEqual(
        expect.arrayContaining([expect.objectContaining(expectedProgram)]),
      );
    }

    expect(allPrograms.some((program) => program.id === 'mon_12341088622_general_academic')).toBe(
      false,
    );
    expect(allPrograms.some((program) => program.id === 'mon_12341091743_engineering')).toBe(false);
    expect(allPrograms.some((program) => program.id === 'mon_12341122528_general_academic')).toBe(
      false,
    );
    expect(allPrograms.some((program) => program.id === 'mon_12341173326_certificate')).toBe(false);
    expect(allPrograms.some((program) => program.id === 'mon_12341098712_engineering')).toBe(false);
    expect(allPrograms.some((program) => program.id === 'mon_12341148006_certificate')).toBe(false);
    expect(allPrograms.some((program) => program.id === 'mon_12341092393_beauty')).toBe(false);
    expect(allPrograms.some((program) => program.id === 'mon_12341167376_certificate')).toBe(false);
    expect(allPrograms.some((program) => program.id === 'mon_12341189545_certificate')).toBe(false);
    expect(allPrograms.some((program) => program.id === 'mon_12341179578_certificate')).toBe(false);
    expect(allPrograms.some((program) => program.id === 'mon_12341161996_certificate')).toBe(false);
  });

  it('merges colliding Monday-derived rows into one dynamic program instead of dropping earlier evidence', () => {
    const ruppinEngineering = allPrograms.find((program) => program.id === 'ruppin_engineering');

    expect(ruppinEngineering).toMatchObject({
      id: 'ruppin_engineering',
      institutionId: 'ruppin',
      type: 'academic',
      category: 'הנדסה',
    });
    expect(ruppinEngineering?.institutionDetails?.map((detail) => detail.institutionName)).toEqual(
      expect.arrayContaining([
        'המכללה הטכנולוגית רופין\\- מבית רשת מכללות עתיד',
        'המכללה הטכנולוגית רופין\\- לימודי חוץ והכשרה טכנולוגית',
      ]),
    );

    const openUniversityCertificate = allPrograms.find(
      (program) => program.id === 'open_university_certificate',
    );

    expect(openUniversityCertificate).toMatchObject({
      id: 'open_university_certificate',
      institutionId: 'open_university',
      type: 'certificate',
      category: 'לימודי תעודה',
    });
    expect(
      openUniversityCertificate?.institutionDetails?.map((detail) => detail.institutionName),
    ).toEqual(
      expect.arrayContaining([
        'חשיפה \\- האוניברסיטה הפתוחה',
        'תפנית',
        'דיאלוג',
        'מירב',
        'דיפלומה \\- ביה"ס ללימודי תעודה והסמכה',
      ]),
    );

    const givatWashingtonCertificate = allPrograms.find(
      (program) => program.id === 'givat_washington_certificate',
    );

    expect(givatWashingtonCertificate).toMatchObject({
      id: 'givat_washington_certificate',
      institutionId: 'givat_washington',
      type: 'certificate',
      category: 'לימודי תעודה',
    });
    expect(
      givatWashingtonCertificate?.institutionDetails?.map((detail) => detail.institutionName),
    ).toEqual(
      expect.arrayContaining([`בית ספר 'ליגה" -בית הספר למאמנים ומדריכים בספורט גבעת ושינגטון`]),
    );

    const givatWashingtonMedicine = allPrograms.find(
      (program) => program.id === 'givat_washington_medicine',
    );

    expect(givatWashingtonMedicine).toMatchObject({
      id: 'givat_washington_medicine',
      institutionId: 'givat_washington',
      type: 'certificate',
      category: 'רפואה',
    });
    expect(
      givatWashingtonMedicine?.institutionDetails?.map((detail) => detail.institutionName),
    ).toEqual(expect.arrayContaining(["'אדמה'\\- בית הספר לרפואה משלימה ותרפיות בגבעת ושינגטון"]));

    const orinShpalterCertificate = allPrograms.find(
      (program) => program.id === 'orin_shpalter_certificate',
    );

    expect(orinShpalterCertificate).toMatchObject({
      id: 'orin_shpalter_certificate',
      institutionId: 'orin_shpalter',
      type: 'certificate',
      category: 'לימודי תעודה',
    });
    expect(
      orinShpalterCertificate?.institutionDetails?.map((detail) => detail.institutionName),
    ).toEqual(expect.arrayContaining(['אורין-שפלטר השכלה פיננסית', 'אורין-שפלטר השכלה פיננסית.']));

    const tcbEngineering = allPrograms.find((program) => program.id === 'tcb_engineering');

    expect(tcbEngineering).toMatchObject({
      id: 'tcb_engineering',
      institutionId: 'tcb',
      type: 'certificate',
      category: 'הנדסה',
    });
    expect(tcbEngineering?.institutionDetails?.map((detail) => detail.institutionName)).toEqual(
      expect.arrayContaining([
        'המכללה הטכנולוגית באר שבע המרכז להשתלמויות',
        'המכללה הטכנולוגית באר שבע \\- הנדסאים',
      ]),
    );

    const aliyaCertificate = allPrograms.find((program) => program.id === 'aliya_certificate');

    expect(aliyaCertificate).toMatchObject({
      id: 'aliya_certificate',
      institutionId: 'aliya',
      type: 'certificate',
      category: 'לימודי תעודה',
    });
    expect(aliyaCertificate?.institutionDetails?.map((detail) => detail.institutionName)).toEqual(
      expect.arrayContaining(['מכון עליה', 'מכון עליה למגזר הערבי']),
    );

    const tiltanMedicine = allPrograms.find((program) => program.id === 'tiltan_medicine');

    expect(tiltanMedicine).toMatchObject({
      id: 'tiltan_medicine',
      institutionId: 'tiltan',
      type: 'certificate',
      category: 'רפואה',
    });
    expect(tiltanMedicine?.institutionDetails?.map((detail) => detail.institutionName)).toEqual(
      expect.arrayContaining(['מכללת תילתן המכללה לרפואה משלימה']),
    );

    const tiltanGraphicDesign = allPrograms.find(
      (program) => program.id === 'tiltan_graphic_design',
    );

    expect(tiltanGraphicDesign).toMatchObject({
      id: 'tiltan_graphic_design',
      institutionId: 'tiltan',
      type: 'academic',
      category: 'עיצוב',
    });
    expect(
      tiltanGraphicDesign?.institutionDetails?.map((detail) => detail.institutionName),
    ).toEqual(expect.arrayContaining(['תילתן המכללה לעיצוב ולתקשורת חזותית']));

    const tiltanCertificate = allPrograms.find((program) => program.id === 'tiltan_certificate');

    expect(tiltanCertificate).toMatchObject({
      id: 'tiltan_certificate',
      institutionId: 'tiltan',
      type: 'certificate',
      category: 'לימודי תעודה',
    });
    expect(tiltanCertificate?.institutionDetails?.map((detail) => detail.institutionName)).toEqual(
      expect.arrayContaining(['תילתן קמפוס חרדי']),
    );

    const idanHahorutEducation = allPrograms.find(
      (program) => program.id === 'idan_hahorut_education',
    );

    expect(idanHahorutEducation).toMatchObject({
      id: 'idan_hahorut_education',
      institutionId: 'idan_hahorut',
      type: 'academic',
      category: 'חינוך',
    });
    expect(
      idanHahorutEducation?.institutionDetails?.map((detail) => detail.institutionName),
    ).toEqual(
      expect.arrayContaining([
        'מכללת עידן ההורות',
        'סאבטקסט\\- המכללה ללימודי שפת גוף מבית מכללת עידן ההורות',
      ]),
    );

    const meditevaCertificate = allPrograms.find(
      (program) => program.id === 'mediteva_certificate',
    );

    expect(meditevaCertificate).toMatchObject({
      id: 'mediteva_certificate',
      institutionId: 'mediteva',
      type: 'certificate',
      category: 'לימודי תעודה',
    });
    expect(
      meditevaCertificate?.institutionDetails?.map((detail) => detail.institutionName),
    ).toEqual(expect.arrayContaining(['מכללת מדיטבע']));

    const highQCertificate = allPrograms.find((program) => program.id === 'high_q_certificate');

    expect(highQCertificate).toMatchObject({
      id: 'high_q_certificate',
      institutionId: 'high_q',
      type: 'certificate',
      category: 'לימודי תעודה',
    });
    expect(highQCertificate?.institutionDetails?.map((detail) => detail.institutionName)).toEqual(
      expect.arrayContaining(['HIGH Q']),
    );

    const kidumCertificate = allPrograms.find((program) => program.id === 'kidum_certificate');

    expect(kidumCertificate).toMatchObject({
      id: 'kidum_certificate',
      institutionId: 'kidum',
      type: 'certificate',
      category: 'לימודי תעודה',
    });
    expect(kidumCertificate?.institutionDetails?.map((detail) => detail.institutionName)).toEqual(
      expect.arrayContaining(['קידום \\- בגרויות']),
    );
  });

  it('keeps only clearly computing-oriented Monday institutions in the cs fallback bucket', () => {
    const csFallbacks = allPrograms.filter(
      (program) =>
        program.name.startsWith('מדעי המחשב - ') &&
        (program.id.startsWith('mon_') || program.id === 'hackeru_cs'),
    );

    expect(csFallbacks.map((program) => program.id).sort()).toEqual([
      'hackeru_cs',
      'mon_12341101353_cs',
      'mon_12341113400_cs',
      'mon_12341147475_cs',
    ]);
  });

  it('gives every Monday evidence record at least one institution-backed generated programme', () => {
    const institutionIds = new Set(INSTITUTIONS.map((institution) => institution.id));

    const uncoveredRecords = mondayAdmissionsEvidence
      .filter((record) => record.ruleStatus !== 'not_applicable')
      .map((record) => {
        const institutionId = record.catalogueInstitutionId ?? `mon_${record.itemId}`;
        const matchingPrograms = allPrograms.filter(
          (program) => program.institutionId === institutionId,
        );

        return {
          itemId: record.itemId,
          displayName: record.displayName,
          institutionId,
          matchingProgramIds: matchingPrograms.map((program) => program.id),
        };
      })
      .filter(
        ({ institutionId, matchingProgramIds }) =>
          !institutionIds.has(institutionId as (typeof INSTITUTIONS)[number]['id']) ||
          matchingProgramIds.length === 0,
      );

    expect(uncoveredRecords).toEqual([]);
  });

  it('proves that FREE MEDIA and item י (not_applicable status) do not generate visible programs', () => {
    const isFreeMediaPresent = allPrograms.some(
      (program) =>
        program.id.includes('12341167263') ||
        program.institutionId?.includes('12341167263') ||
        program.institution.includes('FREE MEDIA'),
    );
    const isYPresent = allPrograms.some(
      (program) =>
        program.id.includes('12242591498') ||
        program.institutionId?.includes('12242591498') ||
        program.institution === 'י',
    );

    expect(isFreeMediaPresent).toBe(false);
    expect(isYPresent).toBe(false);

    const hasAnyNotApplicable = allPrograms.some((program) => {
      const record = mondayAdmissionsEvidence.find(
        (r) =>
          r.catalogueInstitutionId === program.institutionId ||
          `mon_${r.itemId}` === program.institutionId,
      );
      return record && record.ruleStatus === 'not_applicable';
    });
    expect(hasAnyNotApplicable).toBe(false);
  });

  it('synthesizes institution details for non-Ariel requirements programs that only had admissionRequirements text', () => {
    const missingDetails = allPrograms
      .filter(
        (program) =>
          program.institutionId !== 'ariel' &&
          program.admissionType === 'requirements' &&
          program.admissionRequirements.length > 0 &&
          !program.institutionDetails?.length,
      )
      .map((program) => program.id);

    expect(missingDetails).toEqual([]);
  });

  it('does not leave non-Ariel hard admissions requirements as unstructured text only', () => {
    const uncovered = allPrograms.flatMap((program) => {
      if (program.institutionId === 'ariel') {
        return [];
      }

      return (program.institutionDetails ?? []).flatMap((detail) => {
        const texts = [...(detail.specificAdmissionNotes ?? []), ...program.admissionRequirements];
        const missing = texts.filter(
          (text) =>
            /חובה|מחייב|נדרש|תנאי|מינימלי|פסיכומטרי|בגרות|מתמטיקה|אנגלית|פיזיקה|תיק עבודות|ראיון|מבחן|מכינה|קבלה פתוחה/u.test(
              text,
            ) && !isStructuredCoverageForText(program, detail, text),
        );

        return missing.length > 0
          ? [
              {
                programId: program.id,
                institutionName: detail.institutionName,
                missing,
              },
            ]
          : [];
      });
    });

    expect(uncovered).toEqual([]);
  });
});
