import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const version = process.argv[2];

if (!version) {
  console.error('Version not provided');
  process.exit(1);
}

// Update version constants file
const versionFilePath = path.join(__dirname, '../src/constants/version.ts');

const versionContent = `export const APP_VERSION = '${version}';\n`;
fs.writeFileSync(versionFilePath, versionContent);
console.log(`Updated version.ts to ${version}`);

// Update README if you have version badges
const readmePath = path.join(__dirname, '../README.md');
if (fs.existsSync(readmePath)) {
  let readme = fs.readFileSync(readmePath, 'utf8');
  readme = readme.replace(
    /version-v[\d.]+-/g,
    `version-v${version}-`
  );
  readme = readme.replace(
    /TypeLets v[\d.]+/g,
    `TypeLets v${version}`
  );
  fs.writeFileSync(readmePath, readme);
  console.log(`Updated README to version ${version}`);
}
