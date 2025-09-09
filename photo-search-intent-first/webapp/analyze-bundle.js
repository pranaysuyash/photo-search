#!/usr/bin/env node

/**
 * Bundle Analysis Script for PhotoVault
 * 
 * This script analyzes the built bundle to identify optimization opportunities:
 * - Large dependencies that could be lazy-loaded
 * - Duplicate code that could be deduplicated
 * - Unused code that could be tree-shaken
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function analyzeBundleSize() {
  const distPath = path.join(__dirname, '../api/web');
  
  if (!fs.existsSync(distPath)) {
    console.error('❌ Build files not found. Run "npm run build" first.');
    process.exit(1);
  }

  const assets = fs.readdirSync(path.join(distPath, 'assets'));
  const jsFiles = assets.filter(file => file.endsWith('.js'));
  const cssFiles = assets.filter(file => file.endsWith('.css'));

  console.log('📊 Bundle Analysis Report');
  console.log('========================\n');

  let totalJSSize = 0;
  let totalCSSSize = 0;

  console.log('📦 JavaScript Files:');
  jsFiles.forEach(file => {
    const filePath = path.join(distPath, 'assets', file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    totalJSSize += stats.size;
    
    let analysis = '';
    if (file.includes('index')) {
      analysis = ' (Main bundle - consider code splitting)';
    } else if (file.includes('vendor')) {
      analysis = ' (Vendor bundle - good separation)';
    }
    
    console.log(`  - ${file}: ${sizeKB}KB${analysis}`);
  });

  console.log('\n🎨 CSS Files:');
  cssFiles.forEach(file => {
    const filePath = path.join(distPath, 'assets', file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    totalCSSSize += stats.size;
    console.log(`  - ${file}: ${sizeKB}KB`);
  });

  const totalSizeKB = ((totalJSSize + totalCSSSize) / 1024).toFixed(1);
  console.log(`\n📏 Total Bundle Size: ${totalSizeKB}KB`);

  // Recommendations based on size
  console.log('\n💡 Optimization Recommendations:');
  
  if (totalJSSize > 1024 * 500) { // > 500KB
    console.log('  ⚠️  Large JavaScript bundle detected. Consider:');
    console.log('     - Implement React.lazy() for heavy components');
    console.log('     - Split vendor libraries into separate chunks');
    console.log('     - Use dynamic imports for rarely used features');
  }
  
  if (jsFiles.length === 1) {
    console.log('  ⚠️  Single JavaScript file detected. Consider:');
    console.log('     - Enabling code splitting in Vite configuration');
    console.log('     - Separating vendor dependencies');
  }
  
  if (totalCSSSize > 1024 * 100) { // > 100KB
    console.log('  ⚠️  Large CSS bundle detected. Consider:');
    console.log('     - Purging unused CSS with PurgeCSS');
    console.log('     - Critical CSS extraction');
  }

  console.log('\n🔧 To implement recommendations:');
  console.log('  1. Add to vite.config.ts:');
  console.log(`     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             vendor: ['react', 'react-dom'],
             ui: ['lucide-react', 'framer-motion'],
           }
         }
       }
     }`);
  
  console.log('\n  2. Use React.lazy() for heavy components:');
  console.log(`     const HeavyComponent = lazy(() => import('./HeavyComponent'));`);
  
  console.log('\n  3. Install and configure bundle analyzer:');
  console.log('     npm install --save-dev rollup-plugin-visualizer');
}

// Check if package.json has bundle analyzer
function checkAnalyzerSetup() {
  const packagePath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  if (!packageJson.devDependencies?.['rollup-plugin-visualizer']) {
    console.log('\n🎯 To get detailed bundle analysis, install:');
    console.log('   npm install --save-dev rollup-plugin-visualizer');
    console.log('\n   Then add to vite.config.ts:');
    console.log(`   import { visualizer } from 'rollup-plugin-visualizer';
   
   export default defineConfig({
     plugins: [
       // ... other plugins
       visualizer({
         filename: 'dist/stats.html',
         open: true,
         gzipSize: true,
         brotliSize: true,
       }),
     ],
   });`);
  }
}

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeBundleSize();
  checkAnalyzerSetup();
}