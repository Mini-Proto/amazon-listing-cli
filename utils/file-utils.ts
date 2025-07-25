import { promises as fs } from 'fs';
import { stat, access } from 'fs/promises';
import { resolve, extname, dirname, basename } from 'path';
import { constants } from 'fs';

export interface FileInfo {
  path: string;
  size: number;
  extension: string;
  isReadable: boolean;
  lastModified: Date;
}

export class FileUtils {
  static async getFileInfo(filePath: string): Promise<FileInfo> {
    const resolvedPath = resolve(filePath);
    
    try {
      // Check if file is readable
      await access(resolvedPath, constants.R_OK);
      
      // Get file stats
      const stats = await stat(resolvedPath);
      
      return {
        path: resolvedPath,
        size: stats.size,
        extension: extname(resolvedPath).toLowerCase(),
        isReadable: true,
        lastModified: stats.mtime,
      };
    } catch (error) {
      throw new Error(`Cannot access file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`Cannot create directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async copyFile(source: string, destination: string): Promise<void> {
    try {
      // Ensure destination directory exists
      await this.ensureDirectory(dirname(destination));
      
      // Copy the file
      await fs.copyFile(source, destination);
    } catch (error) {
      throw new Error(`Cannot copy file from ${source} to ${destination}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Don't throw error if file doesn't exist
      if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
        throw new Error(`Cannot delete file ${filePath}: ${error.message}`);
      }
    }
  }

  static generateUniqueFileName(originalPath: string, suffix?: string): string {
    const ext = extname(originalPath);
    const base = basename(originalPath, ext);
    const dir = dirname(originalPath);
    
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const uniqueSuffix = suffix ? `_${suffix}` : '';
    
    return resolve(dir, `${base}${uniqueSuffix}_${timestamp}_${random}${ext}`);
  }

  static isValidImageExtension(filePath: string): boolean {
    const validExtensions = ['.jpg', '.jpeg', '.png'];
    const ext = extname(filePath).toLowerCase();
    return validExtensions.includes(ext);
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static async validateImageFiles(imagePaths: string[]): Promise<{
    valid: string[];
    invalid: Array<{ path: string; error: string }>;
  }> {
    const valid: string[] = [];
    const invalid: Array<{ path: string; error: string }> = [];

    for (const imagePath of imagePaths) {
      try {
        // Check if file exists and is readable
        const fileInfo = await this.getFileInfo(imagePath);
        
        // Check if it's a valid image extension
        if (!this.isValidImageExtension(imagePath)) {
          invalid.push({
            path: imagePath,
            error: `Invalid image extension. Must be .jpg, .jpeg, or .png`,
          });
          continue;
        }

        // Check file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (fileInfo.size > maxSize) {
          invalid.push({
            path: imagePath,
            error: `File too large (${this.formatFileSize(fileInfo.size)}). Maximum size is ${this.formatFileSize(maxSize)}`,
          });
          continue;
        }

        // Check minimum file size (1KB)
        const minSize = 1024; // 1KB
        if (fileInfo.size < minSize) {
          invalid.push({
            path: imagePath,
            error: `File too small (${this.formatFileSize(fileInfo.size)}). Minimum size is ${this.formatFileSize(minSize)}`,
          });
          continue;
        }

        valid.push(imagePath);
      } catch (error) {
        invalid.push({
          path: imagePath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { valid, invalid };
  }
}