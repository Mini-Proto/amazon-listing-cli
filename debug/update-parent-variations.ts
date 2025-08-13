import { ConfigManager } from '../utils/config.js';
import { SPAPIClient } from '../api/client.js';
import { ListingsItemsAPI } from '../api/listings-items.js';
import chalk from 'chalk';

async function updateParentVariations() {
  try {
    console.log(chalk.blue('🔄 Adding variation to parent ASIN B0FM7BJB5K\n'));

    // Load configuration from environment
    const config = {
      clientId: process.env.AMAZON_CLIENT_ID!,
      clientSecret: process.env.AMAZON_CLIENT_SECRET!,
      refreshToken: process.env.AMAZON_REFRESH_TOKEN!,
      region: process.env.AMAZON_REGION || 'us-east-1',
      marketplaceId: process.env.AMAZON_MARKETPLACE_ID!,
      sellerId: process.env.AMAZON_SELLER_ID!,
      sandbox: process.env.AMAZON_SANDBOX === 'true'
    };
    
    // Initialize API client
    const client = new SPAPIClient(config);
    const listingsAPI = new ListingsItemsAPI(client);

    console.log(chalk.yellow('📋 Target Parent ASIN: B0FM7BJB5K'));
    console.log(chalk.yellow('🎯 Adding Child: MPA-MFJ-4P-F-F-6IN-2PK (when ASIN available)'));

    // Try to find existing listings that might be children
    console.log(chalk.blue('\n🔍 Checking existing child ASINs:'));
    
    const childASINs = [
      { sku: 'MPA-MFJ-2P-F-F-6IN-2PK', asin: 'B0FM6P5M8H' },
      { sku: 'MPA-MFJ-2P-F-F-12IN-2PK', asin: 'B0FM6HFFDJ' }
    ];

    for (const child of childASINs) {
      try {
        console.log(chalk.gray(`Checking ${child.sku} (${child.asin})...`));
        const response = await listingsAPI.getListing(child.sku);
        
        if (response) {
          console.log(chalk.green(`✅ Found: ${child.sku}`));
          
          // Look for parent relationship in attributes
          const attributes = response.attributes;
          if (attributes?.parent_asin) {
            console.log(chalk.cyan(`   Parent ASIN: ${JSON.stringify(attributes.parent_asin)}`));
          } else {
            console.log(chalk.yellow(`   No parent relationship found`));
          }
        }
      } catch (error) {
        console.log(chalk.red(`❌ Error checking ${child.sku}: ${error.message}`));
      }
    }

    console.log(chalk.blue('\n💡 Next steps:'));
    console.log('1. Variations are typically managed through Amazon Seller Central');
    console.log('2. Use "Manage Variations" feature in Seller Central');
    console.log('3. Link child ASINs to parent B0FM7BJB5K manually');
    console.log('4. Set variation theme (size_name, style_name, etc.)');

  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
  }
}

updateParentVariations();