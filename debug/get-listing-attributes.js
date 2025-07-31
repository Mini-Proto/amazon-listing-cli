#!/usr/bin/env node
import { config } from 'dotenv';
import { resolve } from 'path';
import chalk from 'chalk';
import { ConfigManager } from '../dist/utils/config.js';
import { SPAPIClient } from '../dist/api/client.js';
import { ListingsItemsAPI } from '../dist/api/listings-items.js';

config({ path: resolve(process.cwd(), '.env') });

async function getListingAttributes(sku) {
  try {
    console.log(chalk.blue(`🔍 Fetching listing attributes for SKU: ${sku}\n`));
    
    // Load configuration
    const configManager = new ConfigManager();
    const appConfig = await configManager.load();
    
    // Initialize API client
    const client = new SPAPIClient(appConfig.amazon);
    const listingsAPI = new ListingsItemsAPI(client);
    
    // Get the listing
    console.log(chalk.yellow('📋 Fetching listing details...'));
    const listing = await listingsAPI.getListing(
      appConfig.amazon.sellerId,
      sku,
      appConfig.amazon.marketplaceId,
      ['attributes', 'summaries', 'issues', 'offers', 'fulfillmentAvailability']
    );
    
    console.log(chalk.green('\n✅ Full Listing Response:'));
    console.log(JSON.stringify(listing, null, 2));
    
    // Extract attributes
    if (listing.attributes) {
      console.log(chalk.yellow('\n🔧 Listing Attributes:'));
      Object.entries(listing.attributes).forEach(([key, value]) => {
        console.log(`\n  ${chalk.cyan(key)}:`);
        console.log(`    ${JSON.stringify(value, null, 2).replace(/\n/g, '\n    ')}`);
      });
    }
    
    // Show product type
    if (listing.productType) {
      console.log(chalk.yellow('\n📦 Product Type:'), listing.productType);
    }
    
    // Show any issues
    if (listing.issues && listing.issues.length > 0) {
      console.log(chalk.red('\n⚠️  Issues:'));
      listing.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.message}`);
        if (issue.attributeName) {
          console.log(`     Attribute: ${issue.attributeName}`);
        }
      });
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
    if (error.response?.data) {
      console.log(chalk.red('API Response:'), JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// You'll need to provide the SKU for your ASIN B0DR4DD9CV
console.log(chalk.blue('📌 Note: You need to provide the SKU for ASIN B0DR4DD9CV'));
console.log(chalk.gray('Usage: node debug/get-listing-attributes.js YOUR-SKU'));
console.log(chalk.gray('Example: node debug/get-listing-attributes.js MP-JST-SM-4-24'));

const sku = process.argv[2];
if (sku) {
  getListingAttributes(sku);
} else {
  console.log(chalk.red('\n❌ Please provide a SKU as an argument'));
}