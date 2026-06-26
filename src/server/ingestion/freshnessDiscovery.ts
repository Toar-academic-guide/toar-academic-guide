import { createHash } from 'node:crypto';

export type FreshnessSourceClass =
  | 'api_static_json'
  | 'browser_required'
  | 'official_html'
  | 'pdf_text'
  | 'score_only_calculator';

export type FreshnessCapability = 'blocked' | 'decision_capable' | 'score_only';

export type FreshnessDiscoveryStatus = 'blocked' | 'changed_needs_review' | 'fresh';

export interface FreshnessDiscoveryInput {
  id: string;
  sourceClass: FreshnessSourceClass;
  body: unknown;
  previousNormalizedFingerprint?: string;
  rawBody?: string;
  blockedReason?: string;
}

export interface FreshnessDiscoveryResult {
  id: string;
  sourceClass: FreshnessSourceClass;
  capability: FreshnessCapability;
  status: FreshnessDiscoveryStatus;
  rawFingerprint: string;
  normalizedFingerprint: string;
  reviewWorthy: boolean;
  blockedReason: string | null;
  normalizedDecisionPayload: Record<string, unknown>;
  ignoredNoise: string[];
}

const DECISION_KEYWORDS = [
  'acceptance',
  'average',
  'bagrut',
  'cutoff',
  'english',
  'minimum',
  'psychometric',
  'rejection',
  'requirement',
  'score',
  'sekhem',
  'threshold',
];

const BOILERPLATE_SELECTORS = ['footer', 'header', 'nav', 'script', 'style', 'svg'];

export function evaluateFreshnessDiscovery(
  input: FreshnessDiscoveryInput,
): FreshnessDiscoveryResult {
  if (input.sourceClass === 'browser_required') {
    const reason = input.blockedReason ?? 'browser session required';
    return {
      id: input.id,
      sourceClass: input.sourceClass,
      capability: 'blocked',
      status: 'blocked',
      rawFingerprint: fingerprint(String(input.rawBody ?? reason)),
      normalizedFingerprint: fingerprint(reason),
      reviewWorthy: false,
      blockedReason: reason,
      normalizedDecisionPayload: { reason },
      ignoredNoise: [],
    };
  }

  const rawText = input.rawBody ?? serializeRaw(input.body);
  const normalizedDecisionPayload = normalizeDecisionPayload(input.sourceClass, input.body);
  const normalizedFingerprint = fingerprint(stableSerialize(normalizedDecisionPayload));
  const previous = input.previousNormalizedFingerprint;
  const normalizedChanged = previous !== undefined && previous !== normalizedFingerprint;
  const capability =
    input.sourceClass === 'score_only_calculator' ? 'score_only' : 'decision_capable';

  return {
    id: input.id,
    sourceClass: input.sourceClass,
    capability,
    status: normalizedChanged ? 'changed_needs_review' : 'fresh',
    rawFingerprint: fingerprint(rawText),
    normalizedFingerprint,
    reviewWorthy: normalizedChanged && capability === 'decision_capable',
    blockedReason: null,
    normalizedDecisionPayload,
    ignoredNoise: ignoredNoiseFor(input.sourceClass),
  };
}

export function normalizeDecisionPayload(
  sourceClass: FreshnessSourceClass,
  body: unknown,
): Record<string, unknown> {
  switch (sourceClass) {
    case 'official_html':
      return {
        decisionLines: extractDecisionLines(stripHtmlBoilerplate(String(body))),
      };
    case 'api_static_json':
      return {
        fields: extractDecisionFields(body),
      };
    case 'pdf_text':
      return {
        decisionLines: extractDecisionLines(normalizeWhitespace(String(body))),
      };
    case 'score_only_calculator':
      return {
        scoreOnly: true,
        fields: extractDecisionFields(body),
      };
    case 'browser_required':
      return {
        reason: 'browser session required',
      };
  }
}

export function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function extractDecisionFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(extractDecisionFields).filter((entry) => !isEmptyDecisionValue(entry));
  }

  if (!value || typeof value !== 'object') {
    return typeof value === 'string' ? normalizeWhitespace(value) : value;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .flatMap(([key, entry]) => {
      const normalizedKey = key.toLowerCase();
      const normalizedValue = extractDecisionFields(entry);
      const keyIsRelevant = DECISION_KEYWORDS.some((keyword) => normalizedKey.includes(keyword));
      const nestedValueIsRelevant =
        !isEmptyDecisionValue(normalizedValue) && typeof normalizedValue === 'object';

      if (!keyIsRelevant && !nestedValueIsRelevant) {
        return [];
      }

      return [[key, normalizedValue] as const];
    })
    .sort(([left], [right]) => left.localeCompare(right));

  return Object.fromEntries(entries);
}

function extractDecisionLines(value: string): string[] {
  return normalizeWhitespace(value)
    .split(/\n|(?<=[.;])\s+/)
    .map((line) => line.trim())
    .filter((line) => {
      const lower = line.toLowerCase();
      const hasDecisionShape = line.includes(':') || /\d/.test(line);
      return hasDecisionShape && DECISION_KEYWORDS.some((keyword) => lower.includes(keyword));
    })
    .sort();
}

function ignoredNoiseFor(sourceClass: FreshnessSourceClass): string[] {
  if (sourceClass === 'official_html') {
    return ['header/nav/footer markup', 'scripts/styles/svg', 'non-decision text'];
  }

  if (sourceClass === 'pdf_text') {
    return ['page-number/order noise', 'non-decision text'];
  }

  return [];
}

function isEmptyDecisionValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }

  return false;
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function serializeRaw(value: unknown): string {
  return typeof value === 'string' ? value : stableSerialize(value);
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`);
    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

function stripHtmlBoilerplate(html: string): string {
  return BOILERPLATE_SELECTORS.reduce(
    (current, selector) =>
      current.replace(new RegExp(`<${selector}[^>]*>[\\s\\S]*?<\\/${selector}>`, 'gi'), ' '),
    html,
  )
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ');
}
