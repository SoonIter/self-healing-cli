#!/usr/bin/env node

import { collect } from './commands/collect';
import { heal } from './commands/heal';
import { logger } from './utils/logger';

const args = process.argv.slice(2);
const command = args[0];

const getFlag = (name: string): string | undefined => {
  const index = args.indexOf(`--${name}`);
  if (index === -1 || index + 1 >= args.length) return undefined;
  return args[index + 1];
};

const printHelp = () => {
  console.log(`
self-healing-cli

Usage:
  self-healing collect --command <cmd> --output <file>
  self-healing heal --log <file> --verify <cmd> [--model <model>] [--tail <lines>]

Commands:
  collect   Run a command and save output to a log file
  heal      Feed log to Copilot CLI, verify fix, create PR or comment

Options:
  --command   Command to run (collect)
  --output    Output log file path (collect)
  --log       Input log file path (heal)
  --verify    Verification command (heal)
  --model     Copilot model to use (heal, optional)
  --tail      Number of log lines to send (heal, default: 100)
  --help      Show this help message
`);
};

if (!command || command === '--help' || command === '-h') {
  printHelp();
  process.exit(0);
}

if (command === 'collect') {
  const cmd = getFlag('command');
  const output = getFlag('output');
  if (!cmd || !output) {
    logger.error('collect requires --command and --output');
    process.exit(1);
  }
  const result = collect({ command: cmd, outputFile: output });
  process.exit(result.exitCode);
}

if (command === 'heal') {
  const logFile = getFlag('log');
  const verify = getFlag('verify');
  if (!logFile || !verify) {
    logger.error('heal requires --log and --verify');
    process.exit(1);
  }
  const tailStr = getFlag('tail');
  const result = heal({
    logFile,
    verifyCommand: verify,
    model: getFlag('model'),
    tailLines: tailStr ? Number(tailStr) : undefined,
  });
  process.exit(result.fixed ? 0 : 1);
}

logger.error(`Unknown command: ${command}`);
printHelp();
process.exit(1);
