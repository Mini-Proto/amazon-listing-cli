#!/usr/bin/env node
import 'dotenv/config';
import chalk from 'chalk';
import { ConfigManager } from '../utils/config.js';
import { SPAPIClient } from '../api/client.js';

async function checkSubmission() {
  try {
    const configManager = new ConfigManager();
    const config = await configManager.load();
    const client = new SPAPIClient(config.amazon);

    const submissionId = '1530aa7bfe194b65b0999737f5acaf8d';
    const sku = 'MP-JST-4PIN-CABLE-001';
    
    console.log(chalk.blue(`\n📋 Checking submission status...\n`));
    console.log(chalk.gray(`Submission ID: ${submissionId}`));
    console.log(chalk.gray(`SKU: ${sku}\n`));

    // Try to get the listing directly
    try {
      const listingResponse = await client.makeRequest(
        'GET',
        `/listings/2021-08-01/items/${config.amazon.sellerId}/${sku}`,
        undefined,
        { 
          marketplaceIds: config.amazon.marketplaceId,
          includedData: 'attributes,summaries,issues'
        }
      );

      console.log(chalk.green('✅ Listing found!\n'));
      console.log('Status:', (listingResponse as any).summaries?.[0]?.status || 'Unknown');
      console.log('ASIN:', (listingResponse as any).summaries?.[0]?.asin || 'Not assigned yet');
      
      const issues = (listingResponse as any).issues || [];
      console.log('Issues:', issues.length);
      
      if (issues.length > 0) {
        console.log(chalk.yellow('\n⚠️  Issues found:'));
        issues.forEach((issue: any, idx: number) => {
          console.log(chalk.gray(`${idx + 1}. [${issue.severity}] ${issue.code}: ${issue.message}`));
          if (issue.attributeNames) {
            console.log(chalk.gray(`   Attributes: ${issue.attributeNames.join(', ')}`));
          }
        });
      }
      
      // Check for images
      const attributes = (listingResponse as any).attributes || {};
      const hasMainImage = !!attributes.main_product_image_locator;
      console.log('Has main image:', hasMainImage ? '✅ Yes' : '❌ No');
      
      if (hasMainImage) {
        console.log('Image URL:', attributes.main_product_image_locator[0].media_location);
      }

    } catch (error: any) {
      if (error.message.includes('404')) {
        console.log(chalk.yellow('⏳ Listing not found yet - still processing'));
        console.log(chalk.gray('This is normal. New listings can take 5-30 minutes to appear.'));
      } else {
        console.error(chalk.red('Error checking listing:'), error.message);
      }
    }

  } catch (error) {
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

checkSubmission().catch(console.error);