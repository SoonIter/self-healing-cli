import { execSync } from 'node:child_process';

export type ExecResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
};

export const exec = (
  command: string,
  options?: { cwd?: string; env?: Record<string, string> },
): ExecResult => {
  try {
    const stdout = execSync(command, {
      cwd: options?.cwd,
      env: options?.env ? { ...process.env, ...options.env } : undefined,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { ok: true, stdout, stderr: '', exitCode: 0 };
  } catch (error: unknown) {
    const err = error as {
      stdout?: string;
      stderr?: string;
      status?: number;
    };
    return {
      ok: false,
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
      exitCode: err.status ?? 1,
    };
  }
};
