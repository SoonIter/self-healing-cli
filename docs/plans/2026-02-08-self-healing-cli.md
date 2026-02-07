# Self-Healing CLI Implementation Plan

## Context

Goal: Build a CI auto-fix CLI tool with two commands:

- `collect`: Run a CI command and capture logs to a file
- `heal`: Feed logs to Copilot CLI for auto-fix, create a PR if verification passes, or leave a comment on the current commit if it fails

Initial state: Project skeleton is ready (Rslib + Rstest + Biome), `src/index.ts` only has a placeholder function. `.github/workflows/copilot.yml` has a simple shell-script implementation.

Key decisions:

- **CLI-only** — no library API exports
- **Node 22** (required by Copilot CLI)
- **Install Copilot CLI via npm**: `npm install -g @github/copilot` (instead of curl)
- **Comment only on verification failure** — do not create a WIP PR

---

## File Structure

```text
src/
  cli.ts                # CLI entry point (bin)
  commands/
    collect.ts          # collect command
    heal.ts             # heal command
  utils/
    exec.ts             # child_process wrapper
    git.ts              # git operation helpers
    github.ts           # gh CLI helpers (PR, comment)
    logger.ts           # log output
tests/
  commands/
    collect.test.ts
    heal.test.ts
  utils/
    exec.test.ts
    git.test.ts
    github.test.ts
```

---

## Task 1: Project Config — bin Entry and Build Config

**Modified files:**

- `package.json` — add `bin` field, remove `exports`/`types` (CLI-only)
- `rslib.config.ts` — change entry to `cli.ts`
- `tsconfig.json` — add `tests` to `include`

**Key points:**

- `package.json`: `bin: { "self-healing": "./dist/cli.js" }`
- rslib `source.entry` only needs `{ cli: './src/cli.ts' }`, no dts
- `dist/cli.js` must be executable after build

**Verification:** `pnpm build` successfully produces `dist/cli.js`

---

## Task 2: exec Utility — Shell Command Execution Wrapper

**Created files:** `src/utils/exec.ts`, `tests/utils/exec.test.ts`

**Key points:**

- Wrap `execSync`, return `{ ok, stdout, stderr, exitCode }`
- Support `cwd` and `env` options
- Catch exceptions and return error info instead of throwing

**Tests:**

- `exec('echo hello')` → ok=true, stdout contains "hello"
- `exec('exit 1')` → ok=false, exitCode !== 0

---

## Task 3: Logger Utility

**Created file:** `src/utils/logger.ts`

**Key points:** Simple console wrapper with `[self-healing]` prefix. No tests needed.

---

## Task 4: collect Command

**Created files:** `src/commands/collect.ts`, `tests/commands/collect.test.ts`

**Key points:**

- Accept `{ command, outputFile }` params
- Execute command via exec, write combined stdout+stderr to file
- Return `{ exitCode, logFile }`

**Tests:**

- Successful command: file exists and contains output, exitCode=0
- Failing command: file contains output, exitCode !== 0

---

## Task 5: Git Helpers

**Created files:** `src/utils/git.ts`, `tests/utils/git.test.ts`

**Key points:**

- `getCurrentBranch(cwd?)` — git branch --show-current
- `hasChanges(cwd?)` — git status --porcelain
- `createBranch(name, cwd?)` — git checkout -b
- `commitAll(message, cwd?)` — git add -A && git commit
- `push(branch, cwd?)` — git push origin
- `configBot(cwd?)` — set CI bot username/email

**Tests:** Test `getCurrentBranch` and `hasChanges` in a temp git repo

---

## Task 6: GitHub Helpers

**Created files:** `src/utils/github.ts`, `tests/utils/github.test.ts`

**Key points:**

- `buildPrBody(options)` — generate PR markdown body
- `createPullRequest(options)` — call `gh pr create`
- `commentOnCommit(options)` — call `gh api` to comment on a commit

**Tests:** Only test `buildPrBody` pure function (gh commands are integration tests)

---

## Task 7: heal Command

**Created files:** `src/commands/heal.ts`, `tests/commands/heal.test.ts`

**Core flow:**

1. Read the last N lines of the log file
2. Build a Copilot prompt
3. Configure git bot user
4. Create a fix branch
5. Run `copilot --prompt "..." --yolo [--model xxx]`
6. Check for file changes
7. If changes exist, run the verify command
8. **Verification passes** → commit, push, create PR
9. **Verification fails** → comment on the current commit with fix suggestions
10. **No changes** → comment that Copilot produced no fix

**Testable pure functions:**

- `readLogTail(file, lines)` — read tail lines of a file
- `buildCopilotPrompt({ errorLog, verifyCommand })` — build prompt string

---

## Task 8: CLI Entry Point

**Created file:** `src/cli.ts`
**Deleted files:** `src/index.ts` (library export no longer needed), `tests/index.test.ts` (placeholder test)

**Key points:**

- Shebang: `#!/usr/bin/env node`
- Parse args with `process.argv` (no CLI framework)
- Two subcommands:
  - `self-healing collect --command <cmd> --output <file>`
  - `self-healing heal --log <file> --verify <cmd> [--model <model>] [--tail <lines>]`
- `--help` prints usage information

---

## Task 9: GitHub Actions Workflow

**Modified file:** `.github/workflows/copilot.yml`

**Key changes:**

- Upgrade Node to 22
- Use `npm install -g @github/copilot` instead of curl
- Replace inline scripts with `npx self-healing collect` and `npx self-healing heal`

```yaml
- name: Install Copilot CLI
  run: npm install -g @github/copilot

- name: Collect logs
  id: collect
  continue-on-error: true
  run: npx self-healing collect --command "pnpm run check" --output check.log

- name: Heal
  if: steps.collect.outcome == 'failure'
  run: npx self-healing heal --log check.log --verify "pnpm run check"
```

---

## Task 10: Lint + Full Verification

- `pnpm run check` — Biome lint/format
- `pnpm test` — all tests pass
- `pnpm build` — build succeeds
- `node dist/cli.js --help` — help message is correct
- `node dist/cli.js collect --command "echo hello" --output /tmp/test.log` — smoke test

---

## Verification

1. `pnpm build` — produces `dist/cli.js`
2. `pnpm test` — all tests pass
3. `pnpm run check` — no lint errors
4. `node dist/cli.js --help` — displays help
5. `node dist/cli.js collect --command "echo ok" --output /tmp/shc.log` — log file is correct
6. Verify `.github/workflows/copilot.yml` syntax is valid
