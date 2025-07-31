#!/usr/bin/env node
import { config } from 'dotenv';
import { resolve } from 'path';
import chalk from 'chalk';
import { ConfigManager } from '../dist/utils/config.js';
import { SPAPIClient } from '../dist/api/client.js';
import { CatalogItemsAPI } from '../dist/api/catalog-items.js';

config({ path: resolve(process.cwd(), '.env') });

async function fetchASIN(asin) {
  try {
    console.log(chalk.blue(`🔍 Fetching details for ASIN: ${asin}\n`));
    
    // Load configuration
    const configManager = new ConfigManager();
    const appConfig = await configManager.load();
    
    // Initialize API client
    const client = new SPAPIClient(appConfig.amazon);
    const catalogAPI = new CatalogItemsAPI(client);
    
    // Fetch catalog item
    console.log(chalk.yellow('📋 Fetching catalog item details...'));
    const catalogItem = await catalogAPI.getCatalogItem(asin);
    
    console.log(chalk.green('\n✅ Product Details:'));
    console.log(JSON.stringify(catalogItem, null, 2));
    
    // Extract key attributes
    if (catalogItem.attributes) {
      console.log(chalk.yellow('\n🔧 Product Attributes:'));
      Object.entries(catalogItem.attributes).forEach(([key, value]) => {
        console.log(`  ${chalk.cyan(key)}: ${JSON.stringify(value)}`);
      });
    }
    
    // Extract salesRanks
    if (catalogItem.salesRanks) {
      console.log(chalk.yellow('\n📊 Sales Ranks:'));
      catalogItem.salesRanks.forEach(rank => {
        console.log(`  ${rank.title}: #${rank.rank}`);
      });
    }
    
    // Extract product types
    if (catalogItem.productTypes) {
      console.log(chalk.yellow('\n📦 Product Types:'));
      catalogItem.productTypes.forEach(type => {
        console.log(`  - ${type.productType} (${type.marketplace_id})`);
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

// Get ASIN from command line or use default
const asin = process.argv[2] || 'B0DR4DD9CV';
fetchASIN(asin);