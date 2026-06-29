#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const DEFAULT_INPUT = 'scratch/monday-admissions-updates.json';
const DEFAULT_TS_OUTPUT = 'src/data/admissions/mondayEvidence.generated.ts';
const DEFAULT_SUMMARY_OUTPUT = 'docs/admissions-coverage/monday-evidence-summary.md';
const DEFAULT_MISSING_RULES_OUTPUT = 'docs/admissions-coverage/missing-official-rules.md';

const EXPECTED_SCHEMA = 'toar/monday-admissions-updates-export.v1';

const KNOWN_CATALOGUE_INSTITUTION_IDS = new Map([
  ['1. האוניברסיטה העברית בירושלים', 'huji'],
  ['2. אוניברסיטת תל אביב', 'tau'],
  ['3. הטכניון - מכון טכנולוגי לישראל', 'technion'],
  ['4. אוניברסיטת בן-גוריון בנגב', 'bgu'],
  ['5. אוניברסיטת בר-אילן', 'biu'],
  ['6. אוניברסיטת חיפה', 'haifa'],
  ['7. האוניברסיטה הפתוחה', 'open_university'],
  ['8. אוניברסיטת אריאל בשומרון', 'ariel'],
  ['9. המכללה האקדמית תל-חי', 'telhai'],
  ['10. בית הספר למוסיקה בוכמן-מהטה', 'rubin'],
  ['11. אוניברסיטת רייכמן', 'reichman'],
  ['12. המכללה האקדמית בוינגייט', 'wingate'],
  ['13. אפקה - המכללה האקדמית להנדסה בתל אביב', 'afeka'],
  ['13. אפקה - המכללה האקדמית להנדסה', 'afeka'],
  ['14. שנקר - הנדסה. עיצוב. אמנות', 'shenkar'],
  ['19. המכללה האקדמית תל אביב-יפו', 'mta'],
  ['20. המרכז האקדמי רופין', 'ruppin'],
  ['23. בצלאל - אקדמיה לאמנות ועיצוב ירושלים', 'bezalel'],
  ['23. בצלאל אקדמיה לאמנות ועיצוב', 'bezalel'],
  ['26. האקדמיה למוסיקה ולמחול בירושלים', 'jerusalem_academy'],
  ['28. המכללה למנהל', 'colman'],
  ['29. הקריה האקדמית אונו', 'ono'],
  ['30. דנון - בית הספר למקצועות הקולינריה', 'danon'],
  ['30. דנון - קולינריה', 'danon'],
  ['31. בישולים - בית הספר הגבוה לקולינריה', 'bishulim'],
  ['31. בישולים - קולינריה', 'bishulim'],
  ['35. סם שפיגל לקולנוע ולטלוויזיה', 'spieldocs'],
  ['36. מנשר לאמנות', 'minshar'],
  ['38. הסטודיו למשחק ניסן נתיב', 'nativ'],
  ['40. בית צבי בית ספר גבוה לאמנויות הבמה', 'beit_zvi'],
  ['57. המרכז האקדמי לוינסקי-וינגייט', 'wingate'],
  ['58. סמינר הקיבוצים', 'seminar'],
  ['82. חשיפה - האוניברסיטה הפתוחה', 'open_university'],
  ['95. היחידה ללימודי חוץ במכללת אפקה להנדסה', 'afeka'],
  ['117. HackerU - מזניקים אותך לקריירה בהייטק', 'hackeru'],
  ['178. מכללת רידמן לרפואה משלימה ואינטגרטיבית', 'reidman'],
  ["182. ג'ון ברייס הדרכה", 'johnbryce'],
  ['190. בישולים בית הספר הגבוה לקולינריה', 'bishulim'],
  ['HIT .15', 'hit'],
]);

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    tsOut: DEFAULT_TS_OUTPUT,
    summaryOut: DEFAULT_SUMMARY_OUTPUT,
    missingRulesOut: DEFAULT_MISSING_RULES_OUTPUT,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if ((arg === '--input' || arg === '-i') && next) {
      args.input = next;
      index += 1;
      continue;
    }

    if (arg === '--ts-out' && next) {
      args.tsOut = next;
      index += 1;
      continue;
    }

    if (arg === '--summary-out' && next) {
      args.summaryOut = next;
      index += 1;
      continue;
    }

    if (arg === '--missing-rules-out' && next) {
      args.missingRulesOut = next;
      index += 1;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      args.help = true;
      continue;
    }

    throw new Error(`Unknown or incomplete argument: ${arg}`);
  }

  return args;
}

