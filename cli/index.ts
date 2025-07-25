#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import createCommand from './commands/create.js';
import configureCommand from './commands/configure.js';
import listCommand from './commands/list.js';
import updateCommand from './commands/update.js';
import deleteCommand from './commands/delete.js';
import validateCommand from './commands/validate.js';
import batchCommand from './commands/batch.js';
import templateCommand from './commands/template.js';
import testCommand from './commands/test.js';

const program = new Command();

program
  .name('amazon-harness')
  .description('CLI tool for creating Amazon wire harness listings')
  .version('1.0.0');

// Global error handler
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

// Add commands
program.addCommand(createCommand);
program.addCommand(updateCommand);
program.addCommand(listCommand);
program.addCommand(deleteCommand);
program.addCommand(validateCommand);
program.addCommand(batchCommand);
program.addCommand(templateCommand);
program.addCommand(configureCommand);
program.addCommand(testCommand);

// Handle unknown commands
program.on('command:*', () => {
  console.error(chalk.red('Invalid command: %s\nSee --help for a list of available commands.'), program.args.join(' '));
  process.exit(1);
});

program.parse(process.argv);