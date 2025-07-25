# Amazon Listing CLI for Wire Harnesses

A powerful command-line tool for managing Amazon product listings specifically designed for wire harness manufacturers. Streamline your Amazon Seller Central operations with automated listing creation, updates, and management via the Amazon SP-API.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/@miniproto/amazon-listing-cli.svg)](https://www.npmjs.com/package/@miniproto/amazon-listing-cli)

## ✨ Features

- **🚀 Complete CRUD Operations**: Create, read, update, and delete Amazon listings
- **📝 YAML Configuration**: Human-readable configuration files with comprehensive validation
- **🔒 Secure Authentication**: Modern LWA-only authentication (no IAM roles required)
- **🖼️ Image Processing**: Automatic optimization to meet Amazon's requirements
- **🛡️ Safety First**: Dry-run mode, confirmation prompts, and comprehensive validation
- **📊 Batch Operations**: Handle multiple products efficiently
- **🔍 Smart Validation**: Business rules specific to wire harness products
- **📈 Real-time Feedback**: Progress tracking and detailed error reporting

## 📋 Prerequisites

- Node.js 18+ and npm
- Amazon Seller Central account
- Amazon SP-API application (registered in Seller Central)
- LWA credentials (Client ID, Client Secret, Refresh Token)

## 🚀 Quick Start

### 1. Installation

#### Option A: Install from npm (Recommended)
```bash
# Install globally
npm install -g @miniproto/amazon-listing-cli

# Or install locally
npm install @miniproto/amazon-listing-cli
```

#### Option B: Install from source
```bash
# Clone the repository
git clone https://github.com/miniproto/amazon-listing-cli.git
cd amazon-listing-cli

# Install dependencies
npm install

# Build the CLI
npm run build

# Link globally (optional)
npm link
```

### 2. Initial Setup

Create your environment configuration:

```bash
# Copy the example environment file
cp .env.example .env

# Edit with your credentials
nano .env
```

Add your Amazon SP-API credentials to `.env`:

```env
AMAZON_CLIENT_ID=amzn1.application-oa2-client.your-client-id
AMAZON_CLIENT_SECRET=amzn1.oa2-cs.v1.your-client-secret
AMAZON_REFRESH_TOKEN=Atzr|your-refresh-token
AMAZON_REGION=us-east-1
AMAZON_MARKETPLACE_ID=ATVPDKIKX0DER
AMAZON_SELLER_ID=your-seller-id
AMAZON_SANDBOX=false
```

### 3. Configure CLI

```bash
npm start configure
```

### 4. Create Your First Listing

```bash
# Validate configuration first
npm start validate examples/basic-harness.yaml

# Create the listing
npm start create examples/basic-harness.yaml
```

## 📖 Usage Guide

### Core Commands

#### 🏗️ Create Listing
```bash
# Create a new listing
amazon-harness create config.yaml

# Validate before creating
amazon-harness validate config.yaml
amazon-harness create config.yaml --dry-run
```

#### 📋 List Products
```bash
# List all products
amazon-harness list

# Filter by SKU pattern
amazon-harness list --filter "MP-JST"

# Export to CSV
amazon-harness list --format csv > products.csv

# Show detailed information
amazon-harness list --detailed --limit 5
```

#### 🔄 Update Listing
```bash
# Update with change preview
amazon-harness update config.yaml --dry-run

# Apply updates
amazon-harness update config.yaml

# Skip image upload
amazon-harness update config.yaml --skip-images
```

#### 🗑️ Delete Listing
```bash
# Delete single product (with confirmation)
amazon-harness delete MP-JST-MM-8IN-10

# Batch delete with pattern
amazon-harness delete --batch "TEST-*" --dry-run

# Force delete without confirmation
amazon-harness delete MP-JST-MM-8IN-10 --force
```

#### ✅ Validate Configuration
```bash
# Basic validation
amazon-harness validate config.yaml

# Strict mode (warnings as errors)
amazon-harness validate config.yaml --strict

# JSON output
amazon-harness validate config.yaml --format json
```

### Configuration Management

#### Initial Setup
```bash
# Interactive configuration setup
amazon-harness configure

# Test your configuration
amazon-harness test auth
amazon-harness test list-products
```

## 📝 Configuration Format

### YAML Configuration Structure

```yaml
product:
  title: "Genuine JST Connector Pre-Crimped Wire Leads - 8 inches, 10 pack"
  sku: "MP-JST-MM-8IN-10"
  description: |
    High-quality JST connector pre-crimped wire leads perfect for electronics,
    robotics, and automotive applications. Made with durable GXL wire.

specifications:
  pin_count: 2
  wire_gauge: "20 AWG"
  length: "8 inches"
  connector_type: "JST Connector"
  current_rating: "3A"
  voltage_rating: "250V"
  temperature_range: "-40°C to +85°C"

pricing:
  price: 16.99
  compare_at_price: 21.99

images:
  - "images/main-product.jpg"
  - "images/detail-view.jpg"
  - "images/packaging.jpg"

amazon:
  category: "industrial-electrical"
  search_keywords:
    - "JST connector cable"
    - "pre-crimped wire leads"
    - "electronics connectors"
  bullet_points:
    - "Genuine JST Quality: Authentic connectors ensure reliable connections"
    - "High-Quality GXL Wire: Durable 20 AWG wire rated for 3A/250V"
    - "Pre-Crimped Ready: Save time with professionally assembled leads"
    - "Versatile Applications: Perfect for electronics, robotics, automotive"
    - "USA Assembled: Quality manufacturing with precision assembly"
```

### Validation Rules

The CLI enforces comprehensive validation:

- **Product**: Title (10-200 chars), SKU (3-40 chars), description (50-2000 chars)
- **Specifications**: Valid wire gauges, connector types, measurements
- **Amazon**: Category validation, 3-5 bullet points, relevant keywords
- **Images**: Valid formats (JPG/PNG), file existence, size requirements
- **Pricing**: Reasonable price ranges, compare-at-price logic

## 🖼️ Image Requirements

### Amazon Standards
- **Minimum Resolution**: 1000x1000 pixels
- **Supported Formats**: JPG, PNG
- **Maximum File Size**: 10MB per image
- **Maximum Images**: 6 images per listing

### Processing Features
- Automatic resizing and optimization
- Format conversion if needed
- Validation against Amazon requirements
- Progress tracking during upload

## 🔧 Advanced Usage

### Development & Testing

#### Sandbox Mode
```bash
# Test in Amazon's sandbox environment
export AMAZON_SANDBOX=true
amazon-harness create test-config.yaml
```

#### Debugging
```bash
# Verbose output
amazon-harness create config.yaml --verbose

# Debug API calls
DEBUG=amazon-harness:* amazon-harness list
```

## 🛠️ Development

### Building from Source

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Development with watch mode
npm run dev

# Run tests
npm test
```

### Project Structure

```
scripts/amazon-listing/
├── api/                 # Amazon SP-API integration
├── cli/                 # CLI commands and interface
├── config/              # Configuration schemas
├── utils/               # Utility functions
├── examples/            # Example configurations
├── debug/               # Debugging tools
└── docs/                # Additional documentation
```

## 🔍 Troubleshooting

### Common Issues

#### Authentication Problems
```bash
# Check credentials
amazon-harness test auth

# Refresh token expired
# Generate new refresh token in Seller Central
```

#### Upload Permissions
```bash
# SP-API application not approved
# Status: Draft -> Submit for approval in Seller Central
```

#### Image Upload Failures
```bash
# Check image requirements
amazon-harness validate config.yaml --verbose

# Skip images temporarily
amazon-harness create config.yaml --skip-images
```

### Debug Commands

```bash
# Test specific functionality
amazon-harness test auth
amazon-harness test list-products
amazon-harness test upload-image

# Check specific SKU
amazon-harness debug check-sku MP-JST-MM-8IN-10

# Show detailed API responses
amazon-harness list --verbose
```

## 📚 Documentation

- [CLAUDE.md](./CLAUDE.md) - Development guide for Claude
- [Examples](./examples/) - Sample configurations
- [Troubleshooting Guide](./docs/TROUBLESHOOTING.md) - Common issues and solutions
- [Amazon SP-API Documentation](https://github.com/amzn/selling-partner-api-docs)

## 🔐 Security

- Environment variables for sensitive credentials
- No hardcoded secrets in configuration files
- Secure credential storage in `~/.amazon-harness/`
- Regular credential rotation recommended

## 📈 Performance

- Built-in rate limiting for Amazon SP-API
- Parallel image processing
- Efficient batch operations
- Progress tracking for long operations

## 📄 License

ISC License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Amazon SP-API documentation and examples
- Wire harness industry standards and best practices
- MiniProto team for domain expertise and testing

---

**Version**: 1.0.0  
**Last Updated**: 2025-07-25  
**Node.js**: 18+  
**TypeScript**: 5.3+

## Status

### ✅ Completed - All Major Phases

**Phase 1 - Foundation:**
- ✅ Project structure and TypeScript configuration
- ✅ CLI framework with Commander.js
- ✅ Configuration management with secure storage
- ✅ Modern LWA-only SP-API authentication (no IAM roles)
- ✅ Rate limiting and error handling

**Phase 2 - Core Product Creation:**
- ✅ YAML configuration parser with comprehensive validation
- ✅ Wire harness schema with industry-specific rules
- ✅ Image processing with Sharp (resize, optimize)
- ✅ Listings Items API integration
- ✅ End-to-end product creation workflow

**Phase 3 - Management Features:**
- ✅ Update command with change detection
- ✅ List command with filtering and multiple output formats
- ✅ Delete command with safety features and batch operations
- ✅ Enhanced validation with business rules

**Phase 4 - Polish & Documentation:**
- ✅ Comprehensive documentation and examples
- ✅ CLAUDE.md for development guidance
- 🔄 Batch processing and template system (in progress)

### Ready for Production Use

The CLI provides complete Amazon listing management:
1. **Create** - New listings from YAML configurations
2. **Read** - List and search existing products
3. **Update** - Modify listings with change detection
4. **Delete** - Remove listings with safety confirmations
5. **Validate** - Comprehensive configuration validation
6. **Configure** - Easy credential setup and testing