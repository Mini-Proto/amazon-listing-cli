# Amazon Listing CLI Examples

This directory contains example YAML configurations for different types of wire harnesses, demonstrating the full range of features available in the Amazon Listing CLI.

## Available Examples

### 1. Basic Harness (`basic-harness.yaml`)
- Simple 8-pin industrial harness
- 18 AWG wire, 24 inches long
- Crimp terminals
- Standard industrial category
- Perfect for getting started

### 2. Automotive Harness (`automotive-harness.yaml`)
- Heavy-duty 12-pin automotive harness
- 16 AWG wire, 3 feet long
- Deutsch waterproof connectors
- Automotive category with enhanced durability specs

### 3. High Pin Count (`high-pin-count.yaml`)
- Complex 64-pin industrial harness
- 22 AWG signal wire, 6 feet long
- Shielded construction for sensitive applications
- Electronics components category

### 4. JST Connector (`jst-connector.yaml`)
- Consumer electronics JST connector leads
- 20 AWG GXL wire, 8 inches
- Pre-crimped JST connectors
- DIY electronics market focused

### 5. Custom Application (`custom-application.yaml`)
- Specialized automotive trailer harness
- Mixed gauge wires, custom length
- Multiple connector types
- Shows advanced configuration options

### 6. Budget Product (`budget-harness.yaml`)
- Cost-effective basic harness
- Standard specifications
- Optimized for price-conscious customers
- Demonstrates pricing strategies

## Quick Start

1. **Configure your credentials:**
```bash
cd scripts/amazon-listing
npm run build
npm start configure --client-id YOUR_CLIENT_ID --client-secret YOUR_CLIENT_SECRET --refresh-token YOUR_REFRESH_TOKEN --region us-east-1 --marketplace-id ATVPDKIKX0DER --seller-id YOUR_SELLER_ID
```

2. **Test the configuration:**
```bash
npm start test --config --auth
```

3. **Try a dry run with an example:**
```bash
npm start create examples/basic-harness.yaml --dry-run --verbose
```

4. **Create the actual listing:**
```bash
npm start create examples/basic-harness.yaml
```

## Customizing Examples

### Required Sections

Every YAML file must include these sections:
- `product` - Basic product information (title, SKU, description)
- `specifications` - Technical specifications (pin count, wire gauge, etc.)
- `pricing` - Price information
- `images` - Array of image file paths
- `amazon` - Amazon-specific settings (category, keywords, bullet points)

### Image Requirements

- **Formats:** JPG, JPEG, or PNG
- **Minimum Size:** 1000x1000 pixels for main images
- **Maximum Size:** 10MB per file
- **Quantity:** 1-10 images per product

### Wire Gauge Options

Valid wire gauge values:
- 30 AWG, 28 AWG, 26 AWG, 24 AWG, 22 AWG, 20 AWG
- 18 AWG, 16 AWG, 14 AWG, 12 AWG, 10 AWG, 8 AWG

### Connector Types

Available connector types:
- Crimp Terminal, Ring Terminal, Spade Terminal
- Bullet Connector, Pin Connector
- Molex Connector, JST Connector, Deutsch Connector
- Custom Connector

### Amazon Categories

Available categories:
- `industrial-electrical` - Industrial & Scientific > Industrial Electrical > Wire Management
- `automotive-electrical` - Automotive > Replacement Parts > Electrical  
- `electronics-components` - Industrial & Scientific > Raw Materials > Electrical

## Validation

The CLI includes comprehensive validation:
- **YAML Syntax** - Checks for valid YAML format
- **Required Fields** - Ensures all mandatory fields are present
- **Data Types** - Validates correct data types (numbers, strings, arrays)
- **Value Ranges** - Checks realistic ranges for prices, pin counts, etc.
- **Amazon Requirements** - Validates category-specific requirements
- **Image Files** - Verifies image files exist and meet size requirements

## Troubleshooting

### Common Issues

1. **"Configuration file not found"**
   - Check the file path is correct
   - Ensure the file has .yaml or .yml extension

2. **"Wire gauge must be one of: ..."**
   - Use exact AWG format (e.g., "18 AWG")
   - Check the list of valid gauges above

3. **"Image file not found"**
   - Verify image paths are correct relative to current directory
   - Check file extensions are .jpg, .jpeg, or .png

4. **"Amazon API configuration not found"**
   - Run `npm start configure` to set up credentials
   - Use `npm start configure --show` to check current settings

### Getting Help

```bash
# Show general help
npm start --help

# Show command-specific help
npm start create --help
npm start configure --help
npm start test --help

# Run in verbose mode for detailed output
npm start create examples/basic-harness.yaml --verbose --dry-run
```