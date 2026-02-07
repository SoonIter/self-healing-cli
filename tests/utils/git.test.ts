import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@rstest/core';
import { exec } from '../../src/utils/exec';
import { getCurrentBranch, hasChanges } from '../../src/utils/git';

function createTempGitRepo(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shc-git-'));
  exec('git init', { cwd: tmpDir });
  exec('git config user.email "test@test.com"', { cwd: tmpDir });
  exec('git config user.name "Test"', { cwd: tmpDir });
  fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'init');
  exec('git add . && git commit -m "init"', { cwd: tmpDir });
  return tmpDir;
}

test('getCurrentBranch returns branch name', () => {
  const repo = createTempGitRepo();
  const branch = getCurrentBranch(repo);
  expect(typeof branch).toBe('string');
  expect(branch.length).toBeGreaterThan(0);
  fs.rmSync(repo, { recursive: true });
});

test('hasChanges detects modified files', () => {
  const repo = createTempGitRepo();
  expect(hasChanges(repo)).toBe(false);
  fs.writeFileSync(path.join(repo, 'file.txt'), 'changed');
  expect(hasChanges(repo)).toBe(true);
  fs.rmSync(repo, { recursive: true });
});
