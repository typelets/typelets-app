# @typelets/editor

React Native text editor for Typelets - a performant, native editor without WebView.

## Features

- 🚀 Pure React Native - no WebView
- ⚡️ High performance with large documents
- 📝 Rich text editing
- 🎨 Syntax highlighting for code
- 📱 Native iOS and Android support
- 🎯 TypeScript support

## Installation

This is an internal package. Import it in your app:

```typescript
import { Editor } from '@typelets/editor';
```

## Usage

```tsx
import { Editor } from '@typelets/editor';

function NoteScreen() {
  const [content, setContent] = useState('');

  return (
    <Editor
      value={content}
      onChange={setContent}
      placeholder="Start typing..."
    />
  );
}
```

## Architecture

- Built for React Native/Expo
- No WebView dependencies
- Optimized for mobile performance
- Extensible plugin system
