const fs = require('fs');
const path = require('path');

const migrationDir = path.join(__dirname, '..', 'prisma', 'migrations');
const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');

if (!fs.existsSync(migrationDir) || fs.readdirSync(migrationDir).length === 0) {
  console.error('Missing migration files in prisma/migrations');
  process.exit(1);
}

if (!fs.existsSync(dbPath)) {
  console.error('Missing database file: prisma/dev.db');
  process.exit(1);
}

console.log('Database migration verification passed!');
