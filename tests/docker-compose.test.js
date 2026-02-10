const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docker-compose.yml');

if (!fs.existsSync(filePath)) {
  console.error('Missing docker-compose.yml');
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');
if (!content.includes('services:') || !content.includes('mediarr:')) {
  console.error('docker-compose.yml missing required sections');
  process.exit(1);
}

console.log('docker-compose.yml verification passed!');
