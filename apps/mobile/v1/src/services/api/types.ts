/**
 * API Type Definitions
 * Shared types for the API service
 */

export interface FileAttachment {
  id: string;
  noteId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
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
  type?: 'note' | 'diagram' | 'code'; // Type of note: regular note, diagram, or code
  folderId?: string;
  userId: string;
  starred: boolean;
  archived?: boolean;
  deleted?: boolean;
  hidden: boolean;
  hiddenAt?: string | null;
  createdAt: string;
  updatedAt: string;
  attachments?: FileAttachment[];
  attachmentCount?: number; // Backend can populate this for performance
  // Encrypted fields (if note is encrypted)
  encryptedTitle?: string;
  encryptedContent?: string;
  iv?: string;
  salt?: string;
  // Public notes fields
  isPublished?: boolean;
  publicSlug?: string | null;
  publishedAt?: string | null;
  publicUpdatedAt?: string | null;
}

// Public note API response
export interface ApiPublicNote {
  id: string;
  slug: string;
  noteId: string;
  userId: string;
  title: string;
  content: string;
  type?: 'note' | 'diagram' | 'code';
  authorName?: string;
  publishedAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination?: {
    total: number;
    limit: number;
    page: number;
    totalPages: number;
  };
  total?: number;
  limit?: number;
}

export interface NotesResponse {
  notes: Note[];
  pagination?: {
    total: number;
    limit: number;
    page: number;
    totalPages: number;
  };
  total?: number;
  limit?: number;
}

export interface FoldersResponse {
  folders: Folder[];
  pagination?: {
    total: number;
    limit: number;
    page: number;
    totalPages: number;
  };
}

export interface NoteQueryParams {
  folderId?: string;
  starred?: boolean;
  archived?: boolean;
  deleted?: boolean;
  hidden?: boolean;
}

export interface EmptyTrashResponse {
  message: string;
  deletedCount: number;
}

export interface ApiUserUsage {
  storage: {
    totalBytes: number;
    totalMB: number;
    totalGB: number;
    limitGB: number;
    usagePercent: number;
    isOverLimit: boolean;
  };
  notes: {
    count: number;
    limit: number;
    usagePercent: number;
    isOverLimit: boolean;
  };
}

export interface ApiUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt?: string;
  updatedAt?: string;
  usage?: ApiUserUsage;
}

export interface FolderCounts {
  all: number;
  starred: number;
  archived: number;
  trash: number;
}

// API returns different formats based on folder_id parameter:
// - Without folder_id: { all, starred, archived, trash, folders: { folderId: {...} } }
// - With folder_id: { childFolderId: { all, starred, ... } }
export interface NoteCounts {
  all: number;
  starred: number;
  archived: number;
  trash: number;
  folders?: Record<string, FolderCounts>;
  // When folder_id is passed, folder counts are at root level
  [folderId: string]: number | FolderCounts | Record<string, FolderCounts> | undefined;
}
