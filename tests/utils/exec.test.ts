import { expect, test } from '@rstest/core';
import { exec } from '../../src/utils/exec';

test('exec returns stdout on success', () => {
  const result = exec('echo hello');
  expect(result.ok).toBe(true);
  expect(result.stdout.trim()).toBe('hello');
  expect(result.exitCode).toBe(0);
});

test('exec returns error on failure', () => {
  const result = exec('exit 1');
  expect(result.ok).toBe(false);
  expect(result.exitCode).not.toBe(0);
});

test('exec supports cwd option', () => {
  const result = exec('pwd', { cwd: '/tmp' });
  expect(result.ok).toBe(true);
  expect(result.stdout.trim()).toContain('tmp');
});
