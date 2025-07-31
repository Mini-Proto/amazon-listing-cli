#!/usr/bin/env node
import 'dotenv/config';
import chalk from 'chalk';
import { ConfigManager } from '../utils/config.js';
import { SPAPIClient } from '../api/client.js';

async function getListingDetails() {
  try {
    const configManager = new ConfigManager();
    const config = await configManager.load();
    const client = new SPAPIClient(config.amazon);

    // Get details for an existing SKU
    const sku = '0S-X2SM-QM93'; // This is an existing product
    
    console.log(chalk.blue(`\n📋 Fetching full listing details for SKU: ${sku}\n`));

    // Get listing attributes
    const response = await client.makeRequest(
      'GET',
      `/listings/2021-08-01/items/${config.amazon.sellerId}/${sku}`,
      undefined,
      { 
        marketplaceIds: config.amazon.marketplaceId,
        includedData: 'attributes,summaries,issues'
      }
    );

    console.log(chalk.green('✅ Listing details retrieved:\n'));
    console.log(JSON.stringify(response, null, 2));

    // Look specifically for image attributes
    const responseData = response as any;
    if (responseData.attributes) {
      console.log(chalk.yellow('\n🖼️  Image-related attributes:\n'));
      Object.keys(responseData.attributes).forEach(key => {
        if (key.toLowerCase().includes('image') || key.toLowerCase().includes('locator')) {
          console.log(chalk.cyan(`${key}:`), JSON.stringify(responseData.attributes[key], null, 2));
        }
      });
    }

  } catch (error) {
    console.error(chalk.red('Error:'), error);
  }
}

getListingDetails().catch(console.error);