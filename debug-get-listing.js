import { SPAPIClient } from './dist/api/client.js';
import { ConfigManager } from './dist/utils/config.js';

async function checkListing() {
  try {
    const configManager = new ConfigManager();
    const appConfig = await configManager.load();
    const client = new SPAPIClient(appConfig.amazon);

    console.log('Checking existing listing C3-TA49-IOYF...');
    
    const response = await client.makeRequest(
      'GET',
      `/listings/2021-08-01/items/${appConfig.amazon.sellerId}/C3-TA49-IOYF`,
      undefined,
      {
        marketplaceIds: appConfig.amazon.marketplaceId,
        includedData: 'summaries,attributes'
      }
    );

    console.log('Response:', JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkListing();