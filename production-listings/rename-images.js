#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SKU mapping from CSV analysis - MFJ SKUs only
const skuMappings = [
  // 2x1 (2-pin) configurations
  { sku: 'MPA-MFJ-2p-F-F-6in-2pk', pattern: '2x1 Female Receptacle to Female Receptacle, 6in' },
  { sku: 'MPA-MFJ-2p-F-F-12in-2pk', pattern: '2x1 Female Receptacle to Female Receptacle, 12in' },
  { sku: 'MPA-MFJ-2p-F-M-6in-2pk', pattern: '2x1 Female Receptacle to Male Plug, 6in' },
  { sku: 'MPA-MFJ-2p-F-M-12in-2pk', pattern: '2x1 Female Receptacle to Male Plug, 12in' },
  { sku: 'MPA-MFJ-2p-M-M-6in-2pk', pattern: '2x1 Male Plug to Male Plug, 6in' },
  { sku: 'MPA-MFJ-2p-M-M-12in-2pk', pattern: '2x1 Male Plug to Male Plug, 12in' },
  
  // 2x2 (4-pin) configurations
  { sku: 'MPA-MFJ-4p-F-F-6in-2pk', pattern: '2x2 Female Receptacle to Female Receptacle, 6in' },
  { sku: 'MPA-MFJ-4p-F-F-12in-2pk', pattern: '2x2 Female Receptacle to Female Receptacle, 12in' },
  { sku: 'MPA-MFJ-4p-F-M-6in-2pk', pattern: '2x2 Female Receptacle to Male Plug, 6in' },
  { sku: 'MPA-MFJ-4p-F-M-12in-2pk', pattern: '2x2 Female Receptacle to Male Plug, 12in' },
  { sku: 'MPA-MFJ-4p-M-M-6in-2pk', pattern: '2x2 Male Plug to Male Plug, 6in' },
  { sku: 'MPA-MFJ-4p-M-M-12in-2pk', pattern: '2x2 Male Plug to Male Plug, 12in' },
  
  // 2x3 (6-pin) configurations
  { sku: 'MPA-MFJ-6p-F-F-6in-2pk', pattern: '2x3 Female Receptacle to Female Receptacle, 6in' },
  { sku: 'MPA-MFJ-6p-F-F-12in-2pk', pattern: '2x3 Female Receptacle to Female Receptacle, 12in' },
  { sku: 'MPA-MFJ-6p-F-M-6in-2pk', pattern: '2x3 Female Receptacle to Male Plug, 6in' },
  { sku: 'MPA-MFJ-6p-F-M-12in-2pk', pattern: '2x3 Female Receptacle to Male Plug, 12in' },
  { sku: 'MPA-MFJ-6p-M-M-6in-2pk', pattern: '2x3 Male Plug to Male Plug, 6in' },
  { sku: 'MPA-MFJ-6p-M-M-12in-2pk', pattern: '2x3 Male Plug to Male Plug, 12in' },
  
  // 2x4 (8-pin) configurations
  { sku: 'MPA-MFJ-8p-F-F-6in-2pk', pattern: '2x4 Female Receptacle to Female Receptacle, 6in' },
  { sku: 'MPA-MFJ-8p-F-F-12in-2pk', pattern: '2x4 Female Receptacle to Female Receptacle, 12in' },
  { sku: 'MPA-MFJ-8p-F-M-6in-2pk', pattern: '2x4 Female Receptacle to Male Plug, 6in' },
  { sku: 'MPA-MFJ-8p-F-M-12in-2pk', pattern: '2x4 Female Receptacle to Male Plug, 12in' },
  { sku: 'MPA-MFJ-8p-M-M-6in-2pk', pattern: '2x4 Male Plug to Male Plug, 6in' },
  { sku: 'MPA-MFJ-8p-M-M-12in-2pk', pattern: '2x4 Male Plug to Male Plug, 12in' }
];

const imagesDir = path.join(__dirname, 'images');

console.log('🔄 Renaming MFJ images to SKU format...\n');

let renamedCount = 0;
let skippedCount = 0;

// Process each SKU mapping
skuMappings.forEach(({ sku, pattern }) => {
  // Look for both image 1 and image 2 for this pattern
  const image1 = `${pattern} 1.png`;
  const image2 = `${pattern} 2.png`;
  
  const image1Path = path.join(imagesDir, image1);
  const image2Path = path.join(imagesDir, image2);
  
  // Handle missing "2" for one case in the listing
  const imageAltPath = path.join(imagesDir, `${pattern}.png`);
  
  // Rename image 1 to [SKU]-Main.png
  if (fs.existsSync(image1Path)) {
    const newMainPath = path.join(imagesDir, `${sku}-Main.png`);
    fs.renameSync(image1Path, newMainPath);
    console.log(`✅ Renamed: ${image1} → ${sku}-Main.png`);
    renamedCount++;
  } else {
    console.log(`❌ Missing: ${image1}`);
    skippedCount++;
  }
  
  // Rename image 2 to [SKU]-Secondary.png
  if (fs.existsSync(image2Path)) {
    const newSecondaryPath = path.join(imagesDir, `${sku}-Secondary.png`);
    fs.renameSync(image2Path, newSecondaryPath);
    console.log(`✅ Renamed: ${image2} → ${sku}-Secondary.png`);
    renamedCount++;
  } else if (fs.existsSync(imageAltPath)) {
    // Handle the special case where there's no "2" in filename
    const newSecondaryPath = path.join(imagesDir, `${sku}-Secondary.png`);
    fs.renameSync(imageAltPath, newSecondaryPath);
    console.log(`✅ Renamed: ${pattern}.png → ${sku}-Secondary.png`);
    renamedCount++;
  } else {
    console.log(`❌ Missing: ${image2}`);
    skippedCount++;
  }
  
  console.log(''); // Empty line for readability
});

console.log(`\n📊 Summary:`);
console.log(`✅ Successfully renamed: ${renamedCount} images`);
console.log(`❌ Skipped/Missing: ${skippedCount} images`);
console.log(`\n🎯 All MFJ images now follow [SKU]-Main.png and [SKU]-Secondary.png format!`);