function usage() {
  return [
    'Usage:',
    '  npm run monday:derive-admissions-evidence',
    '',
    'Options:',
    `  --input <path>              Raw Monday export. Default: ${DEFAULT_INPUT}`,
    `  --ts-out <path>             Generated TS evidence file. Default: ${DEFAULT_TS_OUTPUT}`,
    `  --summary-out <path>        Markdown summary. Default: ${DEFAULT_SUMMARY_OUTPUT}`,
    `  --missing-rules-out <path>  Markdown missing-rule report. Default: ${DEFAULT_MISSING_RULES_OUTPUT}`,
  ].join('\n');
}

async function readRawExport(inputPath) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(inputPath, 'utf8'));
  } catch (error) {
    throw new Error(
      `Unable to read raw Monday export at ${inputPath}. Run npm run monday:export-admissions first. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (parsed.schema !== EXPECTED_SCHEMA || !Array.isArray(parsed.items)) {
    throw new Error(
      `Unexpected Monday export schema. Expected ${EXPECTED_SCHEMA}, got ${parsed.schema ?? 'unknown'}.`,
    );
  }

  return parsed;
}

function deriveRecord(item) {
  const evidence = item.evidence ?? {};
  const capabilityCandidate = evidence.capabilityCandidate ?? 'unknown';
  const columnValue = columnReader(item.columns ?? []);
  const urls = cleanUrls([
    ...(evidence.urls ?? []),
    columnValue('לינק למחשבון סכם'),
    columnValue('לינקים נוספים'),
    columnValue('Official Source'),
  ]);
  const missingData = missingDataFor(capabilityCandidate, urls);
  const publicBucket = publicBucketFor(capabilityCandidate);
  const ruleStatus = ruleStatusFor(capabilityCandidate, urls);
  const itemNumber = extractItemNumber(item.name);
  const displayName = stripItemNumber(item.name);
  const catalogueInstitutionId = KNOWN_CATALOGUE_INSTITUTION_IDS.get(item.name) ?? null;

  return {
    itemId: item.id,
    mondayUrl: item.url,
    itemNumber,
    itemName: item.name,
    displayName,
    catalogueInstitutionId,
    catalogueVisibility: catalogueInstitutionId === null ? 'evidence_only' : 'catalogue_mapped',
    institutionType: columnValue('סוג המוסד'),
    diplomaType: columnValue('סוג דיפלומה'),
    location: columnValue('מיקום'),
    updateCount: evidence.updateCount ?? item.updates?.length ?? 0,
    capabilityCandidate,
    publicBucket,
    ruleStatus,
    officialVerificationStatus: officialVerificationStatusFor(capabilityCandidate, urls),
    confidence: confidenceFor(capabilityCandidate),
    tags: [...(evidence.tags ?? [])].sort(),
    officialUrls: urls,
    missingData,
    limitations: [...(evidence.limitations ?? [])],
    decisionReason: evidence.decisionReason ?? 'No derived decision reason.',
    nextAction: nextActionFor({ capabilityCandidate, publicBucket, ruleStatus, missingData, urls }),
  };
}

function columnReader(columns) {
  const byTitle = new Map(columns.map((column) => [column.title, column.text ?? null]));
  return (title) => byTitle.get(title) ?? null;
}

function extractItemNumber(name) {
  const leadingMatch = name.match(/^(\d+)\./);
  if (leadingMatch) return Number(leadingMatch[1]);

  const trailingMatch = name.match(/\.(\d+)$/);
  return trailingMatch ? Number(trailingMatch[1]) : null;
}

function stripItemNumber(name) {
  return name
    .replace(/^\d+\.\s*/, '')
    .replace(/\s*\.\d+$/, '')
    .trim();
}

function cleanUrls(urls) {
  return [
    ...new Set(
      urls
        .filter(Boolean)
        .flatMap((value) => String(value).split(/\s+/))
        .map((value) =>
          value
            .replace(/\\n.*$/g, '')
            .replace(/[`"'<>()[\]{},]+$/g, '')
            .replace(/[.]+$/g, '')
            .trim(),
        )
        .filter((value) => /^https?:\/\//.test(value)),
    ),
  ].sort();
}

