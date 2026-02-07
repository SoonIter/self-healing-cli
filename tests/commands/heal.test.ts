import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@rstest/core';
import { buildCopilotPrompt, readLogTail } from '../../src/commands/heal';

test('readLogTail returns last N lines of log file', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shc-'));
  const logFile = path.join(tmpDir, 'test.log');
  const lines = Array.from({ length: 200 }, (_, i) => `line ${i + 1}`);
  fs.writeFileSync(logFile, lines.join('\n'));

  const tail = readLogTail(logFile, 50);
  const tailLines = tail.split('\n').filter(Boolean);
  expect(tailLines.length).toBeLessThanOrEqual(50);
  expect(tail).toContain('line 200');
  expect(tail).not.toContain('line 100');

  fs.rmSync(tmpDir, { recursive: true });
});

test('readLogTail handles file with fewer lines than requested', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shc-'));
  const logFile = path.join(tmpDir, 'short.log');
  fs.writeFileSync(logFile, 'line 1\nline 2\nline 3');

  const tail = readLogTail(logFile, 100);
  expect(tail).toContain('line 1');
  expect(tail).toContain('line 3');

  fs.rmSync(tmpDir, { recursive: true });
});

test('buildCopilotPrompt includes error log and verify command', () => {
  const prompt = buildCopilotPrompt({
    errorLog: 'TypeError: x is not a function',
    verifyCommand: 'pnpm run check',
  });
  expect(prompt).toContain('TypeError: x is not a function');
  expect(prompt).toContain('pnpm run check');
  expect(prompt).toContain('Analyze');
});
