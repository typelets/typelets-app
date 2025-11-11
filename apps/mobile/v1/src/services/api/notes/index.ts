/**
 * Notes API - Main Export
 *
 * Modular structure:
 * - crud.ts: Create, update, delete operations
 * - core.ts: Query operations and other functionality (being gradually extracted)
 * - cache-sync.ts: Cache synchronization utilities
 * - shared.ts: Shared helper functions
 */

import type { AuthTokenGetter } from '../client';
import { createHttpClient } from '../client';

import { createCrudOperations } from './crud';
import { createNotesApi as createCoreNotesApi } from './core';

export function createNotesApi(getToken: AuthTokenGetter, getUserId: () => string | undefined) {
  const { makeRequest, makeConditionalRequest } = createHttpClient(getToken);

  // Get CRUD operations from modular file
  const { createNote, updateNote, deleteNote } = createCrudOperations(makeRequest, getUserId);

  // Get remaining operations from core (to be gradually extracted)
  const coreApi = createCoreNotesApi(getToken, getUserId);

  // Return combined API - modular operations override core operations
  return {
    // CRUD operations (from modular crud.ts)
    createNote,
    updateNote,
    deleteNote,

    // Query operations (from core.ts - to be extracted)
    getCounts: coreApi.getCounts,
    getNotes: coreApi.getNotes,
    getNote: coreApi.getNote,
    getNoteCounts: coreApi.getNoteCounts,

    // Visibility operations (from core.ts - to be extracted)
    hideNote: coreApi.hideNote,
    unhideNote: coreApi.unhideNote,

    // Trash operations (from core.ts)
    emptyTrash: coreApi.emptyTrash,

    // File attachment operations (from core.ts - to be extracted)
    pickFiles: coreApi.pickFiles,
    uploadFiles: coreApi.uploadFiles,
    getAttachments: coreApi.getAttachments,
    downloadFile: coreApi.downloadFile,
    shareFile: coreApi.shareFile,
    deleteAttachment: coreApi.deleteAttachment,
    formatFileSize: coreApi.formatFileSize,
    getFileIcon: coreApi.getFileIcon,
  };
}
