import chalk from 'chalk';
import { HarnessConfig } from '../config/harness-schema.js';
import { UploadedImage } from '../api/image-upload.js';
import { ProcessedImage, ImageProcessor } from '../utils/image-processor.js';
import { AmazonImageUploadService } from '../api/image-upload.js';
import { CatalogItemsAPI } from '../api/catalog-items.js';
import type { CreateCatalogItemResponse } from '../api/catalog-items.js';
import { ListingsItemsAPI, CreateListingResponse } from '../api/listings-items.js';
import { SPAPIClient } from '../api/client.js';
import { AmazonConfig } from '../config/default-config.js';

export interface ProductCreationResult {
  success: boolean;
  sku: string;
  asin?: string;
  listingUrl?: string;
  submissionId?: string;
  processedImages: ProcessedImage[];
  uploadedImages: UploadedImage[];
  catalogResponse?: CreateCatalogItemResponse;
  listingResponse?: CreateListingResponse;
  errors: string[];
  warnings: string[];
}

export class AmazonProductFormatter {
  private client: SPAPIClient;
  private catalogAPI: CatalogItemsAPI;
  private listingsAPI: ListingsItemsAPI;
  private imageUploadService: AmazonImageUploadService;
  private config: AmazonConfig;

  constructor(config: AmazonConfig) {
    this.config = config;
    this.client = new SPAPIClient(config);
    this.catalogAPI = new CatalogItemsAPI(this.client);
    this.listingsAPI = new ListingsItemsAPI(this.client);
    this.imageUploadService = new AmazonImageUploadService(this.client);
  }

