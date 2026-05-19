import type { GeographicRegion, UniversityId } from '@/types';

// ── Institution ID union ──────────────────────────────────────────────────────
// Canonical slug for every academic/vocational institution in the platform.
// When adding a new institution: append here + add a record to INSTITUTIONS.

export type InstitutionId =
  // ── Four research universities (sekhem formula) ────────────────────────────
  | 'tau' | 'huji' | 'technion' | 'bgu'
  // ── Research universities (no sekhem formula) ──────────────────────────────
  | 'haifa' | 'biu' | 'ariel'
  // ── Private universities & regional colleges ───────────────────────────────
  | 'reichman' | 'ruppin' | 'kinneret' | 'telhai' | 'pardeshana'
  | 'afeka' | 'mta' | 'colman' | 'ono' | 'ono_ce'
  // ── Design & arts schools ──────────────────────────────────────────────────
  | 'bezalel' | 'shenkar' | 'hit' | 'minshar' | 'spieldocs'
  // ── Integrative medicine colleges ─────────────────────────────────────────
  | 'reidman' | 'broshim'
  // ── Culinary schools ──────────────────────────────────────────────────────
  | 'danon' | 'bishulim'
  // ── Tech bootcamps ────────────────────────────────────────────────────────
  | 'hackeru' | 'elevation' | 'itc' | 'johnbryce';

// ── Record shape ──────────────────────────────────────────────────────────────

export interface InstitutionRecord {
  /** Canonical machine-readable slug */
  id: InstitutionId;
  /**
   * Hebrew official name — must match `Program.institution` verbatim so that
   * INSTITUTION_BY_NAME lookups succeed at runtime.
   */
  name: string;
  /** Permanent Wikimedia SVG URL (preferred over favicon proxy) */
  logoUrl?: string;
  /** Root domain used for the Google favicon proxy fallback */
  domain?: string;
  /** Geographic region for filtering / preference matching */
  region: GeographicRegion;
  /**
   * Set only on the 4 research universities that have a sekhem formula in
   * `degreesData.ts`. Used by `bucketListEngine` to resolve the University
   * object without a brittle name→id map.
   */
  universityId?: UniversityId;
  /**
   * Canonical institution homepage / degree catalogue.
   * Used as the master fallback when a program's own `programUrl` is absent
   * or points to a stale deep-link.
   */
  programUrl?: string;
  /**
   * Canonical admissions-calculator URL for the institution.
   * Used as the master fallback when a program's own `calculatorUrl` is absent.
   */
  calculatorUrl?: string;
}

// ── Master catalogue ──────────────────────────────────────────────────────────

