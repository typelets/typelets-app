import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const version = process.argv[2];

if (!version) {
  console.error('Version not provided');
  process.exit(1);
}

// Check if this release is mobile-only
function isMobileOnlyRelease() {
  try {
    const commits = execSync('git log $(git describe --tags --abbrev=0)..HEAD --pretty=format:"%s"', { encoding: 'utf8' });
    const commitList = commits.split('\n').filter(Boolean);

    // Check if all commits are mobile-scoped
    const hasMobile = commitList.some(commit => commit.includes('(mobile)'));
    const hasNonMobile = commitList.some(commit => !commit.includes('(mobile)') && !commit.includes('[skip ci]'));

    return hasMobile && !hasNonMobile;
  } catch (error) {
    return false;
  }
}

// Skip web version updates if this is a mobile-only release
if (isMobileOnlyRelease()) {
  console.log('Mobile-only release detected, skipping web version updates');
  process.exit(0);
}

// Update version constants file
const versionFilePath = path.join(__dirname, '../src/constants/version.ts');

const versionContent = `export const APP_VERSION = '${version}';\n`;
fs.writeFileSync(versionFilePath, versionContent);
console.log(`Updated version.ts to ${version}`);

// Update desktop app package.json version
const desktopPackagePath = path.join(__dirname, '../apps/desktop/package.json');
if (fs.existsSync(desktopPackagePath)) {
  const desktopPackage = JSON.parse(fs.readFileSync(desktopPackagePath, 'utf8'));
  desktopPackage.version = version;
  fs.writeFileSync(desktopPackagePath, JSON.stringify(desktopPackage, null, 2) + '\n');
  console.log(`Updated desktop package.json to ${version}`);
}

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
