const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'tsconfig.json',
  'app/tsconfig.json',
  'server/tsconfig.json',
];

let failed = false;

requiredFiles.forEach(f => {
  if (!fs.existsSync(path.join(__dirname, '..', f))) {
    console.error(`Missing required TypeScript file: ${f}`);
    failed = true;
  }
});

if (failed) {
  process.exit(1);
} else {
  console.log('TypeScript configuration verification passed!');
}
