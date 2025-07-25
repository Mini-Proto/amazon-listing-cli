# Test Harness Configuration Guide

## Quick Test Example

This `test-harness.yaml` file is a complete, working example you can use to test the Amazon Listing CLI right away.

### What's Included

- **Product**: 6-pin industrial wire harness with realistic specifications
- **SKU**: `MP-WH-6PIN-20AWG-18IN-001` (follows good naming conventions)
- **Price**: $19.99 (with compare-at price of $29.99)
- **Images**: 4 placeholder images that pass validation
- **Category**: Industrial electrical (most common for wire harnesses)
- **Description**: Professional, detailed description with bullet points

### Testing the Configuration

1. **Validate the YAML syntax and content:**
```bash
cd scripts/amazon-listing
npm run build
npm start create examples/test-harness.yaml --dry-run --verbose
```

2. **Test with different configurations:**
```bash
# Test just the configuration validation
npm start test --config

# Test API authentication (requires credentials)
npm start test --auth

# Test everything together
npm start test
```

### Key Features Demonstrated

- **Comprehensive Validation**: All required fields with proper data types
- **SEO Optimized**: Search keywords and bullet points optimized for Amazon
- **Professional Description**: Well-structured with benefits and specifications
- **Realistic Pricing**: Competitive pricing with discount strategy
- **Industry Standards**: Follows electrical industry naming conventions

### Customizing for Your Product

1. **Update Product Information:**
   - Change `title`, `sku`, and `description` to match your product
   - Adjust `pin_count`, `wire_gauge`, and `length` as needed
   - Update pricing to match your business model

2. **Replace Images:**
   - Replace placeholder images with actual product photos
   - Ensure images are at least 1000x1000 pixels
   - Use JPG or PNG format, max 10MB per file

3. **Optimize for Amazon:**
   - Research relevant keywords for your specific product
   - Update bullet points to highlight your unique value proposition
   - Choose the most appropriate category for your market

### Expected Validation Results

This configuration should pass all validation checks:
- ✅ All required fields present
- ✅ Valid wire gauge (20 AWG)
- ✅ Realistic pin count (6)
- ✅ Proper length format ("18 inches")  
- ✅ Valid connector type ("Crimp Terminal")
- ✅ Appropriate price range ($19.99)
- ✅ Valid Amazon category
- ✅ Sufficient keywords (10) and bullet points (5)
- ✅ Image files exist and have valid extensions

### Common Modifications

**For Automotive Applications:**
```yaml
amazon:
  category: "automotive-electrical"
specifications:
  connector_type: "Deutsch Connector"
  voltage_rating: "12V DC"
```

**For High Pin Count:**
```yaml
specifications:
  pin_count: 32
  wire_gauge: "22 AWG"
pricing:
  price: 89.99
```

**For Different Lengths:**
```yaml
specifications:
  length: "3 feet"        # or "36 inches", "91 cm", etc.
```

### Next Steps

Once you've tested this configuration successfully:

1. **Set up your Amazon credentials** using `npm start configure`
2. **Create your own YAML** files based on this template
3. **Replace placeholder images** with actual product photos
4. **Run real product creation** without `--dry-run` flag

This test configuration provides a solid foundation for understanding how the CLI works and what Amazon expects for wire harness listings.