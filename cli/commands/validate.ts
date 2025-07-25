#!/usr/bin/env tsx

import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { YAMLParser } from '../../utils/yaml-parser.js';
import { validateHarnessConfig } from '../../utils/validator.js';

interface ValidateOptions {
  verbose?: boolean;
  strict?: boolean;
  format?: 'table' | 'json';
}

const validateCommand = new Command('validate')
  .description('Validate YAML configuration file')
  .argument('<config-file>', 'Path to YAML configuration file')
  .option('-v, --verbose', 'Show detailed validation information')
  .option('-s, --strict', 'Treat warnings as errors')
  .option('-f, --format <format>', 'Output format (table, json)', 'table')
  .action(async (configFile: string, options: ValidateOptions) => {
    try {
      console.log(chalk.blue('🔍 Amazon Listing Configuration Validator\n'));

      // Check if file exists
      const configPath = resolve(configFile);
      if (!existsSync(configPath)) {
        console.error(chalk.red(`❌ Configuration file not found: ${configPath}`));
        process.exit(1);
      }

      console.log(chalk.yellow(`📄 Validating: ${configPath}`));

      // Parse YAML file
      const yamlParser = new YAMLParser();
      let config;
      
      try {
        config = await yamlParser.parseFile(configPath);
        console.log(chalk.green('✅ YAML syntax is valid'));
      } catch (error) {
        console.log(chalk.red('❌ YAML parsing failed:'));
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
      }

      // Validate configuration
      console.log(chalk.yellow('\n🔍 Validating configuration...'));
      const validationResult = await validateHarnessConfig(config);

      // Output results based on format
      if (options.format === 'json') {
        console.log(JSON.stringify({
          valid: validationResult.isValid,
          errors: validationResult.errors,
          warnings: validationResult.warnings || [],
          summary: {
            errorCount: validationResult.errors.length,
            warningCount: validationResult.warnings?.length || 0
          }
        }, null, 2));
        return;
      }

      // Table format output
      if (validationResult.errors.length === 0 && (validationResult.warnings?.length ?? 0) === 0) {
        console.log(chalk.green('\n🎉 Configuration is perfect!'));
        console.log(chalk.gray('No errors or warnings found. Ready for Amazon listing creation.'));
        return;
      }

      let hasIssues = false;

      // Show errors
      if (validationResult.errors.length > 0) {
        hasIssues = true;
        console.log(chalk.red(`\n❌ ${validationResult.errors.length} Error(s) Found:`));
        console.log(chalk.red('═'.repeat(50)));
        
        validationResult.errors.forEach((error, index) => {
          console.log(chalk.red(`${index + 1}. ${error.field}`));
          console.log(chalk.red(`   ${error.message}`));
          if (error.value !== undefined && options.verbose) {
            console.log(chalk.gray(`   Current value: ${JSON.stringify(error.value)}`));
          }
          console.log('');
        });
      }

      // Show warnings
      if (validationResult.warnings && validationResult.warnings.length > 0) {
        console.log(chalk.yellow(`\n⚠️  ${validationResult.warnings.length} Warning(s) Found:`));
        console.log(chalk.yellow('═'.repeat(50)));
        
        validationResult.warnings.forEach((warning, index) => {
          console.log(chalk.yellow(`${index + 1}. ${warning}`));
        });
        console.log('');
      }

      // Summary
      console.log(chalk.blue('📊 Validation Summary:'));
      console.log(chalk.blue('─'.repeat(25)));
      
      if (validationResult.errors.length > 0) {
        console.log(chalk.red(`❌ Errors: ${validationResult.errors.length}`));
      } else {
        console.log(chalk.green(`✅ Errors: 0`));
      }
      
      if (validationResult.warnings && validationResult.warnings.length > 0) {
        console.log(chalk.yellow(`⚠️  Warnings: ${validationResult.warnings.length}`));
      } else {
        console.log(chalk.green(`✅ Warnings: 0`));
      }

      // Overall status
      const warningCount = validationResult.warnings?.length ?? 0;
      if (validationResult.isValid && (!options.strict || warningCount === 0)) {
        console.log(chalk.green('\n🎯 Status: READY FOR AMAZON LISTING'));
        if (warningCount > 0 && !options.strict) {
          console.log(chalk.gray('Note: Warnings present but configuration is still valid'));
        }
      } else if (validationResult.isValid && options.strict && warningCount > 0) {
        console.log(chalk.red('\n🚫 Status: FAILED (strict mode - warnings treated as errors)'));
        process.exit(1);
      } else {
        console.log(chalk.red('\n🚫 Status: CONFIGURATION INVALID'));
        console.log(chalk.gray('Fix the errors above before creating an Amazon listing'));
        process.exit(1);
      }

      // Helpful tips
      if (options.verbose && hasIssues) {
        console.log(chalk.blue('\n💡 Tips:'));
        console.log(chalk.gray('• Review Amazon\'s listing requirements'));
        console.log(chalk.gray('• Check the sample YAML files for reference'));
        console.log(chalk.gray('• Use descriptive titles and bullet points'));
        console.log(chalk.gray('• Ensure all image files exist and are accessible'));
      }

    } catch (error) {
      console.error(chalk.red('❌ Validation failed:'), error instanceof Error ? error.message : String(error));
      if (options.verbose && error instanceof Error) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

export default validateCommand;