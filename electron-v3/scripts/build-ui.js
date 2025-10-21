#!/usr/bin/env node

/**
 * Cross-platform build script for React V3 frontend
 * Builds the webapp-v3 and copies it to the Electron app directory
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WEBAPP_DIR = path.join(__dirname, '../../photo-search-intent-first/webapp-v3');
const ELECTRON_APP_DIR = path.join(__dirname, '../app');
const DIST_DIR = path.join(WEBAPP_DIR, 'dist');

console.log('🏗️  Building React V3 frontend for Electron...');

try {
  // Ensure app directory exists
  if (!fs.existsSync(ELECTRON_APP_DIR)) {
    console.log('📁 Creating app directory...');
    fs.mkdirSync(ELECTRON_APP_DIR, { recursive: true });
  }

  // Build the React app
  console.log('⚛️  Building React app...');
  execSync('npm run build', { 
    cwd: WEBAPP_DIR, 
    stdio: 'inherit' 
  });

  // Copy built files to Electron app directory
  console.log('📋 Copying built files to Electron app directory...');
  
  // Remove existing files (except generated folder which contains Electron-specific assets)
  const existingFiles = fs.readdirSync(ELECTRON_APP_DIR);
  for (const file of existingFiles) {
    if (file !== 'generated' && file !== '.gitkeep') {
      const filePath = path.join(ELECTRON_APP_DIR, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
    }
  }

  // Copy new files
  const distFiles = fs.readdirSync(DIST_DIR);
  for (const file of distFiles) {
    const srcPath = path.join(DIST_DIR, file);
    const destPath = path.join(ELECTRON_APP_DIR, file);
    
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }

  console.log('✅ React V3 frontend built and copied successfully!');
  console.log(`📦 Files copied to: ${ELECTRON_APP_DIR}`);

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

/**
 * Recursively copy a directory
 */
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(src);
  for (const file of files) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}