import { describe, expect, it } from 'vitest';

import { APP_AREA_ROUTES, ROUTES, normalizeSafeNextPath } from './routes';

describe('route contract', () => {
  it('maps durable app areas to stable paths', () => {
    expect(APP_AREA_ROUTES.profile).toBe('/app/profile');
    expect(APP_AREA_ROUTES.assessment).toBe('/app/assessment');
    expect(APP_AREA_ROUTES.recommendations).toBe('/app/recommendations');
    expect(APP_AREA_ROUTES.calculator).toBe('/app/calculator');
    expect(APP_AREA_ROUTES.savedPrograms).toBe('/app/saved-programs');
  });

  it('accepts safe local return paths', () => {
    expect(normalizeSafeNextPath('/')).toBe(ROUTES.home);
    expect(normalizeSafeNextPath('/app/saved-programs')).toBe(ROUTES.savedPrograms);
    expect(normalizeSafeNextPath('/programs/technion-computer-science')).toBe(
      '/programs/technion-computer-science',
    );
    expect(normalizeSafeNextPath('/institutions/technion')).toBe('/institutions/technion');
  });

  it('falls back for hostile or malformed return paths', () => {
    const hostileValues = [
      '',
      '   ',
      'https://evil.example',
      '//evil.example',
      'javascript:alert(1)',
      '%2F%2Fevil.example',
      '%E0%A4%A',
      '/app/%2e%2e/internal/data-health',
      '/app/../internal/data-health',
      '\\evil',
    ];

    hostileValues.forEach((value) => {
      expect(normalizeSafeNextPath(value)).toBe(ROUTES.home);
    });
  });

  it('rejects internal operator paths by default', () => {
    expect(normalizeSafeNextPath('/internal/data-health')).toBe(ROUTES.home);
  });

  it('can explicitly allow internal operator paths for internal-only call sites', () => {
    expect(normalizeSafeNextPath('/internal/data-health', { allowInternal: true })).toBe(
      '/internal/data-health',
    );
  });

  it('rejects traversal-shaped paths before URL normalization', () => {
    expect(normalizeSafeNextPath('/app/../programs/cs')).toBe(ROUTES.home);
    expect(normalizeSafeNextPath('/app/%2e%2e/programs/cs')).toBe(ROUTES.home);
  });
});
