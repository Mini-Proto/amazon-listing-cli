#!/usr/bin/env tsx

import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../../utils/config.js';
import { SPAPIClient } from '../../api/client.js';
import { ListingsItemsAPI } from '../../api/listings-items.js';

interface DeleteOptions {
  force?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
  batch?: string;
}

const deleteCommand = new Command('delete')
  .description('Delete Amazon product listings')
  .argument('[sku]', 'SKU of the product to delete')
  .option('-f, --force', 'Skip confirmation prompts (use with caution)')
  .option('-d, --dry-run', 'Show what would be deleted without making changes')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--batch <pattern>', 'Delete multiple SKUs matching pattern (e.g., "TEST-*")')
  .action(async (sku: string, options: DeleteOptions) => {
    try {
      console.log(chalk.blue('🗑️  Amazon Listing Delete Tool\n'));

      // Load configuration
      const configManager = new ConfigManager();
      const appConfig = await configManager.load();
      const client = new SPAPIClient(appConfig.amazon);
      const listingsAPI = new ListingsItemsAPI(client);

      const marketplaceIds = [appConfig.amazon.marketplaceId];
      let skusToDelete: string[] = [];

      // Determine which SKUs to delete
      if (options.batch) {
        console.log(chalk.yellow(`🔍 Finding SKUs matching pattern: ${options.batch}`));
        
        // First get all listings to find matches
        try {
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

          if (inventoryResponse.payload && (inventoryResponse.payload as any).inventorySummaries) {
            const pattern = options.batch.replace(/\*/g, '.*').replace(/\?/g, '.');
            const regex = new RegExp(`^${pattern}$`, 'i');
            
            skusToDelete = (inventoryResponse.payload as any).inventorySummaries
              .filter((item: any) => item.sellerSku && regex.test(item.sellerSku))
              .map((item: any) => item.sellerSku);
          }
        } catch (error) {
          console.log(chalk.red('❌ Failed to fetch listings for batch operation'));
          console.error(error instanceof Error ? error.message : String(error));
          process.exit(1);
        }

        if (skusToDelete.length === 0) {
          console.log(chalk.yellow(`No SKUs found matching pattern: ${options.batch}`));
          return;
        }

        console.log(chalk.green(`Found ${skusToDelete.length} SKU(s) to delete:`));
        skusToDelete.forEach(s => console.log(chalk.gray(`  • ${s}`)));

      } else if (sku) {
        skusToDelete = [sku];
      } else {
        console.log(chalk.red('❌ You must specify either a SKU or use --batch option'));
        console.log(chalk.gray('Examples:'));
        console.log(chalk.gray('  amazon-harness delete MY-SKU-123'));
        console.log(chalk.gray('  amazon-harness delete --batch "TEST-*"'));
        process.exit(1);
      }

      // Validate that listings exist
      console.log(chalk.yellow('\n🔍 Validating listings exist...'));
      const validSkus: string[] = [];
      const missingSkus: string[] = [];

      for (const skuToCheck of skusToDelete) {
        try {
          const listing = await listingsAPI.getListing(skuToCheck, marketplaceIds);
          if (listing) {
            validSkus.push(skuToCheck);
            if (options.verbose) {
              console.log(chalk.green(`  ✅ ${skuToCheck} - Found`));
            }
          } else {
            missingSkus.push(skuToCheck);
            console.log(chalk.yellow(`  ⚠️  ${skuToCheck} - Not found`));
          }
        } catch (error) {
          missingSkus.push(skuToCheck);
          console.log(chalk.yellow(`  ⚠️  ${skuToCheck} - Error checking: ${error instanceof Error ? error.message : String(error)}`));
        }
      }

      if (validSkus.length === 0) {
        console.log(chalk.red('\n❌ No valid listings found to delete'));
        return;
      }

      if (missingSkus.length > 0) {
        console.log(chalk.yellow(`\n⚠️  ${missingSkus.length} SKU(s) not found and will be skipped`));
      }

      // Show what will be deleted
      console.log(chalk.red(`\n🚨 DANGER: About to delete ${validSkus.length} listing(s):`));
      validSkus.forEach(s => {
        console.log(chalk.red(`  🗑️  ${s}`));
      });

      console.log(chalk.yellow('\n⚠️  This action cannot be undone!'));
      console.log(chalk.gray('Deleted listings will need to be recreated from scratch.'));

      // Dry run mode
      if (options.dryRun) {
        console.log(chalk.blue('\n🔍 Dry run mode - no listings will be deleted'));
        console.log(chalk.gray('Run without --dry-run to perform the actual deletion'));
        return;
      }

      // Safety confirmation
      if (!options.force) {
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        // First confirmation
        const answer1 = await new Promise<string>((resolve) => {
          rl.question(chalk.red('\n❓ Are you sure you want to DELETE these listings? (yes/NO): '), (answer) => {
            resolve(answer);
          });
        });

        if (answer1.toLowerCase() !== 'yes') {
          rl.close();
          console.log(chalk.gray('❌ Deletion cancelled'));
          return;
        }

        // Second confirmation for batch operations
        if (validSkus.length > 1) {
          const answer2 = await new Promise<string>((resolve) => {
            rl.question(chalk.red(`❓ You are about to delete ${validSkus.length} listings. Type "DELETE" to confirm: `), (answer) => {
              resolve(answer);
            });
          });

          if (answer2 !== 'DELETE') {
            rl.close();
            console.log(chalk.gray('❌ Deletion cancelled'));
            return;
          }
        }

        rl.close();
      }

      // Perform deletions
      console.log(chalk.yellow('\n🗑️  Deleting listings...'));
      const deletionResults: { sku: string; success: boolean; error?: string }[] = [];

      for (const skuToDelete of validSkus) {
        try {
          console.log(chalk.gray(`  Deleting ${skuToDelete}...`));
          await listingsAPI.deleteListing(skuToDelete, marketplaceIds);
          
          deletionResults.push({ sku: skuToDelete, success: true });
          console.log(chalk.green(`  ✅ ${skuToDelete} - Deleted successfully`));

          // Add a small delay between deletions to avoid rate limiting
          if (validSkus.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          deletionResults.push({ sku: skuToDelete, success: false, error: errorMessage });
          console.log(chalk.red(`  ❌ ${skuToDelete} - Failed: ${errorMessage}`));
        }
      }

      // Summary
      const successful = deletionResults.filter(r => r.success).length;
      const failed = deletionResults.filter(r => !r.success).length;

      console.log(chalk.blue('\n📊 Deletion Summary:'));
      console.log(chalk.green(`  ✅ Successfully deleted: ${successful}`));
      if (failed > 0) {
        console.log(chalk.red(`  ❌ Failed to delete: ${failed}`));
        
        if (options.verbose) {
          console.log(chalk.red('\nFailed deletions:'));
          deletionResults.filter(r => !r.success).forEach(result => {
            console.log(chalk.red(`  • ${result.sku}: ${result.error}`));
          });
        }
      }

      if (successful > 0) {
        console.log(chalk.yellow('\n⚠️  Note: It may take a few minutes for deletions to appear in Seller Central'));
      }

    } catch (error) {
      console.error(chalk.red('❌ Failed to delete listings:'), error instanceof Error ? error.message : String(error));
      if (options.verbose && error instanceof Error) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

export default deleteCommand;