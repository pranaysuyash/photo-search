#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find all TypeScript/React files
function findFiles(dir) {
  let results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) {
      results = results.concat(findFiles(filePath));
    } else if (stat.isFile() && (file.endsWith('.tsx') || file.endsWith('.jsx'))) {
      results.push(filePath);
    }
  }
  
  return results;
}

// Fix array index keys
function fixArrayKeys(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const originalContent = content;

  // Pattern for .map((item, index) => with key={index}
  // This regex looks for map functions with index and then key={index}
  const mapPattern = /(\w+)\.map\s*\(\s*\(([^,)]+)\s*,\s*(\w+)\)\s*=>\s*[\s\S]*?key=\{?\3\}?/g;
  
  content = content.replace(mapPattern, (match, arrayName, itemName, indexName) => {
    modified = true;
    
    // Generate unique key based on item properties
    let newKey = `key={\`\${${itemName}.id || ${itemName}.path || ${itemName}.name || ${itemName}.key || JSON.stringify(${itemName})}-\${${indexName}}\`}`;
    
    // Replace key={index} with the new key
    return match.replace(/key=\{?\w+\}?/, newKey);
  });

  // Another pattern: key={i} or key={idx} or key={index}
  const lines = content.split('\n');
  let inMapFunction = false;
  let mapItemName = '';
  let mapIndexName = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect .map((item, index) =>
    const mapMatch = line.match(/(\w+)\.map\s*\(\s*\(([^,)]+)\s*,\s*(\w+)\)/);
    if (mapMatch) {
      inMapFunction = true;
      mapItemName = mapMatch[2].trim();
      mapIndexName = mapMatch[3].trim();
    }
    
    // Look for key={index} pattern within map
    if (inMapFunction && line.match(new RegExp(`key=\\{?${mapIndexName}\\}?`))) {
      modified = true;
      
      // Try to generate a better key
      if (mapItemName.includes('.')) {
        // Handle destructured items
        lines[i] = line.replace(
          new RegExp(`key=\\{?${mapIndexName}\\}?`),
          `key={\`item-\${${mapIndexName}}\`}`
        );
      } else {
        lines[i] = line.replace(
          new RegExp(`key=\\{?${mapIndexName}\\}?`),
          `key={${mapItemName}.id || ${mapItemName}.path || ${mapItemName}.name || \`${mapItemName}-\${${mapIndexName}}\`}`
        );
      }
    }
    
    // Reset when we exit the map function (rough heuristic)
    if (inMapFunction && (line.includes('))') || line.includes('})'))) {
      inMapFunction = false;
    }
  }
  
  if (modified) {
    content = lines.join('\n');
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed array keys in: ${path.relative(process.cwd(), filePath)}`);
    return 1;
  }
  
  return 0;
}

// Main execution
const srcDir = path.join(__dirname, 'src');
const files = findFiles(srcDir);

console.log(`Found ${files.length} React files`);

let totalFixed = 0;
for (const file of files) {
  totalFixed += fixArrayKeys(file);
}

console.log(`\nFixed array keys in ${totalFixed} files`);
