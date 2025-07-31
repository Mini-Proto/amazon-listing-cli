import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../../utils/config.js';
import { SPAPIClient } from '../../api/client.js';
import { Formatter, ListingInfo, OutputFormat } from '../../utils/formatter.js';

interface ListOptions {
  format?: OutputFormat;
  filter?: string;
  verbose?: boolean;
  detailed?: boolean;
  limit?: number;
}

const listCommand = new Command('list');

listCommand
  .description('List existing Amazon product listings')
  .option('-f, --format <format>', 'Output format (table, json, csv)', 'table')
  .option('--filter <pattern>', 'Filter listings by SKU pattern or keywords')
  .option('-v, --verbose', 'Enable verbose output')
  .option('-d, --detailed', 'Show detailed information for each listing')
  .option('-l, --limit <number>', 'Limit number of results', '250')
  .action(async (options: ListOptions) => {
    try {
      console.log(chalk.blue('📋 Amazon Listing Manager\n'));
      
      // Load configuration
      const configManager = new ConfigManager();
      const appConfig = await configManager.load();
      const client = new SPAPIClient(appConfig.amazon);

      console.log(chalk.yellow('🔍 Fetching listings...'));
      if (options.filter) {
        console.log(chalk.gray(`Filter: ${options.filter}`));
      }

      // Fetch listings using FBA Inventory API (more reliable than Listings API for listing products)
      const listings: ListingInfo[] = [];

      try {
        // First try FBA inventory (note: this only returns first ~50 items due to API limitations)
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
          let items = (inventoryResponse.payload as any).inventorySummaries;
          const limit = parseInt(String(options.limit || '250'));

          // Apply filter if specified
          if (options.filter) {
            const filterLower = options.filter.toLowerCase();
            items = items.filter((item: any) => 
              item.sellerSku?.toLowerCase().includes(filterLower) ||
              item.productName?.toLowerCase().includes(filterLower) ||
              item.asin?.toLowerCase().includes(filterLower)
            );
          }

          // Apply limit (already handled by pagination loop)
          items = items.slice(0, limit);

          items.forEach((item: any) => {
            listings.push({
              sku: item.sellerSku || 'Unknown',
              asin: item.asin || undefined,
              title: item.productName || 'Unknown Product',
              price: undefined, // Price not available in inventory API
              status: item.totalQuantity > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK',
              lastModified: item.lastUpdatedTime || undefined,
              quantity: item.totalQuantity || 0
            });
          });
        }

        // If we have few results, also try the catalog search for more comprehensive results
        if (listings.length < 10) {
          console.log(chalk.gray('Searching catalog for additional listings...'));
          
          try {
            const catalogResponse = await client.makeRequest(
              'GET',
              '/catalog/2022-04-01/items',
              undefined,
              {
                marketplaceIds: appConfig.amazon.marketplaceId,
                sellerId: appConfig.amazon.sellerId,
                keywords: 'MiniProto', // Search for our brand
                pageSize: 20
              }
            );

            if ((catalogResponse as any).items) {
              (catalogResponse as any).items.forEach((item: any) => {
                const summary = item.summaries?.[0];
                if (summary && !listings.find(l => l.asin === item.asin)) {
                  listings.push({
                    sku: summary.sellerSku || item.asin,
                    asin: item.asin,
                    title: summary.itemName || 'Unknown Product',
                    price: summary.lowestPrice?.amount ? parseFloat(summary.lowestPrice.amount) : undefined,
                    status: 'CATALOG_ITEM',
                    lastModified: undefined
                  });
                }
              });
            }
          } catch (catalogError) {
            if (options.verbose) {
              console.log(chalk.gray('Catalog search failed:', catalogError));
            }
          }
        }

      } catch (error) {
        console.log(chalk.red('❌ Failed to fetch inventory:'), error instanceof Error ? error.message : String(error));
        
        // Fallback: try to list using known patterns
        if (options.verbose) {
          console.log(chalk.gray('Trying alternative listing methods...'));
        }
      }

      // Sort listings by SKU
      listings.sort((a, b) => a.sku.localeCompare(b.sku));

      // Show results
      if (listings.length === 0) {
        console.log(chalk.yellow('📭 No listings found'));
        console.log(chalk.gray('This could mean:'));
        console.log(chalk.gray('• No products have been created yet'));
        console.log(chalk.gray('• Your SP-API application has limited permissions'));
        console.log(chalk.gray('• The filter criteria excluded all results'));
        return;
      }

      console.log(chalk.green(`✅ Found ${listings.length} listing(s)\n`));

      // Show detailed view if requested
      if (options.detailed && options.format === 'table') {
        for (const listing of listings.slice(0, 5)) { // Limit detailed view to 5 items
          console.log(Formatter.formatProductSummary(listing));
        }
        if (listings.length > 5) {
          console.log(chalk.gray(`... and ${listings.length - 5} more listings`));
        }
      } else {
        // Format and display results
        const output = Formatter.formatListings(listings, options.format || 'table');
        console.log(output);
      }

      // Show summary
      if (options.verbose) {
        const statusCounts = listings.reduce((acc, listing) => {
          acc[listing.status] = (acc[listing.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        console.log(chalk.blue('\n📊 Status Summary:'));
        Object.entries(statusCounts).forEach(([status, count]) => {
          console.log(chalk.gray(`  ${status}: ${count}`));
        });
      }
      
      process.exit(0);

    } catch (error) {
      console.error(chalk.red('❌ Failed to list products:'), error instanceof Error ? error.message : String(error));
      if (options.verbose && error instanceof Error) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

export default listCommand;