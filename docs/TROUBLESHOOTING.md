# Amazon Listing CLI - Troubleshooting Guide

This guide covers common issues and their solutions when using the Amazon Listing CLI for wire harness products.

## 🔍 Quick Diagnostics

Before diving into specific issues, run these diagnostic commands:

```bash
# Test all components
amazon-harness test

# Test specific components
amazon-harness test auth
amazon-harness test list-products
amazon-harness test config

# Check configuration
amazon-harness configure --show
```

## 🔐 Authentication Issues

### Issue: "403 Unauthorized" or "Access Denied"

**Symptoms:**
- API calls return 403 Unauthorized
- "Invalid or expired credentials" error
- Authentication test fails

**Causes & Solutions:**

#### 1. Expired Refresh Token
```bash
# Check token age
amazon-harness configure --show

# Solution: Generate new refresh token
# 1. Go to Amazon Seller Central
# 2. Navigate to Settings > User Permissions
# 3. Find your SP-API application
# 4. Generate new refresh token
# 5. Update configuration
amazon-harness configure
```

#### 2. Incorrect Credentials
```bash
# Verify credentials format
AMAZON_CLIENT_ID=amzn1.application-oa2-client.xxxxx
AMAZON_CLIENT_SECRET=amzn1.oa2-cs.v1.xxxxx
AMAZON_REFRESH_TOKEN=Atzr|xxxxx

# Test individual credentials
amazon-harness test auth --verbose
```

#### 3. Wrong Region/Marketplace
```bash
# Verify region matches your seller account
# US: us-east-1, ATVPDKIKX0DER
# EU: eu-west-1, A1PA6795UKMFR9 (UK)
# Check your Seller Central settings
```

### Issue: "Invalid grant" Error

**Solution:**
1. Refresh token is corrupted or expired
2. Generate new refresh token in Seller Central
3. Ensure no extra spaces in token

## 🚫 SP-API Application Issues

### Issue: "Upload APIs blocked" or "Draft Application"

**Symptoms:**
- Read operations work (list, get products)
- Upload operations fail with 403
- "Application not approved" message

**Solution:**
```bash
# Your SP-API application needs approval
# 1. Go to Amazon Seller Central
# 2. Navigate to Settings > User Permissions
# 3. Find your SP-API application
# 4. Submit for production approval
# 5. Wait for Amazon approval (2-7 business days)

# Meanwhile, use sandbox mode
export AMAZON_SANDBOX=true
amazon-harness create config.yaml
```

### Issue: "Rate Limit Exceeded"

**Symptoms:**
- "429 Too Many Requests" errors
- API calls failing intermittently

**Solution:**
```bash
# CLI has built-in rate limiting
# If still occurring:
# 1. Add delays between batch operations
# 2. Reduce concurrent operations
# 3. Check for other applications using same credentials

# Debug rate limiting
amazon-harness create config.yaml --verbose
```

## 📝 Configuration Issues

### Issue: "Configuration file not found"

**Symptoms:**
- "YAML file not found" error
- File path errors

**Solutions:**
```bash
# Check file exists
ls -la config.yaml

# Use absolute path
amazon-harness create /full/path/to/config.yaml

# Check current directory
pwd
ls *.yaml
```

### Issue: "YAML Parsing Error"

**Symptoms:**
- "Invalid YAML syntax" error
- Indentation errors
- Special character issues

**Solutions:**
```bash
# Validate YAML syntax online or with yamllint
yamllint config.yaml

# Common YAML issues:
# 1. Inconsistent indentation (use spaces, not tabs)
# 2. Unescaped special characters in strings
# 3. Missing quotes around strings with colons

# Use validate command
amazon-harness validate config.yaml --verbose
```

### Issue: "Validation Errors"

**Common Validation Issues:**

#### 1. Wire Gauge Format
```yaml
# ❌ Wrong
wire_gauge: 18

# ✅ Correct
wire_gauge: "18 AWG"
```

#### 2. Length Format
```yaml
# ❌ Wrong
length: 24

# ✅ Correct
length: "24 inches"
```

#### 3. Image Paths
```yaml
# ❌ Wrong (file doesn't exist)
images:
  - "missing-image.jpg"

# ✅ Correct (relative to config file)
images:
  - "images/main-product.jpg"
```

#### 4. Price Ranges
```yaml
# ❌ Wrong (too low/high)
pricing:
  price: 0.50  # Below $1 minimum
  
# ✅ Correct
pricing:
  price: 12.99
```

## 🖼️ Image Processing Issues

### Issue: "Image file not found"

**Solutions:**
```bash
# Check image paths relative to config file
ls -la images/

# Use absolute paths
images:
  - "/full/path/to/image.jpg"

# Verify file extensions
# Supported: .jpg, .jpeg, .png
```

### Issue: "Image too small" or "Invalid dimensions"

**Requirements:**
- Minimum: 1000x1000 pixels
- Maximum: 10MB per file
- Formats: JPG, PNG

**Solutions:**
```bash
# Check image dimensions
identify image.jpg  # Using ImageMagick

# Resize image
convert image.jpg -resize 1500x1500 image_resized.jpg

# CLI handles resize automatically if possible
```

### Issue: "Upload failed" or "Image processing error"

**Solutions:**
```bash
# Skip image upload temporarily
amazon-harness create config.yaml --skip-images

# Check file permissions
chmod 644 images/*.jpg

# Verify image format
file images/product.jpg
```

## 🛠️ CLI Operation Issues

### Issue: "Command not found"

**Solutions:**
```bash
# Ensure CLI is built
npm run build

# Use npm start instead
npm start create config.yaml

# Check package.json scripts
npm run
```

### Issue: "Module not found" or TypeScript errors

