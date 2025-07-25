import { existsSync } from 'fs';
import { resolve, extname } from 'path';
import { 
  HarnessConfig, 
  ValidationResult, 
  ValidationError, 
  VALIDATION_RULES, 
  AMAZON_CATEGORIES,
  CategoryKey 
} from '../config/harness-schema.js';

export async function validateHarnessConfig(config: any): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Check if config is an object
  if (!config || typeof config !== 'object') {
    errors.push({
      field: 'root',
      message: 'Configuration must be a valid object',
      value: config,
    });
    return { isValid: false, errors, warnings };
  }

  // Validate each section
  validateProductSection(config.product, errors);
  validateSpecificationsSection(config.specifications, errors);
  validatePricingSection(config.pricing, errors);
  validateImagesSection(config.images, errors);
  validateAmazonSection(config.amazon, errors, warnings);

  // Cross-field validations
  performCrossFieldValidation(config, errors, warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateProductSection(product: any, errors: ValidationError[]): void {
  if (!product || typeof product !== 'object') {
    errors.push({
      field: 'product',
      message: 'Product section is required and must be an object',
      value: product,
    });
    return;
  }

  const rules = VALIDATION_RULES.product;

  // Validate title
  if (!product.title) {
    errors.push({
      field: 'product.title',
      message: 'Product title is required',
    });
  } else if (typeof product.title !== 'string') {
    errors.push({
      field: 'product.title',
      message: 'Product title must be a string',
      value: product.title,
    });
  } else {
    if (product.title.length < rules.title.minLength) {
      errors.push({
        field: 'product.title',
        message: `Title must be at least ${rules.title.minLength} characters long`,
        value: product.title,
      });
    }
    if (product.title.length > rules.title.maxLength) {
      errors.push({
        field: 'product.title',
        message: `Title must be at most ${rules.title.maxLength} characters long`,
        value: product.title,
      });
    }
    if (!rules.title.pattern.test(product.title)) {
      errors.push({
        field: 'product.title',
        message: 'Title contains invalid characters. Use only letters, numbers, spaces, and common punctuation',
        value: product.title,
      });
    }
  }

  // Validate SKU
  if (!product.sku) {
    errors.push({
      field: 'product.sku',
      message: 'Product SKU is required',
    });
  } else if (typeof product.sku !== 'string') {
    errors.push({
      field: 'product.sku',
      message: 'Product SKU must be a string',
      value: product.sku,
    });
  } else {
    if (product.sku.length < rules.sku.minLength) {
      errors.push({
        field: 'product.sku',
        message: `SKU must be at least ${rules.sku.minLength} characters long`,
        value: product.sku,
      });
    }
    if (product.sku.length > rules.sku.maxLength) {
      errors.push({
        field: 'product.sku',
        message: `SKU must be at most ${rules.sku.maxLength} characters long`,
        value: product.sku,
      });
    }
    if (!rules.sku.pattern.test(product.sku)) {
      errors.push({
        field: 'product.sku',
        message: 'SKU must contain only uppercase letters, numbers, hyphens, and underscores',
        value: product.sku,
      });
    }
  }

  // Validate description
  if (!product.description) {
    errors.push({
      field: 'product.description',
      message: 'Product description is required',
    });
  } else if (typeof product.description !== 'string') {
    errors.push({
      field: 'product.description',
      message: 'Product description must be a string',
      value: product.description,
    });
  } else {
    if (product.description.length < rules.description.minLength) {
      errors.push({
        field: 'product.description',
        message: `Description must be at least ${rules.description.minLength} characters long`,
        value: product.description.length,
      });
    }
    if (product.description.length > rules.description.maxLength) {
      errors.push({
        field: 'product.description',
        message: `Description must be at most ${rules.description.maxLength} characters long`,
        value: product.description.length,
      });
    }
  }
}

function validateSpecificationsSection(specifications: any, errors: ValidationError[]): void {
  if (!specifications || typeof specifications !== 'object') {
    errors.push({
      field: 'specifications',
      message: 'Specifications section is required and must be an object',
      value: specifications,
    });
    return;
  }

  const rules = VALIDATION_RULES.specifications;

  // Validate pin_count
  if (specifications.pin_count === undefined) {
    errors.push({
      field: 'specifications.pin_count',
      message: 'Pin count is required',
    });
  } else if (typeof specifications.pin_count !== 'number' || !Number.isInteger(specifications.pin_count)) {
    errors.push({
      field: 'specifications.pin_count',
      message: 'Pin count must be an integer',
      value: specifications.pin_count,
    });
  } else {
    if (specifications.pin_count < rules.pin_count.min) {
      errors.push({
        field: 'specifications.pin_count',
        message: `Pin count must be at least ${rules.pin_count.min}`,
        value: specifications.pin_count,
      });
    }
    if (specifications.pin_count > rules.pin_count.max) {
      errors.push({
        field: 'specifications.pin_count',
        message: `Pin count must be at most ${rules.pin_count.max}`,
        value: specifications.pin_count,
      });
    }
  }

  // Validate wire_gauge
  if (!specifications.wire_gauge) {
    errors.push({
      field: 'specifications.wire_gauge',
      message: 'Wire gauge is required',
    });
  } else if (!rules.wire_gauge.validValues.includes(specifications.wire_gauge)) {
    errors.push({
      field: 'specifications.wire_gauge',
      message: `Wire gauge must be one of: ${rules.wire_gauge.validValues.join(', ')}`,
      value: specifications.wire_gauge,
    });
  }

  // Validate length
  if (!specifications.length) {
    errors.push({
      field: 'specifications.length',
      message: 'Length is required',
    });
  } else if (!rules.length.pattern.test(specifications.length)) {
    errors.push({
      field: 'specifications.length',
      message: 'Length must include a number and unit (e.g., "24 inches", "12 ft", "30 cm")',
      value: specifications.length,
    });
  }

  // Validate connector_type
  if (!specifications.connector_type) {
    errors.push({
      field: 'specifications.connector_type',
      message: 'Connector type is required',
    });
  } else if (!rules.connector_type.validValues.includes(specifications.connector_type)) {
    errors.push({
      field: 'specifications.connector_type',
      message: `Connector type must be one of: ${rules.connector_type.validValues.join(', ')}`,
      value: specifications.connector_type,
    });
  }
}

function validatePricingSection(pricing: any, errors: ValidationError[]): void {
  if (!pricing || typeof pricing !== 'object') {
    errors.push({
      field: 'pricing',
      message: 'Pricing section is required and must be an object',
      value: pricing,
    });
    return;
  }

  const rules = VALIDATION_RULES.pricing;

  // Validate price
  if (pricing.price === undefined) {
    errors.push({
      field: 'pricing.price',
      message: 'Price is required',
    });
  } else if (typeof pricing.price !== 'number') {
    errors.push({
      field: 'pricing.price',
      message: 'Price must be a number',
      value: pricing.price,
    });
  } else {
    if (pricing.price < rules.price.min) {
      errors.push({
        field: 'pricing.price',
        message: `Price must be at least $${rules.price.min}`,
        value: pricing.price,
      });
    }
    if (pricing.price > rules.price.max) {
      errors.push({
        field: 'pricing.price',
        message: `Price must be at most $${rules.price.max}`,
        value: pricing.price,
      });
    }
  }

  // Validate compare_at_price (optional)
  if (pricing.compare_at_price !== undefined) {
    if (typeof pricing.compare_at_price !== 'number') {
      errors.push({
        field: 'pricing.compare_at_price',
        message: 'Compare at price must be a number',
        value: pricing.compare_at_price,
      });
    } else {
      if (pricing.compare_at_price < rules.compare_at_price.min) {
        errors.push({
          field: 'pricing.compare_at_price',
          message: `Compare at price must be at least $${rules.compare_at_price.min}`,
          value: pricing.compare_at_price,
        });
      }
      if (pricing.compare_at_price > rules.compare_at_price.max) {
        errors.push({
          field: 'pricing.compare_at_price',
          message: `Compare at price must be at most $${rules.compare_at_price.max}`,
          value: pricing.compare_at_price,
        });
      }
    }
  }
}

function validateImagesSection(images: any, errors: ValidationError[]): void {
  if (!images) {
    errors.push({
      field: 'images',
      message: 'Images section is required',
    });
    return;
  }

  if (!Array.isArray(images)) {
    errors.push({
      field: 'images',
      message: 'Images must be an array',
      value: images,
    });
    return;
  }

  const rules = VALIDATION_RULES.images;

  if (images.length < rules.minCount) {
    errors.push({
      field: 'images',
      message: `At least ${rules.minCount} image is required`,
      value: images.length,
    });
  }

  if (images.length > rules.maxCount) {
    errors.push({
      field: 'images',
      message: `At most ${rules.maxCount} images are allowed`,
      value: images.length,
    });
  }

  // Validate each image path
  images.forEach((imagePath: any, index: number) => {
    if (typeof imagePath !== 'string') {
      errors.push({
        field: `images[${index}]`,
        message: 'Image path must be a string',
        value: imagePath,
      });
      return;
    }

    const ext = extname(imagePath).toLowerCase();
    if (!rules.validExtensions.includes(ext as '.jpg' | '.jpeg' | '.png')) {
      errors.push({
        field: `images[${index}]`,
        message: `Image must have valid extension: ${rules.validExtensions.join(', ')}`,
        value: imagePath,
      });
    }

    // Check if file exists (for relative paths, resolve from current directory)
    const resolvedPath = resolve(imagePath);
    if (!existsSync(resolvedPath)) {
      errors.push({
        field: `images[${index}]`,
        message: 'Image file not found',
        value: imagePath,
      });
    }
  });
}

function validateAmazonSection(amazon: any, errors: ValidationError[], warnings: string[]): void {
  if (!amazon || typeof amazon !== 'object') {
    errors.push({
      field: 'amazon',
      message: 'Amazon section is required and must be an object',
      value: amazon,
    });
    return;
  }

  const rules = VALIDATION_RULES.amazon;

  // Validate category
  if (!amazon.category) {
    errors.push({
      field: 'amazon.category',
      message: 'Amazon category is required',
    });
  } else if (!rules.category.validValues.includes(amazon.category as CategoryKey)) {
    errors.push({
      field: 'amazon.category',
      message: `Category must be one of: ${rules.category.validValues.join(', ')}`,
      value: amazon.category,
    });
  }

  // Validate search_keywords
  if (!Array.isArray(amazon.search_keywords)) {
    errors.push({
      field: 'amazon.search_keywords',
      message: 'Search keywords must be an array',
      value: amazon.search_keywords,
    });
  } else {
    if (amazon.search_keywords.length < rules.search_keywords.minCount) {
      errors.push({
        field: 'amazon.search_keywords',
        message: `At least ${rules.search_keywords.minCount} search keywords are required`,
        value: amazon.search_keywords.length,
      });
    }
    if (amazon.search_keywords.length > rules.search_keywords.maxCount) {
      errors.push({
        field: 'amazon.search_keywords',
        message: `At most ${rules.search_keywords.maxCount} search keywords are allowed`,
        value: amazon.search_keywords.length,
      });
    }

    // Check for duplicate keywords
    const uniqueKeywords = new Set(amazon.search_keywords);
    if (uniqueKeywords.size !== amazon.search_keywords.length) {
      warnings.push('Search keywords contain duplicates - consider removing duplicates for better optimization');
    }
  }

  // Validate bullet_points
  if (!Array.isArray(amazon.bullet_points)) {
    errors.push({
      field: 'amazon.bullet_points',
      message: 'Bullet points must be an array',
      value: amazon.bullet_points,
    });
  } else {
    if (amazon.bullet_points.length < rules.bullet_points.minCount) {
      errors.push({
        field: 'amazon.bullet_points',
        message: `At least ${rules.bullet_points.minCount} bullet points are required`,
        value: amazon.bullet_points.length,
      });
    }
    if (amazon.bullet_points.length > rules.bullet_points.maxCount) {
      errors.push({
        field: 'amazon.bullet_points',
        message: `At most ${rules.bullet_points.maxCount} bullet points are allowed`,
        value: amazon.bullet_points.length,
      });
    }

    // Validate each bullet point
    amazon.bullet_points.forEach((point: any, index: number) => {
      if (typeof point !== 'string') {
        errors.push({
          field: `amazon.bullet_points[${index}]`,
          message: 'Bullet point must be a string',
          value: point,
        });
      } else if (point.length > rules.bullet_points.itemMaxLength) {
        errors.push({
          field: `amazon.bullet_points[${index}]`,
          message: `Bullet point must be at most ${rules.bullet_points.itemMaxLength} characters`,
          value: point.length,
        });
      }
    });
  }
}

function performCrossFieldValidation(config: any, errors: ValidationError[], warnings: string[]): void {
  // Validate price comparison
  if (config.pricing?.price && config.pricing?.compare_at_price) {
    if (config.pricing.compare_at_price <= config.pricing.price) {
      warnings.push('Compare at price should be higher than the regular price for effective marketing');
    }
  }

  // Validate category-specific requirements
  if (config.amazon?.category && config.specifications) {
    const categoryInfo = AMAZON_CATEGORIES[config.amazon.category as CategoryKey];
    if (categoryInfo) {
      categoryInfo.requiredAttributes.forEach(attr => {
        if (!config.specifications[attr]) {
          warnings.push(`Consider adding ${attr} specification for better categorization in ${categoryInfo.name}`);
        }
      });
    }
  }

  // Validate SKU pattern consistency
  if (config.product?.sku && config.specifications) {
    const sku = config.product.sku;
    const specs = config.specifications;
    
    // Check if SKU includes key specifications
    if (specs.pin_count && !sku.includes(specs.pin_count.toString())) {
      warnings.push('Consider including pin count in SKU for better inventory management');
    }
    
    if (specs.wire_gauge && !sku.includes(specs.wire_gauge.replace(' ', '').replace('AWG', ''))) {
      warnings.push('Consider including wire gauge in SKU for better inventory management');
    }
  }
}