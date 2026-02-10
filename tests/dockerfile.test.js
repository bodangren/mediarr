const fs = require('fs');
const path = require('path');

const dockerfilePath = path.join(__dirname, '..', 'Dockerfile');

if (!fs.existsSync(dockerfilePath)) {
  console.error('Missing Dockerfile');
  process.exit(1);
}

const content = fs.readFileSync(dockerfilePath, 'utf8');
const requiredKeywords = [
  'FROM',
  'RUN',
  'COPY',
  'EXPOSE',
  'CMD',
];

let failed = false;
requiredKeywords.forEach(keyword => {
  if (!content.includes(keyword)) {
    console.error(`Dockerfile missing keyword: ${keyword}`);
    failed = true;
  }
});

if (failed) {
  process.exit(1);
} else {
  console.log('Dockerfile verification passed!');
}
