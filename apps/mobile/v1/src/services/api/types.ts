/**
 * API Type Definitions
 * Shared types for the API service
 */

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
