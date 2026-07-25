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

    expect(workflow).toContain('environment: Preview – toar-academic-guide');
    expect(workflow).toContain(
      'VERCEL_AUTOMATION_BYPASS_SECRET: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}',
    );
    expect(playwrightConfig).toContain("'x-vercel-protection-bypass'");
    expect(playwrightConfig).toContain("'x-vercel-set-bypass-cookie': 'true'");
  });
});
