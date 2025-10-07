import { useAuth, useUser } from '@clerk/clerk-expo';
import { decryptNoteData, encryptNoteData, isNoteEncrypted, clearNoteCacheForUser } from '../lib/encryption';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.typelets.com/api';

if (__DEV__) {
  console.log('=== API SERVICE CONFIG ===');
  console.log('process.env.EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);
  console.log('Final API_BASE_URL:', API_BASE_URL);
  console.log('========================');
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  parentId?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  children?: Folder[];
  noteCount?: number;
  sortOrder?: number;
  isDefault?: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId?: string;
  userId: string;
  starred: boolean;
  archived?: boolean;
  deleted?: boolean;
  hidden: boolean;
  hiddenAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // Encrypted fields (if note is encrypted)
  encryptedTitle?: string;
  encryptedContent?: string;
  iv?: string;
  salt?: string;
}

// Helper function to decrypt a note if it's encrypted
const decryptNote = async (note: Note, userId: string): Promise<Note> => {
  if (!isNoteEncrypted(note)) {
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
    if (__DEV__) console.error('Failed to decrypt note:', note.id, error);
    // Return note with placeholder content if decryption fails
    return {
      ...note,
      title: '[Encrypted - Unable to decrypt]',
      content: '[This note is encrypted but could not be decrypted. Please check your master password.]',
    };
  }
};

// Custom hooks for React components
export const useApiService = () => {
  const { getToken } = useAuth();
  const { user } = useUser();

  const makeRequest = async (endpoint: string, options: RequestInit = {}) => {
    try {
      const token = await getToken();

      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Log detailed error for development
        if (__DEV__) {
          console.error('API Error Response:', errorText);
        }

        // Provide generic user-facing error messages
        let userMessage = 'Something went wrong. Please try again.';
        if (response.status === 401) {
          userMessage = 'Authentication failed. Please log in again.';
        } else if (response.status === 403) {
          userMessage = 'You do not have permission to perform this action.';
        } else if (response.status >= 500) {
          userMessage = 'Server error. Please try again later.';
        } else if (response.status === 429) {
          userMessage = 'Too many requests. Please wait a moment and try again.';
        }

        throw new Error(userMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // Log detailed error for development
      if (__DEV__) {
        console.error('API Request Failed:', error);
      }

      // Re-throw the error (it already has user-friendly message from above)
      throw error;
    }
  };

  return {
    async getFolders(): Promise<Folder[]> {
      // Fetch all folders with pagination
      let allFolders: Folder[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', '50');
        params.append('_t', Date.now().toString()); // Cache busting

        const response = await makeRequest(`/folders?${params.toString()}`) as {folders: Folder[], pagination: any};

        const pageFolders = response.folders || [];
        allFolders = [...allFolders, ...pageFolders];

        // Check pagination
        if (response.pagination) {
          hasMore = page < response.pagination.totalPages;
        } else {
          hasMore = pageFolders.length >= 50;
        }

        page++;
        if (page > 50) {
          if (__DEV__) console.warn('Reached maximum page limit for folders');
          hasMore = false;
        }
      }

      return allFolders;
    },

    async getNotes(params?: {
      folderId?: string;
      starred?: boolean;
      archived?: boolean;
      deleted?: boolean;
      hidden?: boolean;
    }): Promise<Note[]> {
      // Fetch ALL notes with proper pagination (exactly like web app)
      let allNotes: Note[] = [];
      let page = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        const searchParams = new URLSearchParams();
        if (params?.folderId) searchParams.append('folderId', params.folderId);
        if (params?.starred !== undefined) searchParams.append('starred', params.starred.toString());
        if (params?.archived !== undefined) searchParams.append('archived', params.archived.toString());
        if (params?.deleted !== undefined) searchParams.append('deleted', params.deleted.toString());
        if (params?.hidden !== undefined) searchParams.append('hidden', params.hidden.toString());
        searchParams.append('page', page.toString());
        searchParams.append('limit', '50'); // Same as web app
        searchParams.append('_t', Date.now().toString()); // Cache busting

        const url = `/notes?${searchParams.toString()}`;
        const response = await makeRequest(url) as any;

        // Handle response format - check both response.total and response.pagination.total
        if (response && response.notes && Array.isArray(response.notes)) {
          const pageNotes = response.notes;
          allNotes = [...allNotes, ...pageNotes];

          // Check different possible response structures
          let total, limit;
          if (response.pagination) {
            // New API format with pagination object
            total = response.pagination.total;
            limit = response.pagination.limit;
          } else if (response.total !== undefined) {
            // Direct properties
            total = response.total;
            limit = response.limit;
          } else {
            // Fallback - assume more pages if we got a full page
            hasMorePages = pageNotes.length >= 50;
            page++;
            continue;
          }

          const totalPages = Math.ceil(total / limit);
          hasMorePages = page < totalPages;

          page++;

          // Add small delay between requests to avoid rate limiting (like web app)
          if (hasMorePages) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } else {
          hasMorePages = false;
        }

        // Safety break to prevent infinite loops
        if (page > 50) {
          hasMorePages = false;
        }
      }

      // Decrypt notes if they are encrypted
      if (user?.id && allNotes.length > 0) {
        try {
          // Decrypt notes individually to handle failures gracefully
          const decryptedNotes = await Promise.all(
            allNotes.map(async (note) => {
              try {
                return await decryptNote(note, user.id);
              } catch {
                // Return note with fallback content if decryption fails
                return {
                  ...note,
                  title: note.title || '[Encrypted - Unable to decrypt]',
                  content: note.content || '[This note could not be decrypted]'
                };
              }
            })
          );
          return decryptedNotes;
        } catch (error) {
          if (__DEV__) console.error('Error during note decryption batch:', error);
          return allNotes; // Return original notes if batch decryption fails
        }
      }

      return allNotes;
    },

    async getNote(noteId: string): Promise<Note> {
      const note = await makeRequest(`/notes/${noteId}`) as Note;

      // Decrypt note if it's encrypted and we have a user ID
      if (user?.id) {
        try {
          return await decryptNote(note, user.id);
        } catch (error) {
          if (__DEV__) console.error('Error decrypting individual note:', error);
          return note; // Return original note if decryption fails
        }
      }

      return note;
    },

    async createNote(note: Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Note> {
      if (!user?.id) {
        throw new Error('User ID required for note creation');
      }

      const title = note.title || 'Untitled';
      const content = note.content || '';

      try {
        // Encrypt the note data
        const encryptedData = await encryptNoteData(user.id, title, content);

        // Validate encryption worked
        if (!encryptedData.encryptedTitle || !encryptedData.encryptedContent ||
            !encryptedData.iv || !encryptedData.salt) {
          throw new Error('Failed to encrypt note data');
        }

        // Create the payload with encrypted data (matching web app format)
        const notePayload = {
          ...note,
          // Critical: Set these to indicate encrypted data
          title: "[ENCRYPTED]",
          content: "[ENCRYPTED]",
          encryptedTitle: encryptedData.encryptedTitle,
          encryptedContent: encryptedData.encryptedContent,
          iv: encryptedData.iv,
          salt: encryptedData.salt,
        };

        const createdNote = await makeRequest('/notes', {
          method: 'POST',
          body: JSON.stringify(notePayload),
        }) as Note;

        // Clear any cached encryption data for this user since we created a new note
        clearNoteCacheForUser(user.id);

        // Decrypt the returned note before returning it
        const decryptedNote = await decryptNote(createdNote, user.id);
        return decryptedNote;
      } catch (error) {
        if (__DEV__) console.error('Failed to create note:', error);
        throw new Error(`Failed to create note: ${error.message || error}`);
      }
    },

    async updateNote(noteId: string, updates: Partial<Note>): Promise<Note> {
      if (!user?.id) {
        throw new Error('User ID required for note update');
      }

      try {
        let updatePayload = { ...updates };

        // If updating title or content, encrypt them
        if (updates.title !== undefined || updates.content !== undefined) {
          // Safety check: don't encrypt if title/content are already encrypted markers
          const title = updates.title || '';
          const content = updates.content || '';

          if (title === "[ENCRYPTED]" || content === "[ENCRYPTED]") {
            throw new Error('Attempted to encrypt already encrypted content - this would corrupt the note');
          }

          // Encrypt the note data
          const encryptedData = await encryptNoteData(user.id, title, content);

          // Validate encryption worked
          if (!encryptedData.encryptedTitle || !encryptedData.encryptedContent ||
              !encryptedData.iv || !encryptedData.salt) {
            throw new Error('Failed to encrypt note data');
          }

          // Update payload with encrypted data (matching web app format)
          updatePayload = {
            ...updates,
            // Critical: Set these to indicate encrypted data
            title: "[ENCRYPTED]",
            content: "[ENCRYPTED]",
            encryptedTitle: encryptedData.encryptedTitle,
            encryptedContent: encryptedData.encryptedContent,
            iv: encryptedData.iv,
            salt: encryptedData.salt,
          };
        }

        const updatedNote = await makeRequest(`/notes/${noteId}`, {
          method: 'PUT',
          body: JSON.stringify(updatePayload),
        }) as Note;

        // Clear any cached encryption data for this user since we updated a note
        // Clear specific cache entries that might be related to the old encrypted title
        clearNoteCacheForUser(user.id);

        // Decrypt the returned note before returning it
        const decryptedNote = await decryptNote(updatedNote, user.id);
        return decryptedNote;
      } catch (error) {
        if (__DEV__) console.error('Failed to update note:', error);
        throw new Error(`Failed to update note: ${error.message || error}`);
      }
    },

    async deleteNote(noteId: string): Promise<void> {
      return makeRequest(`/notes/${noteId}`, {
        method: 'DELETE',
      });
    },

    async hideNote(noteId: string): Promise<Note> {
      const note = await makeRequest(`/notes/${noteId}/hide`, {
        method: 'POST',
      }) as Note;
      return decryptNote(note, user.id);
    },

    async unhideNote(noteId: string): Promise<Note> {
      const note = await makeRequest(`/notes/${noteId}/unhide`, {
        method: 'POST',
      }) as Note;
      return decryptNote(note, user.id);
    },

    // Folder management methods
    async createFolder(name: string, color: string, parentId?: string): Promise<Folder> {
      return makeRequest('/folders', {
        method: 'POST',
        body: JSON.stringify({ name, color, parentId }),
      }) as Promise<Folder>;
    },

    async updateFolder(folderId: string, updates: Partial<Folder>): Promise<Folder> {
      return makeRequest(`/folders/${folderId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }) as Promise<Folder>;
    },

    async deleteFolder(folderId: string): Promise<void> {
      return makeRequest(`/folders/${folderId}`, {
        method: 'DELETE',
      });
    },

    async emptyTrash(): Promise<{ message: string; deletedCount: number }> {
      return makeRequest('/notes/empty-trash', {
        method: 'DELETE',
      }) as Promise<{ message: string; deletedCount: number }>;
    },
  };
};