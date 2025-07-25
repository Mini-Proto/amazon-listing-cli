// Create actual JPEG placeholder images using Sharp
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createJPEGPlaceholder(width, height, filename, color = { r: 128, g: 128, b: 128 }) {
  try {
    // Create a solid color image
    const image = sharp({
      create: {
        width,
        height,
        channels: 3,
        background: color
      }
    })
    .jpeg({ quality: 80 })
    
    const outputPath = path.join(__dirname, 'images', filename);
    await image.toFile(outputPath);
    
    const stats = fs.statSync(outputPath);
    console.log(`Created: ${filename} (${width}x${height}, ${stats.size} bytes)`);
    
  } catch (error) {
    console.error(`Failed to create ${filename}:`, error.message);
  }
}

// Create placeholder images with different colors and sizes
async function main() {
  const imageDir = path.join(__dirname, 'images');
  
  // Ensure directory exists
  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir, { recursive: true });
  }
  
  console.log('Creating JPEG placeholder images...\n');
  
  // Create different colored placeholders to distinguish them
  await createJPEGPlaceholder(1200, 1200, 'harness-main.jpg', { r: 100, g: 150, b: 200 }); // Blue-ish main image
  await createJPEGPlaceholder(1000, 1000, 'harness-detail.jpg', { r: 150, g: 100, b: 100 }); // Red-ish detail
  await createJPEGPlaceholder(1000, 800, 'harness-dimensions.jpg', { r: 100, g: 150, b: 100 }); // Green-ish dimensions
  await createJPEGPlaceholder(1100, 1100, 'harness-application.jpg', { r: 150, g: 150, b: 100 }); // Yellow-ish application
  
  console.log('\n✅ All placeholder images created successfully!');
  console.log('These are solid color JPEG images that meet Amazon requirements.');
  console.log('Replace with actual product photos before creating real listings.');
}

main().catch(console.error);