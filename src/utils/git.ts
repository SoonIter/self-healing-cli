import { exec } from './exec';

export const getCurrentBranch
  = (cwd?: string): string => {
  const result = exec('git branch --show-current', { cwd });
  return result.stdout.trim();
};

export const hasChanges = (cwd?: string): boolean => {
  const result = exec('git status --porcelain', { cwd });
  return result.stdout.trim().length > 0;
};

export const createBranch = (name: string, cwd?: string): void => {
  exec(`git checkout -b ${name}`, { cwd });
};

export const commitAll = (message: string, cwd?: string): void => {
  exec('git add -A', { cwd });
  exec(`git commit -m "${message}"`, { cwd });
};

export const push = (branch: string, cwd?: string): void => {
  exec(`git push origin ${branch}`, { cwd });
};

export const configBot = (cwd?: string): void => {
  exec('git config user.name "github-actions[bot]"', { cwd });
  exec('git config user.email "github-actions[bot]@users.noreply.github.com"', {
    cwd,
  });
};
