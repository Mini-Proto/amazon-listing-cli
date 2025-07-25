#!/usr/bin/env tsx

import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, createReadStream } from 'fs';
import { createWriteStream } from 'fs';
import { resolve } from 'path';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import { ConfigManager } from '../../utils/config.js';
import { YAMLParser } from '../../utils/yaml-parser.js';
import { SPAPIClient } from '../../api/client.js';
import { ListingsItemsAPI } from '../../api/listings-items.js';
import { validateHarnessConfig } from '../../utils/validator.js';

interface BatchOptions {
  dryRun?: boolean;
  verbose?: boolean;
  force?: boolean;
  maxConcurrent?: number;
  output?: string;
  filter?: string;
}

interface CSVRow {
  sku: string;
  title: string;
  description: string;
  pin_count: number;
  wire_gauge: string;
  length: string;
  connector_type: string;
  price: number;
  compare_at_price?: number;
  category: string;
  keywords: string;
  bullet_points: string;
  image_paths: string;
}

const batchCommand = new Command('batch')
  .description('Batch operations for multiple products')
  .addCommand(createBatchCreateCommand())
  .addCommand(createBatchUpdateCommand())
  .addCommand(createBatchExportCommand())
  .addCommand(createBatchValidateCommand());

function createBatchCreateCommand(): Command {
  return new Command('create')
    .description('Create multiple listings from CSV file')
    .argument('<csv-file>', 'Path to CSV file with product data')
    .option('-d, --dry-run', 'Show what would be created without making changes')
    .option('-v, --verbose', 'Enable verbose output')
    .option('-f, --force', 'Skip confirmation prompts')
    .option('--max-concurrent <number>', 'Maximum concurrent operations', '3')
    .action(async (csvFile: string, options: BatchOptions) => {
      try {
        console.log(chalk.blue('📦 Amazon Listing Batch Create\n'));

        // Validate CSV file exists
        const csvPath = resolve(csvFile);
        if (!existsSync(csvPath)) {
          console.error(chalk.red(`❌ CSV file not found: ${csvPath}`));
          process.exit(1);
        }

        // Load configuration
        const configManager = new ConfigManager();
        const appConfig = await configManager.load();
        const client = new SPAPIClient(appConfig.amazon);
        const listingsAPI = new ListingsItemsAPI(client);

        // Parse CSV
        console.log(chalk.yellow('📄 Parsing CSV file...'));
        const products = await parseCSVFile(csvPath);
        console.log(chalk.green(`✅ Found ${products.length} products in CSV`));

        // Convert CSV rows to YAML configs
        const configs = products.map(convertCSVToConfig);

        // Validate all configurations
        console.log(chalk.yellow('\n🔍 Validating configurations...'));
        const validationResults = await Promise.all(
          configs.map(async (config, index) => ({
            index,
            config,
            validation: await validateHarnessConfig(config)
          }))
        );

        const validConfigs = validationResults.filter(r => r.validation.isValid);
        const invalidConfigs = validationResults.filter(r => !r.validation.isValid);

        if (invalidConfigs.length > 0) {
          console.log(chalk.red(`\n❌ ${invalidConfigs.length} configurations have errors:`));
          invalidConfigs.forEach(({ index, validation }) => {
            console.log(chalk.red(`Row ${index + 2}: ${validation.errors[0].message}`));
          });
          
          if (!options.force) {
            console.log(chalk.yellow('\nFix errors or use --force to skip invalid rows'));
            process.exit(1);
          }
        }

        console.log(chalk.green(`\n✅ ${validConfigs.length} configurations are valid`));

        // Dry run mode
        if (options.dryRun) {
          console.log(chalk.blue('\n🔍 Dry run mode - no listings will be created'));
          validConfigs.forEach(({ config }, index) => {
            console.log(chalk.gray(`${index + 1}. ${config.product.sku} - ${config.product.title.substring(0, 50)}...`));
          });
          return;
        }

        // Confirmation
        if (!options.force) {
          const readline = await import('readline');
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
          });

          const answer = await new Promise<string>((resolve) => {
            rl.question(chalk.yellow(`\n❓ Create ${validConfigs.length} listings? (y/N): `), (answer) => {
              rl.close();
              resolve(answer);
            });
          });

          if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
            console.log(chalk.gray('❌ Batch creation cancelled'));
            return;
          }
        }

        // Process batch creation
        console.log(chalk.yellow('\n🚀 Creating listings...'));
        const maxConcurrent = parseInt(String(options.maxConcurrent || '3'));
        const results = await processBatch(
          validConfigs.map(v => v.config),
          async (config) => {
            try {
              const result = await listingsAPI.createListing(
                config,
                [], // Skip images for batch processing
                [appConfig.amazon.marketplaceId],
                appConfig.amazon.sellerId
              );
              return { success: true, sku: config.product.sku, result };
            } catch (error) {
              return {
                success: false,
                sku: config.product.sku,
                error: error instanceof Error ? error.message : String(error)
              };
            }
          },
          maxConcurrent,
          options.verbose
        );

        // Summary
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        console.log(chalk.blue('\n📊 Batch Creation Summary:'));
        console.log(chalk.green(`  ✅ Successfully created: ${successful}`));
        if (failed > 0) {
          console.log(chalk.red(`  ❌ Failed: ${failed}`));
          if (options.verbose) {
            console.log(chalk.red('\nFailed listings:'));
            results.filter(r => !r.success).forEach(result => {
              console.log(chalk.red(`  • ${result.sku}: ${result.error}`));
            });
          }
        }

      } catch (error) {
        console.error(chalk.red('❌ Batch create failed:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

function createBatchUpdateCommand(): Command {
  return new Command('update')
    .description('Update multiple listings from CSV file')
    .argument('<csv-file>', 'Path to CSV file with updated product data')
    .option('-d, --dry-run', 'Show what would be updated without making changes')
    .option('-v, --verbose', 'Enable verbose output')
    .option('-f, --force', 'Skip confirmation prompts')
    .option('--max-concurrent <number>', 'Maximum concurrent operations', '2')
    .action(async (csvFile: string, options: BatchOptions) => {
      console.log(chalk.blue('🔄 Amazon Listing Batch Update\n'));
      console.log(chalk.yellow('⚠️  Batch update functionality coming soon!'));
      console.log(chalk.gray('Use individual update commands for now:'));
      console.log(chalk.gray('  amazon-harness update config1.yaml'));
      console.log(chalk.gray('  amazon-harness update config2.yaml'));
    });
}

function createBatchExportCommand(): Command {
  return new Command('export')
    .description('Export current listings to CSV file')
    .option('-o, --output <file>', 'Output CSV file path', 'amazon-listings.csv')
    .option('--filter <pattern>', 'Filter listings by SKU pattern')
    .option('-v, --verbose', 'Enable verbose output')
    .action(async (options: BatchOptions) => {
      try {
        console.log(chalk.blue('📤 Amazon Listing Export\n'));

        // Load configuration
        const configManager = new ConfigManager();
        const appConfig = await configManager.load();
        const client = new SPAPIClient(appConfig.amazon);

        console.log(chalk.yellow('🔍 Fetching listings...'));

        // Fetch listings using inventory API
        const inventoryResponse = await client.makeRequest(
          'GET',
          '/fba/inventory/v1/summaries',
          undefined,
          {
            granularityType: 'Marketplace',
            granularityId: appConfig.amazon.marketplaceId,
            marketplaceIds: appConfig.amazon.marketplaceId,
            details: true
          }
        );

        const items = (inventoryResponse.payload as any)?.inventorySummaries || [];
        
        // Apply filter if specified
        let filteredItems = items;
        if (options.filter) {
          const filterLower = options.filter.toLowerCase();
          filteredItems = items.filter((item: any) =>
            item.sellerSku?.toLowerCase().includes(filterLower)
          );
        }

        console.log(chalk.green(`✅ Found ${filteredItems.length} listings to export`));

        // Convert to CSV format
        const csvData: any[] = [];
        csvData.push([
          'SKU',
          'ASIN',
          'Title',
          'Quantity',
          'Last Updated',
          'Status'
        ]);

        filteredItems.forEach((item: any) => {
          csvData.push([
            item.sellerSku || '',
            item.asin || '',
            item.productName || '',
            item.totalQuantity || 0,
            item.lastUpdatedTime || '',
            item.totalQuantity > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK'
          ]);
        });

        // Write CSV file
        const outputPath = resolve(options.output || 'amazon-listings.csv');
        await writeCSVFile(outputPath, csvData);

        console.log(chalk.green(`✅ Exported ${filteredItems.length} listings to ${outputPath}`));

      } catch (error) {
        console.error(chalk.red('❌ Export failed:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

function createBatchValidateCommand(): Command {
  return new Command('validate')
    .description('Validate multiple YAML configuration files')
    .argument('<pattern>', 'Glob pattern for YAML files (e.g., "configs/*.yaml")')
    .option('-v, --verbose', 'Show detailed validation results')
    .option('--strict', 'Treat warnings as errors')
    .action(async (pattern: string, options: BatchOptions) => {
      try {
        console.log(chalk.blue('🔍 Batch Configuration Validation\n'));

        // Use glob to find matching files
        const { glob } = await import('glob');
        const files = await glob(pattern);

        if (files.length === 0) {
          console.log(chalk.yellow(`No files found matching pattern: ${pattern}`));
          return;
        }

        console.log(chalk.yellow(`📄 Found ${files.length} configuration files`));

        // Validate each file
        const yamlParser = new YAMLParser();
        const results = [];

        for (const file of files) {
          try {
            console.log(chalk.gray(`Validating ${file}...`));
            const config = await yamlParser.parseFile(file);
            const validation = await validateHarnessConfig(config);
            results.push({ file, validation, config });
          } catch (error) {
            results.push({
              file,
              validation: {
                isValid: false,
                errors: [{ field: 'file', message: error instanceof Error ? error.message : String(error) }],
                warnings: []
              },
              config: null
            });
          }
        }

        // Summary
        const valid = results.filter(r => r.validation.isValid);
        const invalid = results.filter(r => !r.validation.isValid);
        const withWarnings = results.filter(r => r.validation.isValid && (r.validation.warnings?.length ?? 0) > 0);

        console.log(chalk.blue('\n📊 Validation Summary:'));
        console.log(chalk.green(`  ✅ Valid: ${valid.length}`));
        console.log(chalk.red(`  ❌ Invalid: ${invalid.length}`));
        console.log(chalk.yellow(`  ⚠️  With warnings: ${withWarnings.length}`));

        // Show details for invalid files
        if (invalid.length > 0) {
          console.log(chalk.red('\n❌ Invalid Files:'));
          invalid.forEach(({ file, validation }) => {
            console.log(chalk.red(`  ${file}:`));
            validation.errors.forEach(error => {
              console.log(chalk.red(`    • ${error.field}: ${error.message}`));
            });
          });
        }

        // Show warnings if verbose
        if (options.verbose && withWarnings.length > 0) {
          console.log(chalk.yellow('\n⚠️  Warnings:'));
          withWarnings.forEach(({ file, validation }) => {
            console.log(chalk.yellow(`  ${file}:`));
            validation.warnings?.forEach(warning => {
              console.log(chalk.yellow(`    • ${warning}`));
            });
          });
        }

        // Exit with error if any invalid
        if (invalid.length > 0) {
          process.exit(1);
        }

      } catch (error) {
        console.error(chalk.red('❌ Batch validation failed:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

// Utility functions
async function parseCSVFile(filePath: string): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    const results: CSVRow[] = [];
    
    createReadStream(filePath)
      .pipe(parse({ 
        columns: true, 
        skip_empty_lines: true,
        trim: true 
      }))
      .on('data', (row: CSVRow) => {
        results.push(row);
      })
      .on('error', reject)
      .on('end', () => resolve(results));
  });
}

async function writeCSVFile(filePath: string, data: any[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const stringifier = stringify({
      header: false,
      quoted: true
    });

    const output = createWriteStream(filePath);
    stringifier.pipe(output);

    data.forEach(row => stringifier.write(row));
    stringifier.end();

    output.on('finish', resolve);
    output.on('error', reject);
  });
}

function convertCSVToConfig(csvRow: CSVRow): any {
  return {
    product: {
      title: csvRow.title,
      sku: csvRow.sku,
      description: csvRow.description
    },
    specifications: {
      pin_count: parseInt(String(csvRow.pin_count)),
      wire_gauge: csvRow.wire_gauge,
      length: csvRow.length,
      connector_type: csvRow.connector_type
    },
    pricing: {
      price: parseFloat(String(csvRow.price)),
      compare_at_price: csvRow.compare_at_price ? parseFloat(String(csvRow.compare_at_price)) : undefined
    },
    images: csvRow.image_paths ? csvRow.image_paths.split(',').map(p => p.trim()) : [],
    amazon: {
      category: csvRow.category,
      search_keywords: csvRow.keywords ? csvRow.keywords.split(',').map(k => k.trim()) : [],
      bullet_points: csvRow.bullet_points ? csvRow.bullet_points.split('|').map(b => b.trim()) : []
    }
  };
}

async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  maxConcurrent: number,
  verbose: boolean = false
): Promise<R[]> {
  const results: R[] = [];
  const processing: Promise<void>[] = [];
  let completed = 0;

  for (const item of items) {
    // Wait if we have too many concurrent operations
    if (processing.length >= maxConcurrent) {
      await Promise.race(processing);
    }

    const promise = processor(item).then(result => {
      results.push(result);
      completed++;
      if (verbose) {
        console.log(chalk.gray(`  Progress: ${completed}/${items.length}`));
      }
    }).finally(() => {
      const index = processing.indexOf(promise);
      if (index > -1) {
        processing.splice(index, 1);
      }
    });

    processing.push(promise);
  }

  // Wait for all remaining operations
  await Promise.all(processing);
  return results;
}

export default batchCommand;