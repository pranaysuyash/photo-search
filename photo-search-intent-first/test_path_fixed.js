const path = require('path');
const fs = require('fs');

const filePath = '/api/web/assets/index-KQaPWDU1.js';
const allowedRoot = '/Users/pranay/Projects/adhoc_projects/photo-search/photo-search-intent-first/api/web';

console.log('filePath:', filePath);
console.log('filePath exists:', fs.existsSync(filePath));

if (!fs.existsSync(filePath)) {
  const trimmed = filePath.replace(/^[/\\]+/, '');
  const candidate = path.join(allowedRoot, trimmed);
  console.log('allowedRoot:', allowedRoot);
  console.log('trimmed:', trimmed);
  console.log('candidate:', candidate);
  console.log('candidate exists:', fs.existsSync(candidate));
}
