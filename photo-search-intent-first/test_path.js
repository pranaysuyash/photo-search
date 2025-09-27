const path = require('path');
const fs = require('fs');

const filePath = '/api/web/assets/index-KQaPWDU1.js';
const currentTarget = { type: 'file', file: '/Users/pranay/Projects/adhoc_projects/photo-search/photo-search-intent-first/api/web/index.html' };

console.log('filePath:', filePath);
console.log('filePath exists:', fs.existsSync(filePath));

if (!fs.existsSync(filePath) && currentTarget?.type === 'file') {
  const rootDir = path.dirname(path.resolve(currentTarget.file));
  const trimmed = filePath.replace(/^[/\\]+/, '');
  const candidate = path.join(rootDir, trimmed);
  console.log('rootDir:', rootDir);
  console.log('trimmed:', trimmed);
  console.log('candidate:', candidate);
  console.log('candidate exists:', fs.existsSync(candidate));
}
