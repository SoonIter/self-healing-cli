# self-healing-cli

A CI auto-fix CLI tool powered by [GitHub Copilot CLI](https://github.com/github/copilot). When your CI fails, it captures the error logs, asks Copilot to fix them, verifies the fix, and creates a PR — or leaves a comment if the fix doesn't work.

## How It Works

```
CI command fails
       |
       v
  +---------+     +-----------+     +----------+
  | collect |---->|   heal    |---->| Copilot  |
  | (logs)  |     | (analyze) |     | (fix)    |
  +---------+     +-----------+     +----------+
                       |
                       v
                  Has changes?
                  /         \
                yes          no
                /              \
           Verify          Comment:
           command         "no changes"
           /    \
        pass    fail
        /          \
   Create PR    Comment:
               "needs review"
```

## Install

```bash
pnpm install
pnpm build
```

## Usage

### `collect` — Capture CI logs

Run a command and save its output to a file. Exits with the command's exit code.

```bash
self-healing collect --command <cmd> --output <file>
```

| Option | Description |
|---|---|
| `--command` | Command to run |
| `--output` | Output log file path |

Example:

```bash
self-healing collect --command "pnpm run check" --output check.log
```

### `heal` — Auto-fix with Copilot

Read a log file, send it to Copilot CLI for analysis, verify the fix, and create a PR or comment.

```bash
self-healing heal --log <file> --verify <cmd> [--model <model>] [--tail <lines>]
```

| Option | Description | Default |
|---|---|---|
| `--log` | Input log file path | (required) |
| `--verify` | Command to verify the fix | (required) |
| `--model` | Copilot model to use | Copilot default |
| `--tail` | Number of log lines to send | `100` |

Example:

```bash
self-healing heal --log check.log --verify "pnpm run check" --model gpt-5.2
```

## GitHub Actions

### Auto-heal on lint/test failure

```yaml
# .github/workflows/lint.yml
- name: Lint
  id: lint
  continue-on-error: true
  run: npx self-healing collect --command "pnpm run check" --output lint.log

- name: Heal lint
  if: steps.lint.outcome == 'failure'
  env:
    COPILOT_GITHUB_TOKEN: ${{ secrets.COPILOT_GITHUB_TOKEN }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    npm install -g @github/copilot
    npx self-healing heal --log lint.log --verify "pnpm run check"
```

### Manual dispatch

The `copilot.yml` workflow supports `workflow_dispatch` with custom `command` and `verify` inputs, so you can trigger a heal run from the GitHub Actions UI for any command.

## Prerequisites

- Node.js >= 22
- [GitHub Copilot CLI](https://github.com/github/copilot) (`npm install -g @github/copilot`)
- [GitHub CLI](https://cli.github.com/) (`gh`) — for creating PRs and comments
- `COPILOT_GITHUB_TOKEN` secret in your repo

## Development

```bash
pnpm install        # install dependencies
pnpm dev            # watch mode
pnpm build          # build
pnpm test           # run tests
pnpm run check      # lint + format (biome)
```

## Tech Stack

- TypeScript (ESM)
- [Rslib](https://rslib.rs/) — build
- [Rstest](https://rstest.rs/) — test
- [Biome](https://biomejs.dev/) — lint & format

## License

MIT
