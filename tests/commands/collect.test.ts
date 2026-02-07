import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@rstest/core';
import { collect } from '../../src/commands/collect';

test('collect writes stdout to log file on success', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shc-'));
  const logFile = path.join(tmpDir, 'output.log');

  const result = collect({
    command: 'echo "hello world"',
    outputFile: logFile,
  });

  expect(fs.existsSync(logFile)).toBe(true);
  const content = fs.readFileSync(logFile, 'utf-8');
  expect(content).toContain('hello world');
  expect(result.exitCode).toBe(0);

  fs.rmSync(tmpDir, { recursive: true });
});

test('collect captures failing command output', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shc-'));
  const logFile = path.join(tmpDir, 'output.log');

  const result = collect({
    command: 'echo "error info" && exit 1',
    outputFile: logFile,
  });

  expect(fs.existsSync(logFile)).toBe(true);
  const content = fs.readFileSync(logFile, 'utf-8');
  expect(content).toContain('error info');
  expect(result.exitCode).not.toBe(0);

  fs.rmSync(tmpDir, { recursive: true });
});