export const INSTITUTIONS: InstitutionRecord[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // Research universities with official sekhem formulas
  // ══════════════════════════════════════════════════════════════════════════
  {
    id:           'tau',
    name:         'אוניברסיטת תל אביב',
    logoUrl:      'https://upload.wikimedia.org/wikipedia/commons/e/e5/Tel_Aviv_University_logo.svg',
    domain:       'tau.ac.il',
    region:       'center',
    universityId: 'tau',
  },
  {
    id:           'huji',
    name:         'האוניברסיטה העברית בירושלים',
    logoUrl:      'https://upload.wikimedia.org/wikipedia/commons/9/91/Hebrew_University_logo.svg',
    domain:       'huji.ac.il',
    region:       'center',
    universityId: 'huji',
  },
  {
    id:           'technion',
    name:         'הטכניון – מכון טכנולוגי לישראל',
    logoUrl:      'https://upload.wikimedia.org/wikipedia/commons/4/47/Technion_logo.svg',
    domain:       'technion.ac.il',
    region:       'north',
    universityId: 'technion',
  },
  {
    id:            'bgu',
    name:          'אוניברסיטת בן-גוריון בנגב',
    logoUrl:       'https://upload.wikimedia.org/wikipedia/commons/1/12/Ben-Gurion_University_of_the_Negev_logo.svg',
    domain:        'bgu.ac.il',
    region:        'south',
    universityId:  'bgu',
    programUrl:    'https://in.bgu.ac.il/Pages/default.aspx',
    calculatorUrl: 'https://bgu4u.bgu.ac.il/orion/calc/calc_sec.html',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Research universities (no sekhem formula in this platform)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id:      'haifa',
    name:    'אוניברסיטת חיפה',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/University_of_Haifa_logo.svg',
    domain:  'haifa.ac.il',
    region:  'north',
  },
  {
    id:      'biu',
    name:    'אוניברסיטת בר-אילן',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Bar_Ilan_University_Logo.svg',
    domain:  'biu.ac.il',
    region:  'center',
  },
  {
    id:     'ariel',
    name:   'אוניברסיטת אריאל',
    domain: 'ariel.ac.il',
    region: 'center',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Private universities & regional academic colleges
  // ══════════════════════════════════════════════════════════════════════════
  {
    id:     'reichman',
    name:   'אוניברסיטת רייכמן',
    domain: 'runi.ac.il',
    region: 'center',
  },
  {
    id:     'ruppin',
    name:   'המרכז האקדמי רופין',
    domain: 'ruppin.ac.il',
    region: 'center',
  },
  {
    id:     'kinneret',
    name:   'המכללה האקדמית כנרת',
    domain: 'kinneret.ac.il',
    region: 'north',
  },
  {
    id:     'telhai',
    name:   'מכללת תל-חי',
    domain: 'telhai.ac.il',
    region: 'north',
  },
  {
    id:     'pardeshana',
    name:   'מכללת פרדס חנה',
    domain: 'pardeshana.ac.il',
    region: 'north',
  },
  {
    id:     'afeka',
    name:   'מכללת אפקה',
    domain: 'afeka.ac.il',
    region: 'center',
  },
  {
    id:     'mta',
    name:   'המכללה האקדמית תל-אביב-יפו',
    domain: 'mta.ac.il',
    region: 'center',
  },
  {
    id:     'colman',
    name:   'מכללת ניהול – לימודים אקדמיים',
    domain: 'colman.ac.il',
    region: 'center',
  },
  {
    id:     'ono',
    name:   'המכללה האקדמית אונו',
    domain: 'ono.ac.il',
    region: 'center',
  },
  {
    // Continuing-education division; shares domain with ono
    id:     'ono_ce',
    name:   'המכללה האקדמית אונו – לימודי המשך',
    domain: 'ono.ac.il',
    region: 'center',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Design & arts schools
  // ══════════════════════════════════════════════════════════════════════════
  {
    id:     'bezalel',
    name:   'בצלאל – אקדמיה לאמנות ועיצוב ירושלים',
    domain: 'bezalel.ac.il',
    region: 'center',
  },
  {
    id:     'shenkar',
    name:   'שנקר – הנדסה. עיצוב. אמנות',
    domain: 'shenkar.ac.il',
    region: 'center',
  },
  {
    id:     'hit',
    name:   'המכון הטכנולוגי חולון (HIT)',
    domain: 'hit.ac.il',
    region: 'center',
  },
  {
    id:     'minshar',
    name:   'מנשר לאמנות',
    domain: 'minshar.ac.il',
    region: 'center',
  },
  {
    id:     'spieldocs',
    name:   'בית הספר לקולנוע ולטלוויזיה ע"ש סם שפיגל',
    domain: 'spieldocs.ac.il',
    region: 'center',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Integrative medicine colleges
  // ══════════════════════════════════════════════════════════════════════════
  {
    id:     'reidman',
    name:   'מכללת רידמן',
    domain: 'reidman.ac.il',
    region: 'center',
  },
  {
    id:     'broshim',
    name:   'מכללת ברושים',
    domain: 'broshim.ac.il',
    region: 'center',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Culinary schools
  // ══════════════════════════════════════════════════════════════════════════
  {
    id:     'danon',
    name:   'מכון דנון לבישול',
    domain: 'danon.co.il',
    region: 'center',
  },
  {
    id:     'bishulim',
    name:   'בישולים – בית ספר ישראלי לאמנות הבישול',
    domain: 'bishulim.co.il',
    region: 'center',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Tech bootcamps
  // ══════════════════════════════════════════════════════════════════════════
  {
    id:     'hackeru',
    name:   'HackerU',
    domain: 'hackeru.com',
    region: 'center',
  },
  {
    id:     'elevation',
    name:   'Elevation Academy',
    domain: 'elevation.ac.il',
    region: 'center',
  },
  {
    id:     'itc',
    name:   'Israel Tech Challenge (ITC)',
    domain: 'itc.tech',
    region: 'center',
  },
  {
    id:     'johnbryce',
    name:   'ג׳ון ברייס',
    domain: 'johnbryce.co.il',
    region: 'center',
  },
];

// ── Lookup tables ─────────────────────────────────────────────────────────────

/** O(1) lookup by InstitutionId slug */
export const INSTITUTION_BY_ID = Object.fromEntries(
  INSTITUTIONS.map((inst) => [inst.id, inst]),
) as Record<InstitutionId, InstitutionRecord>;

/**
 * O(1) lookup by Hebrew institution name (= `Program.institution` value).
 * Every `institution` string used in program data files must have a matching
 * entry here — otherwise logo, region, and gap-analysis lookups silently degrade.
 */
export const INSTITUTION_BY_NAME: Record<string, InstitutionRecord> = Object.fromEntries(
  INSTITUTIONS.map((inst) => [inst.name, inst]),
);
