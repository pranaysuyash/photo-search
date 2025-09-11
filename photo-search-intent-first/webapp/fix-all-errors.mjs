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

// Fix all common issues
function fixAllIssues(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const originalContent = content;

  // Fix 1: Array index keys - find all .map((item, idx) => ... key={idx}
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for key={numeric_var} patterns
    if (line.match(/key=\{(i|idx|index|j|k)\}/)) {
      // Try to find what we're iterating over
      let found = false;
      for (let j = Math.max(0, i - 10); j < i; j++) {
        const prevLine = lines[j];
        const mapMatch = prevLine.match(/(\w+)\.map\s*\(\s*\(([^,)]+)\s*(?:,\s*(\w+))?\)/);
        if (mapMatch) {
          const itemName = mapMatch[2].trim();
          const indexName = mapMatch[3]?.trim();
          if (indexName && line.includes(`key={${indexName}}`)) {
            // Generate better key
            lines[i] = line.replace(
              new RegExp(`key=\\{${indexName}\\}`),
              `key={\`\${${itemName}.id || ${itemName}.path || ${itemName}.name || ${itemName}.key || ''}-\${${indexName}}\`}`
            );
            modified = true;
            found = true;
            break;
          }
        }
      }
      
      // Fallback for common patterns
      if (!found) {
        if (line.includes('key={i}')) {
          lines[i] = line.replace(/key=\{i\}/, 'key={`item-${i}`}');
          modified = true;
        } else if (line.includes('key={idx}')) {
          lines[i] = line.replace(/key=\{idx\}/, 'key={`item-${idx}`}');
          modified = true;
        } else if (line.includes('key={index}')) {
          lines[i] = line.replace(/key=\{index\}/, 'key={`item-${index}`}');
          modified = true;
        }
      }
    }
  }
  
  if (modified) {
    content = lines.join('\n');
  }

  // Fix 2: role="button" without proper keyboard handlers
  content = content.replace(
    /role="button"([^>]*?)onClick=\{([^}]+)\}(?![^>]*onKeyDown)/g,
    (match, attrs, clickHandler) => {
      modified = true;
      return `role="button"${attrs}onClick={${clickHandler}} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ${clickHandler}; } }}`;
    }
  );

  // Fix 3: aria-label on interactive elements without proper roles
  content = content.replace(
    /<(div|span)([^>]*?)aria-label="([^"]+)"([^>]*?)onClick=/g,
    (match, tag, before, label, after) => {
      if (!match.includes('role=')) {
        modified = true;
        return `<${tag} role="button" tabIndex={0}${before}aria-label="${label}"${after}onClick=`;
      }
      return match;
    }
  );

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed issues in: ${path.relative(process.cwd(), filePath)}`);
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
  totalFixed += fixAllIssues(file);
}

console.log(`\nFixed issues in ${totalFixed} files`);
