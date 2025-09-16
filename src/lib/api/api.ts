import {
  encryptNoteData,
  decryptNoteData,
  isNoteEncrypted,
} from '../encryption';

const VITE_API_URL = import.meta.env.VITE_API_URL as string;

if (!VITE_API_URL) {
  throw new Error(
    'Missing API Base URL - Please add VITE_API_URL to your environment variables'
  );
}

export interface ApiNote {
  id: string;
  title: string;
  content: string;
  encryptedTitle?: string;
  encryptedContent?: string;
  iv?: string;
  salt?: string;
  starred: boolean;
  archived: boolean;
  deleted: boolean;
  hidden: boolean;
  hiddenAt: string | null;
  tags: string[];
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiFolder {
  id: string;
  name: string;
  color: string;
  parentId: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  noteCount?: number;
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

export interface NotesResponse {
  notes: ApiNote[];
  total: number;
  page: number;
  limit: number;
}

export interface FoldersResponse {
  folders: ApiFolder[];
  total: number;
  page: number;
  limit: number;
}

class ClerkEncryptedApiService {
  private currentUserId: string | null = null;
  private getToken: (() => Promise<string | null>) | null = null;

  setTokenProvider(getToken: () => Promise<string | null>) {
    this.getToken = getToken;
  }

  setCurrentUser(userId: string) {
    this.currentUserId = userId;
  }

  private async request<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.getToken) {
      throw new Error(
        'Token provider not set. Make sure to call setTokenProvider first.'
      );
    }

    const token = await this.getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    const url = `${VITE_API_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        throw new Error('Authentication required');
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error: ${response.status} - ${errorText}`);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  private async decryptApiNote(apiNote: ApiNote): Promise<ApiNote> {
    if (!this.currentUserId) {
      throw new Error('User ID not set for encryption');
    }

    if (isNoteEncrypted(apiNote)) {
      try {
        const { title, content } = await decryptNoteData(
          this.currentUserId,
          apiNote.encryptedTitle!,
          apiNote.encryptedContent!,
          apiNote.iv!,
          apiNote.salt!
        );

        return {
          ...apiNote,
          title,
          content,
        };
      } catch (error) {
        console.error('Failed to decrypt note:', apiNote.id, error);
        return {
          ...apiNote,
          title: '🔒 Encrypted Note (Decryption Failed)',
          content:
            'This note is encrypted but could not be decrypted. It may be corrupted.',
        };
      }
    }

    return apiNote;
  }

  private async encryptNoteForApi(
    title: string,
    content: string
  ): Promise<{
    encryptedTitle: string;
    encryptedContent: string;
    iv: string;
    salt: string;
  }> {
    if (!this.currentUserId) {
      throw new Error('User ID not set for encryption');
    }

    return encryptNoteData(this.currentUserId, title, content);
  }

  async getCurrentUser(includeUsage = false): Promise<ApiUser> {
    const endpoint = includeUsage
      ? '/users/me?include_usage=true'
      : '/users/me';
    const user = await this.request<ApiUser>(endpoint);
    this.setCurrentUser(user.id);
    return user;
  }

