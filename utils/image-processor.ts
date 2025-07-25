import sharp from 'sharp';
import { promises as fs } from 'fs';
import { resolve, dirname, basename, extname } from 'path';
import chalk from 'chalk';
import { FileUtils, FileInfo } from './file-utils.js';

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png';
  createThumbnail?: boolean;
  thumbnailSize?: number;
}

export interface ProcessedImage {
  originalPath: string;
  processedPath: string;
  thumbnailPath?: string;
  originalSize: number;
  processedSize: number;
  dimensions: {
    width: number;
    height: number;
  };
  format: string;
}

export interface ImageProcessingResult {
  success: ProcessedImage[];
  errors: Array<{ path: string; error: string }>;
}

export class ImageProcessor {
  private options: Required<ImageProcessingOptions>;

  constructor(options: ImageProcessingOptions = {}) {
    this.options = {
      maxWidth: options.maxWidth ?? 2000,
      maxHeight: options.maxHeight ?? 2000,
      quality: options.quality ?? 85,
      format: options.format ?? 'jpeg',
      createThumbnail: options.createThumbnail ?? true,
      thumbnailSize: options.thumbnailSize ?? 300,
    };
  }

  async processImages(imagePaths: string[], outputDir?: string): Promise<ImageProcessingResult> {
    const success: ProcessedImage[] = [];
    const errors: Array<{ path: string; error: string }> = [];

    // Validate all images first
    console.log(chalk.gray('Validating image files...'));
    const validation = await FileUtils.validateImageFiles(imagePaths);
    
    if (validation.invalid.length > 0) {
      errors.push(...validation.invalid);
    }

    if (validation.valid.length === 0) {
      return { success, errors };
    }

    console.log(chalk.green(`✓ ${validation.valid.length} valid image(s) found`));

    // Set up output directory
    const processedDir = outputDir || resolve(process.cwd(), 'processed-images');
    await FileUtils.ensureDirectory(processedDir);

    // Process each valid image
    for (const imagePath of validation.valid) {
      try {
        console.log(chalk.gray(`Processing: ${basename(imagePath)}...`));
        
        const result = await this.processImage(imagePath, processedDir);
        success.push(result);
        
        console.log(chalk.green(`✓ Processed: ${basename(imagePath)} (${FileUtils.formatFileSize(result.processedSize)})`));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({ path: imagePath, error: errorMessage });
        console.log(chalk.red(`✗ Failed: ${basename(imagePath)} - ${errorMessage}`));
      }
    }

    return { success, errors };
  }

  private async processImage(imagePath: string, outputDir: string): Promise<ProcessedImage> {
    const fileInfo = await FileUtils.getFileInfo(imagePath);
    const originalBasename = basename(imagePath, extname(imagePath));
    
    // Generate output paths
    const processedPath = resolve(outputDir, `${originalBasename}_processed.${this.options.format}`);
    const thumbnailPath = this.options.createThumbnail 
      ? resolve(outputDir, `${originalBasename}_thumb.${this.options.format}`)
      : undefined;

    // Load and analyze the image
    const image = sharp(imagePath);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Could not determine image dimensions');
    }

    // Calculate new dimensions while preserving aspect ratio
    const { width: newWidth, height: newHeight } = this.calculateDimensions(
      metadata.width,
      metadata.height,
      this.options.maxWidth,
      this.options.maxHeight
    );

    // Process main image
    let processedImage = image.resize(newWidth, newHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });

    // Set format and quality
    if (this.options.format === 'jpeg') {
      processedImage = processedImage.jpeg({ quality: this.options.quality });
    } else {
      processedImage = processedImage.png({ quality: this.options.quality });
    }

    // Save processed image
    await processedImage.toFile(processedPath);

    // Create thumbnail if requested
    if (thumbnailPath) {
      await image
        .resize(this.options.thumbnailSize, this.options.thumbnailSize, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);
    }

    // Get processed file size
    const processedInfo = await FileUtils.getFileInfo(processedPath);

    return {
      originalPath: imagePath,
      processedPath,
      thumbnailPath,
      originalSize: fileInfo.size,
      processedSize: processedInfo.size,
      dimensions: {
        width: newWidth,
        height: newHeight,
      },
      format: this.options.format,
    };
  }

  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    // If image is already within limits, return original dimensions
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    // Calculate scaling factors
    const widthScale = maxWidth / originalWidth;
    const heightScale = maxHeight / originalHeight;
    
    // Use the smaller scale to ensure both dimensions are within limits
    const scale = Math.min(widthScale, heightScale);

    return {
      width: Math.round(originalWidth * scale),
      height: Math.round(originalHeight * scale),
    };
  }

  // Validate image meets Amazon requirements
  static validateForAmazon(processedImage: ProcessedImage): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Amazon requires minimum 1000x1000 pixels for main images
    if (processedImage.dimensions.width < 1000 || processedImage.dimensions.height < 1000) {
      issues.push(`Image too small (${processedImage.dimensions.width}x${processedImage.dimensions.height}). Amazon requires minimum 1000x1000 pixels for main images`);
    }

    // Check maximum dimensions (10000x10000)
    if (processedImage.dimensions.width > 10000 || processedImage.dimensions.height > 10000) {
      issues.push(`Image too large (${processedImage.dimensions.width}x${processedImage.dimensions.height}). Amazon maximum is 10000x10000 pixels`);
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (processedImage.processedSize > maxSize) {
      issues.push(`File size too large (${FileUtils.formatFileSize(processedImage.processedSize)}). Amazon maximum is 10MB`);
    }

    // Check format
    if (processedImage.format !== 'jpeg' && processedImage.format !== 'png') {
      issues.push(`Invalid format (${processedImage.format}). Amazon accepts JPEG and PNG only`);
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  // Clean up processed files
  async cleanupProcessedImages(processedImages: ProcessedImage[]): Promise<void> {
    for (const image of processedImages) {
      try {
        await FileUtils.deleteFile(image.processedPath);
        if (image.thumbnailPath) {
          await FileUtils.deleteFile(image.thumbnailPath);
        }
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not delete ${image.processedPath}`));
      }
    }
  }

  // Generate processing summary
  static generateSummary(result: ImageProcessingResult): string {
    const { success, errors } = result;
    const totalImages = success.length + errors.length;
    
    let summary = `\nImage Processing Summary:\n`;
    summary += `Total images: ${totalImages}\n`;
    summary += `Successfully processed: ${success.length}\n`;
    summary += `Failed: ${errors.length}\n`;

    if (success.length > 0) {
      const totalOriginalSize = success.reduce((sum, img) => sum + img.originalSize, 0);
      const totalProcessedSize = success.reduce((sum, img) => sum + img.processedSize, 0);
      const compressionRatio = ((totalOriginalSize - totalProcessedSize) / totalOriginalSize * 100).toFixed(1);
      
      summary += `\nCompression:\n`;
      summary += `Original size: ${FileUtils.formatFileSize(totalOriginalSize)}\n`;
      summary += `Processed size: ${FileUtils.formatFileSize(totalProcessedSize)}\n`;
      summary += `Saved: ${compressionRatio}%\n`;
    }

    if (errors.length > 0) {
      summary += `\nErrors:\n`;
      errors.forEach((error, index) => {
        summary += `${index + 1}. ${basename(error.path)}: ${error.error}\n`;
      });
    }

    return summary;
  }
}