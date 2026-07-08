import { describe, expect, it } from 'vitest';

import {
  getMondayAdmissionEvidenceByCatalogueInstitutionId,
  getMondayAdmissionEvidenceByItemId,
  getMondayOfficialVerificationQueue,
  getTrackedMissingAdmissionRules,
  mondayAdmissionsEvidence,
} from './mondayEvidence';

describe('monday admissions evidence', () => {
  it('contains one clean derived record for every exported Monday item', () => {
    expect(mondayAdmissionsEvidence).toHaveLength(212);
  });

  it('does not commit raw Monday update bodies into the generated dataset', () => {
    const serialized = JSON.stringify(mondayAdmissionsEvidence);

    expect(serialized).not.toContain('textBody');
    expect(serialized).not.toContain('Reverse Engineering Summary');
    expect(serialized).not.toContain('<br');
  });

  it('maps known catalogue institutions while preserving all Monday evidence', () => {
    expect(getMondayAdmissionEvidenceByCatalogueInstitutionId('tau')).toEqual([
      expect.objectContaining({
        itemId: '12220699649',
        catalogueVisibility: 'catalogue_mapped',
        publicBucket: 'decision_capable',
        officialVerificationStatus: 'monday_evidence_decision_rule_available',
      }),
    ]);

    expect(getMondayAdmissionEvidenceByCatalogueInstitutionId('hit')).toEqual([
      expect.objectContaining({
        catalogueInstitutionId: 'hit',
        catalogueVisibility: 'catalogue_mapped',
        publicBucket: 'decision_capable',
      }),
    ]);

    expect(getMondayAdmissionEvidenceByCatalogueInstitutionId('sapir')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: '12220697668',
          catalogueInstitutionId: 'sapir',
          displayName: 'המכללה האקדמית ספיר',
          catalogueVisibility: 'catalogue_mapped',
        }),
        expect.objectContaining({
          itemId: '12341141954',
          catalogueInstitutionId: 'sapir',
          displayName: 'המרכז ללימודי חוץ והמשך ספיר',
          catalogueVisibility: 'catalogue_mapped',
        }),
      ]),
    );
  });

  it('infers direct catalogue institution matches from existing institution names before leaving records as evidence-only', () => {
    expect(getMondayAdmissionEvidenceByItemId('12220697671')).toMatchObject({
      catalogueInstitutionId: 'emek_yezreel',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'המכללה האקדמית עמק יזרעאל',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341102212')).toMatchObject({
      catalogueInstitutionId: 'schechter',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'מכון שכטר למדעי היהדות',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341081785')).toMatchObject({
      catalogueInstitutionId: 'achva',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'המכללה האקדמית אחוה',
    });
  });

  it('backfills official URL candidates for catalogue-mapped rows from institution metadata when Monday evidence omits them', () => {
    const davidYellin = getMondayAdmissionEvidenceByItemId('12341126387');

    expect(davidYellin).toMatchObject({
      catalogueInstitutionId: 'david_yellin',
      catalogueVisibility: 'catalogue_mapped',
    });
    expect(davidYellin?.officialUrls).toContain('https://dyellin.ac.il');

    const mappedRowsMissingOfficialUrl = mondayAdmissionsEvidence
      .filter((record) => record.catalogueVisibility === 'catalogue_mapped')
      .map((record) => ({
        itemId: record.itemId,
        displayName: record.displayName,
        officialUrls: record.officialUrls,
      }))
      .filter((record) => record.officialUrls.length === 0);

    expect(mappedRowsMissingOfficialUrl).toEqual([]);
  });

  it('maps safe known institution aliases from Monday naming variants to stable catalogue ids', () => {
    expect(getMondayAdmissionEvidenceByItemId('12220708940')).toMatchObject({
      catalogueInstitutionId: 'sce',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'המכללה האקדמית סמי שמעון SCE',
    });

    expect(getMondayAdmissionEvidenceByItemId('12220708941')).toMatchObject({
      catalogueInstitutionId: 'azrieli',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'עזריאלי - מכללה אקדמית להנדסה',
    });

    expect(getMondayAdmissionEvidenceByItemId('12220708942')).toMatchObject({
      catalogueInstitutionId: 'braude',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'המכללה האקדמית להנדסה בראודה',
    });

    expect(getMondayAdmissionEvidenceByItemId('12220685569')).toMatchObject({
      catalogueInstitutionId: 'hadassah',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'המכללה האקדמית הדסה ירושלים',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341185928')).toMatchObject({
      catalogueInstitutionId: 'oranim',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'אורנים המכללה האקדמית לחינוך',
    });

    expect(getMondayAdmissionEvidenceByItemId('12220687656')).toMatchObject({
      catalogueInstitutionId: 'wizo',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'המרכז האקדמי ויצו חיפה',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341126387')).toMatchObject({
      catalogueInstitutionId: 'david_yellin',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'המכללה האקדמית לחינוך ע"ש דוד ילין',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341126565')).toMatchObject({
      catalogueInstitutionId: 'ramat_gan',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'המרכז האקדמי למשפט ולעסקים',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341128726')).toMatchObject({
      catalogueInstitutionId: 'herzog',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'המכללה האקדמית הרצוג',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341117410')).toMatchObject({
      catalogueInstitutionId: 'kaye',
      catalogueVisibility: 'catalogue_mapped',
      displayName: "המכללה האקדמית לחינוך ע''ש קיי בבאר שבע",
    });

    expect(getMondayAdmissionEvidenceByItemId('12341137571')).toMatchObject({
      catalogueInstitutionId: 'beit_berl',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'המכללה האקדמית בית ברל',
    });

    expect(getMondayAdmissionEvidenceByItemId('12220696298')).toMatchObject({
      catalogueInstitutionId: 'beit_berl',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'המדרשה לאמנות (בית ברל)',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341113399')).toMatchObject({
      catalogueInstitutionId: 'open_university',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'חשיפה \\- האוניברסיטה הפתוחה',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341102997')).toMatchObject({
      catalogueInstitutionId: 'shaare_mishpat',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'המרכז האקדמי שערי מדע ומשפט',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341108864')).toMatchObject({
      catalogueInstitutionId: 'telhai',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'המכינה הקדם אקדמית בתל חי',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341114234')).toMatchObject({
      catalogueInstitutionId: 'sce',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'המכינה הקדם אקדמית סמי שמעון',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341101391')).toMatchObject({
      catalogueInstitutionId: 'kinneret',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'המכללה הטכנולוגית כנרת',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341098142')).toMatchObject({
      catalogueInstitutionId: 'telhai',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'המכללה הטכנולוגית להנדסאים תל חי',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341141954')).toMatchObject({
      catalogueInstitutionId: 'sapir',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'המרכז ללימודי חוץ והמשך ספיר',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341118864')).toMatchObject({
      catalogueInstitutionId: 'ruppin',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'המכללה הטכנולוגית רופין\\- מבית רשת מכללות עתיד',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341168193')).toMatchObject({
      catalogueInstitutionId: 'ruppin',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'המכללה הטכנולוגית רופין\\- לימודי חוץ והכשרה טכנולוגית',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341148655')).toMatchObject({
      catalogueInstitutionId: 'open_university',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'תפנית',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341155971')).toMatchObject({
      catalogueInstitutionId: 'open_university',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'דיאלוג',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341161220')).toMatchObject({
      catalogueInstitutionId: 'givat_washington',
      catalogueVisibility: 'catalogue_mapped',
      displayName: `בית ספר 'ליגה" -בית הספר למאמנים ומדריכים בספורט גבעת ושינגטון`,
    });

    expect(getMondayAdmissionEvidenceByItemId('12341088658')).toMatchObject({
      catalogueInstitutionId: 'open_university',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'מירב',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341114530')).toMatchObject({
      catalogueInstitutionId: 'open_university',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'דיפלומה \\- ביה"ס ללימודי תעודה והסמכה',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341128804')).toMatchObject({
      catalogueInstitutionId: 'givat_washington',
      catalogueVisibility: 'catalogue_mapped',
      displayName: "'אדמה'\\- בית הספר לרפואה משלימה ותרפיות בגבעת ושינגטון",
    });

    expect(getMondayAdmissionEvidenceByItemId('12341088622')).toMatchObject({
      catalogueInstitutionId: 'israel_academic',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'המכללה האקדמית רמת גן',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341091743')).toMatchObject({
      catalogueInstitutionId: 'tech_management',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'המכללה למינהל\\- רשת מכללות הנדסאים',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341122528')).toMatchObject({
      catalogueInstitutionId: 'bdo_academy',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'האקדמיה לפיננסים מבית BDO',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341173326')).toMatchObject({
      catalogueInstitutionId: 'bdo_academy',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'BDO Academy',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341142920')).toMatchObject({
      catalogueInstitutionId: 'orin_shpalter',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'אורין-שפלטר השכלה פיננסית',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341147227')).toMatchObject({
      catalogueInstitutionId: 'orin_shpalter',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'אורין-שפלטר השכלה פיננסית.',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341107895')).toMatchObject({
      catalogueInstitutionId: 'tcb',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'המכללה הטכנולוגית באר שבע המרכז להשתלמויות',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341137886')).toMatchObject({
      catalogueInstitutionId: 'tcb',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'המכללה הטכנולוגית באר שבע \\- הנדסאים',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341098712')).toMatchObject({
      catalogueInstitutionId: 'atid',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'עתיד \\- רשת מכללות טכנולוגיות',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341148006')).toMatchObject({
      catalogueInstitutionId: 'atid',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'בית ספר "סאונד" מבית רשת מכללות עתיד',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341167578')).toMatchObject({
      catalogueInstitutionId: 'aliya',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'מכון עליה',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341108962')).toMatchObject({
      catalogueInstitutionId: 'aliya',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'מכון עליה למגזר הערבי',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341137918')).toMatchObject({
      catalogueInstitutionId: 'tiltan',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'מכללת תילתן המכללה לרפואה משלימה',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341149221')).toMatchObject({
      catalogueInstitutionId: 'tiltan',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'תילתן המכללה לעיצוב ולתקשורת חזותית',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341161868')).toMatchObject({
      catalogueInstitutionId: 'tiltan',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'תילתן קמפוס חרדי',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341092393')).toMatchObject({
      catalogueInstitutionId: 'lfa',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'אקדמיית LFA - המחלקה ללימודי מקצועות היופי',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341167376')).toMatchObject({
      catalogueInstitutionId: 'lfa',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'אקדמיית LFA - המחלקה ללימודי מקצועות חופשיים',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341203750')).toMatchObject({
      catalogueInstitutionId: 'idan_hahorut',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'מכללת עידן ההורות',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341165560')).toMatchObject({
      catalogueInstitutionId: 'idan_hahorut',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'סאבטקסט\\- המכללה ללימודי שפת גוף מבית מכללת עידן ההורות',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341189545')).toMatchObject({
      catalogueInstitutionId: 'mediteva',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'מכללת מדיטבע',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341179578')).toMatchObject({
      catalogueInstitutionId: 'high_q',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'HIGH Q',
    });

    expect(getMondayAdmissionEvidenceByItemId('12341161996')).toMatchObject({
      catalogueInstitutionId: 'kidum',
      catalogueVisibility: 'catalogue_mapped',
      displayName: 'קידום \\- בגרויות',
    });
  });

  it('keeps only genuinely incomplete institutions in the tracked missing-rule queue once stale mappings are repaired', () => {
    const technion = getMondayAdmissionEvidenceByItemId('12220699650');
    const bgu = getMondayAdmissionEvidenceByItemId('12220699687');

    expect(technion).toMatchObject({
      catalogueInstitutionId: 'technion',
      catalogueVisibility: 'catalogue_mapped',
      publicBucket: 'decision_capable',
      ruleStatus: 'decision_rule_available',
      officialVerificationStatus: 'partial_official_rule_verified',
      missingData: [],
    });
    expect(technion?.limitations).toEqual(
      expect.arrayContaining([
        expect.stringContaining('הנדסת נתונים ומידע'),
        expect.stringContaining('מדעי הנתונים וההחלטות'),
      ]),
    );
    expect(technion?.verifiedProgramThresholds).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          programId: 'technion_datascience',
          threshold: 91,
          sourceUrl: expect.stringContaining('admissions.technion.ac.il'),
        }),
        expect.objectContaining({
          programId: 'technion_cs',
          threshold: 91,
          sourceUrl: expect.stringContaining('admissions.technion.ac.il'),
        }),
        expect.objectContaining({
          programId: 'technion_medicine',
          threshold: 92,
          thresholdKind: 'invitation_to_manual_gate',
        }),
      ]),
    );

    expect(getTrackedMissingAdmissionRules()).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: '12220699687',
        }),
      ]),
    );
    expect(getTrackedMissingAdmissionRules()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: '12220680983',
          missingData: ['automation_or_alternate_official_source'],
        }),
      ]),
    );

    expect(bgu).toMatchObject({
      catalogueInstitutionId: 'bgu',
      catalogueVisibility: 'catalogue_mapped',
      publicBucket: 'decision_capable',
      ruleStatus: 'decision_rule_available',
      officialVerificationStatus: 'partial_official_rule_verified',
      missingData: [],
    });
    expect(bgu?.officialUrls).toContain(
      'https://www.bgu.ac.il/welcome/ba/catalog/categories/medical-school/?tab=2944',
    );
    expect(bgu?.verifiedProgramThresholds).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          programId: 'bgu_cs',
          threshold: 720,
          sourceUrl: expect.stringContaining('p_spe1=3'),
        }),
        expect.objectContaining({
          programId: 'bgu_datascience',
          threshold: 720,
          sourceUrl: expect.stringContaining('p_spe1=13'),
        }),
        expect.objectContaining({
          programId: 'bgu_ee',
          threshold: 547,
          sourceUrl: expect.stringContaining('p_dep1=361'),
        }),
        expect.objectContaining({
          programId: 'bgu_me',
          threshold: 520,
          sourceUrl: expect.stringContaining('p_dep1=362'),
        }),
        expect.objectContaining({
          programId: 'bgu_industrial',
          threshold: 505,
          sourceUrl: expect.stringContaining('p_dep1=364'),
        }),
        expect.objectContaining({
          programId: 'bgu_psychology',
          threshold: 650,
          sourceUrl: expect.stringContaining('p_dep1=101'),
        }),
        expect.objectContaining({
          programId: 'bgu_nursing',
          threshold: 520,
          thresholdKind: 'invitation_to_manual_gate',
          scoreKind: 'psychometric',
          sourceUrl: expect.stringContaining('p_dep1=472'),
        }),
        expect.objectContaining({
          programId: 'bgu_medicine',
          threshold: 735,
          thresholdKind: 'invitation_to_manual_gate',
          scoreKind: 'sekhem',
          sourceUrl: expect.stringContaining('p_dep1=471'),
        }),
      ]),
    );
  });

  it('classifies no-formal-grade evidence separately from missing rules', () => {
    expect(mondayAdmissionsEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemName: '32. אסטלה - קונדיטוריה',
          publicBucket: 'eligible_no_formal_grade_gate',
          ruleStatus: 'manual_or_eligibility_rule_available',
          officialVerificationStatus: 'monday_evidence_manual_or_eligibility_rule_available',
          missingData: [],
        }),
      ]),
    );
  });

  it('promotes Colman to eligible_with_manual_gate once official programme pages confirm automatic and fallback routes', () => {
    const colman = getMondayAdmissionEvidenceByItemId('12230979966');

    expect(colman).toMatchObject({
      catalogueInstitutionId: 'colman',
      catalogueVisibility: 'catalogue_mapped',
      publicBucket: 'eligible_with_manual_gate',
      ruleStatus: 'manual_or_eligibility_rule_available',
      officialVerificationStatus: 'partial_official_rule_verified',
      missingData: [],
      noPsychometricNeeded: true,
    });
    expect(colman?.officialUrls).toEqual(
      expect.arrayContaining([
        'https://www.colman.ac.il/academics/ba/business-administration/',
        'https://www.colman.ac.il/academics/ba/economy/',
        'https://www.colman.ac.il/academics/ba/accounting/',
        'https://www.colman.ac.il/academics/ba/law/',
        'https://www.colman.ac.il/academics/ba/computer-science/',
        'https://www.colman.ac.il/academics/ba/management-information-systems/',
      ]),
    );
  });

  it('promotes Ono to eligible_with_manual_gate once current official programme pages are verified and stale exact matches are removed', () => {
    const ono = getMondayAdmissionEvidenceByItemId('12220680982');

    expect(ono).toMatchObject({
      catalogueInstitutionId: 'ono',
      catalogueVisibility: 'catalogue_mapped',
      publicBucket: 'eligible_with_manual_gate',
      ruleStatus: 'manual_or_eligibility_rule_available',
      officialVerificationStatus: 'partial_official_rule_verified',
      missingData: [],
    });
    expect(ono?.officialUrls).toEqual(
      expect.arrayContaining([
        'https://www.ono.ac.il/curriculum/llb/',
        'https://www.ono.ac.il/curriculum/computer-science-bsc/',
        'https://www.ono.ac.il/curriculum/nursing/',
        'https://www.ono.ac.il/curriculum/finance-and-capital-markets-ba/',
      ]),
    );
  });

  it('promotes Braude to eligible_with_manual_gate once the official admissions page confirms department thresholds and alternate no-psychometric routes', () => {
    const braude = getMondayAdmissionEvidenceByItemId('12220708942');

    expect(braude).toMatchObject({
      catalogueInstitutionId: 'braude',
      catalogueVisibility: 'catalogue_mapped',
      publicBucket: 'eligible_with_manual_gate',
      ruleStatus: 'manual_or_eligibility_rule_available',
      officialVerificationStatus: 'partial_official_rule_verified',
      missingData: [],
      noPsychometricNeeded: true,
    });
    expect(braude?.officialUrls).toEqual(
      expect.arrayContaining([
        'https://w3.braude.ac.il/intrested/',
        'https://w3.braude.ac.il/department/mechina/?yeudit#section-id-2',
      ]),
    );
  });

  it('promotes Sapir to eligible_with_manual_gate once the official law page confirms direct and assessment-based routes', () => {
    const sapir = getMondayAdmissionEvidenceByItemId('12220697668');

    expect(sapir).toMatchObject({
      catalogueInstitutionId: 'sapir',
      catalogueVisibility: 'catalogue_mapped',
      publicBucket: 'eligible_with_manual_gate',
      ruleStatus: 'manual_or_eligibility_rule_available',
      officialVerificationStatus: 'partial_official_rule_verified',
      missingData: [],
      noPsychometricNeeded: true,
    });
    expect(sapir?.officialUrls).toEqual(
      expect.arrayContaining([
        'https://www.sapir.ac.il/ba/law#collapse-accordion-798-3',
        'https://www.sapir.ac.il/pre-academic',
      ]),
    );
  });

  it('promotes Netanya to eligible_with_manual_gate once current official programme pages confirm direct and fallback routes', () => {
    const netanya = getMondayAdmissionEvidenceByItemId('12341101519');

    expect(netanya).toMatchObject({
      catalogueInstitutionId: 'netanya',
      catalogueVisibility: 'catalogue_mapped',
      publicBucket: 'eligible_with_manual_gate',
      ruleStatus: 'manual_or_eligibility_rule_available',
      officialVerificationStatus: 'partial_official_rule_verified',
      missingData: [],
      noPsychometricNeeded: true,
    });
    expect(netanya?.officialUrls).toEqual(
      expect.arrayContaining([
        'https://www.netanya.ac.il/degree/ba-in-business-administration/',
        'https://www.netanya.ac.il/degree/ba-in-business-administration-and-communication/',
        'https://www.netanya.ac.il/degree/llb-in-law-studies/',
      ]),
    );
  });

  it('promotes Zefat to eligible_with_manual_gate once current official admissions pages confirm direct and mixed routes', () => {
    const zefat = getMondayAdmissionEvidenceByItemId('12341107297');

    expect(zefat).toMatchObject({
      catalogueInstitutionId: 'zefat',
      catalogueVisibility: 'catalogue_mapped',
      publicBucket: 'eligible_with_manual_gate',
      ruleStatus: 'manual_or_eligibility_rule_available',
      officialVerificationStatus: 'partial_official_rule_verified',
      missingData: [],
    });
    expect(zefat?.officialUrls).toEqual(
      expect.arrayContaining([
        'https://calc.zefat.ac.il/',
        'https://www.zefat.ac.il/%D7%93%D7%A4%D7%99-%D7%AA%D7%95%D7%9B%D7%9F-%D7%9B%D7%9C%D7%9C%D7%99%D7%99%D7%9D/%D7%AA%D7%A0%D7%90%D7%99-%D7%A7%D7%91%D7%9C%D7%94/%D7%AA%D7%A0%D7%90%D7%99-%D7%A1%D7%A3-%D7%9C%D7%94%D7%92%D7%A9%D7%AA-%D7%9E%D7%95%D7%A2%D7%9E%D7%93%D7%95%D7%AA-%D7%9C%D7%AA%D7%95%D7%90%D7%A8-%D7%A8%D7%90%D7%A9%D7%95%D7%9F-%D7%91%D7%91%D7%99%D7%AA-%D7%94%D7%A1%D7%A4%D7%A8-%D7%9C%D7%9E%D7%A9%D7%A4%D7%98%D7%99%D7%9D/',
        'https://www.zefat.ac.il/%D7%93%D7%A4%D7%99-%D7%AA%D7%95%D7%9B%D7%9F-%D7%9B%D7%9C%D7%9C%D7%99%D7%99%D7%9D/%D7%AA%D7%A0%D7%90%D7%99-%D7%A7%D7%91%D7%9C%D7%94/%D7%AA%D7%A0%D7%90%D7%99-%D7%94%D7%A7%D7%91%D7%9C%D7%94-%D7%9C%D7%AA%D7%95%D7%90%D7%A8-%D7%A8%D7%90%D7%A9%D7%95%D7%9F-%D7%91%D7%97%D7%95%D7%92-%D7%9C%D7%9E%D7%A2%D7%A8%D7%9B%D7%95%D7%AA-%D7%9E%D7%99%D7%93%D7%A2-%D7%A0%D7%99%D7%94%D7%95%D7%9C%D7%99%D7%95%D7%AA/',
        'https://www.zefat.ac.il/%D7%93%D7%A4%D7%99-%D7%AA%D7%95%D7%9B%D7%9F-%D7%9B%D7%9C%D7%9C%D7%99%D7%99%D7%9D/%D7%AA%D7%A0%D7%90%D7%99-%D7%A7%D7%91%D7%9C%D7%94/%D7%AA%D7%A0%D7%90%D7%99-%D7%94%D7%A7%D7%91%D7%9C%D7%94-%D7%9C%D7%AA%D7%95%D7%90%D7%A8-%D7%A8%D7%90%D7%A9%D7%95%D7%9F-%D7%91%D7%91%D7%99%D7%AA-%D7%94%D7%A1%D7%A4%D7%A8-%D7%9C%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%A1%D7%95%D7%A6%D7%99%D7%90%D7%9C%D7%99%D7%AA/',
      ]),
    );
  });

  it('promotes Peres to eligible_with_manual_gate once current official programme pages confirm direct and competitive routes', () => {
    const peres = getMondayAdmissionEvidenceByItemId('12341108662');

    expect(peres).toMatchObject({
      catalogueInstitutionId: 'peres',
      catalogueVisibility: 'catalogue_mapped',
      publicBucket: 'eligible_with_manual_gate',
      ruleStatus: 'manual_or_eligibility_rule_available',
      officialVerificationStatus: 'partial_official_rule_verified',
      missingData: [],
    });
    expect(peres?.officialUrls).toEqual(
      expect.arrayContaining([
        'https://www.pac.ac.il/degree/ba-business/',
        'https://www.pac.ac.il/degree/l-l-b-law/',
      ]),
    );
  });

  it('promotes Bar-Ilan to eligible_with_manual_gate once current official admissions, no-psychometry, and preparatory pages confirm multiple application routes', () => {
    const biu = getMondayAdmissionEvidenceByItemId('12220699688');

    expect(biu).toMatchObject({
      catalogueInstitutionId: 'biu',
      catalogueVisibility: 'catalogue_mapped',
      publicBucket: 'eligible_with_manual_gate',
      ruleStatus: 'manual_or_eligibility_rule_available',
      officialVerificationStatus: 'partial_official_rule_verified',
      missingData: [],
    });
    expect(biu?.officialUrls).toEqual(
      expect.arrayContaining([
        'https://www.biu.ac.il/registration-and-admission/information/general-admission-req',
        'https://www.biu.ac.il/registration-and-admission/information/acceptance-no-psychometry',
        'https://mechina-kda.biu.ac.il/prepares-30',
      ]),
    );
  });

  it('promotes Ruppin to eligible_with_manual_gate once current official preparatory-programme pages confirm alternate admissions and prep routes', () => {
    const ruppin = getMondayAdmissionEvidenceByItemId('12220708946');

    expect(ruppin).toMatchObject({
      catalogueInstitutionId: 'ruppin',
      catalogueVisibility: 'catalogue_mapped',
      publicBucket: 'eligible_with_manual_gate',
      ruleStatus: 'manual_or_eligibility_rule_available',
      officialVerificationStatus: 'partial_official_rule_verified',
      missingData: [],
    });
    expect(ruppin?.officialUrls).toEqual(
      expect.arrayContaining([
        'https://www.ruppin.ac.il/faculties/preparatory-programs/',
        'https://www.ruppin.ac.il/faculties/preparatory-programs/semesterly-academy-preparation/',
        'https://www.ruppin.ac.il/registration/',
      ]),
    );
  });

  it('promotes Tel-Hai to eligible_with_manual_gate once current official programme and preparatory pages confirm direct and alternate admissions routes', () => {
    const telhai = getMondayAdmissionEvidenceByItemId('12220697669');

    expect(telhai).toMatchObject({
      catalogueInstitutionId: 'telhai',
      catalogueVisibility: 'catalogue_mapped',
      publicBucket: 'eligible_with_manual_gate',
      ruleStatus: 'manual_or_eligibility_rule_available',
      officialVerificationStatus: 'partial_official_rule_verified',
      missingData: [],
    });
    expect(telhai?.officialUrls).toEqual(
      expect.arrayContaining([
        'https://www.telhai.ac.il/BSc_%D7%9E%D7%93%D7%A2%D7%99_%D7%94%D7%9E%D7%97%D7%A9%D7%91',
        'https://www.telhai.ac.il/BA_%D7%A2%D7%91%D7%95%D7%93%D7%94_%D7%A1%D7%95%D7%A6%D7%99%D7%90%D7%9C%D7%99%D7%AA',
        'https://www.telhai.ac.il/%D7%9E%D7%90%D7%9E%D7%A8%D7%99%D7%9D/%D7%9C%D7%99%D7%9E%D7%95%D7%93%D7%99%D7%9D-%D7%9C%D7%9C%D7%90-%D7%A4%D7%A1%D7%99%D7%9B%D7%95%D7%9E%D7%98%D7%A8%D7%99',
        'https://www.telhai.ac.il/%D7%9E%D7%9B%D7%99%D7%A0%D7%95%D7%AA_%D7%94%D7%A7%D7%99%D7%A5_%D7%94%D7%99%D7%97%D7%95%D7%93%D7%99%D7%95%D7%AA_%D7%A9%D7%9C_%D7%97%D7%9E%D7%9E%D7%94',
      ]),
    );
  });

  it('promotes the non-Ariel U6 cohort into structured official eligibility coverage and leaves only Ariel in the structured queue', () => {
    const promotedItemIds = [
      '12341102997',
      '12341091743',
      '12341107541',
      '12341143342',
      '12341114234',
      '12341128848',
      '12341118864',
      '12341101391',
      '12341098142',
      '12341088622',
    ];

    for (const itemId of promotedItemIds) {
      const record = getMondayAdmissionEvidenceByItemId(itemId);

      expect(record).toMatchObject({
        publicBucket: 'eligible_with_manual_gate',
        ruleStatus: 'manual_or_eligibility_rule_available',
        officialVerificationStatus: 'partial_official_rule_verified',
        missingData: [],
      });
      expect(
        (record?.structuredAdmissionFacts?.length ?? 0) +
          (record?.structuredAlternativePaths?.length ?? 0),
      ).toBeGreaterThan(0);
    }

    expect(getMondayAdmissionEvidenceByItemId('12341102997')?.officialUrls).toEqual([
      'https://mishpat.ac.il/',
    ]);
    expect(getMondayAdmissionEvidenceByItemId('12341091743')?.officialUrls).toEqual([
      'https://college.org.il/',
    ]);
    expect(getMondayAdmissionEvidenceByItemId('12341107541')?.officialUrls).toEqual([
      'https://handasaim.ort.org.il/',
    ]);
    expect(getMondayAdmissionEvidenceByItemId('12341143342')?.officialUrls).toEqual(
      expect.arrayContaining([
        'https://www.sce.ac.il/candidates/branch/admission_conditions_and_tuition_fees',
        'https://www.sce.ac.il/filestock/file/1752993606151-0.pdf',
        'https://www.sce.ac.il/academic-units1/beersheva/basic-sciences/computer-science/',
      ]),
    );
    expect(getMondayAdmissionEvidenceByItemId('12341114234')?.officialUrls).toEqual([
      'https://www.sce.ac.il/admissions/pre_academic/',
    ]);
    expect(getMondayAdmissionEvidenceByItemId('12341118864')?.officialUrls).toEqual([
      'https://ruppin-tech.co.il/',
    ]);
    expect(getMondayAdmissionEvidenceByItemId('12341101391')?.officialUrls).toEqual([
      'http://ktec.co.il/',
    ]);
    expect(getMondayAdmissionEvidenceByItemId('12341098142')?.officialUrls).toEqual([
      'https://www.telhai-handesaim.org.il/',
    ]);
    expect(getMondayAdmissionEvidenceByItemId('12341088622')?.officialUrls).toEqual([
      'https://www.iac.ac.il/',
    ]);

    expect(getTrackedMissingAdmissionRules()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ itemId: '12220680983' }),
        expect.objectContaining({ itemId: '12341114114' }),
      ]),
    );

    for (const itemId of promotedItemIds) {
      expect(getTrackedMissingAdmissionRules()).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ itemId })]),
      );
    }
  });

  it('keeps only the official sources that remain genuinely challenge-blocked in the blocker queue', () => {
    const ariel = getMondayAdmissionEvidenceByItemId('12220680983');
    const sce = getMondayAdmissionEvidenceByItemId('12220708940');

    expect(ariel).toMatchObject({
      catalogueInstitutionId: 'ariel',
      catalogueVisibility: 'catalogue_mapped',
      publicBucket: 'tracked_missing_rule',
      ruleStatus: 'blocked_official_source',
      officialVerificationStatus: 'blocked_needs_alternate_official_source',
      missingData: ['automation_or_alternate_official_source'],
    });
    expect(ariel?.officialUrls).toEqual(
      expect.arrayContaining([
        'https://pniot.ariel.ac.il/projects/tzmm/NewCalcMark/',
        'https://www.ariel.ac.il/wp/%D7%9E%D7%97%D7%A9%D7%91%D7%95%D7%9F-%D7%A0%D7%AA%D7%95%D7%A0%D7%99-%D7%A7%D7%91%D7%9C%D7%94/',
      ]),
    );

    expect(sce).toMatchObject({
      catalogueInstitutionId: 'sce',
      catalogueVisibility: 'catalogue_mapped',
      publicBucket: 'eligible_with_manual_gate',
      ruleStatus: 'manual_or_eligibility_rule_available',
      officialVerificationStatus: 'partial_official_rule_verified',
      missingData: [],
    });
    expect(sce?.officialUrls).toEqual(
      expect.arrayContaining([
        'https://www.sce.ac.il/filestock/file/1752993606151-0.pdf',
        'https://www.sce.ac.il/academic-units1/beersheva/basic-sciences/computer-science/',
      ]),
    );
  });

  it('exposes an official verification queue for extraction work', () => {
    expect(getMondayOfficialVerificationQueue()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: '12220680983',
          officialVerificationStatus: 'blocked_needs_alternate_official_source',
        }),
      ]),
    );

    expect(getMondayOfficialVerificationQueue()).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: '12220699688',
        }),
      ]),
    );

    expect(getMondayOfficialVerificationQueue()).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: '12220699650',
        }),
        expect.objectContaining({
          itemId: '12220708940',
        }),
        expect.objectContaining({
          itemId: '12220708946',
        }),
        expect.objectContaining({
          itemId: '12220697669',
        }),
      ]),
    );

    expect(getMondayOfficialVerificationQueue()).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: '12220680982',
        }),
      ]),
    );

    expect(getMondayOfficialVerificationQueue()).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: '12230979966',
        }),
      ]),
    );

    expect(getMondayOfficialVerificationQueue()).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: '12220708942',
        }),
      ]),
    );

    expect(getMondayOfficialVerificationQueue()).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: '12220697668',
        }),
      ]),
    );

    expect(getMondayOfficialVerificationQueue()).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemName: '32. אסטלה - קונדיטוריה',
        }),
      ]),
    );
  });
});
