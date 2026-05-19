import type { GeographicRegion } from '@/types';
import { INSTITUTIONS } from '@/data/institutions';

// ── Institution → region map ──────────────────────────────────────────────────
// Auto-derived from the master INSTITUTIONS dictionary so that a single source
// of truth (institutions.ts) drives all region-based logic.
// Any institution not in the master dict is treated as 'any'.
export const INSTITUTION_REGIONS: Record<string, GeographicRegion> = Object.fromEntries(
  INSTITUTIONS.map((inst) => [inst.name, inst.region]),
);

// ── Display helpers ───────────────────────────────────────────────────────────

export const REGION_LABEL: Record<GeographicRegion, string> = {
  center: 'מרכז',
  north:  'צפון',
  south:  'דרום',
  any:    '',
};

export const REGION_EMOJI: Record<GeographicRegion, string> = {
  center: '🏙️',
  north:  '🏔️',
  south:  '🌞',
  any:    '',
};

export const REGION_BADGE_COLOR: Record<GeographicRegion, string> = {
  center: 'bg-blue-50   text-blue-700',
  north:  'bg-emerald-50 text-emerald-700',
  south:  'bg-amber-50  text-amber-700',
  any:    '',
};
