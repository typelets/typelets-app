/**
 * API Service Main Entry Point
 * Exports the main useApiService hook and types
 */

import { useAuth, useUser } from '@clerk/clerk-expo';
import { createNotesApi } from './notes';
import { createFoldersApi } from './folders';
import { createUserApi } from './user';

// Re-export types for convenience
export type { Folder, Note, NoteQueryParams, EmptyTrashResponse, ApiUser, ApiUserUsage } from './types';

/**
 * Main API service hook
 * Provides access to all API methods with authentication
 */
export const useApiService = () => {
  const { getToken } = useAuth();
  const { user } = useUser();

  const getUserId = () => user?.id;

  // Create API modules
  const notesApi = createNotesApi(getToken, getUserId);
  const foldersApi = createFoldersApi(getToken);
  const userApi = createUserApi(getToken);

  // Return combined API surface
  return {
    // Notes methods
    getNotes: notesApi.getNotes,
    getNote: notesApi.getNote,
    createNote: notesApi.createNote,
    updateNote: notesApi.updateNote,
    deleteNote: notesApi.deleteNote,
    hideNote: notesApi.hideNote,
    unhideNote: notesApi.unhideNote,
    emptyTrash: notesApi.emptyTrash,

    // Folders methods
    getFolders: foldersApi.getFolders,
    createFolder: foldersApi.createFolder,
    updateFolder: foldersApi.updateFolder,
    deleteFolder: foldersApi.deleteFolder,

    // User methods
    getCurrentUser: userApi.getCurrentUser,
  };
};
