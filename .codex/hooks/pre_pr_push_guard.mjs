#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

function readHookInput() {
  const rawInput = readFileSync(0, 'utf8').trim();
  if (!rawInput) {
    return {};
  }

  try {
    return JSON.parse(rawInput);
  } catch {
    return {};
  }
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      CODEX_PRE_PR_PUSH_GUARD: '1',
    },
    shell: process.platform === 'win32',
    stdio: 'pipe',
  });
}

function findGitRoot(cwd) {
  const result = run('git', ['rev-parse', '--show-toplevel'], { cwd });
  if (result.status !== 0) {
    return null;
  }

  return result.stdout.trim() || null;
}

function isProtectedCommand(command) {
  const commandBoundary = String.raw`(?:^|[;&|()\n]\s*)`;
  const optionalEnv = String.raw`(?:env\s+)?(?:[A-Za-z_][A-Za-z0-9_]*=\S+\s+)*`;
  const optionalCommand = String.raw`(?:command\s+)?`;
  const gitPush = new RegExp(`${commandBoundary}${optionalEnv}${optionalCommand}git\\s+push\\b`);
  const ghPrCreate = new RegExp(
    `${commandBoundary}${optionalEnv}${optionalCommand}gh\\s+pr\\s+(?:create|ready)\\b`,
  );

  if (gitPush.test(command)) {
    return 'git push';
  }

  if (ghPrCreate.test(command)) {
    return 'gh pr create/ready';
  }

  return null;
}

function findBypass(command) {
  if (/(?:^|[\s;&|()])--no-verify(?:$|[\s;&|()])/.test(command)) {
    return '`--no-verify` bypasses repository hooks';
  }

  if (/(?:^|[;&|()\s])SKIP_PRE_PR_GUARD\s*=\s*(?:1|true)\b/i.test(command)) {
    return '`SKIP_PRE_PR_GUARD` bypasses the repository guard';
  }

  return null;
}

function deny(message, details = '') {
  const suffix = details ? `\n\n${details}` : '';
  process.stderr.write(`${message}${suffix}\n`);
  process.exit(2);
}

function summarizeOutput(result) {
  const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
  if (output.length <= 12000) {
    return output;
  }

  return output.slice(output.length - 12000);
}

const input = readHookInput();
const command = input?.tool_input?.command;

if (typeof command !== 'string') {
  process.exit(0);
}

const protectedCommand = isProtectedCommand(command);
if (!protectedCommand) {
  process.exit(0);
}

const bypassReason = findBypass(command);
if (bypassReason) {
  deny(`Codex blocked ${protectedCommand}: ${bypassReason}. Run npm run guard:pre-pr first.`);
}

const repoRoot = findGitRoot(input.cwd || process.cwd());
if (!repoRoot) {
  process.exit(0);
}

const guardScriptPath = join(repoRoot, 'scripts/pre-pr-guard.mjs');
if (!existsSync(guardScriptPath)) {
  deny(`Codex blocked ${protectedCommand}: scripts/pre-pr-guard.mjs is missing.`);
}

const guardResult = run('npm', ['run', 'guard:pre-pr'], { cwd: repoRoot });
if (guardResult.status !== 0) {
  deny(
    `Codex blocked ${protectedCommand}: npm run guard:pre-pr failed.`,
    summarizeOutput(guardResult),
  );
}

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      additionalContext: `npm run guard:pre-pr passed before ${protectedCommand}.`,
    },
  }),
);
