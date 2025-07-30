import { SPAPIClient } from './dist/api/client.js';
import { ConfigManager } from './dist/utils/config.js';

async function checkSubmissions() {
  try {
    const configManager = new ConfigManager();
    const appConfig = await configManager.load();
    const client = new SPAPIClient(appConfig.amazon);

    console.log('Checking recent submissions...');
    
    // Try to get recent submissions (if there's an endpoint for this)
    const response = await client.makeRequest(
      'GET',
      '/listings/2021-08-01/submissions',
      undefined,
      {
        marketplaceIds: appConfig.amazon.marketplaceId,
        pageSize: 10
      }
    );

    console.log('Submissions:', JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSubmissions();