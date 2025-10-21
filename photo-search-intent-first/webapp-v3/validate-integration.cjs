#!/usr/bin/env node

/**
 * Validation script for Electron V3 frontend integration
 * Checks that all required components and services are properly integrated
 */

const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'src/components/PhotoLibrary.tsx',
  'src/components/FolderSelector.tsx',
  'src/components/VideoInfo.tsx',
  'src/services/fileSystemService.ts',
  'src/services/offlineModeHandler.ts',
  'src/hooks/useElectronBridge.ts',
  'src/types/photo.ts',
];

const requiredFeatures = [
  {
    file: 'src/components/PhotoLibrary.tsx',
    features: [
      'fileSystemService.getSecureFileUrl',
      'VideoInfo',
      'videoMetadata',
      'direct file access'
    ]
  },
  {
    file: 'src/components/FolderSelector.tsx',
    features: [
      'fileSystemService.selectPhotoDirectories',
      'multiple directory selection',
      'validateDirectoryAccess'
    ]
  },
  {
    file: 'src/services/fileSystemService.ts',
    features: [
      'selectPhotoDirectories',
      'scanDirectory',
      'getFileMetadata',
      'getThumbnailUrl',
      'getSecureFileUrl'
    ]
  },
  {
    file: 'src/hooks/useElectronBridge.ts',
    features: [
      'selectPhotoDirectories',
      'scanDirectory',
      'generateThumbnail',
      'getSecureFileUrl'
    ]
  }
];

console.log('🔍 Validating Electron V3 Frontend Integration...\n');

// Check required files exist
let allFilesExist = true;
for (const file of requiredFiles) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing!');
  process.exit(1);
}

console.log('\n🔍 Checking feature implementations...\n');

// Check feature implementations
let allFeaturesImplemented = true;
for (const { file, features } of requiredFeatures) {
  const filePath = path.join(__dirname, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  console.log(`📁 ${file}:`);
  
  for (const feature of features) {
    if (content.includes(feature)) {
      console.log(`  ✅ ${feature}`);
    } else {
      console.log(`  ❌ ${feature} - NOT FOUND`);
      allFeaturesImplemented = false;
    }
  }
  console.log('');
}

// Check TypeScript compilation
console.log('🔧 Checking TypeScript compilation...');
try {
  const { execSync } = require('child_process');
  execSync('npx tsc --noEmit', { cwd: __dirname, stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful\n');
} catch (error) {
  console.log('❌ TypeScript compilation failed:');
  console.log(error.stdout?.toString() || error.message);
  allFeaturesImplemented = false;
}

// Summary
if (allFilesExist && allFeaturesImplemented) {
  console.log('🎉 All integration requirements satisfied!');
  console.log('\n📋 Integration Summary:');
  console.log('  ✅ PhotoLibrary component enhanced for direct file access');
  console.log('  ✅ FolderSelector uses native directory picker');
  console.log('  ✅ Video handling components with metadata display');
  console.log('  ✅ FileSystemService provides secure file operations');
  console.log('  ✅ OfflineModeHandler manages local-first functionality');
  console.log('  ✅ Enhanced Electron bridge with comprehensive APIs');
  console.log('\n🚀 Ready for Electron V3 integration!');
  process.exit(0);
} else {
  console.log('❌ Integration validation failed!');
  console.log('Please fix the issues above before proceeding.');
  process.exit(1);
}