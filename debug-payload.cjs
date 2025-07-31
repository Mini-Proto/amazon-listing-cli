#!/usr/bin/env node
const chalk = require('chalk').default || require('chalk');

console.log(chalk.blue('📦 Amazon SP-API Payload Analysis\n'));

// Test configuration
const config = {
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
    price: 12.99
  }
};

function extractLengthUnit(length) {
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

const marketplaceId = 'ATVPDKIKX0DER';

// Build attributes as the API does
const attributes = {
  item_name: [{
    value: config.product.title,
    marketplace_id: marketplaceId,
  }],
  
  brand: [{
    value: 'MiniProto',
    marketplace_id: marketplaceId,
  }],
  
  manufacturer: [{
    value: 'MiniProto',
    marketplace_id: marketplaceId,
  }],
  
  product_description: [{
    value: config.product.description,
    marketplace_id: marketplaceId,
  }],
  
  bullet_point: config.amazon.bullet_points.map(point => ({
    value: point,
    marketplace_id: marketplaceId,
  })),
  
  list_price: [{
    value: {
      amount: config.pricing.price,
      currency_code: 'USD',
    },
    marketplace_id: marketplaceId,
  }],
  
  // Wire harness specific attributes
  wire_gauge: [{
    value: config.specifications.wire_gauge,
    marketplace_id: marketplaceId,
  }],
  
  cable_length: [{
    value: {
      value: parseFloat(config.specifications.length.match(/\d+(\.\d+)?/)?.[0] || '0'),
      unit: extractLengthUnit(config.specifications.length),
    },
    marketplace_id: marketplaceId,
  }],
  
  connector_type: [{
    value: config.specifications.connector_type,
    marketplace_id: marketplaceId,
  }],
  
  number_of_pins: [{
    value: config.specifications.pin_count,
    marketplace_id: marketplaceId,
  }],
  
  generic_keyword: config.amazon.search_keywords.map(keyword => ({
    value: keyword,
    marketplace_id: marketplaceId,
  })),
};

console.log(chalk.yellow('🔧 Generated SP-API Attributes:'));
console.log(JSON.stringify(attributes, null, 2));

console.log(chalk.yellow('\n🔍 Key Field Analysis:'));
console.log('\nwire_gauge:', JSON.stringify(attributes.wire_gauge[0].value));
console.log('cable_length:', JSON.stringify(attributes.cable_length[0].value));
console.log('number_of_pins:', JSON.stringify(attributes.number_of_pins[0].value));
console.log('connector_type:', JSON.stringify(attributes.connector_type[0].value));

console.log(chalk.yellow('\n⚠️  Potential Issues to Check:'));
console.log('1. wire_gauge: Should be "18 AWG" format (with space)');
console.log('2. cable_length: Numeric value + unit object format');
console.log('3. number_of_pins: Should be a number, not string');
console.log('4. All custom attributes need to be in Amazon\'s allowed list');

console.log(chalk.blue('\n💡 To debug actual API errors:'));
console.log('1. Run: amazon-harness create your-config.yaml --verbose');
console.log('2. Look for "Response data:" in the output');
console.log('3. Check the "issues" array for specific field errors');
console.log('4. Note any "attributeName" values in the errors');