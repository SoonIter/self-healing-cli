import fs from 'node:fs';
import { exec } from '../utils/exec';
import {
  commitAll,
  configBot,
  createBranch,
  getCurrentBranch,
  hasChanges,
  push,
} from '../utils/git';
import {
  buildPrBody,
  commentOnCommit,
  createPullRequest,
} from '../utils/github';
import { logger } from '../utils/logger';

export const readLogTail = (logFile: string, lines: number): string => {
  const content = fs.readFileSync(logFile, 'utf-8');
  const allLines = content.split('\n');
  return allLines.slice(-lines).join('\n');
};

export const buildCopilotPrompt = (options: {
  errorLog: string;
  verifyCommand: string;
}): string => {
  return [
    'Analyze this CI failure and fix it.',
    'After applying fixes, verify by running:',
    `  ${options.verifyCommand}`,
    '',
    'Error log:',
    options.errorLog,
  ].join('\n');
};

export type HealOptions = {
  logFile: string;
  verifyCommand: string;
  tailLines?: number;
  model?: string;
};

export type HealResult = {
  fixed: boolean;
  prUrl?: string;
  comment?: string;
};

export const heal = (options: HealOptions): HealResult => {
  const { logFile, verifyCommand, tailLines = 100, model } = options;

  // 1. Read log tail
  const errorLog = readLogTail(logFile, tailLines);
  logger.info(`Read ${tailLines} lines from ${logFile}`);

  // 2. Build prompt
  const prompt = buildCopilotPrompt({ errorLog, verifyCommand });

  // 3. Save current branch and get current commit SHA
  const baseBranch = getCurrentBranch();
  const shaResult = exec('git rev-parse HEAD');
  const commitSha = shaResult.stdout.trim();
  const fixBranch = `auto-fix/self-healing-${Date.now()}`;

  // 4. Configure git bot
  configBot();

  // 5. Create fix branch
  createBranch(fixBranch);
  logger.info(`Created branch: ${fixBranch}`);

  // 6. Run Copilot CLI
  logger.info('Asking Copilot to analyze and fix...');
  const modelFlag = model ? ` --model ${model}` : '';
  const escapedPrompt = prompt.replace(/"/g, '\\"');
  const copilotResult = exec(
    `copilot --prompt "${escapedPrompt}" --yolo${modelFlag}`,
  );

  if (!copilotResult.ok) {
    logger.error('Copilot CLI failed:', copilotResult.stderr);
    const body = `## Self-Healing CLI\n\nCopilot CLI failed to run.\n\n\`\`\`\n${copilotResult.stderr}\n\`\`\``;
    commentOnCommit({ sha: commitSha, body });
    return { fixed: false, comment: body };
  }

  // 7. Check for changes
  if (!hasChanges()) {
    logger.info('Copilot made no file changes');
    const body =
      '## Self-Healing CLI\n\nCopilot analyzed the failure but did not produce any file changes.';
    commentOnCommit({ sha: commitSha, body });
    return { fixed: false, comment: body };
  }

  // 8. Verify the fix
  logger.info(`Verifying fix with: ${verifyCommand}`);
  const verifyResult = exec(verifyCommand);

  if (verifyResult.ok) {
    // 9. Verification passed → commit, push, create PR
    logger.success('Fix verified!');
    commitAll(
      'fix: auto-fix CI failure\n\nApplied by self-healing-cli via Copilot.',
    );
    push(fixBranch);

    const prBody = buildPrBody({
      baseBranch,
      logSnippet: errorLog.slice(-2000),
    });
    const prUrl = createPullRequest({
      title: `fix: auto-heal CI failure on ${baseBranch}`,
      body: prBody,
      base: baseBranch,
      head: fixBranch,
    });

    logger.success(`PR created: ${prUrl}`);
    return { fixed: true, prUrl };
  }

  // 10. Verification failed → comment on commit
  logger.error('Fix did not pass verification');
  const body = `## Self-Healing CLI\n\nCopilot suggested a fix but it did not pass verification (\`${verifyCommand}\`).\n\nPlease review manually.\n\n### Verification output\n\`\`\`\n${verifyResult.stdout + verifyResult.stderr}\n\`\`\``;
  commentOnCommit({ sha: commitSha, body });
  return { fixed: false, comment: body };
};
