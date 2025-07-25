// Simple script to create placeholder images for testing
// Run with: node create-placeholder-images.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a larger placeholder image (100x100 pixels solid color)
// This creates a simple colored square that meets the minimum file size requirement
function createPlaceholderImage(width = 100, height = 100) {
  // Create a simple bitmap data structure
  const bytesPerPixel = 3; // RGB
  const imageData = Buffer.alloc(width * height * bytesPerPixel);
  
  // Fill with a gradient pattern to make it more interesting
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * bytesPerPixel;
      imageData[index] = Math.floor((x / width) * 255);     // Red gradient
      imageData[index + 1] = Math.floor((y / height) * 255); // Green gradient
      imageData[index + 2] = 128; // Blue constant
    }
  }
  
  // Create a simple PPM header + data (portable pixmap format)
  const header = `P6\n${width} ${height}\n255\n`;
  return Buffer.concat([Buffer.from(header, 'ascii'), imageData]);
}

const imageDir = path.join(__dirname, 'images');
const imageFiles = [
  'harness-main.jpg',
  'harness-detail.jpg', 
  'harness-dimensions.jpg',
  'harness-application.jpg'
];

// Ensure images directory exists
if (!fs.existsSync(imageDir)) {
  fs.mkdirSync(imageDir, { recursive: true });
}

// Create placeholder image files
imageFiles.forEach((filename, index) => {
  const filePath = path.join(imageDir, filename);
  
  // Create different sized placeholders for variety
  const sizes = [
    { width: 100, height: 100 },
    { width: 150, height: 150 },
    { width: 200, height: 150 },
    { width: 120, height: 120 }
  ];
  
  const size = sizes[index % sizes.length];
  const imageData = createPlaceholderImage(size.width, size.height);
  
  fs.writeFileSync(filePath, imageData);
  console.log(`Created placeholder: ${filename} (${size.width}x${size.height}, ${imageData.length} bytes)`);
});

console.log('\\nPlaceholder images created successfully!');
console.log('These are minimal 1x1 pixel images for testing the CLI validation.');
console.log('Replace with actual product photos before creating real listings.');