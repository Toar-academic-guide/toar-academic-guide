/**
 * One-shot migration script: inserts `institutionId: '<id>',` after every
 * `institution: '<name>',` line in the two program data files.
 *
 * Run from the repo root:
 *   node scripts/patch-institution-ids.cjs
 *
 * Safe to re-run — already-patched lines (containing institutionId) are
 * detected and skipped so the script is idempotent.
 */

const fs   = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src', 'data', 'degrees');

// ── Mapping: institution name → InstitutionId slug ────────────────────────────
// Key must match the Hebrew string in the source file exactly.
const NAME_TO_ID = {
  // Four research universities
  'האוניברסיטה העברית בירושלים':                 'huji',
  'אוניברסיטת תל אביב':                          'tau',
  'הטכניון – מכון טכנולוגי לישראל':              'technion',
  'אוניברסיטת בן-גוריון בנגב':                   'bgu',
  // BGU typo variant (bgu_accounting used the short form)
  'אוניברסיטת בן-גוריון':                         'bgu',
  // Research universities
  'אוניברסיטת חיפה':                              'haifa',
  // Private universities & colleges
  'אוניברסיטת רייכמן':                            'reichman',
  'המרכז האקדמי רופין':                           'ruppin',
  'המכללה האקדמית כנרת':                          'kinneret',
  'מכללת תל-חי':                                  'telhai',
  'מכללת פרדס חנה':                               'pardeshana',
  'מכללת אפקה':                                   'afeka',
  'המכללה האקדמית תל-אביב-יפו':                   'mta',
  'מכללת ניהול – לימודים אקדמיים':                'colman',
  'המכללה האקדמית אונו':                          'ono',
  'המכללה האקדמית אונו – לימודי המשך':            'ono_ce',
  // Design & arts
  'בצלאל – אקדמיה לאמנות ועיצוב ירושלים':        'bezalel',
  'שנקר – הנדסה. עיצוב. אמנות':                   'shenkar',
  'המכון הטכנולוגי חולון (HIT)':                  'hit',
  'מנשר לאמנות':                                  'minshar',
  'בית הספר לקולנוע ולטלוויזיה ע"ש סם שפיגל':    'spieldocs',
  // Integrative medicine
  'מכללת רידמן':                                  'reidman',
  'מכללת ברושים':                                 'broshim',
  // Culinary
  'מכון דנון לבישול':                             'danon',
  'בישולים – בית ספר ישראלי לאמנות הבישול':       'bishulim',
  // Tech bootcamps
  'HackerU':                                      'hackeru',
  'Elevation Academy':                            'elevation',
  'Israel Tech Challenge (ITC)':                  'itc',
  // Note: ג׳ון ברייס uses a RIGHT SINGLE QUOTATION MARK (U+05F3 geresh), not apostrophe
  'ג׳ון ברייס': 'johnbryce',
};

// Regex: captures leading whitespace, the institution value, and the trailing comma.
// Group 1 = indent, Group 2 = institution name, Group 3 = rest of trailing line
const INST_LINE = /^( +)institution: '([^']+)',\s*$/;

function patch(filePath) {
  const lines   = fs.readFileSync(filePath, 'utf8').split('\n');
  const output  = [];
  let   changed = 0;

  for (let i = 0; i < lines.length; i++) {
    output.push(lines[i]);

    const m = INST_LINE.exec(lines[i]);
    if (!m) continue;

    const indent      = m[1];
    const instName    = m[2];
    const instId      = NAME_TO_ID[instName];

    // Already patched? (next line already has institutionId)
    const nextLine = lines[i + 1] ?? '';
    if (nextLine.includes('institutionId:')) continue;

    if (!instId) {
      console.warn(`  ⚠  No mapping for institution: '${instName}'  (line ${i + 1})`);
      continue;
    }

    // Also fix the BGU short-form name in the source
    if (instName === 'אוניברסיטת בן-גוריון') {
      output[output.length - 1] = `${indent}institution: 'אוניברסיטת בן-גוריון בנגב',`;
      console.log(`  ✏  Fixed BGU short name → full name  (line ${i + 1})`);
    }

    output.push(`${indent}institutionId: '${instId}',`);
    changed++;
  }

  fs.writeFileSync(filePath, output.join('\n'), 'utf8');
  console.log(`  ✓  ${path.basename(filePath)}: ${changed} institutionId fields added`);
}

console.log('\nPatching program data files…\n');
patch(path.join(SRC, 'academicPrograms.ts'));
patch(path.join(SRC, 'vocationalPrograms.ts'));
console.log('\nDone.\n');
