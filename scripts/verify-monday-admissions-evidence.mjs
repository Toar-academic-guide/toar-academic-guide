import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const generatedEvidencePath = join(rootDir, 'src/data/admissions/mondayEvidence.generated.ts');

const EXPECTED_RECORD_COUNT = 212;
const EXPECTED_NOT_APPLICABLE_ITEM_IDS = new Set(['12242591498', '12341167263']);
const EXPECTED_ARIEL_EXCEPTION_ITEM_IDS = new Set([
  '12220680983',
  '12341098184',
  '12341114114',
]);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function extractRequired(block, pattern, label, itemId) {
  const match = block.match(pattern);
  if (!match) {
    fail(`Unable to extract ${label} for item ${itemId}.`);
  }
  return match[1];
}

function extractGeneratedString(block, fieldName, itemId) {
  const pattern = new RegExp(`${fieldName}: (['"])(.*?)\\1`);
  const match = block.match(pattern);
  if (!match) {
    fail(`Unable to extract ${fieldName} for item ${itemId}.`);
  }
  return match[2];
}

const source = readFileSync(generatedEvidencePath, 'utf8');
const recordMatches = [
  ...source.matchAll(/\n  \{\n    itemId: '([^']+)',([\s\S]*?)\n  \},/g),
];

const records = recordMatches.map((match) => {
  const itemId = match[1];
  const block = match[2];
  const displayName = extractGeneratedString(block, 'displayName', itemId);
  const ruleStatus = extractRequired(block, /ruleStatus: '([^']+)'/, 'ruleStatus', itemId);
  const officialVerificationStatus = extractRequired(
    block,
    /officialVerificationStatus: '([^']+)'/,
    'officialVerificationStatus',
    itemId,
  );
  const officialUrlsBlock = extractRequired(
    block,
    /officialUrls: \[([\s\S]*?)\],\n    missingData:/,
    'officialUrls',
    itemId,
  );
  const officialUrlCount = [...officialUrlsBlock.matchAll(/'https?:\/\/[^']+'/g)].length;

  return {
    itemId,
    displayName,
    ruleStatus,
    officialVerificationStatus,
    officialUrlCount,
  };
});

assert(
  records.length === EXPECTED_RECORD_COUNT,
  `Expected ${EXPECTED_RECORD_COUNT} Monday admissions evidence records, found ${records.length}.`,
);

const unexpectedMissingOfficialUrls = records.filter(
  (record) =>
    record.officialUrlCount === 0 && !EXPECTED_NOT_APPLICABLE_ITEM_IDS.has(record.itemId),
);

assert(
  unexpectedMissingOfficialUrls.length === 0,
  `Only not_applicable records may have empty officialUrls. Unexpected item IDs: ${unexpectedMissingOfficialUrls
    .map((record) => record.itemId)
    .join(', ')}`,
);

const notApplicableRecords = records.filter((record) => record.ruleStatus === 'not_applicable');
const actualNotApplicableIds = new Set(notApplicableRecords.map((record) => record.itemId));

assert(
  actualNotApplicableIds.size === EXPECTED_NOT_APPLICABLE_ITEM_IDS.size &&
    [...EXPECTED_NOT_APPLICABLE_ITEM_IDS].every((itemId) => actualNotApplicableIds.has(itemId)),
  `Expected not_applicable item IDs ${[...EXPECTED_NOT_APPLICABLE_ITEM_IDS].join(
    ', ',
  )}; found ${[...actualNotApplicableIds].join(', ')}.`,
);

const unresolvedOfficialUrlRecords = records.filter(
  (record) =>
    record.ruleStatus === 'needs_official_url' ||
    record.officialVerificationStatus === 'needs_official_url',
);

assert(
  unresolvedOfficialUrlRecords.length === 0,
  `Found records still needing official URLs: ${unresolvedOfficialUrlRecords
    .map((record) => `${record.itemId} ${record.displayName}`)
    .join('; ')}`,
);

const structuredRequirementQueue = records.filter(
  (record) => record.ruleStatus === 'needs_structured_requirements',
);
const unexpectedStructuredRequirementQueue = structuredRequirementQueue.filter(
  (record) => !EXPECTED_ARIEL_EXCEPTION_ITEM_IDS.has(record.itemId),
);

assert(
  unexpectedStructuredRequirementQueue.length === 0,
  `Only Ariel exception rows may remain in needs_structured_requirements. Unexpected records: ${unexpectedStructuredRequirementQueue
    .map((record) => `${record.itemId} ${record.displayName}`)
    .join('; ')}`,
);

const blockedOfficialSourceRecords = records.filter(
  (record) => record.ruleStatus === 'blocked_official_source',
);
const unexpectedBlockedOfficialSourceRecords = blockedOfficialSourceRecords.filter(
  (record) => !EXPECTED_ARIEL_EXCEPTION_ITEM_IDS.has(record.itemId),
);

assert(
  unexpectedBlockedOfficialSourceRecords.length === 0,
  `Only Ariel exception rows may remain blocked_official_source. Unexpected records: ${unexpectedBlockedOfficialSourceRecords
    .map((record) => `${record.itemId} ${record.displayName}`)
    .join('; ')}`,
);

console.log(
  JSON.stringify(
    {
      verified: true,
      records: records.length,
      notApplicable: notApplicableRecords.length,
      structuredRequirementQueue: structuredRequirementQueue.length,
      blockedOfficialSource: blockedOfficialSourceRecords.length,
    },
    null,
    2,
  ),
);
