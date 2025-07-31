#!/usr/bin/env node
const axios = require('axios');
const chalk = require('chalk').default || require('chalk');

async function getByASIN(asin) {
  try {
    console.log(chalk.blue(`🔍 Fetching product details for ASIN: ${asin}\n`));
    
    // Load credentials from environment
    require('dotenv').config();
    
    const config = {
      clientId: process.env.AMAZON_CLIENT_ID,
      clientSecret: process.env.AMAZON_CLIENT_SECRET,
      refreshToken: process.env.AMAZON_REFRESH_TOKEN,
      marketplaceId: process.env.AMAZON_MARKETPLACE_ID || 'ATVPDKIKX0DER',
      sellerId: process.env.AMAZON_SELLER_ID || 'A38VJEQ016N3RP'
    };
    
    if (!config.clientId || !config.clientSecret || !config.refreshToken) {
      console.error(chalk.red('❌ Missing credentials in .env file'));
      process.exit(1);
    }
    
    // Get access token
    console.log(chalk.yellow('Getting access token...'));
    const authResponse = await axios.post('https://api.amazon.com/auth/o2/token', {
      grant_type: 'refresh_token',
      refresh_token: config.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret
    });
    
    const accessToken = authResponse.data.access_token;
    console.log(chalk.green('✅ Got access token'));
    
    // Get catalog item by ASIN
    const baseURL = 'https://sellingpartnerapi-na.amazon.com';
    const url = `${baseURL}/catalog/2022-04-01/items/${asin}`;
    
    console.log(chalk.yellow('\nFetching catalog item...'));
    const response = await axios.get(url, {
      headers: {
        'x-amz-access-token': accessToken,
        'Content-Type': 'application/json'
      },
      params: {
        marketplaceIds: config.marketplaceId,
        includedData: 'attributes,dimensions,identifiers,productTypes,salesRanks,summaries'
      }
    });
    
    console.log(chalk.green('\n✅ Product Details:'));
    console.log(JSON.stringify(response.data, null, 2));
    
    // Show product type
    if (response.data.productTypes) {
      console.log(chalk.yellow('\n📦 Product Types:'));
      response.data.productTypes.forEach(pt => {
        console.log(`  - ${pt.productType} (${pt.marketplaceId})`);
      });
    }
    
    // Show attributes
    if (response.data.attributes) {
      console.log(chalk.yellow('\n🔧 Attributes:'));
      const attrs = response.data.attributes;
      Object.keys(attrs).forEach(key => {
        console.log(`\n${chalk.cyan(key)}:`);
        console.log(JSON.stringify(attrs[key], null, 2));
      });
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
    if (error.response?.data) {
      console.log(chalk.red('API Response:'));
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }
}

const asin = process.argv[2] || 'B0DR4DD9CV';
getByASIN(asin);