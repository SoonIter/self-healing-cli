const prefix = '[self-healing]';

export const logger = {
  info: (...args: unknown[]) => console.log(prefix, ...args),
  error: (...args: unknown[]) => console.error(prefix, 'ERROR:', ...args),
  success: (...args: unknown[]) => console.log(prefix, '✓', ...args),
};
