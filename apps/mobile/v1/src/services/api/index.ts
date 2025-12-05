/**
 * API Service Main Entry Point
 * Exports the main useApiService hook and types
 */

import { useAuth, useUser } from '@clerk/clerk-expo';

import { createFoldersApi } from './folders';
import { createNotesApi } from './notes';
import { createPublicNotesApi } from './publicNotes';
import { createUserApi } from './user';

// Re-export types for convenience
export type { PickedFile } from '../fileService';
export type {
  ApiPublicNote,
  ApiUser,
  ApiUserUsage,
  EmptyTrashResponse,
  FileAttachment,
  Folder,
  FolderCounts,
  Note,
  NoteCounts,
  NoteQueryParams} from './types';

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
  const publicNotesApi = createPublicNotesApi(getToken);

  // Return combined API surface
  return {
    // Notes methods
    getCounts: notesApi.getCounts,
    getNotes: notesApi.getNotes,
    getNote: notesApi.getNote,
    getNoteType: notesApi.getNoteType,
    createNote: notesApi.createNote,
    updateNote: notesApi.updateNote,
    deleteNote: notesApi.deleteNote,
    hideNote: notesApi.hideNote,
    unhideNote: notesApi.unhideNote,
    emptyTrash: notesApi.emptyTrash,
    getNoteCounts: notesApi.getNoteCounts,

    // File attachment methods
    pickFiles: notesApi.pickFiles,
    uploadFiles: notesApi.uploadFiles,
    getAttachments: notesApi.getAttachments,
    downloadFile: notesApi.downloadFile,
    shareFile: notesApi.shareFile,
    deleteAttachment: notesApi.deleteAttachment,
    formatFileSize: notesApi.formatFileSize,
    getFileIcon: notesApi.getFileIcon,

    // Folders methods
    getFolders: foldersApi.getFolders,
    createFolder: foldersApi.createFolder,
    updateFolder: foldersApi.updateFolder,
    deleteFolder: foldersApi.deleteFolder,

    // User methods
    getCurrentUser: userApi.getCurrentUser,

    // Public notes methods
    publishNote: publicNotesApi.publishNote,
    updatePublicNote: publicNotesApi.updatePublicNote,
    unpublishNote: publicNotesApi.unpublishNote,
    getPublicNoteInfo: publicNotesApi.getPublicNoteInfo,
    getPublicUrl: publicNotesApi.getPublicUrl,
  };
};
