import { expect, test } from '@rstest/core';
import { buildPrBody } from '../../src/utils/github';

test('buildPrBody generates markdown body', () => {
  const body = buildPrBody({
    baseBranch: 'main',
    logSnippet: 'Error: module not found',
  });
  expect(body).toContain('main');
  expect(body).toContain('module not found');
  expect(body).toContain('Auto-generated');
});

test('buildPrBody includes log snippet in code block', () => {
  const body = buildPrBody({
    baseBranch: 'develop',
    logSnippet: 'TypeError: x is not a function',
  });
  expect(body).toContain('```');
  expect(body).toContain('TypeError: x is not a function');
  expect(body).toContain('self-healing-cli');
});
