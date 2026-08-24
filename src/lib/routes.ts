export const ROUTES = {
  home: '/',
  login: '/login',
  signup: '/signup',
  app: '/app',
  profile: '/app/profile',
  assessment: '/app/assessment',
  recommendations: '/app/recommendations',
  calculator: '/app/calculator',
  savedPrograms: '/app/saved-programs',
} as const;

export type AppAreaRoute =
  'app' | 'profile' | 'assessment' | 'recommendations' | 'calculator' | 'savedPrograms';

export const APP_AREA_ROUTES: Record<AppAreaRoute, string> = {
  app: ROUTES.app,
  profile: ROUTES.profile,
  assessment: ROUTES.assessment,
  recommendations: ROUTES.recommendations,
  calculator: ROUTES.calculator,
  savedPrograms: ROUTES.savedPrograms,
};

export interface AdmissionAlertTarget {
  institutionId: 'tau';
  programId: 'tau_cs';
}

const SAFE_APP_PATHS = new Set(Object.values(APP_AREA_ROUTES));
const SAFE_PUBLIC_PREFIXES = ['/programs/', '/institutions/'];
const INTERNAL_PREFIX = '/internal';
const ADMISSION_ALERT_INSTITUTION_PARAM = 'admissionAlertInstitution';
const ADMISSION_ALERT_PROGRAM_PARAM = 'admissionAlertProgram';

interface SafeNextPathOptions {
  defaultPath?: string;
  allowInternal?: boolean;
}

export function normalizeSafeNextPath(
  candidate: string | null | undefined,
  options: SafeNextPathOptions = {},
) {
  const defaultPath = options.defaultPath ?? ROUTES.home;
  const normalized = normalizeCandidate(candidate);

  if (!normalized) {
    return defaultPath;
  }

  if (isInternalPath(normalized)) {
    return options.allowInternal ? normalized : defaultPath;
  }

  if (!isAllowedReturnPath(normalized)) {
    return defaultPath;
  }

  return normalized;
}

function normalizeCandidate(candidate: string | null | undefined) {
  const raw = candidate?.trim();

  if (!raw) {
    return null;
  }

  const decoded = decodeRepeatedly(raw);

  if (!decoded || hasUnsafeCharacters(decoded)) {
    return null;
  }

  if (
    decoded.startsWith('//') ||
    /^[a-z][a-z\d+\-.]*:/i.test(decoded) ||
    decoded.includes('\\') ||
    hasTraversalSegment(decoded)
  ) {
    return null;
  }

  try {
    const url = new URL(decoded, 'https://toar.local');

    if (url.origin !== 'https://toar.local') {
      return null;
    }

    const normalized = `${url.pathname}${url.search}${url.hash}`;

    if (hasTraversalSegment(normalized)) {
      return null;
    }

    return normalized;
  } catch {
    return null;
  }
}

function decodeRepeatedly(value: string) {
  let decoded = value;

  for (let i = 0; i < 2; i += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) {
        return decoded;
      }
      decoded = next;
    } catch {
      return null;
    }
  }

  return decoded;
}

function hasUnsafeCharacters(value: string) {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

function hasTraversalSegment(path: string) {
  const [pathOnly] = path.split(/[?#]/);
  return pathOnly?.split('/').some((segment) => segment === '..') ?? true;
}

function isInternalPath(path: string) {
  return path === INTERNAL_PREFIX || path.startsWith(`${INTERNAL_PREFIX}/`);
}

function isAllowedReturnPath(path: string) {
  if (path === ROUTES.home) {
    return true;
  }

  if (SAFE_APP_PATHS.has(path) || parseAdmissionAlertIntent(path)) {
    return true;
  }

  return SAFE_PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function buildAdmissionAlertIntentPath(target: AdmissionAlertTarget) {
  const searchParams = new URLSearchParams({
    [ADMISSION_ALERT_INSTITUTION_PARAM]: target.institutionId,
    [ADMISSION_ALERT_PROGRAM_PARAM]: target.programId,
  });
  return `${ROUTES.profile}?${searchParams.toString()}`;
}

export function buildAdmissionAlertSignupPath(target: AdmissionAlertTarget) {
  return `${ROUTES.signup}?next=${encodeURIComponent(buildAdmissionAlertIntentPath(target))}`;
}

export function parseAdmissionAlertIntent(
  candidate: string | null | undefined,
): AdmissionAlertTarget | null {
  const normalized = normalizeCandidate(candidate);
  if (!normalized) {
    return null;
  }

  const url = new URL(normalized, 'https://toar.local');
  if (url.pathname !== ROUTES.profile || url.searchParams.size !== 2) {
    return null;
  }
  if (
    url.searchParams.get(ADMISSION_ALERT_INSTITUTION_PARAM) !== 'tau' ||
    url.searchParams.get(ADMISSION_ALERT_PROGRAM_PARAM) !== 'tau_cs'
  ) {
    return null;
  }

  return { institutionId: 'tau', programId: 'tau_cs' };
}