function publicBucketFor(capabilityCandidate) {
  if (capabilityCandidate === 'decision_capable') return 'decision_capable';
  if (capabilityCandidate === 'open_admission') return 'open_admission';
  if (capabilityCandidate === 'manual_gate') return 'manual_gate';
  if (capabilityCandidate === 'eligible_with_manual_gate') return 'eligible_with_manual_gate';
  if (capabilityCandidate === 'eligible_no_formal_grade_gate')
    return 'eligible_no_formal_grade_gate';
  if (capabilityCandidate === 'requirements_only') return 'requirements_review';
  return 'tracked_missing_rule';
}

function ruleStatusFor(capabilityCandidate, urls) {
  if (urls.length === 0) return 'needs_official_url';
  if (capabilityCandidate === 'decision_capable') return 'decision_rule_available';
  if (capabilityCandidate === 'open_admission') return 'open_or_no_grade_rule_available';
  if (
    capabilityCandidate === 'manual_gate' ||
    capabilityCandidate === 'eligible_with_manual_gate' ||
    capabilityCandidate === 'eligible_no_formal_grade_gate'
  ) {
    return 'manual_or_eligibility_rule_available';
  }
  if (capabilityCandidate === 'requirements_only') return 'needs_structured_requirements';
  if (capabilityCandidate === 'score_only_or_formula_without_verified_cutoff') {
    return 'needs_threshold_or_status';
  }
  if (capabilityCandidate === 'blocked_decision_source') return 'blocked_official_source';
  return 'needs_official_rule';
}

function officialVerificationStatusFor(capabilityCandidate, urls) {
  if (urls.length === 0) return 'needs_official_url';
  if (capabilityCandidate === 'decision_capable') {
    return 'monday_evidence_decision_rule_available';
  }
  if (capabilityCandidate === 'open_admission') {
    return 'monday_evidence_open_or_no_grade_rule_available';
  }
  if (
    capabilityCandidate === 'manual_gate' ||
    capabilityCandidate === 'eligible_with_manual_gate' ||
    capabilityCandidate === 'eligible_no_formal_grade_gate'
  ) {
    return 'monday_evidence_manual_or_eligibility_rule_available';
  }
  if (capabilityCandidate === 'score_only_or_formula_without_verified_cutoff') {
    return 'needs_official_threshold';
  }
  if (capabilityCandidate === 'blocked_decision_source') {
    return 'blocked_needs_alternate_official_source';
  }
  if (capabilityCandidate === 'requirements_only') {
    return 'needs_structured_requirements';
  }
  return 'needs_official_rule_classification';
}

function missingDataFor(capabilityCandidate, urls) {
  const missing = [];
  if (urls.length === 0) missing.push('official_url');
  if (capabilityCandidate === 'score_only_or_formula_without_verified_cutoff') {
    missing.push('threshold_or_status');
  }
  if (capabilityCandidate === 'blocked_decision_source') {
    missing.push('automation_or_alternate_official_source');
  }
  if (capabilityCandidate === 'requirements_only') {
    missing.push('structured_requirements');
  }
  if (!isKnownCandidate(capabilityCandidate)) {
    missing.push('official_rule');
  }
  return [...new Set(missing)].sort();
}

function isKnownCandidate(candidate) {
  return [
    'decision_capable',
    'score_only_or_formula_without_verified_cutoff',
    'blocked_decision_source',
    'open_admission',
    'requirements_only',
    'manual_gate',
    'eligible_with_manual_gate',
    'eligible_no_formal_grade_gate',
  ].includes(candidate);
}