  async getNotes(params?: {
    folderId?: string;
    starred?: boolean;
    archived?: boolean;
    deleted?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<NotesResponse> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const query = searchParams.toString();
    const response = await this.request<NotesResponse>(
      `/notes${query ? `?${query}` : ''}`
    );

    const decryptedNotes = await Promise.all(
      response.notes.map((note: ApiNote) => this.decryptApiNote(note))
    );

    return {
      ...response,
      notes: decryptedNotes,
    };
  }

  async getNote(id: string): Promise<ApiNote> {
    const note = await this.request<ApiNote>(`/notes/${id}`);
    return this.decryptApiNote(note);
  }

  async createNote(noteData: {
    title: string;
    content?: string;
    folderId?: string | null;
    starred?: boolean;
    tags?: string[];
  }): Promise<ApiNote> {
    const title = noteData.title ?? 'Untitled';
    const content = noteData.content ?? '';

    const encryptedData = await this.encryptNoteForApi(title, content);

    const { title: _, content: __, ...restNoteData } = noteData;

    const apiNote = await this.request<ApiNote>('/notes', {
      method: 'POST',
      body: JSON.stringify({
        ...restNoteData,
        ...encryptedData,
      }),
    });

    return this.decryptApiNote(apiNote);
  }

  async updateNote(
    id: string,
    updates: {
      title?: string;
      content?: string;
      folderId?: string | null;
      starred?: boolean;
      archived?: boolean;
      deleted?: boolean;
      tags?: string[];
    }
  ): Promise<ApiNote> {
    let encryptedUpdates = { ...updates };

    if (updates.title !== undefined || updates.content !== undefined) {
      const currentNote = await this.getNote(id);

      const newTitle = updates.title ?? currentNote.title;
      const newContent = updates.content ?? currentNote.content;

      const encrypted = await this.encryptNoteForApi(newTitle, newContent);

      encryptedUpdates = {
        ...updates,
        // Remove plain text fields completely when sending encrypted data
        title: undefined,
        content: undefined,
        ...encrypted,
      };
    }

    // Simplified approach - only send defined properties from encryptedUpdates
    const cleanedUpdates: Record<string, unknown> = {};

    // Only add properties that are explicitly defined (not undefined)
    Object.keys(encryptedUpdates).forEach((key) => {
      const value = (encryptedUpdates as Record<string, unknown>)[key];
      if (value !== undefined) {
        // Additional validation to prevent circular references and non-serializable values
        try {
          JSON.stringify(value);
          cleanedUpdates[key] = value;
        } catch (error) {
          console.warn(`Skipping non-serializable property ${key}:`, error);
        }
      }
    });

    const requestBody = JSON.stringify(cleanedUpdates);

    const apiNote = await this.request<ApiNote>(`/notes/${id}`, {
      method: 'PUT',
      body: requestBody,
    });

    return this.decryptApiNote(apiNote);
  }

  async deleteNote(id: string): Promise<ApiNote> {
    const apiNote = await this.request<ApiNote>(`/notes/${id}`, {
      method: 'DELETE',
    });
    return this.decryptApiNote(apiNote);
  }

  async toggleStarNote(id: string): Promise<ApiNote> {
    const apiNote = await this.request<ApiNote>(`/notes/${id}/star`, {
      method: 'POST',
    });
    return this.decryptApiNote(apiNote);
  }

  async restoreNote(id: string): Promise<ApiNote> {
    const apiNote = await this.request<ApiNote>(`/notes/${id}/restore`, {
      method: 'POST',
    });
    return this.decryptApiNote(apiNote);
  }

  async archiveNote(id: string): Promise<ApiNote> {
    const apiNote = await this.request<ApiNote>(`/notes/${id}/archive`, {
      method: 'POST',
    });
    return this.decryptApiNote(apiNote);
  }

  async unarchiveNote(id: string): Promise<ApiNote> {
    const apiNote = await this.request<ApiNote>(`/notes/${id}/unarchive`, {
      method: 'POST',
    });
    return this.decryptApiNote(apiNote);
  }

  async hideNote(id: string): Promise<ApiNote> {
    const apiNote = await this.request<ApiNote>(`/notes/${id}/hide`, {
      method: 'POST',
    });
    return this.decryptApiNote(apiNote);
  }

  async unhideNote(id: string): Promise<ApiNote> {
    const apiNote = await this.request<ApiNote>(`/notes/${id}/unhide`, {
      method: 'POST',
    });
    return this.decryptApiNote(apiNote);
  }

  async getFolders(params?: {
    parentId?: string;
    page?: number;
    limit?: number;
  }): Promise<FoldersResponse> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const query = searchParams.toString();
    return this.request<FoldersResponse>(`/folders${query ? `?${query}` : ''}`);
  }

  async createFolder(folderData: {
    name: string;
    color?: string;
    parentId?: string;
    isDefault?: boolean;
  }): Promise<ApiFolder> {
    return this.request<ApiFolder>('/folders', {
      method: 'POST',
      body: JSON.stringify(folderData),
    });
  }

  async updateFolder(
    id: string,
    updates: {
      name?: string;
      color?: string;
      parentId?: string | null;
    }
  ): Promise<ApiFolder> {
    return this.request<ApiFolder>(`/folders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteFolder(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/folders/${id}`, {
      method: 'DELETE',
    });
  }

  async reorderFolder(
    id: string,
    newIndex: number
  ): Promise<{
    message: string;
    folderId: string;
    newIndex: number;
  }> {
    return this.request<{
      message: string;
      folderId: string;
      newIndex: number;
    }>(`/folders/${id}/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ newIndex }),
    });
  }

  clearEncryptionData() {
    this.currentUserId = null;
  }

  async emptyTrash(): Promise<{ message: string; deletedCount: number }> {
    return this.request<{ message: string; deletedCount: number }>(
      '/notes/empty-trash',
      {
        method: 'DELETE',
      }
    );
  }
}

export const api = new ClerkEncryptedApiService();
