import type { GeographicRegion, UniversityId } from '@/types';

// ── Institution ID union ──────────────────────────────────────────────────────
// Canonical slug for every academic/vocational institution in the platform.
// When adding a new institution: append here + add a record to INSTITUTIONS.

export type InstitutionId =
  // ── Four research universities (sekhem formula) ────────────────────────────
  | 'tau'
  | 'huji'
  | 'technion'
  | 'bgu'
  // ── Research universities (no sekhem formula) ──────────────────────────────
  | 'haifa'
  | 'biu'
  | 'ariel'
  // ── Graduate research institute ───────────────────────────────────────────
  | 'weizmann'
  // ── Private universities & regional colleges ───────────────────────────────
  | 'reichman'
  | 'ruppin'
  | 'kinneret'
  | 'telhai'
  | 'pardeshana'
  | 'afeka'
  | 'mta'
  | 'colman'
  | 'ono'
  | 'ono_ce'
  // ── Design & arts schools ──────────────────────────────────────────────────
  | 'bezalel'
  | 'shenkar'
  | 'hit'
  | 'minshar'
  | 'spieldocs'
  // ── Integrative medicine colleges ─────────────────────────────────────────
  | 'reidman'
  | 'broshim'
  // ── Culinary schools ──────────────────────────────────────────────────────
  | 'danon'
  | 'bishulim'
  // ── Tech bootcamps ────────────────────────────────────────────────────────
  | 'hackeru'
  | 'elevation'
  | 'itc'
  | 'johnbryce'
  // ── Music academies ───────────────────────────────────────────────────────
  | 'jerusalem_academy'
  | 'rubin'
  // ── Theater & performing arts ─────────────────────────────────────────────
  | 'nativ'
  | 'beit_zvi'
  // ── Education & sports colleges ───────────────────────────────────────────
  | 'wingate'
  | 'seminar'
  // ── Open / distance university & upgraded colleges ───────────────────────
  | 'open_university'
  | 'kiryat_shmona'
  // ── Art & design (additional) ─────────────────────────────────────────────
  | 'wizo'
  | 'neri_bloomfield'
  | 'beit_ziv'
  // ── Engineering colleges ──────────────────────────────────────────────────
  | 'ort_braude'
  | 'azrieli'
  | 'sce'
  // ── Multi-disciplinary academic colleges ──────────────────────────────────
  | 'sapir'
  | 'galil_maaravi'
  | 'zefat'
  | 'emek_yezreel'
  | 'hadassah'
  | 'ashkelon'
  | 'lev'
  | 'achva'
  | 'shalem'
  | 'peres'
  | 'lander'
  | 'netanya'
  | 'ramat_gan'
  | 'shaare_mishpat'
  | 'jerusalem_college'
  | 'schechter'
  | 'carmel_academic'
  | 'israel_academic'
  | 'tech_management'
  // ── Teacher-training colleges ─────────────────────────────────────────────
  | 'oranim'
  | 'beit_berl'
  | 'gordon_college'
  | 'david_yellin'
  | 'kaye'
  | 'shaanan'
  | 'al_qasemi'
  | 'arab_college_haifa'
  | 'ohalo'
  | 'herzog'
  | 'talpiot'
  | 'hamdat_darom'
  | 'orot'
  | 'givat_washington'
  | 'emuna'
  | 'sakhnin'
  | 'lifshitz'
  | 'morashah';

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
    id: 'tau',
    name: 'אוניברסיטת תל אביב',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Tel_Aviv_University_logo.svg',
    domain: 'tau.ac.il',
    region: 'center',
    universityId: 'tau',
  },
  {
    id: 'huji',
    name: 'האוניברסיטה העברית בירושלים',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Hebrew_University_logo.svg',
    domain: 'huji.ac.il',
    region: 'center',
    universityId: 'huji',
  },
  {
    id: 'technion',
    name: 'הטכניון – מכון טכנולוגי לישראל',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Technion_logo.svg',
    domain: 'technion.ac.il',
    region: 'north',
    universityId: 'technion',
  },
  {
    id: 'bgu',
    name: 'אוניברסיטת בן-גוריון בנגב',
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/commons/1/12/Ben-Gurion_University_of_the_Negev_logo.svg',
    domain: 'bgu.ac.il',
    region: 'south',
    universityId: 'bgu',
    programUrl: 'https://in.bgu.ac.il/Pages/default.aspx',
    calculatorUrl: 'https://bgu4u.bgu.ac.il/orion/calc/calc_sec.html',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Research universities (no sekhem formula in this platform)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'haifa',
    name: 'אוניברסיטת חיפה',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/University_of_Haifa_logo.svg',
    domain: 'haifa.ac.il',
    region: 'north',
    universityId: 'haifa',
    programUrl: 'https://www.haifa.ac.il/ba_programs/',
    calculatorUrl: 'https://applicants.haifa.ac.il/enrollmentChances/index.html',
  },
  {
    id: 'biu',
    name: 'אוניברסיטת בר-אילן',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Bar_Ilan_University_Logo.svg',
    domain: 'biu.ac.il',
    region: 'center',
    universityId: 'biu',
    programUrl: 'https://www.biu.ac.il/en/node/376',
    calculatorUrl: 'https://shoham.biu.ac.il/kabala/',
  },
  {
    id: 'ariel',
    name: 'אוניברסיטת אריאל',
    domain: 'ariel.ac.il',
    region: 'center',
    universityId: 'ariel',
    programUrl: 'https://www.ariel.ac.il/wp/registration-and-acceptance/',
    calculatorUrl:
      'https://www.ariel.ac.il/wp/%D7%9E%D7%97%D7%A9%D7%91%D7%95%D7%9F-%D7%A0%D7%AA%D7%95%D7%A0%D7%99-%D7%A7%D7%91%D7%9C%D7%94/',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Private universities & regional academic colleges
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'reichman',
    name: 'אוניברסיטת רייכמן',
    domain: 'runi.ac.il',
    region: 'center',
  },
  {
    id: 'ruppin',
    name: 'המרכז האקדמי רופין',
    domain: 'ruppin.ac.il',
    region: 'center',
  },
  {
    id: 'kinneret',
    name: 'המכללה האקדמית כנרת',
    domain: 'kinneret.ac.il',
    region: 'north',
  },
  {
    id: 'telhai',
    name: 'מכללת תל-חי',
    domain: 'telhai.ac.il',
    region: 'north',
  },
  {
    id: 'pardeshana',
    name: 'מכללת פרדס חנה',
    domain: 'pardeshana.ac.il',
    region: 'north',
  },
  {
    id: 'afeka',
    name: 'מכללת אפקה',
    domain: 'afeka.ac.il',
    region: 'center',
  },
  {
    id: 'mta',
    name: 'המכללה האקדמית תל-אביב-יפו',
    domain: 'mta.ac.il',
    region: 'center',
  },
  {
    id: 'colman',
    name: 'מכללת ניהול – לימודים אקדמיים',
    domain: 'colman.ac.il',
    region: 'center',
  },
  {
    id: 'ono',
    name: 'המכללה האקדמית אונו',
    domain: 'ono.ac.il',
    region: 'center',
  },
  {
    // Continuing-education division; shares domain with ono
    id: 'ono_ce',
    name: 'המכללה האקדמית אונו – לימודי המשך',
    domain: 'ono.ac.il',
    region: 'center',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Design & arts schools
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'bezalel',
    name: 'בצלאל – אקדמיה לאמנות ועיצוב ירושלים',
    domain: 'bezalel.ac.il',
    region: 'center',
  },
  {
    id: 'shenkar',
    name: 'שנקר – הנדסה. עיצוב. אמנות',
    domain: 'shenkar.ac.il',
    region: 'center',
  },
  {
    id: 'hit',
    name: 'המכון הטכנולוגי חולון (HIT)',
    domain: 'hit.ac.il',
    region: 'center',
  },
  {
    id: 'minshar',
    name: 'מנשר לאמנות',
    domain: 'minshar.ac.il',
    region: 'center',
  },
  {
    id: 'spieldocs',
    name: 'בית הספר לקולנוע ולטלוויזיה ע"ש סם שפיגל',
    domain: 'spieldocs.ac.il',
    region: 'center',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Music academies
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'jerusalem_academy',
    name: 'האקדמיה למוזיקה ולמחול ירושלים',
    domain: 'jamd.ac.il',
    region: 'center',
  },
  {
    id: 'rubin',
    name: 'בית הספר למוזיקה ע"ש בוכמן-מהטה – אוניברסיטת תל אביב',
    domain: 'tau.ac.il',
    region: 'center',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Theater & performing arts
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'nativ',
    name: 'בית הספר למשחק ניסן נתיב',
    domain: 'nisan-nativ.co.il',
    region: 'center',
  },
  {
    id: 'beit_zvi',
    name: 'בית צבי – בית הספר הגבוה לאמנויות הבמה',
    domain: 'beit-zvi.ac.il',
    region: 'center',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Education & sports colleges
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'wingate',
    name: 'מכללת לוינסקי-וינגייט',
    domain: 'wincol.ac.il',
    region: 'center',
  },
  {
    id: 'seminar',
    name: 'סמינר הקיבוצים – המכללה לחינוך, לטכנולוגיה ולאמנויות',
    domain: 'smkb.ac.il',
    region: 'center',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Integrative medicine colleges
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'reidman',
    name: 'מכללת רידמן',
    domain: 'reidman.ac.il',
    region: 'center',
  },
  {
    id: 'broshim',
    name: 'מכללת ברושים',
    domain: 'broshim.ac.il',
    region: 'center',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Culinary schools
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'danon',
    name: 'מכון דנון לבישול',
    domain: 'danon.co.il',
    region: 'center',
  },
  {
    id: 'bishulim',
    name: 'בישולים – בית ספר ישראלי לאמנות הבישול',
    domain: 'bishulim.co.il',
    region: 'center',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Tech bootcamps
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'hackeru',
    name: 'HackerU',
    domain: 'hackeru.com',
    region: 'center',
  },
  {
    id: 'elevation',
    name: 'Elevation Academy',
    domain: 'elevation.ac.il',
    region: 'center',
  },
  {
    id: 'itc',
    name: 'Israel Tech Challenge (ITC)',
    domain: 'itc.tech',
    region: 'center',
  },
  {
    id: 'johnbryce',
    name: 'ג׳ון ברייס',
    domain: 'johnbryce.co.il',
    region: 'center',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Open / distance university & upgraded colleges
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'open_university',
    name: 'האוניברסיטה הפתוחה',
    domain: 'openu.ac.il',
    region: 'center',
  },
  {
    id: 'kiryat_shmona',
    name: 'אוניברסיטת קרית שמונה',
    domain: 'telhai.ac.il',
    region: 'north',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Art & design (additional)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'wizo',
    name: 'ויצו-חיפה – אקדמיה לעיצוב ולחינוך',
    domain: 'wizo.ac.il',
    region: 'north',
  },
  {
    id: 'neri_bloomfield',
    name: 'מכללת נרי בלומפלד לעיצוב ולחינוך',
    domain: 'nbloomfield.ac.il',
    region: 'north',
  },
  {
    id: 'beit_ziv',
    name: 'בית זיו לאמנויות הבמה',
    domain: 'beit-ziv.co.il',
    region: 'center',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Engineering colleges
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'ort_braude',
    name: 'המכללה האקדמית להנדסה אורט בראודה',
    domain: 'braude.ac.il',
    region: 'north',
  },
  {
    id: 'azrieli',
    name: 'המכללה האקדמית להנדסה עזריאלי ירושלים',
    domain: 'jce.ac.il',
    region: 'center',
  },
  {
    id: 'sce',
    name: 'המכללה האקדמית להנדסה סמי שמעון – SCE',
    domain: 'sce.ac.il',
    region: 'south',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Multi-disciplinary academic colleges
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'sapir',
    name: 'המכללה האקדמית ספיר',
    domain: 'sapir.ac.il',
    region: 'south',
  },
  {
    id: 'galil_maaravi',
    name: 'מכללת הגליל המערבי',
    domain: 'wgalil.ac.il',
    region: 'north',
  },
  {
    id: 'zefat',
    name: 'מכללת צפת',
    domain: 'zefat.ac.il',
    region: 'north',
  },
  {
    id: 'emek_yezreel',
    name: 'המכללה האקדמית עמק יזרעאל',
    domain: 'yvc.ac.il',
    region: 'north',
  },
  {
    // Formerly Hadassah College Jerusalem — renamed to MACAM
    id: 'hadassah',
    name: 'המרכז האקדמי הרב-תחומי ירושלים',
    domain: 'macam.ac.il',
    region: 'center',
  },
  {
    id: 'ashkelon',
    name: 'המכללה האקדמית אשקלון',
    domain: 'ac.il',
    region: 'south',
  },
  {
    id: 'lev',
    name: 'מרכז אקדמי לב – JCT',
    domain: 'lev.ac.il',
    region: 'center',
  },
  {
    id: 'achva',
    name: 'המכללה האקדמית אחוה',
    domain: 'achva.ac.il',
    region: 'south',
  },
  {
    id: 'shalem',
    name: 'מכללת שלם',
    domain: 'shalem.org.il',
    region: 'center',
  },
  {
    id: 'peres',
    name: 'מרכז אקדמי פרס',
    domain: 'pac.ac.il',
    region: 'center',
  },
  {
    id: 'lander',
    name: 'מכון לנדר',
    domain: 'lander.ac.il',
    region: 'center',
  },
  {
    id: 'netanya',
    name: 'המכללה האקדמית נתניה',
    domain: 'netanya.ac.il',
    region: 'center',
  },
  {
    id: 'ramat_gan',
    name: 'המרכז האקדמי למשפט ולעסקים – רמת גן',
    domain: 'rg.ac.il',
    region: 'center',
  },
  {
    id: 'shaare_mishpat',
    name: 'מכללה אקדמית שערי משפט',
    domain: 'sha.ac.il',
    region: 'center',
  },
  {
    id: 'jerusalem_college',
    name: 'מכללת ירושלים',
    domain: 'jer-college.ac.il',
    region: 'center',
  },
  {
    id: 'schechter',
    name: 'מכון שכטר למדעי היהדות',
    domain: 'schechter.ac.il',
    region: 'center',
  },
  {
    id: 'carmel_academic',
    name: 'המרכז האקדמי כרמל',
    domain: 'carmel.ac.il',
    region: 'north',
  },
  {
    id: 'israel_academic',
    name: 'המכללה האקדמית ישראל ברמת גן',
    domain: 'israc.ac.il',
    region: 'center',
  },
  {
    id: 'tech_management',
    name: 'המכללה לטכנולוגיה שייסדה מכללת ניהול',
    domain: 'colman.ac.il',
    region: 'center',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Graduate research institute (no undergraduate programs)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'weizmann',
    name: 'מכון ויצמן למדע',
    domain: 'weizmann.ac.il',
    region: 'center',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Teacher-training colleges
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'oranim',
    name: 'מכללת אורנים – המכללה האקדמית לחינוך',
    domain: 'oranim.ac.il',
    region: 'north',
  },
  {
    id: 'beit_berl',
    name: 'מכללת בית ברל',
    domain: 'beitberl.ac.il',
    region: 'center',
  },
  {
    id: 'gordon_college',
    name: 'מכללת גורדון לחינוך',
    domain: 'gordon.ac.il',
    region: 'north',
  },
  {
    id: 'david_yellin',
    name: 'מכללת דוד ילין לחינוך',
    domain: 'dyellin.ac.il',
    region: 'center',
  },
  {
    id: 'kaye',
    name: 'מכללת קיי לחינוך',
    domain: 'kaye.ac.il',
    region: 'south',
  },
  {
    id: 'shaanan',
    name: 'מכללת שאנן – המכללה הדתית לחינוך',
    domain: 'shaanan.ac.il',
    region: 'north',
  },
  {
    id: 'al_qasemi',
    name: 'מכללת אל-קאסמי',
    domain: 'alqasemi.ac.il',
    region: 'center',
  },
  {
    id: 'arab_college_haifa',
    name: 'המכללה הערבית לחינוך בישראל – חיפה',
    domain: 'arabcol.ac.il',
    region: 'north',
  },
  {
    id: 'ohalo',
    name: 'מכללת אוהלו',
    domain: 'ohalo.ac.il',
    region: 'north',
  },
  {
    id: 'herzog',
    name: 'מכללת הרצוג',
    domain: 'herzog.ac.il',
    region: 'center',
  },
  {
    id: 'talpiot',
    name: 'מכללת תלפיות',
    domain: 'talpiot.ac.il',
    region: 'center',
  },
  {
    id: 'hamdat_darom',
    name: 'מכללת חמדת הדרום',
    domain: 'hd.ac.il',
    region: 'south',
  },
  {
    id: 'orot',
    name: 'מכללת אורות ישראל',
    domain: 'orot.ac.il',
    region: 'center',
  },
  {
    id: 'givat_washington',
    name: 'מכללת גבעת ושינגטון',
    domain: 'gwa.ac.il',
    region: 'center',
  },
  {
    id: 'emuna',
    name: 'מכללת אמונה',
    domain: 'emuna.ac.il',
    region: 'center',
  },
  {
    id: 'sakhnin',
    name: 'המכללה האקדמית להכשרת מורים בסכנין',
    domain: 'sakhnin.ac.il',
    region: 'north',
  },
  {
    id: 'lifshitz',
    name: 'מכללת ליפשיץ לחינוך',
    domain: 'lifshitz.ac.il',
    region: 'center',
  },
  {
    id: 'morashah',
    name: 'מכללת מורשת יעקב',
    domain: 'morashah.ac.il',
    region: 'center',
  },
];

