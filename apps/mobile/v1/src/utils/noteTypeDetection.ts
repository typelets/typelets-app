/**
 * Note type detection utilities
 * Centralized logic for detecting if a note is a diagram, code, or regular note
 */

import type { Note } from '@/src/services/api';

export type NoteType = 'diagram' | 'code' | 'sheets' | 'note';

/**
 * Detects if content contains diagram syntax
 */
export function isDiagramContent(content: string): boolean {
  if (!content) return false;

  return (
    content.includes('```mermaid') ||
    content.includes('sequenceDiagram') ||
    content.includes('classDiagram') ||
    content.includes('stateDiagram') ||
    content.includes('erDiagram') ||
    content.includes('gantt') ||
    content.includes('@startuml') ||
    content.includes('```plantuml') ||
    /graph\s+(TD|LR|TB|RL|BT)/.test(content) ||
    /flowchart\s+/.test(content)
  );
}

/**
 * Detects if content contains code blocks
 */
export function isCodeContent(content: string): boolean {
  if (!content) return false;

  return (
    content.includes('```javascript') ||
    content.includes('```typescript') ||
    content.includes('```python') ||
    content.includes('```java') ||
    content.includes('```cpp') ||
    content.includes('```c') ||
    content.includes('```go') ||
    content.includes('```rust') ||
    content.includes('```ruby') ||
    content.includes('```php') ||
    content.includes('```swift') ||
    content.includes('```kotlin') ||
    content.includes('data-executable="true"') ||
    content.includes('class="executable-code-block"')
  );
}

/**
 * Detects if content is a Univer workbook (spreadsheet)
 */
export function isWorkbookContent(content: string): boolean {
  if (!content) return false;

  try {
    const parsed = JSON.parse(content);
    return (
      parsed.sheets !== undefined ||
      parsed.sheetOrder !== undefined ||
      (parsed.id && typeof parsed.id === 'string' && parsed.id.startsWith('workbook'))
    );
  } catch {
    return false;
  }
}

/**
 * Detects the type of a note based on its content
 * @param note - The note to analyze
 * @returns The detected note type: 'diagram', 'code', 'sheets', or 'note'
 */
export function detectNoteType(note: Note): NoteType {
  // If type is already set, use it
  if (note.type) {
    return note.type;
  }

  // Check content for type indicators
  if (!note.content) {
    return 'note';
  }

  // Check for spreadsheets first
  if (isWorkbookContent(note.content)) {
    return 'sheets';
  }

  // Check for diagrams (more specific)
  if (isDiagramContent(note.content)) {
    return 'diagram';
  }

  // Then check for code
  if (isCodeContent(note.content)) {
    return 'code';
  }

  // Default to regular note
  return 'note';
}