function confidenceFor(capabilityCandidate) {
  if (
    capabilityCandidate === 'decision_capable' ||
    capabilityCandidate === 'open_admission' ||
    capabilityCandidate === 'manual_gate' ||
    capabilityCandidate === 'eligible_with_manual_gate' ||
    capabilityCandidate === 'eligible_no_formal_grade_gate'
  ) {
    return 'high';
  }
  if (
    capabilityCandidate === 'requirements_only' ||
    capabilityCandidate === 'score_only_or_formula_without_verified_cutoff' ||
    capabilityCandidate === 'blocked_decision_source'
  ) {
    return 'medium';
  }
  return 'low';
}

function nextActionFor({ capabilityCandidate, publicBucket, ruleStatus, missingData, urls }) {
  if (ruleStatus === 'needs_official_url') {
    return 'Find the official admissions URL before this item can be treated as product-complete.';
  }
  if (capabilityCandidate === 'decision_capable') {
    return 'Wire or verify the server-side decision rule for catalogue programs that map to this item.';
  }
  if (publicBucket === 'open_admission') {
    return 'Represent as open/no-grade admission in the public evaluator where this item maps to catalogue programs.';
  }
  if (
    publicBucket === 'manual_gate' ||
    publicBucket === 'eligible_with_manual_gate' ||
    publicBucket === 'eligible_no_formal_grade_gate'
  ) {
    return 'Represent as eligible/apply/register unless the official source names a formal grade gate.';
  }
  if (missingData.includes('threshold_or_status')) {
    return `Extract the official admission threshold/status from ${urls[0]} or another official source.`;
  }
  if (missingData.includes('automation_or_alternate_official_source')) {
    return `Resolve blocker or find alternate official admissions evidence from ${urls[0]}.`;
  }
  if (missingData.includes('structured_requirements')) {
    return `Convert requirements from ${urls[0]} into structured grade/manual/open rules.`;
  }
  return 'Review official admissions evidence and classify the item into a product decision bucket.';
}

function sortRecords(records) {
  return [...records].sort((a, b) => {
    if (a.itemNumber !== null && b.itemNumber !== null && a.itemNumber !== b.itemNumber) {
      return a.itemNumber - b.itemNumber;
    }
    if (a.itemNumber !== null) return -1;
    if (b.itemNumber !== null) return 1;
    return a.displayName.localeCompare(b.displayName, 'he');
  });
}