import { mondayAdmissionEvidenceRecords } from './admissions/mondayEvidence.generated';
import resolvedUrlsFinal from './admissions/resolvedUrlsFinal.json';

const OFFICIAL_URL_OVERRIDES: Array<{ keywords: RegExp[]; url: string }> = [
  { keywords: [/שערי.*משפט/], url: 'https://www.mishpat.ac.il' },
  { keywords: [/למשפט.*לעסקים/], url: 'https://clb.ac.il' },
  { keywords: [/רמת גן/], url: 'https://www.iac.ac.il' },
  { keywords: [/שכטר/], url: 'https://schechter.ac.il' },
  { keywords: [/הרצוג/], url: 'https://www.herzog.ac.il' },
  { keywords: [/אורנים/], url: 'https://www.oranim.ac.il' },
  { keywords: [/אחוה/], url: 'https://www.achva.ac.il' },
  { keywords: [/צפת/], url: 'https://www.zefat.ac.il' },
  { keywords: [/בית ברל/], url: 'https://www.beitberl.ac.il' },
  { keywords: [/פרס/], url: 'https://www.pac.ac.il' },
  { keywords: [/דוד ילין/], url: 'https://www.dyellin.ac.il' },
  { keywords: [/נוף הגליל/], url: 'https://www.technological-n-g.org.il' },
  { keywords: [/נתניה/], url: 'https://www.netanya.ac.il' },
  { keywords: [/לוינסקי|וינגייט/], url: 'https://www.levinsky.ac.il' },
  { keywords: [/סמינר הקיבוצים/], url: 'https://www.smkb.ac.il' },
  { keywords: [/באר שבע.*הנדסאים/], url: 'http://www.tcb.ac.il' },
  { keywords: [/קודינג אקדמי|coding academy/i], url: 'https://www.coding-academy.org' },
  { keywords: [/רוית אסף/], url: 'https://www.ravit-asaf.co.il' },
  { keywords: [/עדה לזורגן/], url: 'https://www.adahlazorgan.co.il' },
  { keywords: [/עתיד.*מכללות/], url: 'https://www.atid.org.il' },
  { keywords: [/אורט/], url: 'https://www.ort.org.il' },
  { keywords: [/דיפלומה/], url: 'https://www.openu.ac.il/diploma' },
  { keywords: [/חשיפה/], url: 'https://www.openu.ac.il/hasifa' },
  { keywords: [/מירב/], url: 'https://www.openu.ac.il/meirav' },
  { keywords: [/ג'ון ברייס|john bryce/i], url: 'https://www.johnbryce.co.il' },
  { keywords: [/האקר יו|hackeru/i], url: 'https://www.hackeru.co.il' },
  { keywords: [/BDO.*פיננסים/], url: 'https://www.bdoacademy.co.il' },
  { keywords: [/אתגר/], url: 'https://www.etgar.co.il' },
  { keywords: [/ענת ברזילי/], url: 'https://www.anat-barzilai.co.il' },
  { keywords: [/סטודיו 6B|6B/i], url: 'https://www.6b.co.il' },
  { keywords: [/sv college/i], url: 'https://www.svcollege.co.il' },
  { keywords: [/עסקית.*לשכת המסחר/], url: 'https://www.chamber.org.il' },
  { keywords: [/אילן גזית/], url: 'https://www.ilangazit.co.il' },
  { keywords: [/מדיטבע/], url: 'https://www.mediteva.co.il' },
  { keywords: [/LFA/i], url: 'https://www.lfa.co.il' },
  { keywords: [/עידן ההורות/], url: 'https://www.idan-hahorut.co.il' },
  { keywords: [/מיכל דליות/], url: 'https://www.michaldalyot.co.il' },
  { keywords: [/אילוף.*בן/], url: 'https://www.dog-school.co.il' },
  { keywords: [/LAGO ACADEMY/i], url: 'https://www.lago-academy.co.il' },
  { keywords: [/Boutique Tattoo/i], url: 'https://www.boutiquetattoo.co.il' },
  { keywords: [/סאבטקסט/], url: 'https://www.subtext.co.il' },
  { keywords: [/precise|תדמיתנות/i], url: 'https://www.precise-school.co.il' },
  { keywords: [/F\.D/i], url: 'https://www.fd-college.co.il' },
  { keywords: [/HIGH Q|היי קיו/i], url: 'https://www.high-q.co.il' },
  { keywords: [/קידום.*בגרויות/], url: 'https://www.kidum.com' },
  { keywords: [/רז אתגרים/], url: 'https://www.raz-challenges.co.il' },
  { keywords: [/תיכון תל אביב/], url: 'https://www.tichon-telaviv.co.il' },
  { keywords: [/ענבל שוקי/], url: 'https://www.inbalshuki.co.il' },
  { keywords: [/מכללת גל/], url: 'https://www.galcollege.org.il' },
  { keywords: [/גישות/], url: 'https://www.gishot.co.il' },
  { keywords: [/פסגות/], url: 'https://www.psagot.ac' },
  { keywords: [/תנופה/], url: 'https://www.tnufa.co.il' },
  { keywords: [/יהלומים IGL/], url: 'https://www.igl-labs.com' },
  { keywords: [/HASTUDIO/i], url: 'https://www.hastudio.co.il' },
  { keywords: [/י\.נ\.ר/], url: 'https://www.ynr.co.il' },
  { keywords: [/אמנות הלידה/], url: 'https://www.birthart.co.il' },
  { keywords: [/New School/i], url: 'https://www.newschool.co.il' },
  { keywords: [/רדיוס/], url: 'https://www.radius-college.co.il' },
  { keywords: [/מכללת השרון/], url: 'https://www.hasharon-college.co.il' },
  { keywords: [/ענת פלדמן/], url: 'https://www.anatfeldman.com' },
  { keywords: [/עדי קאופמן/], url: 'https://www.adikaufman.co.il' },
  { keywords: [/NLP PRO/i], url: 'https://www.nlppro.co.il' },
  { keywords: [/ICCM/i], url: 'https://www.iccm.co.il' },
  { keywords: [/בגרות ערב/], url: 'https://www.bagrut.co.il' },
  { keywords: [/מדיסין/], url: 'https://www.medicine-college.co.il' },
  { keywords: [/קמרה אובסקורה/], url: 'https://www.camera.org.il' },
  { keywords: [/ירין שחף/], url: 'https://www.yarin-shahaf.co.il' },
  { keywords: [/נטאשה דנונה/], url: 'https://www.natashadanona.co.il' },
  { keywords: [/זמן אמיתי/], url: 'https://www.zmanamiti.co.il' },
  { keywords: [/האקדמיה של Circle A/i], url: 'https://www.circlea.co.il' },
  { keywords: [/The Academy Slim Skin/i], url: 'https://www.slimskin.co.il' },
  { keywords: [/ג'אסט מיוזיק/], url: 'https://www.justmusic.co.il' },
  { keywords: [/גישור ודיאלוג/], url: 'https://www.dialogue-center.co.il' },
  { keywords: [/נועם קלאס/], url: 'https://www.noam-class.co.il' },
  { keywords: [/בית הספר לסביבה וקיימות/], url: 'https://www.environment.org.il' },
  { keywords: [/הבצפר/], url: 'https://www.habetzefer.co.il' },
  { keywords: [/רותי שפייזר/], url: 'https://www.rutispeiser.co.il' },
  { keywords: [/אורלי לומברוזו/], url: 'https://www.orlylombrozo.co.il' },
  { keywords: [/קולינארי גלילי/], url: 'https://www.galileeculinary.co.il' },
  { keywords: [/שוקולד קארד/], url: 'https://www.chocolate-card.co.il' },
  { keywords: [/מכללת מישלב/], url: 'https://www.mishlav.co.il' },
];

export function resolveUrl(name: string, urls: readonly string[]): string | undefined {
  for (const entry of OFFICIAL_URL_OVERRIDES) {
    if (entry.keywords.some((kw) => kw.test(name))) {
      return entry.url;
    }
  }
  
  const cleanedName = name.replace(/\\/g, '');
  const compiledUrl = (resolvedUrlsFinal as Record<string, string | null>)[name] || 
                      (resolvedUrlsFinal as Record<string, string | null>)[cleanedName];
  if (compiledUrl) {
    return compiledUrl;
  }

  const firstUrl = urls[0];
  if (firstUrl && !firstUrl.includes('yoram.walla.co.il')) {
    return firstUrl;
  }
  return undefined;
}

const existingIds = new Set(INSTITUTIONS.map((inst) => inst.id));
const existingNames = new Set(INSTITUTIONS.map((inst) => inst.name));

for (const record of mondayAdmissionEvidenceRecords) {
  if (record.catalogueInstitutionId && existingIds.has(record.catalogueInstitutionId as InstitutionId)) {
    continue;
  }
  if (existingNames.has(record.displayName)) {
    continue;
  }

  const instId = (record.catalogueInstitutionId || `mon_${record.itemId}`) as InstitutionId;
  if (existingIds.has(instId)) {
    continue;
  }

  const programUrl = resolveUrl(record.displayName, record.officialUrls);
  let domain: string | undefined = undefined;
  if (programUrl) {
    try {
      domain = new URL(programUrl).hostname;
    } catch {}
  }

  INSTITUTIONS.push({
    id: instId,
    name: record.displayName,
    region: 'center',
    domain,
    programUrl,
  });
  existingIds.add(instId);
  existingNames.add(record.displayName);
}

// Ensure every institution has a programUrl
for (const inst of INSTITUTIONS) {
  if (!inst.programUrl && inst.domain) {
    inst.programUrl = inst.domain.startsWith('http') ? inst.domain : `https://www.${inst.domain}`;
  }
}


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
