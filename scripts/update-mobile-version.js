import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get commits since last mobile version bump
function getCommitsSinceLastMobileBump() {
  try {
    // Find the last commit that changed mobile package.json version
    // This is typically a "chore(mobile): bump mobile app version" commit
    const lastBumpCommit = execSync(
      'git log -1 --format=%H --grep="chore(mobile): bump mobile app version" -- apps/mobile/v1/package.json',
      { encoding: 'utf8' }
    ).trim();

    if (lastBumpCommit) {
      // Get commits since that bump commit
      const commits = execSync(
        `git log ${lastBumpCommit}..HEAD --pretty=format:"%s"`,
        { encoding: 'utf8' }
      );
      return commits.split('\n').filter(Boolean);
    }

    // If no bump commit found, just get the last commit
    const lastCommit = execSync('git log -1 --pretty=format:"%s"', { encoding: 'utf8' });
    return lastCommit ? [lastCommit] : [];
  } catch (error) {
    // Fallback to last commit
    try {
      const lastCommit = execSync('git log -1 --pretty=format:"%s"', { encoding: 'utf8' });
      return lastCommit ? [lastCommit] : [];
    } catch {
      return [];
    }
  }
}

// Check if there are mobile commits
function hasMobileCommits(commits) {
  return commits.some(commit => commit.includes('(mobile)'));
}

// Determine version bump type for mobile based on the HIGHEST priority commit
function getMobileVersionBump(commits) {
  const mobileCommits = commits.filter(commit => commit.includes('(mobile)'));

  // Check for breaking changes (highest priority)
  if (mobileCommits.some(commit => commit.includes('BREAKING CHANGE') || commit.startsWith('feat(mobile)!'))) {
    return 'major';
  }

  // Check for features (medium priority)
  if (mobileCommits.some(commit => commit.startsWith('feat(mobile)'))) {
    return 'minor';
  }

  // Check for fixes (low priority)
  if (mobileCommits.some(commit => commit.startsWith('fix(mobile)'))) {
    return 'patch';
  }

  // For chore, style, refactor, etc. - still bump patch
  if (mobileCommits.length > 0) {
    return 'patch';
  }

  return null;
}

// Bump version
function bumpVersion(version, type) {
  const parts = version.split('.').map(Number);

  switch (type) {
    case 'major':
      return `${parts[0] + 1}.0.0`;
    case 'minor':
      return `${parts[0]}.${parts[1] + 1}.0`;
    case 'patch':
      return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    default:
      return version;
  }
}

// Main execution
const commits = getCommitsSinceLastMobileBump();

if (!hasMobileCommits(commits)) {
  console.log('No mobile commits found, skipping mobile version bump');
  process.exit(0);
}

const bumpType = getMobileVersionBump(commits);
if (!bumpType) {
  console.log('No mobile version bump needed');
  process.exit(0);
}

// Update mobile app package.json
const mobilePackagePath = path.join(__dirname, '../apps/mobile/v1/package.json');
const mobilePackage = JSON.parse(fs.readFileSync(mobilePackagePath, 'utf8'));
const oldVersion = mobilePackage.version;
const newVersion = bumpVersion(oldVersion, bumpType);
mobilePackage.version = newVersion;
fs.writeFileSync(mobilePackagePath, JSON.stringify(mobilePackage, null, 2) + '\n');
console.log(`Updated mobile package.json from ${oldVersion} to ${newVersion} (${bumpType})`);

// Update mobile app.json
const mobileAppJsonPath = path.join(__dirname, '../apps/mobile/v1/app.json');
const mobileAppJson = JSON.parse(fs.readFileSync(mobileAppJsonPath, 'utf8'));
mobileAppJson.expo.version = newVersion;

// Also bump build numbers for iOS and Android
if (mobileAppJson.expo.ios) {
  const currentBuildNumber = parseInt(mobileAppJson.expo.ios.buildNumber || '1', 10);
  mobileAppJson.expo.ios.buildNumber = String(currentBuildNumber + 1);
  console.log(`Updated iOS buildNumber to ${mobileAppJson.expo.ios.buildNumber}`);
}

if (mobileAppJson.expo.android) {
  const currentVersionCode = parseInt(mobileAppJson.expo.android.versionCode || 1, 10);
  mobileAppJson.expo.android.versionCode = currentVersionCode + 1;
  console.log(`Updated Android versionCode to ${mobileAppJson.expo.android.versionCode}`);
}

fs.writeFileSync(mobileAppJsonPath, JSON.stringify(mobileAppJson, null, 2) + '\n');
console.log(`Updated mobile app.json to version ${newVersion}`);

// Update mobile version.ts
const mobileVersionPath = path.join(__dirname, '../apps/mobile/v1/src/constants/version.ts');
const mobileVersionContent = `export const APP_VERSION = '${newVersion}';\n`;
fs.writeFileSync(mobileVersionPath, mobileVersionContent);
console.log(`Updated mobile version.ts to ${newVersion}`);

console.log(`\n✅ Mobile app version bumped: ${oldVersion} → ${newVersion} (${bumpType})`);
