const fs = require('fs');
const path = require('path');

const requiredPaths = [
  'app/package.json',
  'server/package.json',
];

let failed = false;

requiredPaths.forEach(p => {
  if (!fs.existsSync(path.join(__dirname, '..', p))) {
    console.error(`Missing required path: ${p}`);
    failed = true;
  }
});

if (failed) {
  process.exit(1);
} else {
  console.log('Scaffold verification passed!');
}
