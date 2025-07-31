#!/usr/bin/env node
import * as dotenv from 'dotenv';
import * as path from 'path';
import chalk from 'chalk';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Mock the buildListingAttributes method to see the exact payload
function buildListingAttributes(
  harnessConfig: any,
  uploadedImages: any[],
  marketplaceId: string
): Record<string, any> {
  const attributes: Record<string, any> = {
    // Basic product information
    item_name: [
      {
        value: harnessConfig.product.title,
        marketplace_id: marketplaceId,
      }
    ],

    brand: [
      {
        value: 'MiniProto',
        marketplace_id: marketplaceId,
      }
    ],

    manufacturer: [
      {
        value: 'MiniProto',
        marketplace_id: marketplaceId,
      }
    ],

    // Product description and bullet points
    product_description: [
      {
        value: harnessConfig.product.description,
        marketplace_id: marketplaceId,
      }
    ],

    bullet_point: harnessConfig.amazon.bullet_points.map((point: string) => ({
      value: point,
      marketplace_id: marketplaceId,
    })),

    // Pricing
    list_price: [
      {
        value: {
          amount: harnessConfig.pricing.price,
          currency_code: 'USD',
        },
        marketplace_id: marketplaceId,
      }
    ],

    // Wire harness specific attributes
    wire_gauge: [
      {
        value: harnessConfig.specifications.wire_gauge,
        marketplace_id: marketplaceId,
      }
    ],

    cable_length: [
      {
        value: {
          value: parseFloat(harnessConfig.specifications.length.match(/\d+(\.\d+)?/)?.[0] || '0'),
          unit: extractLengthUnit(harnessConfig.specifications.length),
        },
        marketplace_id: marketplaceId,
      }
    ],

    connector_type: [
      {
        value: harnessConfig.specifications.connector_type,
        marketplace_id: marketplaceId,
      }
    ],

    number_of_pins: [
      {
        value: harnessConfig.specifications.pin_count,
        marketplace_id: marketplaceId,
      }
    ],

    // Search keywords
    generic_keyword: harnessConfig.amazon.search_keywords.slice(0, 5).map((keyword: string) => ({
      value: keyword,
      marketplace_id: marketplaceId,
    })),
  };

  // Remove undefined values
  Object.keys(attributes).forEach(key => {
    if (attributes[key] === undefined) {
      delete attributes[key];
    }
  });

  return attributes;
}

function extractLengthUnit(length: string): string {
  if (length.includes('inch')) return 'inches';
  if (length.includes('in')) return 'inches';
  if (length.includes('"')) return 'inches';
  if (length.includes('feet') || length.includes('foot')) return 'feet';
  if (length.includes('ft')) return 'feet';
  if (length.includes('cm')) return 'centimeters';
  if (length.includes('mm')) return 'millimeters';
  if (length.includes('m')) return 'meters';
  return 'inches'; // default
}

async function showApiPayload(configFile?: string) {
  console.log(chalk.blue('📦 Amazon SP-API Payload Generator\n'));

  let config: any;

  if (configFile && fs.existsSync(configFile)) {
    console.log(chalk.yellow('Loading config from:'), configFile);
    const content = fs.readFileSync(configFile, 'utf8');
    config = yaml.load(content);
  } else {
    // Use a test configuration
    config = {
      product: {
        title: 'MiniProto 4-Pin JST-SM Wire Harness - 24 inches',
        sku: 'MP-JST-SM-4-24',
        description: 'Professional grade 4-pin JST-SM wire harness'
      },
      specifications: {
        pin_count: 4,
        wire_gauge: '18 AWG',
        length: '24 inches',
        connector_type: 'JST-SM',
        current_rating: '3A',
        voltage_rating: '300V'
      },
      amazon: {
        category: 'Electronics > Electronics Accessories > Cables & Interconnects',
        bullet_points: [
          'Premium 18 AWG stranded copper wire',
          '4-pin JST-SM connectors on both ends'
        ],
        search_keywords: ['jst', 'wire harness', '4 pin', 'connector cable']
      },
      pricing: {
        price: 12.99,
        quantity: 10
      }
    };
  }

  const marketplaceId = process.env.AMAZON_MARKETPLACE_ID || 'ATVPDKIKX0DER';
  
  console.log(chalk.yellow('\n📋 Input Configuration:'));
  console.log(JSON.stringify(config, null, 2));

  const attributes = buildListingAttributes(config, [], marketplaceId);

  console.log(chalk.yellow('\n🔧 Generated SP-API Attributes:'));
  console.log(JSON.stringify(attributes, null, 2));

  // Show the full API request body
  const apiRequestBody = {
    productType: 'ELECTRIC_WIRE',
    requirements: 'LISTING',
    attributes: attributes
  };

  console.log(chalk.yellow('\n📤 Full API Request Body:'));
  console.log(JSON.stringify(apiRequestBody, null, 2));

  // Show specific field formats
  console.log(chalk.yellow('\n🔍 Key Field Analysis:'));
  console.log('\nwire_gauge:', JSON.stringify(attributes.wire_gauge[0].value));
  console.log('cable_length:', JSON.stringify(attributes.cable_length[0].value));
  console.log('number_of_pins:', JSON.stringify(attributes.number_of_pins[0].value));
  console.log('connector_type:', JSON.stringify(attributes.connector_type[0].value));
}

// Run the script
const configFile = process.argv[2];
showApiPayload(configFile).catch(console.error);