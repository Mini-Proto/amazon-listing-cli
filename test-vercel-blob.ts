#!/usr/bin/env node
import 'dotenv/config';
import chalk from 'chalk';
import { VercelBlobUploadService } from './api/vercel-blob-upload.js';
import { existsSync } from 'fs';
import { resolve } from 'path';

async function testVercelBlob() {
  console.log(chalk.blue('🧪 Testing Vercel Blob Storage Integration\n'));

  // Check configuration
  if (!VercelBlobUploadService.validateConfiguration()) {
    process.exit(1);
  }

  const token = process.env.VERCEL_BLOB_TOKEN!;
  const service = new VercelBlobUploadService(token);

  // Test image path
  const testImagePath = resolve('test-images/test-harness.jpg');
  
  if (!existsSync(testImagePath)) {
    console.error(chalk.red('❌ Test image not found. Creating a test image...'));
    
    // Create test image using Sharp
    try {
      const { default: sharp } = await import('sharp');
      await sharp({
        create: {
          width: 1200,
          height: 1200,
          channels: 3,
          background: { r: 255, g: 100, b: 100 }
        }
      })
      .jpeg({ quality: 90 })
      .toFile(testImagePath);
      
      console.log(chalk.green('✅ Test image created'));
    } catch (error) {
      console.error(chalk.red('Failed to create test image:'), error);
      process.exit(1);
    }
  }

  // Test upload
  try {
    console.log(chalk.yellow('\n📤 Uploading test image to Vercel Blob...'));
    const result = await service.uploadImage(testImagePath, 'TEST-SKU-123');
    
    console.log(chalk.green('\n✅ Upload successful!'));
    console.log(chalk.gray('URL:'), result.url);
    console.log(chalk.gray('Download URL:'), result.downloadUrl);
    console.log(chalk.gray('Path:'), result.pathname);
    console.log(chalk.gray('Content Type:'), result.contentType);
    
    console.log(chalk.blue('\n🌐 You can view the uploaded image at:'));
    console.log(chalk.cyan(result.url));
    
    // Test delete (optional)
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise<string>(resolve => {
      rl.question(chalk.yellow('\nDelete the uploaded image? (y/N): '), resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() === 'y') {
      await service.deleteImage(result.url);
      console.log(chalk.green('✅ Image deleted from Vercel Blob'));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Upload failed:'), error);
    process.exit(1);
  }
}

testVercelBlob().catch(console.error);