**Solutions:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild CLI
npm run build

# Check TypeScript version
npx tsc --version
```

### Issue: "Permission denied" on configuration files

**Solutions:**
```bash
# Fix config directory permissions
chmod 755 ~/.amazon-harness/
chmod 600 ~/.amazon-harness/config.json

# Run with proper permissions
# Don't use sudo for normal operations
```

## 📊 Product Listing Issues

### Issue: "Product not appearing on Amazon"

**Timeline:**
- Submission: Immediate (gets submission ID)
- Processing: 15 minutes - 2 hours
- Live on Amazon: 2-24 hours
- Searchable: 24-48 hours

**Check Status:**
```bash
# Check submission status
amazon-harness list --filter "YOUR-SKU"

# Look for specific SKU
amazon-harness debug check-sku YOUR-SKU-HERE

# Check in Seller Central manually
```

### Issue: "Listing rejected" or "FATAL status"

**Common Reasons:**
1. Category restrictions
2. Missing required attributes
3. Invalid product type
4. Image policy violations

**Solutions:**
```bash
# Check submission details
amazon-harness validate config.yaml --strict

# Use different category
amazon:
  category: "electronics-components"  # Try different category

# Simplify initial listing
# Remove optional fields, add them later via update
```

### Issue: "SKU already exists"

**Solutions:**
```bash
# Use update command instead
amazon-harness update config.yaml

# Or change SKU
product:
  sku: "NEW-UNIQUE-SKU-NAME"

# Check existing products
amazon-harness list --filter "MP-"
```

## 🔧 Development & Debugging

### Issue: "TypeScript compilation errors"

**Solutions:**
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Fix common issues
# 1. Update @types packages
npm update @types/node @types/js-yaml

# 2. Check import statements
# Use .js extensions in imports for ES modules
```

### Issue: "Network timeouts" or "Connection errors"

**Solutions:**
```bash
# Check internet connection
ping api.amazon.com

# Increase timeout
# CLI has 30-second default timeout

# Check corporate firewall/proxy
# May need to configure proxy settings
```

### Issue: "Debugging API calls"

**Enable Debug Mode:**
```bash
# Verbose output
amazon-harness create config.yaml --verbose

# Debug environment variable
DEBUG=amazon-harness:* amazon-harness list

# Check actual API requests/responses
amazon-harness test --verbose
```

## 📋 Environment-Specific Issues

### Issue: "Sandbox vs Production confusion"

**Check Current Mode:**
```bash
# Check environment
echo $AMAZON_SANDBOX

# View configuration
amazon-harness configure --show
```

**Switch Modes:**
```bash
# Sandbox mode
export AMAZON_SANDBOX=true

# Production mode
export AMAZON_SANDBOX=false
# OR
unset AMAZON_SANDBOX
```

### Issue: "Different environments have different data"

**Understanding:**
- Sandbox: Test environment, separate product catalog
- Production: Real Amazon marketplace
- No data sync between environments

## 🆘 Getting Additional Help

### 1. Diagnostic Information Collection

```bash
# Collect system info
node --version
npm --version
amazon-harness --version

# Test configuration
amazon-harness test --verbose > diagnostic-output.txt 2>&1

# Check recent logs
# Look in ~/.amazon-harness/logs/ if exists
```

### 2. Common Log Analysis

**Look for these patterns:**
- `401 Unauthorized`: Authentication issue
- `403 Forbidden`: Permission/approval issue  
- `429 Too Many Requests`: Rate limiting
- `400 Bad Request`: Invalid data
- `500 Internal Server Error`: Amazon API issue

### 3. Escalation Steps

1. **Check Amazon SP-API Documentation**: [SP-API Docs](https://github.com/amzn/selling-partner-api-docs)
2. **Amazon Seller Support**: For application approval issues
3. **Review Examples**: Compare with working examples in `examples/`
4. **Community Forums**: Amazon Seller Central forums

## 🔄 Recovery Procedures

### Complete Reset

```bash
# Backup existing config
cp ~/.amazon-harness/config.json ~/config-backup.json

# Clear configuration
rm -rf ~/.amazon-harness/

# Reinstall CLI
npm run build

# Reconfigure
amazon-harness configure

# Test basic functionality
amazon-harness test auth
```

### Partial Reset

```bash
# Reset only credentials
amazon-harness configure --reset-auth

# Reset only application config
amazon-harness configure --reset-app

# Restore from backup
cp ~/config-backup.json ~/.amazon-harness/config.json
```

## 📈 Performance Issues

### Issue: "CLI operations are slow"

**Optimizations:**
```bash
# Use smaller images
# Reduce to 1500x1500 max for faster upload

# Batch operations efficiently
# Use list command with filters instead of checking individual SKUs

# Skip unnecessary validations in production
amazon-harness create config.yaml --skip-images --force
```

### Issue: "High memory usage"

**Solutions:**
```bash
# Process images separately
# Large image files can use significant memory

# Use streaming for large operations
# CLI is designed for single operations, not bulk processing

# For bulk operations, use batch scripts
for config in configs/*.yaml; do
  amazon-harness create "$config"
  sleep 2  # Rate limiting
done
```

---

## 📞 Quick Reference

| Issue Type | First Command to Try |
|------------|---------------------|
| Authentication | `amazon-harness test auth` |
| Configuration | `amazon-harness validate config.yaml` |
| Images | `amazon-harness create config.yaml --skip-images` |
| API Errors | `amazon-harness test --verbose` |
| Permissions | Check SP-API application approval |
| Not Found | `amazon-harness list --filter "SKU-PATTERN"` |

**Remember**: Most issues are related to authentication or SP-API application approval status. Always check these first!