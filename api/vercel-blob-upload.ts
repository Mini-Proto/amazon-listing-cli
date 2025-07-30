import { put, del } from '@vercel/blob';
import { readFile } from 'fs/promises';
import chalk from 'chalk';
import { basename, extname } from 'path';

export interface VercelBlobUploadResult {
  url: string;
  downloadUrl: string;
  pathname: string;
  contentType: string;
  contentDisposition: string;
}

export class VercelBlobUploadService {
  private token: string;

  constructor(token: string) {
    if (!token) {
      throw new Error('Vercel Blob token is required');
    }
    this.token = token;
  }

  /**
   * Upload an image to Vercel Blob Storage
   */
  async uploadImage(imagePath: string, sku: string): Promise<VercelBlobUploadResult> {
    try {
      console.log(chalk.gray(`Uploading image to Vercel Blob Storage: ${basename(imagePath)}`));
      
      // Read the image file
      const imageBuffer = await readFile(imagePath);
      const fileName = basename(imagePath);
      const extension = extname(fileName).toLowerCase();
      
      // Determine content type
      const contentType = extension === '.png' ? 'image/png' : 'image/jpeg';
      
      // Create a unique blob name with SKU prefix
      const blobName = `amazon-listings/${sku}/${Date.now()}-${fileName}`;
      
      // Upload to Vercel Blob
      const blob = await put(blobName, imageBuffer, {
        access: 'public',
        token: this.token,
        contentType,
        addRandomSuffix: false,
      });
      
      console.log(chalk.green(`✅ Image uploaded successfully`));
      console.log(chalk.gray(`   URL: ${blob.url}`));
      
      return {
        url: blob.url,
        downloadUrl: blob.downloadUrl,
        pathname: blob.pathname,
        contentType: blob.contentType,
        contentDisposition: blob.contentDisposition,
      };
      
    } catch (error) {
      console.error(chalk.red('Failed to upload image to Vercel Blob:'), error);
      throw new Error(`Vercel Blob upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Upload multiple images for a product
   */
  async uploadProductImages(imagePaths: string[], sku: string): Promise<VercelBlobUploadResult[]> {
    console.log(chalk.blue(`\n📤 Uploading ${imagePaths.length} images to Vercel Blob Storage...`));
    
    const uploadResults: VercelBlobUploadResult[] = [];
    
    for (let i = 0; i < imagePaths.length; i++) {
      const imagePath = imagePaths[i];
      console.log(chalk.gray(`\n[${i + 1}/${imagePaths.length}] Processing: ${basename(imagePath)}`));
      
      try {
        const result = await this.uploadImage(imagePath, sku);
        uploadResults.push(result);
      } catch (error) {
        console.error(chalk.red(`Failed to upload image ${i + 1}:`), error instanceof Error ? error.message : String(error));
        // Continue with other images even if one fails
      }
    }
    
    console.log(chalk.green(`\n✅ Successfully uploaded ${uploadResults.length}/${imagePaths.length} images`));
    return uploadResults;
  }

  /**
   * Delete an image from Vercel Blob Storage
   */
  async deleteImage(url: string): Promise<void> {
    try {
      await del(url, { token: this.token });
      console.log(chalk.green('✅ Image deleted from Vercel Blob'));
    } catch (error) {
      console.error(chalk.red('Failed to delete image from Vercel Blob:'), error);
      throw error;
    }
  }

  /**
   * Validate that the Vercel Blob token is configured correctly
   */
  static validateConfiguration(): boolean {
    const token = process.env.VERCEL_BLOB_TOKEN;
    
    if (!token) {
      console.error(chalk.red('❌ VERCEL_BLOB_TOKEN not found in environment variables'));
      console.log(chalk.gray('   Add it to your .env file:'));
      console.log(chalk.gray('   VERCEL_BLOB_TOKEN=vercel_blob_xxx...'));
      return false;
    }
    
    if (!token.startsWith('vercel_blob_')) {
      console.error(chalk.red('❌ Invalid VERCEL_BLOB_TOKEN format'));
      console.log(chalk.gray('   Token should start with "vercel_blob_"'));
      return false;
    }
    
    return true;
  }
}