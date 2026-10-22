import { getStaticCataloguePrograms } from './catalogueStatic';
import { describe, expect, it } from 'vitest';
import {
  catalogueAdmissionRequirements,
  catalogueDescription,
  catalogueInstitutionDetail,
} from './catalogueDisplayText';

describe('catalogue display text', () => {
  it('does not present ingestion diagnostics as programme descriptions', () => {
    expect(
      catalogueDescription(
        'Evidence points to manual admissions gates rather than a numeric formula.',
      ),
    ).toBeUndefined();
    expect(
      catalogueDescription('No decisive admissions evidence was derived automatically.'),
    ).toBeUndefined();
    expect(catalogueDescription('לימודי פסיכולוגיה לתואר ראשון')).toBe(
      'לימודי פסיכולוגיה לתואר ראשון',
    );
  });

  it('keeps admission information in Hebrew without turning example selection stages into specific requirements', () => {
    expect(
      catalogueAdmissionRequirements([
        'Admission depends on manual review such as interview, portfolio, exam, or committee.',
      ]),
    ).toEqual(['הקבלה כוללת מיון נוסף, כמו ריאיון, תיק עבודות, מבחן או ועדת קבלה.']);
    expect(
      catalogueAdmissionRequirements([
        'Evidence says there is no formal Bagrut/psychometric gate, but manual fit checks may remain.',
      ]),
    ).toEqual(['אין דרישה לבגרות או לפסיכומטרי. ייתכנו שלבי מיון נוספים.']);
  });

  it('preserves real requirements, including English qualifications and thresholds, without mutating source data', () => {
    const notes = ['IELTS 6.5', 'מתמטיקה 5 יחידות בציון 80'];
    expect(catalogueAdmissionRequirements(notes)).toEqual(notes);
    expect(notes).toEqual(['IELTS 6.5', 'מתמטיקה 5 יחידות בציון 80']);
  });

  it('uses available requirements when diagnostics contain no admission information', () => {
    const notes = ['No decisive admissions evidence was derived automatically.'];
    expect(catalogueAdmissionRequirements(notes, ['פסיכומטרי 650'])).toEqual(['פסיכומטרי 650']);
    expect(catalogueAdmissionRequirements(notes)).toEqual([
      'לפרטים על תנאי הקבלה, יש לבדוק באתר המוסד.',
    ]);
  });
});

it('uses current requirements for the same programme and institution instead of a legacy alias', () => {
  const programs = getStaticCataloguePrograms();
  const canonical = programs.find((program) => program.id === 'economics')!;
  const legacy = programs.find((program) => program.id === 'bgu_economics')!;
  const detail = {
    ...legacy.institutionDetails![0],
    institutionName: legacy.institution,
    specificAdmissionNotes: ['סכם כמותי 620 לפחות'],
    programUrl: 'https://www.bgu.ac.il/welcome/ba/catalog/categories/economics/',
  };
  const current = { ...canonical, institutionDetails: [detail] };
  expect(catalogueInstitutionDetail([current, legacy], legacy, 'economics')).toEqual(detail);
  expect(
    catalogueInstitutionDetail([{ ...current, institutionDetails: [] }], legacy, 'economics'),
  ).toEqual(legacy.institutionDetails?.find((row) => row.institutionName === legacy.institution));
  expect(legacy.institutionDetails?.[0].specificAdmissionNotes).not.toEqual(
    detail.specificAdmissionNotes,
  );
});
