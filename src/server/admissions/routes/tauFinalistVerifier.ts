import 'server-only';

import { createHmac } from 'node:crypto';

const TAU_GRAPHQL_URL = 'https://go.tau.ac.il/graphql';
const TAU_COMPUTER_SCIENCE_URL = 'https://go.tau.ac.il/he/exact/ba/computer';
const MAX_TAU_FINALISTS = 8;
const DEFAULT_TIMEOUT_MS = 5000;

export interface TauFinalist {
  id: string;
  psychometric: number;
  bagrutAverage: number;
  hasQualifiedMathAndPhysics: boolean;
}

export interface TauFinalistVerification {
  id: string;
  status: 'verified' | 'unavailable';
  eligible?: boolean;
  score?: number;
  cutoff?: number;
  scoreField?: 'hatama_meduyakim';
  sourceUrl: string;
  reason?:
    | 'official_score_unavailable'
    | 'official_cutoff_unavailable'
    | 'finalist_limit_exceeded'
    | 'circuit_open';
}

export interface TauFinalistCache {
  get(key: string): TauFinalistVerification | undefined;
  set(key: string, value: TauFinalistVerification): void;
}

export interface TauFinalistCircuit {
  isOpen(): boolean;
  recordSuccess(): void;
  recordFailure(): void;
}

export function createTauFinalistCircuit(failureThreshold = 3): TauFinalistCircuit {
  let consecutiveFailures = 0;

  return {
    isOpen: () => consecutiveFailures >= failureThreshold,
    recordSuccess: () => {
      consecutiveFailures = 0;
    },
    recordFailure: () => {
      consecutiveFailures += 1;
    },
  };
}

export async function verifyTauComputerScienceFinalists(args: {
  finalists: TauFinalist[];
  fetcher?: typeof fetch;
  cache?: TauFinalistCache;
  cacheSecret?: string;
  circuit?: TauFinalistCircuit;
  timeoutMs?: number;
}): Promise<TauFinalistVerification[]> {
  if (args.finalists.length > MAX_TAU_FINALISTS) {
    return args.finalists.map((finalist) => unavailable(finalist.id, 'finalist_limit_exceeded'));
  }

  const fetcher = args.fetcher ?? fetch;
  const cache = args.cache;
  const cacheSecret = args.cacheSecret;
  const circuit = args.circuit;
  const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const results: TauFinalistVerification[] = [];

  for (const finalist of args.finalists) {
    if (circuit?.isOpen()) {
      results.push(unavailable(finalist.id, 'circuit_open'));
      continue;
    }

    const cacheKey = cache && cacheSecret ? cacheKeyFor(finalist, cacheSecret) : undefined;
    const cached = cacheKey ? cache?.get(cacheKey) : undefined;
    if (cached) {
      results.push({ ...cached, id: finalist.id });
      continue;
    }

    const verification = await verifyFinalist({ finalist, fetcher, timeoutMs });
    if (verification.status === 'verified') {
      circuit?.recordSuccess();
    } else {
      circuit?.recordFailure();
    }
    if (cacheKey && verification.status === 'verified') {
      cache?.set(cacheKey, { ...verification, id: '' });
    }
    results.push(verification);
  }

  return results;
}

async function verifyFinalist(args: {
  finalist: TauFinalist;
  fetcher: typeof fetch;
  timeoutMs: number;
}): Promise<TauFinalistVerification> {
  try {
    const scoreResponse = await fetchWithTimeout(
      args.fetcher,
      TAU_GRAPHQL_URL,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          operationName: 'getLastScore',
          variables: {
            scoresData: {
              prog: 'calctziun',
              out: 'json',
              reali10: args.finalist.hasQualifiedMathAndPhysics ? 1 : 0,
              psicho: String(args.finalist.psychometric),
              bagrut: String(args.finalist.bagrutAverage),
            },
          },
          query:
            'query getLastScore($scoresData: JSON!) { getLastScore(scoresData: $scoresData) { body __typename } }',
        }),
      },
      args.timeoutMs,
    );
    const score = parseTauExactSciencesScore(await readJson(scoreResponse));
    if (score === undefined) {
      return unavailable(args.finalist.id, 'official_score_unavailable');
    }

    const cutoffResponse = await fetchWithTimeout(
      args.fetcher,
      TAU_COMPUTER_SCIENCE_URL,
      {},
      args.timeoutMs,
    );
    const cutoff = parseTauComputerScienceCutoff(await cutoffResponse.text());
    if (cutoff === undefined) {
      return unavailable(args.finalist.id, 'official_cutoff_unavailable');
    }

    return {
      id: args.finalist.id,
      status: 'verified',
      eligible: score >= cutoff,
      score,
      cutoff,
      scoreField: 'hatama_meduyakim',
      sourceUrl: TAU_COMPUTER_SCIENCE_URL,
    };
  } catch {
    return unavailable(args.finalist.id, 'official_score_unavailable');
  }
}

function unavailable(
  id: string,
  reason: NonNullable<TauFinalistVerification['reason']>,
): TauFinalistVerification {
  return { id, status: 'unavailable', reason, sourceUrl: TAU_COMPUTER_SCIENCE_URL };
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error('TAU score response failed');
  return response.json();
}

export function parseTauExactSciencesScore(value: unknown): number | undefined {
  const body = (value as { data?: { getLastScore?: { body?: unknown } } })?.data?.getLastScore
    ?.body;
  const parsed = typeof body === 'string' ? JSON.parse(body) : body;
  const score = (parsed as Record<string, unknown> | undefined)?.hatama_meduyakim;
  const numeric = typeof score === 'number' ? score : Number(score);
  return Number.isFinite(numeric) ? numeric : undefined;
}

export function parseTauComputerScienceCutoff(body: string): number | undefined {
  const match = body.match(
    /field_this_year_receipt_threshol\\?"?\s*[:=]\s*\\?"?([0-9]+(?:\.[0-9]+)?)/,
  );
  const numeric = Number(match?.[1]);
  return Number.isFinite(numeric) ? numeric : undefined;
}

async function fetchWithTimeout(
  fetcher: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetcher(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function cacheKeyFor(finalist: TauFinalist, secret: string): string {
  return createHmac('sha256', secret)
    .update(
      JSON.stringify({
        target: 'tau-computer-science',
        psychometric: finalist.psychometric,
        bagrutAverage: finalist.bagrutAverage,
        hasQualifiedMathAndPhysics: finalist.hasQualifiedMathAndPhysics,
      }),
    )
    .digest('hex');
}
