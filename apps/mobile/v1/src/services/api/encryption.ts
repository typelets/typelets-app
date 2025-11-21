/**
 * Encryption Wrapper for API Service
 * Handles note encryption/decryption logic
 */

import { clearNoteCacheForUser, decryptNoteData, encryptNoteData, isNoteEncrypted as checkNoteEncrypted } from '../../lib/encryption';
import { Note } from './types';
import { ENCRYPTED_MARKER } from './utils/constants';

/**
 * Re-export isNoteEncrypted for convenience
 */
export { checkNoteEncrypted as isNoteEncrypted };

/**
 * Decrypts a note if it's encrypted
 */
export async function decryptNote(note: Note, userId: string): Promise<Note> {
  if (!checkNoteEncrypted(note)) {
    return note; // Return as-is if not encrypted
  }

  try {
    const decrypted = await decryptNoteData(
      userId,
      note.encryptedTitle!,
      note.encryptedContent!,
      note.iv!,
      note.salt!
    );

    return {
      ...note,
      title: decrypted.title,
      content: decrypted.content,
    };
  } catch (error) {
    if (__DEV__) {
      console.log('Failed to decrypt note (likely wrong master password):', note.id);
    }
    // Return note with placeholder content if decryption fails
    return {
      ...note,
      title: '[Encrypted - Unable to decrypt]',
      content: '[This note is encrypted but could not be decrypted. Please check your master password.]',
    };
  }
}

// Yield to main thread to prevent UI blocking
const yieldToMain = (): Promise<void> => {
  return new Promise(resolve => {
    // Use requestAnimationFrame for smoother UI, fallback to setTimeout
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    } else {
      setTimeout(resolve, 0);
    }
  });
};

/**
 * Decrypts an array of notes in batches to prevent UI blocking
 */
export async function decryptNotes(
  notes: Note[],
  userId: string
): Promise<Note[]> {
  if (!notes.length) {
    return notes;
  }

  const decryptStart = performance.now();
  console.log(`[PERF] Starting decryption of ${notes.length} notes...`);

  const BATCH_SIZE = 3; // Process 3 notes at a time for better UI responsiveness
  const result: Note[] = [];

  try {
    // Process notes one at a time with yields for maximum UI responsiveness
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];

      try {
        const decrypted = await decryptNote(note, userId);
        result.push(decrypted);
      } catch {
        result.push({
          ...note,
          title: note.title || '[Encrypted - Unable to decrypt]',
          content: note.content || '[This note could not be decrypted]',
        });
      }

      // Yield to main thread every 3 notes to keep UI responsive
      if ((i + 1) % BATCH_SIZE === 0 && i + 1 < notes.length) {
        await yieldToMain();
      }
    }

    const decryptEnd = performance.now();
    console.log(`[PERF] Decryption completed in ${(decryptEnd - decryptStart).toFixed(2)}ms for ${notes.length} notes`);

    return result;
  } catch (error) {
    if (__DEV__) {
      console.error('Error during note decryption batch:', error);
    }
    return notes;
  }
}

/**
 * Encrypts note data for API submission
 */
export async function encryptNoteForApi(
  userId: string,
  title: string,
  content: string
): Promise<{
  title: string;
  content: string;
  encryptedTitle: string;
  encryptedContent: string;
  iv: string;
  salt: string;
}> {
  // Safety check: don't encrypt if already encrypted
  if (title === ENCRYPTED_MARKER || content === ENCRYPTED_MARKER) {
    throw new Error('Attempted to encrypt already encrypted content - this would corrupt the note');
  }

  // Encrypt the note data
  const encryptedData = await encryptNoteData(userId, title, content);

  // Validate encryption worked
  if (
    !encryptedData.encryptedTitle ||
    !encryptedData.encryptedContent ||
    !encryptedData.iv ||
    !encryptedData.salt
  ) {
    throw new Error('Failed to encrypt note data');
  }

  return {
    title: ENCRYPTED_MARKER,
    content: ENCRYPTED_MARKER,
    encryptedTitle: encryptedData.encryptedTitle,
    encryptedContent: encryptedData.encryptedContent,
    iv: encryptedData.iv,
    salt: encryptedData.salt,
  };
}

/**
 * Clears encryption cache for a user
 */
export function clearEncryptionCache(userId: string): void {
  clearNoteCacheForUser(userId);
}
