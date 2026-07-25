import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('Vercel preview Playwright workflow', () => {
  it('accepts Vercel project-qualified Preview environments for the intended project', () => {
    const workflow = readFileSync('.github/workflows/playwright-preview.yml', 'utf8');

    expect(workflow).toContain("startsWith(github.event.deployment_status.environment, 'Preview')");
    expect(workflow).toContain(
      "contains(github.event.deployment_status.target_url, 'toar-academic-guide')",
    );
  });
});
