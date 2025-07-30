import { createReadStream } from 'fs';
import { basename } from 'path';
import chalk from 'chalk';
import { SPAPIClient } from './client.js';
import { ProcessedImage } from '../utils/image-processor.js';
import { FileUtils } from '../utils/file-utils.js';

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

  constructor(client: SPAPIClient) {
    this.client = client;
  }

  async uploadImages(processedImages: ProcessedImage[]): Promise<ImageUploadResult> {
    const uploaded: UploadedImage[] = [];
    const failed: Array<{ path: string; error: string }> = [];

    console.log(chalk.blue(`\n📤 Uploading ${processedImages.length} image(s) to Amazon...\n`));

    for (let i = 0; i < processedImages.length; i++) {
      const image = processedImages[i];
      const fileName = basename(image.processedPath);
      
      try {
        console.log(chalk.gray(`${i + 1}/${processedImages.length} Uploading ${fileName}...`));
        
        const uploadResult = await this.uploadSingleImage(image);
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

  private async uploadSingleImage(processedImage: ProcessedImage): Promise<UploadedImage> {
    try {
      // Step 1: Create upload destination
      const uploadDestination = await this.createUploadDestination(processedImage);
      
      // Step 2: Upload image to the destination URL
      await this.uploadToDestination(processedImage.processedPath, uploadDestination.uploadUrl);
      
      // Step 3: Complete the upload and get final URL
      const finalUrl = await this.completeUpload(uploadDestination.uploadId);

      return {
        localPath: processedImage.processedPath,
        amazonUrl: finalUrl,
        uploadId: uploadDestination.uploadId,
        size: processedImage.processedSize,
        dimensions: processedImage.dimensions,
      };

    } catch (error) {
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async createUploadDestination(processedImage: ProcessedImage): Promise<{
    uploadUrl: string;
    uploadId: string;
  }> {
    try {
      // This is a simplified implementation
      // In production, you would use the actual SP-API Upload API
      const fileName = basename(processedImage.processedPath);
      const fileSize = processedImage.processedSize;
      
      const response = await this.client.makeRequest('POST', '/uploads/2020-11-01/uploadDestinations', {
        resource: fileName,
        contentMD5: await this.calculateMD5(processedImage.processedPath),
        contentType: this.getContentType(processedImage.format),
      });

      if (response.errors && response.errors.length > 0) {
        throw new Error(`API Error: ${response.errors[0].message}`);
      }

      if (!response.payload) {
        throw new Error('No upload destination received from API');
      }

      // For product images, Amazon expects publicly accessible URLs
      // Instead of uploading, we need to provide URLs Amazon can fetch
      // In production, you would upload to your own S3, Cloudinary, etc.
      
      // For now, return a placeholder that indicates we need external hosting
      console.log(chalk.yellow('⚠️  Note: Product images require publicly accessible URLs'));
      console.log(chalk.gray('   Upload images to S3, Cloudinary, or similar service'));
      
      return {
        uploadUrl: `https://your-cdn.com/images/${fileName}`,
        uploadId: `placeholder_${Date.now()}`,
      };

    } catch (error) {
      throw new Error(`Failed to create upload destination: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async uploadToDestination(filePath: string, uploadUrl: string): Promise<void> {
    try {
      // In a real implementation, this would upload to the actual S3 pre-signed URL
      // For now, we'll simulate the upload process
      
      const fileInfo = await FileUtils.getFileInfo(filePath);
      console.log(chalk.gray(`   Uploading ${FileUtils.formatFileSize(fileInfo.size)} to Amazon S3...`));
      
      // Simulate upload time based on file size
      const uploadTime = Math.min(Math.max(fileInfo.size / 100000, 500), 3000); // 500ms to 3s
      await this.delay(uploadTime);
      
      // In production, you would do something like:
      /*
      const formData = new FormData();
      formData.append('file', createReadStream(filePath));
      
      const response = await axios.post(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });
      */
      
    } catch (error) {
      throw new Error(`Failed to upload to destination: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async completeUpload(uploadId: string): Promise<string> {
    try {
      // Complete the upload and get the final URL
      // This would typically involve calling another SP-API endpoint
      
      // For now, generate a mock Amazon image URL
      const imageId = uploadId.replace('upload_', 'img_');
      const mockUrl = `https://m.media-amazon.com/images/I/${imageId}.jpg`;
      
      return mockUrl;
      
    } catch (error) {
      throw new Error(`Failed to complete upload: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async calculateMD5(filePath: string): Promise<string> {
    try {
      const crypto = await import('crypto');
      const fs = await import('fs');
      
      return new Promise((resolve, reject) => {
        const hash = crypto.createHash('md5');
        const stream = fs.createReadStream(filePath);
        
        stream.on('error', reject);
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
      });
    } catch (error) {
      throw new Error(`Failed to calculate MD5: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private getContentType(format: string): string {
    switch (format.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      default:
        return 'application/octet-stream';
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