# Typelets Mobile App

React Native mobile application for Typelets - a secure, encrypted note-taking platform.

## Features

- 🔐 **End-to-end encryption** with master password protection
- 📱 **Cross-platform** - iOS and Android support via React Native
- 📁 **Folder organization** with nested folder support
- ⭐ **Starred notes** for quick access
- 🗑️ **Trash management** with restore capabilities
- 🎨 **Theme support** - Light and dark modes
- 🔄 **Real-time sync** with backend API
- 📝 **Rich text editing** powered by TipTap

## Tech Stack

- **Framework**: React Native with Expo 54
- **Routing**: Expo Router (file-based)
- **Authentication**: Clerk
- **Encryption**: AES-GCM with PBKDF2 key derivation
- **State Management**: React hooks
- **Storage**: Expo SecureStore
- **Editor**: TipTap (WebView-based)

## Architecture

### Modular Structure

The app follows a clean, modular architecture:

```
src/
├── components/        # Reusable UI components
│   ├── MasterPasswordDialog/  # Password UI (modular)
│   └── ui/           # Base UI components
├── screens/          # Main app screens
├── services/         # API and business logic
│   └── api/         # Modular API service
├── lib/             # Core libraries
│   └── encryption/  # Modular encryption service
├── hooks/           # Custom React hooks
└── theme/           # Theme configuration
```

### Key Modules

**API Service** (`src/services/api/`)
- Modular REST API client with authentication
- Separated concerns: notes, folders, encryption
- Centralized error handling and pagination

**Encryption Service** (`src/lib/encryption/`)
- AES-GCM encryption with 250,000 PBKDF2 iterations
- Master password support with secure key storage
- LRU cache for decrypted notes (15-minute TTL)

**Master Password UI** (`src/components/MasterPasswordDialog/`)
- Modular password setup/unlock flows
- Custom hooks for validation and keyboard handling
- Optimized for long-running PBKDF2 operations

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`
- For iOS: Xcode and iOS Simulator
- For Android: Android Studio and Android Emulator

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add:
   ```
   EXPO_PUBLIC_API_URL=your_api_url
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
   ```

3. **Start development server**
   ```bash
   npx expo start
   ```

4. **Run on device/emulator**
   - Press `a` for Android
   - Press `i` for iOS
   - Scan QR code with Expo Go app

### Building for Production

#### Android (Preview Build)
```bash
eas build --platform android --profile preview
```

#### Android (Production Build)
```bash
eas build --platform android --profile production
```

#### iOS (Production Build)
```bash
eas build --platform ios --profile production
```

## Development

### Linting
```bash
npm run lint
```

### Type Checking
```bash
npx tsc --noEmit
```

### Clear Cache
```bash
npx expo start --clear
```

## Project Structure

### Screens
- `app/index.tsx` - Folders list (home)
- `app/folder-notes.tsx` - Notes in a folder
- `app/view-note.tsx` - View note (read-only)
- `app/edit-note.tsx` - Edit note with TipTap
- `app/settings.tsx` - App settings

### API Integration

The app uses a modular API service with automatic authentication:

```typescript
const { getNotes, createNote, getFolders } = useApiService();

// Fetch notes with encryption/decryption
const notes = await getNotes({ folderId: 'abc123' });

// Create encrypted note
await createNote({
  title: 'My Note',
  content: '<p>Content</p>',
  folderId: 'abc123'
});
```

### Encryption

Master password encryption is handled automatically:

```typescript
import {
  setupMasterPassword,
  unlockWithMasterPassword,
  hasMasterPassword
} from '@/lib/encryption';

// Setup (first time)
await setupMasterPassword('my-password', userId);

// Unlock (returning user)
const success = await unlockWithMasterPassword('my-password', userId);
```

## Configuration

### EAS Build Configuration

See `eas.json` for build profiles:
- **development**: Dev client builds
- **preview**: Internal testing builds
- **production**: App Store/Play Store builds

### App Configuration

See `app.json` for:
- App name, bundle identifiers
- Icon and splash screen
- iOS/Android specific settings
- App version (auto-updated by semantic-release)

## Version Management

App versions are automatically managed by semantic-release based on conventional commits:

- `feat(mobile):` → Minor version bump
- `fix(mobile):` → Patch version bump
- `refactor(mobile):` → Patch version bump
- Breaking changes → Major version bump

The version is synced across:
- `package.json`
- `app.json` (expo.version)
- iOS buildNumber (auto-incremented)
- Android versionCode (auto-incremented)

## Security

- **Encryption**: AES-GCM with PBKDF2 (250k iterations)
- **Key Storage**: Expo SecureStore (iOS Keychain / Android Keystore)
- **Authentication**: Clerk with JWT tokens
- **Transport**: HTTPS only
- **Master Password**: Never stored, derived on-device

## Contributing

1. Create a feature branch from `main`
2. Use conventional commits: `feat(mobile):`, `fix(mobile):`, etc.
3. Run linting before committing: `npm run lint`
4. Test on both iOS and Android if possible
5. Create a PR with clear description

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Clerk Documentation](https://clerk.com/docs)
- [EAS Build](https://docs.expo.dev/build/introduction/)

## License

See main repository LICENSE file.
