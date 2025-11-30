export interface FileAttachment {
  id: string;
  noteId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  type?: 'note' | 'diagram' | 'code' | 'sheets'; // Type of note: regular note, diagram, code, or sheets
  createdAt: Date;
  updatedAt: Date;
  starred: boolean;
  tags: string[];
  folderId: string | null;
  folder?: Folder;
  archived?: boolean;
  deleted?: boolean;
  hidden: boolean;
  hiddenAt: Date | null;
  attachments?: FileAttachment[];
  attachmentCount?: number; // Number of file attachments (from API)
  isNew?: boolean; // Client-side flag to show "NEW" badge
  // Public note fields
  isPublished?: boolean;
  publicSlug?: string | null;
  publishedAt?: Date | null;
  publicUpdatedAt?: Date | null;
}

// Full public note data (for authenticated owner)
export interface PublicNote {
  id: string;
  slug: string;
  noteId: string;
  userId: string;
  title: string;
  content: string; // Plaintext HTML (not encrypted)
  type?: 'note' | 'diagram' | 'code' | 'sheets';
  authorName?: string;
  publishedAt: Date;
  updatedAt: Date;
}

// Public note for unauthenticated viewers (no sensitive IDs)
export interface PublicNoteResponse {
  slug: string;
  title: string;
  content: string;
  type?: 'note' | 'diagram' | 'code' | 'sheets';
  authorName?: string;
  publishedAt: Date;
  updatedAt: Date;
}

export interface Folder {
  id: string;
  name: string;
  color?: string;
  createdAt: Date;
  parentId?: string | null;
  isDefault?: boolean;
  // Computed fields for UI
  depth?: number;
  isExpanded?: boolean;
  children?: Folder[];
  hasChildren?: boolean;
  noteCount?: number;
}

export type ViewMode = 'all' | 'starred' | 'archived' | 'trash' | 'hidden' | 'public';

export interface NotesState {
  notes: Note[];
  folders: Folder[];
  selectedNote: Note | null;
  selectedFolder: Folder | null;
  currentView: ViewMode;
  searchQuery: string;
}

// Helper types for folder operations
export interface FolderTreeNode extends Folder {
  children: FolderTreeNode[];
  hasChildren: boolean;
  isRoot: boolean;
}

export interface CreateFolderParams {
  name: string;
  color?: string;
  parentId?: string | null;
}

export interface UpdateFolderParams {
  name?: string;
  color?: string;
  parentId?: string | null;
}
