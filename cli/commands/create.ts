import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { YAMLParser } from '../../utils/yaml-parser.js';
import { ConfigManager } from '../../utils/config.js';
import { AmazonProductFormatter } from '../../formatters/amazon.js';

interface CreateOptions {
  dryRun?: boolean;
  verbose?: boolean;
}

const createCommand = new Command('create');

createCommand
  .description('Create a new Amazon product listing from YAML configuration')
  .argument('<config-file>', 'Path to YAML configuration file')
  .option('-d, --dry-run', 'Show what would be created without making changes')
  .option('-v, --verbose', 'Enable verbose output')
  .action(async (configFile: string, options: CreateOptions) => {
    try {
      if (options.verbose) {
        console.log(chalk.gray('Verbose mode enabled'));
      }
      
      console.log(chalk.blue('🚀 Creating Amazon listing...\n'));
      
      // Step 1: Validate file path
      console.log(chalk.gray('1. Validating configuration file...'));
      const fileValidation = YAMLParser.validateFilePath(configFile);
      if (!fileValidation.isValid) {
        console.error(chalk.red(`❌ ${fileValidation.error}`));
        process.exit(1);
      }
      console.log(chalk.green(`✅ Configuration file found: ${resolve(configFile)}`));
      
      if (options.dryRun) {
        console.log(chalk.yellow('\n🔍 DRY RUN MODE - No changes will be made\n'));
      }
      
      // Step 2: Parse and validate YAML
      console.log(chalk.gray('2. Parsing and validating YAML configuration...'));
      const yamlParser = new YAMLParser();
      const harnessConfig = await yamlParser.parseFile(configFile);
      console.log(chalk.green('✅ Configuration parsed and validated successfully'));
      
      if (options.verbose) {
        console.log(chalk.gray(`   Product: ${harnessConfig.product.title}`));
        console.log(chalk.gray(`   SKU: ${harnessConfig.product.sku}`));
        console.log(chalk.gray(`   Pin Count: ${harnessConfig.specifications.pin_count}`));
        console.log(chalk.gray(`   Price: $${harnessConfig.pricing.price}`));
        console.log(chalk.gray(`   Images: ${harnessConfig.images.length}`));
      }
      
      // Step 3: Check Amazon API credentials
      console.log(chalk.gray('3. Verifying Amazon SP-API credentials...'));
      const configManager = new ConfigManager();
      let appConfig;
      try {
        appConfig = await configManager.load();
        const errors = await configManager.validateConfig(appConfig);
        
        if (errors.length > 0) {
          console.error(chalk.red('❌ Amazon API configuration incomplete:'));
          errors.forEach(error => console.error(chalk.red(`   • ${error}`)));
          console.log(chalk.gray('\\nRun `amazon-harness configure` to set up your credentials'));
          process.exit(1);
        }
        console.log(chalk.green('✅ Amazon SP-API credentials verified'));
      } catch (error) {
        console.error(chalk.red('❌ Amazon API configuration not found'));
        console.log(chalk.gray('Run `amazon-harness configure` to set up your credentials'));
        process.exit(1);
      }
      
      // Step 4: Create Amazon product listing
      console.log(chalk.gray('4. Creating Amazon product listing...'));
      const productFormatter = new AmazonProductFormatter(appConfig.amazon);
      const creationResult = await productFormatter.createProduct(harnessConfig, options.dryRun);
      
      // Display summary
      const summary = AmazonProductFormatter.generateSummary(creationResult);
      console.log(summary);
      
      if (!creationResult.success) {
        console.error(chalk.red('\\n❌ Product creation failed!'));
        process.exit(1);
      }
      
      if (options.dryRun) {
        console.log(chalk.green('\\n✅ Dry run completed successfully!'));
        console.log(chalk.gray('All validations passed. Ready for actual creation.'));
        console.log(chalk.gray('Run without --dry-run to create the actual listing.'));
        process.exit(0);
      } else {
        console.log(chalk.green('\\n🎉 Product listing created successfully!'));
        if (creationResult.listingUrl) {
          console.log(chalk.blue(`🔗 View listing: ${creationResult.listingUrl}`));
        }
        console.log(chalk.gray('Check Amazon Seller Central for final processing status.'));
        process.exit(0);
      }
      
    } catch (error) {
      console.error(chalk.red('\\n❌ Error creating listing:'), error instanceof Error ? error.message : String(error));
      if (options.verbose && error instanceof Error) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

export default createCommand;