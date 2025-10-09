import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Unified Versioning Script for Mobile App
 *
 * This script syncs the mobile app version to match the main app version.
 * Both main and mobile use the SAME version number for simplicity.
 *
 * Usage: Called by semantic-release with the new version as argument
 */

const version = process.argv[2];

if (!version) {
  console.error('Version not provided');
  process.exit(1);
}

console.log(`\n📱 Syncing mobile app to version ${version}...`);

// Update mobile app package.json
const mobilePackagePath = path.join(__dirname, '../apps/mobile/v1/package.json');
const mobilePackage = JSON.parse(fs.readFileSync(mobilePackagePath, 'utf8'));
const oldVersion = mobilePackage.version;
mobilePackage.version = version;
fs.writeFileSync(mobilePackagePath, JSON.stringify(mobilePackage, null, 2) + '\n');
console.log(`✓ Updated apps/mobile/v1/package.json: ${oldVersion} → ${version}`);

// Update mobile app.json
const mobileAppJsonPath = path.join(__dirname, '../apps/mobile/v1/app.json');
const mobileAppJson = JSON.parse(fs.readFileSync(mobileAppJsonPath, 'utf8'));
mobileAppJson.expo.version = version;

// Bump build numbers for iOS and Android
if (mobileAppJson.expo.ios) {
  const currentBuildNumber = parseInt(mobileAppJson.expo.ios.buildNumber || '1', 10);
  mobileAppJson.expo.ios.buildNumber = String(currentBuildNumber + 1);
  console.log(`✓ Bumped iOS buildNumber to ${mobileAppJson.expo.ios.buildNumber}`);
}

if (mobileAppJson.expo.android) {
  const currentVersionCode = parseInt(mobileAppJson.expo.android.versionCode || 1, 10);
  mobileAppJson.expo.android.versionCode = currentVersionCode + 1;
  console.log(`✓ Bumped Android versionCode to ${mobileAppJson.expo.android.versionCode}`);
}

fs.writeFileSync(mobileAppJsonPath, JSON.stringify(mobileAppJson, null, 2) + '\n');
console.log(`✓ Updated apps/mobile/v1/app.json`);

// Update mobile version.ts
const mobileVersionPath = path.join(__dirname, '../apps/mobile/v1/src/constants/version.ts');
const mobileVersionContent = `export const APP_VERSION = '${version}';\n`;
fs.writeFileSync(mobileVersionPath, mobileVersionContent);
console.log(`✓ Updated apps/mobile/v1/src/constants/version.ts`);

console.log(`\n✅ Mobile app synced to version ${version}`);
console.log(`   (Unified versioning: main and mobile always match)\n`);
