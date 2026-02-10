const fs = require('fs');
const path = require('path');

const requiredRepos = [
  'sonarr',
  'radarr',
  'bazarr',
  'prowlarr',
];

let failed = false;

requiredRepos.forEach(repo => {
  if (!fs.existsSync(path.join(__dirname, '..', 'reference', repo, '.git'))) {
    console.error(`Missing required repository: reference/${repo}`);
    failed = true;
  }
});

if (failed) {
  process.exit(1);
} else {
  console.log('Reference repositories verification passed!');
}
