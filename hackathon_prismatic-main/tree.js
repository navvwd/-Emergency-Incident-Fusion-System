const fs = require('fs');
const path = require('path');

const EXCLUDED_DIRS = ['node_modules', '.git', 'android', 'dist', 'build', '.gemini'];

function generateTree(dirPath, depth = 0, isLast = true, prefix = '') {
  const stats = fs.statSync(dirPath);
  const name = path.basename(dirPath);

  if (EXCLUDED_DIRS.includes(name)) return;

  const connector = depth === 0 ? '' : isLast ? '└── ' : '├── ';
  const icon = stats.isDirectory() ? '📂' : '📄';
  console.log(`${prefix}${connector}${icon} ${name}`);

  if (stats.isDirectory()) {
    const items = fs.readdirSync(dirPath).sort((a, b) => {
      const aIsDir = fs.statSync(path.join(dirPath, a)).isDirectory();
      const bIsDir = fs.statSync(path.join(dirPath, b)).isDirectory();
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });
    
    // Filter out excluded immediately to handle `isLast` logic correctly
    const validItems = items.filter(item => !EXCLUDED_DIRS.includes(item));

    const newPrefix = depth === 0 ? '' : prefix + (isLast ? '    ' : '│   ');

    for (let i = 0; i < validItems.length; i++) {
        generateTree(path.join(dirPath, validItems[i]), depth + 1, i === validItems.length - 1, newPrefix);
    }
  }
}

console.log(`\n📦 Project Structure (excluding node_modules, android, dist etc.)\n`);
generateTree('.');
