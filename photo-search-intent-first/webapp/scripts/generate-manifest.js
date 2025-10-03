#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import sizeOf from 'image-size';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source directory: demo_photos (relative to project root)
const sourceDir = path.resolve(__dirname, '../../demo_photos');
const outputFile = path.resolve(__dirname, '../public/demo_manifest.json');

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']);

function getImageFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip .photo_index and other subdirs
      if (item.startsWith('.')) continue;
      files.push(...getImageFiles(fullPath));
    } else if (stat.isFile() && imageExtensions.has(path.extname(item).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

function generateManifest() {
  const imageFiles = getImageFiles(sourceDir);
  const manifest = [];

  for (const filePath of imageFiles) {
    const stat = fs.statSync(filePath);
    const relativePath = path.relative(sourceDir, filePath).replace(/\\/g, '/'); // Normalize to forward slashes

    // Get dimensions
    let dimensions = {};
    try {
      const buffer = fs.readFileSync(filePath);
      const size = sizeOf(buffer);
      dimensions = { width: size.width, height: size.height };
    } catch (error) {
      console.warn(`Could not get dimensions for ${relativePath}: ${error.message}`);
    }

    // Compute hash
    const fileContent = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(fileContent).digest('hex');

    manifest.push({
      path: relativePath,
      size: stat.size,
      mtime: Math.floor(stat.mtime.getTime() / 1000), // Unix timestamp
      ...dimensions,
      hash
    });
  }

  // Sort by path for consistency
  manifest.sort((a, b) => a.path.localeCompare(b.path));

  // Write manifest
  fs.writeFileSync(outputFile, JSON.stringify(manifest, null, 2));
  console.log(`Generated manifest with ${manifest.length} photos at ${outputFile}`);

  // Also output manifest hash for versioning
  const manifestContent = JSON.stringify(manifest);
  const manifestHash = crypto.createHash('sha256').update(manifestContent).digest('hex');
  console.log(`Manifest hash: ${manifestHash}`);
}

generateManifest();