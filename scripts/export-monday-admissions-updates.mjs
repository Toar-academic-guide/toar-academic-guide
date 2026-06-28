#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const DEFAULT_BOARD_ID = '18416803950';
const DEFAULT_OUTPUT = 'scratch/monday-admissions-updates.json';
const MONDAY_API_URL = 'https://api.monday.com/v2';
const ITEMS_PAGE_LIMIT = 100;
const UPDATE_LIMIT = 100;

function parseArgs(argv) {
  const args = {
    boardId: process.env.MONDAY_ADMISSIONS_BOARD_ID ?? DEFAULT_BOARD_ID,
    out: DEFAULT_OUTPUT,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if ((arg === '--board-id' || arg === '--board') && next) {
      args.boardId = next;
      index += 1;
      continue;
    }

    if ((arg === '--out' || arg === '-o') && next) {
      args.out = next;
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
    '  MONDAY_API_TOKEN=... npm run monday:export-admissions -- --out scratch/monday-admissions-updates.json',
    '',
    'Options:',
    `  --board-id <id>  Monday board id. Default: ${DEFAULT_BOARD_ID}`,
    `  --out <path>    JSON output path. Default: ${DEFAULT_OUTPUT}`,
  ].join('\n');
}

async function mondayGraphql(token, query, variables) {
  const response = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const body = await response.json().catch(async () => ({
    errors: [{ message: await response.text() }],
  }));

  if (!response.ok || body.errors?.length > 0) {
    const message =
      body.errors?.map((error) => error.message).join('; ') ??
      `HTTP ${response.status} from monday.com`;
    throw new Error(message);
  }

  return body.data;
}

async function fetchBoardPage(token, boardId, cursor) {
  const query = `
    query AdmissionsBoardItems($boardId: [ID!], $limit: Int!, $cursor: String) {
      boards(ids: $boardId) {
        id
        name
        url
        updated_at
        columns {
          id
          title
          type
        }
        items_page(limit: $limit, cursor: $cursor) {
          cursor
          items {
            id
            name
            url
            created_at
            updated_at
            column_values {
              id
              text
              value
            }
            updates(limit: ${UPDATE_LIMIT}) {
              id
              body
              text_body
              created_at
              updated_at
              creator {
                id
                name
                email
              }
              replies {
                id
                body
                text_body
                created_at
                updated_at
                creator {
                  id
                  name
                  email
                }
              }
              assets {
                id
                name
                url
                public_url
              }
            }
          }
        }
      }
    }
  `;

  const data = await mondayGraphql(token, query, {
    boardId,
    limit: ITEMS_PAGE_LIMIT,
    cursor,
  });

  const board = data.boards?.[0];
  if (!board) {
    throw new Error(`Board ${boardId} was not returned by monday.com`);
  }

  return board;
}

async function fetchBoardExport(token, boardId) {
  let cursor = null;
  let boardSnapshot = null;
  const items = [];

  do {
    const board = await fetchBoardPage(token, boardId, cursor);
    boardSnapshot = {
      id: board.id,
      name: board.name,
      url: board.url,
      updatedAt: board.updated_at,
      columns: board.columns.map((column) => ({
        id: column.id,
        title: column.title,
        type: column.type,
      })),
    };

    items.push(...board.items_page.items);
    cursor = board.items_page.cursor;
  } while (cursor);

  const columnsById = new Map(boardSnapshot.columns.map((column) => [column.id, column]));
  const normalizedItems = items.map((item) => normalizeItem(item, columnsById));
  const summary = summarizeItems(normalizedItems);

  return {
    schema: 'toar/monday-admissions-updates-export.v1',
    exportedAt: new Date().toISOString(),
    board: boardSnapshot,
    summary,
    items: normalizedItems,
  };
}

function normalizeItem(item, columnsById) {
  const columns = item.column_values.map((value) => {
    const column = columnsById.get(value.id);
    return {
      id: value.id,
      title: column?.title ?? value.id,
      type: column?.type ?? 'unknown',
      text: emptyToNull(value.text),
      value: parseColumnValue(value.value),
    };
  });

  const updates = item.updates.map(normalizeUpdate);
  const evidence = deriveEvidence({ name: item.name, columns, updates });

  return {
    id: item.id,
    name: item.name,
    url: item.url,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    columns,
    updates,
    evidence,
  };
}

function normalizeUpdate(update) {
  return {
    id: update.id,
    body: emptyToNull(update.body),
    textBody: emptyToNull(update.text_body),
    createdAt: update.created_at,
    updatedAt: update.updated_at,
    creator: update.creator
      ? {
          id: update.creator.id,
          name: update.creator.name,
          email: update.creator.email,
        }
      : null,
    replies: (update.replies ?? []).map((reply) => ({
      id: reply.id,
      body: emptyToNull(reply.body),
      textBody: emptyToNull(reply.text_body),
      createdAt: reply.created_at,
      updatedAt: reply.updated_at,
      creator: reply.creator
        ? {
            id: reply.creator.id,
            name: reply.creator.name,
            email: reply.creator.email,
          }
        : null,
    })),
    assets: (update.assets ?? []).map((asset) => ({
      id: asset.id,
      name: asset.name,
      url: emptyToNull(asset.url),
      publicUrl: emptyToNull(asset.public_url),
    })),
  };
}

function deriveEvidence({ name, columns, updates }) {
  const updateText = updates
    .flatMap((update) => [
      update.textBody,
      ...update.replies.map((reply) => reply.textBody),
    ])
    .filter(Boolean)
    .join('\n\n');
  const columnText = columns
    .map((column) => [column.text, columnValueText(column.value)].filter(Boolean).join('\n'))
    .filter(Boolean)
    .join('\n');
  const searchable = `${name}\n${columnText}\n${updateText}`;
  const tags = evidenceTags(searchable, updateText);
  const capabilityCandidate = classifyCapability(tags);

  return {
    updateCount: updates.length,
    hasUpdates: updates.length > 0,
    capabilityCandidate,
    tags,
    urls: extractUrls(searchable),
    limitations: deriveLimitations(tags, updateText),
    decisionReason: decisionReasonFor(capabilityCandidate, tags),
  };
}

function evidenceTags(searchable, updateText) {
  const tags = new Set();
  const text = normalizeForSearch(searchable);
  const updatesOnly = normalizeForSearch(updateText);

  addIf(tags, 'reverse_engineering_report', /reverse engineering summary|reverse-engineering report/.test(text));
  addIf(tags, 'update_evidence', updatesOnly.length > 0);
  addIf(tags, 'official_api_or_endpoint', /primary api endpoint|api endpoint|endpoint|servlet|graphql|\/api\//.test(updatesOnly));
  addIf(tags, 'client_side_formula', /client-side|client side|javascript|js source|formula|נוסחה/.test(updatesOnly));
  addIf(tags, 'score_formula', /sekhem|סכם|weighted score|ציון משוקלל|adapted score|ציון מתואם/.test(text));
  addIf(tags, 'threshold_or_cutoff', hasThresholdOrGateEvidence(text));
  addIf(tags, 'accepted_rejected_status', hasExplicitAdmissionStatus(text));
  addIf(tags, 'score_only_limitation', /score-only|score only|cutoff\/status not returned|no official threshold|admission cutoff.+n\/a|rejection cutoff.+n\/a|inferred status possible.+no/.test(text));
  addIf(tags, 'browser_blocked', /blocked by|captcha|radware|waf|cookies required|browser cookie|browser_required|hermes|vps/.test(text));
  addIf(tags, 'open_admission', /open admission|קבלה פתוחה/.test(text));
  addIf(tags, 'no_formal_grade_gate', /ללא דרישות סף|אין צורך בבגרות|אין צורך בפסיכומטרי|קבלה חופשית|ללא תנאי קדם/.test(text));
  addIf(tags, 'manual_gate', /ראיון|ועדת קבלה|תיק עבודות|מבחני כניסה|מבחן קבלה|מיונים|portfolio|interview|committee/.test(text));
  addIf(tags, 'professional_certificate', /תעודה מקצועית|לימודי תעודה|קורסי הכשרה|הסמכה מקצועית/.test(text));
  addIf(tags, 'requirements_only', /תנאי קבלה|דרישות קבלה|conditions_for_applying|זכאות לתעודת בגרות/.test(text));
  addIf(tags, 'missing_update_thread', updatesOnly.length === 0);

  return [...tags].sort();
}

function classifyCapability(tags) {
  const has = (tag) => tags.includes(tag);
  const hasTechnicalCalculatorEvidence =
    has('reverse_engineering_report') || has('client_side_formula') || has('official_api_or_endpoint');

  if (has('open_admission') && !has('professional_certificate')) {
    return 'open_admission';
  }

  if (has('no_formal_grade_gate')) {
    return has('manual_gate') ? 'eligible_with_manual_gate' : 'eligible_no_formal_grade_gate';
  }

  if (has('score_only_limitation')) {
    return 'score_only_or_formula_without_verified_cutoff';
  }

  if (
    hasTechnicalCalculatorEvidence &&
    (has('accepted_rejected_status') || (has('score_formula') && has('threshold_or_cutoff')))
  ) {
    return has('browser_blocked') ? 'blocked_decision_source' : 'decision_capable';
  }

  if (hasTechnicalCalculatorEvidence && has('manual_gate')) {
    return 'manual_gate';
  }

  if (hasTechnicalCalculatorEvidence && has('score_formula')) {
    return has('score_only_limitation') || !has('threshold_or_cutoff')
      ? 'score_only_or_formula_without_verified_cutoff'
      : 'formula_review_required';
  }

  if (has('manual_gate')) {
    return 'manual_gate';
  }

  if (has('requirements_only')) {
    return 'requirements_only';
  }

  return has('missing_update_thread') ? 'missing_update_evidence' : 'unknown';
}

function hasThresholdOrGateEvidence(text) {
  return (
    /threshold|cutoff|חתך קבלה|חתך דחייה|סף קבלה|admission cutoff|rejection cutoff/.test(text) ||
    /requires [^.]{0,80}(>=|>|at least|\d{2,3})/.test(text) ||
    /נדרש[^\n.]{0,80}\d{2,3}|דורש[^\n.]{0,80}\d{2,3}|לפחות[^\n.]{0,80}\d{2,3}/.test(text)
  );
}

function hasExplicitAdmissionStatus(text) {
  return (
    /(^|[^א-ת])(התקבל|נדחה)([^א-ת]|$)/.test(text) ||
    /accepted|rejected|pass\/fail/.test(text)
  );
}

function deriveLimitations(tags, updateText) {
  const limitations = [];
  if (tags.includes('browser_blocked')) {
    limitations.push('Official source requires browser/cookie/anti-bot handling before automation.');
  }
  if (tags.includes('score_only_limitation')) {
    limitations.push('Update evidence reports score calculation without verified admission cutoff/status.');
  }
  if (tags.includes('manual_gate')) {
    limitations.push('Admission depends on manual review such as interview, portfolio, exam, or committee.');
  }
  if (tags.includes('missing_update_thread')) {
    limitations.push('No item-update thread was exported for this item.');
  }
  if (!updateText.trim()) {
    limitations.push('Classification is based on board columns only until update evidence is added.');
  }
  return limitations;
}

function decisionReasonFor(capabilityCandidate, tags) {
  if (capabilityCandidate === 'decision_capable') {
    return 'Update evidence contains a decision-bearing status or both score formula and cutoff/threshold evidence.';
  }
  if (capabilityCandidate === 'open_admission') {
    return 'Update or board evidence says there are no academic admission requirements.';
  }
  if (capabilityCandidate.startsWith('eligible')) {
    return 'Evidence says there is no formal Bagrut/psychometric gate, but manual fit checks may remain.';
  }
  if (capabilityCandidate === 'score_only_or_formula_without_verified_cutoff') {
    return 'Evidence contains a calculator/formula but no verified cutoff/status for an admission decision.';
  }
  if (capabilityCandidate === 'blocked_decision_source') {
    return 'Evidence appears decision-bearing but automation is blocked by browser/cookie/anti-bot requirements.';
  }
  if (tags.includes('manual_gate')) {
    return 'Evidence points to manual admissions gates rather than a numeric formula.';
  }
  return 'No decisive admissions evidence was derived automatically.';
}

function summarizeItems(items) {
  const capabilityCounts = {};
  const tagCounts = {};
  let updateCount = 0;
  let replyCount = 0;
  let assetCount = 0;

  for (const item of items) {
    updateCount += item.updates.length;
    replyCount += item.updates.reduce((sum, update) => sum + update.replies.length, 0);
    assetCount += item.updates.reduce((sum, update) => sum + update.assets.length, 0);
    increment(capabilityCounts, item.evidence.capabilityCandidate);

    for (const tag of item.evidence.tags) {
      increment(tagCounts, tag);
    }
  }

  return {
    itemCount: items.length,
    itemsWithUpdates: items.filter((item) => item.updates.length > 0).length,
    updateLimit: UPDATE_LIMIT,
    itemsAtUpdateLimit: items
      .filter((item) => item.updates.length >= UPDATE_LIMIT)
      .map((item) => ({ id: item.id, name: item.name, updateCount: item.updates.length })),
    updateCount,
    replyCount,
    assetCount,
    capabilityCounts,
    tagCounts,
  };
}

function parseColumnValue(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function columnValueText(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object') {
    if ('url' in value && 'text' in value) {
      return [value.text, value.url].filter(Boolean).join(' - ');
    }
    if ('label' in value) {
      return value.label;
    }
  }
  return JSON.stringify(value);
}

function extractUrls(text) {
  return [...new Set(text.match(/https?:\/\/[^\s)\]}>"']+/g) ?? [])].sort();
}

function normalizeForSearch(text) {
  return text.toLowerCase().replace(/\s+/g, ' ');
}

function emptyToNull(value) {
  return value === undefined || value === null || value === '' ? null : value;
}

function addIf(tags, tag, condition) {
  if (condition) {
    tags.add(tag);
  }
}

function increment(record, key) {
  record[key] = (record[key] ?? 0) + 1;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const token = process.env.MONDAY_API_TOKEN?.trim();
  if (!token) {
    throw new Error(`Missing MONDAY_API_TOKEN.\n\n${usage()}`);
  }

  const outputPath = resolve(args.out);
  const exported = await fetchBoardExport(token, args.boardId);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(exported, null, 2)}\n`, 'utf8');

  console.log(
    JSON.stringify(
      {
        outputPath,
        boardId: exported.board.id,
        itemCount: exported.summary.itemCount,
        updateCount: exported.summary.updateCount,
        itemsAtUpdateLimit: exported.summary.itemsAtUpdateLimit,
        capabilityCounts: exported.summary.capabilityCounts,
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
