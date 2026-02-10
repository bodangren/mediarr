const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

if (!fs.existsSync(schemaPath)) {
  console.error('Missing prisma/schema.prisma');
  process.exit(1);
}

try {
  console.log('Validating Prisma schema...');
  execSync('npx prisma validate', { stdio: 'inherit' });
  console.log('Prisma schema is valid!');
} catch (error) {
  console.error('Prisma schema validation failed!');
  process.exit(1);
}
