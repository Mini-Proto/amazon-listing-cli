import { createReadStream } from 'fs';
import { basename } from 'path';
import chalk from 'chalk';
import { SPAPIClient } from './client.js';
import { ProcessedImage } from '../utils/image-processor.js';
import { FileUtils } from '../utils/file-utils.js';
import { VercelBlobUploadService } from './vercel-blob-upload.js';

export interface UploadedImage {
  localPath: string;
  amazonUrl: string;
  uploadId: string;
  size: number;
  dimensions: {
    width: number;
    height: number;
  };
}

export interface ImageUploadResult {
  uploaded: UploadedImage[];
  failed: Array<{ path: string; error: string }>;
}

export class AmazonImageUploadService {
  private client: SPAPIClient;
  private vercelBlobService?: VercelBlobUploadService;

  constructor(client: SPAPIClient) {
    this.client = client;
    
    // Initialize Vercel Blob service if token is available
    const vercelToken = process.env.VERCEL_BLOB_TOKEN;
    if (vercelToken) {
      this.vercelBlobService = new VercelBlobUploadService(vercelToken);
    }
  }

  async uploadImages(processedImages: ProcessedImage[], sku: string): Promise<ImageUploadResult> {
    const uploaded: UploadedImage[] = [];
    const failed: Array<{ path: string; error: string }> = [];

    console.log(chalk.blue(`\n📤 Uploading ${processedImages.length} image(s)...\n`));

    for (let i = 0; i < processedImages.length; i++) {
      const image = processedImages[i];
      const fileName = basename(image.processedPath);
      
      try {
        console.log(chalk.gray(`${i + 1}/${processedImages.length} Uploading ${fileName}...`));
        
        const uploadResult = await this.uploadSingleImage(image, sku);
        uploaded.push(uploadResult);
        
        console.log(chalk.green(`✅ Uploaded: ${fileName}`));
        console.log(chalk.gray(`   URL: ${uploadResult.amazonUrl}`));
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        failed.push({ path: image.processedPath, error: errorMessage });
        console.log(chalk.red(`❌ Failed: ${fileName} - ${errorMessage}`));
      }

      // Add delay between uploads to respect rate limits
      if (i < processedImages.length - 1) {
        await this.delay(1000); // 1 second delay
      }
    }

    return { uploaded, failed };
  }

  private async uploadSingleImage(processedImage: ProcessedImage, sku: string): Promise<UploadedImage> {
    try {
      // Check if Vercel Blob service is available
      if (this.vercelBlobService) {
        // Upload to Vercel Blob Storage
        const vercelResult = await this.vercelBlobService.uploadImage(processedImage.processedPath, sku);
        
        return {
          localPath: processedImage.processedPath,
          amazonUrl: vercelResult.url, // Use the public URL from Vercel Blob
          uploadId: vercelResult.pathname,
          size: processedImage.processedSize,
          dimensions: processedImage.dimensions,
        };
      } else {
        // Fall back to mock implementation if Vercel Blob is not configured
        console.log(chalk.yellow('⚠️  Vercel Blob not configured. Using mock URLs.'));
        console.log(chalk.gray('   Set VERCEL_BLOB_TOKEN in your .env file'));
        
        const fileName = basename(processedImage.processedPath);
        return {
          localPath: processedImage.processedPath,
          amazonUrl: `https://your-cdn.com/images/${fileName}`,
          uploadId: `mock_${Date.now()}`,
          size: processedImage.processedSize,
          dimensions: processedImage.dimensions,
        };
      }

    } catch (error) {
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }


  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Validate all uploaded images meet Amazon requirements
  static validateUploads(uploaded: UploadedImage[]): {
    valid: UploadedImage[];
    invalid: Array<{ image: UploadedImage; issues: string[] }>;
  } {
    const valid: UploadedImage[] = [];
    const invalid: Array<{ image: UploadedImage; issues: string[] }> = [];

    for (const image of uploaded) {
      const issues: string[] = [];

      // Check dimensions
      if (image.dimensions.width < 1000 || image.dimensions.height < 1000) {
        issues.push(`Image too small (${image.dimensions.width}x${image.dimensions.height}). Amazon requires minimum 1000x1000 pixels`);
      }

      // Check file size
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (image.size > maxSize) {
        issues.push(`File too large (${FileUtils.formatFileSize(image.size)}). Amazon maximum is 10MB`);
      }

      // Check URL format
      if (!image.amazonUrl || !image.amazonUrl.startsWith('https://')) {
        issues.push('Invalid Amazon URL format');
      }

      if (issues.length === 0) {
        valid.push(image);
      } else {
        invalid.push({ image, issues });
      }
    }

    return { valid, invalid };
  }

  // Generate upload summary
  static generateUploadSummary(result: ImageUploadResult): string {
    const { uploaded, failed } = result;
    const total = uploaded.length + failed.length;
    
    let summary = `\nImage Upload Summary:\n`;
    summary += `Total images: ${total}\n`;
    summary += `Successfully uploaded: ${uploaded.length}\n`;
    summary += `Failed: ${failed.length}\n`;

    if (uploaded.length > 0) {
      const totalSize = uploaded.reduce((sum, img) => sum + img.size, 0);
      summary += `\nUploaded data: ${FileUtils.formatFileSize(totalSize)}\n`;
      
      summary += `\nImage URLs:\n`;
      uploaded.forEach((img, index) => {
        summary += `${index + 1}. ${basename(img.localPath)} -> ${img.amazonUrl}\n`;
      });
    }

    if (failed.length > 0) {
      summary += `\nFailed uploads:\n`;
      failed.forEach((error, index) => {
        summary += `${index + 1}. ${basename(error.path)}: ${error.error}\n`;
      });
    }

    return summary;
  }
}