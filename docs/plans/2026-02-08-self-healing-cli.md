# Self-Healing CLI Implementation Plan

## Context

项目目标：构建一个 CI 自动修复 CLI 工具，包含两个命令：
- `collect`：运行 CI 命令并捕获日志到文件
- `heal`：将日志喂给 Copilot CLI 进行修复，验证通过则创建 PR，验证失败则在当前 PR 上留 comment

当前状态：项目骨架已就绪（Rslib + Rstest + Biome），`src/index.ts` 只有一个 placeholder 函数。`.github/workflows/copilot.yml` 有一个 shell 脚本版本的简易实现。

关键决定：
- **仅 CLI 工具**，不导出库 API
- **Node 22**（Copilot CLI 要求）
- **npm 安装 Copilot CLI**：`npm install -g @github/copilot`（替代 curl）
- **验证失败时只留 Comment**，不创建 WIP PR

---

## 文件结构

```
src/
  cli.ts                # CLI 入口（bin）
  commands/
    collect.ts          # collect 命令
    heal.ts             # heal 命令
  utils/
    exec.ts             # child_process 封装
    git.ts              # git 操作助手
    github.ts           # gh CLI 助手（PR、comment）
    logger.ts           # 日志输出
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

## Task 1: 项目配置 — bin 入口和构建配置

**修改文件：**
- `package.json` — 添加 `bin` 字段，移除 `exports`/`types`（仅 CLI）
- `rslib.config.ts` — 入口改为 `cli.ts`
- `tsconfig.json` — include 加入 `tests`

**要点：**
- `package.json` 中 `bin: { "self-healing": "./dist/cli.js" }`
- rslib `source.entry` 只需 `{ cli: './src/cli.ts' }`，无需 dts
- 构建后 `dist/cli.js` 需要可执行

**验证：** `pnpm build` 成功产出 `dist/cli.js`

---

## Task 2: exec 工具 — Shell 命令执行封装

**创建文件：** `src/utils/exec.ts`, `tests/utils/exec.test.ts`

**要点：**
- 封装 `execSync`，返回 `{ ok, stdout, stderr, exitCode }`
- 支持 `cwd` 和 `env` 选项
- 捕获异常返回错误信息而非抛出

**测试：**
- `exec('echo hello')` → ok=true, stdout 包含 "hello"
- `exec('exit 1')` → ok=false, exitCode≠0

---

## Task 3: logger 工具

**创建文件：** `src/utils/logger.ts`

**要点：** 简单封装 console，加 `[self-healing]` 前缀。无需测试。

---

## Task 4: collect 命令

**创建文件：** `src/commands/collect.ts`, `tests/commands/collect.test.ts`

**要点：**
- 接收 `{ command, outputFile }` 参数
- 用 exec 执行命令，将 stdout+stderr 合并写入文件
- 返回 `{ exitCode, logFile }`

**测试：**
- 成功命令：文件存在且包含输出，exitCode=0
- 失败命令：文件包含输出，exitCode≠0

---

## Task 5: git 助手

**创建文件：** `src/utils/git.ts`, `tests/utils/git.test.ts`

**要点：**
- `getCurrentBranch(cwd?)` — git branch --show-current
- `hasChanges(cwd?)` — git status --porcelain
- `createBranch(name, cwd?)` — git checkout -b
- `commitAll(message, cwd?)` — git add -A && git commit
- `push(branch, cwd?)` — git push origin
- `configBot(cwd?)` — 设置 CI bot 用户名/邮箱

**测试：** 在临时 git repo 中测试 `getCurrentBranch` 和 `hasChanges`

---

## Task 6: GitHub 助手

**创建文件：** `src/utils/github.ts`, `tests/utils/github.test.ts`

**要点：**
- `buildPrBody(options)` — 生成 PR markdown 内容
- `createPullRequest(options)` — 调用 `gh pr create`
- `commentOnCommit(options)` — 调用 `gh api` 在 commit 上留评论

**测试：** 只测试 `buildPrBody` 纯函数（gh 命令为集成测试）

---

## Task 7: heal 命令

**创建文件：** `src/commands/heal.ts`, `tests/commands/heal.test.ts`

**核心流程：**
1. 读取日志文件尾部 N 行
2. 构建 Copilot prompt
3. 配置 git bot 用户
4. 创建 fix 分支
5. 调用 `copilot --prompt "..." --yolo [--model xxx]`
6. 检查是否有文件变更
7. 如有变更，运行 verify 命令
8. **验证通过** → commit, push, 创建 PR
9. **验证失败** → 在当前 commit 上留 comment 说明修复建议
10. **无变更** → 留 comment 说明 Copilot 未产生修复

**可测试的纯函数：**
- `readLogTail(file, lines)` — 读取文件尾部行
- `buildCopilotPrompt({ errorLog, verifyCommand })` — 构建 prompt

---

## Task 8: CLI 入口

**创建文件：** `src/cli.ts`
**删除文件：** `src/index.ts`（不再需要库导出）
**删除文件：** `tests/index.test.ts`（placeholder 测试）

**要点：**
- shebang: `#!/usr/bin/env node`
- 用 `process.argv` 解析参数（不引入 CLI 框架）
- 两个子命令：
  - `self-healing collect --command <cmd> --output <file>`
  - `self-healing heal --log <file> --verify <cmd> [--model <model>] [--tail <lines>]`
- `--help` 打印帮助信息

---

## Task 9: GitHub Actions Workflow

**修改文件：** `.github/workflows/copilot.yml`

**关键变更：**
- Node 版本升级到 22
- 用 `npm install -g @github/copilot` 替代 curl 安装
- 用 `npx self-healing collect` 和 `npx self-healing heal` 替代内联脚本

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

## Task 10: Lint + 全量验证

- `pnpm run check` — Biome lint/format
- `pnpm test` — 全部测试通过
- `pnpm build` — 构建成功
- `node dist/cli.js --help` — 帮助信息正确
- `node dist/cli.js collect --command "echo hello" --output /tmp/test.log` — 冒烟测试

---

## Verification

1. `pnpm build` — 产出 `dist/cli.js`
2. `pnpm test` — 所有测试通过
3. `pnpm run check` — 无 lint 错误
4. `node dist/cli.js --help` — 显示帮助
5. `node dist/cli.js collect --command "echo ok" --output /tmp/shc.log` — 日志文件正确
6. 检查 `.github/workflows/copilot.yml` 语法正确
