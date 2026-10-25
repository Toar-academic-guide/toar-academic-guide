import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('Vercel preview Playwright workflow', () => {
  it('accepts Vercel project-qualified Preview environments for the intended project', () => {
    const workflow = readFileSync('.github/workflows/playwright-preview.yml', 'utf8');

    expect(workflow).toContain(
      "github.event.deployment_status.environment == 'Preview – toar-academic-guide'",
    );
    expect(workflow).toContain(
      "contains(github.event.deployment_status.target_url, 'toar-academic-guide')",
    );
  });

  it('uses the intended protected environment and forwards its automation bypass secret', () => {
    const workflow = readFileSync('.github/workflows/playwright-preview.yml', 'utf8');
    const playwrightConfig = readFileSync('playwright.config.ts', 'utf8');

    expect(workflow).toContain('environment: preview-e2e');
    expect(workflow).toContain(
      "contains(github.event.deployment_status.target_url, '.vercel.app')",
    );
    expect(workflow).toContain(
      'VERCEL_AUTOMATION_BYPASS_SECRET: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}',
    );
    expect(workflow).toContain('path: test-results/');
    expect(playwrightConfig).toContain("'x-vercel-protection-bypass'");
    expect(playwrightConfig).not.toContain("'x-vercel-set-bypass-cookie'");
  });

  it('keeps spec-specific protection bypass headers free of cookie-setting redirects', () => {
    const spec = readFileSync('e2e/official-requirements-5.spec.ts', 'utf8');

    expect(spec).toContain("'x-vercel-protection-bypass'");
    expect(spec).not.toContain("'x-vercel-set-bypass-cookie'");
  });
});
