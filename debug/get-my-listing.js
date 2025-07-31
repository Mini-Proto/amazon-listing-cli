#!/usr/bin/env node
import { config } from 'dotenv';
import { resolve } from 'path';
import chalk from 'chalk';
import axios from 'axios';
import { SPAPIAuthenticator } from '../dist/api/auth.js';
import { AmazonConfig, REGION_ENDPOINTS, SANDBOX_ENDPOINTS } from '../dist/config/default-config.js';

config({ path: resolve(process.cwd(), '.env') });

async function getListingRaw(sku) {
  try {
    console.log(chalk.blue(`🔍 Fetching raw listing data for SKU: ${sku}\n`));
    
    // Build config from env
    const amazonConfig = {
      clientId: process.env.AMAZON_CLIENT_ID,
      clientSecret: process.env.AMAZON_CLIENT_SECRET,
      refreshToken: process.env.AMAZON_REFRESH_TOKEN,
      region: process.env.AMAZON_REGION || 'us-east-1',
      marketplaceId: process.env.AMAZON_MARKETPLACE_ID || 'ATVPDKIKX0DER',
      sellerId: process.env.AMAZON_SELLER_ID,
      sandbox: process.env.AMAZON_SANDBOX === 'true'
    };
    
    // Get auth token
    const authenticator = new SPAPIAuthenticator(amazonConfig);
    const accessToken = await authenticator.getAccessToken();
    
    // Make direct API call
    const baseURL = amazonConfig.sandbox ? 
      SANDBOX_ENDPOINTS[amazonConfig.region] : 
      REGION_ENDPOINTS[amazonConfig.region];
    
    const url = `${baseURL}/listings/2021-08-01/items/${amazonConfig.sellerId}/${sku}`;
    
    console.log(chalk.yellow('API URL:'), url);
    console.log(chalk.yellow('Marketplace:'), amazonConfig.marketplaceId);
    
    const response = await axios.get(url, {
      headers: {
        'x-amz-access-token': accessToken,
        'Content-Type': 'application/json'
      },
      params: {
        marketplaceIds: amazonConfig.marketplaceId,
        includedData: 'attributes,summaries,issues,offers,fulfillmentAvailability,identifiers'
      }
    });
    
    console.log(chalk.green('\n✅ Full Listing Response:'));
    console.log(JSON.stringify(response.data, null, 2));
    
    // Extract key information
    if (response.data.attributes) {
      console.log(chalk.yellow('\n🔧 Product Attributes:'));
      const attrs = response.data.attributes;
      Object.keys(attrs).sort().forEach(key => {
        console.log(`\n${chalk.cyan(key)}:`);
        console.log(JSON.stringify(attrs[key], null, 2));
      });
    }
    
    if (response.data.productType) {
      console.log(chalk.yellow('\n📦 Product Type:'), response.data.productType);
    }
    
    if (response.data.summaries) {
      console.log(chalk.yellow('\n📊 Summaries:'));
      console.log(JSON.stringify(response.data.summaries, null, 2));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
    if (error.response?.data) {
      console.log(chalk.red('API Response:'));
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }
}

const sku = process.argv[2] || 'TA-YEBW-GWEP';
getListingRaw(sku);