function countBy(records, key) {
  return records.reduce((counts, record) => {
    const value = record[key] ?? 'unknown';
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function generatedTs(records, raw) {
  return [
    "import type { MondayAdmissionEvidenceRecord } from './mondayEvidence';",
    '',
    '// Generated by scripts/derive-monday-admissions-evidence.mjs.',
    '// Source: scratch/monday-admissions-updates.json (raw export is intentionally ignored).',
    '',
    `export const mondayAdmissionEvidenceExportedAt = ${JSON.stringify(raw.exportedAt)};`,
    `export const mondayAdmissionEvidenceBoard = ${JSON.stringify(
      {
        id: raw.board.id,
        name: raw.board.name,
        url: raw.board.url,
        updatedAt: raw.board.updatedAt,
      },
      null,
      2,
    )} as const;`,
    '',
    `export const mondayAdmissionEvidenceRecords = ${JSON.stringify(records, null, 2)} as const satisfies readonly MondayAdmissionEvidenceRecord[];`,
    '',
  ].join('\n');
}

function markdownSummary(records, raw) {
  const publicBucketCounts = countBy(records, 'publicBucket');
  const ruleStatusCounts = countBy(records, 'ruleStatus');
  const officialVerificationCounts = countBy(records, 'officialVerificationStatus');
  const catalogueVisibilityCounts = countBy(records, 'catalogueVisibility');
  const missing = records.filter((record) => record.publicBucket === 'tracked_missing_rule');
  const catalogueMapped = records.filter((record) => record.catalogueInstitutionId !== null);

  return [
    '# Monday Admissions Evidence Summary',
    '',
    'Generated from the local Monday export. This file intentionally summarizes clean derived evidence only; raw update bodies stay in `scratch/monday-admissions-updates.json`.',
    '',
    '## Export',
    '',
    `- Board: ${raw.board.name} (${raw.board.id})`,
    `- Exported at: ${raw.exportedAt}`,
    `- Items: ${records.length}`,
    `- Updates: ${raw.summary.updateCount}`,
    `- Items at update limit: ${raw.summary.itemsAtUpdateLimit.length}`,
    `- Catalogue-mapped records: ${catalogueMapped.length}`,
    '',
    '## Public Buckets',
    '',
    markdownCountTable(publicBucketCounts),
    '',
    '## Rule Status',
    '',
    markdownCountTable(ruleStatusCounts),
    '',
    '## Official Verification Status',
    '',
    markdownCountTable(officialVerificationCounts),
    '',
    '## Catalogue Visibility',
    '',
    markdownCountTable(catalogueVisibilityCounts),
    '',
    '## Tracked Missing Rules',
    '',
    missing.length === 0
      ? 'No tracked missing rules.'
      : [
          '| Item | Missing data | First official URL candidate | Next action |',
          '| --- | --- | --- | --- |',
          ...missing.map(
            (record) =>
              `| ${[
                escapeTable(record.itemName),
                escapeTable(record.missingData.join(', ') || record.ruleStatus),
                escapeTable(record.officialUrls[0] ?? ''),
                escapeTable(record.nextAction),
              ].join(' | ')} |`,
          ),
        ].join('\n'),
    '',
  ].join('\n');
}

function missingRulesMarkdown(records, raw) {
  const missing = records.filter(
    (record) =>
      record.publicBucket === 'tracked_missing_rule' ||
      record.ruleStatus === 'needs_structured_requirements',
  );

  return [
    '# Missing Official Admissions Rules',
    '',
    `Generated from Monday board ${raw.board.id}. This is the extraction queue; it is not a final product state.`,
    '',
    missing.length === 0
      ? 'No missing official rules found.'
      : [
          '| Item | Current status | Official verification | Catalogue visibility | Missing data | Official URL candidates | Next action |',
          '| --- | --- | --- | --- | --- | --- | --- |',
          ...missing.map(
            (record) =>
              `| ${[
                escapeTable(record.itemName),
                escapeTable(record.ruleStatus),
                escapeTable(record.officialVerificationStatus),
                escapeTable(record.catalogueVisibility),
                escapeTable(record.missingData.join(', ') || 'structured review'),
                escapeTable(record.officialUrls.slice(0, 3).join('<br>')),
                escapeTable(record.nextAction),
              ].join(' | ')} |`,
          ),
        ].join('\n'),
    '',
  ].join('\n');
}

function markdownCountTable(counts) {
  const entries = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  return [
    '| Bucket | Count |',
    '| --- | ---: |',
    ...entries.map(([key, count]) => `| ${key} | ${count} |`),
  ].join('\n');
}

function escapeTable(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

async function writeText(path, text) {
  const outputPath = resolve(path);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, text, 'utf8');
}

async function formatText(text, parser) {
  try {
    const prettier = await import('prettier');
    return await prettier.format(text, { parser });
  } catch {
    return text;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const raw = await readRawExport(args.input);
  const records = sortRecords(raw.items.map(deriveRecord));

  await writeText(args.tsOut, await formatText(generatedTs(records, raw), 'typescript'));
  await writeText(args.summaryOut, await formatText(markdownSummary(records, raw), 'markdown'));
  await writeText(
    args.missingRulesOut,
    await formatText(missingRulesMarkdown(records, raw), 'markdown'),
  );

  console.log(
    JSON.stringify(
      {
        records: records.length,
        publicBuckets: countBy(records, 'publicBucket'),
        ruleStatuses: countBy(records, 'ruleStatus'),
        officialVerificationStatuses: countBy(records, 'officialVerificationStatus'),
        outputs: {
          ts: resolve(args.tsOut),
          summary: resolve(args.summaryOut),
          missingRules: resolve(args.missingRulesOut),
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
