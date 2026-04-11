const fs = require('fs');
const path = require('path');

const directoriesToScan = ['frontend/src', 'backend'];
const searchExtensions = ['.js', '.jsx'];

const replacements = [
  { search: /received_at_warehouse/g, replace: 'at_warehouse' },
  { search: /out_for_delivery/g, replace: 'in_transit' }
];

function scanDirectory(dir) {
  let filesToModify = [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === 'public' || file === 'assets' || file === '.git') continue;
    
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      filesToModify = filesToModify.concat(scanDirectory(fullPath));
    } else if (stat.isFile() && searchExtensions.includes(path.extname(fullPath))) {
      filesToModify.push(fullPath);
    }
  }
  return filesToModify;
}

let modifiedCount = 0;

for (const dir of directoriesToScan) {
  const fullDirPath = path.resolve(__dirname, dir);
  if (!fs.existsSync(fullDirPath)) {
    console.log(`Directory not found: ${fullDirPath}`);
    continue;
  }
  
  const files = scanDirectory(fullDirPath);
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let hasChanges = false;
    
    for (const r of replacements) {
      if (r.search.test(content)) {
        content = content.replace(r.search, r.replace);
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      fs.writeFileSync(file, content, 'utf8');
      modifiedCount++;
      console.log(`Updated: ${file}`);
    }
  }
}

console.log(`Complete. Modified ${modifiedCount} files.`);