  async createProduct(
    harnessConfig: HarnessConfig,
    isDryRun: boolean = false
  ): Promise<ProductCreationResult> {
    const result: ProductCreationResult = {
      success: false,
      sku: harnessConfig.product.sku,
      processedImages: [],
      uploadedImages: [],
      errors: [],
      warnings: [],
    };

    try {
      console.log(chalk.blue(`\n🚀 ${isDryRun ? 'DRY RUN: ' : ''}Creating Amazon product listing...\n`));

      // Step 1: Check if product already exists
      console.log(chalk.gray('1. Checking for existing products...'));
      const existingProduct = await this.catalogAPI.checkExistingProduct(
        harnessConfig.product.sku,
        [this.config.marketplaceId]
      );

      if (existingProduct) {
        result.warnings.push(`Product with SKU ${harnessConfig.product.sku} may already exist`);
        console.log(chalk.yellow(`⚠️  Similar product found - proceeding with caution`));
      } else {
        console.log(chalk.green('✅ No existing product found'));
      }

      // Step 2: Process images
      console.log(chalk.gray('2. Processing product images...'));
      if (isDryRun) {
        console.log(chalk.yellow('   🔍 DRY RUN: Would process images'));
        console.log(chalk.gray(`   Images to process: ${harnessConfig.images.length}`));
        harnessConfig.images.forEach((img, i) => {
          console.log(chalk.gray(`   ${i + 1}. ${img}`));
        });
      } else {
        const imageProcessor = new ImageProcessor({
          maxWidth: 2000,
          maxHeight: 2000,
          quality: 90,
          format: 'jpeg',
        });

        const imageResult = await imageProcessor.processImages(harnessConfig.images);
        result.processedImages = imageResult.success;

        if (imageResult.errors.length > 0) {
          result.errors.push(...imageResult.errors.map(e => `Image processing: ${e.error}`));
        }

        if (result.processedImages.length === 0) {
          console.log(chalk.yellow('⚠️  No images processed - continuing without images (upload permissions may be limited)'));
        }

        console.log(chalk.green(`✅ Processed ${result.processedImages.length} image(s)`));
      }

      // Step 3: Upload images to Amazon
      console.log(chalk.gray('3. Uploading images to Amazon...'));
      if (isDryRun) {
        console.log(chalk.yellow('   🔍 DRY RUN: Would upload images to Amazon S3'));
      } else {
        const uploadResult = await this.imageUploadService.uploadImages(result.processedImages, harnessConfig.product.sku);
        result.uploadedImages = uploadResult.uploaded;

        if (uploadResult.failed.length > 0) {
          result.errors.push(...uploadResult.failed.map(f => `Image upload: ${f.error}`));
        }

        if (result.uploadedImages.length === 0) {
          console.log(chalk.yellow('⚠️  No images uploaded - continuing with listing creation (images can be added later)'));
        }

        console.log(chalk.green(`✅ Uploaded ${result.uploadedImages.length} image(s)`));

        // Validate uploaded images meet Amazon requirements
        const validation = AmazonImageUploadService.validateUploads(result.uploadedImages);
        if (validation.invalid.length > 0) {
          validation.invalid.forEach(invalid => {
            result.warnings.push(`Image validation: ${invalid.issues.join(', ')}`);
          });
        }
      }

      // Step 4: Create catalog item (if needed)
      console.log(chalk.gray('4. Creating catalog item...'));
      if (isDryRun) {
        console.log(chalk.yellow('   🔍 DRY RUN: Would create catalog item'));
        console.log(chalk.gray(`   Product: ${harnessConfig.product.title}`));
        console.log(chalk.gray(`   Category: ${harnessConfig.amazon.category}`));
      } else {
        try {
          result.catalogResponse = await this.catalogAPI.createCatalogItem(
            harnessConfig,
            this.config.marketplaceId
          );

          if (result.catalogResponse.status === 'ACCEPTED') {
            console.log(chalk.green('✅ Catalog item created successfully'));
            if (result.catalogResponse.asin) {
              result.asin = result.catalogResponse.asin;
              console.log(chalk.gray(`   ASIN: ${result.asin}`));
            }
          } else {
            result.warnings.push('Catalog item creation had issues');
            if (result.catalogResponse.issues) {
              result.catalogResponse.issues.forEach((issue: any) => {
                if (issue.severity === 'ERROR') {
                  result.errors.push(`Catalog: ${issue.message}`);
                } else {
                  result.warnings.push(`Catalog: ${issue.message}`);
                }
              });
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.warnings.push(`Catalog item creation failed: ${errorMsg}`);
          console.log(chalk.yellow(`⚠️  Catalog creation failed, continuing with listing`));
        }
      }

      // Step 5: Create marketplace listing
      console.log(chalk.gray('5. Creating marketplace listing...'));
      if (isDryRun) {
        console.log(chalk.yellow('   🔍 DRY RUN: Would create marketplace listing'));
        console.log(chalk.gray(`   SKU: ${harnessConfig.product.sku}`));
        console.log(chalk.gray(`   Price: $${harnessConfig.pricing.price}`));
        console.log(chalk.gray(`   Bullet points: ${harnessConfig.amazon.bullet_points.length}`));
      } else {
        result.listingResponse = await this.listingsAPI.createListing(
          harnessConfig,
          result.uploadedImages,
          [this.config.marketplaceId],
          this.config.sellerId
        );

        console.log(chalk.gray(`   Response status: ${result.listingResponse.status}`));
        console.log(chalk.gray(`   Has issues: ${result.listingResponse.issues ? result.listingResponse.issues.length : 0}`));
        
        if (result.listingResponse.status === 'ACCEPTED' || (result.listingResponse as any).status === 'SUCCESS') {
          console.log(chalk.green('✅ Marketplace listing created successfully'));
          result.submissionId = result.listingResponse.submissionId;
          console.log(chalk.gray(`   Submission ID: ${result.submissionId}`));

          // Generate listing URL (this would be more accurate with real ASIN)
          const asin = result.asin || 'PENDING';
          result.listingUrl = `https://www.amazon.com/dp/${asin}`;
          console.log(chalk.gray(`   Listing URL: ${result.listingUrl}`));

        } else {
          result.errors.push('Marketplace listing creation failed');
          if (result.listingResponse.issues) {
            result.listingResponse.issues.forEach(issue => {
              if (issue.severity === 'ERROR') {
                result.errors.push(`Listing: ${issue.message}`);
              } else {
                result.warnings.push(`Listing: ${issue.message}`);
              }
            });
          }
        }
      }

      // Step 6: Wait for processing completion (if not dry run)
      if (!isDryRun && result.submissionId) {
        console.log(chalk.gray('6. Waiting for Amazon processing...'));
        try {
          const finalSubmission = await this.listingsAPI.waitForSubmissionCompletion(
            result.submissionId,
            60000 // 1 minute timeout for demo
          );

          if (finalSubmission.status === 'DONE') {
            console.log(chalk.green('✅ Product listing processing completed'));
            result.success = true;
          } else if (finalSubmission.status === 'FATAL') {
            result.errors.push('Amazon processing failed with fatal error');
            if (finalSubmission.issues) {
              finalSubmission.issues.forEach(issue => {
                result.errors.push(`Processing: ${issue.message}`);
              });
            }
          } else {
            result.warnings.push(`Processing completed with status: ${finalSubmission.status}`);
            result.success = true; // Still consider successful for non-fatal statuses
          }
        } catch (error) {
          result.warnings.push('Timeout waiting for processing completion - check Amazon Seller Central');
          result.success = true; // Still consider successful since submission was accepted
        }
      } else {
        result.success = true; // Dry run or no submission ID
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      console.error(chalk.red(`❌ Product creation failed: ${errorMessage}`));
      return result;
    }
  }

  // Generate a summary of the product creation process
  static generateSummary(result: ProductCreationResult): string {
    let summary = `\n📊 Product Creation Summary\n`;
    summary += `${'-'.repeat(50)}\n`;
    summary += `SKU: ${result.sku}\n`;
    summary += `Status: ${result.success ? chalk.green('SUCCESS') : chalk.red('FAILED')}\n`;

    if (result.asin) {
      summary += `ASIN: ${result.asin}\n`;
    }

    if (result.listingUrl) {
      summary += `Listing URL: ${result.listingUrl}\n`;
    }

    if (result.submissionId) {
      summary += `Submission ID: ${result.submissionId}\n`;
    }

    summary += `\nProcessed Images: ${result.processedImages.length}\n`;
    summary += `Uploaded Images: ${result.uploadedImages.length}\n`;

    if (result.warnings.length > 0) {
      summary += `\n⚠️  Warnings (${result.warnings.length}):\n`;
      result.warnings.forEach((warning, i) => {
        summary += `${i + 1}. ${warning}\n`;
      });
    }

    if (result.errors.length > 0) {
      summary += `\n❌ Errors (${result.errors.length}):\n`;
      result.errors.forEach((error, i) => {
        summary += `${i + 1}. ${error}\n`;
      });
    }

    if (result.success) {
      summary += `\n✅ Product listing created successfully!\n`;
      if (result.listingUrl) {
        summary += `Visit: ${result.listingUrl}\n`;
      }
      summary += `Check Amazon Seller Central for processing status.\n`;
    } else {
      summary += `\n❌ Product creation failed. Please review errors above.\n`;
    }

    return summary;
  }
}