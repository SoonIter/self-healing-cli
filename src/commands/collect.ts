import fs from 'node:fs';
import path from 'node:path';
import { exec } from '../utils/exec';
import { logger } from '../utils/logger';

export type CollectOptions = {
  command: string;
  outputFile: string;
};

export type CollectResult = {
  exitCode: number;
  logFile: string;
};

export const collect = (options: CollectOptions): CollectResult => {
  const { command, outputFile } = options;

  logger.info(`Running: ${command}`);

  const result = exec(`${command} 2>&1`);
  const output = result.stdout + result.stderr;

  const dir = path.dirname(outputFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputFile, output, 'utf-8');
  logger.info(`Log saved to ${outputFile} (exit code: ${result.exitCode})`);

  return {
    exitCode: result.exitCode,
    logFile: outputFile,
  };
};
