import { describe, expect, it } from 'vitest';

import { mondayAdmissionsEvidence } from '../admissions/mondayEvidence';
import { INSTITUTIONS } from '../institutions';
import { allPrograms } from './index';

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
    expect(allPrograms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'shaare_mishpat_law',
          name: 'משפטים - המרכז האקדמי שערי מדע ומשפט',
          category: 'משפטים',
          type: 'academic',
        }),
        expect.objectContaining({
          id: 'sce_engineering',
          name: 'הנדסה וטכנולוגיה - SCE המכללה האקדמית להנדסה ע"ש סמי שמעון',
          category: 'הנדסה',
          type: 'academic',
        }),
        expect.objectContaining({
          id: 'sce_prep',
          name: 'מכינה קדם-אקדמית - המכללה האקדמית סמי שמעון SCE',
          category: 'מכינות',
          type: 'academic',
        }),
        expect.objectContaining({
          id: 'schechter_certificate',
          name: 'לימודי תעודה מקצועיים - מכון שכטר למדעי היהדות',
          category: 'לימודי תעודה',
          type: 'certificate',
        }),
        expect.objectContaining({
          id: 'sapir_certificate',
          name: 'לימודי תעודה מקצועיים - המרכז ללימודי חוץ והמשך ספיר',
          category: 'לימודי תעודה',
          type: 'certificate',
        }),
        expect.objectContaining({
          id: 'ruppin_engineering',
          name: 'הנדסה וטכנולוגיה - המכללה הטכנולוגית רופין\\- מבית רשת מכללות עתיד',
          category: 'הנדסה',
          type: 'academic',
        }),
        expect.objectContaining({
          id: 'givat_washington_certificate',
          name: `לימודי תעודה מקצועיים - בית ספר 'ליגה" -בית הספר למאמנים ומדריכים בספורט גבעת ושינגטון`,
          category: 'לימודי תעודה',
          type: 'certificate',
        }),
        expect.objectContaining({
          id: 'israel_academic_general_academic',
          name: 'לימודים אקדמיים - המכללה האקדמית רמת גן',
          category: 'לימודים אקדמיים',
          type: 'academic',
        }),
        expect.objectContaining({
          id: 'tech_management_engineering',
          name: 'הנדסה וטכנולוגיה - המכללה למינהל\\- רשת מכללות הנדסאים',
          category: 'הנדסה',
          type: 'academic',
        }),
        expect.objectContaining({
          id: 'bdo_academy_general_academic',
          name: 'לימודים אקדמיים - האקדמיה לפיננסים מבית BDO',
          category: 'לימודים אקדמיים',
          type: 'academic',
        }),
        expect.objectContaining({
          id: 'bdo_academy_certificate',
          name: 'לימודי תעודה מקצועיים - BDO Academy',
          category: 'לימודי תעודה',
          type: 'certificate',
        }),
        expect.objectContaining({
          id: 'atid_engineering',
          name: 'הנדסה וטכנולוגיה - עתיד \\- רשת מכללות טכנולוגיות',
          category: 'הנדסה',
          type: 'academic',
        }),
        expect.objectContaining({
          id: 'atid_certificate',
          name: 'לימודי תעודה מקצועיים - בית ספר "סאונד" מבית רשת מכללות עתיד',
          category: 'לימודי תעודה',
          type: 'academic',
        }),
        expect.objectContaining({
          id: 'lfa_beauty',
          name: 'מקצועות היופי - אקדמיית LFA - המחלקה ללימודי מקצועות היופי',
          category: 'מקצועות היופי',
          type: 'academic',
        }),
        expect.objectContaining({
          id: 'lfa_certificate',
          name: 'לימודי תעודה מקצועיים - אקדמיית LFA - המחלקה ללימודי מקצועות חופשיים',
          category: 'לימודי תעודה',
          type: 'academic',
        }),
        expect.objectContaining({
          id: 'mediteva_certificate',
          name: 'לימודי תעודה מקצועיים - מכללת מדיטבע',
          category: 'לימודי תעודה',
          type: 'academic',
        }),
        expect.objectContaining({
          id: 'high_q_certificate',
          name: 'לימודי תעודה מקצועיים - HIGH Q',
          category: 'לימודי תעודה',
          type: 'certificate',
        }),
        expect.objectContaining({
          id: 'kidum_certificate',
          name: 'לימודי תעודה מקצועיים - קידום \\- בגרויות',
          category: 'לימודי תעודה',
          type: 'certificate',
        }),
      ]),
    );

    expect(allPrograms.some((program) => program.id === 'mon_12341088622_general_academic')).toBe(false);
    expect(allPrograms.some((program) => program.id === 'mon_12341091743_engineering')).toBe(false);
    expect(allPrograms.some((program) => program.id === 'mon_12341122528_general_academic')).toBe(false);
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
    expect(
      ruppinEngineering?.institutionDetails?.map((detail) => detail.institutionName),
    ).toEqual(
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
      type: 'academic',
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
      expect.arrayContaining([
        `בית ספר 'ליגה" -בית הספר למאמנים ומדריכים בספורט גבעת ושינגטון`,
      ]),
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
    ).toEqual(
      expect.arrayContaining(["'אדמה'\\- בית הספר לרפואה משלימה ותרפיות בגבעת ושינגטון"]),
    );

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
    ).toEqual(
      expect.arrayContaining(['אורין-שפלטר השכלה פיננסית', 'אורין-שפלטר השכלה פיננסית.']),
    );

    const tcbEngineering = allPrograms.find((program) => program.id === 'tcb_engineering');

    expect(tcbEngineering).toMatchObject({
      id: 'tcb_engineering',
      institutionId: 'tcb',
      type: 'academic',
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
      type: 'academic',
      category: 'רפואה',
    });
    expect(tiltanMedicine?.institutionDetails?.map((detail) => detail.institutionName)).toEqual(
      expect.arrayContaining(['מכללת תילתן המכללה לרפואה משלימה']),
    );

    const tiltanGraphicDesign = allPrograms.find((program) => program.id === 'tiltan_graphic_design');

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
    expect(
      tiltanCertificate?.institutionDetails?.map((detail) => detail.institutionName),
    ).toEqual(expect.arrayContaining(['תילתן קמפוס חרדי']));

    const idanHahorutGeneralAcademic = allPrograms.find(
      (program) => program.id === 'idan_hahorut_general_academic',
    );

    expect(idanHahorutGeneralAcademic).toMatchObject({
      id: 'idan_hahorut_general_academic',
      institutionId: 'idan_hahorut',
      type: 'academic',
      category: 'לימודים אקדמיים',
    });
    expect(
      idanHahorutGeneralAcademic?.institutionDetails?.map((detail) => detail.institutionName),
    ).toEqual(
      expect.arrayContaining([
        'מכללת עידן ההורות',
        'סאבטקסט\\- המכללה ללימודי שפת גוף מבית מכללת עידן ההורות',
      ]),
    );

    const meditevaCertificate = allPrograms.find((program) => program.id === 'mediteva_certificate');

    expect(meditevaCertificate).toMatchObject({
      id: 'mediteva_certificate',
      institutionId: 'mediteva',
      type: 'academic',
      category: 'לימודי תעודה',
    });
    expect(meditevaCertificate?.institutionDetails?.map((detail) => detail.institutionName)).toEqual(
      expect.arrayContaining(['מכללת מדיטבע']),
    );

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
      'mon_12341147475_cs',
    ]);
  });

  it('gives every Monday evidence record at least one institution-backed generated programme', () => {
    const institutionIds = new Set(INSTITUTIONS.map((institution) => institution.id));

    const uncoveredRecords = mondayAdmissionsEvidence
      .map((record) => {
        const institutionId = record.catalogueInstitutionId ?? `mon_${record.itemId}`;
        const matchingPrograms = allPrograms.filter((program) => program.institutionId === institutionId);

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
});
